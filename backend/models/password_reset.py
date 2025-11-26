"""
Password Reset Token model for Justice Companion.

Provides secure token-based password reset functionality.

Security Features:
- Tokens expire after 6 hours
- One-time use (marked as used after password reset)
- Tracks IP address and user agent for audit purposes
- Automatic cleanup of expired tokens
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.models.base import Base


class PasswordResetToken(Base):
    """Password reset token for forgot password functionality."""

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    user_agent = Column(Text, nullable=True)

    # Relationship to user
    user = relationship("User", backref="password_reset_tokens")

    def __repr__(self) -> str:
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"

    def is_valid(self) -> bool:
        """Check if the token is still valid (not expired and not used)."""
        if self.used_at is not None:
            return False
        if self.expires_at < datetime.utcnow():
            return False
        return True

    def mark_as_used(self) -> None:
        """Mark the token as used."""
        self.used_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token": self.token,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used_at": self.used_at.isoformat() if self.used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_valid": self.is_valid(),
        }
