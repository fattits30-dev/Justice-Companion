"""
Evidence model for legal case evidence management.
Migrated from src/domains/evidence/entities/Evidence.ts
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base
import enum


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

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    content = Column(String, nullable=True)
    evidence_type = Column(
        SQLEnum(EvidenceType, name="evidence_type", native_enum=False),
        nullable=False
    )
    obtained_date = Column(String, nullable=True)  # Stored as TEXT in SQLite
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    case = relationship("Case", back_populates="evidence")

    # Table args for CHECK constraint (file_path XOR content)
    __table_args__ = (
        CheckConstraint(
            "(file_path IS NOT NULL AND content IS NULL) OR (file_path IS NULL AND content IS NOT NULL)",
            name="check_evidence_file_or_content"
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
            "evidenceType": self.evidence_type.value if isinstance(self.evidence_type, EvidenceType) else self.evidence_type,
            "obtainedDate": self.obtained_date,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Evidence(id={self.id}, caseId={self.case_id}, title='{self.title}', type='{self.evidence_type}')>"
