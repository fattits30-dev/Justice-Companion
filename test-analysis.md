# Test Failure Analysis - Phase H

## Summary Statistics

- Total Tests: 1,156
- Passing: 795
- Failing: 247
- Skipped: 114
- Test Files: 42 (15 failed, 27 passed)

## Failure Categories

### Category 1: Better-SQLite3 Native Module Mismatch (PRIMARY ISSUE)

**Count: 239+ failures**
**Severity: CRITICAL - BLOCKING**

**Error Message:**

```
The module 'better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 139. This version of Node.js requires
NODE_MODULE_VERSION 127. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

**Secondary Error:**

```
Cannot read properties of undefined (reading 'close')
```

**Affected Test Files (with failure counts):**

1. repositories/CaseFactsRepository.test.ts - 64 failures
2. services/AuthenticationService.test.ts - 47 failures
3. repositories/NotesRepository.test.ts - 34 failures
4. services/ConsentService.test.ts - 33 failures
5. services/UserProfileService.test.ts - 30 failures
6. services/ChatConversationService.test.ts - 30 failures
7. repositories/Phase3Repositories.test.ts - 29 failures
8. repositories/FactsRepositories.test.ts - 28 failures
9. repositories/UserFactsRepository.test.ts - 27 failures
10. services/AuditLogger.test.ts - 1 failure (suite level)
11. services/AuditLogger.e2e.test.ts - 1 failure (suite level)
12. repositories/EvidenceRepository.test.ts - 1 failure (suite level)
13. repositories/CaseRepository.test.ts - 1 failure (suite level)

**Root Cause:**
The better-sqlite3 native binary was compiled against Node.js v23.x (MODULE_VERSION 139)
but the current environment is running Node.js v20.x (MODULE_VERSION 127).

**Complexity: SIMPLE (once identified)**

**Fix Required:**
Rebuild better-sqlite3 for the correct Node.js version:

```bash
pnpm rebuild better-sqlite3
# OR
cd node_modules/.pnpm/better-sqlite3@12.4.1/node_modules/better-sqlite3
npm run build-release
```

**Impact:**

- All database-dependent tests (repositories, services using DB)
- All tests requiring encryption services (which need DB for keys)
- All tests requiring audit logging (which uses DB)

---

### Category 2: React Testing Library DOM Query Issues

**Count: 2 failures**
**Severity: LOW**

**Test Files:**

1. components/ErrorBoundary.test.tsx - 1 failure
2. features/settings/components/SettingsView.test.tsx - 1 failure

#### Subcategory 2a: Text Content Split Across Elements

**Failure:** ErrorBoundary.test.tsx > should display default message if error has no message

**Error Message:**

```
TestingLibraryElementError: Unable to find an element with the text:
An unexpected error occurred. This could be because the text is
broken up by multiple elements.
```

**Root Cause:**
Text query is too strict - the error message text may be split across
multiple DOM elements due to styling/formatting.

**Complexity: SIMPLE**

**Fix Required:**
Use a more flexible text matcher:

```typescript
// Instead of:
screen.getByText('An unexpected error occurred');

// Use:
screen.getByText(/An unexpected error occurred/i);
// OR
screen.getByText((content, element) => content.includes('An unexpected error occurred'));
```

#### Subcategory 2b: Focus Issues in User Interactions

**Failure:** SettingsView.test.tsx > should update profile on save

**Error Message:**

```
Error: The element to be cleared could not be focused.
```

**Root Cause:**
User event trying to clear an input that's not currently focusable,
likely due to async rendering or component state issues. Missing
act() wrapper or waitFor() before interaction.

**Complexity: MEDIUM**

**Fix Required:**
Wrap user interactions with proper async handling:

```typescript
// Add act() wrapper or use waitFor
await waitFor(() => {
  expect(emailInput).toBeEnabled();
});
await user.clear(emailInput);

// OR ensure element is in document first
await user.click(emailInput); // focus first
await user.clear(emailInput);
```

---

### Category 3: Passing Tests Requiring No Action

**Count: 795 tests**
All React component tests, hooks, utilities, etc. are passing.

---

## Recommended Fix Strategy

### Phase 1: Fix Better-SQLite3 (IMMEDIATE - UNBLOCKS 239 TESTS)

1. Rebuild better-sqlite3 for Node.js v20
2. Run tests to verify database tests pass
3. Estimated time: 5-10 minutes

### Phase 2: Fix DOM Query Issues (QUICK WINS - 2 TESTS)

1. Fix ErrorBoundary text matcher (1 test)
2. Fix SettingsView focus issue (1 test)
3. Estimated time: 10-15 minutes

### Phase 3: Verify and Document

1. Run full test suite
2. Verify 247 -> 0 failures
3. Document the fix
4. Estimated time: 5 minutes

---

## Error Pattern Examples

### Better-SQLite3 Error Pattern:

```
× test name
  → The module 'better-sqlite3\build\Release\better_sqlite3.node'
     was compiled against a different Node.js version using
     NODE_MODULE_VERSION 139. This version of Node.js requires
     NODE_MODULE_VERSION 127.
  → Cannot read properties of undefined (reading 'close')
```

### DOM Query Error Pattern:

```
× test name
  → TestingLibraryElementError: Unable to find an element with the text: ...
     This could be because the text is broken up by multiple elements.
```

### Focus Error Pattern:

```
× test name
  → Error: The element to be ... could not be focused.
```

---

## Notes

1. **NOT React 19 / act() Issues**: Despite initial hypothesis, the failures
   are NOT primarily related to React 19's stricter act() requirements. The
   vast majority (96.8%) are caused by a native module version mismatch.

2. **Better-SQLite3 is Critical**: The better-sqlite3 module is used by:
   - All repository tests (database access)
   - All service tests (authentication, consent, profiles, chat)
   - Audit logging
   - Encryption key storage

3. **Quick Resolution**: This entire issue can be resolved in < 30 minutes
   with the right fix (rebuilding better-sqlite3).
