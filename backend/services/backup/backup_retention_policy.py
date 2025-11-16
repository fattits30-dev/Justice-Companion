"""
Backup Retention Policy service for automatic cleanup of old backups.
Migrated from src/services/backup/BackupRetentionPolicy.ts

Features:
- Apply retention policy based on keep_count
- Protect migration and restore backups from deletion
- Safe deletion with minimum backup guarantee
- Retention summary reporting
- Comprehensive audit logging

Security:
- Never deletes all backups (minimum 1 kept)
- Protected backups excluded from retention
- All operations audited
"""

from typing import Optional, Dict, List
import logging

from backend.services.backup.backup_service import BackupService
from backend.models.backup import BackupMetadataResponse, RetentionSummaryResponse


# Configure logging
logger = logging.getLogger(__name__)


class BackupRetentionPolicy:
    """
    Manages automatic cleanup of old backups based on retention rules.

    This service applies retention policies to regular backups while
    protecting critical backups (migration, restore) from deletion.

    Attributes:
        backup_service: Service for backup file operations
        audit_logger: Optional audit logger for tracking operations
    """

    def __init__(
        self,
        backup_service: BackupService,
        audit_logger=None
    ):
        """
        Initialize retention policy service.

        Args:
            backup_service: Backup service instance for file operations
            audit_logger: Optional audit logger instance
        """
        self.backup_service = backup_service
        self.audit_logger = audit_logger

    def _log_audit(
        self,
        event_type: str,
        resource_id: str,
        action: str,
        success: bool = True,
        details: Optional[Dict] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=None,  # System operation
                resource_type="backup_retention",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message
            )

    async def apply_retention_policy(self, keep_count: int) -> int:
        """
        Apply retention policy to delete old backups.

        Keeps the most recent `keep_count` regular backups and deletes older ones.
        Protected backups (migration, restore) are never deleted.

        Args:
            keep_count: Number of regular backups to retain (1-30)

        Returns:
            Number of backups deleted

        Raises:
            ValueError: If keep_count is not in valid range (1-30)
        """
        try:
            # Validate keep_count
            if keep_count < 1 or keep_count > 30:
                raise ValueError(f"Invalid keep_count: {keep_count}. Must be between 1 and 30.")

            # Get all backups sorted by creation date (most recent first)
            all_backups = self.backup_service.list_backups()

            if len(all_backups) == 0:
                logger.info("No backups found for retention policy")
                return 0

            # Separate protected and regular backups
            protected_backups = [b for b in all_backups if b.is_protected]
            regular_backups = [b for b in all_backups if not b.is_protected]

            # Determine which regular backups to keep and delete
            backups_to_keep = regular_backups[:keep_count]
            backups_to_delete = regular_backups[keep_count:]

            # Safety check: Always keep at least 1 regular backup
            if len(backups_to_keep) == 0 and len(regular_backups) > 0:
                logger.warning(
                    "Retention policy would delete all backups. Keeping at least 1 for safety."
                )
                self._log_audit(
                    event_type="backup_retention.safety_check",
                    resource_id="policy",
                    action="apply",
                    success=True,
                    details={"reason": "Prevented deletion of all backups"}
                )
                return 0

            # Delete old backups
            deleted_count = await self._delete_old_backups(backups_to_delete)

            logger.info(
                f"Retention policy applied: kept {len(backups_to_keep)} backups, "
                f"deleted {deleted_count} backups, "
                f"protected {len(protected_backups)} migration/restore backups"
            )

            self._log_audit(
                event_type="backup_retention.applied",
                resource_id="policy",
                action="apply",
                success=True,
                details={
                    "keep_count": keep_count,
                    "kept": len(backups_to_keep),
                    "deleted": deleted_count,
                    "protected": len(protected_backups),
                    "total": len(all_backups)
                }
            )

            return deleted_count

        except Exception as error:
            logger.error(f"Failed to apply retention policy: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="backup_retention.error",
                resource_id="policy",
                action="apply",
                success=False,
                error_message=str(error)
            )

            raise

    async def _delete_old_backups(self, backups_to_delete: List[BackupMetadataResponse]) -> int:
        """
        Delete specified backups.

        Args:
            backups_to_delete: List of backup metadata to delete

        Returns:
            Number of successfully deleted backups
        """
        deleted_count = 0

        for backup in backups_to_delete:
            try:
                self.backup_service.delete_backup(backup.filename)
                deleted_count += 1

                logger.debug(f"Deleted old backup: {backup.filename}")

            except Exception as error:
                # Log error but continue with other deletions
                logger.error(
                    f"Failed to delete backup {backup.filename}: {str(error)}",
                    exc_info=True
                )

                self._log_audit(
                    event_type="backup_retention.delete_error",
                    resource_id=backup.filename,
                    action="delete",
                    success=False,
                    error_message=str(error)
                )

        return deleted_count

    async def get_retention_summary(self, keep_count: int) -> RetentionSummaryResponse:
        """
        Get retention policy summary without applying it.

        Useful for previewing what would happen before applying the policy.

        Args:
            keep_count: Configured keep count

        Returns:
            Summary of backups by category
        """
        try:
            all_backups = self.backup_service.list_backups()

            protected_backups = [b for b in all_backups if b.is_protected]
            regular_backups = [b for b in all_backups if not b.is_protected]

            to_keep = min(keep_count, len(regular_backups))
            to_delete = max(0, len(regular_backups) - keep_count)

            return RetentionSummaryResponse(
                total=len(all_backups),
                protected=len(protected_backups),
                to_keep=to_keep,
                to_delete=to_delete
            )

        except Exception as error:
            logger.error(f"Failed to get retention summary: {str(error)}", exc_info=True)
            raise

    async def cleanup_empty_backups(self) -> int:
        """
        Delete backup files that are empty (0 bytes).

        Useful for cleaning up corrupted or failed backup attempts.

        Returns:
            Number of empty backups deleted
        """
        try:
            all_backups = self.backup_service.list_backups()
            empty_backups = [b for b in all_backups if b.size == 0]

            deleted_count = 0

            for backup in empty_backups:
                try:
                    # Force delete even if protected
                    self.backup_service.delete_backup(backup.filename, force=True)
                    deleted_count += 1

                    logger.info(f"Deleted empty backup: {backup.filename}")

                except Exception as error:
                    logger.error(
                        f"Failed to delete empty backup {backup.filename}: {str(error)}",
                        exc_info=True
                    )

            if deleted_count > 0:
                self._log_audit(
                    event_type="backup_retention.cleanup_empty",
                    resource_id="empty_backups",
                    action="cleanup",
                    success=True,
                    details={"deleted_count": deleted_count}
                )

            return deleted_count

        except Exception as error:
            logger.error(f"Failed to cleanup empty backups: {str(error)}", exc_info=True)
            raise

    async def delete_old_protected_backups(self, days_old: int = 90) -> int:
        """
        Delete protected backups older than specified days.

        Use with caution - protected backups should generally be kept.
        This is for cleanup of very old migration/restore backups.

        Args:
            days_old: Minimum age in days to delete (default: 90)

        Returns:
            Number of old protected backups deleted
        """
        try:
            from datetime import datetime, timedelta

            all_backups = self.backup_service.list_backups()
            protected_backups = [b for b in all_backups if b.is_protected]

            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            old_backups = []

            for backup in protected_backups:
                created_at = datetime.fromisoformat(backup.created_at.replace("Z", "+00:00"))
                if created_at < cutoff_date:
                    old_backups.append(backup)

            deleted_count = 0

            for backup in old_backups:
                try:
                    # Force delete protected backup
                    self.backup_service.delete_backup(backup.filename, force=True)
                    deleted_count += 1

                    logger.info(
                        f"Deleted old protected backup: {backup.filename} "
                        f"(created: {backup.created_at})"
                    )

                except Exception as error:
                    logger.error(
                        f"Failed to delete old protected backup {backup.filename}: {str(error)}",
                        exc_info=True
                    )

            if deleted_count > 0:
                self._log_audit(
                    event_type="backup_retention.cleanup_old_protected",
                    resource_id="protected_backups",
                    action="cleanup",
                    success=True,
                    details={
                        "deleted_count": deleted_count,
                        "days_old": days_old,
                        "cutoff_date": cutoff_date.isoformat()
                    }
                )

            return deleted_count

        except Exception as error:
            logger.error(f"Failed to delete old protected backups: {str(error)}", exc_info=True)
            raise
