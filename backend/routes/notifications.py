"""
Notification management routes for Justice Companion.
Migrated from electron/ipc-handlers/notifications.ts

Routes:
- GET /notifications - List user's notifications with filters
- GET /notifications/unread/count - Count unread notifications
- GET /notifications/stats - Get notification statistics
- PUT /notifications/{notification_id}/read - Mark notification as read
- PUT /notifications/mark-all-read - Mark all notifications as read
- DELETE /notifications/{notification_id} - Dismiss/delete notification
- GET /notifications/preferences - Get user's notification preferences
- PUT /notifications/preferences - Update notification preferences

Service Layer Architecture:
- Uses NotificationService for business logic
- Uses DeadlineReminderScheduler for background deadline checks
- Uses EncryptionService for encrypted fields
- Uses AuditLogger for comprehensive audit trail
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.services.auth.service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.notification_service import (
    NotificationService,
    NotificationFilters,
    UpdateNotificationPreferencesInput,
)
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.models.notification import (
    NotificationType,
    NotificationSeverity,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ===== PYDANTIC REQUEST MODELS =====

class UpdateNotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""

    deadlineRemindersEnabled: Optional[bool] = Field(None, description="Enable deadline reminders")
    deadlineReminderDays: Optional[int] = Field(
        None, ge=1, le=90, description="Days before deadline to remind"
    )
    caseUpdatesEnabled: Optional[bool] = Field(None, description="Enable case update notifications")
    evidenceUpdatesEnabled: Optional[bool] = Field(
        None, description="Enable evidence update notifications"
    )
    systemAlertsEnabled: Optional[bool] = Field(None, description="Enable system alerts")
    soundEnabled: Optional[bool] = Field(None, description="Enable notification sounds")
    desktopNotificationsEnabled: Optional[bool] = Field(
        None, description="Enable desktop notifications"
    )
    quietHoursEnabled: Optional[bool] = Field(None, description="Enable quiet hours")
    quietHoursStart: Optional[str] = Field(
        None,
        pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        description="Quiet hours start time (HH:MM)",
    )
    quietHoursEnd: Optional[str] = Field(
        None,
        pattern=r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        description="Quiet hours end time (HH:MM)",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "deadlineRemindersEnabled": True,
                "deadlineReminderDays": 7,
                "quietHoursEnabled": True,
                "quietHoursStart": "22:00",
                "quietHoursEnd": "08:00",
            }
        }
    )

# ===== PYDANTIC RESPONSE MODELS =====

class NotificationResponse(BaseModel):
    """Response model for notification data."""

    id: int
    userId: int
    type: str
    severity: str
    title: str
    message: str
    actionUrl: Optional[str] = None
    actionLabel: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    isRead: bool
    isDismissed: bool
    createdAt: str
    readAt: Optional[str] = None
    expiresAt: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "userId": 42,
                "type": "deadline_reminder",
                "severity": "high",
                "title": "Deadline Reminder",
                "message": "Your deadline 'File Motion' is due in 2 days",
                "actionUrl": "/deadlines/123",
                "actionLabel": "View Deadline",
                "metadata": {"deadlineId": 123, "caseId": 456, "daysUntil": 2},
                "isRead": False,
                "isDismissed": False,
                "createdAt": "2025-01-15T10:30:00Z",
                "readAt": None,
                "expiresAt": None,
            }
        },
    )

class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences."""

    id: int
    userId: int
    deadlineRemindersEnabled: bool
    deadlineReminderDays: int
    caseUpdatesEnabled: bool
    evidenceUpdatesEnabled: bool
    systemAlertsEnabled: bool
    soundEnabled: bool
    desktopNotificationsEnabled: bool
    quietHoursEnabled: bool
    quietHoursStart: str
    quietHoursEnd: str
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "userId": 42,
                "deadlineRemindersEnabled": True,
                "deadlineReminderDays": 7,
                "caseUpdatesEnabled": True,
                "evidenceUpdatesEnabled": True,
                "systemAlertsEnabled": True,
                "soundEnabled": True,
                "desktopNotificationsEnabled": True,
                "quietHoursEnabled": False,
                "quietHoursStart": "22:00",
                "quietHoursEnd": "08:00",
                "createdAt": "2025-01-01T00:00:00Z",
                "updatedAt": "2025-01-15T10:30:00Z",
            }
        },
    )

