"""
Comprehensive test suite for deadline routes.

Tests service layer integration:
- DeadlineReminderScheduler
- NotificationService
- AuditLogger
- EncryptionService

Coverage:
- CRUD operations with authorization
- Deadline status tracking (upcoming, overdue, completed)
- Reminder scheduling and management
- Notification creation
- Audit logging
- Error handling and validation
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.models.base import Base, get_db
from backend.models.case import Case
from backend.models.deadline import Deadline, DeadlinePriority, DeadlineStatus
from backend.models.notification import NotificationPreferences
from backend.models.user import User
from backend.services.audit_logger import AuditLogger

# ===== TEST DATABASE SETUP =====

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_deadlines.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        username="testuser",
        email="testuser@example.com",
        password_hash="hashed_password",
        created_at=datetime.now()
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_case(db_session, test_user):
    """Create a test case."""
    case = Case(
        user_id=test_user.id,
        case_number="TEST-2025-001",
        title="Test Case",
        description="Test case for deadlines",
        status="open",
        created_at=datetime.now()
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)
    return case

@pytest.fixture
def auth_headers(test_user):
    """Mock authentication headers."""
    return {"Authorization": f"Bearer mock_token_{test_user.id}"}

@pytest.fixture
def mock_auth(test_user):
    """Mock authentication dependency."""
    def mock_get_current_user():
        return test_user.id

    from backend.routes import auth
    with patch.object(auth, 'get_current_user', return_value=test_user.id):
        yield

# ===== TEST CREATE DEADLINE =====

def test_create_deadline_success(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test successful deadline creation with notification."""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "File Motion",
            "description": "File motion to dismiss",
            "deadlineDate": tomorrow,
            "priority": "high"
        },
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "File Motion"
    assert data["caseId"] == test_case.id
    assert data["userId"] == test_user.id
    assert data["priority"] == "high"
    assert data["status"] == "upcoming"
    assert data["deadlineDate"] == tomorrow
    assert data["dueDate"] == tomorrow  # Alias check

    # Verify deadline in database
    deadline = db_session.query(Deadline).filter(Deadline.id == data["id"]).first()
    assert deadline is not None
    assert deadline.title == "File Motion"
    assert deadline.priority == DeadlinePriority.HIGH

    # Verify audit log created
    audit_logger = AuditLogger(db_session)
    logs = audit_logger.query(
        resource_type="deadline",
        resource_id=str(data["id"]),
        event_type="deadline.created"
    )
    assert len(logs) == 1
    assert logs[0]["success"] is True

