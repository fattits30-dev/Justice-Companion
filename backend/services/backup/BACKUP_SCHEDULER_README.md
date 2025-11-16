# Backup Scheduler Service

## Overview

The Backup Scheduler is a comprehensive automated backup system for Justice Companion. It provides scheduled database backups with configurable frequency, retention policies, and per-user settings.

**Migrated from:** `src/services/backup/BackupScheduler.ts`

## Features

### Core Capabilities
- **Automated Scheduling**: Runs backups at configured times (daily, weekly, monthly)
- **Singleton Pattern**: Ensures only one scheduler instance runs at a time
- **Missed Backup Recovery**: Runs any missed backups on startup
- **Retention Policy**: Automatically deletes old backups based on keep_count
- **Per-User Configuration**: Each user can have custom backup preferences
- **Protected Backups**: Migration and restore backups never deleted by retention policy
- **Comprehensive Audit Logging**: All operations tracked for compliance

### Service Architecture

The backup system consists of three main services:

1. **BackupService** (`backup_service.py`)
   - Low-level file operations (create, restore, list, delete)
   - Backup metadata extraction
   - Protected backup identification

2. **BackupRetentionPolicy** (`backup_retention_policy.py`)
   - Automatic cleanup of old backups
   - Protection for critical backups
   - Retention summary reporting

3. **BackupScheduler** (`backup_scheduler.py`)
   - Scheduled backup execution
   - Per-user backup settings management
   - Background service orchestration

## Installation

### Dependencies

```bash
# Core dependencies (already in project)
pip install sqlalchemy asyncio pydantic fastapi
```

### Database Migration

The backup system requires the `backup_settings` table:

```sql
CREATE TABLE backup_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    backup_time VARCHAR(5) NOT NULL DEFAULT '03:00',
    keep_count INTEGER NOT NULL DEFAULT 7,
    last_backup_at DATETIME,
    next_backup_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    CHECK (keep_count >= 1 AND keep_count <= 30),
    CHECK (frequency IN ('daily', 'weekly', 'monthly'))
);
```

## Usage

### Basic Setup

```python
from sqlalchemy.orm import Session
from backend.services.backup import BackupScheduler, BackupService, BackupRetentionPolicy
from backend.services.audit_logger import AuditLogger

# Initialize services
db_path = "/path/to/justice.db"
backups_dir = "/path/to/backups"

backup_service = BackupService(db_path=db_path, backups_dir=backups_dir)
retention_policy = BackupRetentionPolicy(backup_service=backup_service, audit_logger=audit_logger)

# Get singleton scheduler instance
scheduler = BackupScheduler.get_instance(
    db=db_session,
    backup_service=backup_service,
    retention_policy=retention_policy,
    audit_logger=audit_logger
)

# Start scheduler
await scheduler.start()

# Scheduler now runs in background, checking every 60 seconds

# Stop scheduler (on application shutdown)
await scheduler.stop()
```

### Configure User Backup Settings

```python
from backend.models.backup import BackupSettingsUpdate, BackupFrequency

# Create or update backup settings for a user
settings = scheduler.update_backup_settings(
    user_id=1,
    input_data=BackupSettingsUpdate(
        enabled=True,
        frequency=BackupFrequency.DAILY,
        backup_time="03:00",  # 3 AM
        keep_count=7  # Keep 7 most recent backups
    )
)

print(f"Next backup scheduled for: {settings.next_backup_at}")
```

### Get User Backup Settings

```python
# Retrieve current settings
settings = scheduler.get_backup_settings(user_id=1)

if settings:
    print(f"Enabled: {settings.enabled}")
    print(f"Frequency: {settings.frequency}")
    print(f"Backup time: {settings.backup_time}")
    print(f"Keep count: {settings.keep_count}")
    print(f"Last backup: {settings.last_backup_at}")
    print(f"Next backup: {settings.next_backup_at}")
```

### Manual Backup Trigger