class UnreadCountResponse(BaseModel):
    """Response model for unread notification count."""

    count: int

    model_config = ConfigDict(json_schema_extra={"example": {"count": 5}})

class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics."""

    total: int
    unread: int
    urgent: int
    high: int
    medium: int
    low: int
    byType: Dict[str, int]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total": 25,
                "unread": 5,
                "urgent": 2,
                "high": 3,
                "medium": 10,
                "low": 10,
                "byType": {
                    "deadline_reminder": 5,
                    "case_status_change": 10,
                    "evidence_uploaded": 5,
                    "document_updated": 3,
                    "system_alert": 2,
                },
            }
        }
    )

class MarkAllReadResponse(BaseModel):
    """Response model for mark all as read operation."""

    count: int

    model_config = ConfigDict(json_schema_extra={"example": {"count": 5}})

class DeleteNotificationResponse(BaseModel):
    """Response model for notification deletion."""

    deleted: bool
    id: int

    model_config = ConfigDict(json_schema_extra={"example": {"deleted": True, "id": 123}})

class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool
    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"success": True, "message": "Operation completed successfully"}
        }
    )

# ===== DEPENDENCIES =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)

def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    import os

    # Get encryption key from environment
    key_base64 = os.environ.get("ENCRYPTION_KEY_BASE64")
    if not key_base64:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not configured",
        )

    return EncryptionService(key=key_base64)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db=db)

def get_notification_service(
    db: Session = Depends(get_db), audit_logger: AuditLogger = Depends(get_audit_logger)
) -> NotificationService:
    """Get notification service instance with dependencies."""
    return NotificationService(db=db, audit_logger=audit_logger)

def get_deadline_scheduler(
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> DeadlineReminderScheduler:
    """Get deadline reminder scheduler instance."""
    return DeadlineReminderScheduler(
        db=db,
        notification_service=notification_service,
        audit_logger=audit_logger,
        check_interval=3600,  # 1 hour
    )

# ===== ROUTES =====

@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="List notifications",
    description="""
    List user's notifications with optional filters.

    Returns notifications ordered by severity (urgent first) then created_at (newest first).
    By default, excludes expired and dismissed notifications unless explicitly requested.

    **Query Parameters:**
    - `unreadOnly`: Filter unread notifications only
    - `type`: Filter by notification type (deadline_reminder, case_status_change, etc.)
    - `severity`: Filter by severity (low, medium, high, urgent)
    - `limit`: Maximum results to return (default: 50, max: 500)
    - `offset`: Number of results to skip (default: 0)
    - `includeExpired`: Include expired notifications (default: false)
    - `includeDismissed`: Include dismissed notifications (default: false)

    **Authentication:** Requires valid session ID in Authorization header or session_id query param.
    """,
)
async def list_notifications(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
    unread_only: Optional[bool] = Query(None, alias="unreadOnly"),
    type_filter: Optional[NotificationType] = Query(None, alias="type"),
    severity_filter: Optional[NotificationSeverity] = Query(None, alias="severity"),
    limit: Optional[int] = Query(50, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    include_expired: Optional[bool] = Query(False, alias="includeExpired"),
    include_dismissed: Optional[bool] = Query(False, alias="includeDismissed"),
):
    """List user's notifications with optional filters."""
    try:
        filters = NotificationFilters(
            unread_only=unread_only or False,
            type=type_filter,
            severity=severity_filter,
            limit=limit,
            offset=offset,
            include_expired=include_expired or False,
            include_dismissed=include_dismissed or False,
        )

        notifications = await notification_service.get_notifications(user_id, filters)

        # Convert to response format
        return [notif.to_dict() for notif in notifications]

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list notifications: {str(e)}",
        )

