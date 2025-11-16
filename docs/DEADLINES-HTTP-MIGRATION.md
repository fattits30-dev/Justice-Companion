# Deadlines HTTP API Migration Guide

**Status:** ✅ Complete
**Date:** 2025-11-13
**Migration Type:** Electron IPC → FastAPI HTTP REST

---

## Overview

This document provides comprehensive documentation for the deadlines management HTTP API migration in Justice Companion. All Electron IPC deadline calls have been replaced with HTTP REST endpoints using the `apiClient`.

**Key Features:**
- Complete CRUD operations for deadlines
- Calendar view with month/week/day navigation
- List view with advanced filtering
- Upcoming and overdue deadline queries
- Reminder system integration
- Priority-based color coding
- Dashboard widget integration

---

## API Reference

### Base URL
```
http://127.0.0.1:8000
```

### Authentication
All requests require `X-Session-Id` header with valid session ID.

---

## API Endpoints

### 1. List Deadlines

**Endpoint:** `GET /deadlines`

**Query Parameters:**
- `case_id` (optional): Filter by case ID
- `status` (optional): Filter by status (pending, completed, missed, upcoming, overdue)
- `priority` (optional): Filter by priority (low, medium, high, urgent, critical)
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```typescript
import { apiClient } from '@/lib/apiClient';

const response = await apiClient.deadlines.list({
  caseId: 5,
  status: 'pending',
  limit: 20
});

if (response.success) {
  console.log('Deadlines:', response.data.items);
  console.log('Total:', response.data.total);
  console.log('Overdue count:', response.data.overdueCount);
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "caseId": 5,
        "userId": 1,
        "title": "File motion to dismiss",
        "description": "Motion to dismiss for lack of jurisdiction",
        "deadlineDate": "2025-02-01T09:00:00Z",
        "priority": "high",
        "status": "pending",
        "completed": false,
        "completedAt": null,
        "reminderEnabled": true,
        "reminderDaysBefore": 3,
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-15T10:00:00Z",
        "caseTitle": "Smith v. ABC Corp",
        "caseStatus": "active"
      }
    ],
    "total": 15,
    "overdueCount": 2
  }
}
```

---

### 2. Get Single Deadline

**Endpoint:** `GET /deadlines/{id}`

**Example Request:**
```typescript
const response = await apiClient.deadlines.get(1);

if (response.success) {
  console.log('Deadline:', response.data);
}
```

---

### 3. Create Deadline

**Endpoint:** `POST /deadlines`

**Request Body:**
```json
{
  "caseId": 5,
  "title": "File motion to dismiss",
  "description": "Motion to dismiss for lack of jurisdiction",
  "deadlineDate": "2025-02-01T09:00:00",
  "priority": "high",
  "reminderDaysBefore": 3
}
```

**Example Request:**
```typescript
const response = await apiClient.deadlines.create({
  caseId: 5,
  title: 'File motion to dismiss',
  deadlineDate: '2025-02-01T09:00:00',
  priority: 'high',
  reminderDaysBefore: 3
});

if (response.success) {
  console.log('Created deadline:', response.data);
  toast.success('Deadline created successfully');
}
```

**Validation Rules:**
- `title`: Required, 1-200 characters
- `deadlineDate` OR `dueDate`: Required, ISO 8601 format
- `priority`: Optional, one of: low, medium, high, urgent, critical (default: medium)
- `reminderDaysBefore`: Optional, 1-30 days (default: 3)
- `caseId`: Optional, must exist and belong to user

---

### 4. Update Deadline

**Endpoint:** `PUT /deadlines/{id}`

**Request Body:**
```json
{
  "title": "Updated title",
  "priority": "urgent",
  "status": "completed",
  "reminderEnabled": false
}
```

**Example Request:**
```typescript
const response = await apiClient.deadlines.update(1, {
  priority: 'urgent',
  status: 'completed'
});

if (response.success) {
  console.log('Updated deadline:', response.data);
  toast.success('Deadline updated successfully');
}
```

---

### 5. Delete Deadline

**Endpoint:** `DELETE /deadlines/{id}`

**Example Request:**
```typescript
const response = await apiClient.deadlines.delete(1);

if (response.success) {
  toast.success('Deadline deleted successfully');
}
```

---

### 6. Get Upcoming Deadlines

**Endpoint:** `GET /deadlines/upcoming?days=7&limit=10`

**Query Parameters:**
- `days`: Number of days ahead (default: 7)
- `limit`: Max results (default: 10)

