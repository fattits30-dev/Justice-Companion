"""User model for authentication."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.ai_provider_config import AIProviderConfig
    from backend.models.case import Case
    from backend.models.deadline import Deadline
    from backend.models.notification import Notification, NotificationPreferences
    from backend.models.session import Session
    from backend.models.tag import Tag
    from backend.models.template import CaseTemplate, TemplateUsage
    from backend.models.profile import UserProfile

class User(Base):
    """
    User model - represents authenticated users in the system.

    Schema from 010_authentication_system.sql:
    - id: Auto-incrementing primary key
    - username: Unique username for login
    - email: Unique email address
    - password_hash: bcrypt/scrypt hashed password
    - password_salt: Random salt for password hashing
    - role: User role ('user' or 'admin')
    - is_active: Account active status
    - created_at: Account creation timestamp
    - updated_at: Last update timestamp
    - last_login_at: Last successful login timestamp
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    username: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    password_salt: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    sessions: Mapped[list["Session"]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    cases: Mapped[list["Case"]] = relationship(
        "Case", back_populates="user", cascade="all, delete-orphan"
    )
    deadlines: Mapped[list["Deadline"]] = relationship(
        "Deadline", back_populates="user", cascade="all, delete-orphan"
    )
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", back_populates="user", cascade="all, delete-orphan"
    )
    templates: Mapped[list["CaseTemplate"]] = relationship(
        "CaseTemplate", back_populates="user", cascade="all, delete-orphan"
    )
    template_usages: Mapped[list["TemplateUsage"]] = relationship(
        "TemplateUsage", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    notification_preferences: Mapped["NotificationPreferences | None"] = relationship(
        "NotificationPreferences",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    profile: Mapped["UserProfile | None"] = relationship(
        "UserProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    ai_provider_configs: Mapped[list["AIProviderConfig"]] = relationship(
        "AIProviderConfig", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Convert User model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
            "last_login_at": (
                self.last_login_at.isoformat()
                if self.last_login_at is not None
                else None
            ),
        }

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
