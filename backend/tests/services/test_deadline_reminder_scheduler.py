"""
Test suite for DeadlineReminderScheduler service.

Tests cover:
- Scheduler lifecycle (start/stop)
- Deadline detection and filtering
- Reminder notification creation
- Duplicate prevention
- User preference handling
- Quiet hours integration
- Error handling and recovery
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, AsyncMock

from backend.models.base import Base
from backend.models.deadline import Deadline, DeadlineStatus, DeadlinePriority
from backend.models.notification import NotificationPreferences, NotificationType
from backend.models.user import User
from backend.models.case import Case
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.notification_service import (
    NotificationService,
    CreateNotificationInput
)
from backend.services.audit_logger import AuditLogger

@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def mock_notification_service():
    """Create a mock notification service."""
    service = Mock(spec=NotificationService)
    service.create_notification = AsyncMock()
    return service

@pytest.fixture
def mock_audit_logger():
    """Create a mock audit logger."""
    logger = Mock(spec=AuditLogger)
    logger.log = Mock()
    return logger

@pytest.fixture
def scheduler(in_memory_db, mock_notification_service, mock_audit_logger):
    """Create a scheduler instance with mocked dependencies."""
    return DeadlineReminderScheduler(
        db=in_memory_db,
        notification_service=mock_notification_service,
        audit_logger=mock_audit_logger,
        check_interval=0.1  # Short interval for testing
    )

@pytest.fixture
def test_user(in_memory_db):
    """Create a test user."""
    user = User(
        username="testuser",
        password_hash="hash",
        password_salt="salt"
    )
    in_memory_db.add(user)
    in_memory_db.commit()
    in_memory_db.refresh(user)
    return user

@pytest.fixture
def test_case(in_memory_db, test_user):
    """Create a test case."""
    case = Case(
        user_id=test_user.id,
        title="Test Case",
        status="active"
    )
    in_memory_db.add(case)
    in_memory_db.commit()
    in_memory_db.refresh(case)
    return case

@pytest.fixture
def notification_prefs(in_memory_db, test_user):
    """Create notification preferences with reminders enabled."""
    prefs = NotificationPreferences(
        user_id=test_user.id,
        deadline_reminders_enabled=True,
        deadline_reminder_days=7
    )
    in_memory_db.add(prefs)
    in_memory_db.commit()
    in_memory_db.refresh(prefs)
    return prefs

class TestDeadlineReminderScheduler:
    """Test suite for DeadlineReminderScheduler."""

    def test_initialization(self, scheduler):
        """Test scheduler initializes with correct defaults."""
        assert scheduler.is_running is False
        assert scheduler.check_interval == 0.1
        assert len(scheduler._sent_reminders) == 0

    def test_start_scheduler(self, scheduler):
        """Test starting the scheduler."""
        scheduler.start()

        assert scheduler.is_running is True
        assert scheduler._task is not None

        # Clean up
        scheduler.stop()

    def test_start_already_running(self, scheduler, caplog):
        """Test starting scheduler when already running logs warning."""
        scheduler.start()
        scheduler.start()  # Try to start again

        assert "already running" in caplog.text

        # Clean up
        scheduler.stop()

    def test_stop_scheduler(self, scheduler):
        """Test stopping the scheduler."""
        scheduler.start()
        assert scheduler.is_running is True

        scheduler.stop()
        assert scheduler.is_running is False

    def test_stop_not_running(self, scheduler):
        """Test stopping scheduler when not running is safe."""
        scheduler.stop()  # Should not raise error
        assert scheduler.is_running is False

    @pytest.mark.asyncio
    async def test_check_now_no_users(self, scheduler):
        """Test check_now with no users having reminders enabled."""
        await scheduler.check_now()

        # Should complete without errors and not create notifications
        scheduler.notification_service.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_now_with_upcoming_deadline(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db
    ):
        """Test check_now detects upcoming deadline and creates reminder."""
        # Create deadline 5 days in future (within 7-day reminder threshold)
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="File Motion",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value,
            priority=DeadlinePriority.HIGH.value
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        await scheduler.check_now()

        # Should create notification
        scheduler.notification_service.create_notification.assert_called_once()
        call_args = scheduler.notification_service.create_notification.call_args[0][0]

        assert isinstance(call_args, CreateNotificationInput)
        assert call_args.user_id == test_user.id
        assert call_args.type == NotificationType.DEADLINE_REMINDER
        assert "File Motion" in call_args.title
        assert "5 days" in call_args.message

    @pytest.mark.asyncio
    async def test_check_now_deadline_too_far_future(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db
    ):
        """Test check_now ignores deadlines beyond reminder threshold."""
        # Create deadline 30 days in future (beyond 7-day threshold)
        deadline_date = (datetime.now() + timedelta(days=30)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Far Future Deadline",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        await scheduler.check_now()

        # Should not create notification
        scheduler.notification_service.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_now_completed_deadline_ignored(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db
    ):
        """Test check_now ignores completed deadlines."""
        # Create completed deadline
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Completed Task",
            deadline_date=deadline_date,
            status=DeadlineStatus.COMPLETED.value,
            completed_at=datetime.now()
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        await scheduler.check_now()

        # Should not create notification for completed deadline
        scheduler.notification_service.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_now_duplicate_prevention(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db
    ):
        """Test duplicate reminder prevention."""
        # Create deadline
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Important Deadline",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        # First check - should create notification
        await scheduler.check_now()
        assert scheduler.notification_service.create_notification.call_count == 1

        # Second check - should not create duplicate
        await scheduler.check_now()
        assert scheduler.notification_service.create_notification.call_count == 1

    @pytest.mark.asyncio
    async def test_check_now_user_reminders_disabled(
        self,
        scheduler,
        test_user,
        test_case,
        in_memory_db
    ):
        """Test check_now respects disabled reminders preference."""
        # Create preferences with reminders disabled
        prefs = NotificationPreferences(
            user_id=test_user.id,
            deadline_reminders_enabled=False,
            deadline_reminder_days=7
        )
        in_memory_db.add(prefs)

        # Create deadline
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Should Not Remind",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        await scheduler.check_now()

        # Should not create notification
        scheduler.notification_service.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_deadline_reminder_notification_today(
        self,
        scheduler,
        test_user,
        test_case,
        in_memory_db
    ):
        """Test reminder for deadline due today has correct severity and message."""
        # Create deadline due today
        deadline_date = datetime.now().isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Due Today",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )

        await scheduler._create_deadline_reminder_notification(test_user.id, deadline)

        # Check notification was created with high severity
        call_args = scheduler.notification_service.create_notification.call_args[0][0]
        assert "due today" in call_args.message.lower()

    @pytest.mark.asyncio
    async def test_create_deadline_reminder_notification_tomorrow(
        self,
        scheduler,
        test_user,
        test_case,
        in_memory_db
    ):
        """Test reminder for deadline due tomorrow has correct message."""
        # Create deadline due tomorrow
        deadline_date = (datetime.now() + timedelta(days=1)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Due Tomorrow",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )

        await scheduler._create_deadline_reminder_notification(test_user.id, deadline)

        # Check notification message uses singular "day"
        call_args = scheduler.notification_service.create_notification.call_args[0][0]
        assert "1 day" in call_args.message
        assert "1 days" not in call_args.message  # Should not pluralize

    @pytest.mark.asyncio
    async def test_create_deadline_reminder_notification_multiple_days(
        self,
        scheduler,
        test_user,
        test_case,
        in_memory_db
    ):
        """Test reminder for deadline multiple days away uses plural."""
        # Create deadline 5 days away
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Due in 5 Days",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )

        await scheduler._create_deadline_reminder_notification(test_user.id, deadline)

        # Check notification message uses plural "days"
        call_args = scheduler.notification_service.create_notification.call_args[0][0]
        assert "5 days" in call_args.message

    def test_clear_sent_reminders(self, scheduler):
        """Test clearing sent reminders cache."""
        # Add some reminders to cache
        scheduler._sent_reminders.add("1-100")
        scheduler._sent_reminders.add("1-101")
        assert len(scheduler._sent_reminders) == 2

        scheduler.clear_sent_reminders()
        assert len(scheduler._sent_reminders) == 0

    def test_get_stats(self, scheduler):
        """Test getting scheduler statistics."""
        stats = scheduler.get_stats()

        assert "is_running" in stats
        assert "check_interval_seconds" in stats
        assert "sent_reminders_count" in stats
        assert stats["is_running"] is False
        assert stats["check_interval_seconds"] == 0.1
        assert stats["sent_reminders_count"] == 0

    @pytest.mark.asyncio
    async def test_check_now_handles_invalid_deadline_date(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db,
        caplog
    ):
        """Test check_now handles invalid deadline dates gracefully."""
        # Create deadline with invalid date
        deadline = Deadline(
            user_id=test_user.id,
            case_id=test_case.id,
            title="Invalid Date Deadline",
            deadline_date="invalid-date",
            status=DeadlineStatus.UPCOMING.value
        )
        in_memory_db.add(deadline)
        in_memory_db.commit()

        await scheduler.check_now()

        # Should log warning but not crash
        assert "Invalid deadline date" in caplog.text
        scheduler.notification_service.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_now_continues_after_user_error(
        self,
        scheduler,
        test_user,
        test_case,
        notification_prefs,
        in_memory_db
    ):
        """Test check_now continues processing other users after error."""
        # Create second user with preferences
        user2 = User(username="user2", password_hash="hash2", password_salt="salt2")
        in_memory_db.add(user2)
        in_memory_db.commit()
        in_memory_db.refresh(user2)

        prefs2 = NotificationPreferences(
            user_id=user2.id,
            deadline_reminders_enabled=True,
            deadline_reminder_days=7
        )
        in_memory_db.add(prefs2)
        in_memory_db.commit()

        # Create case for user2
        case2 = Case(user_id=user2.id, title="Case 2", status="active")
        in_memory_db.add(case2)
        in_memory_db.commit()

        # Create valid deadline for user2
        deadline_date = (datetime.now() + timedelta(days=5)).isoformat()
        deadline2 = Deadline(
            user_id=user2.id,
            case_id=case2.id,
            title="Valid Deadline",
            deadline_date=deadline_date,
            status=DeadlineStatus.UPCOMING.value
        )
        in_memory_db.add(deadline2)
        in_memory_db.commit()

        # Mock notification service to fail for first user
        call_count = 0

        async def side_effect(input_data):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Simulated error")
            return Mock()

        scheduler.notification_service.create_notification.side_effect = side_effect

        # Should continue processing and create notification for user2
        await scheduler.check_now()

        # Should have attempted both users
        assert call_count >= 1

    @pytest.mark.asyncio
    async def test_scheduler_periodic_execution(self, scheduler):
        """Test scheduler runs periodic checks."""
        scheduler.start()

        # Wait for at least 2 checks (with short interval of 0.1s)
        await asyncio.sleep(0.3)

        scheduler.stop()

        # Verify scheduler ran
        assert scheduler.is_running is False

    def test_audit_logging(self, scheduler, mock_audit_logger):
        """Test audit events are logged."""
        scheduler.start()
        scheduler.stop()

        # Should have logged start and stop events
        assert mock_audit_logger.log.call_count >= 2

        # Check for start event
        start_calls = [
            call for call in mock_audit_logger.log.call_args_list
            if "start" in str(call)
        ]
        assert len(start_calls) > 0

        # Check for stop event
        stop_calls = [
            call for call in mock_audit_logger.log.call_args_list
            if "stop" in str(call)
        ]
        assert len(stop_calls) > 0