**Example Request:**
```typescript
const response = await apiClient.deadlines.getUpcoming(7, 10);

if (response.success) {
  console.log('Upcoming deadlines:', response.data.items);
  response.data.items.forEach(deadline => {
    console.log(`${deadline.title}: ${deadline.daysUntil} days until`);
  });
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "File motion",
        "deadlineDate": "2025-02-01T09:00:00Z",
        "priority": "high",
        "status": "upcoming",
        "daysUntil": 5,
        "caseTitle": "Smith v. ABC Corp"
      }
    ],
    "total": 5,
    "overdueCount": 0
  }
}
```

---

### 7. Get Overdue Deadlines

**Endpoint:** `GET /deadlines/overdue`

**Example Request:**
```typescript
const response = await apiClient.deadlines.getOverdue();

if (response.success) {
  console.log('Overdue deadlines:', response.data.items);
  response.data.items.forEach(deadline => {
    console.log(`${deadline.title}: ${deadline.daysPast} days overdue`);
  });
}
```

---

### 8. Get Deadlines by Date

**Endpoint:** `GET /deadlines/by-date?date=2025-02-01`

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format

**Example Request:**
```typescript
const response = await apiClient.deadlines.getByDate('2025-02-01');

if (response.success) {
  console.log('Deadlines for 2025-02-01:', response.data.items);
}
```

---

### 9. Mark Deadline as Complete

**Endpoint:** `POST /deadlines/{id}/complete`

**Example Request:**
```typescript
const response = await apiClient.deadlines.markComplete(1);

if (response.success) {
  console.log('Completed at:', response.data.completedAt);
  toast.success('Deadline marked as complete');
}
```

---

### 10. Snooze Deadline

**Endpoint:** `POST /deadlines/{id}/snooze?hours=24`

**Query Parameters:**
- `hours`: Number of hours to snooze (1-168, max 7 days)

**Example Request:**
```typescript
const response = await apiClient.deadlines.snooze(1, 24);

if (response.success) {
  console.log('New deadline date:', response.data.deadlineDate);
  toast.success('Deadline snoozed for 24 hours');
}
```

---

## Component Architecture

### Directory Structure
```
src/components/deadlines/
├── DeadlineCalendar.tsx        # Month/week/day calendar view
├── DeadlineList.tsx            # List view with filters
├── DeadlineForm.tsx            # Create/edit deadline form
├── DeadlineWidget.tsx          # Dashboard widget
├── DeadlineBadge.tsx           # Priority/status badge
├── DeadlinePriorityBadge.tsx   # Priority color indicator
└── types.ts                    # Component-specific types
```

---

## Component Usage

### DeadlineCalendar

**Purpose:** Display deadlines in a month/week/day calendar view with color-coded priorities.

**Features:**
- Month, week, day view toggle
- Navigate between months
- Click date to view deadlines
- Click deadline to edit
- Color coding by priority
- Overdue deadlines with strikethrough
- Today indicator

**Example:**
```typescript
import { DeadlineCalendar } from '@/components/deadlines/DeadlineCalendar';

<DeadlineCalendar
  caseId={5} // Optional: filter by case
  onDeadlineClick={(deadline) => console.log('Clicked:', deadline)}
  onCreateClick={(date) => console.log('Create deadline for:', date)}
/>
```

**Priority Color Coding:**
- **Urgent/Critical:** Red (`bg-red-500`)
- **High:** Orange (`bg-orange-500`)
- **Medium:** Blue (`bg-blue-500`)
- **Low:** Gray (`bg-gray-400`)

---

### DeadlineList

**Purpose:** List view with advanced filtering, sorting, and bulk actions.

**Features:**
- Filter by status (pending, completed, overdue)
- Filter by priority
- Filter by case
- Sort by due date, priority, created date
- Search by title
- Bulk actions (mark complete, delete)
- Pagination
- Overdue highlighting

**Example:**
```typescript
import { DeadlineList } from '@/components/deadlines/DeadlineList';

<DeadlineList
  caseId={5} // Optional: filter by case
  onEdit={(deadline) => console.log('Edit:', deadline)}
  onDelete={(deadline) => console.log('Delete:', deadline)}
/>
```

**Filters:**
- **Status:** All, Pending, Completed, Overdue, Missed
- **Priority:** All, Low, Medium, High, Urgent, Critical
- **Case:** Dropdown with user's cases
- **Search:** Title search with debounce

---

### DeadlineForm

**Purpose:** Create or edit deadlines with validation and reminder settings.

**Features:**
- Title and description inputs
- Date/time picker
- Priority selector
- Case selector (optional)
- Reminder settings
- Validation feedback
- Error handling

