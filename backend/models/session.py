"""
Session model for user authentication sessions.
Migrated from src/repositories/SessionRepository.ts
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base


class Session(Base):
    """
    Session model - represents active user sessions.

    Schema from 010_authentication_system.sql:
    - id: UUID primary key (TEXT in SQLite)
    - user_id: Foreign key to users table
    - expires_at: Session expiration timestamp
    - created_at: Session creation timestamp
    - ip_address: Client IP address (optional)
    - user_agent: Client user agent string (optional)
    """

    __tablename__ = "sessions"

    id = Column(String, primary_key=True)  # UUID stored as string
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def to_dict(self):
        """Convert Session model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "expires_at": self.expires_at.isoformat() if self.expires_at is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }

    def __repr__(self):
        return f"<Session(id='{self.id}', user_id={self.user_id}, expires_at='{self.expires_at}')>"
