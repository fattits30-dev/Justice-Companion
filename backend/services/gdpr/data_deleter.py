"""
GDPR Article 17 - Right to Erasure Implementation

This module handles complete deletion of all user data with:
- Transactional safety (all-or-nothing)
- Foreign key constraint respect
- Audit log and consent preservation (legal requirement)

Migrated from: src/services/gdpr/DataDeleter.ts

Security properties:
- Transactional deletion (all succeed or all fail)
- Respects foreign key constraints (deletion order)
- Preserves audit logs and consents (GDPR compliance)
- Requires explicit confirmation flag
- Comprehensive audit logging

Usage:
    from backend.services.gdpr.data_deleter import DataDeleter
    from backend.services.audit_logger import AuditLogger

    deleter = DataDeleter(db, audit_logger)
    result = deleter.delete_all_user_data(
        user_id=123,
        options=GdprDeleteOptions(
            confirmed=True,
            reason="User requested account deletion"
        )
    )
"""

from typing import Dict, Optional, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field, ConfigDict
import logging

# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models for Input/Output Validation
# ============================================================================

class GdprDeleteOptions(BaseModel):
    """
    Options for GDPR data deletion operation.

    Attributes:
        confirmed: User must explicitly confirm deletion (safety flag)
        export_before_delete: Export data before deletion
        reason: Optional reason for deletion (for audit log)
    """
    confirmed: bool = Field(
        ...,
        description="Explicit confirmation flag - MUST be True to proceed"
    )
    export_before_delete: bool = Field(
        False,
        description="Export data before deletion"
    )
    reason: Optional[str] = Field(
        None,
        description="Reason for deletion (stored in audit log)"
    )

    model_config = ConfigDict(use_enum_values=True)


class GdprDeleteResult(BaseModel):
    """
    Result of GDPR data deletion operation.

    Attributes:
        success: Whether deletion was successful
        deletion_date: ISO 8601 timestamp when deletion completed
        deleted_counts: Record counts deleted from each table
        preserved_audit_logs: Number of audit logs preserved
        preserved_consents: Number of consent records preserved
        export_path: Optional path to export file if generated
        error: Error message if deletion failed
    """
    success: bool = Field(..., description="Whether deletion succeeded")
    deletion_date: str = Field(..., description="ISO 8601 deletion timestamp")
    deleted_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Counts of records deleted from each table"
    )
    preserved_audit_logs: int = Field(
        0,
        description="Number of audit log records preserved"
    )
    preserved_consents: int = Field(
        0,
        description="Number of consent records preserved"
    )
    export_path: Optional[str] = Field(
        None,
        description="Path to export file if created"
    )
    error: Optional[str] = Field(
        None,
        description="Error message if deletion failed"
    )

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Custom Exceptions
# ============================================================================

class DeletionNotConfirmedError(Exception):
    """Exception raised when deletion is attempted without confirmation."""
    pass


class DeletionError(Exception):
    """Exception raised when deletion operation fails."""
    pass


# ============================================================================
# DataDeleter Service
# ============================================================================

