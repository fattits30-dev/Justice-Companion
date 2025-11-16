"""
Template model for case templates management.
Migrated from src/models/CaseTemplate.ts and electron/ipc-handlers/templates.ts

Database schema from 020_create_templates_system.sql:
- case_templates table with JSON fields for template data
- template_usage table for tracking template application
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base
import enum
from typing import Optional, List, Dict, Any
from datetime import datetime


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

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    is_system_template = Column(Integer, default=0, nullable=False)  # SQLite boolean (0 or 1)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # JSON fields (stored as TEXT in SQLite)
    template_fields_json = Column(Text, nullable=False)
    suggested_evidence_types_json = Column(Text, nullable=True)
    timeline_milestones_json = Column(Text, nullable=True)
    checklist_items_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="templates")
    usage_records = relationship("TemplateUsage", back_populates="template", cascade="all, delete-orphan")

    # Add CHECK constraints
    __table_args__ = (
        CheckConstraint(
            category.in_(["civil", "criminal", "family", "employment", "housing", "immigration", "other"]),
            name="check_template_category"
        ),
        CheckConstraint(
            is_system_template.in_([0, 1]),
            name="check_is_system_template"
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
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_json:
            import json
            # Parse JSON fields
            result["templateFields"] = json.loads(self.template_fields_json) if self.template_fields_json else {}
            result["suggestedEvidenceTypes"] = json.loads(self.suggested_evidence_types_json) if self.suggested_evidence_types_json else []
            result["timelineMilestones"] = json.loads(self.timeline_milestones_json) if self.timeline_milestones_json else []
            result["checklistItems"] = json.loads(self.checklist_items_json) if self.checklist_items_json else []

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

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    template_id = Column(Integer, ForeignKey("case_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True)
    used_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    template = relationship("CaseTemplate", back_populates="usage_records")
    user = relationship("User", back_populates="template_usages")
    case = relationship("Case", back_populates="template_usages")

    def to_dict(self) -> Dict[str, Any]:
        """Convert TemplateUsage model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "templateId": self.template_id,
            "userId": self.user_id,
            "caseId": self.case_id,
            "usedAt": self.used_at.isoformat() if self.used_at else None,
        }

    def __repr__(self):
        return f"<TemplateUsage(id={self.id}, template_id={self.template_id}, user_id={self.user_id})>"
