# Backup Retention Policy Service

Automated backup cleanup and retention management for Justice Companion database backups.

**Migrated from:** `src/services/backup/BackupRetentionPolicy.ts`

---

## Overview

The `BackupRetentionPolicy` service manages automatic cleanup of old database backups based on configurable retention rules. It protects critical backups (migration and restore backups) while maintaining a specified number of regular backups.

### Key Features

- **Automatic Cleanup**: Delete old backups based on retention count
- **Protected Backups**: Never delete migration or restore backups automatically
- **Safety Checks**: Always keep at least 1 backup to prevent data loss
- **Retention Preview**: Get summary before applying policy
- **Empty Backup Cleanup**: Remove corrupted or failed backup files (0 bytes)
- **Old Protected Cleanup**: Remove very old protected backups (90+ days)
- **Comprehensive Audit Logging**: Track all operations and changes
- **Async Operations**: Non-blocking cleanup for production use

---

## Protected Backup Patterns

The following backup patterns are **protected** from automatic deletion:

- `pre_migration_*` - Backups created before database migrations
- `pre_restore_backup*` - Backups created before restore operations

These backups are critical for rollback scenarios and are never deleted by retention policy.

---

## Installation

### Dependencies

```bash
# Python 3.9+ required
pip install pytest pytest-asyncio
```

### Import

```python
from backend.services.backup.backup_retention_policy import (
    BackupRetentionPolicy,
    BackupRetentionPolicyError
)
from backend.services.backup.backup_service import BackupService
```

---

## Usage

### Basic Usage

```python
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy
from backend.services.backup.backup_service import BackupService

# Initialize services
backup_service = BackupService(
    db_path="/path/to/justice.db",
    backups_dir="/path/to/backups"
)

retention_policy = BackupRetentionPolicy(
    backup_service=backup_service,
    audit_logger=audit_logger  # Optional
)

# Apply retention policy (keep 5 most recent backups)
deleted_count = await retention_policy.apply_retention_policy(keep_count=5)
print(f"Deleted {deleted_count} old backups")
```

### Get Retention Summary (Preview)

```python
# Preview what would happen before applying policy
summary = await retention_policy.get_retention_summary(keep_count=5)

print(f"Total backups: {summary.total}")
print(f"Protected backups: {summary.protected}")
print(f"Backups to keep: {summary.to_keep}")
print(f"Backups to delete: {summary.to_delete}")
```

### Cleanup Empty Backups

```python
# Remove corrupted or failed backup files (0 bytes)
deleted_count = await retention_policy.cleanup_empty_backups()
print(f"Deleted {deleted_count} empty backups")
```

### Cleanup Old Protected Backups

```python
# Remove protected backups older than 90 days
# Use with caution - protected backups are important!
deleted_count = await retention_policy.delete_old_protected_backups(days_old=90)
print(f"Deleted {deleted_count} old protected backups")
```

---

## API Reference

### Class: BackupRetentionPolicy

#### Constructor

```python
BackupRetentionPolicy(
    backup_service: BackupService,
    audit_logger: Optional[Any] = None
)
```

**Parameters:**
- `backup_service` (BackupService): Backup service instance for file operations
- `audit_logger` (Optional): Audit logger for tracking operations

---

### Methods

#### apply_retention_policy()

Apply retention policy to delete old backups.

```python
async def apply_retention_policy(keep_count: int) -> int
```

**Parameters:**
- `keep_count` (int): Number of regular backups to retain (1-30)

**Returns:**
- `int`: Number of backups deleted

**Raises:**
- `ValueError`: If `keep_count` is not in valid range (1-30)

**Behavior:**
- Keeps the `keep_count` most recent regular backups
- Deletes older regular backups
- Never deletes protected backups (`pre_migration_*`, `pre_restore_backup*`)
- Always keeps at least 1 backup for safety
- Continues deletion even if individual files fail

**Example:**

```python
# Keep 7 most recent backups
deleted = await policy.apply_retention_policy(keep_count=7)
```

