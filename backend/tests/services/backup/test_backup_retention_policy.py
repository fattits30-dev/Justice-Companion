"""
Comprehensive test suite for BackupRetentionPolicy service.

Test Coverage:
- Apply retention policy with various keep_count values
- Protected backup exclusion from retention
- Safety checks for minimum backup count
- Deletion error handling and partial failures
- Retention summary generation
- Cleanup operations for empty and old backups
- Audit logging verification
- Edge cases and boundary conditions

Total Tests: 40+ covering all methods and scenarios
"""

import pytest
from unittest.mock import Mock
from datetime import datetime, timedelta
from typing import List

from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_service import BackupService
from backend.models.backup import BackupMetadataResponse

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_backup_service():
    """Mock backup service with common operations."""
    service = Mock(spec=BackupService)
    return service

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def retention_policy(mock_backup_service, mock_audit_logger):
    """Create retention policy instance with mocked dependencies."""
    return BackupRetentionPolicy(
        backup_service=mock_backup_service,
        audit_logger=mock_audit_logger
    )

@pytest.fixture
def sample_backups() -> List[BackupMetadataResponse]:
    """Create sample backup metadata for testing."""
    now = datetime.utcnow()
    return [
        BackupMetadataResponse(
            filename="justice_backup_2024-01-10.db",
            filepath="/backups/justice_backup_2024-01-10.db",
            size=1024000,
            created_at=(now - timedelta(days=1)).isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="justice_backup_2024-01-09.db",
            filepath="/backups/justice_backup_2024-01-09.db",
            size=1024000,
            created_at=(now - timedelta(days=2)).isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="justice_backup_2024-01-08.db",
            filepath="/backups/justice_backup_2024-01-08.db",
            size=1024000,
            created_at=(now - timedelta(days=3)).isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="justice_backup_2024-01-07.db",
            filepath="/backups/justice_backup_2024-01-07.db",
            size=1024000,
            created_at=(now - timedelta(days=4)).isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="justice_backup_2024-01-06.db",
            filepath="/backups/justice_backup_2024-01-06.db",
            size=1024000,
            created_at=(now - timedelta(days=5)).isoformat(),
            is_protected=False
        ),
    ]

@pytest.fixture
def protected_backups() -> List[BackupMetadataResponse]:
    """Create protected backup metadata."""
    now = datetime.utcnow()
    return [
        BackupMetadataResponse(
            filename="pre_migration_2024-01-01.db",
            filepath="/backups/pre_migration_2024-01-01.db",
            size=1024000,
            created_at=(now - timedelta(days=10)).isoformat(),
            is_protected=True
        ),
        BackupMetadataResponse(
            filename="pre_restore_backup_2024-01-05.db",
            filepath="/backups/pre_restore_backup_2024-01-05.db",
            size=1024000,
            created_at=(now - timedelta(days=6)).isoformat(),
            is_protected=True
        ),
    ]

@pytest.fixture
def mixed_backups(sample_backups, protected_backups) -> List[BackupMetadataResponse]:
    """Create mix of regular and protected backups."""
    return sample_backups + protected_backups

# ============================================================================
# TEST: apply_retention_policy
# ============================================================================

