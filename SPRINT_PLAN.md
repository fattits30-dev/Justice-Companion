# Sprint Plan - Justice Companion Technical Debt Resolution

**Generated:** 2025-11-03
**Source:** TECHNICAL_DEBT_BACKLOG.md (42 TODOs analyzed)
**Planning Horizon:** 3 sprints (6 weeks total)
**Team Capacity:** Assume 40 hours/week (80 hours per 2-week sprint)

---

## Executive Summary

**Total Backlog:** 42 TODO items
**Estimated Effort:** 280-360 hours
**Recommended Sprints:** 3 sprints (2 weeks each)

**Priority Distribution:**
- **CRITICAL:** 4 items (52-72 hours) - Security vulnerabilities
- **HIGH:** 8 items (54-72 hours) - UX and core functionality
- **MEDIUM:** 18 items (110-140 hours) - Code quality and maintainability
- **LOW:** 12 items (64-76 hours) - Nice-to-have improvements

**Sprint Allocation:**
- **Sprint 1 (Weeks 1-2):** CRITICAL security issues + UI feedback system (80 hours)
- **Sprint 2 (Weeks 3-4):** HIGH priority UX improvements + functionality (80 hours)
- **Sprint 3 (Weeks 5-6):** MEDIUM priority code quality + testing infrastructure (80 hours)

**Deferred to Future:**
- LOW priority items (64-76 hours) - Backlog for Sprint 4+
- Dependency injection refactoring (Wave 3) - Deferred to Q2 2026

---

## Sprint 1: Critical Security & Foundation (Weeks 1-2)

**Theme:** "Make it secure and stable"
**Goal:** Resolve all CVSS 9+ security vulnerabilities and establish UI feedback foundation
**Capacity:** 80 hours

### Work Items

#### EPIC 1.1: Session Management & Authorization (32 hours) - BLOCKING

**Priority:** CRITICAL (CVSS 9.8)
**Effort:** 24-32 hours
**Related Issues:** CRITICAL_SECURITY_ISSUES.md Issue #1

**Scope:**
1. Create `SessionManager` service with session store (8-10 hours)
   - In-memory or database-backed session storage
   - Map sessionId → userId
   - Track creation time and expiration (24 hours)
   - Handle cleanup and expiration

2. Implement `getUserIdFromEvent()` in audit-helper.ts (4-6 hours)
   - Extract sessionId from IPC event context
   - Look up userId from session store
   - Update all IPC handlers to pass sessionId

3. Implement `isAuthenticated()` in audit-helper.ts (4-6 hours)
   - Validate session exists and is not expired
   - Return false if session invalid or expired
   - Update `requireAuth()` to throw proper errors
   - Add audit logging for failed auth attempts

4. Integrate with `AuthContext` (4-6 hours)
   - Store sessionId in React context after login
   - Include sessionId in all IPC calls
   - Handle session expiration gracefully in UI

5. Testing (6-8 hours)
   - Unit tests for SessionManager
   - E2E tests for login/logout flow with session validation
   - Test unauthorized access scenarios
   - Test session expiration handling
   - Load test with 1000+ concurrent sessions

**Acceptance Criteria:**
- [ ] Unauthenticated requests rejected with 401 error
- [ ] Expired sessions automatically invalidated
- [ ] All audit events include correct userId
- [ ] Session validation works across all IPC handlers
- [ ] Failed authentication attempts logged
- [ ] All sensitive IPC handlers protected

**Dependencies:**
- Blocks: EPIC 1.2 (SearchSessionManager), EPIC 2.3 (Templates user isolation)
- Enables: Audit logging with proper user tracking

---

#### EPIC 1.2: Database Migration System (12 hours)

**Priority:** CRITICAL
**Effort:** 8-12 hours
**Related Issues:** CRITICAL_SECURITY_ISSUES.md Issue #2

**Scope:**
1. Import `runMigrations()` from migrate.ts (1 hour)
2. Implement pre-migration backup (2-3 hours)
   - Call existing `db:backup` handler
   - Verify backup integrity
   - Store backup metadata

3. Execute migrations and capture results (3-4 hours)
   - Call `runMigrations()` from migrate.ts
   - Track applied migration IDs
   - Return detailed migration log

4. Implement rollback on failure (2-3 hours)
   - Restore from pre-migration backup if any migration fails
   - Log rollback event to audit log
   - Return detailed error information

5. Testing (2-3 hours)
   - Test successful migration applies schema changes
   - Test failed migration triggers rollback
   - Test backup created before migration

