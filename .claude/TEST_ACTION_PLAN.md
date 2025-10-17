# Justice Companion - Testing Action Plan

**Priority-Based Roadmap to Address Critical Test Gaps**

---

## Quick Reference

| Priority | Tasks | Est. Time | Impact |
|----------|-------|-----------|--------|
| **P0 (Critical)** | 3 tasks | 4-6 hours | Security + CI stability |
| **P1 (High)** | 3 tasks | 8-12 hours | Authorization + Performance |
| **P2 (Medium)** | 3 tasks | 6-8 hours | Input validation + Quality |

**Total Estimated Effort:** 18-26 hours

---

## P0: Critical Security Gaps (Must Fix Immediately)

### Task 1: Fix SecureStorageService Tests (71 failing)

**Issue:** `ReferenceError: window is not defined` - breaks CI

**Solution:**

1. Create Electron mock for tests:

```typescript
// src/test-utils/electron-mock.ts
import { vi } from 'vitest';

export const mockElectronAPI = {
  secureStorage: {
    initialize: vi.fn().mockResolvedValue(true),
    isEncryptionAvailable: vi.fn().mockResolvedValue(true),
    set: vi.fn().mockImplementation(async (key: string, value: string) => {
      return undefined;
    }),
    get: vi.fn().mockImplementation(async (key: string) => {
      return 'mock-value';
    }),
    delete: vi.fn().mockResolvedValue(undefined)
  }
};

// Mock global window object for tests
if (!globalThis.window) {
  (globalThis as any).window = {
    electronAPI: mockElectronAPI
  };
}
```

2. Import in test setup:

```typescript
// src/test-utils/setup.ts
import './electron-mock';
```

3. Configure Vitest:

```typescript
// vitest.config.ts (create if missing)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-utils/setup.ts']
  }
});
```

**Verification:**
```bash
pnpm test src/services/SecureStorageService.test.ts
# Expect: All 75 tests passing
```

**Estimated Time:** 1-2 hours

---

### Task 2: Add Session Validation Unit Tests

**Issue:** IPC handlers do not test session expiration enforcement

**File:** `src/electron-ipc-handlers.test.ts`

**Add Tests:**

```typescript
describe('Session Validation in IPC Handlers', () => {
  it('should reject CASE_GET_ALL with expired session', async () => {
    // Mock expired session
    mockSessionRepository.findById.mockReturnValue({
      id: 'session-123',
      userId: 456,
      expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
    });

    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      sessionId: 'session-123'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Session expired');
  });

  it('should reject CASE_GET_ALL with missing session', async () => {
    mockSessionRepository.findById.mockReturnValue(null);

    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      sessionId: 'invalid-session'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid session');
  });

  it('should reject CASE_GET_BY_ID with expired session', async () => {
    mockSessionRepository.findById.mockReturnValue({
      id: 'session-123',
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });

    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_BY_ID, {
      id: 123,
      sessionId: 'session-123'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Session expired');
  });

  it('should accept CASE_GET_ALL with valid session', async () => {
    mockSessionRepository.findById.mockReturnValue({
      id: 'session-123',
      userId: 456,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    mockCaseRepository.findAll.mockReturnValue([
      { id: 1, title: 'Case 1', userId: 456 }
    ]);

    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      sessionId: 'session-123'
    });

    expect(result.success).toBe(true);
    expect(result.data.length).toBe(1);
  });
});
```

**Verification:**
```bash
pnpm test src/electron-ipc-handlers.test.ts
# Expect: 94+ tests passing (90 existing + 4 new)
```

**Estimated Time:** 1-2 hours

---

### Task 3: Configure Vitest Coverage Reporting

**Issue:** No coverage reports generated (`pnpm test:coverage` fails)

**Solution:**

1. Create Vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'electron/',
        'tests/e2e/',
        'src/test-utils/'
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

2. Update package.json scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

3. Install coverage package (if missing):

```bash
pnpm add -D @vitest/coverage-v8
```

**Verification:**
```bash
pnpm test:coverage
# Expect: Coverage report in ./coverage/index.html
```

**Estimated Time:** 1-2 hours

---

## P1: High Priority - Authorization & Performance

### Task 4: Add Authorization Tests to IPC Handlers

**Issue:** IPC handlers test success paths but not authorization failures

**File:** `src/electron-ipc-handlers.test.ts`

**Add Test Suite:**

