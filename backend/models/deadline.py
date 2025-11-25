"""Deadline model for case deadline/milestone management."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.case import Case
    from backend.models.user import User


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

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    case_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    deadline_date: Mapped[str] = mapped_column(
        String, nullable=False
    )  # ISO 8601 date format stored as TEXT
    priority: Mapped[DeadlinePriority] = mapped_column(
        SQLEnum(DeadlinePriority, name="deadline_priority", native_enum=False),
        nullable=False,
        default=DeadlinePriority.MEDIUM,
    )
    status: Mapped[DeadlineStatus] = mapped_column(
        SQLEnum(DeadlineStatus, name="deadline_status", native_enum=False),
        nullable=False,
        default=DeadlineStatus.UPCOMING,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="deadlines")
    user: Mapped["User"] = relationship("User", back_populates="deadlines")

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
            "priority": (
                self.priority.value
                if isinstance(self.priority, DeadlinePriority)
                else self.priority
            ),
            "status": (
                self.status.value
                if isinstance(self.status, DeadlineStatus)
                else self.status
            ),
            "completedAt": (
                self.completed_at.isoformat() if self.completed_at is not None else None
            ),
            "createdAt": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updatedAt": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
            "deletedAt": (
                self.deleted_at.isoformat() if self.deleted_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<Deadline(id={self.id}, caseId={self.case_id}, title='{self.title}', status='{self.status}')>"