**Acceptance Criteria:**
- [ ] Migrations actually run when `db:migrate` is called
- [ ] Automatic backup created before migration
- [ ] Detailed results returned (migrations applied, errors)
- [ ] Audit log entry created
- [ ] Failed migrations trigger rollback

**Dependencies:**
- Independent (can run in parallel with EPIC 1.1)

---

#### EPIC 1.3: UI Feedback System - Toast Notifications (8 hours)

**Priority:** HIGH
**Effort:** 6-8 hours
**Blocker for:** Better UX in backup/restore operations

**Scope:**
1. Install toast library (1 hour)
   ```bash
   pnpm add react-hot-toast
   ```

2. Add `<Toaster />` provider to App.tsx (1 hour)

3. Replace `showToast()` with `toast.success()`, `toast.error()`, etc. (3-4 hours)
   - Update BackupSettings.tsx (8 calls)
   - Update other views using toast pattern
   - Style toasts to match Justice Companion theme

4. Configure toast behavior (1-2 hours)
   - Success toasts auto-dismiss after 5 seconds
   - Error toasts require manual dismissal
   - Toasts positioned at top-right

5. Testing (1 hour)
   - Verify toasts visible to users
   - Test auto-dismiss behavior
   - Test manual dismissal for errors

**Acceptance Criteria:**
- [ ] Toast notifications visible to users
- [ ] Success toasts auto-dismiss after 5 seconds
- [ ] Error toasts require manual dismissal
- [ ] Toasts styled consistently with app theme
- [ ] Toasts positioned at top-right (non-intrusive)

**Dependencies:**
- Enables better UX for: EPIC 1.4, EPIC 2.1, EPIC 2.2

---

#### EPIC 1.4: UI Feedback System - Modal Dialogs (8 hours)

**Priority:** HIGH
**Effort:** 6-8 hours
**Blocker for:** Proper destructive action confirmation

**Scope:**
1. Create `ConfirmDialog.tsx` component (3-4 hours)
   - Use Framer Motion for animations
   - Support variants: `danger`, `warning`, `info`
   - Add optional checkbox for "I understand" confirmation
   - Add keyboard shortcuts (Enter = confirm, Escape = cancel)

2. Replace `window.confirm()` calls (2-3 hours)
   - Update BackupSettings.tsx
   - Update other views using window.confirm()

3. Testing (1 hour)
   - Test keyboard shortcuts
   - Test backdrop click behavior
   - Test variant styling

**Acceptance Criteria:**
- [ ] Modal dialog replaces all `window.confirm()` calls
- [ ] Danger variant for destructive actions (red theme)
- [ ] Dialog prevents background interaction
- [ ] Escape key closes dialog (cancels action)
- [ ] Enter key confirms action
- [ ] Backdrop click closes dialog (cancels action)

**Dependencies:**
- Enables: EPIC 2.1 (Backup export), EPIC 2.2 (Case navigation)

---

#### EPIC 1.5: Evidence File Upload Validation (12 hours)

**Priority:** CRITICAL
**Effort:** 8-12 hours
**Related Issues:** CRITICAL_SECURITY_ISSUES.md Issue #3

**Scope:**
1. Install dependencies (1 hour)
   ```bash
   pnpm add file-type pdf-parse mammoth
   ```

2. Implement file type validation (2-3 hours)
   - Use MIME type detection (magic number)
   - Whitelist allowed types: .pdf, .docx, .txt, .jpg, .png, .mp4, .mp3
   - Add file size limits (100MB default, configurable)

3. Integrate text extraction (3-4 hours)
   - Use DocumentParserService for PDF/DOCX
   - Store extracted text in `evidence.extracted_text` field
   - Index extracted text in FTS5 search

4. Add audit logging (1 hour)
   - Log rejected uploads with reason

5. Testing (2-3 hours)
   - Test allowed file types
   - Test rejected file types
   - Test file size limits
   - Test PDF text extraction
   - Test DOCX text extraction
   - Test search with extracted text

**Acceptance Criteria:**
- [ ] Only whitelisted file types allowed
- [ ] File size limit enforced (100MB)
- [ ] Executable files rejected (.exe, .bat, .sh, .ps1)
- [ ] Text extracted from PDF/DOCX files
- [ ] Extracted text indexed in FTS5 search
- [ ] Rejected uploads logged to audit log
- [ ] Clear error messages for invalid files

**Dependencies:**
- Requires DocumentParserService (already exists)

---

