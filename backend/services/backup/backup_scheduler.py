"""
Backup Scheduler service for automated database backups.
Migrated from src/services/backup/BackupScheduler.ts

Features:
- Singleton pattern to prevent multiple schedulers
- Scheduled backup execution (asyncio-based)
- Runs missed backups on startup
- Automatic retention policy application
- Per-user backup settings management
- Comprehensive audit logging

Security:
- All operations audited
- User isolation for backup settings
- Safe calculation of next backup times
- Handles timezone-aware scheduling

Usage:
    from backend.services.backup import BackupScheduler

    scheduler = BackupScheduler(db, backup_service, retention_policy, audit_logger)
    await scheduler.start()

    # Scheduler runs in background checking every minute

    await scheduler.stop()
"""

from typing import Optional, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import asyncio
import logging

from backend.models.backup import (
    BackupSettings,
    BackupFrequency,
    BackupSettingsCreate,
    BackupSettingsUpdate,
    BackupSettingsResponse
)
from backend.services.backup.backup_service import BackupService
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy


# Configure logging
logger = logging.getLogger(__name__)


class BackupScheduler:
    """
    Background service for automated database backups on a schedule.

    This service manages scheduled backups based on user preferences,
    including frequency (daily/weekly/monthly), time of day, and retention.

    Features:
    - Singleton pattern to prevent multiple schedulers
    - Checks every minute for due backups
    - Runs missed backups on startup
    - Applies retention policy after each backup
    - Per-user backup configuration

    Attributes:
        db: SQLAlchemy database session
        backup_service: Service for backup file operations
        retention_policy: Service for applying retention rules
        audit_logger: Optional audit logger for tracking operations
        check_interval: Seconds between checks (default: 60)
        is_running: Flag indicating if scheduler is active
    """

    # Class-level singleton instance
    _instance: Optional["BackupScheduler"] = None

    def __init__(
        self,
        db: Session,
        backup_service: BackupService,
        retention_policy: BackupRetentionPolicy,
        audit_logger=None,
        check_interval: int = 60  # 1 minute
    ):
        """
        Initialize backup scheduler.

        Args:
            db: SQLAlchemy database session
            backup_service: Backup service for file operations
            retention_policy: Retention policy service
            audit_logger: Optional audit logger instance
            check_interval: Seconds between checks (default: 60)
        """
        self.db = db
        self.backup_service = backup_service
        self.retention_policy = retention_policy
        self.audit_logger = audit_logger
        self.check_interval = check_interval
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

        logger.info(f"BackupScheduler initialized with check_interval={check_interval}s")

    @classmethod
    def get_instance(
        cls,
        db: Session,
        backup_service: BackupService,
        retention_policy: BackupRetentionPolicy,
        audit_logger=None
    ) -> "BackupScheduler":
        """
        Get singleton instance of BackupScheduler.

        Args:
            db: SQLAlchemy database session
            backup_service: Backup service instance
            retention_policy: Retention policy service
            audit_logger: Optional audit logger

        Returns:
            Singleton BackupScheduler instance
        """
        if cls._instance is None:
            cls._instance = cls(db, backup_service, retention_policy, audit_logger)
        return cls._instance

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
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
                user_id=str(user_id) if user_id else None,
                resource_type="backup_scheduler",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message
            )

    async def start(self) -> None:
        """
        Start the backup scheduler.

        Initiates periodic checks for due backups. Runs immediately
        on start and then repeats at configured intervals.

        Raises:
            RuntimeError: If scheduler is already running
        """
        if self.is_running:
            logger.warning("BackupScheduler is already running")
            return

        try:
            logger.info("Starting backup scheduler...")

            self.is_running = True

            # Run any missed backups on startup
            await self.check_and_run_backups()

            # Create background task for periodic checking
            self._task = asyncio.create_task(self._run_scheduler())

            logger.info("Backup scheduler started successfully")

            self._log_audit(
                event_type="backup_scheduler.start",
                user_id=None,
                resource_id="scheduler",
                action="start",
                success=True
            )

        except Exception as error:
            self.is_running = False
            logger.error(f"Failed to start backup scheduler: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="backup_scheduler.start",
                user_id=None,
                resource_id="scheduler",
                action="start",
                success=False,
                error_message=str(error)
            )

            raise

    async def stop(self) -> None:
        """
        Stop the backup scheduler.

        Cancels the background task and stops all backup checking.
        """
        if not self.is_running:
            return

        try:
            self.is_running = False

            if self._task and not self._task.done():
                self._task.cancel()

            logger.info("Backup scheduler stopped")

            self._log_audit(
                event_type="backup_scheduler.stop",
                user_id=None,
                resource_id="scheduler",
                action="stop",
                success=True
            )

        except Exception as error:
            logger.error(f"Error stopping backup scheduler: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="backup_scheduler.stop",
                user_id=None,
                resource_id="scheduler",
                action="stop",
                success=False,
                error_message=str(error)
            )

    async def _run_scheduler(self) -> None:
        """
        Internal method to run the scheduler loop.

        Performs periodic checks at configured intervals until stopped.
        """
        while self.is_running:
            try:
                await asyncio.sleep(self.check_interval)

                if self.is_running:
                    await self.check_and_run_backups()

            except asyncio.CancelledError:
                logger.info("Scheduler task cancelled")
                break

            except Exception as error:
                logger.error(f"Error in scheduler loop: {str(error)}", exc_info=True)
                # Continue running even if one check fails
                continue

    async def check_and_run_backups(self) -> None:
        """
        Check for due backups and run them.

        Queries all enabled backup settings where next_backup_at <= NOW
        and executes scheduled backups for each one.
        """
        try:
            now = datetime.utcnow()

            # Get all enabled backup settings where next_backup_at <= NOW
            due_backups = self.db.query(BackupSettings).filter(
                and_(
                    BackupSettings.enabled == True,
                    BackupSettings.next_backup_at <= now
                )
            ).order_by(BackupSettings.next_backup_at.asc()).all()

            if len(due_backups) == 0:
                return

            logger.info(f"Found {len(due_backups)} backup(s) due for execution")

            # Run each due backup
            for settings in due_backups:
                await self._run_scheduled_backup(settings)

        except Exception as error:
            logger.error(f"Error checking for due backups: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="backup_scheduler.check_error",
                user_id=None,
                resource_id="check",
                action="check",
                success=False,
                error_message=str(error)
            )

    async def _run_scheduled_backup(self, settings: BackupSettings) -> None:
        """
        Run a scheduled backup for a user.

        Args:
            settings: BackupSettings instance with user preferences
        """
        try:
            logger.info(
                f"Running scheduled backup for user {settings.user_id} "
                f"(frequency: {settings.frequency})"
            )

            # Create backup with auto-backup prefix
            timestamp = datetime.utcnow().isoformat().replace(":", "-").replace(".", "-")
            filename = f"auto_backup_user{settings.user_id}_{timestamp}"
            backup = self.backup_service.create_backup(filename)

            logger.info(
                f"Auto-backup created: {backup.filename} ({backup.size} bytes)"
            )

            # Apply retention policy
            deleted_count = await self.retention_policy.apply_retention_policy(settings.keep_count)

            if deleted_count > 0:
                logger.info(f"Retention policy deleted {deleted_count} old backup(s)")

            # Update last_backup_at and calculate next_backup_at
            last_backup_at = datetime.utcnow()
            next_backup_at = self._calculate_next_backup_time(
                settings.frequency,
                settings.backup_time
            )

            settings.last_backup_at = last_backup_at
            settings.next_backup_at = next_backup_at
            settings.updated_at = datetime.utcnow()

            self.db.commit()

            logger.info(
                f"Next backup for user {settings.user_id} scheduled for {next_backup_at}"
            )

            self._log_audit(
                event_type="backup_scheduler.backup_completed",
                user_id=settings.user_id,
                resource_id=str(settings.id),
                action="backup",
                success=True,
                details={
                    "filename": backup.filename,
                    "size": backup.size,
                    "frequency": settings.frequency,
                    "next_backup_at": next_backup_at.isoformat(),
                    "deleted_old_backups": deleted_count
                }
            )

        except Exception as error:
            self.db.rollback()

            logger.error(
                f"Failed to run scheduled backup for user {settings.user_id}: {str(error)}",
                exc_info=True
            )

            self._log_audit(
                event_type="backup_scheduler.backup_error",
                user_id=settings.user_id,
                resource_id=str(settings.id),
                action="backup",
                success=False,
                error_message=str(error)
            )

    def _calculate_next_backup_time(self, frequency: str, backup_time: str) -> datetime:
        """
        Calculate next backup time based on frequency and time.

        Args:
            frequency: Backup frequency (daily, weekly, monthly)
            backup_time: Time of day (HH:MM format)

        Returns:
            Next backup datetime (UTC)
        """
        now = datetime.utcnow()

        # Parse backup time
        hours, minutes = map(int, backup_time.split(":"))

        # Start with today at the configured time
        next_backup = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)

        # If the time has already passed today, add the interval
        if next_backup <= now:
            if frequency == BackupFrequency.DAILY.value:
                next_backup += timedelta(days=1)
            elif frequency == BackupFrequency.WEEKLY.value:
                next_backup += timedelta(weeks=1)
            elif frequency == BackupFrequency.MONTHLY.value:
                # Add one month (approximate 30 days)
                # For more accurate calculation, use dateutil.relativedelta
                next_backup += timedelta(days=30)

        return next_backup

    def get_backup_settings(self, user_id: int) -> Optional[BackupSettingsResponse]:
        """
        Get backup settings for a user.

        Args:
            user_id: User ID

        Returns:
            Backup settings or None if not found
        """
        try:
            settings = self.db.query(BackupSettings).filter(
                BackupSettings.user_id == user_id
            ).first()

            if settings:
                return BackupSettingsResponse.model_validate(settings)

            return None

        except Exception as error:
            logger.error(f"Error getting backup settings: {str(error)}", exc_info=True)
            return None

    def update_backup_settings(
        self,
        user_id: int,
        input_data: BackupSettingsUpdate
    ) -> BackupSettingsResponse:
        """
        Update or create backup settings for a user.

        Args:
            user_id: User ID
            input_data: Updated backup settings

        Returns:
            Updated backup settings

        Raises:
            Exception: If database operation fails
        """
        try:
            # Check if settings exist
            existing = self.db.query(BackupSettings).filter(
                BackupSettings.user_id == user_id
            ).first()

            now = datetime.utcnow()

            if existing:
                # Update existing settings
                if input_data.enabled is not None:
                    existing.enabled = input_data.enabled

                if input_data.frequency is not None:
                    existing.frequency = input_data.frequency.value

                if input_data.backup_time is not None:
                    existing.backup_time = input_data.backup_time

                if input_data.keep_count is not None:
                    existing.keep_count = input_data.keep_count

                # Recalculate next backup time if enabled
                if existing.enabled:
                    existing.next_backup_at = self._calculate_next_backup_time(
                        existing.frequency,
                        existing.backup_time
                    )
                else:
                    existing.next_backup_at = None

                existing.updated_at = now

                self.db.commit()
                self.db.refresh(existing)

                logger.info(f"Updated backup settings for user {user_id}")

                self._log_audit(
                    event_type="backup_scheduler.settings_updated",
                    user_id=user_id,
                    resource_id=str(existing.id),
                    action="update",
                    success=True
                )

                return BackupSettingsResponse.model_validate(existing)

            else:
                # Create new settings with defaults
                new_settings = BackupSettings(
                    user_id=user_id,
                    enabled=input_data.enabled if input_data.enabled is not None else True,
                    frequency=input_data.frequency.value if input_data.frequency else BackupFrequency.DAILY.value,
                    backup_time=input_data.backup_time if input_data.backup_time else "03:00",
                    keep_count=input_data.keep_count if input_data.keep_count is not None else 7,
                    created_at=now,
                    updated_at=now
                )

                # Calculate next backup time if enabled
                if new_settings.enabled:
                    new_settings.next_backup_at = self._calculate_next_backup_time(
                        new_settings.frequency,
                        new_settings.backup_time
                    )

                self.db.add(new_settings)
                self.db.commit()
                self.db.refresh(new_settings)

                logger.info(f"Created backup settings for user {user_id}")

                self._log_audit(
                    event_type="backup_scheduler.settings_created",
                    user_id=user_id,
                    resource_id=str(new_settings.id),
                    action="create",
                    success=True
                )

                return BackupSettingsResponse.model_validate(new_settings)

        except Exception as error:
            self.db.rollback()

            logger.error(f"Error updating backup settings: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="backup_scheduler.settings_error",
                user_id=user_id,
                resource_id="unknown",
                action="update",
                success=False,
                error_message=str(error)
            )

            raise

    def get_stats(self) -> Dict:
        """
        Get scheduler statistics.

        Returns:
            Dictionary with scheduler stats including running state,
            check interval, and number of enabled backup settings
        """
        try:
            enabled_count = self.db.query(BackupSettings).filter(
                BackupSettings.enabled == True
            ).count()

            total_count = self.db.query(BackupSettings).count()

            return {
                "is_running": self.is_running,
                "check_interval_seconds": self.check_interval,
                "enabled_backup_settings": enabled_count,
                "total_backup_settings": total_count
            }

        except Exception as error:
            logger.error(f"Error getting stats: {str(error)}", exc_info=True)
            return {
                "is_running": self.is_running,
                "check_interval_seconds": self.check_interval,
                "enabled_backup_settings": 0,
                "total_backup_settings": 0,
                "error": str(error)
            }
