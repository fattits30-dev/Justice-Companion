# Deadline Reminder Scheduler Service

Python service for automated deadline reminder notifications in Justice Companion.

**Migrated from:** `src/services/DeadlineReminderScheduler.ts`
**Location:** `backend/services/deadline_reminder_scheduler.py`

---

## Overview

The `DeadlineReminderScheduler` is a background service that automatically checks for upcoming deadlines and sends reminder notifications to users based on their preferences. It runs periodic checks, respects user notification settings (including quiet hours), and prevents duplicate reminders.

### Key Features

- **Automated Periodic Checks**: Runs at configurable intervals (default: 1 hour)
- **User Preference Awareness**: Respects notification preferences and quiet hours
- **Duplicate Prevention**: Tracks sent reminders to avoid spamming users
- **Graceful Error Handling**: Continues operating even if individual checks fail
- **Comprehensive Audit Logging**: All operations logged for compliance
- **Async/Await Support**: Modern Python async patterns for efficient operation
- **Thread-Safe**: Safe to run as background task in FastAPI applications

---

## Architecture

### Dependencies

```python
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.notification_service import NotificationService
from backend.services.audit_logger import AuditLogger
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DeadlineReminderScheduler                │
│                                                              │
│  1. Query NotificationPreferences                            │
│     - Get users with deadline_reminders_enabled = true      │
│                                                              │
│  2. For each user:                                           │
│     - Get upcoming deadlines from Deadline table            │
│     - Filter by deadline_reminder_days threshold            │
│     - Skip completed/deleted deadlines                      │
│                                                              │
│  3. Check duplicate prevention cache                         │
│     - Key: "{user_id}-{deadline_id}"                        │
│     - Skip if already sent                                  │
│                                                              │
│  4. Create reminder via NotificationService                  │
│     - Respects quiet hours                                   │
│     - Respects notification type preferences                │
│     - Severity based on urgency (today = HIGH)              │
│                                                              │
│  5. Track sent reminder to prevent duplicates                │
│     - Add to _sent_reminders set                            │
│                                                              │
│  6. Log all operations to AuditLogger                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

All required dependencies are already in `backend/requirements.txt`:

```txt
sqlalchemy==2.0.35
fastapi==0.115.0
pydantic[email]==2.9.2
python-dateutil==2.9.0
```

No additional packages needed - uses Python's built-in `asyncio` and `logging`.

### Setup

1. **Import the service:**
   ```python
   from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
   ```

2. **Initialize with dependencies:**
   ```python
   scheduler = DeadlineReminderScheduler(
       db=db_session,
       notification_service=notification_service,
       audit_logger=audit_logger,  # Optional
       check_interval=3600  # 1 hour in seconds
   )
   ```

3. **Start the scheduler:**
   ```python
   scheduler.start()
   ```

---

## Usage

### Basic Integration (FastAPI)

```python
from fastapi import FastAPI
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler

app = FastAPI()
scheduler: Optional[DeadlineReminderScheduler] = None

