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

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.services.audit_logger import AuditLogger
from backend.services.auth_service import (AuthenticationError,
                                           AuthenticationService)
from backend.services.rate_limit_service import (RateLimitService,
                                                 get_rate_limiter)
from backend.services.session_manager import SessionManager

router = APIRouter(prefix="/auth", tags=["authentication"])


# ===== Pydantic request/response models =====


class RegisterRequest(BaseModel):
    """
    User registration request.

    Enforces:
    - Username: 3-50 characters
    - Password: OWASP requirements (12+ chars, uppercase, lowercase, number)
    - Email: Valid email format
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "john_doe",
                "password": "<secure-password>",
                "email": "john@example.com",
            }
        }
    )

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=12)
    email: EmailStr


class LoginRequest(BaseModel):
    """
    User login request.

    Args:
        username: Username
        password: Password
        remember_me: If True, session lasts 30 days instead of 24 hours
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "john_doe",
                "password": "<secure-password>",
                "remember_me": False,
            }
        }
    )

    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = False


class LogoutRequest(BaseModel):
    """User logout request."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"session_id": "550e8400-e29b-41d4-a716-446655440000"}}
    )

    session_id: str = Field(..., min_length=36, max_length=36)


class ChangePasswordRequest(BaseModel):
    """
    Change password request.

    Requires old password for verification (prevents unauthorized changes).
    All existing sessions will be invalidated for security.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "old_password": "<current-password>",
                "new_password": "<new-password>",
            }
        }
    )

    user_id: int = Field(..., gt=0)
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12)


class UserResponse(BaseModel):
    """User data response (excludes sensitive fields like password_hash)."""

    id: int
    username: str
    email: str
    role: str
    is_active: bool


class SessionResponse(BaseModel):
    """Session data response."""

    id: str
    user_id: int
    expires_at: str


class AuthResponse(BaseModel):
    """
    Authentication response with user and session.

    Returned after successful login or registration.
    """

    user: UserResponse
    session: SessionResponse


class SuccessResponse(BaseModel):
    """Generic success response for operations without data payload."""

    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None


class RateLimitInfo(BaseModel):
    """Rate limit information (returned in error responses)."""

    retry_after_seconds: int
    attempts_remaining: Optional[int] = None


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str
    rate_limit_info: Optional[RateLimitInfo] = None


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
        db=db, audit_logger=audit_logger, enable_memory_cache=False  # Use database for persistence
    )


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
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
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_id = auth_header.replace("Bearer ", "")
    # Try X-Session-ID header
    elif request.headers.get("X-Session-ID"):
        session_id = request.headers.get("X-Session-ID")
    # Try cookie
    elif request.cookies.get("sessionId"):
        session_id = request.cookies.get("sessionId")
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no session ID provided",
        )

    # Validate session
    validation_result = await session_manager.validate_session(session_id)

    if not validation_result or not validation_result.valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session"
        )

    # Return user_id from validation result
    if not validation_result.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return validation_result.user_id


# ===== Routes =====


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User registered successfully"},
        400: {"description": "Invalid input or user already exists", "model": ErrorResponse},
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
    import os
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
            user_id=ip_hash, operation="register", max_requests=max_requests, window_seconds=window_seconds
        )

        if not rate_limit_result.allowed:
            rate_limiter.increment(ip_hash, "register")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Too many registration attempts. Please try again later.",
                    "rate_limit_info": {
                        "retry_after_seconds": rate_limit_result.remaining_time or window_seconds
                    },
                },
            )

    try:
        # Register user (includes auto-login)
        result = await auth_service.register(
            username=request.username, password=request.password, email=request.email
        )

        # Reset rate limit on successful registration (only if enabled)
        if enable_rate_limiting:
            rate_limiter.reset(ip_hash, "register")

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
        # Increment rate limit on failed attempt (only if enabled)
        if enable_rate_limiting:
            rate_limiter.increment(ip_hash, "register")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Increment rate limit on error (only if enabled)
        if enable_rate_limiting:
            rate_limiter.increment(ip_hash, "register")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post(
    "/login",
    response_model=AuthResponse,
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials", "model": ErrorResponse},
        429: {"description": "Too many login attempts - account locked", "model": ErrorResponse},
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

    # Get user ID for rate limiting (we need to query first)
    from backend.models.user import User

    user = db.query(User).filter(User.username == request_data.username).first()

    if not user:
        # Still apply rate limiting even if user doesn't exist (prevents enumeration)
        # Use username hash as temporary ID
        username_hash = abs(hash(request_data.username))
        rate_limiter.increment(username_hash, "login")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Check rate limit BEFORE attempting login
    rate_limit_result = rate_limiter.check_rate_limit(user_id=user.id, operation="login")

    if not rate_limit_result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": f"Too many login attempts. Account locked for {rate_limit_result.remaining_time} seconds.",
                "rate_limit_info": {"retry_after_seconds": rate_limit_result.remaining_time},
            },
        )

    try:
        # Attempt login
        result = await auth_service.login(
            username=request_data.username,
            password=request_data.password,
            remember_me=request_data.remember_me,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Reset rate limit on successful login
        rate_limiter.reset(user.id, "login")

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
        rate_limiter.increment(user.id, "login")

        # Get remaining attempts
        remaining = rate_limiter.get_remaining(user.id, "login")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": str(e), "attempts_remaining": remaining},
        )
    except Exception as e:
        # Increment rate limit on error
        rate_limiter.increment(user.id, "login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Login failed: {str(e)}"
        )


@router.post(
    "/logout",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Logout successful"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def logout(
    request: LogoutRequest, session_manager: SessionManager = Depends(get_session_manager)
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
            return {"success": True, "message": "Already logged out or session not found"}

        return {"success": True, "message": "Logged out successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Logout failed: {str(e)}"
        )


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
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or expired"
            )

        # Get full session details
        session = await auth_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or expired"
            )

        # Get user for this session
        user = auth_service.validate_session(session_id)

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(e)}",
        )


@router.post(
    "/change-password",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Password changed successfully"},
        400: {"description": "Invalid password or validation error", "model": ErrorResponse},
        429: {"description": "Too many password change attempts", "model": ErrorResponse},
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Increment rate limit on error
        rate_limiter.increment(request.user_id, "password_change")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(e)}",
        )


@router.post(
    "/cleanup-sessions",
    response_model=SuccessResponse,
    responses={
        200: {"description": "Sessions cleaned up successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def cleanup_sessions(session_manager: SessionManager = Depends(get_session_manager)):
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session cleanup failed: {str(e)}",
        )


@router.get(
    "/rate-limit-status/{user_id}",
    response_model=dict,
    responses={
        200: {"description": "Rate limit status retrieved"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
)
async def get_rate_limit_status(
    user_id: int, operation: str, rate_limiter: RateLimitService = Depends(get_rate_limiter)
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit status: {str(e)}",
        )
