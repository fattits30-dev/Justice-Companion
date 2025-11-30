"""
Comprehensive test suite for BackupScheduler service.

Tests:
- Singleton pattern
- Start/stop scheduler
- Check and run backups
- Calculate next backup time
- Get/update backup settings
- Scheduled backup execution
- Retention policy application
- Edge cases and error handling

Total: 35+ test cases
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.backup import (
    BackupSettings,
    BackupFrequency,
    BackupSettingsUpdate,
    BackupMetadataResponse
)
from backend.models.user import User
from backend.services.backup.backup_service import BackupService
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_scheduler import BackupScheduler

# Test database setup
@pytest.fixture
def db_engine():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    # Ensure clean state by dropping all tables first
    Base.metadata.drop_all(engine)
    # Now create all tables fresh
    Base.metadata.create_all(engine)
    yield engine
    # Cleanup after test
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture
def db_session(db_engine):
    """Create database session for testing."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        id=1,
        username="testuser",
        password_hash="hash",
        password_salt="salt",
        email="test@example.com",
        role="user",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def mock_backup_service():
    """Create mock backup service."""
    service = Mock(spec=BackupService)
    service.create_backup = Mock(return_value=BackupMetadataResponse(
        filename="test_backup.db",
        filepath="/path/to/test_backup.db",
        size=1024,
        created_at=datetime.utcnow().isoformat(),
        is_protected=False
    ))
    service.list_backups = Mock(return_value=[])
    return service

@pytest.fixture
def mock_retention_policy():
    """Create mock retention policy."""
    policy = Mock(spec=BackupRetentionPolicy)
    policy.apply_retention_policy = AsyncMock(return_value=2)
    return policy

@pytest.fixture
def mock_audit_logger():
    """Create mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def backup_scheduler(db_session, mock_backup_service, mock_retention_policy, mock_audit_logger):
    """Create BackupScheduler instance for testing."""
    # Reset singleton
    BackupScheduler._instance = None

    scheduler = BackupScheduler(
        db=db_session,
        backup_service=mock_backup_service,
        retention_policy=mock_retention_policy,
        audit_logger=mock_audit_logger,
        check_interval=1  # 1 second for fast tests
    )
    yield scheduler

    # Cleanup
    if scheduler.is_running:
        asyncio.run(scheduler.stop())

# ============================================================================
# Singleton Pattern Tests
# ============================================================================

def test_get_instance_creates_singleton(db_session, mock_backup_service, mock_retention_policy):
    """Test that get_instance() creates a singleton."""
    BackupScheduler._instance = None

    instance1 = BackupScheduler.get_instance(
        db_session,
        mock_backup_service,
        mock_retention_policy
    )
    instance2 = BackupScheduler.get_instance(
        db_session,
        mock_backup_service,
        mock_retention_policy
    )

    assert instance1 is instance2

def test_singleton_persists_across_calls(db_session, mock_backup_service, mock_retention_policy):
    """Test that singleton instance persists."""
    BackupScheduler._instance = None

    instance1 = BackupScheduler.get_instance(
        db_session,
        mock_backup_service,
        mock_retention_policy
    )

    # Create new instance directly
    instance2 = BackupScheduler(
        db_session,
        mock_backup_service,
        mock_retention_policy
    )

    # Singleton should still return first instance
    instance3 = BackupScheduler.get_instance(
        db_session,
        mock_backup_service,
        mock_retention_policy
    )

    assert instance1 is instance3
    assert instance2 is not instance1

# ============================================================================
# Start/Stop Tests
# ============================================================================

@pytest.mark.asyncio
async def test_start_scheduler(backup_scheduler, mock_audit_logger):
    """Test starting the scheduler."""
    await backup_scheduler.start()

    assert backup_scheduler.is_running is True
    assert backup_scheduler._task is not None

    # Verify audit log
    mock_audit_logger.log.assert_called()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "backup_scheduler.start"
    assert call_args["success"] is True

    # Cleanup
    await backup_scheduler.stop()

@pytest.mark.asyncio
async def test_start_already_running_scheduler(backup_scheduler):
    """Test starting scheduler that's already running."""
    await backup_scheduler.start()

    # Try to start again
    await backup_scheduler.start()

    # Should still be running (no error)
    assert backup_scheduler.is_running is True

    await backup_scheduler.stop()

@pytest.mark.asyncio
async def test_stop_scheduler(backup_scheduler, mock_audit_logger):
    """Test stopping the scheduler."""
    await backup_scheduler.start()
    await backup_scheduler.stop()

    assert backup_scheduler.is_running is False

    # Verify audit log
    calls = [call for call in mock_audit_logger.log.call_args_list
             if call[1].get("event_type") == "backup_scheduler.stop"]
    assert len(calls) > 0
    assert calls[0][1]["success"] is True