@app.on_event("startup")
async def startup_event():
    global scheduler

    # Initialize services
    notification_service = NotificationService(db=db, audit_logger=audit_logger)

    # Create and start scheduler
    scheduler = DeadlineReminderScheduler(
        db=db,
        notification_service=notification_service,
        audit_logger=audit_logger,
        check_interval=3600  # Check every hour
    )

    scheduler.start()
    print("Deadline reminder scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    if scheduler:
        scheduler.stop()
        print("Deadline reminder scheduler stopped")
```

### Manual Check Trigger

```python
# Trigger an immediate check (useful for testing or admin actions)
await scheduler.check_now()
```

### Get Scheduler Statistics

```python
stats = scheduler.get_stats()
print(f"Running: {stats['is_running']}")
print(f"Check interval: {stats['check_interval_seconds']} seconds")
print(f"Reminders sent: {stats['sent_reminders_count']}")
```

### Clear Reminder Cache

```python
# Clear the duplicate prevention cache (useful for testing or after long periods)
scheduler.clear_sent_reminders()
```

---

## API Reference

### Class: `DeadlineReminderScheduler`

#### Constructor

```python
def __init__(
    db: Session,
    notification_service: NotificationService,
    audit_logger: Optional[AuditLogger] = None,
    check_interval: int = 3600
)
```

**Parameters:**
- `db`: SQLAlchemy database session
- `notification_service`: Service for creating notifications
- `audit_logger`: Optional audit logger instance
- `check_interval`: Seconds between checks (default: 3600 = 1 hour)

#### Methods

##### `start() -> None`

Start the scheduler. Runs immediately and then periodically at configured intervals.

```python
scheduler.start()
```

##### `stop() -> None`

Stop the scheduler gracefully. Cancels the background task.

```python
scheduler.stop()
```

##### `async check_now() -> None`

Manually trigger an immediate deadline check. Can be called even when scheduler is not running.

```python
await scheduler.check_now()
```

##### `clear_sent_reminders() -> None`

Clear the duplicate prevention cache. Useful for testing or resetting after long periods.

```python
scheduler.clear_sent_reminders()
```

##### `get_stats() -> Dict[str, any]`

Get scheduler statistics.

```python
stats = scheduler.get_stats()
# Returns:
# {
#     "is_running": bool,
#     "check_interval_seconds": int,
#     "sent_reminders_count": int
# }
```

---

## Configuration

### Database Schema Requirements

The scheduler requires these tables:

**`notification_preferences`:**
```sql
- user_id (FK to users)
- deadline_reminders_enabled (BOOLEAN)
- deadline_reminder_days (INTEGER, default 7)
- quiet_hours_enabled (BOOLEAN)
- quiet_hours_start (TEXT, format "HH:MM")
- quiet_hours_end (TEXT, format "HH:MM")
```

**`deadlines`:**
```sql
- id (PRIMARY KEY)
- user_id (FK to users)
- case_id (FK to cases)
- title (TEXT)
- deadline_date (TEXT, ISO 8601 format)
- status (TEXT: 'upcoming', 'overdue', 'completed')
- priority (TEXT: 'low', 'medium', 'high', 'critical')
- deleted_at (TIMESTAMP, nullable)
```

### Environment Variables

No specific environment variables required. Configuration done via constructor parameters.

### Check Interval Recommendations

| Interval | Use Case | Resource Impact |
|----------|----------|----------------|
| 300s (5 min) | Development/Testing | High |
| 900s (15 min) | High-priority cases | Medium-High |
| 1800s (30 min) | Standard cases | Medium |
| 3600s (1 hour) | Recommended for production | Low |
| 7200s (2 hours) | Low-priority/off-hours | Very Low |

---

## Notification Logic

### Reminder Threshold

Users are reminded when:
```
NOW < deadline_date <= NOW + deadline_reminder_days
```

Example: If `deadline_reminder_days = 7`, user gets reminded for deadlines 0-7 days away.

### Severity Calculation

```python
if days_until <= 1:
    severity = NotificationSeverity.HIGH
else:
    severity = NotificationSeverity.MEDIUM
```

### Message Format

- **Due today:** "Your deadline '[Title]' is due today!"
- **Due tomorrow:** "Your deadline '[Title]' is due in 1 day."
- **Multiple days:** "Your deadline '[Title]' is due in [N] days."

### Duplicate Prevention

Each reminder is tracked by key: `"{user_id}-{deadline_id}"`

Once sent, will not be sent again until:
- Scheduler is restarted
- Cache is manually cleared with `clear_sent_reminders()`

---

## Testing

### Run Test Suite

```bash
cd backend
pytest services/test_deadline_reminder_scheduler.py -v
```

### Test Coverage

The test suite includes:

- ✅ Scheduler lifecycle (start/stop)
- ✅ Deadline detection and filtering
- ✅ Reminder notification creation
- ✅ Duplicate prevention
- ✅ User preference handling
- ✅ Date range filtering
- ✅ Message formatting (today, tomorrow, multiple days)
- ✅ Invalid date handling
- ✅ Error recovery (continues after failures)
- ✅ Audit logging

### Manual Testing

See `backend/services/example_deadline_scheduler_usage.py` for comprehensive examples.

Run the demo:
```bash
cd backend
python services/example_deadline_scheduler_usage.py
```

---

## Monitoring

### Logging

The scheduler uses Python's `logging` module:

```python
import logging
logger = logging.getLogger(__name__)

# Configure in your application:
logging.basicConfig(level=logging.INFO)
```

**Log Levels:**
- `INFO`: Normal operations (start/stop, check completion)
- `WARNING`: Non-critical issues (invalid dates, already running)
- `ERROR`: Critical failures (check errors, notification failures)

### Audit Trail

All operations are logged via `AuditLogger` if provided:

**Event Types:**
- `deadline_reminder.scheduler_start`
- `deadline_reminder.scheduler_stop`
- `deadline_reminder.check_completed`
- `deadline_reminder.check_error`
- `deadline_reminder.created`
- `deadline_reminder.create_error`
- `deadline_reminder.clear_cache`

### Health Check Endpoint

```python
@app.get("/api/scheduler/health")
async def scheduler_health():
    if not scheduler:
        return {"status": "not_initialized"}

    stats = scheduler.get_stats()

    return {
        "status": "healthy" if stats["is_running"] else "stopped",
        "uptime": "N/A",  # Implement your own uptime tracking
        "stats": stats
    }
```

---

## Error Handling

### Graceful Degradation

The scheduler continues operating even when:
- Individual user checks fail
- Notification service throws errors
- Invalid deadline dates encountered
- Database queries timeout

**Strategy:** Log error, continue with next user/deadline

### Error Recovery

```python
try:
    await scheduler.check_now()
except Exception as error:
    logger.error(f"Check failed: {error}")
    # Scheduler continues running
    # Next check will run at scheduled interval
```

### Notification Failures

If `NotificationService.create_notification()` fails:
- Error is logged
- Reminder is NOT marked as sent (will retry on next check)
- Audit log records failure
- Scheduler continues with next deadline

---

## Performance Considerations

### Database Queries

Per check, the scheduler runs:
1. One query for users with reminders enabled
2. One query per user for their deadlines
3. Filtering done in Python (minimal DB load)

**Optimization:** Consider indexing:
```sql
CREATE INDEX idx_notification_prefs_enabled
ON notification_preferences(deadline_reminders_enabled);

CREATE INDEX idx_deadlines_user_status
ON deadlines(user_id, status);
```

### Memory Usage

- **Minimal**: Only tracks sent reminder keys in memory
- **Growth rate**: ~50 bytes per reminder (user_id + deadline_id)
- **Cleanup strategy**: Clear cache periodically with `clear_sent_reminders()`

**Example:** 1000 users × 10 deadlines = 10,000 reminders = ~500KB memory

### Concurrency

- **Thread-safe**: Uses asyncio, no shared state between tasks
- **Database sessions**: Each scheduler instance should have its own session
- **Notification service**: Must support concurrent calls

---

## Migration from TypeScript

### Key Differences

| TypeScript Version | Python Version |
|-------------------|----------------|
| `setInterval()` | `asyncio` task with `sleep()` |
| `Map<string, Date>` | `Set[str]` for tracking |
| `NodeJS.Timeout` | `asyncio.Task` |
| Synchronous methods | Async methods with `async/await` |
| `console.log()` | Python `logging` module |

### Breaking Changes

None - the Python version maintains API compatibility with TypeScript logic.

### Behavioral Equivalence

✅ **Same logic:**
- Deadline detection algorithm
- Reminder threshold calculation
- Duplicate prevention
- Message formatting
- Severity determination

✅ **Same integrations:**
- NotificationService interface
- AuditLogger interface
- Database schema

---

## Troubleshooting

### Scheduler Not Starting

**Symptom:** `start()` called but no checks running

**Solutions:**
1. Check if already running: `scheduler.is_running`
2. Verify asyncio event loop is running
3. Check logs for error messages

### No Reminders Being Sent

**Symptom:** Checks run but no notifications created

**Possible causes:**
1. No users have `deadline_reminders_enabled = true`
2. All deadlines outside reminder threshold (check `deadline_reminder_days`)
3. Deadlines marked as completed or deleted
4. Quiet hours active
5. Notification type disabled in preferences

**Debug:**
```python
# Check user preferences
prefs = db.query(NotificationPreferences).filter(
    NotificationPreferences.deadline_reminders_enabled == True
).all()
print(f"Users with reminders: {len(prefs)}")

# Check upcoming deadlines
deadlines = db.query(Deadline).filter(
    Deadline.status != 'completed',
    Deadline.deleted_at.is_(None)
).all()
print(f"Active deadlines: {len(deadlines)}")

# Manually trigger check with logging
import logging
logging.basicConfig(level=logging.DEBUG)
await scheduler.check_now()
```

### Duplicate Reminders

**Symptom:** Same reminder sent multiple times

**Causes:**
1. Multiple scheduler instances running
2. Cache cleared between checks
3. Scheduler restarted

**Solutions:**
- Ensure only ONE scheduler instance per application
- Don't call `clear_sent_reminders()` during normal operation
- Implement persistent tracking if needed

### High Memory Usage

**Symptom:** Memory grows over time

**Cause:** `_sent_reminders` set growing without bounds

**Solution:**
```python
# Periodically clear cache (e.g., daily)
from datetime import datetime

async def daily_cache_cleanup():
    while True:
        await asyncio.sleep(86400)  # 24 hours
        scheduler.clear_sent_reminders()
```

---

## Future Enhancements

### Potential Improvements

1. **Persistent Reminder Tracking**
   - Store sent reminders in database
   - Survive application restarts
   - Enable reminder history queries

2. **Dynamic Check Intervals**
   - More frequent checks during business hours
   - Less frequent during nights/weekends
   - Configurable per-user

3. **Priority-Based Scheduling**
   - Check critical deadlines more frequently
   - Skip low-priority deadlines in off-hours

4. **Retry Logic**
   - Retry failed notifications with exponential backoff
   - Mark as permanently failed after N attempts

5. **Metrics and Analytics**
   - Track reminder delivery success rate
   - Average time to notification
   - User engagement with reminders

6. **Multi-Reminder Support**
   - Send multiple reminders (7 days, 3 days, 1 day, today)
   - Configurable reminder schedule per user

---

## Support

### Documentation
- Main service: `backend/services/deadline_reminder_scheduler.py`
- Tests: `backend/services/test_deadline_reminder_scheduler.py`
- Examples: `backend/services/example_deadline_scheduler_usage.py`

### Related Services
- `NotificationService`: Creates and manages notifications
- `AuditLogger`: Logs all security and compliance events

### Migration Notes
Original TypeScript implementation: `src/services/DeadlineReminderScheduler.ts`

---

## License

Part of Justice Companion - Privacy-first legal case management system.
