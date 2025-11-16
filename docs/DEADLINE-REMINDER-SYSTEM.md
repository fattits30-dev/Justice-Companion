# Deadline Reminder System

**Status:** ✅ Fully Implemented
**Version:** 1.0.0
**Last Updated:** 2025-11-13

## Overview

The Deadline Reminder System provides automated deadline notifications for Justice Companion users. It integrates the DeadlineReminderScheduler service with notification preferences to send timely reminders based on user-configured thresholds.

## Architecture

### Service Layer Components

1. **DeadlineReminderScheduler** (`backend/services/deadline_reminder_scheduler.py`)
   - Background service for periodic deadline checks
   - Configurable check intervals (default: 1 hour)
   - Respects user notification preferences
   - Prevents duplicate reminders with tracking system
   - Comprehensive audit logging

2. **NotificationService** (`backend/services/notification_service.py`)
   - Creates and manages notifications
   - Handles user notification preferences
   - Quiet hours support
   - Notification type filtering
   - Event emission for real-time updates

3. **AuditLogger** (`backend/services/audit_logger.py`)
   - Blockchain-style immutable audit trail
   - Tracks all deadline operations
   - SHA-256 hash chaining for tamper detection

4. **EncryptionService** (`backend/services/encryption_service.py`)
   - AES-256-GCM encryption for sensitive deadline data
   - Field-level encryption support

## API Endpoints

### Deadline CRUD Operations

#### `POST /deadlines`
Create a new deadline with optional reminder scheduling.

**Request:**
```json
{
  "caseId": 1,
  "title": "File Motion to Dismiss",
  "description": "Motion must be filed by end of day",
  "deadlineDate": "2025-12-01",
  "priority": "high",
  "reminderDays": 7
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "caseId": 1,
  "userId": 1,
  "title": "File Motion to Dismiss",
  "description": "Motion must be filed by end of day",
  "deadlineDate": "2025-12-01",
  "dueDate": "2025-12-01",
  "priority": "high",
  "status": "upcoming",
  "completedAt": null,
  "createdAt": "2025-11-13T10:00:00Z",
  "updatedAt": "2025-11-13T10:00:00Z"
}
```

**Priority Levels:** `low`, `medium`, `high`, `critical`

**Features:**
- Automatic deadline notification on creation
- Case ownership verification
- Audit logging
- Date validation (YYYY-MM-DD or ISO 8601)

---

#### `GET /deadlines/case/{case_id}`
List all deadlines for a specific case.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "caseId": 1,
    "title": "File Motion",
    "deadlineDate": "2025-12-01",
    "priority": "high",
    "status": "upcoming",
    ...
  }
]
```

**Ordering:** By `deadline_date` (earliest first)
**Filters:** Excludes soft-deleted deadlines

---

#### `GET /deadlines/upcoming`
Get upcoming deadlines for the authenticated user (default: next 30 days).

**Query Parameters:**
- `days` (optional): Number of days to look ahead (1-365, default: 30)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Court Hearing",
    "deadlineDate": "2025-11-20",
    "status": "upcoming",
    ...
  }
]
```

**Filters:**
- Only incomplete deadlines (status != `completed`)
- Within specified day threshold
- Across all user's cases

---

#### `GET /deadlines/overdue`
Get overdue deadlines for the authenticated user.

**Response:** `200 OK`
```json
[
  {
    "id": 2,
    "title": "File Response",
    "deadlineDate": "2025-11-10",
    "status": "overdue",
    ...
  }
]
```

**Features:**
- Automatically updates status to `overdue`
- Orders by deadline_date (oldest first)
- Excludes completed deadlines

---

#### `PUT /deadlines/{id}`
Update an existing deadline.

**Request:**
```json
{
  "title": "Updated Title",
  "priority": "critical",
  "deadlineDate": "2025-12-05",
  "status": "upcoming"
}
```

**Response:** `200 OK` (updated deadline)

**Features:**
- Partial updates (only provided fields)
- Automatic notification on significant changes
- Sets `completed_at` when status changes to `completed`
- Audit logging with changed fields tracking

---

#### `DELETE /deadlines/{id}`
Delete a deadline (soft delete).

**Response:** `200 OK`
```json
{
  "deleted": true
}
```