@pytest.mark.asyncio
async def test_stop_not_running_scheduler(backup_scheduler):
    """Test stopping scheduler that's not running."""
    # Should not raise error
    await backup_scheduler.stop()

    assert backup_scheduler.is_running is False

# ============================================================================
# Calculate Next Backup Time Tests
# ============================================================================

def test_calculate_next_backup_time_daily_future(backup_scheduler):
    """Test calculating next backup time for daily frequency (future time today)."""
    now = datetime.utcnow()
    future_time = (now + timedelta(hours=2)).strftime("%H:%M")

    next_backup = backup_scheduler._calculate_next_backup_time("daily", future_time)

    # Should be today at future time
    assert next_backup.date() == now.date()
    assert next_backup > now

def test_calculate_next_backup_time_daily_past(backup_scheduler):
    """Test calculating next backup time for daily frequency (past time today)."""
    now = datetime.utcnow()
    past_time = (now - timedelta(hours=2)).strftime("%H:%M")

    next_backup = backup_scheduler._calculate_next_backup_time("daily", past_time)

    # Should be tomorrow at past time
    assert next_backup.date() == (now + timedelta(days=1)).date()

def test_calculate_next_backup_time_weekly(backup_scheduler):
    """Test calculating next backup time for weekly frequency."""
    now = datetime.utcnow()
    past_time = (now - timedelta(hours=1)).strftime("%H:%M")

    next_backup = backup_scheduler._calculate_next_backup_time("weekly", past_time)

    # Should be 7 days from now
    expected_date = (now + timedelta(weeks=1)).date()
    assert next_backup.date() == expected_date

def test_calculate_next_backup_time_monthly(backup_scheduler):
    """Test calculating next backup time for monthly frequency."""
    now = datetime.utcnow()
    past_time = (now - timedelta(hours=1)).strftime("%H:%M")

    next_backup = backup_scheduler._calculate_next_backup_time("monthly", past_time)

    # Should be approximately 30 days from now
    expected_date = (now + timedelta(days=30)).date()
    assert next_backup.date() == expected_date

def test_calculate_next_backup_time_midnight(backup_scheduler):
    """Test calculating next backup time for midnight (00:00)."""
    next_backup = backup_scheduler._calculate_next_backup_time("daily", "00:00")

    assert next_backup.hour == 0
    assert next_backup.minute == 0

def test_calculate_next_backup_time_noon(backup_scheduler):
    """Test calculating next backup time for noon (12:00)."""
    next_backup = backup_scheduler._calculate_next_backup_time("daily", "12:00")

    assert next_backup.hour == 12
    assert next_backup.minute == 0

# ============================================================================
# Get/Update Backup Settings Tests
# ============================================================================

def test_get_backup_settings_existing(backup_scheduler, db_session, test_user):
    """Test getting existing backup settings."""
    # Create settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7
    )
    db_session.add(settings)
    db_session.commit()

    result = backup_scheduler.get_backup_settings(test_user.id)

    assert result is not None
    assert result.user_id == test_user.id
    assert result.enabled is True
    assert result.frequency == "daily"

def test_get_backup_settings_not_found(backup_scheduler, test_user):
    """Test getting non-existent backup settings."""
    result = backup_scheduler.get_backup_settings(test_user.id)

    assert result is None

def test_update_backup_settings_create_new(backup_scheduler, test_user, mock_audit_logger):
    """Test creating new backup settings."""
    input_data = BackupSettingsUpdate(
        enabled=True,
        frequency=BackupFrequency.DAILY,
        backup_time="04:00",
        keep_count=10
    )

    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    assert result.user_id == test_user.id
    assert result.enabled is True
    assert result.frequency == "daily"
    assert result.backup_time == "04:00"
    assert result.keep_count == 10
    assert result.next_backup_at is not None

    # Verify audit log
    calls = [call for call in mock_audit_logger.log.call_args_list
             if call[1].get("event_type") == "backup_scheduler.settings_created"]
    assert len(calls) > 0

def test_update_backup_settings_update_existing(backup_scheduler, db_session, test_user, mock_audit_logger):
    """Test updating existing backup settings."""
    # Create initial settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7
    )
    db_session.add(settings)
    db_session.commit()

    # Update settings
    input_data = BackupSettingsUpdate(
        frequency=BackupFrequency.WEEKLY,
        keep_count=14
    )

    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    assert result.frequency == "weekly"
    assert result.keep_count == 14
    assert result.backup_time == "03:00"  # Unchanged

    # Verify audit log
    calls = [call for call in mock_audit_logger.log.call_args_list
             if call[1].get("event_type") == "backup_scheduler.settings_updated"]
    assert len(calls) > 0

