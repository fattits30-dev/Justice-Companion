"""
Consent model for GDPR compliance.
Migrated from src/domains/settings/entities/Consent.ts

Tracks user consent for different data processing activities as required by GDPR.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from backend.models.base import Base


class ConsentType(str, Enum):
    """
    Types of consent that users can grant.

    - data_processing: Required for app to function (legal basis for processing)
    - encryption: Consent to encrypt sensitive data at rest
    - ai_processing: Consent to use AI features (optional)
    - marketing: Consent to receive marketing communications (optional)
    """
    DATA_PROCESSING = "data_processing"
    ENCRYPTION = "encryption"
    AI_PROCESSING = "ai_processing"
    MARKETING = "marketing"


class Consent(Base):
    """
    Consent model - tracks user consent for GDPR compliance.

    Implements GDPR Article 7 (Conditions for consent) and Article 7.3 (Right to withdraw consent).

    Schema from 012_consent_management.sql:
    - id: Auto-incrementing primary key
    - user_id: Reference to user who granted/revoked consent
    - consent_type: Type of consent (data_processing, encryption, ai_processing, marketing)
    - granted: Boolean flag indicating if consent is granted
    - granted_at: Timestamp when consent was granted
    - revoked_at: Timestamp when consent was revoked (GDPR Article 7.3)
    - version: Privacy policy version at time of consent (e.g., "1.0")
    - created_at: Record creation timestamp

    Important: Consent records are immutable. To revoke consent, update revoked_at field only.
    """

    __tablename__ = "consents"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    consent_type = Column(String, nullable=False, index=True)
    granted = Column(Boolean, nullable=False, default=False)
    granted_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Add check constraint for consent_type enum
    __table_args__ = (
        CheckConstraint(
            "consent_type IN ('data_processing', 'encryption', 'ai_processing', 'marketing')",
            name="ck_consents_type"
        ),
        # Composite index for user_id + consent_type lookups
        Index("idx_consents_user_type", "user_id", "consent_type"),
        # Unique constraint: one active consent per user per type (enforced in service layer)
        # Note: SQLite partial indexes (WHERE revoked_at IS NULL) are created in migration
    )

    def to_dict(self):
        """Convert Consent model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "consentType": self.consent_type,
            "granted": self.granted,
            "grantedAt": self.granted_at.isoformat() if self.granted_at else None,
            "revokedAt": self.revoked_at.isoformat() if self.revoked_at else None,
            "version": self.version,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

    def is_active(self) -> bool:
        """Check if consent is currently active (granted and not revoked)."""
        return self.granted and self.revoked_at is None

    def __repr__(self):
        return (
            f"<Consent(id={self.id}, user_id={self.user_id}, "
            f"type='{self.consent_type}', granted={self.granted}, "
            f"revoked={self.revoked_at is not None})>"
        )