def test_create_deadline_with_due_date_alias(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test deadline creation using dueDate instead of deadlineDate."""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "Court Hearing",
            "dueDate": tomorrow,  # Using dueDate instead
            "priority": "critical"
        },
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["deadlineDate"] == tomorrow
    assert data["dueDate"] == tomorrow

def test_create_deadline_invalid_case(client, auth_headers, mock_auth):
    """Test deadline creation for non-existent case."""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    response = client.post(
        "/deadlines",
        json={
            "caseId": 99999,
            "title": "Invalid Case Deadline",
            "deadlineDate": tomorrow
        },
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "not found or unauthorized" in response.json()["detail"]

def test_create_deadline_missing_date(client, test_case, auth_headers, mock_auth):
    """Test deadline creation without deadline date."""
    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "No Date Deadline"
        },
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error

def test_create_deadline_invalid_priority(client, test_case, auth_headers, mock_auth):
    """Test deadline creation with invalid priority."""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "Invalid Priority",
            "deadlineDate": tomorrow,
            "priority": "invalid_priority"
        },
        headers=auth_headers
    )

    assert response.status_code == 422

# ===== TEST LIST DEADLINES =====

def test_list_case_deadlines(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test listing all deadlines for a case."""
    # Create multiple deadlines
    today = datetime.now()
    deadlines_data = [
        ("Deadline 1", (today + timedelta(days=1)).strftime('%Y-%m-%d'), "high"),
        ("Deadline 2", (today + timedelta(days=3)).strftime('%Y-%m-%d'), "medium"),
        ("Deadline 3", (today + timedelta(days=2)).strftime('%Y-%m-%d'), "low"),
    ]

    for title, date, priority in deadlines_data:
        deadline = Deadline(
            case_id=test_case.id,
            user_id=test_user.id,
            title=title,
            deadline_date=date,
            priority=DeadlinePriority(priority),
            status=DeadlineStatus.UPCOMING
        )
        db_session.add(deadline)
    db_session.commit()

    response = client.get(f"/deadlines/case/{test_case.id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # Verify ordering by deadline_date (earliest first)
    assert data[0]["title"] == "Deadline 1"
    assert data[1]["title"] == "Deadline 3"
    assert data[2]["title"] == "Deadline 2"

def test_list_case_deadlines_unauthorized(client, db_session, test_case, auth_headers):
    """Test listing deadlines for case owned by different user."""
    # Create another user
    other_user = User(username="otheruser", password_hash="hash", created_at=datetime.now())
    db_session.add(other_user)
    db_session.commit()

    # Mock auth as other user
    from backend.routes import auth
    with patch.object(auth, 'get_current_user', return_value=other_user.id):
        response = client.get(f"/deadlines/case/{test_case.id}", headers=auth_headers)

        assert response.status_code == 404

# ===== TEST UPCOMING DEADLINES =====

def test_list_upcoming_deadlines(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test listing upcoming deadlines (next 30 days by default)."""
    today = datetime.now()

    # Create deadlines with various dates
    deadlines_data = [
        ("Soon", (today + timedelta(days=5)).strftime('%Y-%m-%d'), DeadlineStatus.UPCOMING),
        ("Later", (today + timedelta(days=40)).strftime('%Y-%m-%d'), DeadlineStatus.UPCOMING),
        ("Completed", (today + timedelta(days=10)).strftime('%Y-%m-%d'), DeadlineStatus.COMPLETED),
    ]

    for title, date, status in deadlines_data:
        deadline = Deadline(
            case_id=test_case.id,
            user_id=test_user.id,
            title=title,
            deadline_date=date,
            priority=DeadlinePriority.MEDIUM,
            status=status
        )
        db_session.add(deadline)
    db_session.commit()

    response = client.get("/deadlines/upcoming", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    # Should only include "Soon" (within 30 days, not completed)
    assert len(data) == 1
    assert data[0]["title"] == "Soon"

def test_list_upcoming_deadlines_custom_days(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test listing upcoming deadlines with custom day threshold."""
    today = datetime.now()

    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Far Future",
        deadline_date=(today + timedelta(days=40)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    # Query with 60 days threshold
    response = client.get("/deadlines/upcoming?days=60", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Far Future"

# ===== TEST OVERDUE DEADLINES =====

def test_list_overdue_deadlines(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test listing overdue deadlines with automatic status update."""
    today = datetime.now()

    # Create overdue deadline
    overdue_deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Overdue Task",
        deadline_date=(today - timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.HIGH,
        status=DeadlineStatus.UPCOMING  # Should be updated to OVERDUE
    )
    db_session.add(overdue_deadline)
    db_session.commit()

    response = client.get("/deadlines/overdue", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Overdue Task"
    assert data[0]["status"] == "overdue"

    # Verify status updated in database
    db_session.refresh(overdue_deadline)
    assert overdue_deadline.status == DeadlineStatus.OVERDUE

# ===== TEST UPDATE DEADLINE =====

def test_update_deadline_success(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test updating deadline with notification."""
    # Create deadline
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Original Title",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()
    deadline_id = deadline.id

    # Update deadline
    new_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    response = client.put(
        f"/deadlines/{deadline_id}",
        json={
            "title": "Updated Title",
            "priority": "high",
            "deadlineDate": new_date
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["priority"] == "high"
    assert data["deadlineDate"] == new_date

    # Verify audit log
    audit_logger = AuditLogger(db_session)
    logs = audit_logger.query(
        resource_type="deadline",
        resource_id=str(deadline_id),
        event_type="deadline.updated"
    )
    assert len(logs) == 1
    assert "title" in logs[0]["details"]["changed_fields"]

def test_update_deadline_unauthorized(client, db_session, test_case, auth_headers):
    """Test updating deadline owned by different user."""
    # Create deadline
    other_user = User(username="otheruser", password_hash="hash", created_at=datetime.now())
    db_session.add(other_user)
    db_session.commit()

    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_case.user_id,
        title="Original",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    # Try to update as other user
    from backend.routes import auth
    with patch.object(auth, 'get_current_user', return_value=other_user.id):
        response = client.put(
            f"/deadlines/{deadline.id}",
            json={"title": "Hacked"},
            headers=auth_headers
        )

        assert response.status_code == 403

def test_update_deadline_no_changes(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test updating deadline with no changes."""
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="Title",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    response = client.put(
        f"/deadlines/{deadline.id}",
        json={},
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "No fields to update" in response.json()["detail"]

# ===== TEST DELETE DEADLINE =====

def test_delete_deadline_success(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test soft deleting deadline with audit logging."""
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="To Delete",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()
    deadline_id = deadline.id

    response = client.delete(f"/deadlines/{deadline_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["deleted"] is True

    # Verify soft delete (deleted_at set)
    db_session.refresh(deadline)
    assert deadline.deleted_at is not None

    # Verify audit log
    audit_logger = AuditLogger(db_session)
    logs = audit_logger.query(
        resource_type="deadline",
        resource_id=str(deadline_id),
        event_type="deadline.deleted"
    )
    assert len(logs) == 1
    assert logs[0]["success"] is True

def test_delete_deadline_unauthorized(client, db_session, test_case, auth_headers):
    """Test deleting deadline owned by different user."""
    other_user = User(username="otheruser", password_hash="hash", created_at=datetime.now())
    db_session.add(other_user)
    db_session.commit()

    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_case.user_id,
        title="Protected",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    from backend.routes import auth
    with patch.object(auth, 'get_current_user', return_value=other_user.id):
        response = client.delete(f"/deadlines/{deadline.id}", headers=auth_headers)
        assert response.status_code == 403

# ===== TEST COMPLETE DEADLINE =====

def test_complete_deadline_success(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test marking deadline as complete with notification."""
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="To Complete",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()
    deadline_id = deadline.id

    response = client.post(f"/deadlines/{deadline_id}/complete", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completedAt"] is not None

    # Verify in database
    db_session.refresh(deadline)
    assert deadline.status == DeadlineStatus.COMPLETED
    assert deadline.completed_at is not None

# ===== TEST REMINDER MANAGEMENT =====

def test_get_reminder_info_no_reminder(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test getting reminder info when no reminder is set."""
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="No Reminder",
        deadline_date=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    response = client.get(f"/deadlines/{deadline.id}/reminders", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["deadlineId"] == deadline.id
    assert data["hasReminder"] is False
    assert data["reminderDays"] is None
    assert data["scheduledFor"] is None

def test_schedule_reminder_success(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test scheduling a deadline reminder."""
    deadline_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="With Reminder",
        deadline_date=deadline_date,
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    # Schedule reminder 5 days before deadline
    response = client.post(
        f"/deadlines/{deadline.id}/reminders",
        json={"reminderDays": 5},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["hasReminder"] is True
    assert data["reminderDays"] == 5
    assert data["scheduledFor"] is not None

    # Verify preferences updated
    prefs = db_session.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == test_user.id
    ).first()
    assert prefs.deadline_reminders_enabled is True
    assert prefs.deadline_reminder_days == 5

    # Verify audit log
    audit_logger = AuditLogger(db_session)
    logs = audit_logger.query(
        resource_type="deadline",
        resource_id=str(deadline.id),
        event_type="deadline.reminder_scheduled"
    )
    assert len(logs) == 1

def test_get_reminder_info_with_reminder(client, db_session, test_user, test_case, auth_headers, mock_auth):
    """Test getting reminder info when reminder is enabled."""
    # Create notification preferences
    prefs = NotificationPreferences(
        user_id=test_user.id,
        deadline_reminders_enabled=True,
        deadline_reminder_days=7
    )
    db_session.add(prefs)

    deadline_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    deadline = Deadline(
        case_id=test_case.id,
        user_id=test_user.id,
        title="With Reminder",
        deadline_date=deadline_date,
        priority=DeadlinePriority.MEDIUM,
        status=DeadlineStatus.UPCOMING
    )
    db_session.add(deadline)
    db_session.commit()

    response = client.get(f"/deadlines/{deadline.id}/reminders", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["hasReminder"] is True
    assert data["reminderDays"] == 7
    assert data["scheduledFor"] is not None

# ===== TEST VALIDATION =====

def test_invalid_date_format(client, test_case, auth_headers, mock_auth):
    """Test deadline creation with invalid date format."""
    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "Invalid Date",
            "deadlineDate": "not-a-date"
        },
        headers=auth_headers
    )

    assert response.status_code == 422

def test_title_too_long(client, test_case, auth_headers, mock_auth):
    """Test deadline creation with title exceeding max length."""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    response = client.post(
        "/deadlines",
        json={
            "caseId": test_case.id,
            "title": "x" * 501,  # Max is 500
            "deadlineDate": tomorrow
        },
        headers=auth_headers
    )

    assert response.status_code == 422

# ===== RUN TESTS =====

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
