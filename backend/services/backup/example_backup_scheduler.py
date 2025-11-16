"""
Example usage of BackupScheduler service.

This script demonstrates:
1. Initializing the backup scheduler
2. Configuring user backup settings
3. Starting the scheduler
4. Manual backup operations
5. Retention policy management
6. Monitoring and statistics
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.backup import (
    BackupSettings,
    BackupSettingsUpdate,
    BackupFrequency
)
from backend.services.backup import (
    BackupScheduler,
    BackupService,
    BackupRetentionPolicy
)
from backend.services.audit_logger import AuditLogger


# ============================================================================
# Configuration
# ============================================================================

# Database configuration
DB_PATH = "/path/to/justice.db"
BACKUPS_DIR = "/path/to/backups"
DATABASE_URL = "sqlite:///justice.db"


# ============================================================================
# Setup
# ============================================================================

def setup_database():
    """Initialize database connection."""
    engine = create_engine(
        DATABASE_URL,
        connect_args={"timeout": 30}
    )

    # Create tables if not exist
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    return Session()


def setup_services(db_session):
    """Initialize all backup services."""
    # Create backup service for file operations
    backup_service = BackupService(
        db_path=DB_PATH,
        backups_dir=BACKUPS_DIR
    )

    # Create audit logger (optional)
    audit_logger = AuditLogger(db_session)

    # Create retention policy service
    retention_policy = BackupRetentionPolicy(
        backup_service=backup_service,
        audit_logger=audit_logger
    )

    # Get singleton scheduler instance
    scheduler = BackupScheduler.get_instance(
        db=db_session,
        backup_service=backup_service,
        retention_policy=retention_policy,
        audit_logger=audit_logger
    )

    return backup_service, retention_policy, scheduler


# ============================================================================
# Example 1: Basic Setup
# ============================================================================

async def example_basic_setup():
    """Example: Initialize and start scheduler."""
    print("\n=== Example 1: Basic Setup ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Start scheduler
    print("Starting backup scheduler...")
    await scheduler.start()

    # Check stats
    stats = scheduler.get_stats()
    print(f"Scheduler running: {stats['is_running']}")
    print(f"Check interval: {stats['check_interval_seconds']}s")
    print(f"Enabled settings: {stats['enabled_backup_settings']}")

    # Let it run for a few seconds
    await asyncio.sleep(5)

    # Stop scheduler
    print("\nStopping backup scheduler...")
    await scheduler.stop()

    print("Scheduler stopped.")


# ============================================================================
# Example 2: Configure User Backup Settings
# ============================================================================

async def example_configure_settings():
    """Example: Configure backup settings for a user."""
    print("\n=== Example 2: Configure User Backup Settings ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    user_id = 1

    # Create new backup settings
    print(f"Creating backup settings for user {user_id}...")
    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(
            enabled=True,
            frequency=BackupFrequency.DAILY,
            backup_time="03:00",  # 3 AM
            keep_count=7  # Keep 7 most recent backups
        )
    )

    print(f"Settings created:")
    print(f"  - Enabled: {settings.enabled}")
    print(f"  - Frequency: {settings.frequency}")
    print(f"  - Backup time: {settings.backup_time}")
    print(f"  - Keep count: {settings.keep_count}")
    print(f"  - Next backup: {settings.next_backup_at}")

    # Update existing settings
    print(f"\nUpdating backup settings for user {user_id}...")
    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(
            frequency=BackupFrequency.WEEKLY,
            keep_count=14
        )
    )

    print(f"Settings updated:")
    print(f"  - Frequency: {settings.frequency}")
    print(f"  - Keep count: {settings.keep_count}")

    # Retrieve settings
    print(f"\nRetrieving backup settings for user {user_id}...")
    settings = scheduler.get_backup_settings(user_id)

    if settings:
        print(f"Current settings:")
        print(f"  - Enabled: {settings.enabled}")
        print(f"  - Frequency: {settings.frequency}")
        print(f"  - Backup time: {settings.backup_time}")
        print(f"  - Keep count: {settings.keep_count}")
        print(f"  - Last backup: {settings.last_backup_at}")
        print(f"  - Next backup: {settings.next_backup_at}")
    else:
        print("No settings found.")


# ============================================================================
# Example 3: Manual Backup Operations
# ============================================================================

async def example_manual_backups():
    """Example: Create and manage backups manually."""
    print("\n=== Example 3: Manual Backup Operations ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Create manual backup
    print("Creating manual backup...")
    backup = backup_service.create_backup(custom_filename="manual_backup_example")

    print(f"Backup created:")
    print(f"  - Filename: {backup.filename}")
    print(f"  - Size: {backup.size} bytes")
    print(f"  - Created: {backup.created_at}")
    print(f"  - Protected: {backup.is_protected}")

    # Create timestamped backup
    print("\nCreating timestamped backup...")
    backup = backup_service.create_backup()

    print(f"Backup created:")
    print(f"  - Filename: {backup.filename}")

    # List all backups
    print("\nListing all backups...")
    backups = backup_service.list_backups()

    print(f"Found {len(backups)} backups:")
    for backup in backups[:5]:  # Show first 5
        print(f"  - {backup.filename} ({backup.size} bytes) - {backup.created_at}")
        print(f"    Protected: {backup.is_protected}")

    # Get backup by filename
    print("\nGetting specific backup...")
    backup = backup_service.get_backup_by_filename("manual_backup_example.db")

    if backup:
        print(f"Found backup: {backup.filename}")
    else:
        print("Backup not found.")

    # Get backups directory size
    total_size = backup_service.get_backups_dir_size()
    print(f"\nTotal backups size: {total_size} bytes ({total_size / 1024 / 1024:.2f} MB)")

    # Get database size
    db_size = backup_service.get_database_size()
    print(f"Database size: {db_size} bytes ({db_size / 1024 / 1024:.2f} MB)")


# ============================================================================
# Example 4: Retention Policy Management
# ============================================================================

async def example_retention_policy():
    """Example: Manage backup retention policies."""
    print("\n=== Example 4: Retention Policy Management ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Get retention summary
    print("Getting retention summary (keep_count=7)...")
    summary = await retention_policy.get_retention_summary(keep_count=7)

    print(f"Retention summary:")
    print(f"  - Total backups: {summary.total}")
    print(f"  - Protected backups: {summary.protected}")
    print(f"  - Backups to keep: {summary.to_keep}")
    print(f"  - Backups to delete: {summary.to_delete}")

    # Apply retention policy
    if summary.to_delete > 0:
        print(f"\nApplying retention policy (keep_count=7)...")
        deleted_count = await retention_policy.apply_retention_policy(keep_count=7)

        print(f"Deleted {deleted_count} old backups.")
    else:
        print("\nNo backups to delete (within retention limit).")

    # Cleanup empty backups
    print("\nCleaning up empty backups (0 bytes)...")
    deleted_count = await retention_policy.cleanup_empty_backups()

    print(f"Deleted {deleted_count} empty backups.")


# ============================================================================
# Example 5: Scheduled Backups in Action
# ============================================================================

async def example_scheduled_backups():
    """Example: Run scheduled backups."""
    print("\n=== Example 5: Scheduled Backups in Action ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    user_id = 1

    # Configure backup to run immediately (past time)
    print(f"Configuring immediate backup for user {user_id}...")
    past_time = (datetime.utcnow() - timedelta(hours=1)).strftime("%H:%M")

    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(
            enabled=True,
            frequency=BackupFrequency.DAILY,
            backup_time=past_time,
            keep_count=5
        )
    )

    print(f"Settings configured:")
    print(f"  - Next backup: {settings.next_backup_at}")

    # Manually trigger check
    print("\nTriggering backup check...")
    await scheduler.check_and_run_backups()

    # Verify backup was created
    db_session.refresh(settings)
    print(f"\nBackup completed:")
    print(f"  - Last backup: {settings.last_backup_at}")
    print(f"  - Next backup: {settings.next_backup_at}")

    # List recent backups
    backups = backup_service.list_backups()
    auto_backups = [b for b in backups if "auto_backup" in b.filename]

    print(f"\nAuto backups created: {len(auto_backups)}")
    for backup in auto_backups[:3]:
        print(f"  - {backup.filename} ({backup.size} bytes)")


# ============================================================================
# Example 6: Enable/Disable Backups
# ============================================================================

async def example_enable_disable():
    """Example: Enable and disable backups."""
    print("\n=== Example 6: Enable/Disable Backups ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    user_id = 1

    # Disable backups
    print(f"Disabling backups for user {user_id}...")
    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(enabled=False)
    )

    print(f"Backups disabled:")
    print(f"  - Enabled: {settings.enabled}")
    print(f"  - Next backup: {settings.next_backup_at}")  # Should be None

    # Enable backups
    print(f"\nEnabling backups for user {user_id}...")
    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(enabled=True)
    )

    print(f"Backups enabled:")
    print(f"  - Enabled: {settings.enabled}")
    print(f"  - Next backup: {settings.next_backup_at}")  # Should be calculated


# ============================================================================
# Example 7: Monitoring and Statistics
# ============================================================================

async def example_monitoring():
    """Example: Monitor scheduler and get statistics."""
    print("\n=== Example 7: Monitoring and Statistics ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Start scheduler
    await scheduler.start()

    # Get stats
    print("Scheduler statistics:")
    stats = scheduler.get_stats()

    print(f"  - Running: {stats['is_running']}")
    print(f"  - Check interval: {stats['check_interval_seconds']}s")
    print(f"  - Enabled settings: {stats['enabled_backup_settings']}")
    print(f"  - Total settings: {stats['total_backup_settings']}")

    # Monitor for a period
    print("\nMonitoring scheduler for 10 seconds...")
    for i in range(10):
        await asyncio.sleep(1)
        print(f"  {i + 1}s elapsed...")

    # Get updated stats
    print("\nUpdated statistics:")
    stats = scheduler.get_stats()
    print(f"  - Still running: {stats['is_running']}")

    # Stop scheduler
    await scheduler.stop()
    print("\nScheduler stopped.")


# ============================================================================
# Example 8: Error Handling
# ============================================================================

async def example_error_handling():
    """Example: Handle errors gracefully."""
    print("\n=== Example 8: Error Handling ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Try to get settings for non-existent user
    print("Getting settings for non-existent user...")
    settings = scheduler.get_backup_settings(user_id=99999)

    if settings is None:
        print("No settings found (expected).")

    # Try to apply retention with invalid keep_count
    print("\nApplying retention with invalid keep_count...")
    try:
        await retention_policy.apply_retention_policy(keep_count=50)  # Max is 30
    except ValueError as error:
        print(f"Error caught: {error}")

    # Try to delete non-existent backup
    print("\nDeleting non-existent backup...")
    try:
        backup_service.delete_backup("non_existent_backup.db")
    except IOError as error:
        print(f"Error caught: {error}")

    print("\nError handling successful.")


# ============================================================================
# Example 9: Advanced Retention
# ============================================================================

async def example_advanced_retention():
    """Example: Advanced retention operations."""
    print("\n=== Example 9: Advanced Retention Operations ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    # Create protected backup (pre-migration)
    print("Creating protected backup...")
    backup = backup_service.create_pre_migration_backup()

    print(f"Protected backup created:")
    print(f"  - Filename: {backup.filename}")
    print(f"  - Protected: {backup.is_protected}")

    # Try to delete protected backup (should fail)
    print("\nTrying to delete protected backup...")
    try:
        backup_service.delete_backup(backup.filename)
    except PermissionError as error:
        print(f"Deletion prevented: {error}")

    # Force delete protected backup
    print("\nForce deleting protected backup...")
    backup_service.delete_backup(backup.filename, force=True)
    print("Protected backup force deleted.")

    # Delete old protected backups (90+ days)
    print("\nDeleting old protected backups (90+ days)...")
    deleted_count = await retention_policy.delete_old_protected_backups(days_old=90)

    print(f"Deleted {deleted_count} old protected backups.")


# ============================================================================
# Example 10: Complete Workflow
# ============================================================================

async def example_complete_workflow():
    """Example: Complete backup workflow from start to finish."""
    print("\n=== Example 10: Complete Backup Workflow ===\n")

    db_session = setup_database()
    backup_service, retention_policy, scheduler = setup_services(db_session)

    user_id = 1

    # Step 1: Configure backup settings
    print("Step 1: Configuring backup settings...")
    settings = scheduler.update_backup_settings(
        user_id=user_id,
        input_data=BackupSettingsUpdate(
            enabled=True,
            frequency=BackupFrequency.DAILY,
            backup_time="03:00",
            keep_count=7
        )
    )
    print(f"  ✓ Settings configured for user {user_id}")

    # Step 2: Start scheduler
    print("\nStep 2: Starting scheduler...")
    await scheduler.start()
    print("  ✓ Scheduler started")

    # Step 3: Monitor stats
    print("\nStep 3: Monitoring scheduler...")
    stats = scheduler.get_stats()
    print(f"  ✓ Scheduler running: {stats['is_running']}")
    print(f"  ✓ Enabled settings: {stats['enabled_backup_settings']}")

    # Step 4: Create manual backup
    print("\nStep 4: Creating manual backup...")
    backup = backup_service.create_backup("workflow_example")
    print(f"  ✓ Backup created: {backup.filename}")

    # Step 5: Apply retention
    print("\nStep 5: Applying retention policy...")
    summary = await retention_policy.get_retention_summary(keep_count=7)
    print(f"  ✓ Total backups: {summary.total}")
    print(f"  ✓ To delete: {summary.to_delete}")

    if summary.to_delete > 0:
        deleted = await retention_policy.apply_retention_policy(keep_count=7)
        print(f"  ✓ Deleted {deleted} old backups")

    # Step 6: Verify backup
    print("\nStep 6: Verifying backup...")
    backup_check = backup_service.get_backup_by_filename(backup.filename)
    if backup_check:
        print(f"  ✓ Backup verified: {backup_check.filename}")

    # Step 7: Stop scheduler
    print("\nStep 7: Stopping scheduler...")
    await scheduler.stop()
    print("  ✓ Scheduler stopped")

    print("\n✓ Complete workflow finished successfully!")


# ============================================================================
# Main
# ============================================================================

async def main():
    """Run all examples."""
    examples = [
        ("Basic Setup", example_basic_setup),
        ("Configure Settings", example_configure_settings),
        ("Manual Backups", example_manual_backups),
        ("Retention Policy", example_retention_policy),
        ("Scheduled Backups", example_scheduled_backups),
        ("Enable/Disable", example_enable_disable),
        ("Monitoring", example_monitoring),
        ("Error Handling", example_error_handling),
        ("Advanced Retention", example_advanced_retention),
        ("Complete Workflow", example_complete_workflow),
    ]

    print("=" * 70)
    print("BackupScheduler Examples")
    print("=" * 70)

    for i, (name, example_func) in enumerate(examples, 1):
        print(f"\n[{i}/{len(examples)}] Running: {name}")
        try:
            await example_func()
        except Exception as error:
            print(f"ERROR in {name}: {error}")

        # Wait between examples
        await asyncio.sleep(1)

    print("\n" + "=" * 70)
    print("All examples completed!")
    print("=" * 70)


if __name__ == "__main__":
    # Run all examples
    asyncio.run(main())

    # Or run individual example:
    # asyncio.run(example_basic_setup())
    # asyncio.run(example_configure_settings())
    # asyncio.run(example_manual_backups())
    # etc.
