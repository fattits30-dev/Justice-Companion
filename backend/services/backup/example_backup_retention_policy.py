"""
Example usage of BackupRetentionPolicy service.

Demonstrates:
- Basic retention policy application
- Retention summary preview
- Empty backup cleanup
- Old protected backup cleanup
- Integration with FastAPI
- Scheduled cleanup tasks
- Error handling patterns

Run examples:
    python backend/services/backup/example_backup_retention_policy.py
"""

import asyncio
import logging
from datetime import datetime

from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_service import BackupService


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ============================================================================
# EXAMPLE 1: Basic Retention Policy
# ============================================================================


async def example_basic_retention():
    """
    Basic example: Apply retention policy to keep 5 most recent backups.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Basic Retention Policy")
    print("=" * 60)

    # Initialize services
    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    # Apply retention policy
    try:
        deleted_count = await policy.apply_retention_policy(keep_count=5)
        print(f"✅ Retention policy applied successfully")
        print(f"   Deleted {deleted_count} old backups")
        print(f"   Kept 5 most recent backups")

    except ValueError as e:
        print(f"❌ Configuration error: {e}")

    except Exception as e:
        print(f"❌ Failed to apply retention policy: {e}")


# ============================================================================
# EXAMPLE 2: Preview Before Apply
# ============================================================================


async def example_retention_preview():
    """
    Preview what would happen before applying retention policy.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Retention Policy Preview")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    # Get summary first
    try:
        summary = await policy.get_retention_summary(keep_count=5)

        print(f"\n📊 Retention Summary:")
        print(f"   Total backups: {summary.total}")
        print(f"   Protected backups: {summary.protected}")
        print(f"   Backups to keep: {summary.to_keep}")
        print(f"   Backups to delete: {summary.to_delete}")

        # Prompt user before applying
        if summary.to_delete > 0:
            print(f"\n⚠️  Warning: {summary.to_delete} backups will be deleted")
            print("   Proceed with retention policy? (Uncomment below to apply)")

            # Uncomment to actually apply:
            # deleted = await policy.apply_retention_policy(keep_count=5)
            # print(f"✅ Deleted {deleted} backups")
        else:
            print("\n✅ No backups to delete (within retention count)")

    except Exception as e:
        print(f"❌ Failed to get summary: {e}")


# ============================================================================
# EXAMPLE 3: Cleanup Empty Backups
# ============================================================================


async def example_cleanup_empty():
    """
    Remove corrupted or failed backup files (0 bytes).
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Cleanup Empty Backups")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    try:
        deleted_count = await policy.cleanup_empty_backups()

        if deleted_count > 0:
            print(f"✅ Cleaned up {deleted_count} empty/corrupted backups")
        else:
            print("✅ No empty backups found")

    except Exception as e:
        print(f"❌ Failed to cleanup empty backups: {e}")


# ============================================================================
# EXAMPLE 4: Cleanup Old Protected Backups
# ============================================================================


async def example_cleanup_old_protected():
    """
    Remove very old protected backups (migration/restore).
    Use with caution!
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Cleanup Old Protected Backups")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    try:
        # Delete protected backups older than 180 days
        deleted_count = await policy.delete_old_protected_backups(days_old=180)

        if deleted_count > 0:
            print(f"✅ Deleted {deleted_count} old protected backups (>180 days)")
            print("   ⚠️  Note: Protected backups are important for rollback")
        else:
            print("✅ No old protected backups found")

    except Exception as e:
        print(f"❌ Failed to cleanup old protected backups: {e}")


# ============================================================================
# EXAMPLE 5: Complete Cleanup Workflow
# ============================================================================


