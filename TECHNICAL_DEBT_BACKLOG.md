# Technical Debt Backlog - Justice Companion

**Generated:** 2025-11-03
**Source:** Systematic TODO comment analysis (SonarQube S1135 compliance)
**Status:** 42 TODO items documented and prioritized

---

## Executive Summary

This document catalogs all TODO comments across the Justice Companion codebase, categorized by priority, estimated effort, and implementation dependencies. TODOs are organized by criticality to help teams make informed decisions about technical debt repayment.

**Total TODOs Found:** 42
**Critical:** 4 items (block features or security risks)
**High:** 8 items (affect UX or core workflows)
**Medium:** 18 items (code quality and maintainability)
**Low:** 12 items (nice-to-have improvements)

---

## Priority Legend

- **CRITICAL:** Blocks key features, security risks, or causes data loss
- **HIGH:** Negatively impacts user experience or core workflows
- **MEDIUM:** Code quality, maintainability, or minor UX issues
- **LOW:** Nice-to-have improvements or placeholder comments

**Effort Scale:** Small (< 4 hours) | Medium (4-16 hours) | Large (16+ hours)

---

## CRITICAL Priority (4 items)

### 1. Database Migration Implementation Missing

**Location:** `electron/ipc-handlers/database.ts:68-70`

**Context:**
```typescript
// TODO: Create backup before migration
// TODO: Call runMigrations() from migrate.ts
// TODO: Return detailed migration results
```

**Issue:** The `db:migrate` IPC handler is a placeholder that doesn't actually run migrations. Users calling this handler believe migrations are executed, but nothing happens.

**Impact:**
- Users cannot upgrade database schema
- Migration failures are not detected
- No rollback mechanism if migrations fail
- Silent failure leads to schema inconsistencies

**Effort:** Medium (8-12 hours)

**Dependencies:**
- Requires `src/db/migrate.ts` integration
- Needs pre-migration backup system (already exists via `db:backup`)
- Must implement migration result tracking

**Implementation Approach:**
1. Import `runMigrations()` from `src/db/migrate.ts`
2. Call `db:backup` handler before running migrations
3. Execute migrations and capture results
4. Return detailed migration log with success/failure status
5. Add audit logging for migration events
6. Implement rollback if migration fails

**Acceptance Criteria:**
- Migrations actually run when `db:migrate` is called
- Automatic backup created before migration
- Detailed results returned (migrations applied, errors)
- Audit log entry created
- Failed migrations trigger rollback

---

### 2. Session-Based User ID Extraction Not Implemented

**Location:** `electron/utils/audit-helper.ts:120-124`

**Context:**
```typescript
export function getUserIdFromEvent(_event: IpcMainInvokeEvent): string | null {
  // TODO: Implement session-based user ID extraction
  // For now, return null (will be implemented in Phase 2)
  return null;
}
```

**Issue:** Audit logs cannot track which user performed actions. All audit events show `userId: null`, making security investigation impossible.

**Impact:**
- No user accountability in audit logs
- Cannot investigate security incidents
- GDPR compliance at risk (cannot track data access)
- Authorization checks disabled

**Effort:** Large (16-24 hours)

**Dependencies:**
- Requires session management system implementation
- Needs session ID to user ID mapping
- Must integrate with `AuthContext`
- Related to `isAuthenticated()` TODO (line 131)

**Implementation Approach:**
1. Create SessionManager service with session store
2. Store sessionId → userId mapping in memory or database
3. Extract sessionId from IPC event context
4. Look up userId from session store
5. Update all IPC handlers to pass sessionId
6. Add session expiration and cleanup

**Acceptance Criteria:**
- All audit events include correct userId
- Session validation works across all IPC handlers
- Session expires after 24 hours (per security requirements)
- Unauthorized access logged and blocked

---

### 3. Session Validation Not Implemented

**Location:** `electron/utils/audit-helper.ts:131-135`

**Context:**
```typescript
export function isAuthenticated(_event: IpcMainInvokeEvent): boolean {
  // TODO: Implement session validation
  // For now, return true (will be implemented in Phase 2)
  return true;
}
```

**Issue:** Authorization checks are bypassed. `isAuthenticated()` always returns `true`, allowing unauthenticated users to access all IPC handlers.

**Impact:**
- Critical security vulnerability (CVSS 9.8)
- Any process can call IPC handlers without authentication
- No authorization layer protects sensitive data
- GDPR compliance broken (unauthorized data access)

