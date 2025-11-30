"""
Comprehensive test suite for notification routes.

Tests cover:
- Authentication and authorization
- CRUD operations for notifications
- Notification preferences management
- Filtering and pagination
- Statistics and counts
- DeadlineReminderScheduler integration
- Service layer integration
- Error handling and edge cases
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from backend.main import app
from backend.models.base import Base, get_db
from backend.models.user import User
from backend.models.notification import Notification, NotificationPreferences, NotificationType, NotificationSeverity
from backend.models.deadline import Deadline, DeadlineStatus

# ===== TEST DATABASE SETUP =====

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_notifications.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db():
    """Create test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client():
    """Create test client."""
    return TestClient(app)

@pytest.fixture(scope="function")
def test_user(db):
    """Create test user with hashed password."""
    import secrets
    from backend.services.auth.service import AuthenticationService

    auth_service = AuthenticationService(db=db)

    # Create user with password
    user = User(
        username="testuser",
        email="test@example.com",
        password_salt="test_salt_value"
    )

    # Hash password using auth service (proper pattern with salt)
    salt = secrets.token_bytes(16)
    password_hash = auth_service._hash_password("testpassword123", salt)
    user.password_hash = password_hash.hex()
    user.password_salt = salt.hex()

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@pytest.fixture(scope="function")
def auth_session(db, test_user):
    """Create authenticated session for test user."""
    from backend.services.auth.service import AuthenticationService

    auth_service = AuthenticationService(db=db)
    session_id = auth_service.create_session(test_user.id)

    return session_id

@pytest.fixture(scope="function")
def test_notification(db, test_user):
    """Create test notification."""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM_INFO.value,
        severity=NotificationSeverity.MEDIUM.value,
        title="Test Notification",
        message="This is a test notification",
        metadata={"testKey": "testValue"}
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification

@pytest.fixture(scope="function")
def test_preferences(db, test_user):
    """Create test notification preferences."""
    prefs = NotificationPreferences(
        user_id=test_user.id,
        deadline_reminders_enabled=True,
        deadline_reminder_days=7,
        case_updates_enabled=True,
        evidence_updates_enabled=True,
        system_alerts_enabled=True,
        sound_enabled=True,
        desktop_notifications_enabled=True,
        quiet_hours_enabled=False,
        quiet_hours_start="22:00",
        quiet_hours_end="08:00"
    )

    db.add(prefs)
    db.commit()
    db.refresh(prefs)

    return prefs

# ===== AUTHENTICATION TESTS =====

def test_list_notifications_requires_auth(client):
    """Test that listing notifications requires authentication."""
    response = client.get("/notifications")
    assert response.status_code == 401
    assert "Session ID required" in response.json()["detail"]

def test_list_notifications_with_invalid_session(client):
    """Test that invalid session is rejected."""
    response = client.get(
        "/notifications",
        headers={"Authorization": "invalid-session-id"}
    )
    assert response.status_code == 401
    assert "Invalid or expired session" in response.json()["detail"]

def test_list_notifications_with_bearer_token(client, auth_session, test_notification):
    """Test authentication with Bearer token format."""
    response = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {auth_session}"}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) >= 1

def test_list_notifications_with_query_param(client, auth_session, test_notification):
    """Test authentication with session_id query parameter."""
    response = client.get(f"/notifications?session_id={auth_session}")
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) >= 1

# ===== NOTIFICATION CRUD TESTS =====

def test_list_notifications_success(client, auth_session, test_notification):
    """Test successful notification listing."""
    response = client.get(
        "/notifications",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) >= 1

    # Verify notification structure
    notif = notifications[0]
    assert "id" in notif
    assert "userId" in notif
    assert "type" in notif
    assert "severity" in notif
    assert "title" in notif
    assert "message" in notif
    assert "isRead" in notif
    assert "isDismissed" in notif
    assert "createdAt" in notif

