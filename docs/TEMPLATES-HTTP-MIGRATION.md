# Templates HTTP API Migration Guide

**Status:** ✅ Complete
**Migration Date:** 2025-11-13
**Components Migrated:** TemplateLibrary, TemplateCard

---

## Overview

This document details the migration of Justice Companion's Templates feature from Electron IPC to FastAPI HTTP REST API. The migration provides improved scalability, better error handling, and separation of concerns between frontend and backend.

## Architecture Changes

### Before (Electron IPC)
```typescript
// Direct IPC communication
const response = await window.justiceAPI.templates.getAllWithStats(sessionId);
```

### After (HTTP REST)
```typescript
// HTTP API client
const response = await apiClient.templates.list(category);
```

---

## HTTP API Endpoints

All template endpoints are available at `http://localhost:8000/templates` with session-based authentication via `X-Session-Id` header.

### List Templates
**GET** `/templates?category=civil`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Civil Litigation - Contract Dispute",
      "description": "Template for breach of contract cases",
      "category": "civil",
      "isSystemTemplate": true,
      "userId": null,
      "templateFields": {
        "titleTemplate": "[Client] vs [Defendant] - Contract Dispute",
        "descriptionTemplate": "...",
        "caseType": "civil",
        "defaultStatus": "active"
      },
      "suggestedEvidenceTypes": ["contract", "correspondence", "payment_records"],
      "timelineMilestones": [...],
      "checklistItems": [...],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  ]
}
```

### Get Single Template
**GET** `/templates/{id}`

Returns single template with all details.

### Create Template
**POST** `/templates`

**Request Body:**
```json
{
  "name": "My Custom Template",
  "description": "Custom template for employment cases",
  "category": "employment",
  "templateFields": {
    "titleTemplate": "[Client] vs [Employer]",
    "descriptionTemplate": "Employment dispute case",
    "caseType": "employment",
    "defaultStatus": "active"
  },
  "suggestedEvidenceTypes": ["contract", "payslips"],
  "timelineMilestones": [
    {
      "title": "File ET1 form",
      "description": "Submit employment tribunal claim",
      "daysFromStart": 7,
      "isRequired": true,
      "category": "filing"
    }
  ],
  "checklistItems": [
    {
      "title": "Gather employment contract",
      "description": "Obtain signed employment contract",
      "category": "evidence",
      "priority": "high",
      "daysFromStart": 3
    }
  ]
}
```

### Update Template
**PUT** `/templates/{id}`

Partial update - only include fields to change.

### Delete Template
**DELETE** `/templates/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": 42
  }
}
```

### Apply Template
**POST** `/templates/{id}/apply`

**Request Body:**
```json
{
  "variables": {
    "Client": "John Doe",
    "Defendant": "Acme Corp",
    "ContractDate": "2023-05-15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "case": {
      "id": 123,
      "title": "John Doe vs Acme Corp - Contract Dispute",
      "description": "...",
      "caseType": "civil",
      "status": "active"
    },
    "appliedMilestones": [
      {
        "id": 456,
        "title": "File claim",
        "dueDate": "2025-11-20T00:00:00Z"
      }
    ],
    "appliedChecklistItems": [...],
    "templateId": 1,
    "templateName": "Civil Litigation - Contract Dispute"
  }
}
```

### Seed System Templates
**POST** `/templates/seed`

Idempotent operation to seed 8 built-in UK legal templates:
1. Civil Litigation - Contract Dispute
2. Personal Injury Claim
3. Employment Tribunal Claim
4. Housing Possession Defense
5. Family Court - Divorce Petition
6. Immigration Appeal (First-tier Tribunal)
7. Landlord-Tenant Dispute
8. Debt Recovery Action

**Response:**
```json
{
  "success": true,
  "message": "Template seeding complete: 8 seeded, 0 skipped, 0 failed",
  "stats": {
    "seeded": 8,
    "skipped": 0,
    "failed": 0
  }
}
```

---

## Type Definitions

All type definitions are in `src/lib/types/api.ts`:

```typescript
export type TemplateCategory =
  | "civil"
  | "criminal"
  | "family"
  | "employment"
  | "housing"
  | "immigration"
  | "other";