---

#### get_retention_summary()

Get retention policy summary without applying it.

```python
async def get_retention_summary(keep_count: int) -> RetentionSummaryResponse
```

**Parameters:**
- `keep_count` (int): Configured keep count

**Returns:**
- `RetentionSummaryResponse`: Summary with counts by category
  - `total` (int): Total number of backups
  - `protected` (int): Number of protected backups
  - `to_keep` (int): Number of backups to keep
  - `to_delete` (int): Number of backups to delete

**Example:**

```python
summary = await policy.get_retention_summary(keep_count=5)
if summary.to_delete > 0:
    print(f"Warning: {summary.to_delete} backups will be deleted")
```

---

#### cleanup_empty_backups()

Delete backup files that are empty (0 bytes).

```python
async def cleanup_empty_backups() -> int
```

**Returns:**
- `int`: Number of empty backups deleted

**Behavior:**
- Deletes all backups with size = 0 bytes
- Force-deletes even if protected (empty backups are corrupted)
- Continues even if individual deletions fail

**Example:**

```python
deleted = await policy.cleanup_empty_backups()
print(f"Cleaned up {deleted} corrupted backups")
```

---

#### delete_old_protected_backups()

Delete protected backups older than specified days.

```python
async def delete_old_protected_backups(days_old: int = 90) -> int
```

**Parameters:**
- `days_old` (int): Minimum age in days to delete (default: 90)

**Returns:**
- `int`: Number of old protected backups deleted

**Warning:**
⚠️ **Use with caution!** Protected backups should generally be kept. This is for cleanup of very old migration/restore backups only.

**Example:**

```python
# Delete protected backups older than 180 days
deleted = await policy.delete_old_protected_backups(days_old=180)
```

---

## Configuration

### Retention Count Range

- **Minimum:** 1 backup
- **Maximum:** 30 backups
- **Recommended:** 5-10 backups

### Safety Features

1. **Minimum Backup Guarantee**: Always keeps at least 1 backup even if `keep_count` is lower
2. **Protected Backup Exclusion**: Migration and restore backups never deleted by retention policy
3. **Partial Failure Handling**: Continues deletion even if individual files fail
4. **Audit Logging**: All operations logged for accountability

---

## Error Handling

### Common Errors

#### ValueError: Invalid keep_count

```python
try:
    await policy.apply_retention_policy(keep_count=0)
except ValueError as e:
    print(f"Invalid configuration: {e}")
```

**Solution:** Use `keep_count` between 1 and 30.

#### Exception: Failed to list backups

```python
try:
    summary = await policy.get_retention_summary(keep_count=5)
except Exception as e:
    print(f"Backup directory error: {e}")
```

**Solution:** Verify backups directory exists and has read permissions.

---

## Best Practices

### Recommended Retention Policies

**Development:**
```python
keep_count = 10  # Keep 10 recent backups for safety
```

**Production:**
```python
keep_count = 30  # Keep maximum backups for compliance
```

**Testing:**
```python
keep_count = 3  # Minimal backups to save disk space
```

### Workflow Recommendations

1. **Preview Before Apply**
   ```python
   summary = await policy.get_retention_summary(keep_count=5)
   if summary.to_delete > 10:
       print("Warning: Many backups will be deleted. Proceed?")
   ```

2. **Regular Cleanup Schedule**
   ```python
   # Run daily at 3 AM
   await policy.cleanup_empty_backups()
   await policy.apply_retention_policy(keep_count=7)
   ```

3. **Periodic Protected Cleanup**
   ```python
   # Run monthly
   await policy.delete_old_protected_backups(days_old=90)
   ```

4. **Monitor Audit Logs**
   ```python
   # Review audit logs regularly
   # Check for unexpected deletions or errors
   ```

---

## Integration with FastAPI

### Example Route