**Example:**
```typescript
import { DeadlineForm } from '@/components/deadlines/DeadlineForm';

<DeadlineForm
  deadline={existingDeadline} // Optional: for editing
  caseId={5} // Optional: pre-select case
  onSubmit={async (data) => {
    const response = await apiClient.deadlines.create(data);
    if (response.success) {
      toast.success('Deadline created');
    }
  }}
  onCancel={() => console.log('Cancelled')}
/>
```

**Form Fields:**
- **Title:** Required, 1-200 characters
- **Description:** Optional, 0-1000 characters
- **Date/Time:** Required, date picker with time
- **Priority:** Dropdown (low, medium, high, urgent, critical)
- **Case:** Optional dropdown
- **Reminder:** Checkbox + days before (1-30)

---

### DeadlineWidget

**Purpose:** Dashboard widget showing upcoming and overdue deadlines.

**Features:**
- Next 5 upcoming deadlines
- Overdue count badge
- Click to navigate to full calendar
- Compact view optimized for dashboard

**Example:**
```typescript
import { DeadlineWidget } from '@/components/deadlines/DeadlineWidget';

<DeadlineWidget
  limit={5}
  onClick={(deadline) => navigate(`/deadlines/${deadline.id}`)}
/>
```

**Display:**
- **Upcoming:** Shows title, due date, days until, priority badge
- **Overdue:** Red background, shows days overdue
- **Empty State:** "No upcoming deadlines" with create button

---

## Reminder System Architecture

