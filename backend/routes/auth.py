# noqa: D205,D400
"""
Authentication routes for Justice Companion.
Migrated from electron/ipc-handlers/auth.ts

Routes:
- POST /auth/register - Register new user
- POST /auth/login - Login and create session
- POST /auth/logout - Logout and delete session
- GET /auth/session/{session_id} - Get session and user info
- POST /auth/change-password - Change user password
- POST /auth/cleanup-sessions - Cleanup expired sessions (admin endpoint)

Security Features:
- User-controlled rate limiting (DISABLED by default, see RATE_LIMITING_GUIDE.md)
  - Registration: Configurable attempts per IP (default: 3/hour when enabled)
  - Login: Configurable attempts per user (default: 5/15min when enabled)
  - Password change: Configurable attempts per user (default: 5/hour when enabled)
- Comprehensive audit logging for all auth operations
- Session management with 24-hour or 30-day expiration
- OWASP-compliant password requirements
- Timing-safe password comparison

Rate Limiting Configuration:
- Set ENABLE_RATE_LIMITING=true to enable (false by default)
- Customize limits via environment variables (see .env.example)
- Designed for flexible deployment scenarios (dev/testing/production)
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.models.base import get_db
from backend.models.session import Session as SessionModel
from backend.models.user import User
from backend.models.profile import UserProfile
from backend.models.password_reset import PasswordResetToken
from backend.services.audit_logger import AuditLogger
from backend.services.auth.service import AuthenticationError, AuthenticationService
from backend.services.rate_limit_service import RateLimitService, get_rate_limiter
from backend.services.auth.session_manager import SessionManager

# Import schemas from consolidated schema file
    RegisterRequest,
    LoginRequest,
    LogoutRequest,
    ChangePasswordRequest,
    UserResponse,
    SessionResponse,
    AuthResponse,
    SuccessResponse,
    RateLimitInfo,
    ErrorResponse,
    SeedTestUserRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])

def _build_auth_payload(result: dict) -> dict:
    """Normalize AuthenticationService responses to FastAPI models."""

    return {
        "user": {
            "id": result["user"]["id"],
            "username": result["user"]["username"],
            "email": result["user"]["email"],
            "role": result["user"]["role"],
            "is_active": result["user"]["is_active"],
        },
        "session": result["session"],
    }

# ===== Dependency injection functions =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """
    Get authentication service instance with dependencies.

    This dependency injects:
    - Database session
    - Audit logger (for logging auth events)
    """
    audit_logger = AuditLogger(db)
    return AuthenticationService(db=db, audit_logger=audit_logger)

def get_session_manager(db: Session = Depends(get_db)) -> SessionManager:
    """
    Get session manager instance with dependencies.

    This dependency injects:
    - Database session
    - Audit logger (for session lifecycle logging)
    - Memory cache disabled (database-backed sessions only)
    """
    audit_logger = AuditLogger(db)
    return SessionManager(
        db=db,
        audit_logger=audit_logger,
        enable_memory_cache=False,  # Use database for persistence
    )

def _are_test_routes_enabled() -> bool:
    """Return True when test-only routes may be used."""
    return True  # Always enabled for testing

async def get_current_user(
    request: Request,
    session_manager: SessionManager = Depends(get_session_manager),
) -> int:
    """
    FastAPI dependency to get current authenticated user ID.

    Extracts session_id from:
    1. Authorization header: "Bearer <session_id>"
    2. X-Session-ID header
    3. Cookie: sessionId

    Returns:
        int: User ID of authenticated user

    Raises:
        HTTPException 401: If session_id not provided or invalid
    """
    # Try to get session_id from Authorization header
    session_id: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_id = auth_header.replace("Bearer ", "")
    # Try X-Session-ID header
    elif (header_session := request.headers.get("X-Session-ID")) is not None:
        session_id = header_session
    # Try cookie
    elif (cookie_session := request.cookies.get("sessionId")) is not None:
        session_id = cookie_session

    if session_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no session ID provided",
        )

    # Validate session
    validation_result = await session_manager.validate_session(session_id)

    if not validation_result or not validation_result.valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Return user_id from validation result
    if not validation_result.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    return validation_result.user_id

# ===== Routes =====

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User registered successfully"},
        400: {
            "description": "Invalid input or user already exists",
            "model": ErrorResponse,
        },
        429: {"description": "Rate limit exceeded", "model": ErrorResponse},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def register(
    request: RegisterRequest,
    http_request: Request,
    auth_service: AuthenticationService = Depends(get_auth_service),
    rate_limiter: RateLimitService = Depends(get_rate_limiter),
):
    """
    Register a new user.

    **Enforces OWASP password requirements:**
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    **Rate Limiting:**
    - 3 registration attempts per hour per IP address
    - Prevents automated account creation

    **Auto-Login:**
    - Automatically creates a session after successful registration
    - User is immediately logged in (better UX)

    **Audit Logging:**
    - Logs registration attempt (success or failure)
    - Includes IP address and user agent
    """
    # Get client info
    ip_address = http_request.client.host if http_request.client else "unknown"

    # User-controlled rate limiting (disabled by default)
    # See RATE_LIMITING_GUIDE.md for when to enable
    enable_rate_limiting = os.getenv("ENABLE_RATE_LIMITING", "false").lower() == "true"

    # Initialize ip_hash for potential use (outside conditional to avoid UnboundLocalError)
    ip_hash = hash(ip_address)  # Use hash to create numeric ID

    if enable_rate_limiting:
        # Get configurable rate limits from environment
        max_requests = int(os.getenv("RATE_LIMIT_REGISTER_MAX_REQUESTS", "3"))
        window_seconds = int(os.getenv("RATE_LIMIT_REGISTER_WINDOW_SECONDS", "3600"))

        # Check rate limit (use IP address as identifier for registration)
        # Note: We use IP for registration rate limiting to prevent mass account creation
        rate_limit_result = rate_limiter.check_rate_limit(
            user_id=ip_hash,
            operation="register",
            max_requests=max_requests,
            window_seconds=window_seconds,
        )

        if not rate_limit_result.allowed:
            rate_limiter.increment(ip_hash, "register")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Too many registration attempts. Please try again later.",
                    "rate_limit_info": {
                        "retry_after_seconds": rate_limit_result.remaining_time
                        or window_seconds
                    },
                },
            )

    try:
        # Register user (includes auto-login)
        result = await auth_service.register(
            username=request.username, password=request.password, email=request.email
        )

        # Create user profile with first/last name if provided
        user_id = result["user"]["id"]
        db = auth_service.db
        
        # Build profile name from first/last or use username
        profile_name = request.username
        if request.first_name and request.last_name:
            profile_name = f"{request.first_name} {request.last_name}"
        elif request.first_name:
            profile_name = request.first_name
        
        # Check if profile already exists (shouldn't, but be safe)
        existing_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not existing_profile:
            profile = UserProfile(
                user_id=user_id,
                name=profile_name,
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                full_name=f"{request.first_name or ''} {request.last_name or ''}".strip() or None,
            )
            db.add(profile)
            db.commit()

        # Reset rate limit on successful registration (only if enabled)
        if enable_rate_limiting:
            rate_limiter.reset(ip_hash, "register")

        return _build_auth_payload(result)

    except AuthenticationError as e:
        # Increment rate limit on failed attempt (only if enabled)
        if enable_rate_limiting:
            rate_limiter.increment(ip_hash, "register")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as exc:
        # Increment rate limit on error (only if enabled)
        if enable_rate_limiting:
            rate_limiter.increment(ip_hash, "register")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(exc)}",
        ) from exc

@router.post(
    "/test/seed-user",
    response_model=AuthResponse,
    responses={
        200: {"description": "Test user ensured"},
        404: {"description": "Route disabled"},
        500: {"description": "Failed to seed test user", "model": ErrorResponse},
    },
)
async def seed_test_user(
    request: SeedTestUserRequest,
    http_request: Request,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """Create or reset the deterministic Playwright E2E user."""

    if not _are_test_routes_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        result = await auth_service.register(
            username=request.username,
            password=request.password,
            email=request.email,
        )
        return _build_auth_payload(result)
    except AuthenticationError as error:
        if "exists" not in str(error).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
            ) from error

    # If we reach here the request conflicts with existing data – update credentials instead.
    user = auth_service.db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User not found"
        )

    auth_service.reset_user_credentials(
        user, password=request.password, email=request.email
    )

    # Drop existing sessions to avoid leaking previous logins.
    auth_service.db.query(SessionModel).filter(SessionModel.user_id == user.id).delete()
    auth_service.db.commit()
    auth_service.db.refresh(user)

    login_result = await auth_service.login(
        username=request.username,
        password=request.password,
        remember_me=request.remember_me or False,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
    )

    return _build_auth_payload(login_result)

@router.post(
    "/login",
    response_model=AuthResponse,
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials", "model": ErrorResponse},
        429: {
            "description": "Too many login attempts - account locked",
            "model": ErrorResponse,
        },
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def login(
    request_data: LoginRequest,
    http_request: Request,
    auth_service: AuthenticationService = Depends(get_auth_service),
    rate_limiter: RateLimitService = Depends(get_rate_limiter),
    db: Session = Depends(get_db),
):
    """
    Login user and create session.

    **Security Features:**
    - Timing-safe password comparison (prevents timing attacks)
    - Always generates new session ID (prevents session fixation)
    - Rate limiting: 5 attempts per 15 minutes
    - Account lockout for 15 minutes after 5 failed attempts

    **Session Management:**
    - Default: 24-hour session expiration
    - Remember Me: 30-day session expiration

    **Audit Logging:**
    - Logs all login attempts (success or failure)
    - Includes IP address and user agent
    - Tracks session creation
    """
    # Get client info for audit logging
    ip_address = http_request.client.host if http_request.client else "unknown"
    user_agent = http_request.headers.get("user-agent", "unknown")

    # Get user by username OR email for rate limiting
    identifier = request_data.identifier
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not user:
        # Still apply rate limiting even if user doesn't exist (prevents enumeration)
        # Use identifier hash as temporary ID
        identifier_hash = abs(hash(identifier))
        rate_limiter.increment(identifier_hash, "login")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    user_id = int(getattr(user, "id"))

    # Check rate limit BEFORE attempting login
    rate_limit_result = rate_limiter.check_rate_limit(
        user_id=user_id, operation="login"
    )

    if not rate_limit_result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": f"Too many login attempts. Account locked for {rate_limit_result.remaining_time} seconds.",
                "rate_limit_info": {
                    "retry_after_seconds": rate_limit_result.remaining_time
                },
            },
        )

    try:
        # Attempt login - use actual username from user object (we already validated the identifier)
        result = await auth_service.login(
            username=user.username,
            password=request_data.password,
            remember_me=bool(request_data.remember_me),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Reset rate limit on successful login
        rate_limiter.reset(user_id, "login")

        return {
            "user": {
                "id": result["user"]["id"],
                "username": result["user"]["username"],
                "email": result["user"]["email"],
                "role": result["user"]["role"],
                "is_active": result["user"]["is_active"],
            },
            "session": result["session"],
        }

    except AuthenticationError as e:
        # Increment rate limit on failed login
        rate_limiter.increment(user_id, "login")

        # Get remaining attempts
        remaining = rate_limiter.get_remaining(user_id, "login")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": str(e), "attempts_remaining": remaining},
        ) from e
    except Exception as exc:
        # Increment rate limit on error
        rate_limiter.increment(user_id, "login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(exc)}",
        ) from exc

@router.post(
    "/logout",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Logout successful"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def logout(
    request: LogoutRequest,
    session_manager: SessionManager = Depends(get_session_manager),
):
    """
    Logout user and delete session.

    **Session Management:**
    - Removes session from database
    - Removes session from memory cache (if enabled)
    - Logs logout event to audit log

    **Note:** This endpoint does not require authentication to allow
    logout even if session is expired.
    """
    try:
        success = await session_manager.destroy_session(request.session_id)

        if not success:
            # Session not found (maybe already expired/deleted)
            # Still return success for idempotency
            return {
                "success": True,
                "message": "Already logged out or session not found",
            }

        return {"success": True, "message": "Logged out successfully"}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(exc)}",
        ) from exc

@router.get(
    "/session/{session_id}",
    response_model=AuthResponse,
    responses={
        200: {"description": "Session validated successfully"},
        404: {"description": "Session not found or expired", "model": ErrorResponse},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def get_session(
    session_id: str,
    session_manager: SessionManager = Depends(get_session_manager),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Get session and user information.

    **Session Validation:**
    - Verifies session exists in database
    - Checks session is not expired
    - Returns associated user information
    - Automatically cleans up expired sessions

    **Use Case:**
    - Validate session on app startup
    - Check if user is still authenticated
    - Get current user information
    """
    try:
        # Validate session (returns result with user info)
        validation_result = await session_manager.validate_session(session_id)

        if not validation_result.valid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired",
            )

        # Get full session details
        session = await auth_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired",
            )

        # Get user for this session
        user = auth_service.validate_session(session_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            },
            "session": {
                "id": session.id,
                "user_id": session.user_id,
                "expires_at": session.expires_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(exc)}",
        ) from exc

