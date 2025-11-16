"""
Tag models for case organization.
Migrated from electron/ipc-handlers/tags.ts and src/models/Tag.ts

Models:
- Tag: User-defined tags with name and color
- CaseTag: Many-to-many junction table between cases and tags
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base


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

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=False, default="#6B7280")
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="tags")
    case_tags = relationship("CaseTag", back_populates="tag", cascade="all, delete-orphan")

    # Unique constraint: user cannot have duplicate tag names
    __table_args__ = (
        Index('idx_tags_user_name', 'user_id', 'name', unique=True),
        Index('idx_tags_user', 'user_id'),
        Index('idx_tags_name', 'name'),
    )

    def to_dict(self):
        """Convert Tag model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "color": self.color,
            "description": self.description,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
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

    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    case = relationship("Case", back_populates="case_tags")
    tag = relationship("Tag", back_populates="case_tags")

    # Indexes for performance
    __table_args__ = (
        Index('idx_case_tags_case', 'case_id'),
        Index('idx_case_tags_tag', 'tag_id'),
    )

    def to_dict(self):
        """Convert CaseTag model to dictionary for JSON serialization."""
        return {
            "caseId": self.case_id,
            "tagId": self.tag_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
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
