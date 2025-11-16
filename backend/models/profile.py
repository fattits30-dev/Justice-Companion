"""
User profile model for personal information.
Migrated from src/repositories/UserProfileRepository.ts

Updated from single-row (id=1) to multi-user schema (migration 025).
Schema from 025_add_multiuser_profiles.sql:
- One profile per user (UNIQUE constraint on user_id)
- name and email encrypted (PII fields)
- Optional fields: avatar_url, full_name, location, bio_context, username, phone
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base


class UserProfile(Base):
    """
    User profile model - represents user's personal information.

    Security:
    - name and email fields are encrypted (AES-256-GCM)
    - GDPR Article 32 compliance for personal data
    - Backward compatibility with legacy plaintext data

    Note: After migration 025, this is now a multi-user table with user_id foreign key.
    """

    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name = Column(Text, nullable=False, default="Legal User")  # Encrypted PII
    email = Column(Text, nullable=True)  # Encrypted PII
    avatar_url = Column(Text, nullable=True)

    # Extended profile fields
    full_name = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    bio_context = Column(Text, nullable=True)
    username = Column(Text, nullable=True)  # Added in migration 028
    phone = Column(Text, nullable=True)  # Added in migration 028

    # Legacy fields for backward compatibility
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")

    def to_dict(self, decrypt_pii: bool = False):
        """
        Convert UserProfile model to dictionary for JSON serialization.

        Args:
            decrypt_pii: If True, name and email are already decrypted by service layer

        Returns:
            Dictionary representation of user profile
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,  # Service layer decrypts this
            "email": self.email,  # Service layer decrypts this
            "avatar_url": self.avatar_url,
            "full_name": self.full_name,
            "location": self.location,
            "bio_context": self.bio_context,
            "username": self.username,
            "phone": self.phone,
            # Legacy fields for backward compatibility
            "first_name": self.first_name,
            "last_name": self.last_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_extended_dict(self):
        """
        Convert UserProfile to extended dictionary with computed fields.

        Returns:
            Dictionary with fullName and initials computed from name fields.
        """
        # Compute full name from first_name + last_name or full_name field
        full_name = ""
        if self.full_name:
            full_name = self.full_name
        elif self.first_name and self.last_name:
            full_name = f"{self.first_name} {self.last_name}".strip()
        elif self.name:
            full_name = self.name

        # Compute initials
        initials = "U"  # Default
        if self.first_name and self.last_name:
            initials = f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            initials = self.first_name[0].upper()
        elif self.name:
            parts = self.name.split()
            if len(parts) >= 2:
                initials = f"{parts[0][0]}{parts[1][0]}".upper()
            elif len(parts) == 1:
                initials = parts[0][0].upper()

        return {
            **self.to_dict(),
            "fullName": full_name,
            "initials": initials,
        }

    def __repr__(self):
        return f"<UserProfile(id={self.id}, user_id={self.user_id}, name='[ENCRYPTED]')>"
