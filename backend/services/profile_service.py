"""
Profile service for user profile management.
Migrated from src/services/ProfileService.ts

Features:
- Single-row user profile management (id=1 enforced)
- Full profile CRUD operations with validation
- Email and phone number validation
- Name field sanitization (no special characters)
- Field-level encryption for sensitive data (email, phone)
- Comprehensive audit logging for all operations
- Caching for computed fields (fullName, initials)
- Retry logic with exponential backoff for updates

Security:
- Email and phone fields encrypted (AES-256-GCM)
- Input validation with regex patterns
- All operations audited
- HTTPException 400 for validation failures
- HTTPException 404 for non-existent profile
"""

import json
import re
import time
from json import JSONDecodeError
from typing import Optional, Dict, Any, Union
from datetime import datetime

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from backend.models.profile import UserProfile
from backend.services.security.encryption import EncryptionService, EncryptedData

class ProfileValidationError(Exception):
    """Exception raised for profile validation failures."""

class ProfileUpdateError(Exception):
    """Exception raised for profile update failures."""

class UserProfileData(BaseModel):
    """Basic user profile data."""

    firstName: str = Field("", description="User's first name")
    lastName: str = Field("", description="User's last name")
    email: str = Field("", description="User's email address")
    phone: Optional[str] = Field(None, description="User's phone number (optional)")

    model_config = ConfigDict(populate_by_name=True)

class ExtendedUserProfileData(UserProfileData):
    """Extended user profile with computed fields."""

    fullName: str = Field("", description="Full name (computed)")
    initials: str = Field("U", description="User initials (computed)")

    model_config = ConfigDict(populate_by_name=True)

class ProfileFormData(BaseModel):
    """Profile form data used in frontend components."""

    firstName: str = Field("", description="User's first name")
    lastName: str = Field("", description="User's last name")
    email: str = Field("", description="User's email address")
    phone: str = Field("", description="User's phone number")

    model_config = ConfigDict(populate_by_name=True)

class ProfileValidationResult(BaseModel):
    """Profile validation result with field-level errors."""

    isValid: bool = Field(..., description="Whether profile is valid")
    errors: Dict[str, Optional[str]] = Field(
        default_factory=dict, description="Field-level error messages"
    )

    model_config = ConfigDict(populate_by_name=True)

class ProfileUpdateResult(BaseModel):
    """Profile update operation result."""

    success: bool = Field(..., description="Whether update succeeded")
    message: str = Field(..., description="Result message")
    updatedFields: Optional[UserProfileData] = Field(
        None, description="Updated profile fields"
    )

    model_config = ConfigDict(populate_by_name=True)

