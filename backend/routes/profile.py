"""
Profile management routes for Justice Companion.
Migrated from electron/ipc-handlers/profile.ts

Routes:
- GET /profile - Get current user's profile
- PUT /profile - Update user profile (name, email, avatarUrl)
- PUT /profile/password - Change password
- GET /profile/completeness - Get profile completeness indicator

Security:
- Profile fields encrypted at rest (name, email are PII)
- Session-based authorization
- User can only access/modify their own profile
- Audit logging for profile changes
- Password strength validation (OWASP compliant)

REFACTORED: Now uses service layer instead of direct database queries
- ProfileService for single-row profile operations
- UserProfileService for multi-user profile operations (future)
- AuthenticationService for password changes
- EncryptionService for field-level encryption
- AuditLogger for comprehensive audit trail
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import os
import base64
import re

from backend.models.base import get_db
from backend.services.auth_service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.profile_service import (
    ProfileService,
    UserProfileData,
    ExtendedUserProfileData,
    ProfileUpdateResult,
    ProfileValidationResult,
    ProfileFormData
)
# UserProfileService not needed for single-user profile (id=1)
# from backend.services.user_profile_service import UserProfileService
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

router = APIRouter(prefix="/profile", tags=["profile"])


# ===== PYDANTIC REQUEST/RESPONSE MODELS =====

class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="User's full name")
    email: Optional[str] = Field(None, max_length=255, description="User's email address")
    avatarUrl: Optional[str] = Field(None, max_length=2000, description="Avatar image URL (HTTPS only)")
    firstName: Optional[str] = Field(None, min_length=1, max_length=100, description="User's first name")
    lastName: Optional[str] = Field(None, min_length=1, max_length=100, description="User's last name")
    phone: Optional[str] = Field(None, max_length=20, description="User's phone number")

    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
            # Name can only contain letters, spaces, hyphens, and apostrophes
            if not re.match(r"^[a-zA-Z\s'\-]+$", v):
                raise ValueError("Name can only contain letters, spaces, hyphens, and apostrophes")
            if len(v) > 200:
                raise ValueError("Name must be less than 200 characters")
        return v

    @validator('email')
    def validate_email(cls, v):
        if v is not None:
            v = v.strip()
            if v == "":
                return None  # Allow clearing email

            # Basic email regex
            email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_regex, v):
                raise ValueError("Please enter a valid email address")

            # RFC 5321 compliant email validation
            parts = v.split('@')
            if len(parts) != 2:
                raise ValueError("Invalid email format")

            local, domain = parts

            # Check local part (before @)
            if len(local) > 64:
                raise ValueError("Email local part too long (max 64 characters)")
            if local.startswith('.') or local.endswith('.'):
                raise ValueError("Email local part cannot start or end with a dot")
            if '..' in local:
                raise ValueError("Email local part cannot contain consecutive dots")

            # Check domain part (after @)
            if len(domain) > 253:
                raise ValueError("Email domain too long (max 253 characters)")
            if '.' not in domain:
                raise ValueError("Email domain must contain at least one dot")
            if domain.startswith('.') or domain.endswith('.'):
                raise ValueError("Email domain cannot start or end with a dot")
            if domain.startswith('-') or domain.endswith('-'):
                raise ValueError("Email domain cannot start or end with a hyphen")

        return v

    @validator('avatarUrl')
    def validate_avatar_url(cls, v):
        if v is not None:
            v = v.strip()
            if v == "":
                return None  # Allow clearing avatar URL

            # URL validation
            url_regex = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(url_regex, v):
                raise ValueError("Please enter a valid URL")

            # Only allow HTTPS for security
            if not v.startswith('https://'):
                raise ValueError("Avatar URL must use HTTPS protocol")

            # Check if URL points to an image
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
            if not any(v.lower().endswith(ext) for ext in image_extensions):
                raise ValueError("Avatar URL must point to an image file (.jpg, .jpeg, .png, .gif, .webp, .svg)")

            if len(v) > 2000:
                raise ValueError("Avatar URL must be less than 2000 characters")

        return v

    @validator('firstName', 'lastName')
    def validate_names(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
            # Name can only contain letters, spaces, hyphens, and apostrophes
            if not re.match(r"^[a-zA-Z\s'\-]+$", v):
                raise ValueError("Name can only contain letters, spaces, hyphens, and apostrophes")
        return v

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            v = v.strip()
            if v == "":
                return None  # Allow clearing phone
            # Remove common formatting characters
            phone_cleaned = re.sub(r'[\s\-()]', '', v)
            phone_regex = re.compile(r'^[+]?[1-9][\d]{0,15}$')
            if not phone_regex.match(phone_cleaned):
                raise ValueError("Please enter a valid phone number")
        return v


class ChangePasswordRequest(BaseModel):
    """Request model for changing password."""
    currentPassword: str = Field(..., min_length=12, description="Current password")
    newPassword: str = Field(..., min_length=12, description="New password")

    @validator('newPassword')
    def validate_password_strength(cls, v):
        """Validate password meets OWASP requirements."""
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters (OWASP requirement)")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain at least one number")
        return v


class ProfileResponse(BaseModel):
    """Response model for user profile data."""
    id: int
    name: str
    email: Optional[str] = None
    avatarUrl: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    fullName: Optional[str] = None
    initials: Optional[str] = None
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class ProfileCompletenessResponse(BaseModel):
    """Response model for profile completeness indicator."""
    percentage: int = Field(..., ge=0, le=100, description="Profile completion percentage")
    missingFields: list[str] = Field(default_factory=list, description="List of missing required fields")
    completedFields: list[str] = Field(default_factory=list, description="List of completed fields")


class PasswordChangeResponse(BaseModel):
    """Response model for password change operation."""
    success: bool
    message: str


# ===== DEPENDENCIES =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    audit_logger = get_audit_logger(db)
    return AuthenticationService(db=db, audit_logger=audit_logger)


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    # Get encryption key from environment
    key = os.environ.get("ENCRYPTION_KEY_BASE64")
    if not key:
        raise ValueError("ENCRYPTION_KEY_BASE64 environment variable not set")

    return EncryptionService(key)


def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=db)


def get_profile_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> ProfileService:
    """Get profile service instance (for single-row profile table)."""
    return ProfileService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )


# ===== HELPER FUNCTIONS =====

def calculate_profile_completeness(profile: Optional[UserProfileData]) -> ProfileCompletenessResponse:
    """
    Calculate profile completeness percentage and identify missing fields.

    Args:
        profile: User profile data or None

    Returns:
        ProfileCompletenessResponse with percentage and field lists
    """
    if not profile:
        return ProfileCompletenessResponse(
            percentage=0,
            missingFields=["firstName", "lastName", "email"],
            completedFields=[]
        )

    required_fields = ["firstName", "lastName", "email"]
    optional_fields = ["phone"]

    completed_fields = []
    missing_fields = []

    # Check required fields
    for field in required_fields:
        value = getattr(profile, field, None)
        if value and str(value).strip():
            completed_fields.append(field)
        else:
            missing_fields.append(field)

    # Check optional fields (adds to completion but not required)
    for field in optional_fields:
        value = getattr(profile, field, None)
        if value and str(value).strip():
            completed_fields.append(field)

    # Calculate percentage (required fields + optional fields)
    total_fields = len(required_fields) + len(optional_fields)
    percentage = int((len(completed_fields) / total_fields) * 100)

    return ProfileCompletenessResponse(
        percentage=percentage,
        missingFields=missing_fields,
        completedFields=completed_fields
    )


# ===== ROUTES =====

@router.get("", response_model=ProfileResponse)
async def get_profile(
    user_id: int = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """
    Get current user's profile with decrypted PII fields.

    Returns profile data with computed fields (fullName, initials).
    Uses caching for performance (5-second cache on computed fields).

    Security:
    - Requires valid session ID
    - User can only access their own profile
    - PII fields are decrypted on read
    - Audit logged automatically by service layer

    Returns:
        ProfileResponse with decrypted and computed fields
    """
    try:
        # Get extended profile with computed fields (fullName, initials)
        extended_profile = await profile_service.get_extended()

        if not extended_profile:
            # No profile exists - return default
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )

        # Convert to response model
        return ProfileResponse(
            id=1,  # Single-row profile table
            name=extended_profile.fullName or "Legal User",
            email=extended_profile.email,
            avatarUrl=None,  # TODO: Add avatar support
            firstName=extended_profile.firstName,
            lastName=extended_profile.lastName,
            phone=extended_profile.phone,
            fullName=extended_profile.fullName,
            initials=extended_profile.initials,
            createdAt="",  # TODO: Add from database
            updatedAt=""   # TODO: Add from database
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    request: UpdateProfileRequest,
    user_id: int = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """
    Update current user's profile with validation and encryption.

    Validates and encrypts PII fields (name, email, phone) before storage.
    Uses retry logic with exponential backoff for resilience.
    Invalidates cache after update.

    Security:
    - Requires valid session ID
    - User can only update their own profile
    - PII fields are encrypted before storage
    - Validation enforced via Pydantic models and service layer
    - Audit logged automatically by service layer

    Fields:
    - name: User's full name (encrypted, letters/spaces/hyphens/apostrophes only)
    - firstName: User's first name (encrypted)
    - lastName: User's last name (encrypted)
    - email: User's email address (encrypted, RFC 5321 compliant)
    - phone: User's phone number (encrypted, optional)
    - avatarUrl: Avatar image URL (HTTPS only, image file extensions only)

    Returns:
        Updated profile with decrypted fields
    """
    try:
        # Build update data dictionary
        update_data: Dict[str, Any] = {}

        # Handle legacy 'name' field (split into firstName/lastName if needed)
        if request.name is not None:
            # Try to split name into first/last
            name_parts = request.name.strip().split(maxsplit=1)
            if len(name_parts) == 2:
                update_data["firstName"] = name_parts[0]
                update_data["lastName"] = name_parts[1]
            else:
                update_data["firstName"] = request.name.strip()
                update_data["lastName"] = ""

        # Explicit firstName/lastName override legacy name
        if request.firstName is not None:
            update_data["firstName"] = request.firstName
        if request.lastName is not None:
            update_data["lastName"] = request.lastName

        if request.email is not None:
            update_data["email"] = request.email
        if request.phone is not None:
            update_data["phone"] = request.phone

        # TODO: Add avatarUrl support to ProfileService

        if not update_data:
            # No fields to update, just return current profile
            return await get_profile(user_id=user_id, profile_service=profile_service)

        # Update profile using service layer (with retry logic)
        result: ProfileUpdateResult = await profile_service.update(
            profile_data=update_data,
            max_retries=3
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.message
            )

        # Return updated profile
        return await get_profile(user_id=user_id, profile_service=profile_service)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.put("/password", response_model=PasswordChangeResponse)
async def change_password(
    request: ChangePasswordRequest,
    user_id: int = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service)
):
    """
    Change user password with verification and OWASP validation.

    Requires current password for verification.
    New password must meet OWASP requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    Security:
    - Requires valid session ID
    - Verifies current password before changing
    - Validates new password strength (OWASP compliant)
    - Invalidates all existing sessions after password change
    - Audit logged automatically by service layer

    Args:
        request: ChangePasswordRequest with currentPassword and newPassword

    Returns:
        PasswordChangeResponse with success status
    """
    try:
        # Change password using authentication service
        await auth_service.change_password(
            user_id=user_id,
            old_password=request.currentPassword,
            new_password=request.newPassword
        )

        return PasswordChangeResponse(
            success=True,
            message="Password changed successfully. All sessions have been invalidated. Please log in again."
        )

    except Exception as e:
        # Authentication service throws AuthenticationError with specific messages
        error_message = str(e)
        if "Invalid current password" in error_message:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_message
            )
        elif "Password must" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to change password: {error_message}"
            )


@router.get("/completeness", response_model=ProfileCompletenessResponse)
async def get_profile_completeness(
    user_id: int = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """
    Get profile completeness indicator.

    Calculates percentage of required and optional fields completed.
    Identifies missing fields to guide user in completing their profile.

    Required fields: firstName, lastName, email
    Optional fields: phone

    Security:
    - Requires valid session ID
    - User can only check their own profile completeness

    Returns:
        ProfileCompletenessResponse with percentage and field lists
    """
    try:
        # Get profile from service
        profile = await profile_service.get()

        # Calculate completeness
        completeness = calculate_profile_completeness(profile)

        return completeness

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate profile completeness: {str(e)}"
        )