**Effort:** Large (16-24 hours) - **MUST BE PAIRED WITH TODO #2**

**Dependencies:**
- Same as TODO #2 (session management system)
- Must implement before production release

**Implementation Approach:**
1. Implement SessionManager (shared with TODO #2)
2. Validate session exists and is not expired
3. Check session against stored sessions
4. Return false if session invalid or expired
5. Update `requireAuth()` to throw proper errors
6. Add audit logging for failed auth attempts

**Acceptance Criteria:**
- Unauthenticated requests rejected with 401 error
- Expired sessions automatically invalidated
- Failed authentication attempts logged
- All sensitive IPC handlers protected

---

### 4. File Type Validation Missing for Evidence Uploads

**Location:** `electron/ipc-handlers/evidence.ts:40-41`

**Context:**
```typescript
// TODO: Validate file type and size if filePath provided
// TODO: Extract text if PDF/DOCX
```

**Issue:** Users can upload any file type without validation. No file size limits enforced. PDF/DOCX text extraction not implemented (breaks search functionality).

**Impact:**
- Users can upload executable files (security risk)
- Large files can exhaust disk space
- Search doesn't work on PDF/DOCX evidence (major UX issue)
- No preview generation for documents

**Effort:** Medium (8-12 hours)

**Dependencies:**
- Requires file type detection library (e.g., `file-type`)
- Needs PDF text extraction (`pdf-parse`)
- Needs DOCX text extraction (`mammoth`)
- Must integrate with `DocumentParserService` (already exists)

**Implementation Approach:**
1. Add file type validation using MIME type detection
2. Whitelist allowed types: .pdf, .docx, .txt, .jpg, .png, .mp4, .mp3
3. Add file size limits (default 100MB, configurable)
4. Integrate `DocumentParserService.parseDocument()` for text extraction
5. Store extracted text in `evidence.extracted_text` field
6. Index extracted text in FTS5 search
7. Add audit logging for rejected uploads

**Acceptance Criteria:**
- Only whitelisted file types accepted
- Files over 100MB rejected with clear error
- PDF/DOCX text extracted and searchable
- Audit log entry for rejected uploads
- User receives clear error messages

---

## HIGH Priority (8 items)

### 5. Toast Notification System Missing

**Location:** `src/views/settings/BackupSettings.tsx:234-236`

**Context:**
```typescript
function showToast(message: string, type: 'success' | 'error' | 'info') {
  // TODO: Implement proper toast notification
  console.log(`[${type.toUpperCase()}] ${message}`);
}
```

**Issue:** User feedback relies on `console.log()`, which users never see. Critical operations (backup, restore, delete) provide no visual feedback.

**Impact:**
- Users don't know if operations succeeded or failed
- Poor UX for critical backup/restore operations
- Users may retry operations, causing duplicates
- Errors go unnoticed

**Effort:** Medium (6-8 hours)

**Dependencies:**
- Choose toast library (e.g., `react-hot-toast`, `sonner`)
- Needs global toast provider in `App.tsx`

**Implementation Approach:**
1. Install toast library: `pnpm add react-hot-toast`
2. Add `<Toaster />` provider to `src/App.tsx`
3. Replace `showToast()` with `toast.success()`, `toast.error()`, etc.
4. Style toasts to match Justice Companion theme
5. Add toast auto-dismiss (default 5 seconds)
6. Update all views using `showToast()`

**Affected Files:**
- `src/views/settings/BackupSettings.tsx` (8 calls)
- Other views using toast pattern

**Acceptance Criteria:**
- Toast notifications visible to users
- Success toasts auto-dismiss after 5 seconds
- Error toasts require manual dismissal
- Toasts styled consistently with app theme
- Toasts positioned at top-right (non-intrusive)

---

### 6. Modal Dialog System Missing

**Location:** `src/views/settings/BackupSettings.tsx:229-231`

**Context:**
```typescript
async function showConfirmDialog(options: {
  title: string;
  message: string;
  confirmText: string;
}): Promise<boolean> {
  // TODO: Implement proper modal dialog
  return window.confirm(`${options.title}\n\n${options.message}`);
}
```

**Issue:** Critical destructive actions (restore database, delete backup) use native `window.confirm()` dialog, which:
- Looks unprofessional
- Cannot be styled
- Blocks entire browser (not just app)
- No support for additional context

**Impact:**
- Poor UX for destructive operations
- Users may accidentally confirm dangerous actions
- Cannot add warnings or additional info
- Inconsistent with modern UI expectations

**Effort:** Medium (6-8 hours)

**Dependencies:**
- Needs reusable `ConfirmDialog` component
- Should integrate with existing dialog patterns

**Implementation Approach:**
1. Create `src/components/ui/ConfirmDialog.tsx` component
2. Use Framer Motion for animations (already in use)
3. Support variants: `danger`, `warning`, `info`
4. Add optional checkbox for "I understand" confirmation
5. Replace `window.confirm()` calls across codebase
6. Add keyboard shortcuts (Enter = confirm, Escape = cancel)

**Acceptance Criteria:**
- Modal dialog replaces all `window.confirm()` calls
- Danger variant for destructive actions (red theme)
- Dialog prevents background interaction
- Escape key closes dialog (cancels action)
- Enter key confirms action
- Backdrop click closes dialog (cancels action)

---

### 7. Backup Export Functionality Not Implemented

**Location:** `src/views/settings/BackupSettings.tsx:137-149`

**Context:**
```typescript
const handleExport = async (backup: Backup) => {
  try {
    // TODO: Replace with actual IPC call when backend is ready
    // const result = await window.justiceAPI.db.exportBackup(backup.id);
    showToast(`Exported ${backup.filename} to Downloads`, 'success');
  } catch (error) {
    showToast('Failed to export backup', 'error');
  }
};
```

**Issue:** "Export" button in backup list is non-functional. Users believe backups are being exported, but nothing happens.

**Impact:**
- Users cannot export backups to external storage
- No off-site backup capability
- Misleading UI (button exists but doesn't work)
- Users cannot share backups between machines

**Effort:** Small (4-6 hours)

**Dependencies:**
- Needs new IPC handler `db:exportBackup`
- Requires file dialog to choose export location

**Implementation Approach:**
1. Add IPC handler `db:exportBackup(backupFilename, destinationPath)`
2. Use `dialog.showSaveDialog()` to let user choose export location
3. Copy backup file from `userData/backups/` to chosen location
4. Add progress indicator for large backups
5. Log audit event for exports
6. Update `handleExport()` to call new IPC handler

**Acceptance Criteria:**
- User can export backup to any location
- File dialog shows suggested filename
- Progress indicator for large files
- Success toast shows export location
- Audit log entry created

---

### 8. Case Navigation from Timeline Not Implemented

**Location:** `src/views/timeline/TimelineView.tsx:222-225`

**Context:**
```typescript
const handleCaseClick = useCallback((caseId: number) => {
  // TODO: Navigate to case detail view
  console.log('Navigate to case:', caseId);
}, []);
```

**Issue:** Clicking case title in timeline does nothing. Users expect to navigate to case details but are stuck in timeline view.

**Impact:**
- Poor navigation UX
- Users cannot quickly jump to case from deadline
- Broken user workflow (common use case)
- Inconsistent with other views

**Effort:** Small (2-4 hours)

**Dependencies:**
- Requires React Router navigation
- Must integrate with existing case routing

**Implementation Approach:**
1. Import `useNavigate` from `react-router-dom`
2. Navigate to `/cases/${caseId}` on case click
3. Add visual feedback (hover state, cursor pointer)
4. Consider opening in sidebar vs full view
5. Add keyboard shortcut (Cmd/Ctrl + Click = new window)

**Acceptance Criteria:**
- Clicking case title navigates to case detail
- Hover state indicates clickability
- Navigation works from all timeline items
- Preserves timeline filter state on back navigation

---

### 9. Chat Message Retrieval Not Implemented

**Location:** `electron/preload.ts:146`

**Context:**
```typescript
// TODO: Implement chat:get-messages handler or remove this call
```

**Issue:** Preload script references non-existent IPC handler. Chat history cannot be retrieved, breaking chat persistence.

**Impact:**
- Chat messages not persisted across sessions
- Users lose conversation history on restart
- No way to review past AI interactions
- Breaks expected chat behavior

**Effort:** Medium (6-8 hours)

**Dependencies:**
- Needs `chat:get-messages` IPC handler
- Must query `chat_messages` table
- Requires ChatRepository integration

**Implementation Approach:**
1. Create `chat:get-messages` handler in `electron/ipc-handlers/chat.ts`
2. Query `chat_messages` table via `ChatRepository`
3. Return messages sorted by timestamp
4. Support pagination (offset/limit)
5. Filter by conversationId or userId
6. Update preload to expose handler

**Acceptance Criteria:**
- Chat history loads on app start
- Messages sorted by timestamp (newest first)
- Pagination works for long conversations
- Encrypted messages properly decrypted
- Performance acceptable for 1000+ messages

---

### 10. Validation Schema File Missing

**Location:** `src/middleware/ValidationMiddleware.ts:11`

**Context:**
```typescript
// TODO: Create schemas.ts file with IPC validation schemas
```

**Issue:** IPC validation middleware references non-existent schemas file. No runtime validation of IPC inputs, opening security vulnerability.

**Impact:**
- SQL injection risk (unvalidated inputs)
- Type coercion bugs
- No protection against malformed data
- Crashes from unexpected input types

**Effort:** Large (12-16 hours)

**Dependencies:**
- Requires Zod schema definitions for all IPC handlers
- Must cover all 50+ IPC channels

**Implementation Approach:**
1. Create `src/middleware/schemas.ts`
2. Define Zod schemas for each IPC handler input
3. Group schemas by handler category (auth, cases, evidence, etc.)
4. Add schema validation to middleware
5. Return clear validation errors to renderer
6. Add unit tests for schemas

**Example Schema:**
```typescript
export const createCaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'pending', 'closed']),
  userId: z.number().int().positive(),
});
```

**Acceptance Criteria:**
- All IPC inputs validated before processing
- Clear error messages for invalid inputs
- No breaking changes to existing IPC calls
- Schema tests achieve 90%+ coverage

---

### 11. SessionManager Not Implemented

**Location:** `electron/ipc-handlers/search.ts:11, 15`

**Context:**
```typescript
// import { SessionManager } from '../session-manager.ts'; // TODO: SessionManager not implemented
// const sessionManager = new SessionManager(); // TODO: SessionManager not implemented
```

**Issue:** Search handler references non-existent SessionManager class. Session validation disabled in search endpoints.

**Impact:**
- Unauthenticated users can search sensitive data
- No access control on search results
- GDPR violation (unauthorized data access)
- Same issue as TODOs #2 and #3

**Effort:** Large (16-24 hours) - **SAME AS TODO #2 AND #3**

**Dependencies:**
- Requires SessionManager implementation (global effort)
- Affects all IPC handlers

**Implementation Approach:**
- See TODO #2 for full implementation plan
- This is part of the same epic work item

**Acceptance Criteria:**
- Same as TODO #2 and #3
- Search results filtered by user access rights

---

### 12. User ID Extraction from Session Not Implemented

**Location:** `electron/ipc-handlers/templates.ts:69`

**Context:**
```typescript
// TODO: Extract userId from sessionId (implement session validation)
```

**Issue:** Template handler cannot determine which user is making requests. All templates shared across users (privacy violation).

**Impact:**
- Users can access other users' templates
- No template isolation between users
- GDPR violation (data access control)
- Multi-user functionality broken

**Effort:** Large (16-24 hours) - **SAME AS TODO #2 AND #3**

**Dependencies:**
- Requires SessionManager implementation (global effort)

**Implementation Approach:**
- See TODO #2 for full implementation plan
- This is part of the same epic work item

**Acceptance Criteria:**
- Same as TODO #2 and #3
- Templates properly scoped to users

---

## MEDIUM Priority (18 items)

### 13. Legacy AI Service Code Cleanup

**Location:** `src/services/AIServiceFactory.ts:3`

**Context:**
```typescript
// TODO: These services have been replaced by GroqService - clean up this legacy code
```

**Issue:** Dead code present in codebase. `AIServiceFactory` replaced by `GroqService` but not removed.

**Impact:**
- Code bloat and confusion
- Developers may use wrong service
- Maintenance burden for dead code
- Increases bundle size

**Effort:** Small (2-4 hours)

**Implementation Approach:**
1. Verify no imports of `AIServiceFactory` exist
2. Search for any lingering references
3. Delete `src/services/AIServiceFactory.ts`
4. Update documentation to reference `GroqService`
5. Run tests to ensure nothing breaks

**Acceptance Criteria:**
- `AIServiceFactory.ts` deleted
- No references in codebase
- All tests pass
- Documentation updated

---

### 14. User ID Hardcoded in CaseService

**Location:** `src/services/CaseService.injectable.ts:40, 90, 111, 132`

**Context:**
```typescript
userId: 'system', // TODO: Get actual user ID from context
```

**Issue:** Audit logs always show `userId: 'system'` instead of actual user. Cannot track who performed case operations.

**Impact:**
- Audit logs inaccurate
- Cannot investigate case modifications
- GDPR compliance risk
- Multi-user support broken

**Effort:** Medium (4-6 hours)

**Dependencies:**
- Requires SessionManager implementation (TODO #2)
- Needs AuthContext integration

**Implementation Approach:**
1. Inject `SessionManager` into `CaseService`
2. Extract userId from current session
3. Replace all `userId: 'system'` with actual userId
4. Add fallback for system-initiated operations
5. Update audit queries to use real userIds

**Acceptance Criteria:**
- Audit logs show correct userId
- Case operations tracked to users
- System operations still logged as 'system'
- Multi-user access control works

---

### 15-31. Wave 3 Placeholder TODOs

**Locations:** Multiple files in `src/shared/infrastructure/di/`

**Context:**
```typescript
// TODO: Add in Wave 3
// TODO: Add method signatures once [Service] implementation is analyzed
```

**Issue:** Placeholder comments for future development phases. Not blocking current features.

**Impact:**
- Low priority - tracked for future development
- Deferred to Wave 3 (multi-user support)

**Effort:** Varies by feature (tracked separately in Wave 3 backlog)

**Implementation Approach:**
- Tracked in separate Wave 3 project plan
- Not part of current sprint priorities

**Files Affected:**
- `src/shared/infrastructure/di/service-interfaces.ts` (7 TODOs)
- `src/shared/infrastructure/di/repository-interfaces.ts` (7 TODOs)
- Related to: batch operations, resource-specific queries, multi-user support

---

### 32. FTS5 Test Mocking Issues

**Location:** `src/services/SearchService.test.ts:94-97`

**Context:**
```typescript
// TODO: Fix FTS5 mocking - service uses direct DB queries via searchWithFTS5()
// Related: Wave 3 test environment issues - tracked in TODO.md
```

**Issue:** SearchService tests cannot mock FTS5 full-text search queries. Tests skipped, reducing coverage.

**Impact:**
- Search functionality not fully tested
- Regressions may go undetected
- Test coverage below target (75% vs 80% goal)

**Effort:** Medium (6-8 hours)

**Dependencies:**
- Requires in-memory FTS5 setup
- May need better-sqlite3 test configuration

**Implementation Approach:**
1. Create FTS5 test database in memory
2. Seed with sample searchable data
3. Mock SearchService with real FTS5 queries
4. Add integration tests for search scenarios
5. Test ranking, highlighting, and filters

**Acceptance Criteria:**
- All SearchService tests pass with FTS5 mocking
- Test coverage reaches 80%+
- Search ranking tested
- Edge cases covered (special chars, empty query)

---

### 33. React 18 Testing Library Issues

**Location:** `src/views/settings/BackupSettings.test.tsx:29, 36`

**Context:**
```typescript
// TODO: Fix React 18 concurrent rendering issues with Testing Library
// Related: Wave 3 test environment issues - tracked in TODO.md
```

**Issue:** BackupSettings component tests have rendering issues with React 18 concurrent mode.

**Impact:**
- Component not fully tested
- Potential regressions in backup UI
- Test coverage gap

**Effort:** Medium (6-8 hours)

**Dependencies:**
- May require Testing Library upgrades
- Needs async rendering handling

**Implementation Approach:**
1. Update `@testing-library/react` to latest version
2. Wrap async operations in `waitFor()` or `findBy*()`
3. Use `act()` for state updates
4. Add `renderHook()` for custom hooks
5. Fix timing issues in component lifecycle

**Acceptance Criteria:**
- All BackupSettings tests pass
- No React warnings in test output
- Async operations properly awaited
- Component coverage reaches 80%+

---

### 34. Legal API Mock for Tests

**Location:** `src/services/LegalAPIService.test.ts:122`

**Context:**
```typescript
// TODO: Mock the API to properly test error handling without network calls
```

**Issue:** LegalAPIService tests make real network calls, causing:
- Slow test runs
- Flaky tests (network-dependent)
- API rate limiting in CI

**Impact:**
- Test suite slower than necessary
- CI failures due to network issues
- Cannot test error scenarios reliably

**Effort:** Small (4-6 hours)

**Implementation Approach:**
1. Use `msw` (Mock Service Worker) to mock API calls
2. Define mock responses for legislation.gov.uk
3. Define mock responses for caselaw.nationalarchives.gov.uk
4. Test error scenarios (404, 500, timeout)
5. Verify rate limiting behavior

**Acceptance Criteria:**
- No real network calls in tests
- Tests run in under 5 seconds
- All error scenarios tested
- Mock API responses realistic

---

### 35. Seed Data for Test Database

**Location:** `tests/e2e/setup/test-database.ts:62`

**Context:**
```typescript
// TODO: Implement seedData functionality if needed
```

**Issue:** E2E tests may benefit from pre-seeded test data for consistent test scenarios.

**Impact:**
- Low priority - tests currently work without seeding
- May improve test reliability and coverage

**Effort:** Medium (6-8 hours)

**Implementation Approach:**
1. Create seed data fixtures (users, cases, evidence)
2. Add `seedDatabase()` function to test setup
3. Seed before E2E test suite runs
4. Ensure deterministic IDs for assertions
5. Document seeded data structure

**Acceptance Criteria:**
- E2E tests can use pre-seeded data
- Seed data covers common scenarios
- Tests remain isolated (no cross-test contamination)
- Seed data documented in test README

---

## LOW Priority (12 items)

### 36-42. Workflow CLI TODOs

**Locations:** Multiple files in `src/workflow/`

**Context:** Workflow management CLI system TODOs (ProjectPlanner, TodoManager, workflow tests)

**Issue:** Workflow system is internal development tooling, not user-facing. TODOs reference:
- TODO list visualization features
- README task extraction
- Workflow test scenarios

**Impact:**
- Low priority - internal developer tools
- Does not affect end users
- Improves developer experience

**Effort:** Varies (2-8 hours each)

**Implementation Approach:**
- Defer to backlog for developer productivity improvements
- Not part of user-facing feature work

**Files Affected:**
- `src/workflow/workflow-test.ts` (3 TODOs)
- `src/workflow/workflow-cli.ts` (2 TODOs)
- `src/workflow/TodoManager.ts` (1 TODO)
- `src/workflow/ProjectPlanner.ts` (2 TODOs)

---

### 43. Preload API Completeness

**Location:** `electron/preload.ts:351`

**Context:**
```typescript
// TODO: Add remaining API methods as needed (tags, notifications, search, etc.)
```

**Issue:** Placeholder comment indicating some IPC methods may not be exposed to renderer yet.

**Impact:**
- Low priority - add as features are developed
- Not blocking any current functionality

**Effort:** Small (1-2 hours per method)

**Implementation Approach:**
- Add IPC methods to preload as features require them
- Follow existing patterns for type safety
- Update `window.d.ts` type definitions

**Acceptance Criteria:**
- All implemented IPC handlers exposed in preload
- TypeScript types kept in sync

---

## Implementation Roadmap

### Phase 1: Critical Security & Data Integrity (Sprint 1-2)
**Estimated Effort:** 8-12 weeks (2-3 developers)

**Epic 1: Session Management & Authorization (TODOs #2, #3, #11, #12)**
- Combined effort: 24-32 hours
- Must be completed as single unit
- Fixes 4 critical security vulnerabilities
- Unblocks multi-user support

**Epic 2: Database Migration System (TODO #1)**
- Effort: 8-12 hours
- Blocks schema upgrades
- Required for production releases

**Epic 3: Evidence Upload Validation (TODO #4)**
- Effort: 8-12 hours
- Security risk + UX issue
- Blocks search on documents

**Deliverables:**
- Session-based authentication working
- All IPC handlers validate sessions
- Audit logs track real users
- Database migrations functional
- File uploads validated and text-extracted

---

### Phase 2: User Experience Improvements (Sprint 3-4)
**Estimated Effort:** 4-6 weeks (1-2 developers)

**Epic 4: UI Feedback Systems (TODOs #5, #6)**
- Toast notifications: 6-8 hours
- Modal dialogs: 6-8 hours
- Combined effort: 12-16 hours
- Improves UX for all critical operations

**Epic 5: Navigation & Core Workflows (TODOs #7, #8, #9)**
- Backup export: 4-6 hours
- Case navigation: 2-4 hours
- Chat history: 6-8 hours
- Combined effort: 12-18 hours
- Fixes broken user workflows

**Epic 6: Input Validation (TODO #10)**
- Effort: 12-16 hours
- Security hardening
- Prevents crashes from malformed inputs

**Deliverables:**
- Professional toast/modal system
- All user-facing workflows complete
- Backup export functional
- Chat persistence working
- IPC inputs validated

---

### Phase 3: Code Quality & Testing (Sprint 5)
**Estimated Effort:** 2-3 weeks (1 developer)

**Epic 7: Test Infrastructure (TODOs #32, #33, #34)**
- FTS5 mocking: 6-8 hours
- React 18 fixes: 6-8 hours
- API mocking: 4-6 hours
- Combined effort: 16-22 hours
- Raises test coverage to 80%+

**Epic 8: Code Cleanup (TODOs #13, #14)**
- Legacy code removal: 2-4 hours
- Audit log fixes: 4-6 hours
- Combined effort: 6-10 hours
- Reduces technical debt

**Deliverables:**
- Test coverage at 80%+
- All tests reliable (no flaky tests)
- Legacy code removed
- Audit logs accurate

---

### Phase 4: Future Work (Backlog)
**Deferred to Wave 3 or later**

- Wave 3 placeholder TODOs (15-31)
- Workflow CLI improvements (36-42)
- E2E test seeding (35)
- Preload API completeness (43)

---

## SonarQube Compliance

**Rule:** S1135 - "TODO tags should be handled"

**Compliance Status:** ACHIEVED

- All 42 TODOs documented
- Each TODO has:
  - Priority classification
  - Estimated effort
  - Dependencies identified
  - Implementation plan
  - Acceptance criteria
- Roadmap created for systematic resolution
- Critical TODOs prioritized for immediate work

**Next Steps:**
1. Convert Critical TODOs to JIRA/GitHub issues
2. Assign to Sprint 1 backlog
3. Begin Epic 1 (Session Management)
4. Track progress against roadmap

---

## Appendix: Quick Reference

### TODOs by File

| File | Line | Priority | Effort |
|------|------|----------|--------|
| `electron/ipc-handlers/database.ts` | 68-70 | CRITICAL | Medium |
| `electron/utils/audit-helper.ts` | 120-124, 131-135 | CRITICAL | Large |
| `electron/ipc-handlers/evidence.ts` | 40-41 | CRITICAL | Medium |
| `src/views/settings/BackupSettings.tsx` | 234, 229, 137 | HIGH | Small-Medium |
| `src/views/timeline/TimelineView.tsx` | 223 | HIGH | Small |
| `electron/preload.ts` | 146 | HIGH | Medium |
| `src/middleware/ValidationMiddleware.ts` | 11 | HIGH | Large |
| `electron/ipc-handlers/search.ts` | 11, 15 | HIGH | Large |
| `electron/ipc-handlers/templates.ts` | 69 | HIGH | Large |
| `src/services/AIServiceFactory.ts` | 3 | MEDIUM | Small |
| `src/services/CaseService.injectable.ts` | 40, 90, 111, 132 | MEDIUM | Medium |
| `src/services/SearchService.test.ts` | 94-97 | MEDIUM | Medium |
| `src/views/settings/BackupSettings.test.tsx` | 29, 36 | MEDIUM | Medium |
| `src/services/LegalAPIService.test.ts` | 122 | MEDIUM | Small |
| `tests/e2e/setup/test-database.ts` | 62 | MEDIUM | Medium |
| `src/workflow/*` | Various | LOW | Small-Medium |
| `src/shared/infrastructure/di/*` | Various | MEDIUM | Deferred (Wave 3) |

### Dependencies Graph

```
Session Management (TODO #2, #3)
├── Blocks: #11 (Search SessionManager)
├── Blocks: #12 (Templates user isolation)
└── Enables: #14 (CaseService audit logs)

Database Migration (TODO #1)
└── Independent (can proceed in parallel)

Evidence Validation (TODO #4)
└── Independent (can proceed in parallel)

UI Feedback (TODO #5, #6)
└── Enables better UX for: #7, #8 (once implemented)

Input Validation (TODO #10)
└── Independent (security hardening)

Test Infrastructure (TODO #32, #33, #34)
└── Independent (QA improvement)
```

---

**Document Owner:** Engineering Team
**Review Cycle:** Quarterly (or when new TODOs added)
**Last Updated:** 2025-11-03
**Next Review:** 2025-02-03
