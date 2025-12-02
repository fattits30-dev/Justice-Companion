"""Case model for legal case management."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.deadline import Deadline
    from backend.models.evidence import Evidence
    from backend.models.tag import CaseTag
    from backend.models.template import TemplateUsage


class CaseType(str, enum.Enum):
    """Case type enumeration matching database CHECK constraint."""

    EMPLOYMENT = "employment"
    HOUSING = "housing"
    CONSUMER = "consumer"
    FAMILY = "family"
    DEBT = "debt"
    OTHER = "other"


class CaseStatus(str, enum.Enum):
    """Case status enumeration matching database CHECK constraint."""

    ACTIVE = "active"
    CLOSED = "closed"
    PENDING = "pending"


class Case(Base):
    """
    Case model - represents legal cases in the system.

    Schema from 001_initial_schema.sql + 011_add_user_ownership.sql:
    - id: Auto-incrementing primary key
    - title: Case title (encrypted in repository layer)
    - description: Detailed case description (encrypted in repository layer)
    - case_type: Type of legal case (employment, housing, consumer, family, debt, other)
    - status: Current case status (active, closed, pending)
    - user_id: Foreign key to users table (owner of the case)
    - created_at: Case creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    case_type: Mapped[CaseType] = mapped_column(
        SQLEnum(CaseType, name="case_type", native_enum=False), nullable=False
    )
    status: Mapped[CaseStatus] = mapped_column(
        SQLEnum(CaseStatus, name="case_status", native_enum=False),
        nullable=False,
        default=CaseStatus.ACTIVE,
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="cases")
    evidence: Mapped[list["Evidence"]] = relationship("Evidence", back_populates="case")
    deadlines: Mapped[list["Deadline"]] = relationship(
        "Deadline", back_populates="case"
    )
    case_tags: Mapped[list["CaseTag"]] = relationship(
        "CaseTag", back_populates="case", cascade="all, delete-orphan"
    )
    template_usages: Mapped[list["TemplateUsage"]] = relationship(
        "TemplateUsage", back_populates="case"
    )

    def to_dict(self):
        """Convert Case model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "case_type": (
                self.case_type.value
                if isinstance(self.case_type, CaseType)
                else self.case_type
            ),
            "status": (
                self.status.value
                if isinstance(self.status, CaseStatus)
                else self.status
            ),
            "user_id": self.user_id,
            "created_at": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<Case(id={self.id}, title='{self.title}', status='{self.status}')>"
