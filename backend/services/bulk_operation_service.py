"""
Bulk Operation Service for Justice Companion.

Migrated from: src/services/BulkOperationService.ts

Features:
- Bulk operations on cases and evidence with transaction support
- Progress tracking via event system (planned)
- Comprehensive audit logging for all operations
- Rollback support with fail-fast or continue-on-error modes
- Batch processing for large datasets

Operations:
- bulk_delete_cases: Delete multiple cases in a transaction
- bulk_update_cases: Update multiple cases in a transaction
- bulk_archive_cases: Archive (close) multiple cases
- bulk_delete_evidence: Delete multiple evidence items
- get_operation_progress: Track operation progress (planned)

Security:
- All operations verify user ownership
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent resources
- All operations audited with cryptographic hash chaining
- Transaction rollback on failure (fail-fast mode)

Usage:
    from backend.services.bulk_operation_service import BulkOperationService

    bulk_service = BulkOperationService(
        db=db,
        audit_logger=audit_logger,
        case_service=case_service,
        evidence_service=evidence_service
    )

    # Delete multiple cases
    result = await bulk_service.bulk_delete_cases(
        case_ids=[1, 2, 3],
        user_id=42,
        options=BulkOperationOptions(fail_fast=True, batch_size=100)
    )
    print(f"Deleted {result.success_count} cases")
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from backend.services.audit_logger import AuditLogger
from backend.models.case import Case, CaseStatus
from backend.models.evidence import Evidence

# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models for Input/Output
# ============================================================================

class BulkOperationOptions(BaseModel):
    """
    Options for bulk operation execution.

    Attributes:
        fail_fast: If True, stop on first error and rollback. If False, continue and collect errors.
        progress_interval: Emit progress events every N items (default: 10)
        batch_size: Maximum items to process in a single transaction (default: 1000)
    """
    fail_fast: bool = Field(default=True, description="Stop on first error and rollback")
    progress_interval: int = Field(default=10, ge=1, description="Progress notification interval")
    batch_size: int = Field(default=1000, ge=1, le=10000, description="Items per transaction batch")

    model_config = ConfigDict(use_enum_values=True)


class BulkOperationError(BaseModel):
    """Individual item error in bulk operation."""
    item_id: int = Field(..., description="ID of the item that failed")
    error: str = Field(..., description="Error message")

    model_config = ConfigDict(from_attributes=True)


class BulkOperationResult(BaseModel):
    """
    Result of a bulk operation.

    Attributes:
        operation_id: Unique UUID for the operation
        total_items: Total number of items to process
        success_count: Number of successfully processed items
        failure_count: Number of failed items
        errors: List of errors for failed items
        rolled_back: Whether the operation was rolled back
    """
    operation_id: str = Field(..., description="Unique operation identifier")
    total_items: int = Field(..., ge=0, description="Total items to process")
    success_count: int = Field(..., ge=0, description="Successfully processed items")
    failure_count: int = Field(..., ge=0, description="Failed items")
    errors: List[BulkOperationError] = Field(default_factory=list, description="List of errors")
    rolled_back: bool = Field(default=False, description="Whether operation was rolled back")

    model_config = ConfigDict(from_attributes=True)


class CaseUpdate(BaseModel):
    """Individual case update in bulk operation."""
    id: int = Field(..., ge=1, description="Case ID to update")
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="New case title")
    description: Optional[str] = Field(None, description="New case description")
    case_type: Optional[str] = Field(None, description="New case type")
    status: Optional[CaseStatus] = Field(None, description="New case status")

    model_config = ConfigDict(use_enum_values=True)


class BulkOperationProgress(BaseModel):
    """
    Progress tracking for long-running bulk operations.

    Note: This is a planned feature. Currently returns mock data.
    Requires event store implementation for proper operation state reconstruction.
    """
    operation_id: str = Field(..., description="Operation UUID")
    operation_type: str = Field(..., description="Type of bulk operation")
    total_items: int = Field(..., ge=0, description="Total items to process")
    processed_items: int = Field(..., ge=0, description="Items processed so far")
    success_count: int = Field(..., ge=0, description="Successful items")
    failure_count: int = Field(..., ge=0, description="Failed items")
    status: str = Field(..., description="Operation status (pending, running, completed, failed)")
    errors: List[BulkOperationError] = Field(default_factory=list, description="Errors encountered")
    started_at: datetime = Field(..., description="Operation start time")
    completed_at: Optional[datetime] = Field(None, description="Operation completion time")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# BulkOperationService Class
# ============================================================================

class BulkOperationService:
    """
    Business logic layer for bulk operations on cases and evidence.

    Provides transaction-safe bulk operations with:
    - Atomic transactions (all-or-nothing with fail_fast=True)
    - Partial completion (continue-on-error with fail_fast=False)
    - Progress tracking (via events, planned)
    - Audit logging for all operations
    - User ownership verification

    All methods require user_id for authorization and audit logging.
    """

    def __init__(
        self,
        db: Session,
        audit_logger: Optional[AuditLogger] = None,
        case_service: Optional[Any] = None,
        evidence_service: Optional[Any] = None
    ):
        """
        Initialize BulkOperationService.

        Args:
            db: SQLAlchemy database session
            audit_logger: AuditLogger instance for audit trail (optional)
            case_service: CaseService instance for case operations (optional)
            evidence_service: EvidenceService instance for evidence operations (optional)
        """
        self.db = db
        self.audit_logger = audit_logger
        self.case_service = case_service
        self.evidence_service = evidence_service

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _log_audit_event(
        self,
        event_type: str,
        user_id: int,
        resource_type: str,
        resource_id: str,
        action: str,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """
        Log audit event (never throws exceptions).

        Args:
            event_type: Type of event (e.g., "bulk_operation.started")
            user_id: User performing the action
            resource_type: Type of resource (e.g., "bulk_operation")
            resource_id: ID of the resource (operation_id)
            action: Action performed (e.g., "bulk_delete")
            details: Additional context dictionary
            success: Whether operation succeeded
            error_message: Error message if failed
        """
        if self.audit_logger:
            try:
                self.audit_logger.log(
                    event_type=event_type,
                    user_id=str(user_id),
                    resource_type=resource_type,
                    resource_id=resource_id,
                    action=action,
                    details=details,
                    success=success,
                    error_message=error_message
                )
            except Exception as e:
                logger.warning(f"Failed to log audit event: {e}")

    def _verify_case_ownership(self, case_id: int, user_id: int) -> None:
        """
        Verify that user owns the case.

        Args:
            case_id: Case ID to verify
            user_id: User ID claiming ownership

        Raises:
            HTTPException 404: Case not found
            HTTPException 403: User doesn't own the case
        """
        case = self.db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        if case.user_id != user_id:
            raise HTTPException(status_code=403, detail=f"Unauthorized access to case {case_id}")

    def _verify_evidence_ownership(self, evidence_id: int, user_id: int) -> None:
        """
        Verify that user owns the evidence (via case ownership).

        Args:
            evidence_id: Evidence ID to verify
            user_id: User ID claiming ownership

        Raises:
            HTTPException 404: Evidence not found
            HTTPException 403: User doesn't own the evidence
        """
        evidence = self.db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(status_code=404, detail=f"Evidence {evidence_id} not found")

        # Verify case ownership
        case = self.db.query(Case).filter(Case.id == evidence.case_id).first()
        if not case or case.user_id != user_id:
            raise HTTPException(status_code=403, detail=f"Unauthorized access to evidence {evidence_id}")

    # ========================================================================
    # Public Bulk Operation Methods
    # ========================================================================

    async def bulk_delete_cases(
        self,
        case_ids: List[int],
        user_id: int,
        options: Optional[BulkOperationOptions] = None
    ) -> BulkOperationResult:
        """
        Delete multiple cases in a transaction.

        Deletes cases with cascading delete of associated evidence.
        In fail_fast mode, rolls back entire transaction on first error.
        In continue-on-error mode, processes all items and collects errors.

        Args:
            case_ids: List of case IDs to delete
            user_id: User performing the operation
            options: Bulk operation options (fail_fast, batch_size, etc.)

        Returns:
            BulkOperationResult with operation statistics

        Raises:
            HTTPException 403: User doesn't own one or more cases
            HTTPException 404: One or more cases not found
            SQLAlchemyError: Database error in fail_fast mode

        Security:
            - Verifies user ownership of each case before deletion
            - Logs all deletions to audit trail
            - Rolls back on authorization failure
        """
        operation_id = str(uuid4())
        operation_type = "bulk_delete_cases"
        opts = options or BulkOperationOptions()

        # Audit: Operation started
        self._log_audit_event(
            event_type="bulk_operation.started",
            user_id=user_id,
            resource_type="bulk_operation",
            resource_id=operation_id,
            action="bulk_delete_cases",
            details={
                "operation_type": operation_type,
                "total_items": len(case_ids),
                "fail_fast": opts.fail_fast,
                "batch_size": opts.batch_size
            }
        )

        success_count = 0
        failure_count = 0
        errors: List[BulkOperationError] = []
        rolled_back = False

        try:
            # Process in batches
            for batch_start in range(0, len(case_ids), opts.batch_size):
                batch_end = min(batch_start + opts.batch_size, len(case_ids))
                batch = case_ids[batch_start:batch_end]

                # Start transaction for batch
                try:
                    for case_id in batch:
                        try:
                            # Verify ownership
                            self._verify_case_ownership(case_id, user_id)

                            # Delete associated evidence first (cascade)
                            self.db.query(Evidence).filter(Evidence.case_id == case_id).delete()

                            # Delete case
                            deleted = self.db.query(Case).filter(Case.id == case_id).delete()
                            if deleted == 0:
                                raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

                            success_count += 1

                            # Audit: Case deleted
                            self._log_audit_event(
                                event_type="case.deleted",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(case_id),
                                action="delete",
                                details={"operation_id": operation_id, "batch": f"{batch_start}-{batch_end}"}
                            )

                        except (HTTPException, SQLAlchemyError) as item_error:
                            error_message = str(item_error.detail if isinstance(item_error, HTTPException) else item_error)
                            errors.append(BulkOperationError(item_id=case_id, error=error_message))
                            failure_count += 1

                            # Audit: Case deletion failed
                            self._log_audit_event(
                                event_type="case.delete_failed",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(case_id),
                                action="delete",
                                details={"operation_id": operation_id, "error": error_message},
                                success=False,
                                error_message=error_message
                            )

                            if opts.fail_fast:
                                raise

                    # Commit batch transaction
                    self.db.commit()

                except Exception as batch_error:
                    # Rollback batch transaction
                    self.db.rollback()
                    rolled_back = True

                    if opts.fail_fast:
                        # Audit: Operation rolled back
                        self._log_audit_event(
                            event_type="bulk_operation.rolled_back",
                            user_id=user_id,
                            resource_type="bulk_operation",
                            resource_id=operation_id,
                            action="rollback",
                            details={
                                "reason": "Delete operation failed in fail_fast mode",
                                "error": str(batch_error)
                            },
                            success=False,
                            error_message=str(batch_error)
                        )
                        raise

            # Audit: Operation completed
            self._log_audit_event(
                event_type="bulk_operation.completed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_delete_cases",
                details={
                    "total_items": len(case_ids),
                    "success_count": success_count,
                    "failure_count": failure_count,
                    "errors": len(errors)
                }
            )

            return BulkOperationResult(
                operation_id=operation_id,
                total_items=len(case_ids),
                success_count=success_count,
                failure_count=failure_count,
                errors=errors,
                rolled_back=rolled_back
            )

        except Exception as error:
            # Audit: Operation failed
            self._log_audit_event(
                event_type="bulk_operation.failed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_delete_cases",
                details={
                    "total_items": len(case_ids),
                    "processed_items": success_count + failure_count,
                    "error": str(error)
                },
                success=False,
                error_message=str(error)
            )
            raise

    async def bulk_update_cases(
        self,
        updates: List[CaseUpdate],
        user_id: int,
        options: Optional[BulkOperationOptions] = None
    ) -> BulkOperationResult:
        """
        Update multiple cases in a transaction.

        Updates case fields (title, description, case_type, status).
        In fail_fast mode, rolls back entire transaction on first error.
        In continue-on-error mode, processes all items and collects errors.

        Args:
            updates: List of case updates (id + fields to update)
            user_id: User performing the operation
            options: Bulk operation options (fail_fast, batch_size, etc.)

        Returns:
            BulkOperationResult with operation statistics

        Raises:
            HTTPException 403: User doesn't own one or more cases
            HTTPException 404: One or more cases not found
            SQLAlchemyError: Database error in fail_fast mode

        Security:
            - Verifies user ownership of each case before update
            - Logs all updates to audit trail
            - Rolls back on authorization failure
        """
        operation_id = str(uuid4())
        operation_type = "bulk_update_cases"
        opts = options or BulkOperationOptions()

        # Audit: Operation started
        self._log_audit_event(
            event_type="bulk_operation.started",
            user_id=user_id,
            resource_type="bulk_operation",
            resource_id=operation_id,
            action="bulk_update_cases",
            details={
                "operation_type": operation_type,
                "total_items": len(updates),
                "fail_fast": opts.fail_fast,
                "batch_size": opts.batch_size
            }
        )

        success_count = 0
        failure_count = 0
        errors: List[BulkOperationError] = []
        rolled_back = False

        try:
            # Process in batches
            for batch_start in range(0, len(updates), opts.batch_size):
                batch_end = min(batch_start + opts.batch_size, len(updates))
                batch = updates[batch_start:batch_end]

                # Start transaction for batch
                try:
                    for update in batch:
                        try:
                            # Verify ownership
                            self._verify_case_ownership(update.id, user_id)

                            # Build update dict (only non-None fields)
                            update_data = {}
                            if update.title is not None:
                                update_data['title'] = update.title
                            if update.description is not None:
                                update_data['description'] = update.description
                            if update.case_type is not None:
                                update_data['case_type'] = update.case_type
                            if update.status is not None:
                                update_data['status'] = update.status

                            if not update_data:
                                raise ValueError("No fields to update")

                            # Add updated_at timestamp
                            update_data['updated_at'] = datetime.now(timezone.utc)

                            # Update case
                            updated = self.db.query(Case).filter(Case.id == update.id).update(update_data)
                            if updated == 0:
                                raise HTTPException(status_code=404, detail=f"Case {update.id} not found")

                            success_count += 1

                            # Audit: Case updated
                            self._log_audit_event(
                                event_type="case.updated",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(update.id),
                                action="update",
                                details={
                                    "operation_id": operation_id,
                                    "batch": f"{batch_start}-{batch_end}",
                                    "updated_fields": list(update_data.keys())
                                }
                            )

                        except (HTTPException, SQLAlchemyError, ValueError) as item_error:
                            error_message = str(item_error.detail if isinstance(item_error, HTTPException) else item_error)
                            errors.append(BulkOperationError(item_id=update.id, error=error_message))
                            failure_count += 1

                            # Audit: Case update failed
                            self._log_audit_event(
                                event_type="case.update_failed",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(update.id),
                                action="update",
                                details={"operation_id": operation_id, "error": error_message},
                                success=False,
                                error_message=error_message
                            )

                            if opts.fail_fast:
                                raise

                    # Commit batch transaction
                    self.db.commit()

                except Exception as batch_error:
                    # Rollback batch transaction
                    self.db.rollback()
                    rolled_back = True

                    if opts.fail_fast:
                        # Audit: Operation rolled back
                        self._log_audit_event(
                            event_type="bulk_operation.rolled_back",
                            user_id=user_id,
                            resource_type="bulk_operation",
                            resource_id=operation_id,
                            action="rollback",
                            details={
                                "reason": "Update operation failed in fail_fast mode",
                                "error": str(batch_error)
                            },
                            success=False,
                            error_message=str(batch_error)
                        )
                        raise

            # Audit: Operation completed
            self._log_audit_event(
                event_type="bulk_operation.completed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_update_cases",
                details={
                    "total_items": len(updates),
                    "success_count": success_count,
                    "failure_count": failure_count,
                    "errors": len(errors)
                }
            )

            return BulkOperationResult(
                operation_id=operation_id,
                total_items=len(updates),
                success_count=success_count,
                failure_count=failure_count,
                errors=errors,
                rolled_back=rolled_back
            )

        except Exception as error:
            # Audit: Operation failed
            self._log_audit_event(
                event_type="bulk_operation.failed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_update_cases",
                details={
                    "total_items": len(updates),
                    "processed_items": success_count + failure_count,
                    "error": str(error)
                },
                success=False,
                error_message=str(error)
            )
            raise

    async def bulk_archive_cases(
        self,
        case_ids: List[int],
        user_id: int,
        options: Optional[BulkOperationOptions] = None
    ) -> BulkOperationResult:
        """
        Archive multiple cases by setting status to 'closed'.

        Archives cases without deleting them. Useful for bulk case closure.
        In fail_fast mode, rolls back entire transaction on first error.
        In continue-on-error mode, processes all items and collects errors.

        Args:
            case_ids: List of case IDs to archive
            user_id: User performing the operation
            options: Bulk operation options (fail_fast, batch_size, etc.)

        Returns:
            BulkOperationResult with operation statistics

        Raises:
            HTTPException 403: User doesn't own one or more cases
            HTTPException 404: One or more cases not found
            SQLAlchemyError: Database error in fail_fast mode

        Security:
            - Verifies user ownership of each case before archiving
            - Logs all archives to audit trail
            - Rolls back on authorization failure
        """
        operation_id = str(uuid4())
        operation_type = "bulk_archive_cases"
        opts = options or BulkOperationOptions()

        # Audit: Operation started
        self._log_audit_event(
            event_type="bulk_operation.started",
            user_id=user_id,
            resource_type="bulk_operation",
            resource_id=operation_id,
            action="bulk_archive_cases",
            details={
                "operation_type": operation_type,
                "total_items": len(case_ids),
                "fail_fast": opts.fail_fast,
                "batch_size": opts.batch_size
            }
        )

        success_count = 0
        failure_count = 0
        errors: List[BulkOperationError] = []
        rolled_back = False

        try:
            # Process in batches
            for batch_start in range(0, len(case_ids), opts.batch_size):
                batch_end = min(batch_start + opts.batch_size, len(case_ids))
                batch = case_ids[batch_start:batch_end]

                # Start transaction for batch
                try:
                    for case_id in batch:
                        try:
                            # Verify ownership
                            self._verify_case_ownership(case_id, user_id)

                            # Archive case (set status to closed)
                            updated = self.db.query(Case).filter(Case.id == case_id).update({
                                'status': CaseStatus.CLOSED,
                                'updated_at': datetime.now(timezone.utc)
                            })
                            if updated == 0:
                                raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

                            success_count += 1

                            # Audit: Case archived
                            self._log_audit_event(
                                event_type="case.archived",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(case_id),
                                action="archive",
                                details={"operation_id": operation_id, "batch": f"{batch_start}-{batch_end}"}
                            )

                        except (HTTPException, SQLAlchemyError) as item_error:
                            error_message = str(item_error.detail if isinstance(item_error, HTTPException) else item_error)
                            errors.append(BulkOperationError(item_id=case_id, error=error_message))
                            failure_count += 1

                            # Audit: Case archive failed
                            self._log_audit_event(
                                event_type="case.archive_failed",
                                user_id=user_id,
                                resource_type="case",
                                resource_id=str(case_id),
                                action="archive",
                                details={"operation_id": operation_id, "error": error_message},
                                success=False,
                                error_message=error_message
                            )

                            if opts.fail_fast:
                                raise

                    # Commit batch transaction
                    self.db.commit()

                except Exception as batch_error:
                    # Rollback batch transaction
                    self.db.rollback()
                    rolled_back = True

                    if opts.fail_fast:
                        # Audit: Operation rolled back
                        self._log_audit_event(
                            event_type="bulk_operation.rolled_back",
                            user_id=user_id,
                            resource_type="bulk_operation",
                            resource_id=operation_id,
                            action="rollback",
                            details={
                                "reason": "Archive operation failed in fail_fast mode",
                                "error": str(batch_error)
                            },
                            success=False,
                            error_message=str(batch_error)
                        )
                        raise

            # Audit: Operation completed
            self._log_audit_event(
                event_type="bulk_operation.completed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_archive_cases",
                details={
                    "total_items": len(case_ids),
                    "success_count": success_count,
                    "failure_count": failure_count,
                    "errors": len(errors)
                }
            )

            return BulkOperationResult(
                operation_id=operation_id,
                total_items=len(case_ids),
                success_count=success_count,
                failure_count=failure_count,
                errors=errors,
                rolled_back=rolled_back
            )

        except Exception as error:
            # Audit: Operation failed
            self._log_audit_event(
                event_type="bulk_operation.failed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_archive_cases",
                details={
                    "total_items": len(case_ids),
                    "processed_items": success_count + failure_count,
                    "error": str(error)
                },
                success=False,
                error_message=str(error)
            )
            raise

    async def bulk_delete_evidence(
        self,
        evidence_ids: List[int],
        user_id: int,
        options: Optional[BulkOperationOptions] = None
    ) -> BulkOperationResult:
        """
        Delete multiple evidence items in a transaction.

        Deletes evidence items with ownership verification via case ownership.
        In fail_fast mode, rolls back entire transaction on first error.
        In continue-on-error mode, processes all items and collects errors.

        Args:
            evidence_ids: List of evidence IDs to delete
            user_id: User performing the operation
            options: Bulk operation options (fail_fast, batch_size, etc.)

        Returns:
            BulkOperationResult with operation statistics

        Raises:
            HTTPException 403: User doesn't own one or more evidence items
            HTTPException 404: One or more evidence items not found
            SQLAlchemyError: Database error in fail_fast mode

        Security:
            - Verifies user ownership of each evidence item (via case)
            - Logs all deletions to audit trail
            - Rolls back on authorization failure
        """
        operation_id = str(uuid4())
        operation_type = "bulk_delete_evidence"
        opts = options or BulkOperationOptions()

        # Audit: Operation started
        self._log_audit_event(
            event_type="bulk_operation.started",
            user_id=user_id,
            resource_type="bulk_operation",
            resource_id=operation_id,
            action="bulk_delete_evidence",
            details={
                "operation_type": operation_type,
                "total_items": len(evidence_ids),
                "fail_fast": opts.fail_fast,
                "batch_size": opts.batch_size
            }
        )

        success_count = 0
        failure_count = 0
        errors: List[BulkOperationError] = []
        rolled_back = False

        try:
            # Process in batches
            for batch_start in range(0, len(evidence_ids), opts.batch_size):
                batch_end = min(batch_start + opts.batch_size, len(evidence_ids))
                batch = evidence_ids[batch_start:batch_end]

                # Start transaction for batch
                try:
                    for evidence_id in batch:
                        try:
                            # Verify ownership (via case)
                            self._verify_evidence_ownership(evidence_id, user_id)

                            # Delete evidence
                            deleted = self.db.query(Evidence).filter(Evidence.id == evidence_id).delete()
                            if deleted == 0:
                                raise HTTPException(status_code=404, detail=f"Evidence {evidence_id} not found")

                            success_count += 1

                            # Audit: Evidence deleted
                            self._log_audit_event(
                                event_type="evidence.deleted",
                                user_id=user_id,
                                resource_type="evidence",
                                resource_id=str(evidence_id),
                                action="delete",
                                details={"operation_id": operation_id, "batch": f"{batch_start}-{batch_end}"}
                            )

                        except (HTTPException, SQLAlchemyError) as item_error:
                            error_message = str(item_error.detail if isinstance(item_error, HTTPException) else item_error)
                            errors.append(BulkOperationError(item_id=evidence_id, error=error_message))
                            failure_count += 1

                            # Audit: Evidence deletion failed
                            self._log_audit_event(
                                event_type="evidence.delete_failed",
                                user_id=user_id,
                                resource_type="evidence",
                                resource_id=str(evidence_id),
                                action="delete",
                                details={"operation_id": operation_id, "error": error_message},
                                success=False,
                                error_message=error_message
                            )

                            if opts.fail_fast:
                                raise

                    # Commit batch transaction
                    self.db.commit()

                except Exception as batch_error:
                    # Rollback batch transaction
                    self.db.rollback()
                    rolled_back = True

                    if opts.fail_fast:
                        # Audit: Operation rolled back
                        self._log_audit_event(
                            event_type="bulk_operation.rolled_back",
                            user_id=user_id,
                            resource_type="bulk_operation",
                            resource_id=operation_id,
                            action="rollback",
                            details={
                                "reason": "Delete evidence operation failed in fail_fast mode",
                                "error": str(batch_error)
                            },
                            success=False,
                            error_message=str(batch_error)
                        )
                        raise

            # Audit: Operation completed
            self._log_audit_event(
                event_type="bulk_operation.completed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_delete_evidence",
                details={
                    "total_items": len(evidence_ids),
                    "success_count": success_count,
                    "failure_count": failure_count,
                    "errors": len(errors)
                }
            )

            return BulkOperationResult(
                operation_id=operation_id,
                total_items=len(evidence_ids),
                success_count=success_count,
                failure_count=failure_count,
                errors=errors,
                rolled_back=rolled_back
            )

        except Exception as error:
            # Audit: Operation failed
            self._log_audit_event(
                event_type="bulk_operation.failed",
                user_id=user_id,
                resource_type="bulk_operation",
                resource_id=operation_id,
                action="bulk_delete_evidence",
                details={
                    "total_items": len(evidence_ids),
                    "processed_items": success_count + failure_count,
                    "error": str(error)
                },
                success=False,
                error_message=str(error)
            )
            raise

    async def get_operation_progress(
        self,
        operation_id: str
    ) -> Optional[BulkOperationProgress]:
        """
        Get operation progress by reconstructing from events.

        NOTE: This is a simplified implementation. In production, you would:
        - Implement event store for operation state persistence
        - Query event store for operation events
        - Reconstruct current state from event history
        - Support real-time progress tracking

        Current implementation returns a mock completed operation.

        Args:
            operation_id: UUID of the operation to query

        Returns:
            BulkOperationProgress if operation exists, None otherwise

        Future Implementation:
            - Event sourcing pattern with event store
            - Real-time progress updates via WebSocket/SSE
            - Operation state reconstruction from event log
            - Support for long-running operations
        """
        try:
            # TODO: Implement event store querying
            # For now, return a mock completed operation to satisfy interface
            return BulkOperationProgress(
                operation_id=operation_id,
                operation_type="bulk_delete_cases",
                total_items=0,
                processed_items=0,
                success_count=0,
                failure_count=0,
                status="completed",
                errors=[],
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
        except Exception as e:
            logger.warning(f"Failed to get operation progress for {operation_id}: {e}")
            return None
