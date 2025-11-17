"""
User model for authentication.
Migrated from src/repositories/UserRepository.ts
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base


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

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # 'user' or 'admin'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="user", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("CaseTemplate", back_populates="user", cascade="all, delete-orphan")
    template_usages = relationship(
        "TemplateUsage", back_populates="user", cascade="all, delete-orphan"
    )
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    notification_preferences = relationship(
        "NotificationPreferences",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    profile = relationship(
        "UserProfile", back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    ai_provider_configs = relationship(
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
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None,
            "last_login_at": (
                self.last_login_at.isoformat() if self.last_login_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