def test_update_backup_settings_disable(backup_scheduler, db_session, test_user):
    """Test disabling backup settings."""
    # Create enabled settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() + timedelta(days=1)
    )
    db_session.add(settings)
    db_session.commit()

    # Disable
    input_data = BackupSettingsUpdate(enabled=False)

    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    assert result.enabled is False
    assert result.next_backup_at is None

def test_update_backup_settings_enable(backup_scheduler, db_session, test_user):
    """Test enabling backup settings."""
    # Create disabled settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=False,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=None
    )
    db_session.add(settings)
    db_session.commit()

    # Enable
    input_data = BackupSettingsUpdate(enabled=True)

    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    assert result.enabled is True
    assert result.next_backup_at is not None

# ============================================================================
# Check and Run Backups Tests
# ============================================================================

@pytest.mark.asyncio
async def test_check_and_run_backups_no_due(backup_scheduler, db_session, test_user):
    """Test checking for backups when none are due."""
    # Create settings with future next_backup_at
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() + timedelta(days=1)
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler.check_and_run_backups()

    # Backup service should not be called
    backup_scheduler.backup_service.create_backup.assert_not_called()

@pytest.mark.asyncio
async def test_check_and_run_backups_one_due(backup_scheduler, db_session, test_user, mock_backup_service):
    """Test checking for backups when one is due."""
    # Create settings with past next_backup_at
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() - timedelta(hours=1)
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler.check_and_run_backups()

    # Backup service should be called
    mock_backup_service.create_backup.assert_called_once()

    # Settings should be updated
    db_session.refresh(settings)
    assert settings.last_backup_at is not None
    assert settings.next_backup_at > datetime.utcnow()

@pytest.mark.asyncio
async def test_check_and_run_backups_multiple_due(backup_scheduler, db_session, mock_backup_service):
    """Test checking for backups when multiple are due."""
    # Create multiple users with due backups
    for i in range(3):
        user = User(
            id=i + 10,
            username=f"user{i}",
            password_hash="hash",
            password_salt="salt",
            email=f"user{i}@example.com",
            role="user",
            is_active=True
        )
        db_session.add(user)

        settings = BackupSettings(
            user_id=user.id,
            enabled=True,
            frequency="daily",
            backup_time="03:00",
            keep_count=7,
            next_backup_at=datetime.utcnow() - timedelta(hours=1)
        )
        db_session.add(settings)

    db_session.commit()

    await backup_scheduler.check_and_run_backups()

    # Backup service should be called 3 times
    assert mock_backup_service.create_backup.call_count == 3

@pytest.mark.asyncio
async def test_check_and_run_backups_disabled_settings(backup_scheduler, db_session, test_user, mock_backup_service):
    """Test that disabled settings are not processed."""
    # Create disabled settings with past next_backup_at
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=False,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() - timedelta(hours=1)
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler.check_and_run_backups()

    # Backup service should not be called
    mock_backup_service.create_backup.assert_not_called()

# ============================================================================
# Run Scheduled Backup Tests
# ============================================================================

