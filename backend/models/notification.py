"""
Notification model for notification management.
Migrated from src/repositories/NotificationRepository.ts
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.base import Base
import enum
from typing import Optional, Dict, Any
import json


class NotificationType(str, enum.Enum):
    """Notification type enumeration matching database CHECK constraint."""
    DEADLINE_REMINDER = "deadline_reminder"
    CASE_STATUS_CHANGE = "case_status_change"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    DOCUMENT_UPDATED = "document_updated"
    SYSTEM_ALERT = "system_alert"
    SYSTEM_WARNING = "system_warning"
    SYSTEM_INFO = "system_info"


class NotificationSeverity(str, enum.Enum):
    """Notification severity enumeration matching database CHECK constraint."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """
    Notification model - represents user notifications in the system.

    Schema from 018_create_notifications_table.sql:
    - id: Auto-incrementing primary key
    - user_id: Foreign key to users table
    - type: Type of notification (deadline_reminder, case_status_change, etc.)
    - severity: Notification severity (low, medium, high, urgent)
    - title: Notification title
    - message: Notification message content
    - action_url: Optional URL for notification action
    - action_label: Optional label for action button
    - metadata_json: JSON metadata (caseId, evidenceId, deadlineId, etc.)
    - is_read: Whether notification has been read (boolean, 0=unread, 1=read)
    - is_dismissed: Whether notification has been dismissed
    - created_at: Notification creation timestamp
    - read_at: Timestamp when notification was read
    - expires_at: Optional expiration timestamp
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String, nullable=True)
    action_label = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    is_dismissed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")

    @property
    def notification_metadata(self) -> Optional[Dict[str, Any]]:
        """Parse metadata_json into a dictionary."""
        if self.metadata_json:
            try:
                return json.loads(self.metadata_json)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    @notification_metadata.setter
    def notification_metadata(self, value: Optional[Dict[str, Any]]):
        """Serialize dictionary to metadata_json."""
        if value is not None:
            self.metadata_json = json.dumps(value)
        else:
            self.metadata_json = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert Notification model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "type": self.type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "actionUrl": self.action_url,
            "actionLabel": self.action_label,
            "metadata": self.notification_metadata,
            "isRead": bool(self.is_read),
            "isDismissed": bool(self.is_dismissed),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "readAt": self.read_at.isoformat() if self.read_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type='{self.type}', severity='{self.severity}')>"


class NotificationPreferences(Base):
    """
    NotificationPreferences model - user notification preferences.

    Schema from 018_create_notifications_table.sql:
    - id: Auto-incrementing primary key
    - user_id: Foreign key to users table (unique)
    - deadline_reminders_enabled: Enable deadline reminders
    - deadline_reminder_days: Days before deadline to remind (default 7)
    - case_updates_enabled: Enable case update notifications
    - evidence_updates_enabled: Enable evidence update notifications
    - system_alerts_enabled: Enable system alerts
    - sound_enabled: Enable notification sounds
    - desktop_notifications_enabled: Enable desktop notifications
    - quiet_hours_enabled: Enable quiet hours
    - quiet_hours_start: Quiet hours start time (HH:MM)
    - quiet_hours_end: Quiet hours end time (HH:MM)
    - created_at: Preferences creation timestamp
    - updated_at: Last update timestamp
    """

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Notification type toggles
    deadline_reminders_enabled = Column(Boolean, nullable=False, default=True)
    deadline_reminder_days = Column(Integer, nullable=False, default=7)
    case_updates_enabled = Column(Boolean, nullable=False, default=True)
    evidence_updates_enabled = Column(Boolean, nullable=False, default=True)
    system_alerts_enabled = Column(Boolean, nullable=False, default=True)

    # Delivery preferences
    sound_enabled = Column(Boolean, nullable=False, default=True)
    desktop_notifications_enabled = Column(Boolean, nullable=False, default=True)

    # Quiet hours
    quiet_hours_enabled = Column(Boolean, nullable=False, default=False)
    quiet_hours_start = Column(String, nullable=False, default="22:00")
    quiet_hours_end = Column(String, nullable=False, default="08:00")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="notification_preferences")

    def to_dict(self) -> Dict[str, Any]:
        """Convert NotificationPreferences model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "deadlineRemindersEnabled": bool(self.deadline_reminders_enabled),
            "deadlineReminderDays": self.deadline_reminder_days,
            "caseUpdatesEnabled": bool(self.case_updates_enabled),
            "evidenceUpdatesEnabled": bool(self.evidence_updates_enabled),
            "systemAlertsEnabled": bool(self.system_alerts_enabled),
            "soundEnabled": bool(self.sound_enabled),
            "desktopNotificationsEnabled": bool(self.desktop_notifications_enabled),
            "quietHoursEnabled": bool(self.quiet_hours_enabled),
            "quietHoursStart": self.quiet_hours_start,
            "quietHoursEnd": self.quiet_hours_end,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<NotificationPreferences(user_id={self.user_id}, deadline_reminders={self.deadline_reminders_enabled})>"