```typescript
describe('IPC Authorization Security', () => {
  beforeEach(() => {
    // Setup authorization middleware mock
    mockAuthMiddleware = {
      verifyCaseOwnership: vi.fn(),
      verifyAdminRole: vi.fn(),
      verifyUserActive: vi.fn()
    };
  });

  describe('CASE_GET_BY_ID Authorization', () => {
    it('should block access to non-owned case', async () => {
      // Mock: Case exists but belongs to different user
      mockCaseRepository.findById.mockReturnValue({
        id: 123,
        userId: 999, // Different user
        title: 'Private Case'
      });

      // Mock: Authorization middleware throws
      mockAuthMiddleware.verifyCaseOwnership.mockImplementation(() => {
        throw new AuthorizationError('Access denied: you do not own this case');
      });

      const result = await invokeHandler(IPC_CHANNELS.CASE_GET_BY_ID, {
        id: 123,
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
      expect(mockAuthMiddleware.verifyCaseOwnership).toHaveBeenCalledWith(123, 456);
    });

    it('should allow access to owned case', async () => {
      mockCaseRepository.findById.mockReturnValue({
        id: 123,
        userId: 456,
        title: 'My Case'
      });

      mockAuthMiddleware.verifyCaseOwnership.mockImplementation(() => {
        // Pass - no error
      });

      const result = await invokeHandler(IPC_CHANNELS.CASE_GET_BY_ID, {
        id: 123,
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('My Case');
    });
  });

  describe('CASE_UPDATE Authorization', () => {
    it('should block update of non-owned case', async () => {
      mockAuthMiddleware.verifyCaseOwnership.mockImplementation(() => {
        throw new AuthorizationError('Access denied');
      });

      const result = await invokeHandler(IPC_CHANNELS.CASE_UPDATE, {
        id: 123,
        input: { title: 'Hacked Title' },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });

  describe('CASE_DELETE Authorization', () => {
    it('should block delete of non-owned case', async () => {
      mockAuthMiddleware.verifyCaseOwnership.mockImplementation(() => {
        throw new AuthorizationError('Access denied');
      });

      const result = await invokeHandler(IPC_CHANNELS.CASE_DELETE, {
        id: 123,
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });

  describe('EVIDENCE_CREATE Authorization', () => {
    it('should block evidence creation for non-owned case', async () => {
      mockAuthMiddleware.verifyCaseOwnership.mockImplementation(() => {
        throw new AuthorizationError('Access denied');
      });

      const result = await invokeHandler(IPC_CHANNELS.EVIDENCE_CREATE, {
        input: {
          caseId: 123,
          title: 'Evidence',
          evidenceType: 'document'
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });
});
```

**Add 10+ tests** covering:
- CASE_GET_BY_ID, CASE_UPDATE, CASE_DELETE
- EVIDENCE_GET_BY_ID, EVIDENCE_CREATE, EVIDENCE_UPDATE, EVIDENCE_DELETE
- CONVERSATION_GET, CONVERSATION_DELETE

**Verification:**
```bash
pnpm test src/electron-ipc-handlers.test.ts
# Expect: 100+ tests passing (90 existing + 10+ authorization)
```

**Estimated Time:** 3-4 hours

---

### Task 5: Add Pagination Tests

**Issue:** No tests for CASE_GET_ALL with large datasets (performance risk)

**File:** `src/electron-ipc-handlers.test.ts`

**Add Tests:**

```typescript
describe('Pagination Performance Tests', () => {
  it('should handle CASE_GET_ALL with 1000 cases using pagination', async () => {
    // Create 1000 mock cases
    const largeCaseList = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      title: `Case ${i + 1}`,
      userId: 456,
      caseType: 'consumer',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    mockCaseRepository.findAll.mockReturnValue(largeCaseList);

    // Request first page (50 items)
    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      page: 1,
      pageSize: 50,
      sessionId: 'user-456-session'
    });

    expect(result.success).toBe(true);
    expect(result.data.items.length).toBe(50);
    expect(result.data.total).toBe(1000);
    expect(result.data.page).toBe(1);
    expect(result.data.totalPages).toBe(20);
  });

  it('should handle CASE_GET_ALL with pagination on last page', async () => {
    const largeCaseList = Array.from({ length: 95 }, (_, i) => ({
      id: i + 1,
      title: `Case ${i + 1}`,
      userId: 456
    }));

    mockCaseRepository.findAll.mockReturnValue(largeCaseList);

    // Request last page (page 2, 45 remaining items)
    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      page: 2,
      pageSize: 50,
      sessionId: 'user-456-session'
    });

    expect(result.success).toBe(true);
    expect(result.data.items.length).toBe(45);
    expect(result.data.total).toBe(95);
  });

  it('should decrypt paginated cases efficiently', async () => {
    // Create 100 cases with encrypted descriptions
    const encryptedCases = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      title: `Case ${i}`,
      description: mockEncryptionService.encrypt(`Description ${i}`)
    }));

    mockCaseRepository.findAll.mockReturnValue(encryptedCases);

    const start = performance.now();

    const result = await invokeHandler(IPC_CHANNELS.CASE_GET_ALL, {
      page: 1,
      pageSize: 50,
      sessionId: 'user-456-session'
    });

    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(500); // Should complete in under 500ms
  });
});
```

