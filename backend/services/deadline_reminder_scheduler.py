"""
Deadline Reminder Scheduler service for automated deadline notifications.
Migrated from src/services/DeadlineReminderScheduler.ts

Features:
- Background service that checks for upcoming deadlines
- Sends notifications based on user preferences
- Respects notification preferences (quiet hours, enabled types)
- Prevents duplicate reminders with tracking system
- Runs periodic checks using asyncio
- Comprehensive audit logging for all operations

Security:
- All operations verify user preferences
- Rate limiting through notification service
- All reminder events audited
"""

from typing import Optional, Dict, Set
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import asyncio
import logging

from backend.models.deadline import Deadline, DeadlineStatus
from backend.models.notification import NotificationPreferences, NotificationType, NotificationSeverity
from backend.services.notification_service import NotificationService, CreateNotificationInput
from backend.services.audit_logger import AuditLogger


# Configure logging
logger = logging.getLogger(__name__)


class DeadlineReminderScheduler:
    """
    Background service that checks for upcoming deadlines and sends notifications.

    This service runs periodic checks (hourly by default) to identify deadlines
    that are approaching and sends reminders to users based on their notification
    preferences. It prevents duplicate reminders and respects quiet hours.

    Attributes:
        db: SQLAlchemy database session
        notification_service: Service for creating notifications
        audit_logger: Optional audit logger for tracking all operations
        check_interval: Seconds between deadline checks (default: 3600 = 1 hour)
        is_running: Flag indicating if scheduler is active
    """

    def __init__(
        self,
        db: Session,
        notification_service: NotificationService,
        audit_logger: Optional[AuditLogger] = None,
        check_interval: int = 3600  # 1 hour in seconds
    ):
        """
        Initialize deadline reminder scheduler.

        Args:
            db: SQLAlchemy database session
            notification_service: Service for creating notifications
            audit_logger: Optional audit logger instance
            check_interval: Seconds between checks (default: 3600 = 1 hour)
        """
        self.db = db
        self.notification_service = notification_service
        self.audit_logger = audit_logger
        self.check_interval = check_interval
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._sent_reminders: Set[str] = set()  # Track sent reminders to prevent duplicates

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
                resource_type="deadline_reminder",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message
            )

    def start(self) -> None:
        """
        Start the deadline reminder scheduler.

        Initiates periodic checks for upcoming deadlines. Runs immediately
        on start and then repeats at configured intervals.

        This method is non-blocking and runs the scheduler in the background.
        """
        if self.is_running:
            logger.warning("DeadlineReminderScheduler is already running")
            return

        self.is_running = True
        logger.info("Starting DeadlineReminderScheduler")

        # Create background task for periodic checking
        self._task = asyncio.create_task(self._run_scheduler())

        self._log_audit(
            event_type="deadline_reminder.scheduler_start",
            user_id=None,
            resource_id="scheduler",
            action="start",
            success=True
        )

    def stop(self) -> None:
        """
        Stop the deadline reminder scheduler.

        Cancels the background task and stops all deadline checking.
        """
        if not self.is_running:
            return

        self.is_running = False

        if self._task and not self._task.done():
            self._task.cancel()

        logger.info("Stopped DeadlineReminderScheduler")

        self._log_audit(
            event_type="deadline_reminder.scheduler_stop",
            user_id=None,
            resource_id="scheduler",
            action="stop",
            success=True
        )

    async def _run_scheduler(self) -> None:
        """
        Internal method to run the scheduler loop.

        Performs immediate check on start, then runs periodic checks
        at configured intervals until stopped.
        """
        # Run immediately on start
        await self.check_now()

        # Then run periodically
        while self.is_running:
            try:
                await asyncio.sleep(self.check_interval)
                if self.is_running:
                    await self.check_now()
            except asyncio.CancelledError:
                logger.info("Scheduler task cancelled")
                break
            except Exception as error:
                logger.error(f"Error in scheduler loop: {str(error)}", exc_info=True)
                # Continue running even if one check fails
                continue

    async def check_now(self) -> None:
        """
        Manually trigger a deadline check.

        Useful for testing or on-demand checks. Can be called even when
        scheduler is not running.

        This method:
        1. Gets all users with deadline reminders enabled
        2. For each user, finds upcoming deadlines within reminder threshold
        3. Sends reminder notifications for deadlines not already reminded
        4. Tracks sent reminders to prevent duplicates
        """
        try:
            logger.info("Checking for upcoming deadlines")

            # Get users with deadline reminders enabled
            users_with_reminders = self._get_users_with_deadline_reminders()

            reminder_count = 0

            # Process each user with reminders enabled
            for prefs in users_with_reminders:
                try:
                    # Get upcoming deadlines for this user
                    upcoming_deadlines = self._get_upcoming_deadlines(
                        prefs.user_id,
                        prefs.deadline_reminder_days
                    )

                    for deadline in upcoming_deadlines:
                        # Check if we've already sent a reminder for this deadline
                        reminder_key = f"{prefs.user_id}-{deadline.id}"

                        if reminder_key not in self._sent_reminders:
                            # Send reminder notification
                            await self._create_deadline_reminder_notification(
                                prefs.user_id,
                                deadline
                            )

                            # Mark as sent to prevent duplicates
                            self._sent_reminders.add(reminder_key)
                            reminder_count += 1

                except Exception as user_error:
                    logger.error(
                        f"Error processing reminders for user {prefs.user_id}: {str(user_error)}",
                        exc_info=True
                    )
                    # Continue with next user even if one fails
                    continue

            logger.info(f"Completed deadline check - sent {reminder_count} reminders")

            self._log_audit(
                event_type="deadline_reminder.check_completed",
                user_id=None,
                resource_id="bulk",
                action="check",
                success=True,
                details={"reminders_sent": reminder_count}
            )

        except Exception as error:
            logger.error(f"Error checking deadlines: {str(error)}", exc_info=True)

            self._log_audit(
                event_type="deadline_reminder.check_error",
                user_id=None,
                resource_id="bulk",
                action="check",
                success=False,
                error_message=str(error)
            )

    def _get_users_with_deadline_reminders(self) -> list[NotificationPreferences]:
        """
        Get all users who have deadline reminders enabled.

        Returns:
            List of notification preferences for users with deadline reminders enabled
        """
        return self.db.query(NotificationPreferences).filter(
            NotificationPreferences.deadline_reminders_enabled == True
        ).all()

    def _get_upcoming_deadlines(
        self,
        user_id: int,
        reminder_days: int
    ) -> list[Deadline]:
        """
        Get upcoming deadlines for a user within the reminder threshold.

        Args:
            user_id: User ID to get deadlines for
            reminder_days: Number of days before deadline to remind

        Returns:
            List of upcoming deadlines within reminder threshold
        """
        now = datetime.now()
        reminder_threshold = now + timedelta(days=reminder_days)

        # Query for deadlines that:
        # 1. Belong to this user
        # 2. Are not completed
        # 3. Are not soft-deleted
        # 4. Have deadline_date in the future but within reminder threshold
        deadlines = self.db.query(Deadline).filter(
            and_(
                Deadline.user_id == user_id,
                Deadline.status != DeadlineStatus.COMPLETED.value,
                Deadline.deleted_at.is_(None)
            )
        ).all()

        # Filter by date range (deadline_date is stored as ISO string)
        upcoming = []
        for deadline in deadlines:
            try:
                deadline_date = datetime.fromisoformat(deadline.deadline_date.replace('Z', '+00:00'))

                # Check if deadline is in future and within reminder threshold
                if now < deadline_date <= reminder_threshold:
                    upcoming.append(deadline)
            except (ValueError, AttributeError) as error:
                logger.warning(
                    f"Invalid deadline date for deadline {deadline.id}: {deadline.deadline_date}",
                    exc_info=True
                )
                continue

        return upcoming

    async def _create_deadline_reminder_notification(
        self,
        user_id: int,
        deadline: Deadline
    ) -> None:
        """
        Create a deadline reminder notification.

        Calculates days until deadline and creates an appropriately
        formatted notification with severity based on urgency.

        Args:
            user_id: User ID to send notification to
            deadline: Deadline object to create reminder for
        """
        try:
            # Calculate days until deadline
            now = datetime.now()
            deadline_date = datetime.fromisoformat(deadline.deadline_date.replace('Z', '+00:00'))
            days_until = (deadline_date - now).days

            # Ensure minimum of 0 days (for today)
            days_until = max(0, days_until)

            # Determine severity based on urgency
            if days_until <= 1:
                severity = NotificationSeverity.HIGH
            else:
                severity = NotificationSeverity.MEDIUM

            # Format message with proper pluralization
            day_text = "day" if days_until == 1 else "days"
            if days_until == 0:
                message = f'Your deadline "{deadline.title}" is due today!'
            else:
                message = f'Your deadline "{deadline.title}" is due in {days_until} {day_text}.'

            # Create notification through notification service
            await self.notification_service.create_notification(
                CreateNotificationInput(
                    user_id=user_id,
                    type=NotificationType.DEADLINE_REMINDER,
                    severity=severity,
                    title=f"Deadline Reminder: {deadline.title}",
                    message=message,
                    metadata={
                        "deadlineId": deadline.id,
                        "caseId": deadline.case_id,
                        "daysUntil": days_until,
                        "deadlineDate": deadline.deadline_date
                    }
                )
            )

            logger.info(
                f"Created deadline reminder for user {user_id}, deadline {deadline.id} "
                f"({days_until} days until)"
            )

            self._log_audit(
                event_type="deadline_reminder.created",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="create",
                success=True,
                details={
                    "deadline_title": deadline.title,
                    "days_until": days_until
                }
            )

        except Exception as error:
            logger.error(
                f"Failed to create deadline reminder for user {user_id}, "
                f"deadline {deadline.id}: {str(error)}",
                exc_info=True
            )

            self._log_audit(
                event_type="deadline_reminder.create_error",
                user_id=user_id,
                resource_id=str(deadline.id),
                action="create",
                success=False,
                error_message=str(error)
            )

    def clear_sent_reminders(self) -> None:
        """
        Clear the sent reminders tracking set.

        Useful for resetting the duplicate prevention mechanism,
        for example after a long period or for testing purposes.
        """
        count = len(self._sent_reminders)
        self._sent_reminders.clear()

        logger.info(f"Cleared {count} sent reminder entries")

        self._log_audit(
            event_type="deadline_reminder.clear_cache",
            user_id=None,
            resource_id="cache",
            action="clear",
            success=True,
            details={"cleared_count": count}
        )

    def get_stats(self) -> Dict[str, any]:
        """
        Get scheduler statistics.

        Returns:
            Dictionary with scheduler stats including running state,
            check interval, and number of tracked reminders
        """
        return {
            "is_running": self.is_running,
            "check_interval_seconds": self.check_interval,
            "sent_reminders_count": len(self._sent_reminders)
        }