@router.get(
    "/unread/count",
    response_model=UnreadCountResponse,
    summary="Get unread count",
    description="""
    Get count of unread, non-dismissed, non-expired notifications for the user.

    **Authentication:** Requires valid session ID.
    """,
)
async def get_unread_count(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Get count of unread notifications."""
    try:
        count = await notification_service.get_unread_count(user_id)
        return {"count": count}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unread count: {str(e)}",
        )

@router.get(
    "/stats",
    response_model=NotificationStatsResponse,
    summary="Get notification statistics",
    description="""
    Get notification statistics for the user.

    Returns:
    - Total count
    - Unread count
    - Counts by severity (urgent, high, medium, low)
    - Counts by type (deadline_reminder, case_status_change, etc.)

    Excludes dismissed and expired notifications.

    **Authentication:** Requires valid session ID.
    """,
)
async def get_notification_stats(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Get notification statistics."""
    try:
        stats = await notification_service.get_stats(user_id)

        # Convert to response format
        return {
            "total": stats.total,
            "unread": stats.unread,
            "urgent": stats.urgent,
            "high": stats.high,
            "medium": stats.medium,
            "low": stats.low,
            "byType": stats.by_type,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification stats: {str(e)}",
        )

@router.put(
    "/{notification_id}/read",
    response_model=SuccessResponse,
    summary="Mark notification as read",
    description="""
    Mark a specific notification as read.

    Only allows marking notifications owned by the authenticated user.
    Sets is_read=1 and read_at=CURRENT_TIMESTAMP.

    **Authentication:** Requires valid session ID.
    **Authorization:** User must own the notification.
    """,
)
async def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Mark a notification as read."""
    try:
        await notification_service.mark_as_read(notification_id, user_id)
        return {"success": True, "message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}",
        )

@router.put(
    "/mark-all-read",
    response_model=MarkAllReadResponse,
    summary="Mark all notifications as read",
    description="""
    Mark all user's unread notifications as read.

    Only marks non-dismissed, non-expired notifications.
    Returns count of notifications updated.

    **Authentication:** Requires valid session ID.
    """,
)
async def mark_all_notifications_read(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Mark all notifications as read."""
    try:
        count = await notification_service.mark_all_as_read(user_id)
        return {"count": count}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}",
        )

@router.delete(
    "/{notification_id}",
    response_model=DeleteNotificationResponse,
    summary="Delete notification",
    description="""
    Dismiss/delete a notification.

    Only allows deleting notifications owned by the authenticated user.
    This performs a soft delete (marks as dismissed).

    **Authentication:** Requires valid session ID.
    **Authorization:** User must own the notification.
    """,
)
async def delete_notification(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Dismiss/delete a notification."""
    try:
        await notification_service.dismiss(notification_id, user_id)
        return {"deleted": True, "id": notification_id}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}",
        )

@router.get(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    summary="Get notification preferences",
    description="""
    Get user's notification preferences.

    Creates default preferences if they don't exist.

    **Default Preferences:**
    - All notification types enabled
    - 7 days deadline reminder threshold
    - Quiet hours disabled
    - Quiet hours: 22:00 - 08:00

    **Authentication:** Requires valid session ID.
    """,
)
async def get_notification_preferences(
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Get user's notification preferences."""
    try:
        prefs = await notification_service.get_preferences(user_id)
        return prefs.to_dict()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification preferences: {str(e)}",
        )