**Features:**
- Soft delete (sets `deleted_at` timestamp)
- Preserves audit trail
- Authorization check

---

#### `POST /deadlines/{id}/complete`
Mark a deadline as complete.

**Response:** `200 OK` (completed deadline)

**Features:**
- Sets status to `completed`
- Records `completed_at` timestamp
- Creates completion notification
- Audit logging

---

### Reminder Management

#### `GET /deadlines/{id}/reminders`
Get reminder information for a deadline.

**Response:** `200 OK`
```json
{
  "deadlineId": 1,
  "hasReminder": true,
  "reminderDays": 7,
  "scheduledFor": "2025-11-24T10:00:00Z"
}
```

**Information Provided:**
- Whether a reminder is scheduled
- Number of days before deadline for reminder
- Calculated scheduled reminder date

---

#### `POST /deadlines/{id}/reminders`
Schedule or update a reminder for a deadline.

**Request:**
```json
{
  "reminderDays": 7
}
```

**Response:** `200 OK`
```json
{
  "deadlineId": 1,
  "hasReminder": true,
  "reminderDays": 7,
  "scheduledFor": "2025-11-24T10:00:00Z"
}
```

**Features:**
- Updates user's notification preferences
- Enables deadline reminders globally
- Configurable reminder threshold (1-30 days)
- Audit logging

---

## Notification Preferences

Users can configure deadline reminder behavior through notification preferences:

```python
from backend.models.notification import NotificationPreferences

# Default settings
NotificationPreferences(
    user_id=user_id,
    deadline_reminders_enabled=True,       # Enable/disable all deadline reminders
    deadline_reminder_days=7,              # Days before deadline to send reminder
    case_updates_enabled=True,             # Case-related notifications
    evidence_updates_enabled=True,         # Evidence-related notifications
    system_alerts_enabled=True,            # System notifications
    sound_enabled=True,                    # Audio notifications
    desktop_notifications_enabled=True,    # Desktop push notifications
    quiet_hours_enabled=False,             # Enable quiet hours
    quiet_hours_start="22:00",            # Quiet hours start time
    quiet_hours_end="08:00"               # Quiet hours end time
)
```

## DeadlineReminderScheduler Usage

### Starting the Scheduler

```python
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.notification_service import NotificationService
from backend.services.audit_logger import AuditLogger

# Initialize services
audit_logger = AuditLogger(db)
notification_service = NotificationService(db, audit_logger)

# Create scheduler
scheduler = DeadlineReminderScheduler(
    db=db,
    notification_service=notification_service,
    audit_logger=audit_logger,
    check_interval=3600  # Check every hour (default)
)

# Start scheduler (non-blocking)
scheduler.start()

# Scheduler runs in background, checking for upcoming deadlines
# Sends reminders based on user preferences
```

### Manual Deadline Check

```python
# Trigger immediate deadline check
await scheduler.check_now()

# Get scheduler statistics
stats = scheduler.get_stats()
print(f"Running: {stats['is_running']}")
print(f"Check interval: {stats['check_interval_seconds']}s")
print(f"Sent reminders: {stats['sent_reminders_count']}")
```

### Stopping the Scheduler

```python
# Stop scheduler
scheduler.stop()
```

### Reminder Deduplication

The scheduler tracks sent reminders to prevent duplicates:

```python
# Clear sent reminders cache (e.g., for testing or after long downtime)
scheduler.clear_sent_reminders()
```

## Notification Flow

1. **Deadline Creation**
   - User creates deadline via `POST /deadlines`
   - System validates case ownership and date format
   - Deadline stored in database
   - Notification created: "Deadline created: [title]"
   - Audit log entry created

2. **Scheduler Check** (Periodic)
   - Scheduler runs every hour (configurable)
   - Queries users with `deadline_reminders_enabled = true`
   - For each user:
     - Fetches upcoming deadlines within `deadline_reminder_days`
     - Checks if reminder already sent (deduplication)
     - Creates reminder notification if due
     - Marks reminder as sent

3. **Reminder Notification**
   - Type: `DEADLINE_REMINDER`
   - Severity: Based on deadline priority
     - `critical` → `HIGH`
     - `high` → `MEDIUM`
     - `medium` → `MEDIUM`
     - `low` → `LOW`
   - Message: "Your deadline '[title]' is due in X days."
   - Metadata: Includes `deadlineId`, `caseId`, `daysUntil`