#### EPIC 1.6: Input Validation Schemas (12 hours)

**Priority:** HIGH
**Effort:** 12-16 hours
**Related Issues:** CRITICAL_SECURITY_ISSUES.md Issue #4

**Scope:**
1. Create schema registry in `electron/schemas/index.ts` (3-4 hours)
   - Define 20+ Zod schemas for IPC handlers
   - Group by handler category (auth, cases, evidence, etc.)

2. Implement ValidationMiddleware (2 hours)
   - Create `validateInput()` helper
   - Create `withValidation()` wrapper
   - Return clear field-specific error messages

3. Apply to critical handlers (5-7 hours)
   - Auth handlers (register, login) - Highest priority
   - GDPR handlers (export, delete) - Compliance critical
   - Data mutation handlers (create, update, delete)
   - File upload handlers (evidence, documents)

4. Testing (2-3 hours)
   - Unit test each schema validates correct data
   - Unit test each schema rejects invalid data
   - Integration test IPC handler rejects invalid input

**Acceptance Criteria:**
- [ ] Schema registry created with 20+ validation schemas
- [ ] ValidationMiddleware implemented and tested
- [ ] All auth handlers use validation
- [ ] All GDPR handlers use validation
- [ ] All data mutation handlers use validation
- [ ] Clear field-specific error messages returned to UI
- [ ] Validation errors logged to audit log

**Dependencies:**
- Zod already installed

---

### Sprint 1 Summary

**Total Effort:** 76-84 hours (matches 80-hour sprint capacity)

**Deliverables:**
1. Session management and authorization fully implemented
2. Database migration system operational
3. Toast notification system live
4. Modal dialog system replacing window.confirm()
5. Evidence file upload validation enforced
6. Input validation schemas protecting all critical handlers

**Risk Mitigation:**
- Session management is largest effort item (32 hours) - monitor closely
- If running behind, defer EPIC 1.6 (Input Validation) to Sprint 2
- All 4 CRITICAL security vulnerabilities resolved by end of sprint

**Definition of Done:**
- All acceptance criteria met
- Unit tests passing (90%+ coverage)
- E2E tests passing for critical flows
- Code reviewed and merged to `main`
- Documentation updated (CHANGELOG.md, README.md)

---

## Sprint 2: High-Priority UX & Functionality (Weeks 3-4)

**Theme:** "Make it usable and complete"
**Goal:** Resolve HIGH priority UX issues and implement missing functionality
**Capacity:** 80 hours

### Work Items

#### EPIC 2.1: Backup Export Functionality (6 hours)

**Priority:** HIGH
**Effort:** 4-6 hours

**Scope:**
1. Add IPC handler `db:exportBackup(backupFilename, destinationPath)` (2-3 hours)
   - Use `dialog.showSaveDialog()` to let user choose export location
   - Copy backup file from `userData/backups/` to chosen location
   - Add progress indicator for large backups

2. Update `handleExport()` in BackupSettings.tsx (1 hour)
3. Add audit logging for exports (1 hour)
4. Testing (1-2 hours)

**Acceptance Criteria:**
- [ ] User can export backup to any location
- [ ] File dialog shows suggested filename
- [ ] Progress indicator for large files
- [ ] Success toast shows export location
- [ ] Audit log entry created

**Dependencies:**
- Requires: EPIC 1.3 (Toast notifications)

---

#### EPIC 2.2: Case Navigation from Timeline (4 hours)

**Priority:** HIGH
**Effort:** 2-4 hours

**Scope:**
1. Import `useNavigate` from `react-router-dom` (1 hour)
2. Navigate to `/cases/${caseId}` on case click (1 hour)
3. Add visual feedback (hover state, cursor pointer) (1 hour)
4. Testing (1 hour)

**Acceptance Criteria:**
- [ ] Clicking case title navigates to case detail
- [ ] Hover state indicates clickability
- [ ] Navigation works from all timeline items
- [ ] Preserves timeline filter state on back navigation

**Dependencies:**
- Independent

---

#### EPIC 2.3: Chat Message Retrieval (8 hours)

**Priority:** HIGH
**Effort:** 6-8 hours

**Scope:**
1. Create `chat:get-messages` handler in chat.ts (3-4 hours)
   - Query `chat_messages` table via ChatRepository
   - Return messages sorted by timestamp
   - Support pagination (offset/limit)
   - Filter by conversationId or userId
   - Decrypt encrypted messages

2. Update preload to expose handler (1 hour)
3. Update ChatView to load messages on mount (2 hours)
4. Testing (1-2 hours)

