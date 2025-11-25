"""Tag models for case organization."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.case import Case
    from backend.models.user import User

class Tag(Base):
    """
    Tag model - user-defined labels for organizing cases.

    Schema from 018_create_tags_system.sql:
    - id: Auto-incrementing primary key
    - user_id: Foreign key to users table (owner of the tag)
    - name: Tag name (unique per user)
    - color: Hex color code for UI display
    - description: Optional tag description
    - created_at: Tag creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False, default="#6B7280")
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="tags")
    case_tags: Mapped[list["CaseTag"]] = relationship(
        "CaseTag", back_populates="tag", cascade="all, delete-orphan"
    )

    # Unique constraint: user cannot have duplicate tag names
    __table_args__ = (
        Index("idx_tags_user_name", "user_id", "name", unique=True),
        Index("idx_tags_user", "user_id"),
        Index("idx_tags_name", "name"),
    )

    def to_dict(self):
        """Convert Tag model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "color": self.color,
            "description": self.description,
            "createdAt": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updatedAt": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}', color='{self.color}')>"

class CaseTag(Base):
    """
    CaseTag model - many-to-many junction table between cases and tags.

    This allows multiple tags to be attached to a single case, and a single tag
    to be used across multiple cases.

    Schema:
    - case_id: Foreign key to cases table
    - tag_id: Foreign key to tags table
    - created_at: Timestamp when tag was attached to case
    """

    __tablename__ = "case_tags"

    case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="case_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="case_tags")

    # Indexes for performance
    __table_args__ = (
        Index("idx_case_tags_case", "case_id"),
        Index("idx_case_tags_tag", "tag_id"),
    )

    def to_dict(self):
        """Convert CaseTag model to dictionary for JSON serialization."""
        return {
            "caseId": self.case_id,
            "tagId": self.tag_id,
            "createdAt": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<CaseTag(case_id={self.case_id}, tag_id={self.tag_id})>"

# Default tag color palette
DEFAULT_TAG_COLORS = [
    "#EF4444",  # Red
    "#F59E0B",  # Amber
    "#10B981",  # Green
    "#3B82F6",  # Blue
    "#8B5CF6",  # Violet
    "#EC4899",  # Pink
    "#6B7280",  # Gray
    "#14B8A6",  # Teal
    "#F97316",  # Orange
    "#A855F7",  # Purple
]