4. **User Interaction**
   - User receives notification
   - User can:
     - Mark notification as read
     - Dismiss notification
     - View deadline details
     - Complete deadline

5. **Deadline Completion**
   - User marks deadline complete via `POST /deadlines/{id}/complete`
   - Status updated to `completed`
   - `completed_at` timestamp set
   - Notification created: "Deadline completed: [title]"
   - Audit log entry created

## Status Tracking

Deadlines have three statuses:

### `upcoming`
- Default status on creation
- Deadline date is in the future
- Not yet completed

### `overdue`
- Deadline date has passed
- Status not `completed`
- Automatically set by `GET /deadlines/overdue` endpoint
- Indicates missed deadline

### `completed`
- User marked deadline as complete
- `completed_at` timestamp set
- No longer appears in upcoming/overdue lists
- Excluded from reminder checks

## Security Features

### Authorization
- All deadline operations verify case ownership
- Users can only access their own deadlines
- 403 Forbidden for unauthorized access
- 404 Not Found for non-existent/unauthorized resources

### Audit Logging
All deadline operations are logged:
- `deadline.created` - Deadline creation
- `deadline.updated` - Deadline modification
- `deadline.deleted` - Deadline deletion (soft)
- `deadline.completed` - Deadline completion
- `deadline.reminder_scheduled` - Reminder configuration
- `deadline_reminder.created` - Reminder notification sent

Audit logs include:
- Event type and timestamp
- User ID and resource ID
- Action performed
- Success/failure status
- Changed fields (for updates)
- Error messages (for failures)
- Cryptographic hash chain (SHA-256)

### Encryption
Optional field-level encryption for sensitive deadline data:
- Title (if configured)
- Description (if configured)
- Uses AES-256-GCM
- Managed by EncryptionService

## Database Schema

### `deadlines` Table

```sql
CREATE TABLE deadlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline_date TEXT NOT NULL,  -- ISO 8601 format
    priority TEXT NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
    status TEXT NOT NULL DEFAULT 'upcoming',  -- upcoming, overdue, completed
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,  -- Soft delete
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CHECK (status IN ('upcoming', 'overdue', 'completed'))
);

CREATE INDEX idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX idx_deadlines_user_id ON deadlines(user_id);
```

### `notification_preferences` Table

```sql
CREATE TABLE notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    deadline_reminders_enabled BOOLEAN DEFAULT TRUE,
    deadline_reminder_days INTEGER DEFAULT 7,  -- Days before deadline to remind
    case_updates_enabled BOOLEAN DEFAULT TRUE,
    evidence_updates_enabled BOOLEAN DEFAULT TRUE,
    system_alerts_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    desktop_notifications_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '08:00',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (deadline_reminder_days >= 1 AND deadline_reminder_days <= 30)
);
```

## Testing

### Test Coverage

The test suite (`backend/tests/test_deadlines_routes.py`) includes 21 comprehensive tests:

**CRUD Operations (8 tests)**
- ✅ Create deadline with notification
- ✅ Create deadline using dueDate alias
- ✅ Create deadline for invalid case (404)
- ✅ Create deadline without date (validation error)
- ✅ Create deadline with invalid priority (validation error)
- ✅ List case deadlines (ordered)
- ✅ List case deadlines unauthorized (403)
- ✅ Update deadline with notification

**Status Tracking (3 tests)**
- ✅ List upcoming deadlines (default 30 days)
- ✅ List upcoming deadlines with custom threshold
- ✅ List overdue deadlines with auto-status update

**Deadline Operations (4 tests)**
- ✅ Update deadline unauthorized (403)
- ✅ Update deadline with no changes (400)
- ✅ Delete deadline with soft delete
- ✅ Delete deadline unauthorized (403)

**Completion (1 test)**
- ✅ Complete deadline with notification

**Reminder Management (3 tests)**
- ✅ Get reminder info (no reminder)
- ✅ Schedule reminder with preference update
- ✅ Get reminder info (with reminder)

**Validation (2 tests)**
- ✅ Invalid date format (422)
- ✅ Title too long (422)