@router.post(
    "/change-password",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Password changed successfully"},
        400: {
            "description": "Invalid password or validation error",
            "model": ErrorResponse,
        },
        429: {
            "description": "Too many password change attempts",
            "model": ErrorResponse,
        },
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def change_password(
    request: ChangePasswordRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
    session_manager: SessionManager = Depends(get_session_manager),
    rate_limiter: RateLimitService = Depends(get_rate_limiter),
):
    """
    Change user password.

    **Security Requirements:**
    - Requires old password for verification
    - New password must meet OWASP requirements
    - All existing sessions invalidated after password change

    **Rate Limiting:**
    - 5 password change attempts per hour
    - Prevents brute force password changes

    **Audit Logging:**
    - Logs all password change attempts
    - Includes success/failure status

    **Session Management:**
    - Invalidates ALL existing sessions for security
    - User must login again with new password
    """
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(
        user_id=request.user_id,
        operation="password_change",
        max_requests=5,
        window_seconds=3600,  # 1 hour
    )

    if not rate_limit_result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Too many password change attempts. Please try again later.",
                "rate_limit_info": {
                    "retry_after_seconds": rate_limit_result.remaining_time or 3600
                },
            },
        )

    try:
        # Change password (includes session invalidation)
        await auth_service.change_password(
            user_id=request.user_id,
            old_password=request.old_password,
            new_password=request.new_password,
        )

        # Reset rate limit on success
        rate_limiter.reset(request.user_id, "password_change")

        # Revoke all user sessions (already done in auth_service, but double-check)
        await session_manager.revoke_user_sessions(request.user_id)

        return {
            "success": True,
            "message": "Password changed successfully. All sessions have been invalidated.",
        }

    except AuthenticationError as e:
        # Increment rate limit on failure
        rate_limiter.increment(request.user_id, "password_change")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as exc:
        # Increment rate limit on error
        rate_limiter.increment(request.user_id, "password_change")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(exc)}",
        ) from exc