```python
# Manually trigger a check for due backups
await scheduler.check_and_run_backups()
```

### Scheduler Statistics

```python
# Get scheduler stats
stats = scheduler.get_stats()

print(f"Running: {stats['is_running']}")
print(f"Check interval: {stats['check_interval_seconds']}s")
print(f"Enabled settings: {stats['enabled_backup_settings']}")
print(f"Total settings: {stats['total_backup_settings']}")
```

## Backup Frequency Options

### Daily Backups
```python
BackupSettingsUpdate(
    frequency=BackupFrequency.DAILY,
    backup_time="03:00"
)
```
- Runs every day at the specified time
- Next backup calculated as: tomorrow at backup_time

### Weekly Backups
```python
BackupSettingsUpdate(
    frequency=BackupFrequency.WEEKLY,
    backup_time="03:00"
)
```
- Runs once per week at the specified time
- Next backup calculated as: 7 days from last backup

### Monthly Backups
```python
BackupSettingsUpdate(
    frequency=BackupFrequency.MONTHLY,
    backup_time="03:00"
)
```
- Runs once per month at the specified time
- Next backup calculated as: 30 days from last backup

## Retention Policy

### How It Works

The retention policy keeps the N most recent regular backups and deletes older ones:

1. **Protected Backups**: Never deleted
   - Pre-migration backups (`pre_migration_*`)
   - Pre-restore backups (`pre_restore_backup*`)

2. **Regular Backups**: Subject to retention
   - Auto backups (`auto_backup_user*`)
   - Manual backups (custom names)

3. **Safety Guarantee**: Always keeps at least 1 backup

### Configure Retention

```python
# Set keep_count when updating settings
scheduler.update_backup_settings(
    user_id=1,
    input_data=BackupSettingsUpdate(
        keep_count=14  # Keep 14 most recent backups
    )
)

# Valid range: 1-30 backups
```

### Manual Retention Application

```python
# Apply retention policy manually
deleted_count = await retention_policy.apply_retention_policy(keep_count=7)
print(f"Deleted {deleted_count} old backups")

# Get retention summary (preview without applying)
summary = await retention_policy.get_retention_summary(keep_count=7)
print(f"Total backups: {summary.total}")
print(f"Protected: {summary.protected}")
print(f"To keep: {summary.to_keep}")
print(f"To delete: {summary.to_delete}")
```

## Backup File Operations

### List Backups

```python
backups = backup_service.list_backups()

for backup in backups:
    print(f"{backup.filename} - {backup.size} bytes - {backup.created_at}")
    print(f"  Protected: {backup.is_protected}")
```

### Create Manual Backup

```python
# Create backup with custom name
backup = backup_service.create_backup(custom_filename="manual_backup_2025_01_13")
print(f"Created: {backup.filename} ({backup.size} bytes)")

# Create timestamped backup
backup = backup_service.create_backup()
print(f"Created: {backup.filename}")
```

### Restore Backup

```python
# Restore from backup (creates pre_restore_backup first)
backup_service.restore_backup(filename="justice_backup_2025-01-13.db")
```

### Delete Backup

```python
# Delete regular backup
backup_service.delete_backup(filename="old_backup.db")

# Force delete protected backup
backup_service.delete_backup(filename="pre_migration_backup.db", force=True)
```

## Scheduling Behavior

### Startup Behavior
1. Scheduler checks for missed backups on startup
2. Any backups with `next_backup_at <= NOW` are executed immediately
3. Regular periodic checks begin

### Next Backup Calculation

When a backup completes or settings are updated:

```python
# If backup_time is in the future today
next_backup = today at backup_time

# If backup_time has passed today
if frequency == "daily":
    next_backup = tomorrow at backup_time
elif frequency == "weekly":
    next_backup = 7 days from now at backup_time
elif frequency == "monthly":
    next_backup = 30 days from now at backup_time
```

### Enabling/Disabling Backups