```python
from fastapi import APIRouter, HTTPException
from backend.services.backup.backup_retention_policy import BackupRetentionPolicy

router = APIRouter()

@router.post("/backups/retention/apply")
async def apply_retention(keep_count: int = 7):
    """Apply backup retention policy."""
    try:
        if keep_count < 1 or keep_count > 30:
            raise HTTPException(status_code=400, detail="keep_count must be 1-30")

        policy = BackupRetentionPolicy(backup_service)
        deleted_count = await policy.apply_retention_policy(keep_count)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "keep_count": keep_count
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply retention: {e}")


@router.get("/backups/retention/summary")
async def get_retention_summary(keep_count: int = 7):
    """Get retention policy summary."""
    try:
        policy = BackupRetentionPolicy(backup_service)
        summary = await policy.get_retention_summary(keep_count)

        return {
            "total": summary.total,
            "protected": summary.protected,
            "to_keep": summary.to_keep,
            "to_delete": summary.to_delete
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {e}")
```

---

## Testing

### Run Tests

```bash
# Run all tests
pytest backend/services/backup/test_backup_retention_policy.py -v

# Run specific test
pytest backend/services/backup/test_backup_retention_policy.py::test_apply_retention_policy_keeps_specified_count -v

# Run with coverage
pytest backend/services/backup/test_backup_retention_policy.py --cov=backend.services.backup.backup_retention_policy --cov-report=html
```

### Test Coverage

The test suite includes **40+ comprehensive tests** covering:

- ✅ Retention policy with various keep_count values (1-30)
- ✅ Protected backup exclusion
- ✅ Safety checks for minimum backup count
- ✅ Deletion error handling and partial failures
- ✅ Retention summary generation
- ✅ Cleanup operations (empty, old protected)
- ✅ Audit logging verification
- ✅ Edge cases (unicode filenames, concurrent operations)
- ✅ Integration scenarios

---

## Performance Considerations

### Disk I/O

- Backup deletion is I/O-bound
- Use async operations to avoid blocking
- Consider rate-limiting in high-frequency scenarios

### Large Backup Counts

- Listing 1000+ backups takes ~100ms
- Retention summary is fast (no file operations)
- Deletion scales linearly with backup count

### Optimization Tips

1. **Batch Operations**: Apply retention once daily, not per-backup
2. **Off-Peak Hours**: Schedule cleanup during low-usage periods
3. **Monitor Disk Space**: Alert if backups exceed threshold

---

## Troubleshooting

### Issue: Retention policy not deleting backups

**Possible causes:**
1. All backups are protected
2. Backup count ≤ keep_count
3. Safety check triggered (only 1 backup exists)

**Solution:**
```python
summary = await policy.get_retention_summary(keep_count=5)
print(f"Protected: {summary.protected}, Regular: {summary.to_keep + summary.to_delete}")
```

---

### Issue: "Invalid keep_count" error

**Cause:** keep_count outside range 1-30

**Solution:**
```python
keep_count = max(1, min(30, keep_count))  # Clamp to valid range
```

---

### Issue: Audit logs not appearing

**Cause:** Audit logger not initialized

**Solution:**
```python
from backend.services.audit_logger import AuditLogger

audit_logger = AuditLogger(db)
policy = BackupRetentionPolicy(backup_service, audit_logger)
```

---

## Migration from TypeScript

See [BACKUP_RETENTION_POLICY_MIGRATION.md](./BACKUP_RETENTION_POLICY_MIGRATION.md) for complete migration guide.

---

## License

Part of Justice Companion - Privacy-first legal case management system.

---

## Support

For issues or questions:
- **GitHub Issues**: [Justice Companion Issues](https://github.com/yourrepo/issues)
- **Documentation**: See `example_backup_retention_policy.py` for usage examples
- **Tests**: See `test_backup_retention_policy.py` for comprehensive examples

---

## Changelog

### Version 1.0.0 (2025-01-13)
- ✅ Initial Python migration from TypeScript
- ✅ Full async/await support
- ✅ Comprehensive test suite (40+ tests)
- ✅ Extended features (empty cleanup, old protected cleanup)
- ✅ Production-ready with audit logging