@router.put(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    summary="Update notification preferences",
    description="""
    Update user's notification preferences.

    Creates default preferences if they don't exist.
    Only updates fields provided in the request body.

    **Updatable Fields:**
    - `deadlineRemindersEnabled`: Enable/disable deadline reminders
    - `deadlineReminderDays`: Days before deadline to remind (1-90)
    - `caseUpdatesEnabled`: Enable/disable case update notifications
    - `evidenceUpdatesEnabled`: Enable/disable evidence update notifications
    - `systemAlertsEnabled`: Enable/disable system alerts
    - `soundEnabled`: Enable/disable notification sounds
    - `desktopNotificationsEnabled`: Enable/disable desktop notifications
    - `quietHoursEnabled`: Enable/disable quiet hours
    - `quietHoursStart`: Quiet hours start time (HH:MM format)
    - `quietHoursEnd`: Quiet hours end time (HH:MM format)

    **Authentication:** Requires valid session ID.
    """,
)
async def update_notification_preferences(
    request: UpdateNotificationPreferencesRequest,
    user_id: int = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Update user's notification preferences."""
    try:
        # Convert camelCase to snake_case for service layer
        updates = UpdateNotificationPreferencesInput(
            deadline_reminders_enabled=request.deadlineRemindersEnabled,
            deadline_reminder_days=request.deadlineReminderDays,
            case_updates_enabled=request.caseUpdatesEnabled,
            evidence_updates_enabled=request.evidenceUpdatesEnabled,
            system_alerts_enabled=request.systemAlertsEnabled,
            sound_enabled=request.soundEnabled,
            desktop_notifications_enabled=request.desktopNotificationsEnabled,
            quiet_hours_enabled=request.quietHoursEnabled,
            quiet_hours_start=request.quietHoursStart,
            quiet_hours_end=request.quietHoursEnd,
        )

        prefs = await notification_service.update_preferences(user_id, updates)
        return prefs.to_dict()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification preferences: {str(e)}",
        )

# ===== ADMIN/SYSTEM ROUTES =====

@router.post(
    "/scheduler/start",
    summary="Start deadline reminder scheduler",
    description="""
    Start the deadline reminder scheduler background service.

    This endpoint is typically called during application startup.
    The scheduler runs periodic checks (hourly by default) to identify
    upcoming deadlines and send reminder notifications.

    **Note:** This is an internal/admin endpoint and should be protected
    in production deployments.
    """,
)
async def start_deadline_scheduler(
    scheduler: DeadlineReminderScheduler = Depends(get_deadline_scheduler),
):
    """Start the deadline reminder scheduler."""
    try:
        scheduler.start()
        return {"success": True, "message": "Deadline reminder scheduler started"}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start scheduler: {str(e)}",
        )

@router.post(
    "/scheduler/stop",
    summary="Stop deadline reminder scheduler",
    description="""
    Stop the deadline reminder scheduler background service.

    This endpoint is typically called during application shutdown.

    **Note:** This is an internal/admin endpoint and should be protected
    in production deployments.
    """,
)
async def stop_deadline_scheduler(
    scheduler: DeadlineReminderScheduler = Depends(get_deadline_scheduler),
):
    """Stop the deadline reminder scheduler."""
    try:
        scheduler.stop()
        return {"success": True, "message": "Deadline reminder scheduler stopped"}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop scheduler: {str(e)}",
        )

@router.post(
    "/scheduler/check-now",
    summary="Manually trigger deadline check",
    description="""
    Manually trigger a deadline check immediately.

    This bypasses the normal hourly schedule and processes all users
    with deadline reminders enabled. Useful for testing or on-demand checks.

    **Note:** This is an internal/admin endpoint and should be protected
    in production deployments.
    """,
)
async def trigger_deadline_check(
    scheduler: DeadlineReminderScheduler = Depends(get_deadline_scheduler),
):
    """Manually trigger deadline check."""
    try:
        await scheduler.check_now()
        return {"success": True, "message": "Deadline check completed"}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger deadline check: {str(e)}",
        )

@router.get(
    "/scheduler/stats",
    summary="Get scheduler statistics",
    description="""
    Get deadline reminder scheduler statistics.

    Returns:
    - Running state
    - Check interval (seconds)
    - Number of tracked reminders

    **Note:** This is an internal/admin endpoint and should be protected
    in production deployments.
    """,
)
async def get_scheduler_stats(
    scheduler: DeadlineReminderScheduler = Depends(get_deadline_scheduler),
):
    """Get scheduler statistics."""
    try:
        stats = scheduler.get_stats()
        return stats

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get scheduler stats: {str(e)}",
        )
