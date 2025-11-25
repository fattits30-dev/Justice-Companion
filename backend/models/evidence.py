"""Evidence model for legal case evidence management."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base

if TYPE_CHECKING:
    from backend.models.case import Case

class EvidenceType(str, enum.Enum):
    """Evidence type enumeration matching database CHECK constraint."""

    DOCUMENT = "document"
    PHOTO = "photo"
    EMAIL = "email"
    RECORDING = "recording"
    NOTE = "note"
    WITNESS = "witness"

class Evidence(Base):
    """
    Evidence model - represents evidence items attached to legal cases.

    Schema from 001_initial_schema.sql + 024_add_evidence_updated_at.sql:
    - id: Auto-incrementing primary key
    - case_id: Foreign key to cases table
    - title: Evidence title
    - file_path: Path to evidence file (mutually exclusive with content)
    - content: Text content (mutually exclusive with file_path)
    - evidence_type: Type of evidence (document, photo, email, recording, note, witness)
    - obtained_date: Date evidence was obtained
    - created_at: Evidence creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    case_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str | None] = mapped_column(String, nullable=True)
    evidence_type: Mapped[EvidenceType] = mapped_column(
        SQLEnum(EvidenceType, name="evidence_type", native_enum=False), nullable=False
    )
    obtained_date: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP')
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="evidence")

    # Table args for CHECK constraint (file_path XOR content)
    __table_args__ = (
        CheckConstraint(
            "(file_path IS NOT NULL AND content IS NULL) OR (file_path IS NULL AND content IS NOT NULL)",
            name="check_evidence_file_or_content",
        ),
    )

    def to_dict(self):
        """Convert Evidence model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "caseId": self.case_id,
            "title": self.title,
            "filePath": self.file_path,
            "content": self.content,
            "evidenceType": (
                self.evidence_type.value
                if isinstance(self.evidence_type, EvidenceType)
                else self.evidence_type
            ),
            "obtainedDate": self.obtained_date,
            "createdAt": (
                self.created_at.isoformat() if self.created_at is not None else None
            ),
            "updatedAt": (
                self.updated_at.isoformat() if self.updated_at is not None else None
            ),
        }

    def __repr__(self):
        return f"<Evidence(id={self.id}, caseId={self.case_id}, title='{self.title}', type='{self.evidence_type}')>"