```python
# Disable backups
scheduler.update_backup_settings(
    user_id=1,
    input_data=BackupSettingsUpdate(enabled=False)
)
# next_backup_at set to NULL

# Enable backups
scheduler.update_backup_settings(
    user_id=1,
    input_data=BackupSettingsUpdate(enabled=True)
)
# next_backup_at recalculated immediately
```

## Error Handling

### Backup Execution Errors

If a backup fails:
- Error logged to application logs
- Error audited with details
- Scheduler continues running
- Other users' backups still execute

```python
# Example error handling in application
try:
    await scheduler.check_and_run_backups()
except Exception as error:
    logger.error(f"Backup check failed: {error}")
    # Scheduler continues running
```

### Database Errors

If database operations fail:
- Transaction rolled back
- Error audited
- Settings remain unchanged
- Exception raised to caller

## Audit Logging

All operations are audited:

### Scheduler Events
- `backup_scheduler.start` - Scheduler started
- `backup_scheduler.stop` - Scheduler stopped
- `backup_scheduler.backup_completed` - Backup executed successfully
- `backup_scheduler.backup_error` - Backup execution failed
- `backup_scheduler.settings_created` - Settings created
- `backup_scheduler.settings_updated` - Settings updated
- `backup_scheduler.settings_error` - Settings operation failed
- `backup_scheduler.check_error` - Error during backup check

### Retention Events
- `backup_retention.applied` - Retention policy applied
- `backup_retention.safety_check` - Safety check prevented deletion
- `backup_retention.error` - Retention policy error
- `backup_retention.delete_error` - Individual backup deletion error
- `backup_retention.cleanup_empty` - Empty backups cleaned up
- `backup_retention.cleanup_old_protected` - Old protected backups cleaned up

### Audit Log Example

```python
{
    "event_type": "backup_scheduler.backup_completed",
    "user_id": "1",
    "resource_type": "backup_scheduler",
    "resource_id": "1",
    "action": "backup",
    "success": true,
    "details": {
        "filename": "auto_backup_user1_2025-01-13T03-00-00.db",
        "size": 2048576,
        "frequency": "daily",
        "next_backup_at": "2025-01-14T03:00:00",
        "deleted_old_backups": 2
    },
    "timestamp": "2025-01-13T03:00:05"
}
```

## Testing

### Run Tests

```bash
# Run all backup scheduler tests
pytest backend/services/backup/test_backup_scheduler.py -v

# Run specific test
pytest backend/services/backup/test_backup_scheduler.py::test_start_scheduler -v

# Run with coverage
pytest backend/services/backup/test_backup_scheduler.py --cov=backend.services.backup --cov-report=html
```

### Test Coverage

The test suite includes **35+ test cases** covering:

- Singleton pattern
- Start/stop scheduler
- Calculate next backup time (all frequencies)
- Get/update backup settings
- Check and run backups
- Scheduled backup execution
- Retention policy application
- Edge cases and error handling
- Integration scenarios

### Mock Testing

Tests use mocked services to avoid filesystem operations:

```python
@pytest.fixture
def mock_backup_service():
    service = Mock(spec=BackupService)
    service.create_backup = Mock(return_value=BackupMetadataResponse(...))
    return service
```

## Performance Considerations

### Check Interval

Default: 60 seconds (1 minute)

```python
# Adjust check interval for your needs
scheduler = BackupScheduler(
    db=db_session,
    backup_service=backup_service,
    retention_policy=retention_policy,
    check_interval=300  # 5 minutes
)
```

**Trade-offs:**
- Shorter interval: More responsive, slightly higher CPU usage
- Longer interval: Less CPU usage, backups may run slightly late

### Database Query Optimization

The scheduler queries for due backups efficiently:

```sql
SELECT * FROM backup_settings
WHERE enabled = 1
  AND next_backup_at <= ?
ORDER BY next_backup_at ASC
```

**Index recommendation:**
```sql
CREATE INDEX idx_backup_settings_next_backup
ON backup_settings(enabled, next_backup_at);
```

### Background Task Management