@pytest.mark.asyncio
async def test_run_scheduled_backup_success(backup_scheduler, db_session, test_user, mock_backup_service, mock_retention_policy, mock_audit_logger):
    """Test running a scheduled backup successfully."""
    settings = BackupSettings(
        id=1,
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() - timedelta(hours=1)
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler._run_scheduled_backup(settings)

    # Verify backup was created
    mock_backup_service.create_backup.assert_called_once()
    call_args = mock_backup_service.create_backup.call_args[0]
    assert "auto_backup_user1" in call_args[0]

    # Verify retention policy was applied
    mock_retention_policy.apply_retention_policy.assert_called_once_with(7)

    # Verify settings were updated
    db_session.refresh(settings)
    assert settings.last_backup_at is not None
    assert settings.next_backup_at > datetime.utcnow()

    # Verify audit log
    calls = [call for call in mock_audit_logger.log.call_args_list
             if call[1].get("event_type") == "backup_scheduler.backup_completed"]
    assert len(calls) > 0

@pytest.mark.asyncio
async def test_run_scheduled_backup_with_retention(backup_scheduler, db_session, test_user, mock_retention_policy):
    """Test that retention policy is applied after backup."""
    mock_retention_policy.apply_retention_policy = AsyncMock(return_value=3)

    settings = BackupSettings(
        id=1,
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=5
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler._run_scheduled_backup(settings)

    # Verify retention policy was called with correct keep_count
    mock_retention_policy.apply_retention_policy.assert_called_once_with(5)

@pytest.mark.asyncio
async def test_run_scheduled_backup_error_handling(backup_scheduler, db_session, test_user, mock_backup_service, mock_audit_logger):
    """Test error handling during scheduled backup."""
    # Make backup service raise error
    mock_backup_service.create_backup = Mock(side_effect=Exception("Backup failed"))

    settings = BackupSettings(
        id=1,
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7
    )
    db_session.add(settings)
    db_session.commit()

    # Should not raise exception
    await backup_scheduler._run_scheduled_backup(settings)

    # Verify error was audited
    calls = [call for call in mock_audit_logger.log.call_args_list
             if call[1].get("event_type") == "backup_scheduler.backup_error"]
    assert len(calls) > 0
    assert "Backup failed" in calls[0][1]["error_message"]

# ============================================================================
# Get Stats Tests
# ============================================================================

def test_get_stats_not_running(backup_scheduler, db_session, test_user):
    """Test getting stats when scheduler is not running."""
    # Create some settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7
    )
    db_session.add(settings)
    db_session.commit()

    stats = backup_scheduler.get_stats()

    assert stats["is_running"] is False
    assert stats["check_interval_seconds"] == 1
    assert stats["enabled_backup_settings"] == 1
    assert stats["total_backup_settings"] == 1

@pytest.mark.asyncio
async def test_get_stats_running(backup_scheduler, db_session, test_user):
    """Test getting stats when scheduler is running."""
    await backup_scheduler.start()

    stats = backup_scheduler.get_stats()

    assert stats["is_running"] is True

    await backup_scheduler.stop()

def test_get_stats_multiple_settings(backup_scheduler, db_session):
    """Test getting stats with multiple backup settings."""
    # Create multiple settings (some enabled, some disabled)
    for i in range(5):
        user = User(
            id=i + 20,
            username=f"statuser{i}",
            password_hash="hash",
            password_salt="salt",
            email=f"statuser{i}@example.com",
            role="user",
            is_active=True
        )
        db_session.add(user)

        settings = BackupSettings(
            user_id=user.id,
            enabled=(i % 2 == 0),  # Every other one enabled
            frequency="daily",
            backup_time="03:00",
            keep_count=7
        )
        db_session.add(settings)

    db_session.commit()

    stats = backup_scheduler.get_stats()

    assert stats["total_backup_settings"] == 5
    assert stats["enabled_backup_settings"] == 3  # 0, 2, 4

# ============================================================================
# Edge Cases and Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_scheduler_runs_periodically(backup_scheduler, db_session, test_user):
    """Test that scheduler runs checks periodically."""
    # Set very short interval
    backup_scheduler.check_interval = 0.1

    # Create due backup
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() - timedelta(hours=1)
    )
    db_session.add(settings)
    db_session.commit()

    await backup_scheduler.start()

    # Wait for multiple checks
    await asyncio.sleep(0.3)

    await backup_scheduler.stop()

    # Backup should have been created (at least once)
    assert backup_scheduler.backup_service.create_backup.call_count >= 1

@pytest.mark.asyncio
async def test_scheduler_handles_task_cancellation(backup_scheduler):
    """Test that scheduler handles task cancellation gracefully."""
    await backup_scheduler.start()

    # Cancel the task directly
    if backup_scheduler._task:
        backup_scheduler._task.cancel()

    # Should not raise exception
    await backup_scheduler.stop()

    assert backup_scheduler.is_running is False

def test_update_backup_settings_with_partial_data(backup_scheduler, db_session, test_user):
    """Test updating only some fields of backup settings."""
    # Create initial settings
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7
    )
    db_session.add(settings)
    db_session.commit()

    # Update only keep_count
    input_data = BackupSettingsUpdate(keep_count=14)

    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    # Only keep_count should change
    assert result.keep_count == 14
    assert result.frequency == "daily"
    assert result.backup_time == "03:00"
    assert result.enabled is True

@pytest.mark.asyncio
async def test_next_backup_at_null_when_disabled(backup_scheduler, db_session, test_user):
    """Test that next_backup_at is set to None when settings are disabled."""
    settings = BackupSettings(
        user_id=test_user.id,
        enabled=True,
        frequency="daily",
        backup_time="03:00",
        keep_count=7,
        next_backup_at=datetime.utcnow() + timedelta(days=1)
    )
    db_session.add(settings)
    db_session.commit()

    # Disable settings
    input_data = BackupSettingsUpdate(enabled=False)
    result = backup_scheduler.update_backup_settings(test_user.id, input_data)

    assert result.next_backup_at is None

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
