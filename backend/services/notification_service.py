"""
Notification service for notification management.
Migrated from src/services/NotificationService.ts

Features:
- Notification CRUD operations with user ownership verification
- User preference management
- Automatic notification filtering based on preferences
- Quiet hours support
- Real-time event emission support
- Notification statistics and expiration cleanup
- Comprehensive audit logging for all operations

Security:
- All operations verify user_id ownership
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent notifications
- All security events audited
"""

from typing import Optional, List, Dict, Any, Protocol
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException

from backend.models.notification import (
    Notification,
    NotificationPreferences,
    NotificationType,
    NotificationSeverity,
)
from backend.services.audit_logger import AuditLogger


class NotificationError(Exception):
    """Exception raised for notification-specific errors."""


class NotificationEventHandler(Protocol):
    """Protocol for notification event handlers."""

    async def on_notification_created(self, notification: Notification) -> None:
        """Called when a notification is created."""
        ...

    async def on_notification_read(self, notification_id: int) -> None:
        """Called when a notification is marked as read."""
        ...

    async def on_notification_dismissed(self, notification_id: int) -> None:
        """Called when a notification is dismissed."""
        ...


# Pydantic models for input/output
from pydantic import BaseModel, Field, ConfigDict


class CreateNotificationInput(BaseModel):
    """Input model for creating a new notification."""

    user_id: int = Field(..., description="User ID to send notification to")
    type: NotificationType = Field(..., description="Type of notification")
    severity: NotificationSeverity = Field(..., description="Notification severity")
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message")
    action_url: Optional[str] = Field(None, description="Optional action URL")
    action_label: Optional[str] = Field(None, description="Optional action button label")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration timestamp")

    model_config = ConfigDict(use_enum_values=True)


class NotificationFilters(BaseModel):
    """Filters for querying notifications."""

    unread_only: Optional[bool] = Field(False, description="Filter unread notifications only")
    type: Optional[NotificationType] = Field(None, description="Filter by notification type")
    severity: Optional[NotificationSeverity] = Field(None, description="Filter by severity")
    limit: Optional[int] = Field(None, ge=1, le=100, description="Maximum results to return")
    offset: Optional[int] = Field(0, ge=0, description="Number of results to skip")
    include_expired: Optional[bool] = Field(False, description="Include expired notifications")
    include_dismissed: Optional[bool] = Field(False, description="Include dismissed notifications")

    model_config = ConfigDict(use_enum_values=True)


class NotificationStats(BaseModel):
    """Notification statistics."""

    total: int
    unread: int
    urgent: int
    high: int
    medium: int
    low: int
    by_type: Dict[str, int]


class UpdateNotificationPreferencesInput(BaseModel):
    """Input model for updating notification preferences."""

    deadline_reminders_enabled: Optional[bool] = None
    deadline_reminder_days: Optional[int] = Field(None, ge=1, le=30)
    case_updates_enabled: Optional[bool] = None
    evidence_updates_enabled: Optional[bool] = None
    system_alerts_enabled: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    desktop_notifications_enabled: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")