def test_list_notifications_with_filters(client, auth_session, db, test_user):
    """Test notification listing with filters."""
    # Create notifications with different types and severities
    notifications_data = [
        (NotificationType.DEADLINE_REMINDER, NotificationSeverity.HIGH, False),
        (NotificationType.CASE_STATUS_CHANGE, NotificationSeverity.MEDIUM, True),
        (NotificationType.SYSTEM_ALERT, NotificationSeverity.URGENT, False),
    ]

    for notif_type, severity, is_read in notifications_data:
        notif = Notification(
            user_id=test_user.id,
            type=notif_type.value,
            severity=severity.value,
            title=f"Test {notif_type.value}",
            message="Test message",
            is_read=is_read
        )
        db.add(notif)
    db.commit()

    # Test unread filter
    response = client.get(
        "/notifications?unreadOnly=true",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert all(not n["isRead"] for n in notifications)

    # Test type filter
    response = client.get(
        "/notifications?type=deadline_reminder",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert all(n["type"] == "deadline_reminder" for n in notifications)

    # Test severity filter
    response = client.get(
        "/notifications?severity=urgent",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert all(n["severity"] == "urgent" for n in notifications)

def test_list_notifications_pagination(client, auth_session, db, test_user):
    """Test notification listing with pagination."""
    # Create 10 notifications
    for i in range(10):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM_INFO.value,
            severity=NotificationSeverity.LOW.value,
            title=f"Notification {i}",
            message=f"Message {i}"
        )
        db.add(notif)
    db.commit()

    # Test limit
    response = client.get(
        "/notifications?limit=5",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) == 5

    # Test offset
    response = client.get(
        "/notifications?limit=5&offset=5",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) == 5

def test_get_unread_count(client, auth_session, db, test_user):
    """Test getting unread notification count."""
    # Create 3 unread and 2 read notifications
    for i in range(5):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM_INFO.value,
            severity=NotificationSeverity.LOW.value,
            title=f"Notification {i}",
            message=f"Message {i}",
            is_read=(i >= 3)  # First 3 unread, last 2 read
        )
        db.add(notif)
    db.commit()

    response = client.get(
        "/notifications/unread/count",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3

def test_get_notification_stats(client, auth_session, db, test_user):
    """Test getting notification statistics."""
    # Create notifications with different types and severities
    notifications_data = [
        (NotificationType.DEADLINE_REMINDER, NotificationSeverity.HIGH, False),
        (NotificationType.DEADLINE_REMINDER, NotificationSeverity.URGENT, False),
        (NotificationType.CASE_STATUS_CHANGE, NotificationSeverity.MEDIUM, True),
        (NotificationType.SYSTEM_ALERT, NotificationSeverity.LOW, False),
    ]

    for notif_type, severity, is_read in notifications_data:
        notif = Notification(
            user_id=test_user.id,
            type=notif_type.value,
            severity=severity.value,
            title="Test",
            message="Test",
            is_read=is_read
        )
        db.add(notif)
    db.commit()

    response = client.get(
        "/notifications/stats",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    stats = response.json()

    assert stats["total"] >= 4
    assert stats["unread"] >= 3
    assert stats["urgent"] >= 1
    assert stats["high"] >= 1
    assert stats["medium"] >= 1
    assert stats["low"] >= 1
    assert "byType" in stats
    assert stats["byType"]["deadline_reminder"] >= 2

def test_mark_notification_as_read(client, auth_session, test_notification):
    """Test marking a notification as read."""
    response = client.put(
        f"/notifications/{test_notification.id}/read",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "marked as read" in data["message"]

def test_mark_notification_as_read_unauthorized(client, auth_session, db, test_user):
    """Test that users cannot mark other users' notifications as read."""
    # Create another user
    other_user = User(username="otheruser", email="other@example.com", password_hash="hash", password_salt="test_salt_value")
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    # Create notification for other user
    other_notification = Notification(
        user_id=other_user.id,
        type=NotificationType.SYSTEM_INFO.value,
        severity=NotificationSeverity.LOW.value,
        title="Other's Notification",
        message="This belongs to another user"
    )
    db.add(other_notification)
    db.commit()
    db.refresh(other_notification)

    # Try to mark it as read with test_user's session
    response = client.put(
        f"/notifications/{other_notification.id}/read",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 403

def test_mark_all_notifications_as_read(client, auth_session, db, test_user):
    """Test marking all notifications as read."""
    # Create 5 unread notifications
    for i in range(5):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM_INFO.value,
            severity=NotificationSeverity.LOW.value,
            title=f"Notification {i}",
            message=f"Message {i}",
            is_read=False
        )
        db.add(notif)
    db.commit()

    response = client.put(
        "/notifications/mark-all-read",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 5

def test_delete_notification(client, auth_session, test_notification):
    """Test deleting a notification."""
    response = client.delete(
        f"/notifications/{test_notification.id}",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] is True
    assert data["id"] == test_notification.id

def test_delete_notification_unauthorized(client, auth_session, db, test_user):
    """Test that users cannot delete other users' notifications."""
    # Create another user
    other_user = User(username="otheruser2", email="other2@example.com", password_hash="hash", password_salt="test_salt_value")
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    # Create notification for other user
    other_notification = Notification(
        user_id=other_user.id,
        type=NotificationType.SYSTEM_INFO.value,
        severity=NotificationSeverity.LOW.value,
        title="Other's Notification",
        message="This belongs to another user"
    )
    db.add(other_notification)
    db.commit()
    db.refresh(other_notification)

    # Try to delete it with test_user's session
    response = client.delete(
        f"/notifications/{other_notification.id}",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 403

# ===== NOTIFICATION PREFERENCES TESTS =====

def test_get_notification_preferences_creates_defaults(client, auth_session, db, test_user):
    """Test that getting preferences creates defaults if they don't exist."""
    # Ensure no preferences exist
    db.query(NotificationPreferences).filter_by(user_id=test_user.id).delete()
    db.commit()

    response = client.get(
        "/notifications/preferences",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    prefs = response.json()

    # Verify default values
    assert prefs["userId"] == test_user.id
    assert prefs["deadlineRemindersEnabled"] is True
    assert prefs["deadlineReminderDays"] == 7
    assert prefs["caseUpdatesEnabled"] is True
    assert prefs["evidenceUpdatesEnabled"] is True
    assert prefs["systemAlertsEnabled"] is True
    assert prefs["soundEnabled"] is True
    assert prefs["desktopNotificationsEnabled"] is True
    assert prefs["quietHoursEnabled"] is False
    assert prefs["quietHoursStart"] == "22:00"
    assert prefs["quietHoursEnd"] == "08:00"

def test_get_notification_preferences_existing(client, auth_session, test_preferences):
    """Test getting existing notification preferences."""
    response = client.get(
        "/notifications/preferences",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    prefs = response.json()

    assert prefs["id"] == test_preferences.id
    assert prefs["userId"] == test_preferences.user_id
    assert prefs["deadlineRemindersEnabled"] == test_preferences.deadline_reminders_enabled

def test_update_notification_preferences(client, auth_session, test_preferences):
    """Test updating notification preferences."""
    update_data = {
        "deadlineRemindersEnabled": False,
        "deadlineReminderDays": 14,
        "quietHoursEnabled": True,
        "quietHoursStart": "23:00",
        "quietHoursEnd": "07:00"
    }

    response = client.put(
        "/notifications/preferences",
        headers={"Authorization": auth_session},
        json=update_data
    )
    assert response.status_code == 200
    prefs = response.json()

    assert prefs["deadlineRemindersEnabled"] is False
    assert prefs["deadlineReminderDays"] == 14
    assert prefs["quietHoursEnabled"] is True
    assert prefs["quietHoursStart"] == "23:00"
    assert prefs["quietHoursEnd"] == "07:00"

def test_update_notification_preferences_partial(client, auth_session, test_preferences):
    """Test partial update of notification preferences."""
    update_data = {
        "soundEnabled": False
    }

    response = client.put(
        "/notifications/preferences",
        headers={"Authorization": auth_session},
        json=update_data
    )
    assert response.status_code == 200
    prefs = response.json()

    # Verify only soundEnabled changed
    assert prefs["soundEnabled"] is False
    assert prefs["deadlineRemindersEnabled"] == test_preferences.deadline_reminders_enabled

def test_update_notification_preferences_invalid_time_format(client, auth_session, test_preferences):
    """Test that invalid time format is rejected."""
    update_data = {
        "quietHoursStart": "25:00"  # Invalid hour
    }

    response = client.put(
        "/notifications/preferences",
        headers={"Authorization": auth_session},
        json=update_data
    )
    assert response.status_code == 422  # Validation error

# ===== DEADLINE SCHEDULER TESTS =====

@pytest.mark.asyncio
async def test_deadline_scheduler_integration(client, auth_session, db, test_user, test_preferences):
    """Test deadline scheduler creates notifications for upcoming deadlines."""
    # Create a deadline due in 5 days
    deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
    deadline = Deadline(
        user_id=test_user.id,
        case_id=1,
        title="Test Deadline",
        description="Test deadline description",
        deadline_date=deadline_date,
        status=DeadlineStatus.PENDING.value
    )
    db.add(deadline)
    db.commit()

    # Trigger deadline check
    response = client.post(
        "/notifications/scheduler/check-now",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200

    # Verify notification was created
    notifications = db.query(Notification).filter_by(
        user_id=test_user.id,
        type=NotificationType.DEADLINE_REMINDER.value
    ).all()

    assert len(notifications) >= 1
    notif = notifications[0]
    assert "deadline" in notif.title.lower() or "reminder" in notif.title.lower()

def test_start_deadline_scheduler(client, auth_session):
    """Test starting the deadline scheduler."""
    response = client.post(
        "/notifications/scheduler/start",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "started" in data["message"].lower()

def test_stop_deadline_scheduler(client, auth_session):
    """Test stopping the deadline scheduler."""
    response = client.post(
        "/notifications/scheduler/stop",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "stopped" in data["message"].lower()

def test_get_scheduler_stats(client, auth_session):
    """Test getting scheduler statistics."""
    response = client.get(
        "/notifications/scheduler/stats",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 200
    stats = response.json()

    assert "is_running" in stats
    assert "check_interval_seconds" in stats
    assert "sent_reminders_count" in stats

# ===== ERROR HANDLING TESTS =====

def test_mark_nonexistent_notification_as_read(client, auth_session):
    """Test marking non-existent notification returns 404."""
    response = client.put(
        "/notifications/999999/read",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 404

def test_delete_nonexistent_notification(client, auth_session):
    """Test deleting non-existent notification returns 404."""
    response = client.delete(
        "/notifications/999999",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 404

def test_invalid_filter_type(client, auth_session):
    """Test that invalid filter type is rejected."""
    response = client.get(
        "/notifications?type=invalid_type",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 422  # Validation error

def test_invalid_filter_severity(client, auth_session):
    """Test that invalid filter severity is rejected."""
    response = client.get(
        "/notifications?severity=invalid_severity",
        headers={"Authorization": auth_session}
    )
    assert response.status_code == 422  # Validation error

# ===== SERVICE LAYER INTEGRATION TESTS =====

@pytest.mark.asyncio
async def test_service_layer_audit_logging(db, test_user):
    """Test that service layer operations are audited."""
    from backend.services.audit_logger import AuditLogger
    from backend.services.notification_service import NotificationService, CreateNotificationInput

    audit_logger = AuditLogger(db=db)
    notification_service = NotificationService(db=db, audit_logger=audit_logger)

    # Create notification through service
    input_data = CreateNotificationInput(
        user_id=test_user.id,
        type=NotificationType.SYSTEM_INFO,
        severity=NotificationSeverity.LOW,
        title="Test Audit",
        message="Test audit logging"
    )

    notif = await notification_service.create_notification(input_data)

    # Verify audit log entry was created
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT * FROM audit_logs
        WHERE event_type = 'notification.create'
        AND resource_id = :resource_id
    """), {"resource_id": str(notif.id)})

    audit_entry = result.fetchone()
    assert audit_entry is not None
    assert audit_entry.success == 1

@pytest.mark.asyncio
async def test_service_layer_quiet_hours_enforcement(db, test_user, test_preferences):
    """Test that service layer respects quiet hours."""
    from backend.services.notification_service import NotificationService, CreateNotificationInput, NotificationError

    # Enable quiet hours from 22:00 to 08:00
    test_preferences.quiet_hours_enabled = True
    test_preferences.quiet_hours_start = "00:00"  # Set to cover current time
    test_preferences.quiet_hours_end = "23:59"
    db.commit()

    notification_service = NotificationService(db=db)

    # Try to create notification during quiet hours
    input_data = CreateNotificationInput(
        user_id=test_user.id,
        type=NotificationType.SYSTEM_INFO,
        severity=NotificationSeverity.LOW,
        title="Test Quiet Hours",
        message="This should be blocked"
    )

    with pytest.raises(NotificationError, match="quiet hours"):
        await notification_service.create_notification(input_data)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
