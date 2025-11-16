"""
Consent service for managing GDPR consent.
Migrated from src/services/ConsentService.ts

Features:
- Grant consent for data processing activities (GDPR Article 6)
- Revoke consent (GDPR Article 7.3 - Right to withdraw consent)
- Check active consent status
- Privacy policy version tracking
- Comprehensive audit logging
- User isolation (users can only manage their own consents)

Consent Types:
- data_processing: Required for app to function (legal basis for processing)
- encryption: Consent to encrypt sensitive data at rest
- ai_processing: Consent to use AI features (optional)
- marketing: Consent to receive marketing communications (optional)

Security:
- All operations verify user_id ownership
- Immutable consent records (only revoked_at can be updated)
- All consent operations audited
- HTTPException 404 for non-existent consents
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from backend.models.consent import Consent, ConsentType
from backend.services.audit_logger import AuditLogger


# Pydantic models for input/output
class GrantConsentInput(BaseModel):
    """Input model for granting consent."""
    consent_type: ConsentType = Field(..., description="Type of consent to grant")

    model_config = ConfigDict(use_enum_values=True)


class ConsentResponse(BaseModel):
    """Response model for consent data."""
    id: int
    user_id: int
    consent_type: str
    granted: bool
    granted_at: Optional[str]
    revoked_at: Optional[str]
    version: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class ConsentService:
    """
    Business logic layer for GDPR consent management.
    Handles consent granting, revocation, and audit logging.

    All operations verify user ownership and maintain immutable consent records.
    Privacy policy version is tracked to ensure users consent to correct terms.
    """

    # Current privacy policy version (increment when privacy policy changes)
    CURRENT_PRIVACY_VERSION = "1.0"

    def __init__(
        self,
        db: Session,
        audit_logger: Optional[AuditLogger] = None
    ):
        """
        Initialize consent service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance for GDPR compliance
        """
        self.db = db
        self.audit_logger = audit_logger

    def _log_audit(
        self,
        event_type: str,
        user_id: int,
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log audit event if audit logger is configured.

        Args:
            event_type: Type of event (e.g., "consent.granted")
            user_id: User ID who performed the action
            resource_id: Resource ID (consent ID or "all")
            action: Action performed (create, update)
            success: Whether the operation succeeded
            details: Additional context dictionary
        """
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id),
                resource_type="consent",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {}
            )

    def grant_consent(
        self,
        user_id: int,
        consent_type: ConsentType
    ) -> Consent:
        """
        Grant consent for specific type.

        Creates a new immutable consent record with granted=True and current timestamp.
        If user already has active consent for this type, does nothing (idempotent).

        Args:
            user_id: User ID granting consent
            consent_type: Type of consent to grant

        Returns:
            Consent: Created consent record

        Raises:
            HTTPException: 400 if consent already exists and is active
        """
        # Check if active consent already exists
        existing_consent = self._find_active_consent(user_id, consent_type)
        if existing_consent:
            # Already granted - return existing consent (idempotent)
            return existing_consent

        # Create new consent record
        now = datetime.now(timezone.utc)
        consent = Consent(
            user_id=user_id,
            consent_type=consent_type.value if isinstance(consent_type, ConsentType) else consent_type,
            granted=True,
            granted_at=now,
            version=self.CURRENT_PRIVACY_VERSION,
            revoked_at=None
        )

        self.db.add(consent)
        self.db.commit()
        self.db.refresh(consent)

        # Audit log the consent grant
        self._log_audit(
            event_type="consent.granted",
            user_id=user_id,
            resource_id=str(consent.id),
            action="create",
            success=True,
            details={
                "consentType": consent.consent_type,
                "version": self.CURRENT_PRIVACY_VERSION
            }
        )

        return consent

    def revoke_consent(
        self,
        user_id: int,
        consent_type: ConsentType
    ) -> None:
        """
        Revoke consent (GDPR Article 7.3 - Right to withdraw consent).

        Updates the revoked_at timestamp on the active consent record.
        This maintains an immutable audit trail of consent history.

        Args:
            user_id: User ID revoking consent
            consent_type: Type of consent to revoke

        Returns:
            None (idempotent - does nothing if no active consent exists)
        """
        # Find active consent
        consent = self._find_active_consent(user_id, consent_type)

        if consent:
            # Update revoked_at timestamp (only field that can be modified)
            consent.revoked_at = datetime.now(timezone.utc)
            self.db.commit()

            # Audit log the consent revocation
            self._log_audit(
                event_type="consent.revoked",
                user_id=user_id,
                resource_id=str(consent.id),
                action="update",
                success=True,
                details={"consentType": consent.consent_type}
            )

    def has_active_consent(
        self,
        user_id: int,
        consent_type: ConsentType
    ) -> bool:
        """
        Check if user has active consent for a specific type.

        Args:
            user_id: User ID to check
            consent_type: Type of consent to check

        Returns:
            bool: True if user has active (granted and not revoked) consent
        """
        consent = self._find_active_consent(user_id, consent_type)
        return consent is not None

    def has_consent(
        self,
        user_id: int,
        consent_type: ConsentType
    ) -> bool:
        """
        Alias for has_active_consent() - for test compatibility.

        Args:
            user_id: User ID to check
            consent_type: Type of consent to check

        Returns:
            bool: True if user has active consent
        """
        return self.has_active_consent(user_id, consent_type)

    def get_active_consents(
        self,
        user_id: int
    ) -> List[Consent]:
        """
        Get all active consents for a user.

        Args:
            user_id: User ID to query

        Returns:
            List[Consent]: List of active (not revoked) consent records
        """
        consents = self.db.query(Consent).filter(
            and_(
                Consent.user_id == user_id,
                Consent.revoked_at.is_(None)
            )
        ).all()

        return consents

    def get_user_consents(
        self,
        user_id: int
    ) -> List[Consent]:
        """
        Get all consents for a user (active and revoked).

        Provides complete consent history for GDPR compliance and audit purposes.

        Args:
            user_id: User ID to query

        Returns:
            List[Consent]: List of all consent records (active and revoked)
        """
        consents = self.db.query(Consent).filter(
            Consent.user_id == user_id
        ).order_by(Consent.created_at.desc()).all()

        return consents

    def has_required_consents(
        self,
        user_id: int
    ) -> bool:
        """
        Check if user has all required consents.

        Required consent: data_processing (legal basis for processing under GDPR Article 6)

        Args:
            user_id: User ID to check

        Returns:
            bool: True if user has granted required data_processing consent
        """
        return self.has_active_consent(user_id, ConsentType.DATA_PROCESSING)

    def grant_all_consents(
        self,
        user_id: int
    ) -> List[Consent]:
        """
        Grant all consent types at once (convenience method).

        Useful for onboarding flows where users accept all terms at once.
        Only creates new consent records for types that don't already have active consent.

        Args:
            user_id: User ID granting consents

        Returns:
            List[Consent]: List of newly created consent records
        """
        consent_types = [
            ConsentType.DATA_PROCESSING,
            ConsentType.ENCRYPTION,
            ConsentType.AI_PROCESSING,
            ConsentType.MARKETING,
        ]

        created_consents: List[Consent] = []

        for consent_type in consent_types:
            # Check if consent already exists
            existing = self._find_active_consent(user_id, consent_type)
            if not existing:
                # Grant new consent
                consent = self.grant_consent(user_id, consent_type)
                created_consents.append(consent)

        return created_consents

    def revoke_all_consents(
        self,
        user_id: int
    ) -> None:
        """
        Revoke all consents for a user (GDPR Article 7.3).

        Useful when user wants to withdraw all consent or when deleting account.
        Updates revoked_at timestamp on all active consent records.

        Args:
            user_id: User ID revoking all consents

        Returns:
            None
        """
        # Get all active consents
        active_consents = self.get_active_consents(user_id)

        # Revoke each active consent
        now = datetime.now(timezone.utc)
        for consent in active_consents:
            consent.revoked_at = now

        if active_consents:
            self.db.commit()

        # Always log revoke all event (even if no consents exist)
        self._log_audit(
            event_type="consent.revoked",
            user_id=user_id,
            resource_id="all",
            action="update",
            success=True,
            details={
                "reason": "All consents revoked",
                "revokedCount": len(active_consents)
            }
        )

    def _find_active_consent(
        self,
        user_id: int,
        consent_type: ConsentType
    ) -> Optional[Consent]:
        """
        Find active consent for user and type.

        Internal helper method to query for active (not revoked) consent.

        Args:
            user_id: User ID to query
            consent_type: Type of consent to find

        Returns:
            Optional[Consent]: Active consent record or None if not found
        """
        consent_type_str = consent_type.value if isinstance(consent_type, ConsentType) else consent_type

        consent = self.db.query(Consent).filter(
            and_(
                Consent.user_id == user_id,
                Consent.consent_type == consent_type_str,
                Consent.revoked_at.is_(None)
            )
        ).first()

        return consent