### Running Tests

```bash
# Run all deadline tests
pytest backend/tests/test_deadlines_routes.py -v

# Run specific test
pytest backend/tests/test_deadlines_routes.py::test_create_deadline_success -v

# Run with coverage
pytest backend/tests/test_deadlines_routes.py --cov=backend.routes.deadlines --cov-report=html
```

## Performance Considerations

### Scheduler Efficiency
- Configurable check interval (default: 1 hour)
- Processes only users with reminders enabled
- Deduplication prevents duplicate notifications
- Graceful error handling (continues on failure)

### Database Optimization
- Indexed queries on `case_id` and `user_id`
- Soft delete preserves data while excluding from queries
- Efficient date filtering with ISO 8601 strings

### Notification Batching
- Scheduler processes all reminders in single check
- Audit logging batched for performance
- Notification service handles rate limiting

## Error Handling

All endpoints handle errors gracefully:

### Validation Errors (422)
- Invalid date format
- Missing required fields
- Invalid priority/status values
- Field length violations

### Authorization Errors
- 403 Forbidden: User doesn't own resource
- 404 Not Found: Resource doesn't exist or unauthorized

### Server Errors (500)
- Database connection failures
- Unexpected exceptions
- Automatic rollback on failure
- Audit log entries for all failures

## Future Enhancements

### Planned Features
1. **Email/SMS Reminders**
   - Integration with email service
   - SMS notifications via Twilio
   - Configurable delivery methods

2. **Recurring Deadlines**
   - Support for recurring deadlines (weekly, monthly)
   - Automatic deadline generation
   - Pattern-based scheduling

3. **Deadline Templates**
   - Predefined deadline types
   - Case type-specific templates
   - Quick deadline creation

4. **Advanced Notifications**
   - Multiple reminders per deadline
   - Escalation rules
   - Priority-based routing

5. **Calendar Integration**
   - iCal export
   - Google Calendar sync
   - Outlook integration

## Troubleshooting

### Reminders Not Sent

**Issue:** Deadline reminders not being created

**Possible Causes:**
1. Scheduler not running
   - Check: `scheduler.get_stats()['is_running']`
   - Fix: `scheduler.start()`

2. User preferences disabled
   - Check: `notification_preferences.deadline_reminders_enabled`
   - Fix: Update via `POST /deadlines/{id}/reminders`

3. Quiet hours active
   - Check: `notification_preferences.quiet_hours_enabled`
   - Check current time vs quiet hours window
   - Fix: Disable quiet hours or wait until active hours

4. Reminder already sent
   - Check: Scheduler tracks sent reminders
   - Fix: Wait for next check interval or `clear_sent_reminders()`

### Deadline Status Not Updating

**Issue:** Overdue deadlines still showing as "upcoming"

**Solution:** Call `GET /deadlines/overdue` to trigger status update

### Unauthorized Access Errors

**Issue:** 403 errors when accessing valid deadlines

**Possible Causes:**
1. Deadline belongs to different user
   - Check: `deadline.user_id` matches authenticated user
   - Deadlines are accessed via case ownership

2. Case ownership mismatch
   - Check: `case.user_id` matches authenticated user
   - Verify case exists and is accessible

## Migration from Legacy System

If migrating from the Electron IPC handler:

1. **Database Migration**
   - No schema changes required
   - Existing deadlines compatible

2. **API Changes**
   - REST endpoints instead of IPC handlers
   - Same data structures
   - Additional reminder endpoints

3. **Service Integration**
   - Replace direct DB queries with service layer
   - Add scheduler initialization to app startup
   - Configure notification preferences for existing users

## Support

For issues or questions:
- **Documentation:** `/docs/DEADLINE-REMINDER-SYSTEM.md`
- **Tests:** `/backend/tests/test_deadlines_routes.py`
- **Code:** `/backend/routes/deadlines.py`
- **Services:** `/backend/services/`

## Changelog

### v1.0.0 (2025-11-13)
- ✅ Initial implementation with service layer
- ✅ Complete CRUD operations
- ✅ Reminder scheduling system
- ✅ Notification integration
- ✅ Audit logging
- ✅ Comprehensive test suite (21 tests)
- ✅ Full documentation
