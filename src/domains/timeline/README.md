# Timeline Domain

## Overview

The Timeline domain manages temporal aspects of legal cases including timeline events, deadlines, milestones, and scheduling with intelligent reminder systems.

## Domain Components

### Entities

- **TimelineEvent** (`entities/TimelineEvent.ts`): Events that occurred in a case chronology
- **Deadline** (`entities/Deadline.ts`): Legal deadlines and milestones with priority and status tracking

### Domain Events

- **DeadlineCreated** (`events/DeadlineCreated.ts`): Fired when a new deadline is set
- **DeadlineCompleted** (`events/DeadlineCompleted.ts`): Fired when a deadline is marked complete

## Business Rules

### Deadline Management

#### Priority Levels
- **High**: Critical legal deadlines (court dates, filing deadlines)
- **Medium**: Important but flexible deadlines
- **Low**: Informational dates and reminders

#### Status States
- **Upcoming**: Future deadline not yet due
- **Overdue**: Past deadline not completed
- **Completed**: Deadline marked as done

#### Urgency Rules
- Urgent: Deadline within 7 days
- Critical: Deadline within 3 days
- Today: Due today (highest alert)
- Overdue: Immediate attention required

### Timeline Event Rules
- Events are immutable once created
- Events must have a date and title
- Events linked to specific case
- Chronological ordering enforced

## Key Features

### Intelligent Reminders
- 30 days before: Initial reminder
- 14 days before: Follow-up reminder
- 7 days before: Urgent reminder
- 3 days before: Critical reminder
- Day of: Final reminder
- Overdue: Daily reminders

### Statutory Deadline Tracking
- Employment tribunal: 3 months
- Housing disputes: 1 year
- Consumer claims: 6 years
- Automatic calculation from incident date
- Warning when approaching limitation

### Calendar Integration (Planned)
- Export to iCal format
- Google Calendar sync
- Outlook integration
- Mobile notifications

## Dependencies

- Cases domain (deadlines belong to cases)
- Notification service for reminders
- Audit logging for deadline changes
- User preferences for reminder settings

## Usage Examples

```typescript
import { Deadline, DeadlineCreated, DeadlineCompleted } from '@/domains/timeline';
import { getDaysUntilDeadline, isDeadlineUrgent, formatDeadlineStatus } from '@/domains/timeline';

// Create a deadline
const deadline: Deadline = {
  id: 1,
  caseId: 42,
  userId: 123,
  title: 'Submit ET1 Form',
  description: 'Employment tribunal claim form',
  deadlineDate: '2024-03-15',
  priority: 'high',
  status: 'upcoming',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Check deadline urgency
const daysLeft = getDaysUntilDeadline(deadline.deadlineDate);
const isUrgent = isDeadlineUrgent(deadline.deadlineDate);
const statusText = formatDeadlineStatus(deadline);

// Create deadline event
const createdEvent = DeadlineCreated.fromEntity(deadline);
console.log(createdEvent.isHighPriority()); // true
console.log(createdEvent.isUrgent()); // depends on date

// Complete deadline
deadline.status = 'completed';
deadline.completedAt = new Date().toISOString();
const completedEvent = DeadlineCompleted.fromEntity(deadline);
console.log(completedEvent.wasCompletedLate()); // false if on time
```

## Deadline Calculation Helpers

```typescript
// Calculate working days (excluding weekends)
function getWorkingDaysUntil(date: string): number;

// Add working days to a date
function addWorkingDays(date: Date, days: number): Date;

// Check if date is a UK bank holiday
function isBankHoliday(date: Date): boolean;

// Get next working day
function getNextWorkingDay(date: Date): Date;
```

## Testing

- Unit tests for date calculations
- Integration tests for deadline repository
- E2E tests for timeline management
- Mock date/time for consistent testing
- Test coverage target: 85%+

## Performance Considerations

- Indexed by deadline date for quick queries
- Cached upcoming deadlines (next 30 days)
- Batch reminder processing
- Optimized queries for overdue checks

## Future Enhancements

- Recurring deadlines
- Deadline templates by case type
- Team deadline assignments
- Deadline dependencies and chains
- Court calendar integration
- Automatic deadline calculation from case events
- Machine learning for deadline prediction
- Integration with legal practice management systems