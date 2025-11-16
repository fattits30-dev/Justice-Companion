# Cases Domain

## Overview

The Cases domain is responsible for managing legal cases within the Justice Companion application. It provides core functionality for case creation, management, facts tracking, and status transitions.

## Domain Components

### Entities

- **Case** (`entities/Case.ts`): Core entity representing a legal case with properties like title, description, type, and status
- **CaseFact** (`entities/CaseFact.ts`): Facts related to a case, categorized by type (timeline, evidence, witness, etc.) and importance level

### Value Objects

- **CaseStatus** (`value-objects/CaseStatus.ts`): Encapsulates case status validation and transition rules (active, pending, closed)
- **CaseType** (`value-objects/CaseType.ts`): Validates case types (employment, housing, consumer, etc.) and provides statutory limitation periods

### Domain Events

- **CaseCreated** (`events/CaseCreated.ts`): Fired when a new case is created
- **CaseUpdated** (`events/CaseUpdated.ts`): Fired when case details are modified, includes change tracking

## Business Rules

### Case Status Transitions

- **Pending** → Active or Closed
- **Active** → Closed only
- **Closed** → No transitions allowed (immutable)

### Case Types and Statutory Limitations

- Employment: 90 days (3 months for employment tribunal)
- Housing: 365 days (1 year)
- Consumer: 2190 days (6 years)
- Family: 365 days (1 year)
- Debt: 2190 days (6 years)
- Other: 2190 days (default 6 years)

### Case Facts

- Categories: timeline, evidence, witness, location, communication, other
- Importance levels: low, medium, high, critical
- Facts are immutable once created (audit trail)

## Dependencies

- Requires user authentication (auth domain)
- Integrates with evidence domain for case evidence
- Connects to timeline domain for deadlines and events
- Used by legal-research domain for context

## Security Considerations

- Case titles and descriptions are encrypted at rest
- Access control enforced through user ownership
- Audit logging for all case modifications
- GDPR compliance for personal data in case facts

## Usage Examples

```typescript
import { Case, CaseStatus, CaseType } from "@/domains/cases";

// Create a new case
const newCase: Case = {
  id: 1,
  title: "Unfair Dismissal Claim",
  description: "Wrongful termination from ABC Corp",
  caseType: CaseType.employment().getValue(),
  status: CaseStatus.active().getValue(),
  userId: 123,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Check status transition
const currentStatus = CaseStatus.create(newCase.status);
const canClose = currentStatus.canTransitionTo(CaseStatus.closed()); // true

// Get statutory limitation
const caseType = CaseType.create(newCase.caseType);
const daysLimit = caseType.getStatutoryLimitations(); // 90 days for employment
```

## Testing

- Unit tests for value objects and business rules
- Integration tests for case repository
- E2E tests for case management workflows
- Test coverage target: 80%+

## Future Enhancements

- Case templates for common scenarios
- Bulk case operations
- Case archival after closure
- Advanced case search and filtering
- Case collaboration features