**Acceptance Criteria:**
- [ ] Chat history loads on app start
- [ ] Messages sorted by timestamp (newest first)
- [ ] Pagination works for long conversations
- [ ] Encrypted messages properly decrypted
- [ ] Performance acceptable for 1000+ messages

**Dependencies:**
- Independent

---

#### EPIC 2.4: Search SessionManager Integration (24 hours)

**Priority:** HIGH
**Effort:** 16-24 hours

**Scope:**
1. Implement SessionManager class (10-12 hours)
   - Session store with sessionId → userId mapping
   - Session creation and expiration (24 hours)
   - Session cleanup and garbage collection

2. Integrate with search IPC handlers (4-6 hours)
   - Update search.ts to use SessionManager
   - Add session validation before searches
   - Filter search results by user permissions

3. Testing (2-6 hours)

**Acceptance Criteria:**
- [ ] Search handlers validate session before executing
- [ ] Search results filtered by user permissions
- [ ] Sessions expire after 24 hours
- [ ] Unauthorized search attempts logged

**Dependencies:**
- **BLOCKED BY:** EPIC 1.1 (Session Management)
- This is the same SessionManager from EPIC 1.1, applied to search handlers

---

#### EPIC 2.5: Template User Isolation (24 hours)

**Priority:** HIGH
**Effort:** 16-24 hours

**Scope:**
1. Add `userId` column to templates table (2 hours)
   - Create migration
   - Update TemplateRepository

2. Filter templates by userId (4-6 hours)
   - Update `templates:list` handler
   - Update `templates:create` handler
   - Update `templates:update` handler
   - Update `templates:delete` handler

3. Add authorization checks (4-6 hours)
   - Users can only access their own templates
   - Admin users can access all templates (future)

4. Update UI to handle user-specific templates (4-6 hours)
5. Testing (2-6 hours)

**Acceptance Criteria:**
- [ ] Users only see their own templates
- [ ] Creating template automatically assigns userId
- [ ] Users cannot delete/update other users' templates
- [ ] Authorization errors logged to audit log

**Dependencies:**
- **BLOCKED BY:** EPIC 1.1 (Session Management)

---

#### EPIC 2.6: Add Full-Text Search Tests (8 hours)

**Priority:** MEDIUM (promoted from backlog)
**Effort:** 6-8 hours

**Scope:**
1. Add FTS5 performance tests (3-4 hours)
   - Test search with 1000+ documents
   - Test search with large PDF text extracts
   - Measure query performance (<100ms target)

2. Add edge case tests (2-3 hours)
   - Test special characters in search
   - Test emoji in search
   - Test very long queries

3. Add relevance ranking tests (1-2 hours)

**Acceptance Criteria:**
- [ ] FTS5 search handles 1000+ documents
- [ ] Search queries complete in <100ms
- [ ] Special characters handled correctly
- [ ] Relevance ranking works as expected

**Dependencies:**
- Requires: EPIC 1.5 (Evidence text extraction)

---

### Sprint 2 Summary

**Total Effort:** 74-82 hours (matches 80-hour sprint capacity)

**Deliverables:**
1. Backup export functionality operational
2. Case navigation from timeline working
3. Chat message persistence restored
4. Search handlers integrated with SessionManager
5. Templates user-isolated
6. Full-text search tested and performant

**Risk Mitigation:**
- EPIC 2.4 and 2.5 are blocked by EPIC 1.1 - ensure Sprint 1 completes on time
- If Sprint 1 slips, defer EPIC 2.6 (Search tests) to Sprint 3

**Definition of Done:**
- All acceptance criteria met
- Unit tests passing (85%+ coverage)
- E2E tests passing for chat and search flows
- Performance benchmarks met (<100ms FTS5 queries)
- Code reviewed and merged to `main`

---

## Sprint 3: Code Quality & Testing Infrastructure (Weeks 5-6)

**Theme:** "Make it maintainable and testable"
**Goal:** Improve code quality, add missing tests, and enhance developer experience
**Capacity:** 80 hours

### Work Items

#### EPIC 3.1: CaseService Injectable Implementation (16 hours)

**Priority:** MEDIUM
**Effort:** 12-16 hours

**Scope:**
1. Convert CaseService to injectable pattern (6-8 hours)
   - Update constructor to use dependency injection
   - Add proper interfaces for dependencies
   - Remove hardcoded dependencies

2. Update all callers to use DI (4-6 hours)
3. Add audit logging to all CaseService methods (2 hours)
4. Testing (2-3 hours)