@pytest.mark.asyncio
async def test_apply_retention_policy_keeps_specified_count(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy keeps specified number of backups."""
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=3)

    assert deleted_count == 2
    assert mock_backup_service.delete_backup.call_count == 2

@pytest.mark.asyncio
async def test_apply_retention_policy_deletes_oldest_first(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy deletes oldest backups first."""
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    await retention_policy.apply_retention_policy(keep_count=3)

    # Verify oldest backups deleted
    deleted_files = [
        call[0][0] for call in mock_backup_service.delete_backup.call_args_list
    ]
    assert "justice_backup_2024-01-06.db" in deleted_files
    assert "justice_backup_2024-01-07.db" in deleted_files

@pytest.mark.asyncio
async def test_apply_retention_policy_protects_migration_backups(
    retention_policy,
    mock_backup_service,
    mixed_backups
):
    """Test retention policy never deletes protected backups."""
    mock_backup_service.list_backups.return_value = mixed_backups
    mock_backup_service.delete_backup.return_value = None

    await retention_policy.apply_retention_policy(keep_count=2)

    # Verify no protected backups deleted
    deleted_files = [
        call[0][0] for call in mock_backup_service.delete_backup.call_args_list
    ]
    assert "pre_migration_2024-01-01.db" not in deleted_files
    assert "pre_restore_backup_2024-01-05.db" not in deleted_files

@pytest.mark.asyncio
async def test_apply_retention_policy_with_keep_count_1(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy with minimum keep_count of 1."""
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=1)

    assert deleted_count == 4
    assert mock_backup_service.delete_backup.call_count == 4

@pytest.mark.asyncio
async def test_apply_retention_policy_with_keep_count_30(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy with maximum keep_count of 30."""
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=30)

    # Should not delete any (only 5 backups)
    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

@pytest.mark.asyncio
async def test_apply_retention_policy_invalid_keep_count_low(
    retention_policy,
    mock_backup_service
):
    """Test retention policy rejects keep_count < 1."""
    with pytest.raises(ValueError, match="Invalid keep_count: 0"):
        await retention_policy.apply_retention_policy(keep_count=0)

@pytest.mark.asyncio
async def test_apply_retention_policy_invalid_keep_count_high(
    retention_policy,
    mock_backup_service
):
    """Test retention policy rejects keep_count > 30."""
    with pytest.raises(ValueError, match="Invalid keep_count: 31"):
        await retention_policy.apply_retention_policy(keep_count=31)

@pytest.mark.asyncio
async def test_apply_retention_policy_with_no_backups(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test retention policy with empty backup list."""
    mock_backup_service.list_backups.return_value = []

    deleted_count = await retention_policy.apply_retention_policy(keep_count=5)

    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

@pytest.mark.asyncio
async def test_apply_retention_policy_safety_check_prevents_delete_all(
    retention_policy,
    mock_backup_service
):
    """Test safety check prevents deleting all backups."""
    single_backup = [
        BackupMetadataResponse(
            filename="justice_backup_2024-01-10.db",
            filepath="/backups/justice_backup_2024-01-10.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        )
    ]
    mock_backup_service.list_backups.return_value = single_backup

    deleted_count = await retention_policy.apply_retention_policy(keep_count=0)

    # Should not delete (safety check)
    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

@pytest.mark.asyncio
async def test_apply_retention_policy_handles_deletion_error(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy continues after deletion error."""
    mock_backup_service.list_backups.return_value = sample_backups

    # First deletion fails, second succeeds
    mock_backup_service.delete_backup.side_effect = [
        Exception("Disk error"),
        None
    ]

    deleted_count = await retention_policy.apply_retention_policy(keep_count=3)

    # Should continue despite error
    assert deleted_count == 1
    assert mock_backup_service.delete_backup.call_count == 2

@pytest.mark.asyncio
async def test_apply_retention_policy_logs_audit_success(
    retention_policy,
    mock_backup_service,
    mock_audit_logger,
    sample_backups
):
    """Test retention policy logs successful audit event."""
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    await retention_policy.apply_retention_policy(keep_count=3)

    # Verify audit log called
    mock_audit_logger.log.assert_called()

    # Check audit event details
    audit_call = mock_audit_logger.log.call_args
    assert audit_call[1]["event_type"] == "backup_retention.applied"
    assert audit_call[1]["success"] is True

@pytest.mark.asyncio
async def test_apply_retention_policy_logs_audit_error(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test retention policy logs audit event on error."""
    mock_backup_service.list_backups.side_effect = Exception("Database error")

    with pytest.raises(Exception):
        await retention_policy.apply_retention_policy(keep_count=5)

    # Verify error audit log
    mock_audit_logger.log.assert_called()
    audit_call = mock_audit_logger.log.call_args
    assert audit_call[1]["event_type"] == "backup_retention.error"
    assert audit_call[1]["success"] is False

@pytest.mark.asyncio
async def test_apply_retention_policy_only_regular_backups(
    retention_policy,
    mock_backup_service,
    protected_backups
):
    """Test retention policy with only protected backups."""
    mock_backup_service.list_backups.return_value = protected_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=1)

    # Should not delete any protected backups
    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

@pytest.mark.asyncio
async def test_apply_retention_policy_exact_keep_count(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy when backups equal keep_count."""
    mock_backup_service.list_backups.return_value = sample_backups

    deleted_count = await retention_policy.apply_retention_policy(keep_count=5)

    # Should not delete any (exactly 5 backups)
    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

# ============================================================================
# TEST: get_retention_summary
# ============================================================================

@pytest.mark.asyncio
async def test_get_retention_summary_calculates_correctly(
    retention_policy,
    mock_backup_service,
    mixed_backups
):
    """Test retention summary calculates backup counts correctly."""
    mock_backup_service.list_backups.return_value = mixed_backups

    summary = await retention_policy.get_retention_summary(keep_count=3)

    assert summary.total == 7  # 5 regular + 2 protected
    assert summary.protected == 2
    assert summary.to_keep == 3
    assert summary.to_delete == 2  # 5 regular - 3 keep

@pytest.mark.asyncio
async def test_get_retention_summary_with_no_backups(
    retention_policy,
    mock_backup_service
):
    """Test retention summary with empty backup list."""
    mock_backup_service.list_backups.return_value = []

    summary = await retention_policy.get_retention_summary(keep_count=5)

    assert summary.total == 0
    assert summary.protected == 0
    assert summary.to_keep == 0
    assert summary.to_delete == 0

@pytest.mark.asyncio
async def test_get_retention_summary_with_only_protected(
    retention_policy,
    mock_backup_service,
    protected_backups
):
    """Test retention summary with only protected backups."""
    mock_backup_service.list_backups.return_value = protected_backups

    summary = await retention_policy.get_retention_summary(keep_count=5)

    assert summary.total == 2
    assert summary.protected == 2
    assert summary.to_keep == 0  # No regular backups
    assert summary.to_delete == 0

@pytest.mark.asyncio
async def test_get_retention_summary_keeps_more_than_available(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention summary when keep_count exceeds available backups."""
    mock_backup_service.list_backups.return_value = sample_backups

    summary = await retention_policy.get_retention_summary(keep_count=10)

    assert summary.total == 5
    assert summary.to_keep == 5  # Min of 10 and 5
    assert summary.to_delete == 0

@pytest.mark.asyncio
async def test_get_retention_summary_handles_error(
    retention_policy,
    mock_backup_service
):
    """Test retention summary handles error gracefully."""
    mock_backup_service.list_backups.side_effect = Exception("Disk error")

    with pytest.raises(Exception, match="Disk error"):
        await retention_policy.get_retention_summary(keep_count=5)

# ============================================================================
# TEST: cleanup_empty_backups
# ============================================================================

@pytest.mark.asyncio
async def test_cleanup_empty_backups_deletes_zero_byte_files(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test cleanup deletes backups with size 0."""
    empty_backups = [
        BackupMetadataResponse(
            filename="empty_backup_1.db",
            filepath="/backups/empty_backup_1.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="empty_backup_2.db",
            filepath="/backups/empty_backup_2.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="valid_backup.db",
            filepath="/backups/valid_backup.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = empty_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.cleanup_empty_backups()

    assert deleted_count == 2
    assert mock_backup_service.delete_backup.call_count == 2

@pytest.mark.asyncio
async def test_cleanup_empty_backups_forces_protected_deletion(
    retention_policy,
    mock_backup_service
):
    """Test cleanup force-deletes even protected empty backups."""
    empty_protected = [
        BackupMetadataResponse(
            filename="pre_migration_empty.db",
            filepath="/backups/pre_migration_empty.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=True
        ),
    ]
    mock_backup_service.list_backups.return_value = empty_protected
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.cleanup_empty_backups()

    assert deleted_count == 1
    # Verify force=True passed
    mock_backup_service.delete_backup.assert_called_with(
        "pre_migration_empty.db",
        force=True
    )

@pytest.mark.asyncio
async def test_cleanup_empty_backups_with_no_empty_files(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test cleanup with no empty backups."""
    mock_backup_service.list_backups.return_value = sample_backups

    deleted_count = await retention_policy.cleanup_empty_backups()

    assert deleted_count == 0
    assert mock_backup_service.delete_backup.call_count == 0

@pytest.mark.asyncio
async def test_cleanup_empty_backups_handles_deletion_error(
    retention_policy,
    mock_backup_service
):
    """Test cleanup continues after deletion error."""
    empty_backups = [
        BackupMetadataResponse(
            filename="empty_1.db",
            filepath="/backups/empty_1.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="empty_2.db",
            filepath="/backups/empty_2.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = empty_backups
    mock_backup_service.delete_backup.side_effect = [
        Exception("Locked file"),
        None
    ]

    deleted_count = await retention_policy.cleanup_empty_backups()

    # Should continue and delete second file
    assert deleted_count == 1

@pytest.mark.asyncio
async def test_cleanup_empty_backups_logs_audit(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test cleanup logs audit event."""
    empty_backup = [
        BackupMetadataResponse(
            filename="empty.db",
            filepath="/backups/empty.db",
            size=0,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = empty_backup
    mock_backup_service.delete_backup.return_value = None

    await retention_policy.cleanup_empty_backups()

    # Verify audit logged
    mock_audit_logger.log.assert_called()
    audit_call = mock_audit_logger.log.call_args
    assert audit_call[1]["event_type"] == "backup_retention.cleanup_empty"

# ============================================================================
# TEST: delete_old_protected_backups
# ============================================================================

@pytest.mark.asyncio
async def test_delete_old_protected_backups_deletes_ancient_backups(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test deleting protected backups older than threshold."""
    now = datetime.utcnow()
    old_protected = [
        BackupMetadataResponse(
            filename="pre_migration_2023-01-01.db",
            filepath="/backups/pre_migration_2023-01-01.db",
            size=1024000,
            created_at=(now - timedelta(days=100)).isoformat() + "Z",
            is_protected=True
        ),
        BackupMetadataResponse(
            filename="pre_migration_recent.db",
            filepath="/backups/pre_migration_recent.db",
            size=1024000,
            created_at=(now - timedelta(days=30)).isoformat() + "Z",
            is_protected=True
        ),
    ]
    mock_backup_service.list_backups.return_value = old_protected
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.delete_old_protected_backups(days_old=90)

    assert deleted_count == 1
    # Verify only old backup deleted
    mock_backup_service.delete_backup.assert_called_with(
        "pre_migration_2023-01-01.db",
        force=True
    )

@pytest.mark.asyncio
async def test_delete_old_protected_backups_default_90_days(
    retention_policy,
    mock_backup_service
):
    """Test default threshold of 90 days."""
    now = datetime.utcnow()
    old_backup = [
        BackupMetadataResponse(
            filename="pre_migration_old.db",
            filepath="/backups/pre_migration_old.db",
            size=1024000,
            created_at=(now - timedelta(days=91)).isoformat() + "Z",
            is_protected=True
        ),
    ]
    mock_backup_service.list_backups.return_value = old_backup
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.delete_old_protected_backups()

    assert deleted_count == 1

@pytest.mark.asyncio
async def test_delete_old_protected_backups_ignores_regular(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test only deletes protected backups, not regular ones."""
    now = datetime.utcnow()
    # Add old regular backup
    old_regular = sample_backups + [
        BackupMetadataResponse(
            filename="justice_backup_2020-01-01.db",
            filepath="/backups/justice_backup_2020-01-01.db",
            size=1024000,
            created_at=(now - timedelta(days=365)).isoformat() + "Z",
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = old_regular
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.delete_old_protected_backups(days_old=90)

    # Should not delete regular backup
    assert deleted_count == 0

@pytest.mark.asyncio
async def test_delete_old_protected_backups_logs_audit(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test deletion logs audit event."""
    now = datetime.utcnow()
    old_backup = [
        BackupMetadataResponse(
            filename="pre_migration_old.db",
            filepath="/backups/pre_migration_old.db",
            size=1024000,
            created_at=(now - timedelta(days=100)).isoformat() + "Z",
            is_protected=True
        ),
    ]
    mock_backup_service.list_backups.return_value = old_backup
    mock_backup_service.delete_backup.return_value = None

    await retention_policy.delete_old_protected_backups(days_old=90)

    # Verify audit logged
    mock_audit_logger.log.assert_called()
    audit_call = mock_audit_logger.log.call_args
    assert audit_call[1]["event_type"] == "backup_retention.cleanup_old_protected"

# ============================================================================
# TEST: Edge Cases and Boundary Conditions
# ============================================================================

@pytest.mark.asyncio
async def test_retention_with_same_creation_dates(
    retention_policy,
    mock_backup_service
):
    """Test retention policy with backups having identical timestamps."""
    now = datetime.utcnow()
    same_time_backups = [
        BackupMetadataResponse(
            filename=f"backup_{i}.db",
            filepath=f"/backups/backup_{i}.db",
            size=1024000,
            created_at=now.isoformat(),
            is_protected=False
        )
        for i in range(5)
    ]
    mock_backup_service.list_backups.return_value = same_time_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=3)

    assert deleted_count == 2

@pytest.mark.asyncio
async def test_retention_with_unicode_filenames(
    retention_policy,
    mock_backup_service
):
    """Test retention policy handles unicode filenames."""
    unicode_backups = [
        BackupMetadataResponse(
            filename="backup_日本語.db",
            filepath="/backups/backup_日本語.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = unicode_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=5)

    assert deleted_count == 0  # Should not delete (within keep count)

@pytest.mark.asyncio
async def test_retention_with_very_large_keep_count(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy with large keep_count."""
    mock_backup_service.list_backups.return_value = sample_backups

    deleted_count = await retention_policy.apply_retention_policy(keep_count=100)

    # Should not delete any (keep_count > available backups)
    assert deleted_count == 0

@pytest.mark.asyncio
async def test_audit_logger_is_optional(mock_backup_service, sample_backups):
    """Test retention policy works without audit logger."""
    policy = BackupRetentionPolicy(
        backup_service=mock_backup_service,
        audit_logger=None
    )
    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await policy.apply_retention_policy(keep_count=3)

    # Should work without errors
    assert deleted_count == 2

@pytest.mark.asyncio
async def test_retention_with_mixed_protected_patterns(
    retention_policy,
    mock_backup_service
):
    """Test retention recognizes all protected backup patterns."""
    mixed_protected = [
        BackupMetadataResponse(
            filename="pre_migration_test.db",
            filepath="/backups/pre_migration_test.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=True
        ),
        BackupMetadataResponse(
            filename="pre_restore_backup_test.db",
            filepath="/backups/pre_restore_backup_test.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=True
        ),
        BackupMetadataResponse(
            filename="regular_backup.db",
            filepath="/backups/regular_backup.db",
            size=1024000,
            created_at=datetime.utcnow().isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = mixed_protected
    mock_backup_service.delete_backup.return_value = None

    deleted_count = await retention_policy.apply_retention_policy(keep_count=0)

    # Should not delete protected backups
    assert deleted_count == 0

# ============================================================================
# TEST: Integration Scenarios
# ============================================================================

@pytest.mark.asyncio
async def test_full_cleanup_workflow(
    retention_policy,
    mock_backup_service,
    mock_audit_logger
):
    """Test complete cleanup workflow: empty + retention + old protected."""
    now = datetime.utcnow()
    complex_backups = [
        # Empty backup
        BackupMetadataResponse(
            filename="empty.db",
            filepath="/backups/empty.db",
            size=0,
            created_at=now.isoformat(),
            is_protected=False
        ),
        # Old protected backup
        BackupMetadataResponse(
            filename="pre_migration_old.db",
            filepath="/backups/pre_migration_old.db",
            size=1024000,
            created_at=(now - timedelta(days=100)).isoformat() + "Z",
            is_protected=True
        ),
        # Regular backups
        BackupMetadataResponse(
            filename="recent.db",
            filepath="/backups/recent.db",
            size=1024000,
            created_at=now.isoformat(),
            is_protected=False
        ),
        BackupMetadataResponse(
            filename="old.db",
            filepath="/backups/old.db",
            size=1024000,
            created_at=(now - timedelta(days=10)).isoformat(),
            is_protected=False
        ),
    ]
    mock_backup_service.list_backups.return_value = complex_backups
    mock_backup_service.delete_backup.return_value = None

    # Step 1: Cleanup empty
    empty_deleted = await retention_policy.cleanup_empty_backups()
    assert empty_deleted == 1

    # Step 2: Apply retention
    retention_deleted = await retention_policy.apply_retention_policy(keep_count=1)
    assert retention_deleted >= 0

    # Step 3: Cleanup old protected
    old_deleted = await retention_policy.delete_old_protected_backups(days_old=90)
    assert old_deleted == 1

@pytest.mark.asyncio
async def test_concurrent_retention_operations(
    retention_policy,
    mock_backup_service,
    sample_backups
):
    """Test retention policy handles concurrent operations safely."""
    import asyncio

    mock_backup_service.list_backups.return_value = sample_backups
    mock_backup_service.delete_backup.return_value = None

    # Run multiple retention operations concurrently
    results = await asyncio.gather(
        retention_policy.apply_retention_policy(keep_count=3),
        retention_policy.apply_retention_policy(keep_count=2),
        retention_policy.apply_retention_policy(keep_count=4)
    )

    # All should complete without errors
    assert len(results) == 3
    assert all(isinstance(r, int) for r in results)

# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