class NotificationService:
    """
    Business logic layer for notification management.
    Handles notification creation, delivery, preferences, and audit logging.

    All operations verify user ownership to prevent unauthorized access.
    """

    def __init__(self, db: Session, audit_logger: Optional[AuditLogger] = None):
        """
        Initialize notification service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.audit_logger = audit_logger
        self.event_handlers: List[NotificationEventHandler] = []

    def register_event_handler(self, handler: NotificationEventHandler) -> None:
        """
        Register an event handler for notification events.

        Args:
            handler: Event handler implementing NotificationEventHandler protocol
        """
        self.event_handlers.append(handler)

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type="notification",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message,
            )

    def _should_send_notification(
        self, notification_type: NotificationType, prefs: NotificationPreferences
    ) -> bool:
        """
        Check if notification should be sent based on user preferences.

        Args:
            notification_type: Type of notification to check
            prefs: User notification preferences

        Returns:
            True if notification should be sent, False otherwise
        """
        type_mapping = {
            NotificationType.DEADLINE_REMINDER: prefs.deadline_reminders_enabled,
            NotificationType.CASE_STATUS_CHANGE: prefs.case_updates_enabled,
            NotificationType.DOCUMENT_UPDATED: prefs.case_updates_enabled,
            NotificationType.EVIDENCE_UPLOADED: prefs.evidence_updates_enabled,
            NotificationType.SYSTEM_ALERT: prefs.system_alerts_enabled,
            NotificationType.SYSTEM_WARNING: prefs.system_alerts_enabled,
            NotificationType.SYSTEM_INFO: prefs.system_alerts_enabled,
        }

        return type_mapping.get(notification_type, True)

    def _is_in_quiet_hours(self, prefs: NotificationPreferences) -> bool:
        """
        Check if current time is within quiet hours.

        Args:
            prefs: User notification preferences

        Returns:
            True if in quiet hours, False otherwise
        """
        if not prefs.quiet_hours_enabled:
            return False

        now = datetime.now()
        current_time = now.strftime("%H:%M")

        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end

        # Handle case where quiet hours span midnight
        if start < end:
            return start <= current_time < end
        else:
            return current_time >= start or current_time < end

    async def create_notification(self, input_data: CreateNotificationInput) -> Notification:
        """
        Create a new notification with preference checking.

        Args:
            input_data: Notification creation data

        Returns:
            Created notification

        Raises:
            NotificationError: If notification type is disabled or in quiet hours
        """
        try:
            # Check if user has this notification type enabled
            prefs = await self.get_preferences(input_data.user_id)

            if not self._should_send_notification(input_data.type, prefs):
                self._log_audit(
                    event_type="notification.create",
                    user_id=input_data.user_id,
                    resource_id="blocked",
                    action="create",
                    success=False,
                    details={"type": input_data.type.value, "reason": "Notification type disabled"},
                )
                raise NotificationError(f"Notification type {input_data.type.value} is disabled")

            # Check if we're in quiet hours
            if self._is_in_quiet_hours(prefs):
                self._log_audit(
                    event_type="notification.create",
                    user_id=input_data.user_id,
                    resource_id="blocked",
                    action="create",
                    success=False,
                    details={"reason": "Quiet hours active"},
                )
                raise NotificationError("Notification blocked during quiet hours")

            # Create the notification
            notification = Notification(
                user_id=input_data.user_id,
                type=input_data.type.value,
                severity=input_data.severity.value,
                title=input_data.title,
                message=input_data.message,
                action_url=input_data.action_url,
                action_label=input_data.action_label,
                notification_metadata=input_data.metadata,
                expires_at=input_data.expires_at,
            )

            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)

            # Log the creation
            self._log_audit(
                event_type="notification.create",
                user_id=input_data.user_id,
                resource_id=str(notification.id),
                action="create",
                success=True,
                details={"type": input_data.type.value, "severity": input_data.severity.value},
            )

            # Emit event to handlers
            for handler in self.event_handlers:
                await handler.on_notification_created(notification)

            return notification

        except NotificationError:
            raise
        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="notification.create",
                user_id=input_data.user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(error),
            )
            raise NotificationError(f"Failed to create notification: {str(error)}")

    async def get_notifications(
        self, user_id: int, filters: Optional[NotificationFilters] = None
    ) -> List[Notification]:
        """
        Get notifications for a user with optional filters.

        Args:
            user_id: ID of user requesting notifications
            filters: Optional filters to apply

        Returns:
            List of notifications matching filters
        """
        try:
            query = self.db.query(Notification).filter(Notification.user_id == user_id)

            if filters:
                if filters.unread_only:
                    query = query.filter(~Notification.is_read)

                if filters.type:
                    query = query.filter(Notification.type == filters.type.value)

                if filters.severity:
                    query = query.filter(Notification.severity == filters.severity.value)

                if not filters.include_expired:
                    query = query.filter(
                        (Notification.expires_at.is_(None))
                        | (Notification.expires_at > datetime.now())
                    )

                if not filters.include_dismissed:
                    query = query.filter(~Notification.is_dismissed)

                if filters.offset:
                    query = query.offset(filters.offset)

                if filters.limit:
                    query = query.limit(filters.limit)

            notifications = query.order_by(Notification.created_at.desc()).all()
            return notifications

        except Exception as error:
            self._log_audit(
                event_type="notification.list",
                user_id=user_id,
                resource_id="all",
                action="read",
                success=False,
                error_message=str(error),
            )
            raise NotificationError(f"Failed to retrieve notifications: {str(error)}")

    async def get_notification_by_id(
        self, notification_id: int, user_id: int
    ) -> Optional[Notification]:
        """
        Get a notification by ID with ownership verification.

        Args:
            notification_id: Notification ID
            user_id: ID of user requesting the notification

        Returns:
            Notification if found and owned by user, None otherwise

        Raises:
            HTTPException: 403 if user doesn't own the notification
        """
        notification = (
            self.db.query(Notification).filter(Notification.id == notification_id).first()
        )

        if not notification:
            return None

        if notification.user_id != user_id:
            self._log_audit(
                event_type="notification.unauthorized_access",
                user_id=user_id,
                resource_id=str(notification_id),
                action="read",
                success=False,
                details={"reason": "User does not own this notification"},
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this notification",
            )

        return notification

    async def mark_as_read(self, notification_id: int, user_id: int) -> None:
        """
        Mark a notification as read with ownership verification.

        Args:
            notification_id: Notification ID to mark as read
            user_id: ID of user marking the notification

        Raises:
            HTTPException: 404 if notification not found, 403 if unauthorized
        """
        notification = await self.get_notification_by_id(notification_id, user_id)

        if not notification:
            raise HTTPException(
                status_code=404, detail=f"Notification with ID {notification_id} not found"
            )

        notification.is_read = True
        notification.read_at = datetime.now()
        self.db.commit()

        self._log_audit(
            event_type="notification.read",
            user_id=user_id,
            resource_id=str(notification_id),
            action="read",
            success=True,
        )

        # Emit event to handlers
        for handler in self.event_handlers:
            await handler.on_notification_read(notification_id)

    async def mark_all_as_read(self, user_id: int) -> int:
        """
        Mark all unread notifications as read for a user.

        Args:
            user_id: ID of user marking notifications

        Returns:
            Number of notifications marked as read
        """
        try:
            count = (
                self.db.query(Notification)
                .filter(and_(Notification.user_id == user_id, ~Notification.is_read))
                .update({"is_read": True, "read_at": datetime.now()}, synchronize_session=False)
            )
            self.db.commit()

            self._log_audit(
                event_type="notification.read_all",
                user_id=user_id,
                resource_id="bulk",
                action="update",
                success=True,
                details={"count": count},
            )

            return count

        except Exception as error:
            self.db.rollback()
            raise NotificationError(f"Failed to mark all as read: {str(error)}")

    async def dismiss(self, notification_id: int, user_id: int) -> None:
        """
        Dismiss a notification with ownership verification.

        Args:
            notification_id: Notification ID to dismiss
            user_id: ID of user dismissing the notification

        Raises:
            HTTPException: 404 if notification not found, 403 if unauthorized
        """
        notification = await self.get_notification_by_id(notification_id, user_id)

        if not notification:
            raise HTTPException(
                status_code=404, detail=f"Notification with ID {notification_id} not found"
            )

        notification.is_dismissed = True
        self.db.commit()

        self._log_audit(
            event_type="notification.dismiss",
            user_id=user_id,
            resource_id=str(notification_id),
            action="update",
            success=True,
        )

        # Emit event to handlers
        for handler in self.event_handlers:
            await handler.on_notification_dismissed(notification_id)

    async def get_unread_count(self, user_id: int) -> int:
        """
        Get count of unread notifications for a user.

        Args:
            user_id: ID of user

        Returns:
            Count of unread notifications
        """
        return (
            self.db.query(Notification)
            .filter(
                and_(
                    Notification.user_id == user_id,
                    ~Notification.is_read,
                    ~Notification.is_dismissed,
                )
            )
            .count()
        )

    async def get_stats(self, user_id: int) -> NotificationStats:
        """
        Get notification statistics for a user.

        Args:
            user_id: ID of user

        Returns:
            Notification statistics
        """
        notifications = self.db.query(Notification).filter(Notification.user_id == user_id).all()

        total = len(notifications)
        unread = sum(1 for n in notifications if not n.is_read and not n.is_dismissed)

        # Count by severity
        urgent = sum(1 for n in notifications if n.severity == NotificationSeverity.URGENT.value)
        high = sum(1 for n in notifications if n.severity == NotificationSeverity.HIGH.value)
        medium = sum(1 for n in notifications if n.severity == NotificationSeverity.MEDIUM.value)
        low = sum(1 for n in notifications if n.severity == NotificationSeverity.LOW.value)

        # Count by type
        by_type: Dict[str, int] = {}
        for notification_type in NotificationType:
            by_type[notification_type.value] = sum(
                1 for n in notifications if n.type == notification_type.value
            )

        return NotificationStats(
            total=total,
            unread=unread,
            urgent=urgent,
            high=high,
            medium=medium,
            low=low,
            by_type=by_type,
        )

    async def get_preferences(self, user_id: int) -> NotificationPreferences:
        """
        Get user notification preferences, creating defaults if not exists.

        Args:
            user_id: ID of user

        Returns:
            User notification preferences
        """
        prefs = (
            self.db.query(NotificationPreferences)
            .filter(NotificationPreferences.user_id == user_id)
            .first()
        )

        if prefs:
            return prefs

        # Create default preferences
        prefs = NotificationPreferences(user_id=user_id)
        self.db.add(prefs)
        self.db.commit()
        self.db.refresh(prefs)

        self._log_audit(
            event_type="notification.preferences_create",
            user_id=user_id,
            resource_id=str(prefs.id),
            action="create",
            success=True,
        )

        return prefs

    async def update_preferences(
        self, user_id: int, updates: UpdateNotificationPreferencesInput
    ) -> NotificationPreferences:
        """
        Update user notification preferences.

        Args:
            user_id: ID of user
            updates: Preference updates

        Returns:
            Updated preferences

        Raises:
            NotificationError: If update fails
        """
        try:
            prefs = await self.get_preferences(user_id)

            fields_updated = []

            # Update fields if provided
            update_dict = updates.model_dump(exclude_unset=True)
            for field, value in update_dict.items():
                if hasattr(prefs, field):
                    setattr(prefs, field, value)
                    fields_updated.append(field)

            self.db.commit()
            self.db.refresh(prefs)

            self._log_audit(
                event_type="notification.preferences_update",
                user_id=user_id,
                resource_id=str(prefs.id),
                action="update",
                success=True,
                details={"changes": fields_updated},
            )

            return prefs

        except Exception as error:
            self.db.rollback()
            raise NotificationError(f"Failed to update preferences: {str(error)}")

    async def cleanup_expired(self) -> int:
        """
        Delete expired notifications.

        Returns:
            Number of notifications deleted
        """
        try:
            deleted_count = (
                self.db.query(Notification)
                .filter(
                    and_(
                        Notification.expires_at.isnot(None),
                        Notification.expires_at <= datetime.now(),
                    )
                )
                .delete(synchronize_session=False)
            )

            self.db.commit()

            if deleted_count > 0:
                self._log_audit(
                    event_type="notification.cleanup",
                    user_id=None,
                    resource_id="bulk",
                    action="delete",
                    success=True,
                    details={"deletedCount": deleted_count},
                )

            return deleted_count

        except Exception as error:
            self.db.rollback()
            raise NotificationError(f"Failed to cleanup expired notifications: {str(error)}")

    async def create_system_notification(
        self, user_id: int, severity: NotificationSeverity, title: str, message: str
    ) -> Notification:
        """
        Create a system notification with automatic type determination.

        Args:
            user_id: User ID to send notification to
            severity: Notification severity
            title: Notification title
            message: Notification message

        Returns:
            Created notification
        """
        # Determine notification type based on severity
        type_mapping = {
            NotificationSeverity.URGENT: NotificationType.SYSTEM_ALERT,
            NotificationSeverity.HIGH: NotificationType.SYSTEM_ALERT,
            NotificationSeverity.MEDIUM: NotificationType.SYSTEM_WARNING,
            NotificationSeverity.LOW: NotificationType.SYSTEM_INFO,
        }

        notification_type = type_mapping.get(severity, NotificationType.SYSTEM_INFO)

        return await self.create_notification(
            CreateNotificationInput(
                user_id=user_id,
                type=notification_type,
                severity=severity,
                title=title,
                message=message,
            )
        )