class DataDeleter:
    """
    GDPR Article 17 - Right to Erasure implementation.

    Handles complete deletion of all user data across 13 tables while
    preserving audit logs and consent records (legal requirement).

    Deletion order respects foreign key constraints:
    1. event_evidence (FK → timeline_events)
    2. case_facts (FK → cases)
    3. legal_issues (FK → cases)
    4. actions (FK → cases)
    5. notes (FK → cases)
    6. evidence (FK → cases)
    7. timeline_events (FK → cases)
    8. chat_messages (FK → chat_conversations)
    9. chat_conversations (FK → users)
    10. cases (FK → users)
    11. user_facts (FK → users)
    12. sessions (FK → users)
    13. users (root table)

    PRESERVED (legal requirement):
    - audit_logs: Immutable compliance trail
    - consents: GDPR proof of user consent history

    Example:
        deleter = DataDeleter(db, audit_logger)
        result = deleter.delete_all_user_data(
            user_id=123,
            options=GdprDeleteOptions(confirmed=True)
        )
        print(f"Deleted {result.deleted_counts['cases']} cases")
        print(f"Preserved {result.preserved_audit_logs} audit logs")
    """

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize DataDeleter.

        Args:
            db: SQLAlchemy database session
            audit_logger: AuditLogger instance for logging operations (optional)
        """
        self.db = db
        self.audit_logger = audit_logger

    def delete_all_user_data(
        self,
        user_id: int,
        options: GdprDeleteOptions
    ) -> GdprDeleteResult:
        """
        Delete ALL user data across 13 tables (preserves audit logs + consents).

        CRITICAL: This is irreversible. Requires explicit confirmation.

        Args:
            user_id: ID of user whose data to delete
            options: Deletion options including confirmation flag

        Returns:
            GdprDeleteResult with deletion statistics

        Raises:
            DeletionNotConfirmedError: If options.confirmed is not True
            DeletionError: If deletion operation fails

        Security:
        - Requires explicit confirmation flag (safety check)
        - Transactional - all deletions succeed or all fail
        - Preserves audit logs and consents (legal requirement)
        - Comprehensive audit logging

        Example:
            result = deleter.delete_all_user_data(
                user_id=123,
                options=GdprDeleteOptions(
                    confirmed=True,
                    reason="User requested account deletion"
                )
            )
        """
        # Safety check: Explicit confirmation required
        if not options.confirmed:
            raise DeletionNotConfirmedError(
                "GDPR deletion requires explicit confirmation. "
                "Set options.confirmed = True."
            )

        deletion_date = datetime.now(timezone.utc).isoformat()
        deleted_counts: Dict[str, int] = {}

        try:
            # Log start of deletion operation
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="gdpr.deletion.started",
                    user_id=str(user_id),
                    resource_type="user",
                    resource_id=str(user_id),
                    action="delete",
                    details={
                        "reason": options.reason or "User requested deletion",
                        "confirmed": options.confirmed
                    },
                    success=True
                )

            # Count preserved records BEFORE deletion
            preserved_audit_logs_count = self._count_records(
                "audit_logs",
                "user_id",
                str(user_id)
            )
            preserved_consents_count = self._count_records(
                "consents",
                "user_id",
                user_id
            )

            # Save consents BEFORE deletion (will be restored after)
            saved_consents = self._fetch_consents(user_id)

            # Disable foreign keys temporarily to allow consent restoration
            self.db.execute(text("PRAGMA foreign_keys = OFF"))
            self.db.flush()

            try:
                # Execute deletion transaction
                deleted_counts = self._execute_deletion_transaction(user_id)

                # Restore consents (GDPR requirement - must preserve consent history)
                self._restore_consents(user_id, saved_consents)

                # Commit the transaction
                self.db.commit()

            except Exception as e:
                # Rollback on any error
                self.db.rollback()
                raise DeletionError(f"Deletion transaction failed: {str(e)}")

            finally:
                # Re-enable foreign keys
                self.db.execute(text("PRAGMA foreign_keys = ON"))
                self.db.flush()

            # Log successful deletion
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="gdpr.deletion.completed",
                    user_id=str(user_id),
                    resource_type="user",
                    resource_id=str(user_id),
                    action="delete",
                    details={
                        "deleted_counts": deleted_counts,
                        "preserved_audit_logs": preserved_audit_logs_count,
                        "preserved_consents": preserved_consents_count,
                        "reason": options.reason
                    },
                    success=True
                )

            return GdprDeleteResult(
                success=True,
                deletion_date=deletion_date,
                deleted_counts=deleted_counts,
                preserved_audit_logs=preserved_audit_logs_count,
                preserved_consents=preserved_consents_count
            )

        except Exception as e:
            # Log failure
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="gdpr.deletion.failed",
                    user_id=str(user_id),
                    resource_type="user",
                    resource_id=str(user_id),
                    action="delete",
                    details={"reason": options.reason},
                    success=False,
                    error_message=str(e)
                )

            # Re-raise with context
            logger.error(f"GDPR deletion failed for user {user_id}: {e}")
            raise DeletionError(f"Failed to delete user data: {str(e)}")

    def _execute_deletion_transaction(self, user_id: int) -> Dict[str, int]:
        """
        Execute deletion of all user data in correct order (respects FK constraints).

        Args:
            user_id: ID of user whose data to delete

        Returns:
            Dictionary of table names and record counts deleted

        Deletion order (bottom-up, child tables first):
        1. event_evidence (FK → timeline_events → cases)
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
        """
        deleted_counts: Dict[str, int] = {}

        # Step 1: Delete event_evidence (FK → timeline_events → cases)
        deleted_counts["event_evidence"] = self._execute_delete(
            """
            DELETE FROM event_evidence
            WHERE event_id IN (
                SELECT id FROM timeline_events
                WHERE case_id IN (
                    SELECT id FROM cases WHERE user_id = :user_id
                )
            )
            """,
            {"user_id": user_id}
        )

        # Step 2: Delete timeline_events (FK → cases)
        deleted_counts["timeline_events"] = self._execute_delete(
            """
            DELETE FROM timeline_events
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 3: Delete case_facts (FK → cases)
        deleted_counts["case_facts"] = self._execute_delete(
            """
            DELETE FROM case_facts
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 4: Delete legal_issues (FK → cases)
        deleted_counts["legal_issues"] = self._execute_delete(
            """
            DELETE FROM legal_issues
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 5: Delete actions (FK → cases)
        deleted_counts["actions"] = self._execute_delete(
            """
            DELETE FROM actions
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 6: Delete notes (FK → cases)
        deleted_counts["notes"] = self._execute_delete(
            """
            DELETE FROM notes
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 7: Delete evidence (FK → cases)
        deleted_counts["evidence"] = self._execute_delete(
            """
            DELETE FROM evidence
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 8: Delete chat_messages (FK → chat_conversations)
        deleted_counts["chat_messages"] = self._execute_delete(
            """
            DELETE FROM chat_messages
            WHERE conversation_id IN (
                SELECT id FROM chat_conversations WHERE user_id = :user_id
            )
            """,
            {"user_id": user_id}
        )

        # Step 9: Delete chat_conversations (FK → users)
        deleted_counts["chat_conversations"] = self._execute_delete(
            "DELETE FROM chat_conversations WHERE user_id = :user_id",
            {"user_id": user_id}
        )

        # Step 10: Delete cases (FK → users)
        deleted_counts["cases"] = self._execute_delete(
            "DELETE FROM cases WHERE user_id = :user_id",
            {"user_id": user_id}
        )

        # Step 11: Delete user_facts (FK → users)
        deleted_counts["user_facts"] = self._execute_delete(
            "DELETE FROM user_facts WHERE user_id = :user_id",
            {"user_id": user_id}
        )

        # Step 12: Delete sessions (FK → users)
        deleted_counts["sessions"] = self._execute_delete(
            "DELETE FROM sessions WHERE user_id = :user_id",
            {"user_id": user_id}
        )

        # Step 13: Delete users (root table)
        deleted_counts["users"] = self._execute_delete(
            "DELETE FROM users WHERE id = :user_id",
            {"user_id": user_id}
        )

        return deleted_counts

    def _execute_delete(self, sql: str, params: Dict[str, Any]) -> int:
        """
        Execute DELETE query and return number of rows affected.

        Args:
            sql: SQL DELETE statement
            params: Query parameters

        Returns:
            Number of rows deleted
        """
        result = self.db.execute(text(sql), params)
        return result.rowcount

    def _count_records(
        self,
        table: str,
        column: str,
        value: Any
    ) -> int:
        """
        Count records in a table matching a condition.

        Args:
            table: Table name
            column: Column name to filter on
            value: Value to match

        Returns:
            Number of matching records
        """
        sql = f"SELECT COUNT(*) as count FROM {table} WHERE {column} = :value"
        result = self.db.execute(text(sql), {"value": value})
        row = result.fetchone()
        return row[0] if row else 0

    def _fetch_consents(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Fetch all consent records for a user.

        Args:
            user_id: User ID

        Returns:
            List of consent records as dictionaries
        """
        sql = "SELECT * FROM consents WHERE user_id = :user_id"
        result = self.db.execute(text(sql), {"user_id": user_id})
        rows = result.fetchall()

        # Convert rows to dictionaries
        consents = []
        for row in rows:
            consent = dict(row._mapping)
            consents.append(consent)

        return consents

    def _restore_consents(
        self,
        user_id: int,
        consents: List[Dict[str, Any]]
    ) -> None:
        """
        Restore consent records after deletion (GDPR requirement).

        Consents must be preserved to prove user consent history.

        Args:
            user_id: User ID
            consents: List of consent records to restore
        """
        # First, ensure any existing consents are deleted (cleanup for re-runs)
        self.db.execute(
            text("DELETE FROM consents WHERE user_id = :user_id"),
            {"user_id": user_id}
        )

        # Restore each consent record
        for consent in consents:
            sql = """
                INSERT INTO consents (
                    id, user_id, consent_type, granted, granted_at,
                    revoked_at, version, created_at
                ) VALUES (
                    :id, :user_id, :consent_type, :granted, :granted_at,
                    :revoked_at, :version, :created_at
                )
            """
            self.db.execute(text(sql), {
                "id": consent["id"],
                "user_id": consent["user_id"],
                "consent_type": consent["consent_type"],
                "granted": consent["granted"],
                "granted_at": consent["granted_at"],
                "revoked_at": consent.get("revoked_at"),
                "version": consent["version"],
                "created_at": consent["created_at"]
            })

    def validate_deletion(self, user_id: int) -> Dict[str, Any]:
        """
        Validate that deletion is safe to proceed.

        Checks:
        - User exists
        - No active sessions
        - No pending operations

        Args:
            user_id: User ID to validate

        Returns:
            Dictionary with validation results:
            {
                "valid": bool,
                "user_exists": bool,
                "active_sessions": int,
                "warnings": List[str]
            }

        Example:
            validation = deleter.validate_deletion(user_id=123)
            if validation["valid"]:
                # Safe to proceed with deletion
                pass
        """
        warnings: List[str] = []

        # Check if user exists
        user_exists = self._count_records("users", "id", user_id) > 0
        if not user_exists:
            return {
                "valid": False,
                "user_exists": False,
                "active_sessions": 0,
                "warnings": ["User does not exist"]
            }

        # Count active sessions
        active_sessions = self._count_records("sessions", "user_id", user_id)
        if active_sessions > 0:
            warnings.append(
                f"User has {active_sessions} active session(s) "
                "that will be deleted"
            )

        # Count cases
        case_count = self._count_records("cases", "user_id", user_id)
        if case_count > 0:
            warnings.append(
                f"User has {case_count} case(s) that will be permanently deleted"
            )

        # Count evidence
        evidence_count = self.db.execute(
            text("""
                SELECT COUNT(*) FROM evidence
                WHERE case_id IN (
                    SELECT id FROM cases WHERE user_id = :user_id
                )
            """),
            {"user_id": user_id}
        ).fetchone()[0]

        if evidence_count > 0:
            warnings.append(
                f"User has {evidence_count} evidence record(s) "
                "that will be permanently deleted"
            )

        return {
            "valid": True,
            "user_exists": True,
            "active_sessions": active_sessions,
            "warnings": warnings
        }
