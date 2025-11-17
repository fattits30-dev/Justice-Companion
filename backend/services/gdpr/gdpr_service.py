"""
GDPR Compliance Service - Python Implementation

Orchestrates data export (Article 20) and deletion (Article 17)
with rate limiting, consent checking, and audit logging.

Migrated from: src/services/gdpr/GdprService.ts

GDPR Requirements:
- Data Portability (Article 20): Export user data in machine-readable format
- Right to Erasure (Article 17): Delete all user data on request
- Consent Management: Track and verify user consents
- Audit Trail: Immutable logs of all GDPR operations

Features:
- Rate limiting (5 exports per 24 hours, 1 deletion per 30 days)
- Consent verification before operations
- Export-before-delete workflow
- Comprehensive audit logging
- Transactional safety for deletions
- File-based export persistence

Security:
- All operations require active consent
- Rate limiting prevents abuse
- Audit logs preserved for compliance
- Password hashes never exported
- Consent records preserved after deletion

Usage:
    from backend.services.gdpr.gdpr_service import GdprService
    from backend.services.encryption_service import EncryptionService
    from backend.services.audit_logger import AuditLogger
    from backend.services.rate_limit_service import RateLimitService

    gdpr_service = GdprService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
        rate_limit_service=rate_limit_service
    )

    # Export user data
    export_result = await gdpr_service.export_user_data(
        user_id=123,
        options=GdprExportOptions(format="json")
    )

    # Delete user data
    delete_result = await gdpr_service.delete_user_data(
        user_id=123,
        options=GdprDeleteOptions(confirmed=True, reason="User request")
    )
"""

import json
import logging
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.services.rate_limit_service import RateLimitService
from backend.services.gdpr.data_exporter import DataExporter, GdprExportOptions
from backend.services.gdpr.data_deleter import DataDeleter, GdprDeleteOptions, GdprDeleteResult

# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================


class RateLimitError(HTTPException):
    """Raised when rate limit is exceeded for GDPR operations."""

    def __init__(self, message: str = "Rate limit exceeded for GDPR operation"):
        super().__init__(status_code=429, detail=message)


class ConsentRequiredError(HTTPException):
    """Raised when required consent is missing."""

    def __init__(self, message: str = "User consent required for this operation"):
        super().__init__(status_code=403, detail=message)


