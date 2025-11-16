# Case Templates Feature

**Status:** Core Implementation Complete
**Version:** 1.0.0
**Wave:** 5 - Task 3

## Overview

The Case Templates system allows users to quickly create new cases using pre-configured templates with suggested evidence types, timeline milestones, and checklists. The system includes 8 built-in templates for common legal scenarios and supports custom user templates.

## Architecture

### Database Layer

**Migration:** `src/db/migrations/020_create_templates_system.sql`

Two tables:

- `case_templates` - Stores template definitions (system + user-created)
- `template_usage` - Tracks template usage and success rates

**Key Features:**

- System templates (built-in, immutable)
- User templates (custom, editable)
- JSON fields for flexible template data
- Usage tracking with success rate calculations

### Data Layer

**Models:** `src/models/CaseTemplate.ts`

Core types:

- `CaseTemplate` - Main template entity
- `TemplateFields` - Case pre-fill data
- `TimelineMilestone` - Deadline templates
- `ChecklistItem` - Task templates
- `TemplateWithStats` - Template + usage statistics

**Repository:** `src/repositories/TemplateRepository.ts`

Extends `BaseRepository` with:

- `findAllTemplates(userId)` - Get all visible templates
- `findWithFilters(filters)` - Advanced search
- `create()` / `createSystemTemplate()` - Template creation
- `recordUsage()` - Track template applications
- `getStats()` - Usage statistics
- `getMostPopular()` - Top templates by usage

### Business Logic Layer

**Service:** `src/services/TemplateService.ts`

Orchestrates template operations:

- CRUD operations with authorization
- Template application to cases
- Automatic deadline creation from milestones
- Usage tracking and statistics

**Seeder:** `src/services/TemplateSeeder.ts`

Seeds 8 built-in templates:

1. **Civil Litigation - Contract Dispute**
2. **Personal Injury Claim**
3. **Employment Tribunal**
4. **Housing Possession Defense**
5. **Family Court - Divorce**
6. **Immigration Appeal**
7. **Landlord-Tenant Dispute**
8. **Debt Recovery**

### IPC Layer

**Handlers:** `electron/ipc-handlers/templates.ts`

13 IPC handlers:

- `templates:get-all` - List all templates
- `templates:get-all-with-stats` - List with usage stats
- `templates:get-by-id` - Get single template
- `templates:get-by-category` - Filter by category
- `templates:search` - Advanced search
- `templates:get-popular` - Most used templates
- `templates:create` - Create custom template
- `templates:update` - Update user template
- `templates:delete` - Delete user template
- `templates:apply` - Create case from template
- `templates:get-stats` - Get usage statistics
- `templates:get-usage-history` - Get usage log
- `templates:seed-defaults` - Seed built-in templates

**Window API:** Added to `src/types/window.d.ts`

TypeScript interface: `window.justiceAPI.templates.*`

### UI Layer

**Components:**

1. **TemplateCard** (`src/components/templates/TemplateCard.tsx`)
   - Displays template with stats
   - Category badge
   - Feature indicators (milestones, checklists, evidence)
   - Usage stats (count, success rate)
   - Actions: Use Template, Preview

2. **TemplateLibrary** (`src/components/templates/TemplateLibrary.tsx`)
   - Full-screen modal library
   - Search and filter templates
   - Category filter (7 categories)
   - View mode toggle (grid/list)
   - System/custom filter
   - Create custom template button

**Pending Components:**

- `TemplateBuilderDialog` - Multi-step wizard for creating templates
- `TemplatePreviewDialog` - Detailed template preview with timeline visualization

## Built-In Templates

### 1. Civil Litigation - Contract Dispute

**Category:** Civil
**Case Type:** Consumer
**Milestones:** 4 (Letter Before Claim → Court Filing)
**Checklist:** 4 items
**Evidence:** Contract docs, correspondence, invoices, witness statements

**Timeline:**

- Day 7: Letter Before Claim
- Day 21: Defendant Response Deadline
- Day 30: Prepare Claim Form (N1)
- Day 45: File Court Claim

### 2. Personal Injury Claim

**Category:** Civil
**Case Type:** Other
**Milestones:** 4 (Medical Records → Tribunal Hearing)
**Checklist:** 4 items
**Evidence:** Medical records, accident reports, photos, witness statements

**Timeline:**

- Day 7: Obtain medical records
- Day 14: Instruct medical expert
- Day 30: Send Letter of Claim
- Day 51: Defendant Response

### 3. Employment Tribunal

**Category:** Employment
**Case Type:** Employment
**Milestones:** 4 (ACAS Conciliation → Employer Response)
**Checklist:** 4 items
**Evidence:** Employment contract, payslips, emails, disciplinary records

**Timeline:**

- Day 7: Submit ACAS Early Conciliation
- Day 37: Obtain ACAS Certificate
- Day 44: File ET1 Form (strict deadline)
- Day 72: Employer Response (ET3)

### 4. Housing Possession Defense