**Acceptance Criteria:**
- [ ] CaseService uses dependency injection
- [ ] All dependencies injected via constructor
- [ ] All CaseService operations logged to audit log
- [ ] Mock-friendly for unit testing

**Dependencies:**
- Independent

---

#### EPIC 3.2: Test Database Seeding (8 hours)

**Priority:** MEDIUM
**Effort:** 6-8 hours

**Scope:**
1. Create seed data factory (3-4 hours)
   - Generate realistic test cases
   - Generate test evidence
   - Generate test deadlines
   - Generate test users

2. Integrate with E2E test setup (2-3 hours)
3. Document seeding API (1 hour)

**Acceptance Criteria:**
- [ ] E2E tests use seeded data
- [ ] Seed data is realistic and comprehensive
- [ ] Seeding is fast (<1 second for 100 records)
- [ ] Seeding is idempotent (safe to run multiple times)

**Dependencies:**
- Independent

---

#### EPIC 3.3: SearchService Test Improvements (8 hours)

**Priority:** MEDIUM
**Effort:** 6-8 hours

**Scope:**
1. Mock database for SearchService tests (3-4 hours)
2. Add edge case tests (2-3 hours)
   - Test empty search results
   - Test very long queries
   - Test queries with special characters

3. Add performance tests (1-2 hours)

**Acceptance Criteria:**
- [ ] SearchService tests use mocked database
- [ ] All edge cases covered
- [ ] Performance benchmarks met
- [ ] Test coverage >90%

**Dependencies:**
- Independent

---

#### EPIC 3.4: BackupSettings Test Improvements (8 hours)

**Priority:** MEDIUM
**Effort:** 6-8 hours

**Scope:**
1. Mock IPC calls for BackupSettings tests (3-4 hours)
2. Add integration tests for backup flow (2-3 hours)
3. Add snapshot tests for UI (1-2 hours)

**Acceptance Criteria:**
- [ ] BackupSettings tests use mocked IPC
- [ ] All backup operations tested
- [ ] UI snapshot tests prevent regressions
- [ ] Test coverage >85%

**Dependencies:**
- Independent

---

#### EPIC 3.5: LegalAPIService Test Improvements (4 hours)

**Priority:** MEDIUM
**Effort:** 3-4 hours

**Scope:**
1. Mock HTTP requests for LegalAPIService tests (2 hours)
2. Add error handling tests (1-2 hours)

**Acceptance Criteria:**
- [ ] LegalAPIService tests use mocked HTTP
- [ ] All error scenarios covered
- [ ] Test coverage >90%

**Dependencies:**
- Independent

---

#### EPIC 3.6: Workflow CLI Improvements (12 hours)

**Priority:** LOW (deferred to backlog)
**Effort:** 8-12 hours

**Scope:**
1. Add CLI help text (2 hours)
2. Add progress indicators (3-4 hours)
3. Add error recovery (3-4 hours)
4. Testing (2-3 hours)

**Acceptance Criteria:**
- [ ] CLI has comprehensive help text
- [ ] Progress indicators show during long operations
- [ ] Errors handled gracefully with clear messages

**Dependencies:**
- Independent

---

#### EPIC 3.7: E2E Test Infrastructure (16 hours)

**Priority:** MEDIUM
**Effort:** 12-16 hours

**Scope:**
1. Set up Playwright test infrastructure (4-6 hours)
   - Configure test database
   - Configure test environment
   - Add test utilities

2. Add E2E test for full user workflow (4-6 hours)
   - Register → Login → Create Case → Add Evidence → Search → Logout

3. Add E2E test for GDPR workflows (4-6 hours)
   - Data export
   - Data deletion

**Acceptance Criteria:**
- [ ] E2E tests run in isolated environment
- [ ] Full user workflow tested end-to-end
- [ ] GDPR workflows tested end-to-end
- [ ] Tests run in <5 minutes

**Dependencies:**
- Requires: EPIC 3.2 (Test database seeding)

---

#### EPIC 3.8: Preload API Completeness (8 hours)

**Priority:** MEDIUM
**Effort:** 6-8 hours

**Scope:**
1. Audit preload.ts for missing IPC handlers (2 hours)
2. Add missing handlers (3-4 hours)
3. Document preload API (1-2 hours)

**Acceptance Criteria:**
- [ ] All IPC handlers exposed via preload
- [ ] No `@ts-ignore` comments in preload
- [ ] Preload API documented

**Dependencies:**
- Independent