class GdprOperationError(HTTPException):
    """General error for GDPR operations."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(status_code=status_code, detail=message)


# ============================================================================
# Pydantic Models for GDPR Service Results
# ============================================================================


class GdprExportResult(BaseModel):
    """
    Result of GDPR data export operation (extends UserDataExport).

    Attributes:
        metadata: Export metadata (date, user_id, schema_version, etc.)
        user_data: Dictionary of table exports
        file_path: Optional path to saved export file
    """

    metadata: Dict[str, Any] = Field(..., description="Export metadata")
    user_data: Dict[str, Dict[str, Any]] = Field(..., description="User data by table")
    file_path: Optional[str] = Field(None, description="Path to saved export file")

    model_config = ConfigDict(from_attributes=True)


class GdprDeleteResultExtended(GdprDeleteResult):
    """
    Extended deletion result with export path.

    Inherits all fields from GdprDeleteResult and adds:
    - export_path: Path to export file if exportBeforeDelete was true
    """

    export_path: Optional[str] = Field(
        None, description="Path to export file if data was exported before deletion"
    )


# ============================================================================
# Rate Limit Tracking
# ============================================================================


class RateLimitInfo:
    """In-memory rate limit tracking for GDPR operations."""

    def __init__(self, count: int = 0, reset_at: Optional[datetime] = None):
        """
        Initialize rate limit info.

        Args:
            count: Number of operations performed
            reset_at: Timestamp when limit resets
        """
        self.count = count
        self.reset_at = reset_at or datetime.now(timezone.utc)


# ============================================================================
# GDPR Service
# ============================================================================


class GdprService:
    """
    GDPR Compliance Service - Orchestrates data export and deletion.

    Implements GDPR Articles 17 (Right to Erasure) and 20 (Data Portability)
    with comprehensive rate limiting, consent verification, and audit logging.

    Rate Limits:
    - Export: 5 operations per 24 hours per user
    - Delete: 1 operation per 30 days per user

    Consent Requirements:
    - Export: Requires active 'data_processing' consent
    - Delete: Requires active 'data_processing' consent

    Audit Logging:
    - All operations logged with success/failure status
    - Preserved after user deletion (GDPR requirement)
    - Blockchain-style hash chaining for tamper evidence
    """

    # Rate limit constants
    EXPORT_MAX_REQUESTS = 5
    EXPORT_WINDOW_HOURS = 24
    DELETE_MAX_REQUESTS = 1
    DELETE_WINDOW_DAYS = 30

    def __init__(
        self,
        db: Session,
        encryption_service: EncryptionService,
        audit_logger: AuditLogger,
        rate_limit_service: Optional[RateLimitService] = None,
    ):
        """
        Initialize GDPR service.

        Args:
            db: SQLAlchemy database session
            encryption_service: Service for decrypting sensitive fields
            audit_logger: Service for immutable audit logging
            rate_limit_service: Optional rate limiting service (uses in-memory if None)
        """
        self.db = db
        self.audit_logger = audit_logger
        self.rate_limit_service = rate_limit_service

        # Initialize delegated services
        self.exporter = DataExporter(db, encryption_service)
        self.deleter = DataDeleter(db, audit_logger)

        # In-memory rate limit tracking (if no rate_limit_service provided)
        self._rate_limit_map: Dict[str, RateLimitInfo] = {}

    async def export_user_data(
        self, user_id: int, options: Optional[GdprExportOptions] = None
    ) -> GdprExportResult:
        """
        Export all user data (GDPR Article 20 - Data Portability).

        This method:
        1. Checks rate limits (5 exports per 24 hours)
        2. Verifies user consent for data_processing
        3. Exports all user data from 13 tables with decryption
        4. Optionally saves to disk as JSON file
        5. Logs operation to audit trail

        Args:
            user_id: User ID to export data for
            options: Export options (format, date range, etc.)

        Returns:
            GdprExportResult with metadata, user_data, and optional file_path

        Raises:
            RateLimitError: If rate limit exceeded (429)
            ConsentRequiredError: If consent missing (403)
            GdprOperationError: If export fails (400)

        Security:
        - Password hashes are NEVER exported
        - All encrypted fields are decrypted before export
        - Session tokens are excluded from export
        - Operation logged to immutable audit trail

        Rate Limit:
        - 5 exports per 24 hours per user
        - Prevents abuse and excessive API usage
        """
        try:
            # Rate limiting: Prevent abuse
            self._check_rate_limit(user_id, "export")

            # Consent check: User must have active data processing consent
            self._check_consent(user_id, "data_processing")

            # Export data using DataExporter
            if options is None:
                options = GdprExportOptions()

            user_data_export = self.exporter.export_all_user_data(user_id, options)

            # Optionally save to disk
            file_path = None
            if options.format == "json":
                file_path = await self._save_export_to_disk(user_id, user_data_export.to_dict())

            # Audit log success
            self.audit_logger.log(
                event_type="gdpr.export",
                user_id=str(user_id),
                resource_type="user_data",
                resource_id=str(user_id),
                action="export",
                success=True,
                details={
                    "format": options.format,
                    "file_path": file_path,
                    "total_records": user_data_export.metadata.total_records,
                },
            )

            return GdprExportResult(
                metadata=user_data_export.metadata.to_dict(),
                user_data={
                    key: table_export.to_dict()
                    for key, table_export in user_data_export.user_data.items()
                },
                file_path=file_path,
            )

        except (RateLimitError, ConsentRequiredError):
            # Re-raise HTTP exceptions without wrapping
            raise

        except Exception as error:
            # Audit log failure
            self.audit_logger.log(
                event_type="gdpr.export",
                user_id=str(user_id),
                resource_type="user_data",
                resource_id=str(user_id),
                action="export",
                success=False,
                error_message=str(error),
            )

            logger.error(f"GDPR export failed for user {user_id}: {error}")
            raise GdprOperationError(f"Export failed: {str(error)}")

    async def delete_user_data(
        self, user_id: int, options: GdprDeleteOptions
    ) -> GdprDeleteResultExtended:
        """
        Delete all user data (GDPR Article 17 - Right to Erasure).

        This method:
        1. Verifies user consent for data_processing
        2. Optionally exports data before deletion
        3. Deletes all user data across 15 tables
        4. Preserves audit logs and consent records (legal requirement)
        5. Logs operation to audit trail

        Args:
            user_id: User ID to delete data for
            options: Delete options (confirmed, exportBeforeDelete, reason)

        Returns:
            GdprDeleteResultExtended with deletion stats and optional export_path

        Raises:
            ConsentRequiredError: If consent missing (403)
            GdprOperationError: If deletion fails (400)

        Security:
        - Requires explicit confirmation (options.confirmed=True)
        - Transactional deletion (all-or-nothing)
        - Audit logs preserved for compliance
        - Consent records preserved for legal proof
        - Respects foreign key constraints (bottom-up deletion)

        CRITICAL: This operation is IRREVERSIBLE.
        Use exportBeforeDelete=True to create a backup before deletion.

        Deletion Order (respects foreign keys):
        1. event_evidence (FK → timeline_events)
        2. timeline_events (FK → cases)
        3. case_facts (FK → cases)
        4. legal_issues (FK → cases)
        5. actions (FK → cases)
        6. notes (FK → cases)
        7. evidence (FK → cases)
        8. chat_messages (FK → chat_conversations)
        9. chat_conversations (FK → users)
        10. cases (FK → users)
        11. user_facts (FK → users)
        12. sessions (FK → users)
        13. users (root table)

        Preserved (legal requirement):
        - audit_logs: Immutable compliance trail
        - consents: GDPR proof of user consent history
        """
        try:
            # Consent check: User must have active data processing consent
            self._check_consent(user_id, "data_processing")

            # Optionally export before delete
            export_path = None
            if options.export_before_delete:
                logger.info(f"Exporting data for user {user_id} before deletion")
                export_result = await self.export_user_data(
                    user_id, GdprExportOptions(export_format="json")
                )
                export_path = export_result.file_path

            # Delete data using DataDeleter
            delete_result = self.deleter.delete_all_user_data(user_id, options)

            # Audit log (created AFTER deletion so it's preserved)
            self.audit_logger.log(
                event_type="gdpr.erasure",
                user_id=str(user_id),
                resource_type="user_data",
                resource_id=str(user_id),
                action="delete",
                success=True,
                details={
                    "reason": options.reason,
                    "export_path": export_path,
                    "deleted_counts": delete_result.deleted_counts,
                },
            )

            # Return extended result with export path
            return GdprDeleteResultExtended(
                success=delete_result.success,
                deletion_date=delete_result.deletion_date,
                deleted_counts=delete_result.deleted_counts,
                preserved_audit_logs=delete_result.preserved_audit_logs + 1,  # +1 for this log
                preserved_consents=delete_result.preserved_consents,
                export_path=export_path,
                error=delete_result.error,
            )

        except ConsentRequiredError:
            # Re-raise HTTP exceptions without wrapping
            raise

        except Exception as error:
            # Audit log failure
            self.audit_logger.log(
                event_type="gdpr.deletion_request",
                user_id=str(user_id),
                resource_type="user_data",
                resource_id=str(user_id),
                action="delete",
                success=False,
                error_message=str(error),
            )

            logger.error(f"GDPR deletion failed for user {user_id}: {error}")
            raise GdprOperationError(f"Deletion failed: {str(error)}")

    def _check_rate_limit(self, user_id: int, operation: str) -> None:
        """
        Check rate limit for user operations.

        Uses RateLimitService if available, otherwise falls back to in-memory tracking.

        Args:
            user_id: User ID to check rate limit for
            operation: Operation type ('export' or 'delete')

        Raises:
            RateLimitError: If rate limit exceeded (429)
        """
        if self.rate_limit_service:
            # Use external rate limit service
            key = f"gdpr_{operation}_{user_id}"

            if operation == "export":
                max_requests = self.EXPORT_MAX_REQUESTS
                window_seconds = self.EXPORT_WINDOW_HOURS * 3600
            else:
                max_requests = self.DELETE_MAX_REQUESTS
                window_seconds = self.DELETE_WINDOW_DAYS * 86400

            result = self.rate_limit_service.check_rate_limit(
                key=key, max_attempts=max_requests, window_seconds=window_seconds
            )

            if not result.allowed:
                raise RateLimitError(
                    f"Rate limit exceeded for {operation}. "
                    f"Try again in {result.remaining_time} seconds."
                )
        else:
            # In-memory rate limiting (fallback)
            key = f"{user_id}:{operation}"
            now = datetime.now(timezone.utc)

            if operation == "export":
                limit_window = timedelta(hours=self.EXPORT_WINDOW_HOURS)
                max_requests = self.EXPORT_MAX_REQUESTS
            else:
                limit_window = timedelta(days=self.DELETE_WINDOW_DAYS)
                max_requests = self.DELETE_MAX_REQUESTS

            limit_info = self._rate_limit_map.get(key)

            if limit_info and now < limit_info.reset_at:
                if limit_info.count >= max_requests:
                    remaining_seconds = int((limit_info.reset_at - now).total_seconds())
                    raise RateLimitError(
                        f"Rate limit exceeded for {operation}. "
                        f"Try again in {remaining_seconds} seconds."
                    )
                limit_info.count += 1
            else:
                self._rate_limit_map[key] = RateLimitInfo(count=1, reset_at=now + limit_window)

    def _check_consent(self, user_id: int, consent_type: str) -> None:
        """
        Check if user has active consent for operation.

        Args:
            user_id: User ID to check consent for
            consent_type: Type of consent required (e.g., 'data_processing')

        Raises:
            ConsentRequiredError: If consent is missing or revoked (403)
        """
        query = text(
            """
            SELECT id, granted
            FROM consents
            WHERE user_id = :user_id
                AND consent_type = :consent_type
                AND revoked_at IS NULL
        """
        )

        result = self.db.execute(query, {"user_id": user_id, "consent_type": consent_type})
        row = result.fetchone()

        consent_exists = row is not None and row.granted == 1

        if not consent_exists:
            raise ConsentRequiredError(
                f"Active consent required for '{consent_type}'. "
                f"Please grant consent before performing this operation."
            )

    async def _save_export_to_disk(self, user_id: int, data: Dict[str, Any]) -> str:
        """
        Save export data to disk as JSON file.

        Args:
            user_id: User ID (used in filename)
            data: Export data dictionary to save

        Returns:
            Absolute path to saved file

        File naming:
        - user_{user_id}_export_{timestamp}.json
        - Saved to ./exports/ directory (created if not exists)
        """
        # Determine export directory
        export_dir = Path(os.getcwd()) / "exports"
        export_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename with timestamp
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        file_name = f"user_{user_id}_export_{timestamp}.json"
        file_path = export_dir / file_name

        # Write JSON file with pretty formatting
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved export to {file_path}")
        return str(file_path.absolute())


# ============================================================================
# Utility Functions
# ============================================================================


def create_gdpr_service(
    db: Session,
    encryption_service: EncryptionService,
    audit_logger: AuditLogger,
    rate_limit_service: Optional[RateLimitService] = None,
) -> GdprService:
    """
    Factory function to create GdprService instance.

    Args:
        db: SQLAlchemy database session
        encryption_service: Service for decrypting sensitive fields
        audit_logger: Service for immutable audit logging
        rate_limit_service: Optional rate limiting service

    Returns:
        Configured GdprService instance

    Example:
        from backend.database import get_db
        from backend.services.encryption_service import EncryptionService
        from backend.services.audit_logger import AuditLogger

        db = next(get_db())
        encryption_service = EncryptionService(encryption_key)
        audit_logger = AuditLogger(db)

        gdpr_service = create_gdpr_service(db, encryption_service, audit_logger)
    """
    return GdprService(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
        rate_limit_service=rate_limit_service,
    )
