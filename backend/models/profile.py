"""User profile model for personal information."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.user import User

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

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False, default="Legal User")
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Extended profile fields
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    username: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Legacy fields for backward compatibility
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")

    def to_dict(self, _decrypt_pii: bool = False):
        """
        Convert UserProfile model to dictionary for JSON serialization.

        Args:
            _decrypt_pii: If True, name and email are already decrypted by service layer
                         (unused, but kept for API compatibility)

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
            "created_at": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
        }

    def to_extended_dict(self):
        """
        Convert UserProfile to extended dictionary with computed fields.

        Returns:
            Dictionary with fullName and initials computed from name fields.
        """
        # Compute full name from first_name + last_name or full_name field
        full_name = ""
        if self.full_name is not None:
            full_name = self.full_name
        elif self.first_name is not None and self.last_name is not None:
            full_name = f"{self.first_name} {self.last_name}".strip()
        elif self.name is not None:
            full_name = self.name

        # Compute initials
        initials = "U"  # Default
        if self.first_name is not None and self.last_name is not None:
            initials = f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name is not None:
            initials = self.first_name[0].upper()
        elif self.name is not None:
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
        return (
            f"<UserProfile(id={self.id}, user_id={self.user_id}, name='[ENCRYPTED]')>"
        )