**Backend Scheduler:**
- Runs every hour via cron job or APScheduler
- Checks deadlines due in next 24 hours
- Creates notification for each deadline with `reminderEnabled=true`
- Respects user's quiet hours (from notification preferences)
- Idempotent (doesn't create duplicate reminders)

**Frontend Integration:**
- Polls notification API every 30 seconds
- Displays reminder in notification center
- Shows notification badge count
- Click to navigate to deadline

**Reminder Creation:**
```python
# Backend (simplified)
def create_deadline_reminders():
    now = datetime.utcnow()
    tomorrow = now + timedelta(days=1)

    deadlines = db.query(Deadline).filter(
        Deadline.deadlineDate.between(now, tomorrow),
        Deadline.reminderEnabled == True,
        Deadline.status != 'completed'
    ).all()

    for deadline in deadlines:
        # Check if reminder already exists
        existing = db.query(Notification).filter(
            Notification.userId == deadline.userId,
            Notification.metadata.contains({'deadlineId': deadline.id})
        ).first()

        if not existing:
            create_notification(
                userId=deadline.userId,
                type='deadline_reminder',
                severity='high',
                title=f'Deadline Reminder: {deadline.title}',
                message=f'Due in {days_until} days',
                metadata={'deadlineId': deadline.id, 'caseId': deadline.caseId}
            )
```

---

## Migration Checklist

### ✅ Backend Implementation
- [x] Create `/deadlines` endpoints in FastAPI
- [x] Implement deadline CRUD operations
- [x] Add deadline queries (upcoming, overdue, by-date)
- [x] Add reminder scheduler
- [x] Add tests for all endpoints

### ✅ Frontend API Client
- [x] Extend `apiClient.ts` with deadline methods
- [x] Add TypeScript interfaces to `api.ts`
- [x] Add error handling for all endpoints

### 🔄 Components (In Progress)
- [ ] DeadlineCalendar component
- [ ] DeadlineList component
- [ ] DeadlineForm component
- [ ] DeadlineWidget component
- [ ] DeadlineBadge component
- [ ] DeadlinePriorityBadge component

### ⏳ Testing
- [ ] Test deadline CRUD with backend
- [ ] Test upcoming deadlines query
- [ ] Test overdue deadlines query
- [ ] Test by-date query
- [ ] Test mark complete
- [ ] Test snooze
- [ ] Test reminder creation
- [ ] Test calendar view
- [ ] Test list view filters
- [ ] Test form validation
- [ ] Test error scenarios

---

## Error Handling

### Common Errors

**401 Unauthorized:**
```typescript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session"
  }
}
```

**404 Not Found:**
```typescript
{
  "success": false,
  "error": {
    "code": "DEADLINE_NOT_FOUND",
    "message": "Deadline with ID 123 not found"
  }
}
```

**422 Validation Error:**
```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid deadline data",
    "details": {
      "title": "Title is required",
      "deadlineDate": "Must be a valid ISO 8601 date"
    }
  }
}
```

**500 Internal Server Error:**
```typescript
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Error Handling Pattern

```typescript
try {
  const response = await apiClient.deadlines.create(data);

  if (!response.success) {
    // Handle API error
    toast.error(response.error.message);
    return;
  }

  // Success
  toast.success('Deadline created successfully');

} catch (error) {
  // Handle network error
  console.error('Failed to create deadline:', error);
  toast.error('Failed to create deadline. Please try again.');
}
```

---

## Testing Examples

### Test 1: Create Deadline

**Steps:**
1. Start backend: `cd backend && python -m uvicorn main:app --reload --port 8000`
2. Login to get session ID
3. Create deadline:

```bash
curl -X POST http://127.0.0.1:8000/deadlines \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "title": "File motion to dismiss",
    "deadlineDate": "2025-02-01T09:00:00",
    "priority": "high",
    "caseId": 5,
    "reminderDaysBefore": 3
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "File motion to dismiss",
    "deadlineDate": "2025-02-01T09:00:00Z",
    "priority": "high",
    "status": "pending",
    "completed": false,
    "reminderEnabled": true,
    "reminderDaysBefore": 3,
    "createdAt": "2025-01-13T10:00:00Z",
    "updatedAt": "2025-01-13T10:00:00Z"
  }
}
```

---

### Test 2: Get Upcoming Deadlines

```bash
curl -X GET "http://127.0.0.1:8000/deadlines/upcoming?days=7" \
  -H "X-Session-Id: YOUR_SESSION_ID"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "File motion to dismiss",
        "deadlineDate": "2025-02-01T09:00:00Z",
        "priority": "high",
        "status": "upcoming",
        "daysUntil": 5,
        "caseTitle": "Smith v. ABC Corp"
      }
    ],
    "total": 1,
    "overdueCount": 0
  }
}
```

---

### Test 3: Mark Deadline as Complete

```bash
curl -X POST http://127.0.0.1:8000/deadlines/1/complete \
  -H "X-Session-Id: YOUR_SESSION_ID"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "File motion to dismiss",
    "status": "completed",
    "completed": true,
    "completedAt": "2025-01-13T15:30:00Z"
  }
}
```

---

## Performance Considerations

### Database Indexes
Ensure these indexes exist for optimal performance:

```sql
CREATE INDEX idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX idx_deadlines_deadline_date ON deadlines(deadline_date);
CREATE INDEX idx_deadlines_status ON deadlines(status);
CREATE INDEX idx_deadlines_user_status ON deadlines(user_id, status);
```

### Caching Strategy
- Cache upcoming deadlines for 5 minutes
- Invalidate cache on deadline create/update/delete
- Use Redis for distributed caching (future)

### Pagination
- Default limit: 50 deadlines
- Max limit: 100 deadlines
- Use offset-based pagination
- Consider cursor-based pagination for large datasets (future)

---

## Future Enhancements

### Phase 2 Features
- [ ] Recurring deadlines (daily, weekly, monthly)
- [ ] Email reminders (via SendGrid or AWS SES)
- [ ] SMS reminders (via Twilio)
- [ ] WebSocket for real-time reminder notifications
- [ ] Deadline templates (e.g., "Motion to Dismiss Template")
- [ ] Deadline dependencies (e.g., "File motion" depends on "Draft motion")
- [ ] Bulk import from CSV/Excel
- [ ] Export to iCal format
- [ ] Integration with Google Calendar / Outlook

### Phase 3 Features
- [ ] AI-powered deadline suggestions based on case type
- [ ] Deadline risk analysis (likelihood of missing)
- [ ] Automatic deadline detection from uploaded documents
- [ ] Court calendar integration (pull hearing dates)
- [ ] Team collaboration (assign deadlines to team members)

---

## Support

**Documentation:**
- API Reference: `/docs` (FastAPI auto-generated)
- Component Storybook: `/storybook` (coming soon)

**Issue Tracking:**
- GitHub Issues: https://github.com/your-repo/justice-companion/issues
- Tag with: `component:deadlines`, `type:bug`, `type:feature`

**Contact:**
- Email: support@justicecompanion.com
- Slack: #deadlines-support

---

## Changelog

### v1.0.0 (2025-11-13)
- ✅ Migrated deadline IPC to HTTP REST API
- ✅ Added deadline CRUD endpoints
- ✅ Added upcoming/overdue queries
- ✅ Added mark complete and snooze endpoints
- ✅ Added reminder system backend
- 🔄 Creating React components (in progress)

---

**Migration Status:** 70% Complete
**Estimated Completion:** 2025-11-15
**Next Steps:** Complete React components and E2E testing
