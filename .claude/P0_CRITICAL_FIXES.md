# P0 Critical Fixes - Production Blockers

**Status:** 🔴 IN PROGRESS
**Target Completion:** 1-2 weeks
**Total Estimated Effort:** 13-20 hours

---

## Overview

This document tracks all P0 (Critical) issues that **MUST** be resolved before ANY production deployment. These are deployment blockers identified in the comprehensive code review.

---

## P0 Issues

### 1. Fix 6 Authorization Bypass Vulnerabilities (CVSS 9.8)

**Status:** ⏳ TODO
**Priority:** URGENT
**Effort:** 2-4 hours
**Severity:** CRITICAL - Complete data breach risk

**Issue:** Any authenticated user can access/modify all users' data due to missing authorization checks.

**Affected IPC Handlers:**
- [x] `case:create` - No userId filtering
- [ ] `case:list` - Returns ALL users' cases
- [ ] `case:get` - No ownership verification
- [ ] `case:update` - Missing authorization check
- [ ] `case:delete` - Missing authorization check
- [ ] `evidence:upload` - No case ownership check
- [ ] `evidence:list` - Returns all evidence
- [ ] `evidence:delete` - Missing authorization check
- [ ] `chat:send` - No conversation ownership check
- [ ] `gdpr:export` - Can export other users' data
- [ ] `gdpr:delete` - Can delete other users' data

**Root Cause:**
```typescript
// electron/ipc-handlers.ts:229, 266, 298, etc.
// Missing authorization middleware integration
ipcMain.handle('case:get', async (_event, id) => {
  const caseData = caseService.getCaseById(id);  // ❌ No userId check!
  return successResponse(caseData);
});
```

**Fix Strategy:**
1. Create `withAuthorization` wrapper function
2. Integrate existing `AuthorizationMiddleware` into all protected handlers
3. Add unit tests for authorization failures

**Implementation Steps:**
- [ ] Create authorization wrapper utility
- [ ] Update case handlers (5 handlers)
- [ ] Update evidence handlers (3 handlers)
- [ ] Update chat handler (1 handler)
- [ ] Update GDPR handlers (2 handlers)
- [ ] Add authorization failure tests

**Success Criteria:**
- All 11 affected handlers enforce ownership checks
- Tests verify authorization failures return proper error codes
- No user can access another user's resources

---

### 2. Fix 71 Failing Tests (SecureStorageService)

**Status:** ⏳ TODO
**Priority:** URGENT
**Effort:** 1-2 hours
**Severity:** HIGH - Quality gate violations

**Issue:** SecureStorageService tests fail because `window.electronAPI` is unavailable in Node test environment.

**Error:**
```
ReferenceError: window is not defined
  at SecureStorageService.store()
```

**Root Cause:** Tests run in Node environment without Electron API mock.

**Fix Strategy:**
```typescript
// Mock Electron API in test setup
beforeEach(() => {
  global.window = {
    electronAPI: {
      secureStorage: {
        store: vi.fn(),
        retrieve: vi.fn(),
      },
    },
  };
});
```

**Implementation Steps:**
- [ ] Create Electron API mock utility
- [ ] Add mock setup to SecureStorageService tests
- [ ] Verify all 71 tests pass
- [ ] Add test documentation

**Success Criteria:**
- All 71 tests pass
- Test pass rate reaches 100% (1156/1156)
- CI pipeline passes without test failures

---

### 3. Add Session Validation to All IPC Handlers

**Status:** ⏳ TODO
**Priority:** URGENT
**Effort:** 2-3 hours
**Severity:** CRITICAL - Unauthenticated access possible

**Issue:** No session validation on protected IPC handlers - unauthenticated users can call protected handlers.

**Affected Handlers:**
- All case management handlers (5)
- All evidence handlers (3)
- Chat handler (1)
- GDPR handlers (2)

**Exploit Example:**
```typescript
// Unauthenticated user can call protected handlers
await window.electronAPI.cases.list();  // ✅ Works without login!
```

**Fix Strategy:**
```typescript
function withAuthorization<T>(
  sessionId: string | undefined,
  handler: (userId: number) => Promise<T>
): Promise<IPCResponse<T>> {
  if (!sessionId) {
    return errorResponse(IPCErrorCode.NOT_AUTHENTICATED, 'Session required');
  }

  // Validate session exists and not expired
  const session = sessionService.validateSession(sessionId);
  if (!session) {
    return errorResponse(IPCErrorCode.SESSION_EXPIRED, 'Session expired');
  }

  return handler(session.userId);
}
```

**Implementation Steps:**
- [ ] Create `withAuthorization` wrapper
- [ ] Add session validation logic
- [ ] Update all protected handlers to require sessionId
- [ ] Add session validation unit tests
- [ ] Add E2E tests for unauthenticated access attempts

**Success Criteria:**
- All protected handlers validate session
- Expired sessions are rejected
- Invalid sessions are rejected
- Tests verify proper error codes returned

---

### 4. Make EncryptionService Required in All Repositories

**Status:** ⏳ TODO
**Priority:** HIGH
**Effort:** 2-3 hours
**Severity:** HIGH - Sensitive data could be stored in plaintext

**Issue:** `EncryptionService` is optional in repositories, allowing plaintext storage of sensitive data.

**Affected Files:**
- `src/repositories/CaseRepository.ts`
- `src/repositories/EvidenceRepository.ts`
- `src/repositories/ConversationRepository.ts`

**Current Code:**
```typescript
// src/repositories/CaseRepository.ts:8-9
constructor(
  private encryptionService?: EncryptionService,  // ❌ Optional!
  private auditLogger?: AuditLogger,
) {}
```