**Category:** Housing
**Case Type:** Housing
**Milestones:** 4 (File Defense → First Hearing)
**Checklist:** 4 items
**Evidence:** Tenancy agreement, rent records, Section 21/8 notice, deposit cert

**Timeline:**

- Day 1: Obtain legal advice (URGENT)
- Day 3: Check deposit protection
- Day 7: File Defense Form
- Day 42: First Hearing

### 5. Family Court - Divorce

**Category:** Family
**Case Type:** Family
**Milestones:** 4 (Application → Final Order)
**Checklist:** 4 items
**Evidence:** Marriage certificate, Form E, valuations, pension statements

**Timeline:**

- Day 7: Submit Online Divorce Application
- Day 21: Serve Respondent
- Day 140: Conditional Order (20-week reflection)
- Day 182: Final Order (6 weeks + 1 day)

### 6. Immigration Appeal

**Category:** Immigration
**Case Type:** Other
**Milestones:** 4 (File Appeal → Tribunal Hearing)
**Checklist:** 4 items
**Evidence:** Home Office letter, passport, sponsor docs, country reports

**Timeline:**

- Day 7: File Notice of Appeal (14-day deadline)
- Day 28: Home Office Review
- Day 42: Submit Skeleton Argument
- Day 120: Tribunal Hearing

### 7. Landlord-Tenant Dispute

**Category:** Housing
**Case Type:** Housing
**Milestones:** 4 (Raise Issue → County Court Claim)
**Checklist:** 4 items
**Evidence:** Tenancy agreement, inventory, photos, repair requests

**Timeline:**

- Day 3: Raise issue with landlord
- Day 21: Landlord Response Period
- Day 30: Initiate Deposit Scheme ADR
- Day 60: Submit County Court Claim

### 8. Debt Recovery

**Category:** Civil
**Case Type:** Debt
**Milestones:** 4 (Letter Before Action → Debtor Defense Deadline)
**Checklist:** 4 items
**Evidence:** Invoice/loan agreement, proof of delivery, payment reminders

**Timeline:**

- Day 7: Send Letter Before Action
- Day 21: Debtor Payment Deadline
- Day 28: Issue County Court Claim (MCOL)
- Day 42: Debtor Defense Deadline

## Usage

### For Users

**1. Browse Templates:**

```typescript
// Open template library
<TemplateLibrary
  sessionId={sessionId}
  onUseTemplate={handleUseTemplate}
  onPreviewTemplate={handlePreview}
  onCreateCustomTemplate={handleCreate}
  onClose={handleClose}
/>
```

**2. Apply Template to Case:**

```typescript
const response = await window.justiceAPI.templates.apply(templateId, sessionId);

if (response.success) {
  console.log("Case created:", response.data.case);
  console.log("Milestones created:", response.data.appliedMilestones);
  console.log("Checklist:", response.data.appliedChecklistItems);
}
```

**3. Create Custom Template:**

```typescript
const input: CreateTemplateInput = {
  name: "My Custom Template",
  category: "civil",
  templateFields: {
    titleTemplate: "[Client] - Custom Case",
    descriptionTemplate: "Description...",
    caseType: "consumer",
    defaultStatus: "active",
  },
  suggestedEvidenceTypes: ["Custom evidence"],
  timelineMilestones: [
    {
      title: "Key Date",
      description: "Important milestone",
      daysFromStart: 30,
      isRequired: true,
      category: "deadline",
    },
  ],
  checklistItems: [
    {
      title: "Task 1",
      description: "Complete this task",
      category: "research",
      priority: "high",
    },
  ],
};

const response = await window.justiceAPI.templates.create(input, sessionId);
```

### For Developers

**1. Seed Built-In Templates:**

```bash
# Via IPC handler
await window.justiceAPI.templates.seedDefaults();
```

**2. Add New System Template:**

Edit `src/services/TemplateSeeder.ts`:

```typescript
private newTemplate(): CreateTemplateInput {
  return {
    name: 'New Template',
    description: 'Description...',
    category: 'civil',
    templateFields: { /* ... */ },
    suggestedEvidenceTypes: [],
    timelineMilestones: [],
    checklistItems: [],
  };
}

// Add to getBuiltInTemplates():
private getBuiltInTemplates(): CreateTemplateInput[] {
  return [
    // existing templates...
    this.newTemplate(),
  ];
}
```

**3. Query Templates:**

```typescript
// Search with filters
const response = await window.justiceAPI.templates.search({
  category: "housing",
  isSystemTemplate: true,
  searchQuery: "possession",
});

// Get popular templates
const popular = await window.justiceAPI.templates.getPopular(5, sessionId);

// Get stats
const stats = await window.justiceAPI.templates.getStats(templateId);
console.log(`Usage: ${stats.usageCount}, Success Rate: ${stats.successRate}%`);
```

## Template Application Flow

When a user applies a template:

1. **Template Retrieved:** `TemplateService.applyTemplateToCase()`
2. **Case Created:** Using `templateFields` (title, description, type)
3. **Deadlines Created:** Each `TimelineMilestone` becomes a `Deadline`
   - `daysFromStart` converts to actual due date
   - `isRequired` → `priority: 'high'`
