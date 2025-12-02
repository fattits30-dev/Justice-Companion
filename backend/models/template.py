"""Template model for case templates management."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.user import User

class TemplateCategory(str, enum.Enum):
    """Template category enumeration matching database CHECK constraint."""

    CIVIL = "civil"
    CRIMINAL = "criminal"
    FAMILY = "family"
    EMPLOYMENT = "employment"
    HOUSING = "housing"
    IMMIGRATION = "immigration"
    OTHER = "other"

class CaseTemplate(Base):
    """
    Case template model - represents reusable templates for legal cases.

    Schema from 020_create_templates_system.sql:
    - id: Auto-incrementing primary key
    - name: Template name
    - description: Template description
    - category: Template category (civil, criminal, family, employment, housing, immigration, other)
    - is_system_template: Boolean flag (0 = user template, 1 = system template)
    - user_id: Foreign key to users table (NULL for system templates)
    - template_fields_json: JSON string containing case field templates
    - suggested_evidence_types_json: JSON array of evidence types
    - timeline_milestones_json: JSON array of timeline milestones
    - checklist_items_json: JSON array of checklist items
    - created_at: Template creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "case_templates"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    is_system_template: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # JSON fields (stored as TEXT in SQLite)
    template_fields_json: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_evidence_types_json: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    timeline_milestones_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    checklist_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="templates")
    usage_records: Mapped[list["TemplateUsage"]] = relationship(
        "TemplateUsage", back_populates="template", cascade="all, delete-orphan"
    )

    # Add CHECK constraints
    __table_args__ = (
        CheckConstraint(
            category.in_(
                [
                    "civil",
                    "criminal",
                    "family",
                    "employment",
                    "housing",
                    "immigration",
                    "other",
                ]
            ),
            name="check_template_category",
        ),
        CheckConstraint(
            is_system_template.in_([0, 1]), name="check_is_system_template"
        ),
    )

    def to_dict(self, include_json: bool = True) -> Dict[str, Any]:
        """
        Convert CaseTemplate model to dictionary for JSON serialization.

        Args:
            include_json: Whether to parse and include JSON fields (default: True)
        """
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "isSystemTemplate": bool(self.is_system_template),
            "userId": self.user_id,
            "createdAt": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updatedAt": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
        }

        if include_json:
            import json

            # Parse JSON fields
            result["templateFields"] = (
                json.loads(str(self.template_fields_json))
                if self.template_fields_json is not None
                else {}
            )
            result["suggestedEvidenceTypes"] = (
                json.loads(str(self.suggested_evidence_types_json))
                if self.suggested_evidence_types_json is not None
                else []
            )
            result["timelineMilestones"] = (
                json.loads(str(self.timeline_milestones_json))
                if self.timeline_milestones_json is not None
                else []
            )
            result["checklistItems"] = (
                json.loads(str(self.checklist_items_json))
                if self.checklist_items_json is not None
                else []
            )

        return result

    def __repr__(self):
        return f"<CaseTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"

class TemplateUsage(Base):
    """
    Template usage tracking - records when templates are applied to cases.

    Schema from 020_create_templates_system.sql:
    - id: Auto-incrementing primary key
    - template_id: Foreign key to case_templates
    - user_id: Foreign key to users
    - case_id: Foreign key to cases (NULL if case creation failed)
    - used_at: Timestamp when template was used
    """

    __tablename__ = "template_usage"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("case_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Relationships
    template: Mapped["CaseTemplate"] = relationship(
        "CaseTemplate", back_populates="usage_records"
    )
    user: Mapped["User"] = relationship("User", back_populates="template_usages")
    case: Mapped["Case | None"] = relationship("Case", back_populates="template_usages")

    def to_dict(self) -> Dict[str, Any]:
        """Convert TemplateUsage model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "templateId": self.template_id,
            "userId": self.user_id,
            "caseId": self.case_id,
            "usedAt": self.used_at.isoformat() if self.used_at is not None else None,
        }

    def __repr__(self):
        return f"<TemplateUsage(id={self.id}, template_id={self.template_id}, user_id={self.user_id})>"
