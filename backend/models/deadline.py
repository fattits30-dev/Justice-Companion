"""
Deadline model for case deadline/milestone management.
Migrated from electron/ipc-handlers/deadlines.ts
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base
import enum


class DeadlinePriority(str, enum.Enum):
    """Deadline priority enumeration matching database CHECK constraint."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DeadlineStatus(str, enum.Enum):
    """Deadline status enumeration matching database CHECK constraint."""
    UPCOMING = "upcoming"
    OVERDUE = "overdue"
    COMPLETED = "completed"


class Deadline(Base):
    """
    Deadline model - represents deadlines and milestones for legal cases.

    Schema from 016_create_deadlines_table.sql:
    - id: Auto-incrementing primary key
    - case_id: Foreign key to cases table
    - user_id: Foreign key to users table (owner)
    - title: Deadline title
    - description: Detailed description
    - deadline_date: Due date (ISO 8601 format)
    - priority: Priority level (low, medium, high, critical)
    - status: Current status (upcoming, overdue, completed)
    - completed_at: Timestamp when marked completed
    - created_at: Deadline creation timestamp
    - updated_at: Last update timestamp
    - deleted_at: Soft delete timestamp
    """

    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    deadline_date = Column(String, nullable=False)  # ISO 8601 date format stored as TEXT
    priority = Column(
        SQLEnum(DeadlinePriority, name="deadline_priority", native_enum=False),
        nullable=False,
        default=DeadlinePriority.MEDIUM
    )
    status = Column(
        SQLEnum(DeadlineStatus, name="deadline_status", native_enum=False),
        nullable=False,
        default=DeadlineStatus.UPCOMING
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    case = relationship("Case", back_populates="deadlines")
    user = relationship("User", back_populates="deadlines")

    def to_dict(self):
        """Convert Deadline model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "caseId": self.case_id,
            "userId": self.user_id,
            "title": self.title,
            "description": self.description,
            "deadlineDate": self.deadline_date,
            "dueDate": self.deadline_date,  # Alias for compatibility
            "priority": self.priority.value if isinstance(self.priority, DeadlinePriority) else self.priority,
            "status": self.status.value if isinstance(self.status, DeadlineStatus) else self.status,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "deletedAt": self.deleted_at.isoformat() if self.deleted_at else None,
        }

    def __repr__(self):
        return f"<Deadline(id={self.id}, caseId={self.case_id}, title='{self.title}', status='{self.status}')>"