**Verification:**
```bash
pnpm test src/electron-ipc-handlers.test.ts -- --grep "Pagination"
# Expect: 3 tests passing
```

**Estimated Time:** 2-3 hours

---

### Task 6: Add Performance Benchmarks

**Issue:** No tests verify encryption/decryption performance at scale

**File:** `src/repositories/CaseRepository.test.ts`

**Add Tests:**

```typescript
describe('Performance Benchmarks', () => {
  it('should decrypt 1000 cases in under 1 second', () => {
    // Create 1000 cases with encrypted descriptions
    const cases = Array.from({ length: 1000 }, (_, i) => {
      const encrypted = encryptionService.encrypt(`Description ${i}`);
      db.prepare(
        `INSERT INTO cases (user_id, title, description, case_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(1, `Case ${i}`, JSON.stringify(encrypted), 'consumer', 'active');
    });

    const start = performance.now();
    const allCases = repository.findAll();
    const elapsed = performance.now() - start;

    expect(allCases.length).toBe(1000);
    expect(elapsed).toBeLessThan(1000); // 1 second max
  });

  it('should not leak memory after 100 encrypt/decrypt cycles', () => {
    if (!global.gc) {
      console.warn('Skipping memory test: Run with --expose-gc flag');
      return;
    }

    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 100; i++) {
      const largeText = 'A'.repeat(10000); // 10KB
      const encrypted = encryptionService.encrypt(largeText);
      encryptionService.decrypt(encrypted);
    }

    global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB max
  });
});
```

**Verification:**
```bash
pnpm test src/repositories/CaseRepository.test.ts -- --grep "Performance"
# Expect: 2 tests passing
```

**Estimated Time:** 2-3 hours

---

## P2: Medium Priority - Quality Improvements

### Task 7: Add Input Validation Tests

**Issue:** No tests for malicious payloads (SQL injection, XSS)

**File:** `src/electron-ipc-handlers.test.ts`

**Add Tests:**

```typescript
describe('Input Validation & Security', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection in CASE_CREATE title', async () => {
      const result = await invokeHandler(IPC_CHANNELS.CASE_CREATE, {
        input: {
          title: "'; DROP TABLE cases; --",
          caseType: 'consumer'
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(true);
      expect(result.data.title).not.toContain('DROP TABLE');
      // Title should be stored safely (parameterized query)
    });

    it('should sanitize SQL injection in CASE_UPDATE description', async () => {
      const result = await invokeHandler(IPC_CHANNELS.CASE_UPDATE, {
        id: 123,
        input: {
          description: "'; DELETE FROM users WHERE '1'='1"
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(true);
      // Should not execute malicious SQL
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize XSS in CASE_CREATE title', async () => {
      const result = await invokeHandler(IPC_CHANNELS.CASE_CREATE, {
        input: {
          title: '<script>alert("XSS")</script>',
          caseType: 'consumer'
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(true);
      expect(result.data.title).not.toContain('<script>');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal in EVIDENCE_CREATE filePath', async () => {
      const result = await invokeHandler(IPC_CHANNELS.EVIDENCE_CREATE, {
        input: {
          caseId: 123,
          title: 'Evidence',
          evidenceType: 'document',
          filePath: '../../etc/passwd'
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file path');
    });
  });

  describe('Oversized Input Prevention', () => {
    it('should reject oversized CASE_CREATE description (>100KB)', async () => {
      const largeDescription = 'A'.repeat(100 * 1024 + 1); // 100KB + 1 byte

      const result = await invokeHandler(IPC_CHANNELS.CASE_CREATE, {
        input: {
          title: 'Large Case',
          caseType: 'consumer',
          description: largeDescription
        },
        sessionId: 'user-456-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Description too large');
    });
  });
});
```

**Verification:**
```bash
pnpm test src/electron-ipc-handlers.test.ts -- --grep "Input Validation"
# Expect: 5 tests passing
```

**Estimated Time:** 2-3 hours

---

### Task 8: Add Rate Limiting E2E Tests

**Issue:** Rate limiting tested at unit level but not E2E (UI-level brute force)

**File:** `tests/e2e/specs/authentication.e2e.test.ts`

**Add Tests:**

```typescript
test.describe('Rate Limiting E2E', () => {
  test('should lock account after 5 failed login attempts', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // Create test user
    const user = createTestUser(db, 'ratelimituser', 'ratelimit@example.com', 'CorrectPassword123!');
    db.close();

    // Attempt login 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      await window.fill('#username', 'ratelimituser');
      await window.fill('#password', 'WrongPassword123!');
      await window.getByRole('button', { name: 'Login' }).click();
      await window.waitForTimeout(500);
    }

    // 6th attempt should show account locked
    await window.fill('#username', 'ratelimituser');
    await window.fill('#password', 'CorrectPassword123!'); // Correct password
    await window.getByRole('button', { name: 'Login' }).click();

    await expect(window.getByText(/account.*locked/i)).toBeVisible({ timeout: 5000 });
  });

  test('should unlock account after 15 minutes', async () => {
    const { window, dbPath } = testApp;
    const db = getTestDatabase(dbPath);

    // Create test user
    const user = createTestUser(db, 'unlockuser', 'unlock@example.com', 'CorrectPassword123!');

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await window.fill('#username', 'unlockuser');
      await window.fill('#password', 'WrongPassword123!');
      await window.getByRole('button', { name: 'Login' }).click();
      await window.waitForTimeout(500);
    }

    // Manually expire lock time in database
    db.prepare(
      `UPDATE rate_limits
       SET lock_until = datetime('now', '-1 minute')
       WHERE username = ?`
    ).run('unlockuser');

    db.close();

    // Should be able to login now
    await window.fill('#username', 'unlockuser');
    await window.fill('#password', 'CorrectPassword123!');
    await window.getByRole('button', { name: 'Login' }).click();

    await expect(window.getByText('Welcome to Justice Companion')).toBeVisible({ timeout: 10000 });
  });

  test('should display remaining attempts before lockout', async () => {
    const { window } = testApp;

    // Attempt login 3 times with wrong password
    for (let i = 0; i < 3; i++) {
      await window.fill('#username', 'testuser');
      await window.fill('#password', 'WrongPassword123!');
      await window.getByRole('button', { name: 'Login' }).click();
      await window.waitForTimeout(500);
    }

    // Should show "2 attempts remaining"
    await expect(window.getByText(/2.*attempts.*remaining/i)).toBeVisible({ timeout: 5000 });
  });
});
```

**Verification:**
```bash
pnpm test:e2e tests/e2e/specs/authentication.e2e.test.ts
# Expect: 3 new tests passing
```

**Estimated Time:** 2-3 hours

---

### Task 9: Add Coverage Badge to README

**Issue:** No visible test coverage indicator

**File:** `README.md`

**Add Badge:**

```markdown
# Justice Companion

[![Test Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)]()
[![Tests](https://img.shields.io/badge/tests-1152%20passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)]()

...
```

**Update badge after coverage configured:**

```bash
# Run coverage
pnpm test:coverage

# Extract coverage percentage from output
# Update badge in README.md
```

**Estimated Time:** 1 hour

---

## Implementation Timeline

### Week 1: Critical Fixes (P0)
- **Day 1-2:** Task 1 - Fix SecureStorageService tests
- **Day 2-3:** Task 2 - Add session validation tests
- **Day 3-4:** Task 3 - Configure coverage reporting

**Deliverable:** All tests passing, coverage reports generated

---

### Week 2: Authorization & Performance (P1)
- **Day 1-2:** Task 4 - Add IPC authorization tests
- **Day 3:** Task 5 - Add pagination tests
- **Day 4:** Task 6 - Add performance benchmarks

**Deliverable:** 90%+ IPC test coverage, performance baselines

---

### Week 3: Quality Improvements (P2)
- **Day 1-2:** Task 7 - Add input validation tests
- **Day 2-3:** Task 8 - Add rate limiting E2E tests
- **Day 3:** Task 9 - Add coverage badge

**Deliverable:** Comprehensive test suite, 90%+ overall coverage

---

## Success Metrics

After completing all tasks:

- ✅ **0 failing tests** (currently 71)
- ✅ **90%+ code coverage** (currently ~75-85%)
- ✅ **100+ IPC handler tests** (currently 90)
- ✅ **10+ E2E security tests** (currently 11)
- ✅ **Performance benchmarks** for critical operations
- ✅ **CI green** on all platforms

---

## Continuous Improvement

**Post-Implementation:**

1. **Add coverage to CI:**
   - Fail builds if coverage drops below 80%
   - Upload coverage to Codecov or Coveralls

2. **Monitor flaky tests:**
   - Track test retry rates
   - Fix or skip unstable tests

3. **Add mutation testing:**
   - Use `stryker-mutator` to validate test quality
   - Target: 70%+ mutation score

4. **Performance regression tests:**
   - Run benchmarks on every PR
   - Alert if performance degrades >10%

---

## Resources

**Documentation:**
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- Better-SQLite3: https://github.com/WiseLibs/better-sqlite3

**Tools:**
- Coverage viewer: Open `coverage/index.html` after `pnpm test:coverage`
- Test UI: Run `pnpm test:ui` for interactive debugging
- E2E debugging: Use Playwright Inspector

---

**End of Action Plan**
