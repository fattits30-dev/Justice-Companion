"""
CaseFact model for storing facts associated with legal cases.
"""

import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class FactCategory(str, enum.Enum):
    """Categories for case facts."""

    TIMELINE = "timeline"
    EVIDENCE = "evidence"
    WITNESS = "witness"
    LOCATION = "location"
    COMMUNICATION = "communication"
    OTHER = "other"


class FactImportance(str, enum.Enum):
    """Importance levels for case facts."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseFact(Base):
    """
    SQLAlchemy model for case facts.

    Each fact is associated with a case and contains structured information
    that helps build the legal narrative for a case.

    Attributes:
        id: Primary key
        case_id: Foreign key to the case this fact belongs to
        fact_content: The actual content/description of the fact
        fact_category: Category classification (timeline, evidence, witness, etc.)
        importance: Importance level (low, medium, high, critical)
        created_at: When the fact was created
        updated_at: When the fact was last updated
    """

    __tablename__ = "case_facts"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fact_content: Mapped[str] = mapped_column(Text, nullable=False)
    fact_category: Mapped[str] = mapped_column(nullable=False, default="other")
    importance: Mapped[str] = mapped_column(nullable=False, default="medium")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship back to Case (optional - requires Case model update)
    # case: Mapped["Case"] = relationship("Case", back_populates="facts")

    def __repr__(self) -> str:
        return (
            f"<CaseFact(id={self.id}, case_id={self.case_id}, "
            f"category={self.fact_category}, importance={self.importance})>"
        )

    def to_dict(self) -> dict:
        """Convert model to dictionary for API responses."""
        return {
            "id": self.id,
            "caseId": self.case_id,
            "factContent": self.fact_content,
            "factCategory": self.fact_category,
            "importance": self.importance,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CaseFact":
        """Create a CaseFact instance from a dictionary."""
        return cls(
            case_id=data.get("caseId") or data.get("case_id"),
            fact_content=data.get("factContent") or data.get("fact_content"),
            fact_category=data.get("factCategory")
            or data.get("fact_category", "other"),
            importance=data.get("importance", "medium"),
        )
