"""
Auth schemas - Pydantic models for authentication API operations.

Single source of truth for auth-related request and response types.
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ===== REQUEST SCHEMAS =====


class RegisterRequest(BaseModel):
    """
    User registration request.

    Enforces:
    - Username: 3-50 characters
    - Password: OWASP requirements (12+ chars, uppercase, lowercase, number)
    - Email: Valid email format
    - First/Last Name: Optional but recommended for profile
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "john_doe",
                "password": "<secure-password>",
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
            }
        }
    )

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=12)
    email: EmailStr
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)


class LoginRequest(BaseModel):
    """
    User login request.

    Args:
        identifier: Username or email address
        password: Password
        remember_me: If True, session lasts 30 days instead of 24 hours
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "identifier": "john_doe or john@example.com",
                "password": "<secure-password>",
                "remember_me": False,
            }
        }
    )

    identifier: str = Field(..., min_length=1, description="Username or email address")
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = False


class LogoutRequest(BaseModel):
    """User logout request."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"session_id": "550e8400-e29b-41d4-a716-446655440000"}
        }
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


class SeedTestUserRequest(BaseModel):
    """Payload for creating or resetting the deterministic E2E test user."""

    username: str = Field(default="e2e-test", min_length=3, max_length=50)
    email: EmailStr = Field(default="e2e-test@example.com")
    password: str = Field(..., min_length=12)
    remember_me: Optional[bool] = False


class ForgotPasswordRequest(BaseModel):
    """
    Forgot password request.

    Args:
        email: User email address to send reset link to
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
            }
        }
    )

    email: EmailStr = Field(..., description="Email address for password reset")


class ResetPasswordRequest(BaseModel):
    """
    Reset password request.

    Args:
        token: Password reset token from email
        new_password: New password (must meet OWASP requirements)
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "token": "abc123def456...",
                "new_password": "PLACEHOLDER_PASSWORD",
            }
        }
    )

    token: str = Field(
        ..., min_length=32, max_length=128, description="Password reset token"
    )
    new_password: str = Field(..., min_length=12, description="New password")


# ===== RESPONSE SCHEMAS =====


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


class RateLimitInfo(BaseModel):
    """Rate limit information (returned in error responses)."""

    retry_after_seconds: int
    attempts_remaining: Optional[int] = None


class AuthErrorResponse(BaseModel):
    """Auth-specific error response with rate limit info."""

    detail: str
    rate_limit_info: Optional[RateLimitInfo] = None


class AuthSuccessResponse(BaseModel):
    """Generic success response for auth operations without data payload."""

    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
# Map old names to new names during migration
SuccessResponse = AuthSuccessResponse
ErrorResponse = AuthErrorResponse