---

### Sprint 3 Summary

**Total Effort:** 76-84 hours (matches 80-hour sprint capacity)

**Deliverables:**
1. CaseService converted to injectable pattern
2. Test database seeding operational
3. SearchService test coverage >90%
4. BackupSettings test coverage >85%
5. LegalAPIService test coverage >90%
6. E2E test infrastructure complete
7. Preload API fully documented

**Risk Mitigation:**
- If running behind, defer EPIC 3.6 (Workflow CLI) to backlog
- Prioritize test infrastructure over individual test improvements

**Definition of Done:**
- All acceptance criteria met
- Test coverage >85% overall
- E2E tests passing and fast (<5 minutes)
- Code reviewed and merged to `main`
- Documentation updated

---

## Backlog (Sprint 4+)

**LOW Priority Items** (64-76 hours total)

### Workflow Enhancements (24 hours)
- Add CLI help text
- Add progress indicators
- Add error recovery
- Add template versioning

### UI Polish (16 hours)
- Add loading states
- Add empty states
- Add skeleton loaders
- Improve error messages

### Performance Optimizations (12 hours)
- Optimize FTS5 queries
- Add query caching
- Reduce bundle size
- Optimize image loading

### Developer Experience (12 hours)
- Improve debug logging
- Add development mode indicators
- Improve error stack traces
- Add TypeScript strict mode

---

## Deferred to Q2 2026

**Dependency Injection Refactoring** (Wave 3, ~40 hours)
- Convert all services to DI pattern
- Implement service container
- Add DI testing utilities
- Update documentation

**Rationale:**
- Large refactoring effort
- Low user-facing impact
- Can be done incrementally
- Better suited for major version (v2.0)

---

## Success Metrics

### Sprint 1 Success Criteria
- [ ] All CVSS 9+ vulnerabilities resolved
- [ ] Zero authentication bypasses in security audit
- [ ] Database migrations working in production
- [ ] Toast/modal feedback live in UI

### Sprint 2 Success Criteria
- [ ] Chat persistence working
- [ ] Search performance <100ms
- [ ] User isolation enforced for templates
- [ ] Backup export functional

### Sprint 3 Success Criteria
- [ ] Test coverage >85%
- [ ] E2E tests running in <5 minutes
- [ ] Zero TODO comments without GitHub issue
- [ ] Code quality metrics improved (SonarQube grade A)

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Sprint 1 slips due to Session Management complexity | High | High | Start EPIC 1.1 immediately, pair program, daily standup |
| EPIC 2.4/2.5 blocked by Sprint 1 delay | Medium | High | Buffer Sprint 2 schedule, have fallback work ready |
| Test infrastructure takes longer than estimated | Medium | Medium | Defer EPIC 3.6 to backlog if needed |
| Database migration breaks production data | Low | Critical | Thorough testing, rollback plan, backup before migration |

---

## Communication Plan

**Daily Standups:**
- What did I complete yesterday?
- What will I complete today?
- Any blockers?

**Sprint Reviews (End of each sprint):**
- Demo completed work
- Review acceptance criteria
- Capture lessons learned

**Sprint Retrospectives:**
- What went well?
- What could be improved?
- Action items for next sprint

---

## Appendix: Quick Reference

### Sprint 1 Epics
1. Session Management (32h) - CRITICAL
2. Database Migration (12h) - CRITICAL
3. Toast Notifications (8h) - HIGH
4. Modal Dialogs (8h) - HIGH
5. File Upload Validation (12h) - CRITICAL
6. Input Validation (12h) - HIGH

### Sprint 2 Epics
1. Backup Export (6h) - HIGH
2. Case Navigation (4h) - HIGH
3. Chat Retrieval (8h) - HIGH
4. Search SessionManager (24h) - HIGH
5. Template User Isolation (24h) - HIGH
6. FTS5 Tests (8h) - MEDIUM

### Sprint 3 Epics
1. CaseService Injectable (16h) - MEDIUM
2. Test Database Seeding (8h) - MEDIUM
3. SearchService Tests (8h) - MEDIUM
4. BackupSettings Tests (8h) - MEDIUM
5. LegalAPIService Tests (4h) - MEDIUM
6. E2E Infrastructure (16h) - MEDIUM
7. Preload API (8h) - MEDIUM

---

**Document Owner:** Engineering Team
**Review Cycle:** Weekly (during sprint)
**Last Updated:** 2025-11-03
**Next Review:** 2025-11-10 (Sprint 1 midpoint)