class ProfileResponse(BaseModel):
    """Response model for profile data."""

    id: int
    name: str
    firstName: Optional[str]
    lastName: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ExtendedProfileResponse(ProfileResponse):
    """Extended profile response with computed fields."""

    fullName: str
    initials: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ProfileService:
    """
    Business logic layer for user profile management.
    Handles encryption, validation, caching, and audit logging.

    This service manages user profiles in the user_profile table.
    Each user has their own profile identified by user_id.
    """

    # Cache configuration (matches TypeScript implementation)
    CACHE_DURATION_MS = 5000  # 5 seconds

    def __init__(
        self,
        db: Session,
        user_id: int,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger=None,
    ):
        """
        Initialize profile service.

        Args:
            db: SQLAlchemy database session
            user_id: Current user's ID
            encryption_service: Optional encryption service for sensitive fields
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.user_id = user_id
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

        # Cache for computed values
        self._extended_profile_cache: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0

    def _invalidate_cache(self) -> None:
        """Clear cache when profile data changes."""
        self._extended_profile_cache = None
        self._cache_timestamp = 0.0

    def _deserialize_encrypted_value(
        self, value: Optional[Union[str, Dict[str, Any], EncryptedData]]
    ) -> Optional[EncryptedData]:
        """Convert stored JSON/dict values into EncryptedData objects."""
        if not value:
            return None

        if isinstance(value, EncryptedData):
            return value

        data: Optional[Dict[str, Any]] = None
        if isinstance(value, dict):
            data = value
        elif isinstance(value, str):
            try:
                parsed = json.loads(value)
            except (JSONDecodeError, ValueError):
                return None
            data = parsed if isinstance(parsed, dict) else None

        if not data:
            return None

        try:
            return EncryptedData.from_dict(data)
        except (KeyError, ValueError):
            return None

    def _decrypt_field(self, value: Optional[str], field_name: str) -> Optional[str]:
        """Decrypt a stored field when possible, otherwise return as-is."""
        if not value or not self.encryption_service:
            return value

        encrypted = self._deserialize_encrypted_value(value)
        if not encrypted:
            return value

        try:
            return self.encryption_service.decrypt(encrypted)
        except Exception as error:
            self._log_audit(
                event_type="profile.decrypt_error",
                user_id=None,
                resource_id=str(self.PROFILE_ID),
                action="decrypt",
                success=False,
                details={"field": field_name, "error": str(error)},
            )
            return value

    def _encrypt_field(self, value: Optional[str]) -> Optional[str]:
        """Encrypt a field and serialize for database storage."""
        if not value or not value.strip():
            return None

        normalized = value.strip()
        if not self.encryption_service:
            return normalized

        encrypted = self.encryption_service.encrypt(normalized)
        if not encrypted:
            return None
        return json.dumps(encrypted.to_dict())

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type="profile",
                resource_id=resource_id,
                action=action,
                details=details or {},
                success=success,
            )

    async def get(self) -> Optional[UserProfileData]:
        """
        Get the current user profile from database.

        Returns:
            UserProfileData if profile exists, None otherwise.
        """
        try:
            profile = (
                self.db.query(UserProfile)
                .filter(UserProfile.user_id == self.user_id)
                .first()
            )

            if not profile:
                self._log_audit(
                    event_type="profile.get",
                    user_id=self.user_id,
                    resource_id=str(self.user_id),
                    action="read",
                    success=False,
                    details={"reason": "Profile not found"},
                )
                return None

            # Decrypt sensitive fields if encryption service is available
            email = (
                self._decrypt_field(profile.email, "email") if profile.email else None
            )
            phone = (
                self._decrypt_field(profile.phone, "phone") if profile.phone else None
            )

            # Return None if no meaningful profile data exists
            if not profile.first_name and not profile.last_name and not email:
                return None

            self._log_audit(
                event_type="profile.get",
                user_id=self.user_id,
                resource_id=str(self.user_id),
                action="read",
                success=True,
            )

            return UserProfileData(
                firstName=profile.first_name or "",
                lastName=profile.last_name or "",
                email=email or "",
                phone=phone or None,
            )

        except SQLAlchemyError as e:
            self._log_audit(
                event_type="profile.get",
                user_id=self.user_id,
                resource_id=str(self.user_id),
                action="read",
                success=False,
                details={"error": str(e)},
            )
            return None

    async def update(
        self, profile_data: Dict[str, Any], max_retries: int = 3
    ) -> ProfileUpdateResult:
        """
        Update user profile data with retry logic and exponential backoff.

        Args:
            profile_data: Partial profile data to update
            max_retries: Maximum number of retry attempts (default: 3)

        Returns:
            ProfileUpdateResult with success status and message
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, max_retries + 1):
            try:
                # Get current profile or create default
                current_profile = await self.get()
                if not current_profile:
                    current_profile = UserProfileData(
                        firstName="", lastName="", email="", phone=None
                    )

                # Merge with updates
                updated_data = {
                    "firstName": profile_data.get(
                        "firstName", current_profile.firstName
                    ),
                    "lastName": profile_data.get("lastName", current_profile.lastName),
                    "email": profile_data.get("email", current_profile.email),
                    "phone": profile_data.get("phone", current_profile.phone),
                }

                updated_profile = UserProfileData(**updated_data)

                # Validate the updated profile
                validation = self.validate(updated_profile.model_dump())
                if not validation.isValid:
                    error_messages = ", ".join(
                        msg for msg in validation.errors.values() if msg
                    )
                    return ProfileUpdateResult(
                        success=False,
                        message=f"Profile validation failed: {error_messages}",
                        updatedFields=None,
                    )

                # Get or create database profile
                db_profile = (
                    self.db.query(UserProfile)
                    .filter(UserProfile.user_id == self.user_id)
                    .first()
                )

                if not db_profile:
                    # Create new profile for this user
                    db_profile = UserProfile(
                        user_id=self.user_id,
                        name="Legal User",
                        first_name="",
                        last_name="",
                        email=None,
                        phone=None,
                    )
                    self.db.add(db_profile)

                # Update fields
                db_profile.first_name = updated_profile.firstName.strip() or None
                db_profile.last_name = updated_profile.lastName.strip() or None

                # Compute full name
                full_name = f"{updated_profile.firstName.strip()} {updated_profile.lastName.strip()}".strip()
                db_profile.name = full_name or "Legal User"

                # Encrypt sensitive fields
                db_profile.email = self._encrypt_field(updated_profile.email)
                db_profile.phone = self._encrypt_field(updated_profile.phone)

                # Commit changes
                self.db.commit()
                self.db.refresh(db_profile)

                # Invalidate cache
                self._invalidate_cache()

                self._log_audit(
                    event_type="profile.update",
                    user_id=self.user_id,
                    resource_id=str(self.user_id),
                    action="update",
                    success=True,
                    details={"attempt": attempt},
                )

                return ProfileUpdateResult(
                    success=True,
                    message="Profile updated successfully",
                    updatedFields=updated_profile,
                )

            except SQLAlchemyError as e:
                last_error = e
                self.db.rollback()

                self._log_audit(
                    event_type="profile.update",
                    user_id=self.user_id,
                    resource_id=str(self.user_id),
                    action="update",
                    success=False,
                    details={
                        "attempt": attempt,
                        "max_retries": max_retries,
                        "error": str(e),
                    },
                )

                # Exponential backoff (if not last attempt)
                if attempt < max_retries:
                    backoff_ms = (2**attempt) * 100  # 200ms, 400ms, 800ms
                    time.sleep(backoff_ms / 1000.0)

            except Exception as exc:
                last_error = exc
                self.db.rollback()

                self._log_audit(
                    event_type="profile.update",
                    user_id=self.user_id,
                    resource_id=str(self.user_id),
                    action="update",
                    success=False,
                    details={"attempt": attempt, "error": str(exc)},
                )

                if attempt < max_retries:
                    backoff_ms = (2**attempt) * 100
                    time.sleep(backoff_ms / 1000.0)

        # All retries failed
        return ProfileUpdateResult(
            success=False,
            message=f"Failed to update profile after {max_retries} attempts: {str(last_error)}",
            updatedFields=None,
        )

    def validate(self, profile_data: Dict[str, Any]) -> ProfileValidationResult:
        """
        Validate profile data according to business rules.

        Args:
            profile_data: Profile data to validate (partial updates allowed)

        Returns:
            ProfileValidationResult with field-level errors
        """
        errors: Dict[str, Optional[str]] = {
            "firstName": None,
            "lastName": None,
            "email": None,
            "phone": None,
        }

        is_valid = True

        # Email validation (if provided)
        email = profile_data.get("email", "")
        if email and email.strip():
            email_regex = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
            if not email_regex.match(email.strip()):
                errors["email"] = "Please enter a valid email address"
                is_valid = False

        # Phone validation (optional, but if provided should be reasonable)
        phone = profile_data.get("phone", "")
        if phone and phone.strip():
            # Remove common formatting characters
            phone_cleaned = re.sub(r"[\s\-()]", "", phone)
            phone_regex = re.compile(r"^[+]?[1-9][\d]{0,15}$")
            if not phone_regex.match(phone_cleaned):
                errors["phone"] = "Please enter a valid phone number"
                is_valid = False

        # Name validation (should not contain special characters)
        name_regex = re.compile(r"^[a-zA-Z\s\-']+$")

        first_name = profile_data.get("firstName", "")
        if first_name and first_name.strip():
            if not name_regex.match(first_name.strip()):
                errors["firstName"] = "First name contains invalid characters"
                is_valid = False

        last_name = profile_data.get("lastName", "")
        if last_name and last_name.strip():
            if not name_regex.match(last_name.strip()):
                errors["lastName"] = "Last name contains invalid characters"
                is_valid = False

        return ProfileValidationResult(isValid=is_valid, errors=errors)

    async def clear(self) -> None:
        """
        Clear all profile data (reset to defaults).

        Note: This doesn't delete the row,
        it resets fields to default values.
        """
        try:
            db_profile = (
                self.db.query(UserProfile)
                .filter(UserProfile.user_id == self.user_id)
                .first()
            )

            if db_profile:
                # Reset to default values
                db_profile.first_name = None
                db_profile.last_name = None
                db_profile.name = "Legal User"
                db_profile.email = None
                db_profile.phone = None

                self.db.commit()

                # Invalidate cache
                self._invalidate_cache()

                self._log_audit(
                    event_type="profile.clear",
                    user_id=self.user_id,
                    resource_id=str(self.user_id),
                    action="delete",
                    success=True,
                )

        except SQLAlchemyError as e:
            self.db.rollback()
            self._log_audit(
                event_type="profile.clear",
                user_id=self.user_id,
                resource_id=str(self.user_id),
                action="delete",
                success=False,
                details={"error": str(e)},
            )
            raise HTTPException(
                status_code=500, detail=f"Failed to clear profile: {str(e)}"
            )

    async def get_extended(self) -> Optional[ExtendedUserProfileData]:
        """
        Get extended profile with computed fields (memoized/cached).

        Caches results for 5 seconds to avoid recomputing fullName and initials
        on every call.

        Returns:
            ExtendedUserProfileData with computed fields, None if no profile exists.
        """
        now = time.time() * 1000  # Convert to milliseconds

        # Return cached result if still valid
        if (
            self._extended_profile_cache
            and (now - self._cache_timestamp) < self.CACHE_DURATION_MS
        ):
            return ExtendedUserProfileData(**self._extended_profile_cache)

        # Get base profile
        profile = await self.get()

        if not profile:
            self._extended_profile_cache = None
            self._cache_timestamp = 0.0
            return None

        # Compute full name
        full_name = f"{profile.firstName} {profile.lastName}".strip()

        # Compute initials
        initials = "U"  # Default
        if profile.firstName and profile.lastName:
            initials = f"{profile.firstName[0]}{profile.lastName[0]}".upper()
        elif profile.firstName:
            initials = profile.firstName[0].upper()

        # Build extended profile
        extended = ExtendedUserProfileData(
            firstName=profile.firstName,
            lastName=profile.lastName,
            email=profile.email,
            phone=profile.phone,
            fullName=full_name,
            initials=initials,
        )

        # Cache result
        self._extended_profile_cache = extended.model_dump()
        self._cache_timestamp = now

        return extended

    def form_data_to_profile(self, form_data: ProfileFormData) -> UserProfileData:
        """
        Convert form data to profile data.

        Args:
            form_data: Form data from frontend

        Returns:
            UserProfileData with sanitized values
        """
        return UserProfileData(
            firstName=form_data.firstName.strip(),
            lastName=form_data.lastName.strip(),
            email=form_data.email.strip(),
            phone=form_data.phone.strip() or None,
        )

    def profile_to_form_data(
        self, profile: Optional[UserProfileData]
    ) -> ProfileFormData:
        """
        Convert profile data to form data.

        Args:
            profile: Profile data or None

        Returns:
            ProfileFormData with default empty strings
        """
        if not profile:
            return ProfileFormData(firstName="", lastName="", email="", phone="")

        return ProfileFormData(
            firstName=profile.firstName or "",
            lastName=profile.lastName or "",
            email=profile.email or "",
            phone=profile.phone or "",
        )