async def example_complete_cleanup():
    """
    Complete cleanup workflow: empty + retention + old protected.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Complete Cleanup Workflow")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    total_deleted = 0

    try:
        # Step 1: Remove empty backups
        print("\n🔹 Step 1: Cleanup empty backups...")
        empty_deleted = await policy.cleanup_empty_backups()
        total_deleted += empty_deleted
        print(f"   Deleted {empty_deleted} empty backups")

        # Step 2: Apply retention policy
        print("\n🔹 Step 2: Apply retention policy (keep 7)...")
        retention_deleted = await policy.apply_retention_policy(keep_count=7)
        total_deleted += retention_deleted
        print(f"   Deleted {retention_deleted} old backups")

        # Step 3: Cleanup very old protected backups
        print("\n🔹 Step 3: Cleanup old protected backups (>90 days)...")
        old_deleted = await policy.delete_old_protected_backups(days_old=90)
        total_deleted += old_deleted
        print(f"   Deleted {old_deleted} old protected backups")

        print(f"\n✅ Complete cleanup finished")
        print(f"   Total deleted: {total_deleted} backups")

    except Exception as e:
        print(f"❌ Cleanup workflow failed: {e}")


# ============================================================================
# EXAMPLE 6: Scheduled Cleanup Task
# ============================================================================


async def example_scheduled_cleanup():
    """
    Daily scheduled cleanup task (e.g., run at 3 AM).
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Scheduled Cleanup Task")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    print(f"\n🕒 Running daily cleanup at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        # Daily cleanup: empty + retention
        empty_deleted = await policy.cleanup_empty_backups()
        retention_deleted = await policy.apply_retention_policy(keep_count=7)

        print(f"✅ Daily cleanup completed")
        print(f"   Empty backups: {empty_deleted}")
        print(f"   Old backups: {retention_deleted}")
        print(f"   Total: {empty_deleted + retention_deleted}")

    except Exception as e:
        print(f"❌ Daily cleanup failed: {e}")
        # In production, send alert/notification


# ============================================================================
# EXAMPLE 7: Integration with Audit Logger
# ============================================================================


async def example_with_audit_logger():
    """
    Use retention policy with audit logging.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Integration with Audit Logger")
    print("=" * 60)

    from backend.services.audit_logger import AuditLogger

    # Mock database session
    # db = SessionLocal()
    db = None  # Replace with actual DB session

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    # Initialize with audit logger
    audit_logger = AuditLogger(db) if db else None
    policy = BackupRetentionPolicy(backup_service=backup_service, audit_logger=audit_logger)

    try:
        deleted_count = await policy.apply_retention_policy(keep_count=5)
        print(f"✅ Retention applied with audit logging")
        print(f"   Deleted: {deleted_count} backups")
        print(f"   All operations logged to audit trail")

    except Exception as e:
        print(f"❌ Failed: {e}")


# ============================================================================
# EXAMPLE 8: Error Handling Patterns
# ============================================================================


async def example_error_handling():
    """
    Demonstrate proper error handling patterns.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 8: Error Handling Patterns")
    print("=" * 60)

    backup_service = BackupService(db_path="/path/to/justice.db", backups_dir="/path/to/backups")

    policy = BackupRetentionPolicy(backup_service=backup_service)

    # Pattern 1: Validate configuration
    print("\n🔹 Pattern 1: Validate configuration")
    try:
        keep_count = 35  # Invalid (> 30)
        keep_count = max(1, min(30, keep_count))  # Clamp to valid range
        print(f"   Clamped keep_count to: {keep_count}")

        deleted = await policy.apply_retention_policy(keep_count)
        print(f"   ✅ Applied with keep_count={keep_count}")

    except ValueError as e:
        print(f"   ❌ Configuration error: {e}")

    # Pattern 2: Handle missing backups directory
    print("\n🔹 Pattern 2: Handle missing directory")
    try:
        summary = await policy.get_retention_summary(keep_count=5)
        print(f"   ✅ Summary: {summary.total} backups")

    except Exception as e:
        print(f"   ❌ Directory error: {e}")
        print("   💡 Ensure backups directory exists and is readable")

    # Pattern 3: Partial failure handling
    print("\n🔹 Pattern 3: Partial failure handling")
    try:
        # Retention continues even if individual deletions fail
        deleted = await policy.apply_retention_policy(keep_count=3)
        print(f"   ✅ Deleted {deleted} backups (some may have failed)")

    except Exception as e:
        print(f"   ❌ Complete failure: {e}")


# ============================================================================
# EXAMPLE 9: Integration with FastAPI
# ============================================================================


def example_fastapi_integration():
    """
    Example FastAPI routes for backup retention.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 9: FastAPI Integration")
    print("=" * 60)

    print(
        """
FastAPI routes example:

```python
from fastapi import APIRouter, HTTPException, Depends
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_service import BackupService

router = APIRouter(prefix="/api/backups/retention", tags=["backups"])


def get_retention_policy() -> BackupRetentionPolicy:
    '''Dependency: Get retention policy instance.'''
    backup_service = BackupService(db_path="justice.db")
    return BackupRetentionPolicy(backup_service)


@router.post("/apply")
async def apply_retention(
    keep_count: int = 7,
    policy: BackupRetentionPolicy = Depends(get_retention_policy)
):
    '''Apply backup retention policy.'''
    try:
        if not 1 <= keep_count <= 30:
            raise HTTPException(status_code=400, detail="keep_count must be 1-30")

        deleted_count = await policy.apply_retention_policy(keep_count)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "keep_count": keep_count,
            "message": f"Retention policy applied: kept {keep_count} backups"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")


@router.get("/summary")
async def get_retention_summary(
    keep_count: int = 7,
    policy: BackupRetentionPolicy = Depends(get_retention_policy)
):
    '''Get retention policy summary (preview).'''
    try:
        summary = await policy.get_retention_summary(keep_count)

        return {
            "total": summary.total,
            "protected": summary.protected,
            "to_keep": summary.to_keep,
            "to_delete": summary.to_delete,
            "keep_count": keep_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")


@router.post("/cleanup/empty")
async def cleanup_empty_backups(
    policy: BackupRetentionPolicy = Depends(get_retention_policy)
):
    '''Remove empty/corrupted backups.'''
    try:
        deleted_count = await policy.cleanup_empty_backups()

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleaned up {deleted_count} empty backups"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")


@router.post("/cleanup/old-protected")
async def cleanup_old_protected(
    days_old: int = 90,
    policy: BackupRetentionPolicy = Depends(get_retention_policy)
):
    '''Remove old protected backups.'''
    try:
        if days_old < 30:
            raise HTTPException(
                status_code=400,
                detail="days_old must be at least 30 for safety"
            )

        deleted_count = await policy.delete_old_protected_backups(days_old)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "days_old": days_old,
            "message": f"Deleted {deleted_count} old protected backups"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")
```

Usage:
- POST /api/backups/retention/apply?keep_count=7
- GET /api/backups/retention/summary?keep_count=7
- POST /api/backups/retention/cleanup/empty
- POST /api/backups/retention/cleanup/old-protected?days_old=90
"""
    )


# ============================================================================
# EXAMPLE 10: Background Task Scheduler
# ============================================================================


async def example_background_scheduler():
    """
    Example background task for scheduled cleanup.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 10: Background Task Scheduler")
    print("=" * 60)

    print(
        """
Background scheduler example using APScheduler:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_service import BackupService


async def scheduled_backup_cleanup():
    '''Daily backup cleanup task.'''
    logger.info("Starting scheduled backup cleanup")

    backup_service = BackupService(db_path="justice.db")
    policy = BackupRetentionPolicy(backup_service)

    try:
        # Step 1: Remove empty backups
        empty_deleted = await policy.cleanup_empty_backups()
        logger.info(f"Deleted {empty_deleted} empty backups")

        # Step 2: Apply retention (keep 7 backups)
        retention_deleted = await policy.apply_retention_policy(keep_count=7)
        logger.info(f"Deleted {retention_deleted} old backups")

        # Step 3: Cleanup very old protected (quarterly)
        from datetime import datetime
        if datetime.now().day == 1:  # First day of month
            old_deleted = await policy.delete_old_protected_backups(days_old=90)
            logger.info(f"Deleted {old_deleted} old protected backups")

    except Exception as e:
        logger.error(f"Scheduled cleanup failed: {e}")


# Initialize scheduler
scheduler = AsyncIOScheduler()

# Schedule daily at 3 AM
scheduler.add_job(
    scheduled_backup_cleanup,
    trigger='cron',
    hour=3,
    minute=0,
    id='backup_cleanup'
)

scheduler.start()
```
"""
    )


# ============================================================================
# MAIN: Run All Examples
# ============================================================================


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("BACKUP RETENTION POLICY - USAGE EXAMPLES")
    print("=" * 60)
    print("\nNote: These examples use placeholder paths.")
    print("Replace '/path/to/justice.db' with actual database path.\n")

    # Run examples (uncomment to execute)
    # await example_basic_retention()
    # await example_retention_preview()
    # await example_cleanup_empty()
    # await example_cleanup_old_protected()
    # await example_complete_cleanup()
    # await example_scheduled_cleanup()
    # await example_with_audit_logger()
    # await example_error_handling()

    # Print examples that show code snippets
    example_fastapi_integration()
    await example_background_scheduler()

    print("\n" + "=" * 60)
    print("✅ All examples completed")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