export interface Template {
  id: number;
  name: string;
  description: string | null;
  category: TemplateCategory;
  isSystemTemplate: boolean;
  userId: number | null;
  templateFields: TemplateFields;
  suggestedEvidenceTypes: string[];
  timelineMilestones: TimelineMilestone[];
  checklistItems: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFields {
  titleTemplate: string;
  descriptionTemplate: string;
  caseType: CaseType;
  defaultStatus: CaseStatus;
  customFields?: Record<string, string>;
}

export interface TimelineMilestone {
  title: string;
  description: string;
  daysFromStart: number;
  isRequired: boolean;
  category: "filing" | "hearing" | "deadline" | "meeting" | "other";
}

export interface ChecklistItem {
  title: string;
  description: string;
  category: "evidence" | "filing" | "communication" | "research" | "other";
  priority: "low" | "medium" | "high";
  daysFromStart?: number;
}
```

---

## Migrated Components

### TemplateLibrary Component

**Location:** `src/components/templates/TemplateLibrary.tsx`

**Changes:**
- ❌ Removed: `sessionId` prop (managed by `apiClient`)
- ✅ Added: HTTP API calls via `apiClient.templates.list()`
- ✅ Added: Enhanced error states with retry button
- ✅ Added: Footer with template count
- ✅ Improved: Loading and empty states

**Usage:**
```tsx
import { TemplateLibrary } from './components/templates/TemplateLibrary.tsx';

<TemplateLibrary
  onUseTemplate={(id) => handleApplyTemplate(id)}
  onPreviewTemplate={(id) => handlePreviewTemplate(id)}
  onCreateCustomTemplate={() => navigate('/templates/new')}
  onClose={() => setShowLibrary(false)}
/>
```

### TemplateCard Component

**Location:** `src/components/templates/TemplateCard.tsx`

**Changes:**
- ✅ Updated: Type imports from `src/lib/types/api.ts`
- ✅ Compatible with both `Template` and `TemplateWithStats` types
- ✅ Improved: Animations with Framer Motion
- ✅ Enhanced: Visual styling with Tailwind CSS

**Features:**
- Category badges with color coding
- "Official" badge for system templates
- Milestone, checklist, and evidence type counts
- Optional usage statistics
- Preview and "Use Template" actions

---

## API Client Usage

The `apiClient` is configured in `src/lib/apiClient.ts` and provides typed methods for all template operations:

```typescript
import { apiClient } from '@/lib/apiClient.ts';

// List all templates
const response = await apiClient.templates.list();

// List templates by category
const civilTemplates = await apiClient.templates.list('civil');

// Get single template
const template = await apiClient.templates.get(1);

// Create template
const newTemplate = await apiClient.templates.create({
  name: "Custom Template",
  category: "civil",
  templateFields: {...},
  // ... other fields
});

// Update template
const updated = await apiClient.templates.update(1, {
  name: "Updated Name",
});

// Delete template
await apiClient.templates.delete(1);

// Apply template to create case
const result = await apiClient.templates.apply(1, {
  "Client": "John Doe",
  "Defendant": "Jane Smith",
});

// Seed system templates (admin)
await apiClient.templates.seed();
```

---

## Variable Substitution

Templates support variable substitution using `[VariableName]` syntax:

**Template:**
```
Title: [Client] vs [Defendant] - Contract Dispute
Description: Case regarding breach of contract dated [ContractDate]
```

**Variables:**
```json
{
  "Client": "John Doe",
  "Defendant": "Acme Corp",
  "ContractDate": "2023-05-15"
}
```

**Result:**
```
Title: John Doe vs Acme Corp - Contract Dispute
Description: Case regarding breach of contract dated 2023-05-15
```

---

## Error Handling

All HTTP API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template with ID 999 not found",
    "details": { ... }
  }
}
```

**Client-Side Handling:**
```typescript
try {
  const response = await apiClient.templates.get(templateId);

  if (response.success && response.data) {
    setTemplate(response.data);
  } else {
    setError(response.error?.message || "Failed to load template");
  }
} catch (err) {
  console.error("[Templates] Error:", err);
  setError(err instanceof Error ? err.message : "Unknown error");
}
```

---

## Testing Checklist

### Manual Testing (with backend running at `http://localhost:8000`)

#### Template CRUD
- [x] List all templates
- [x] List templates by category (civil, employment, etc.)
- [x] Get single template by ID
- [x] Create new custom template
- [x] Update existing template (user-owned only)
- [x] Delete template (user-owned only, cannot delete system templates)

#### Template Features
- [x] Search templates by name/description
- [x] Filter by category
- [x] Filter "System only"
- [x] Toggle grid/list view
- [x] Display template details (milestones, checklists, evidence types)

#### Template Application
- [x] Apply template to create case
- [x] Variable substitution works correctly
- [x] Milestones created with correct due dates (daysFromStart)
- [x] Checklist items copied to new case

#### Error Scenarios
- [x] Invalid template ID returns 404
- [x] Unauthorized access returns 401
- [x] Cannot update/delete system templates
- [x] Cannot update/delete other users' templates
- [x] Invalid session redirects to login
- [x] Network errors handled gracefully

#### UI/UX
- [x] Loading states displayed correctly
- [x] Error states displayed with retry button
- [x] Empty state displayed when no templates
- [x] Template count displayed in footer
- [x] Animations smooth (Framer Motion)
- [x] Responsive design (mobile, tablet, desktop)

---

## Migration Benefits

### Performance
- ✅ Reduced memory usage (no Electron IPC overhead)
- ✅ Better request caching via HTTP
- ✅ Async/await error handling

### Scalability
- ✅ Backend can scale independently
- ✅ Supports future web app version
- ✅ Rate limiting and request throttling

### Developer Experience
- ✅ Type-safe API calls with TypeScript
- ✅ Centralized error handling
- ✅ Automatic retry logic (3 retries with exponential backoff)
- ✅ Request/response logging

### Security
- ✅ Session-based authentication
- ✅ Authorization checks (user cannot modify system templates)
- ✅ Input validation with Pydantic (backend)
- ✅ SQL injection prevention (SQLAlchemy ORM)

---

## Troubleshooting

### Templates not loading
**Symptom:** Empty list or error message
**Solution:**
1. Verify backend is running: `http://localhost:8000/docs`
2. Check session ID is set: `apiClient.setSessionId(sessionId)`
3. Verify user is authenticated
4. Check browser console for API errors

### Template apply fails
**Symptom:** Error when applying template
**Solution:**
1. Verify all required variables are provided
2. Check variable names match template placeholders exactly (case-sensitive)
3. Ensure template exists and user has access
4. Verify case creation permissions

### Cannot update/delete template
**Symptom:** 403 Forbidden error
**Solution:**
1. System templates cannot be modified
2. User can only modify their own templates
3. Check `template.isSystemTemplate === false`
4. Check `template.userId === currentUserId`

### Type errors
**Symptom:** TypeScript compilation errors
**Solution:**
1. Ensure all imports use `.ts` extension
2. Verify types are imported from `src/lib/types/api.ts`
3. Run `npm run type-check` to identify issues

---

## Future Enhancements

### Not Yet Implemented (Future Scope)

#### Template Editor Component
- Visual template editor with live preview
- Variable insertion helper
- Syntax highlighting for template placeholders
- Drag-and-drop milestone reordering

#### Template Generator Component
- Form-based template application
- Auto-populate variables from case context
- Preview generated content before creating case
- Support for conditional fields

#### Variable Inserter Component
- Dropdown with common variables grouped by category
- Click to insert at cursor position
- Custom variable input
- Variable validation

#### Template Import/Export
- Export template to JSON file
- Import template from JSON file
- Duplicate template with new name
- Share templates between users (future)

#### Template Statistics
- Usage analytics (most used templates)
- Success rate tracking
- Average case duration from template
- User ratings and feedback

---

## API Documentation

Full API documentation is available at:
- **Interactive Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI Schema:** http://localhost:8000/openapi.json

---

## Conclusion

The Templates feature has been successfully migrated from Electron IPC to HTTP REST API. The migration provides a solid foundation for future enhancements while maintaining backward compatibility with existing template data.

**Next Steps:**
1. Implement TemplateEditor component with live preview
2. Create TemplateGenerator component for applying templates
3. Add template import/export functionality
4. Implement template statistics and analytics

For questions or issues, refer to the main project documentation or contact the development team.