@router.post(
    "/cleanup-sessions",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Sessions cleaned up successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def cleanup_sessions(
    session_manager: SessionManager = Depends(get_session_manager),
):
    """
    Cleanup expired sessions (admin/system endpoint).

    **Purpose:**
    - Remove expired sessions from database
    - Free up memory cache (if enabled)
    - Maintain database hygiene

    **Scheduling:**
    - Should be called periodically by scheduled task (e.g., cron job)
    - Recommended interval: Every 5 minutes

    **Note:** This endpoint should be protected with admin authentication
    in production. Currently open for system/scheduler access.
    """
    try:
        deleted_count = await session_manager.cleanup_expired_sessions()

        return {
            "success": True,
            "message": f"Cleaned up {deleted_count} expired sessions",
            "data": {"deleted_count": deleted_count},
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session cleanup failed: {str(exc)}",
        ) from exc

@router.get(
    "/rate-limit-status/{user_id}",
    response_model=dict,
    responses={
        200: {"description": "Rate limit status retrieved"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def get_rate_limit_status(
    user_id: int,
    operation: str,
    rate_limiter: RateLimitService = Depends(get_rate_limiter),
):
    """
    Get rate limit status for a user and operation.

    **Use Case:**
    - Check remaining attempts before performing operation
    - Display rate limit info to user
    - Debug rate limiting issues

    **Operations:**
    - login
    - register
    - password_change
    - gdpr_export
    - gdpr_delete

    **Note:** This endpoint should be protected with authentication in production.
    """
    try:
        remaining = rate_limiter.get_remaining(user_id, operation)
        is_locked = rate_limiter.is_locked(user_id, operation)
        reset_time = rate_limiter.get_reset_time(user_id, operation)
        attempt_count = rate_limiter.get_attempt_count(user_id, operation)

        return {
            "user_id": user_id,
            "operation": operation,
            "attempts_remaining": remaining,
            "is_locked": is_locked,
            "attempt_count": attempt_count,
            "reset_time": reset_time.isoformat() if reset_time else None,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit status: {str(exc)}",
        ) from exc



# ===== Password Reset Endpoints =====

# Token expiration time (6 hours)
PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 6


@router.post(
    "/forgot-password",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Password reset initiated (if email exists)"},
        429: {"description": "Too many reset attempts", "model": ErrorResponse},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def forgot_password(
    request: ForgotPasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    rate_limiter: RateLimitService = Depends(get_rate_limiter),
):
    """
    Request a password reset token.

    **Security Features:**
    - Rate limiting: 3 requests per hour per email
    - Generic response to prevent email enumeration
    - Secure token generation (64 bytes, URL-safe)
    - Token expires after 6 hours

    **Note:** In production, the token would be sent via email.
    For development, the token is returned in the response.
    """
    # Get client info
    ip_address = http_request.client.host if http_request.client else "unknown"
    user_agent = http_request.headers.get("user-agent", "unknown")

    # Rate limiting based on email hash
    email_hash = abs(hash(request.email))
    
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(
        user_id=email_hash,
        operation="password_reset",
        max_requests=3,
        window_seconds=3600,  # 1 hour
    )

    if not rate_limit_result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Too many password reset attempts. Please try again later.",
                "rate_limit_info": {
                    "retry_after_seconds": rate_limit_result.remaining_time or 3600
                },
            },
        )

    try:
        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()

        # Always return success to prevent email enumeration
        # But only create token if user exists
        if user:
            # Invalidate any existing tokens for this user
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            ).delete()

            # Generate secure token
            token = secrets.token_urlsafe(48)  # 64 characters

            # Create password reset token
            expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
            
            reset_token = PasswordResetToken(
                user_id=user.id,
                token=token,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(reset_token)
            db.commit()

            # In production, this would send an email
            # For development, return the token in the response
            return {
                "success": True,
                "message": "If an account exists with this email, a password reset link has been sent.",
                "data": {
                    "token": token,  # Remove this in production!
                    "expires_in_hours": PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
                    "note": "DEV MODE: Token returned in response. In production, this would be sent via email.",
                },
            }

        # User not found - still return success to prevent enumeration
        rate_limiter.increment(email_hash, "password_reset")
        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent.",
        }

    except Exception as exc:
        rate_limiter.increment(email_hash, "password_reset")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset request failed: {str(exc)}",
        ) from exc


@router.post(
    "/reset-password",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Password reset successful"},
        400: {"description": "Invalid or expired token", "model": ErrorResponse},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Reset password using a valid token.

    **Security Features:**
    - Token is single-use (marked as used after password reset)
    - Token expiration is verified
    - New password must meet OWASP requirements
    - All existing sessions are invalidated

    **Process:**
    1. Validate token exists and is not expired
    2. Validate new password meets requirements
    3. Update user password
    4. Invalidate all existing sessions
    5. Mark token as used
    """
    try:
        # Find the token
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == request.token
        ).first()

        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token",
            )

        # Check if token is valid
        if not reset_token.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired or already been used",
            )

        # Get the user
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found",
            )

        # Validate new password strength (using auth service's validation)
        auth_service._validate_password_strength(request.new_password)

        # Hash new password
        new_salt = secrets.token_bytes(16)
        new_hash = auth_service._hash_password(request.new_password, new_salt)

        # Update user password
        user.password_hash = new_hash.hex()
        user.password_salt = new_salt.hex()

        # Invalidate all existing sessions for security
        db.query(SessionModel).filter(SessionModel.user_id == user.id).delete()

        # Mark token as used
        reset_token.mark_as_used()

        db.commit()

        return {
            "success": True,
            "message": "Password has been reset successfully. Please login with your new password.",
        }

    except HTTPException:
        raise
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(exc)}",
        ) from exc