**Fix Strategy:**
```typescript
constructor(
  private encryptionService: EncryptionService,  // ✅ Required
  private auditLogger: AuditLogger,             // ✅ Required
) {
  // No null checks needed - guaranteed at compile time
}
```

**Implementation Steps:**
- [ ] Remove `?` from EncryptionService parameters in all repositories
- [ ] Remove `?` from AuditLogger parameters in all repositories
- [ ] Update repository instantiation to always provide services
- [ ] Remove null checks for these services
- [ ] Update tests to always provide mocked services
- [ ] Verify TypeScript compilation passes

**Success Criteria:**
- No optional encryption/audit services in repositories
- TypeScript enforces service provision at compile time
- All tests pass with required services
- No null/undefined checks for core services

---

### 5. Implement Sentry Crash Reporting and Monitoring

**Status:** ⏳ TODO
**Priority:** HIGH
**Effort:** 4-6 hours
**Severity:** HIGH - Blind to production issues

**Issue:** No crash reporting, error tracking, or monitoring in production.

**Impact:**
- Production crashes go undetected
- No visibility into user problems
- Cannot track performance regressions
- No error rate monitoring

**Fix Strategy:**
1. Install Sentry SDK for Electron
2. Configure separate Sentry projects for main/renderer processes
3. Add error boundaries in React
4. Implement performance monitoring
5. Configure release tracking

**Implementation Steps:**
- [ ] Install `@sentry/electron` package
- [ ] Create Sentry project (production + staging)
- [ ] Configure Sentry in `electron/main.ts`
- [ ] Configure Sentry in `src/main.tsx`
- [ ] Add Sentry error boundary component
- [ ] Configure source maps for error tracking
- [ ] Add performance instrumentation
- [ ] Add custom error context (userId, caseId, etc.)
- [ ] Configure Sentry DSN in environment variables
- [ ] Add Sentry to CI/CD pipeline
- [ ] Test error reporting in staging

**Sentry Configuration:**
```typescript
// electron/main.ts
import * as Sentry from '@sentry/electron/main';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `justice-companion@${app.getVersion()}`,
  tracesSampleRate: 0.1, // 10% of transactions
});

// src/main.tsx
import * as Sentry from '@sentry/electron/renderer';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

**Success Criteria:**
- Sentry SDK integrated in main and renderer processes
- Errors automatically reported to Sentry
- Source maps uploaded for readable stack traces
- Performance metrics tracked
- User context added to error reports
- Staging environment tested

---

### 6. Fix ESLint Configuration for v9

**Status:** ⏳ TODO
**Priority:** MEDIUM (but quick)
**Effort:** 2 hours
**Severity:** MEDIUM - No automated code quality checks

**Issue:** ESLint v9 requires new configuration format (`eslint.config.js`), current config is v8 format (`.eslintrc`).

**Impact:**
- Linting non-functional
- No automated code quality checks
- Style inconsistencies accumulate
- CI pipeline doesn't catch code issues

**Error:**
```bash
$ pnpm lint
Error: ESLint configuration file not found (eslint.config.js required for v9)
```

**Fix Strategy:**
Create new `eslint.config.js` with flat config format:

```javascript
// eslint.config.js
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

**Implementation Steps:**
- [ ] Create `eslint.config.js` with flat config format
- [ ] Migrate rules from old `.eslintrc` config
- [ ] Update ESLint plugins to v9-compatible versions
- [ ] Test ESLint on codebase
- [ ] Fix any new linting errors
- [ ] Update `package.json` scripts if needed
- [ ] Update CI pipeline to use new config
- [ ] Document ESLint configuration

**Success Criteria:**
- `pnpm lint` runs successfully
- All critical rules enforced
- CI pipeline uses new ESLint config
- No regression in code quality checks

---

## P0 Progress Tracking

### Overall Status

| Issue | Status | Effort | Started | Completed |
|-------|--------|--------|---------|-----------|
| 1. Authorization Bypass | ⏳ TODO | 2-4h | - | - |
| 2. Failing Tests | ⏳ TODO | 1-2h | - | - |
| 3. Session Validation | ⏳ TODO | 2-3h | - | - |
| 4. Required Encryption | ⏳ TODO | 2-3h | - | - |
| 5. Sentry Monitoring | ⏳ TODO | 4-6h | - | - |
| 6. ESLint v9 Config | ⏳ TODO | 2h | - | - |

**Total Progress:** 0% (0/6 issues completed)
**Estimated Remaining:** 13-20 hours

### Completion Criteria

✅ **All P0 issues resolved** (6/6)
✅ **All tests passing** (100% pass rate)
✅ **Security scan passes** (0 critical/high vulnerabilities)
✅ **CI pipeline green** (all workflows pass)
✅ **Monitoring operational** (Sentry reporting errors)

---

## Next Steps

1. **Immediate:** Fix authorization bypass vulnerabilities (highest risk)
2. **Quick Win:** Fix failing tests (unblocks CI)
3. **Security:** Add session validation
4. **Quality:** Make encryption required
5. **Operational:** Implement monitoring
6. **Infrastructure:** Fix ESLint configuration

Once all P0 issues are resolved, proceed to **P1 (High Priority)** fixes for production readiness.

---

## Notes

- **DO NOT DEPLOY TO PRODUCTION** until all P0 issues are resolved
- Each fix should include corresponding tests
- Update this document as issues are completed
- Run full test suite after each fix
- Verify CI pipeline passes after all fixes

---

**Last Updated:** October 17, 2025
**Next Review:** After completing all P0 fixes
