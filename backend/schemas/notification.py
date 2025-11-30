"""
Notification schemas - Pydantic models for notification API operations.

Single source of truth for notification-related request and response types.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# ===== REQUEST SCHEMAS =====


class NotificationPreferencesUpdate(BaseModel):
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


# ===== RESPONSE SCHEMAS =====


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


class NotificationDeleteResponse(BaseModel):
    """Response model for notification deletion."""

    deleted: bool
    id: int

    model_config = ConfigDict(json_schema_extra={"example": {"deleted": True, "id": 123}})


class NotificationSuccessResponse(BaseModel):
    """Generic success response for notification operations."""

    success: bool
    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"success": True, "message": "Operation completed successfully"}
        }
    )


# ===== ALIASES FOR BACKWARDS COMPATIBILITY =====
UpdateNotificationPreferencesRequest = NotificationPreferencesUpdate
DeleteNotificationResponse = NotificationDeleteResponse
SuccessResponse = NotificationSuccessResponse
