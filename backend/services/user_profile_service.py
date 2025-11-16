"""
User profile service for managing user personal information.
Migrated from src/services/UserProfileService.ts

Features:
- Single profile per user (UNIQUE constraint on user_id)
- Field-level encryption for PII (name, email)
- Email validation
- Comprehensive audit logging
- User isolation (users can only access their own profile)
- Backward compatibility with legacy plaintext data

Security:
- name and email fields encrypted with AES-256-GCM
- All operations verify user_id ownership
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent profiles
- All security events audited
- GDPR Article 32 compliance
"""

import re
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models.user_profile import UserProfile
from backend.services.encryption_service import EncryptionService, EncryptedData


class ProfileNotFoundError(Exception):
    """Exception raised when profile is not found."""
    pass


class ValidationError(Exception):
    """Exception raised for invalid input data."""
    pass


class DatabaseError(Exception):
    """Exception raised for database operation failures."""
    pass


# Pydantic models for input/output
from pydantic import BaseModel, Field, field_validator


class UpdateUserProfileInput(BaseModel):
    """Input model for updating user profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="User's full name")
    email: Optional[str] = Field(None, description="User's email address")
    avatar_url: Optional[str] = Field(None, description="URL to user's avatar image")
    full_name: Optional[str] = Field(None, description="Full name (alternative)")
    location: Optional[str] = Field(None, description="User's location")
    bio_context: Optional[str] = Field(None, description="User's biography/context")
    username: Optional[str] = Field(None, description="Username")
    phone: Optional[str] = Field(None, description="Phone number")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format."""
        if v is not None and v.strip():
            email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_regex, v.strip()):
                raise ValueError('Invalid email format')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate name is not empty."""
        if v is not None and v.strip() == '':
            raise ValueError('Name cannot be empty')
        return v


class UserProfileResponse(BaseModel):
    """Response model for user profile data."""
    id: int
    user_id: int
    name: str
    email: Optional[str]
    avatar_url: Optional[str]
    full_name: Optional[str]
    location: Optional[str]
    bio_context: Optional[str]
    username: Optional[str]
    phone: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class UserProfileService:
    """
    Business logic layer for user profile management.
    Handles encryption, authorization, and audit logging.

    All operations verify user ownership to prevent unauthorized access.
    Name and email fields are encrypted using AES-256-GCM.
    """

    def __init__(
        self,
        db: Session,
        encryption_service: EncryptionService,
        audit_logger=None
    ):
        """
        Initialize user profile service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Encryption service for PII fields
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger

    def _verify_ownership(self, profile: UserProfile, user_id: int) -> None:
        """
        Verify that user owns the profile.

        Args:
            profile: UserProfile instance to verify
            user_id: User ID making the request

        Raises:
            HTTPException: 403 if user doesn't own the profile
        """
        if profile.user_id != user_id:
            self._log_audit(
                event_type="profile.unauthorized_access",
                user_id=user_id,
                resource_id=str(profile.id),
                action="access_denied",
                success=False,
                details={
                    "reason": "User does not own this profile",
                    "profile_owner": profile.user_id,
                    "requesting_user": user_id
                }
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this profile"
            )

    def _encrypt_field(self, plaintext: Optional[str]) -> Optional[str]:
        """
        Encrypt PII field (name or email).

        Args:
            plaintext: Plain text string

        Returns:
            JSON string of encrypted data or None
        """
        if not plaintext or not plaintext.strip():
            return None

        encrypted = self.encryption_service.encrypt(plaintext.strip())
        if encrypted:
            return json.dumps(encrypted.to_dict())
        return None

    def _decrypt_field(self, encrypted_str: Optional[str]) -> Optional[str]:
        """
        Decrypt PII field with backward compatibility.

        Args:
            encrypted_str: Encrypted JSON string or legacy plaintext

        Returns:
            Decrypted plaintext or None
        """
        if not encrypted_str:
            return None

        try:
            # Try to parse as encrypted data
            encrypted_dict = json.loads(encrypted_str)

            if self.encryption_service.is_encrypted(encrypted_dict):
                encrypted_data = EncryptedData.from_dict(encrypted_dict)
                return self.encryption_service.decrypt(encrypted_data)

            # Not encrypted format - return as-is (legacy plaintext)
            return encrypted_str
        except (json.JSONDecodeError, Exception):
            # JSON parse failed - likely legacy plaintext data
            return encrypted_str

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log({
                "event_type": event_type,
                "user_id": str(user_id) if user_id else None,
                "resource_type": "profile",
                "resource_id": resource_id,
                "action": action,
                "success": success,
                "details": details or {},
                "error_message": error_message
            })

    async def get_profile(self, user_id: int) -> UserProfileResponse:
        """
        Get user profile with ownership verification.
        Creates profile if it doesn't exist (auto-initialization).

        Args:
            user_id: ID of user requesting their profile

        Returns:
            User profile data with decrypted PII

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            profile = self.db.query(UserProfile).filter(
                UserProfile.user_id == user_id
            ).first()

            # Auto-create profile if it doesn't exist
            if not profile:
                profile = UserProfile(
                    user_id=user_id,
                    name=self._encrypt_field("Legal User"),  # Default encrypted name
                    email=None
                )
                self.db.add(profile)
                self.db.commit()
                self.db.refresh(profile)

                self._log_audit(
                    event_type="profile.auto_create",
                    user_id=user_id,
                    resource_id=str(profile.id),
                    action="create",
                    success=True,
                    details={"reason": "Profile auto-created on first access"}
                )

            # Decrypt PII fields
            original_name = profile.name
            original_email = profile.email

            profile.name = self._decrypt_field(profile.name) or "Legal User"
            profile.email = self._decrypt_field(profile.email)

            # Audit: PII accessed (encrypted name/email fields)
            pii_accessed = (
                (original_name and profile.name != original_name) or
                (original_email and profile.email != original_email)
            )

            if pii_accessed:
                self._log_audit(
                    event_type="profile.pii_access",
                    user_id=user_id,
                    resource_id=str(profile.id),
                    action="read",
                    success=True,
                    details={
                        "fields_accessed": ["name", "email"],
                        "encrypted": True
                    }
                )

            return UserProfileResponse.model_validate(profile)

        except Exception as error:
            self._log_audit(
                event_type="profile.read",
                user_id=user_id,
                resource_id="unknown",
                action="read",
                success=False,
                error_message=str(error)
            )
            raise DatabaseError(f"Failed to retrieve profile: {str(error)}")

    async def update_profile(
        self,
        user_id: int,
        input_data: UpdateUserProfileInput
    ) -> UserProfileResponse:
        """
        Update user profile with ownership verification.

        Args:
            user_id: ID of user updating their profile
            input_data: Updated profile data

        Returns:
            Updated profile data with decrypted PII

        Raises:
            ProfileNotFoundError: If profile doesn't exist
            ValidationError: If input validation fails
            DatabaseError: If database operation fails
        """
        try:
            profile = self.db.query(UserProfile).filter(
                UserProfile.user_id == user_id
            ).first()

            # Auto-create profile if it doesn't exist
            if not profile:
                profile = UserProfile(
                    user_id=user_id,
                    name=self._encrypt_field("Legal User"),
                    email=None
                )
                self.db.add(profile)
                self.db.flush()

            fields_updated = []

            # Update encrypted PII fields
            if input_data.name is not None:
                if input_data.name.strip():
                    profile.name = self._encrypt_field(input_data.name)
                    fields_updated.append("name")
                else:
                    raise ValidationError("Name cannot be empty")

            if input_data.email is not None:
                if input_data.email and input_data.email.strip():
                    profile.email = self._encrypt_field(input_data.email)
                    fields_updated.append("email")
                else:
                    profile.email = None
                    fields_updated.append("email")

            # Update non-encrypted fields
            if input_data.avatar_url is not None:
                profile.avatar_url = input_data.avatar_url
                fields_updated.append("avatar_url")

            if input_data.full_name is not None:
                profile.full_name = input_data.full_name
                fields_updated.append("full_name")

            if input_data.location is not None:
                profile.location = input_data.location
                fields_updated.append("location")

            if input_data.bio_context is not None:
                profile.bio_context = input_data.bio_context
                fields_updated.append("bio_context")

            if input_data.username is not None:
                profile.username = input_data.username
                fields_updated.append("username")

            if input_data.phone is not None:
                profile.phone = input_data.phone
                fields_updated.append("phone")

            self.db.commit()
            self.db.refresh(profile)

            # Decrypt PII fields for response
            profile.name = self._decrypt_field(profile.name) or "Legal User"
            profile.email = self._decrypt_field(profile.email)

            self._log_audit(
                event_type="profile.update",
                user_id=user_id,
                resource_id=str(profile.id),
                action="update",
                success=True,
                details={"fields_updated": fields_updated}
            )

            return UserProfileResponse.model_validate(profile)

        except ValidationError:
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="profile.update",
                user_id=user_id,
                resource_id="unknown",
                action="update",
                success=False,
                error_message=str(error)
            )
            raise DatabaseError(f"Failed to update profile: {str(error)}")

    async def delete_profile(self, user_id: int) -> bool:
        """
        Delete user profile (used during account deletion).

        Args:
            user_id: ID of user deleting their profile

        Returns:
            True if deleted successfully

        Raises:
            ProfileNotFoundError: If profile doesn't exist
            DatabaseError: If database operation fails
        """
        try:
            profile = self.db.query(UserProfile).filter(
                UserProfile.user_id == user_id
            ).first()

            if not profile:
                raise ProfileNotFoundError(f"Profile for user {user_id} not found")

            self.db.delete(profile)
            self.db.commit()

            self._log_audit(
                event_type="profile.delete",
                user_id=user_id,
                resource_id=str(profile.id),
                action="delete",
                success=True
            )

            return True

        except ProfileNotFoundError:
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="profile.delete",
                user_id=user_id,
                resource_id="unknown",
                action="delete",
                success=False,
                error_message=str(error)
            )
            raise DatabaseError(f"Failed to delete profile: {str(error)}")