4. **Checklist Returned:** `checklistItems` returned to UI (not stored yet)
5. **Usage Tracked:** `template_usage` record created
6. **Result:** Returns `TemplateApplicationResult` with case, milestones, checklist

## Security & Authorization

- **System Templates:** Read-only for all users
- **User Templates:** Only owner can edit/delete
- **Template Application:** Requires valid session
- **Audit Logging:** All operations logged via `AuditLogger`

## Database Schema

```sql
-- case_templates table
id INTEGER PRIMARY KEY
name TEXT NOT NULL
description TEXT
category TEXT CHECK(IN 'civil', 'criminal', 'family', ...)
is_system_template INTEGER (0 or 1)
user_id INTEGER (NULL for system)
template_fields_json TEXT
suggested_evidence_types_json TEXT
timeline_milestones_json TEXT
checklist_items_json TEXT
created_at DATETIME
updated_at DATETIME

-- template_usage table
id INTEGER PRIMARY KEY
template_id INTEGER FK
user_id INTEGER FK
case_id INTEGER FK (NULL if failed)
used_at DATETIME

-- Indexes
idx_templates_user
idx_templates_category
idx_templates_system
idx_usage_template
idx_usage_user
```

## Future Enhancements

1. **TemplateBuilderDialog** - Multi-step wizard UI for creating custom templates
2. **TemplatePreviewDialog** - Visual timeline and detailed preview
3. **Template Sharing** - Export/import templates between users
4. **Template Marketplace** - Community-contributed templates
5. **Template Analytics** - Success metrics, average case duration
6. **Template Versioning** - Track changes to system templates
7. **AI Template Suggestions** - ML-based template recommendations
8. **Template Duplication** - Clone and modify existing templates
9. **Template Tags** - Additional categorization beyond category field
10. **Template Favorites** - User-specific template bookmarking

## Testing

### Unit Tests (Pending)

**TemplateService Tests:** `src/services/TemplateService.test.ts`

- ✓ Create template with validation
- ✓ Update template with authorization
- ✓ Delete template (only owner)
- ✓ Apply template creates case + deadlines
- ✓ Track usage and calculate stats
- ✓ Search/filter templates

**TemplateRepository Tests:** `src/repositories/TemplateRepository.test.ts`

- ✓ CRUD operations
- ✓ Filter by category
- ✓ System vs user templates
- ✓ Usage tracking
- ✓ Statistics calculation

**UI Component Tests:**

- `TemplateCard.test.tsx` - Card rendering and interactions
- `TemplateLibrary.test.tsx` - Search, filters, view modes

### Integration Tests

Run migration and seed:

```bash
pnpm db:migrate
# Then seed via IPC or direct call
```

## Performance Considerations

- **JSON Parsing:** Template data stored as JSON strings (parse on read)
- **Usage Stats:** Calculated query (not cached) - consider caching for popular templates
- **Search:** Full-text search on name/description (consider FTS if slow)
- **Pagination:** Not implemented yet - all templates loaded at once (acceptable for <100 templates)

## File Structure

```
src/
  models/
    CaseTemplate.ts              # TypeScript interfaces
  repositories/
    TemplateRepository.ts        # Data access layer
  services/
    TemplateService.ts           # Business logic
    TemplateSeeder.ts            # Built-in templates
  components/
    templates/
      TemplateCard.tsx           # Template card UI
      TemplateLibrary.tsx        # Template browser
      TemplateBuilderDialog.tsx  # (Pending) Create wizard
      TemplatePreviewDialog.tsx  # (Pending) Preview modal
      README.md                  # This file
  types/
    window.d.ts                  # IPC type definitions
  db/
    migrations/
      020_create_templates_system.sql

electron/
  ipc-handlers/
    templates.ts                 # IPC handler implementations
```

## Dependencies

- `better-sqlite3` - Database
- `framer-motion` - UI animations
- `lucide-react` - Icons
- `BaseRepository` - Repository pattern
- `AuditLogger` - Security auditing
- `CaseRepository` - Case creation
- `DeadlineRepository` - Milestone creation

## Related Features

- **Cases View** - Template library integration (pending)
- **Deadline Management** - Auto-created from milestones
- **Audit Logs** - Template usage tracking
- **User Sessions** - Authorization for custom templates

## Support

For questions or issues:

- Check CLAUDE.md for project architecture
- Review existing templates in `TemplateSeeder.ts`
- Test with seed command: `templates:seed-defaults`

---

**Implementation Status:**

- ✅ Database migration
- ✅ Models and types
- ✅ Repository layer
- ✅ Service layer
- ✅ 8 built-in templates
- ✅ IPC handlers
- ✅ Window.d.ts types
- ✅ TemplateCard UI
- ✅ TemplateLibrary UI
- ⏳ TemplateBuilderDialog (pending)
- ⏳ TemplatePreviewDialog (pending)
- ⏳ Preload.ts bridges (pending)
- ⏳ CasesView integration (pending)
- ⏳ Unit tests (pending)