The scheduler runs as a lightweight asyncio task:

```python
# CPU usage: < 1% (sleeps between checks)
# Memory: ~10KB for scheduler instance
# I/O: Only during backup execution
```

## Migration from TypeScript

### Key Differences

1. **Singleton Implementation**
   ```typescript
   // TypeScript
   private static instance: BackupScheduler | null = null;
   ```
   ```python
   # Python
   _instance: Optional["BackupScheduler"] = None
   ```

2. **Async Patterns**
   ```typescript
   // TypeScript
   setInterval(async () => { ... }, CHECK_INTERVAL_MS);
   ```
   ```python
   # Python
   asyncio.create_task(self._run_scheduler())
   ```

3. **Database Types**
   ```typescript
   // TypeScript - better-sqlite3 (synchronous)
   this.db.prepare('...').run(...)
   ```
   ```python
   # Python - SQLAlchemy ORM (synchronous)
   db_session.query(BackupSettings).filter(...).all()
   ```

4. **Date Handling**
   ```typescript
   // TypeScript
   new Date().toISOString()
   ```
   ```python
   # Python
   datetime.utcnow().isoformat()
   ```

### Migration Checklist

- [x] Singleton pattern preserved
- [x] Check interval configurable
- [x] Missed backup recovery on startup
- [x] Next backup time calculation (all frequencies)
- [x] Per-user backup settings
- [x] Retention policy integration
- [x] Audit logging integration
- [x] Error handling and recovery
- [x] Comprehensive test suite (35+ tests)
- [x] Type hints throughout (Python 3.9+)

## Security Considerations

### File System Security

- All backup operations use absolute paths
- Backups stored in dedicated directory outside web root
- File permissions: 0o600 (read/write owner only)

### User Isolation

- Each user has separate backup settings
- Settings verified by user_id in database
- No cross-user access possible

### Protected Backups

Critical backups are never deleted automatically:
- Pre-migration backups (schema changes)
- Pre-restore backups (before overwrites)

### Audit Trail

All operations audited for compliance:
- Who performed the operation (user_id)
- What was changed (details)
- When it occurred (timestamp)
- Whether it succeeded (success flag)

## Troubleshooting

### Scheduler Not Running

```python
# Check scheduler status
stats = scheduler.get_stats()
print(f"Running: {stats['is_running']}")

# Restart scheduler
await scheduler.stop()
await scheduler.start()
```

### Backups Not Executing

```python
# Check backup settings
settings = scheduler.get_backup_settings(user_id=1)

# Verify:
# - enabled = True
# - next_backup_at is in the past
# - frequency is valid

# Manually trigger check
await scheduler.check_and_run_backups()
```

### Retention Policy Not Working

```python
# Check retention summary
summary = await retention_policy.get_retention_summary(keep_count=7)
print(f"Total: {summary.total}, To delete: {summary.to_delete}")

# Manually apply retention
deleted = await retention_policy.apply_retention_policy(keep_count=7)
print(f"Deleted {deleted} backups")
```

### Database Locked Errors

If you encounter "database is locked" errors:

```python
# SQLite only allows one writer at a time
# Ensure backup service uses separate connection
# Or increase SQLite timeout:

engine = create_engine(
    "sqlite:///justice.db",
    connect_args={"timeout": 30}  # 30 second timeout
)
```

## API Reference

See the full API documentation in the service files:
- `backup_service.py` - File operations
- `backup_retention_policy.py` - Retention logic
- `backup_scheduler.py` - Scheduling orchestration

## Related Documentation

- [Backup Service Migration Guide](./BACKUP_SCHEDULER_MIGRATION.md)
- [Example Usage](./example_backup_scheduler.py)
- [Test Suite](./test_backup_scheduler.py)

## Support

For issues or questions:
1. Check test suite for usage examples
2. Review audit logs for error details
3. Enable debug logging for detailed traces
4. Consult TypeScript source for original behavior

## License

Part of Justice Companion - Private legal case management system
