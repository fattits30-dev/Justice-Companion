---
name: testing-workflow
description: "Testing workflow orchestration for Justice Companion: runs unit tests (Vitest), E2E tests (Playwright), coverage reports, and pre-commit validation. Use when writing tests, debugging test failures, or validating code before commits."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "mcp__memory__*"]
---

# Testing Workflow Skill

## Purpose
Comprehensive test execution and validation for Justice Companion's multi-layer testing strategy.

## When Claude Uses This
- User requests "run tests" or "test this feature"
- Test failures occur
- Before git commits
- When writing new features
- User asks "how do I test this?"

## Testing Architecture

### Test Layers
```
Justice Companion Testing Strategy:
├── Unit Tests (Vitest)
│   ├── Services (AuthenticationService, EncryptionService, etc.)
│   ├── Repositories (UserRepository, CaseRepository, etc.)
│   └── Utilities (helpers, validators)
├── Integration Tests (Vitest)
│   ├── GDPR workflows
│   └── Database operations
└── E2E Tests (Playwright)
    ├── Authentication flows
    ├── Case management
    └── Electron app interactions
```

### Test Database Strategy
- **Unit/Integration:** In-memory SQLite (fast, isolated)
- **E2E:** Temporary database files (cleaned after tests)

---

## Common Commands

### Run All Tests
```bash
# Full test suite
pnpm test

# Expected output:
# Test Files  57 passed (57)
#      Tests  1156 passed (1156)
#   Start at  14:32:15
#   Duration  12.34s
```

### Run Specific Test File
```bash
# Single file
pnpm test src/services/AuthenticationService.test.ts

# Pattern matching
pnpm test src/repositories/*.test.ts
```

### Run with Coverage
```bash
# Generate coverage report
pnpm test:coverage

# Opens: coverage/index.html
# Target: 80%+ coverage
```

### Run E2E Tests
```bash
# All E2E tests (Playwright)
pnpm test:e2e

# Specific E2E test
pnpm test:e2e tests/e2e/auth.spec.ts

# E2E with UI (debug mode)
pnpm test:e2e --ui
```

---

## Pre-Test Checklist

### Before Running Tests
```bash
# 1. Ensure Node.js 20.18.0
node --version  # Must be v20.18.0

# 2. Rebuild for Node runtime (CRITICAL)
pnpm rebuild:node

# Why: Tests run in Node.js, not Electron
# better-sqlite3 must be compiled for Node

# 3. Verify dependencies installed
pnpm list better-sqlite3
```

### If Tests Fail with Module Errors
```bash
# Module version mismatch
rm -rf node_modules
pnpm install
pnpm rebuild:node  # NOT rebuild:electron
pnpm test
```

---

## Writing Tests

### Unit Test Template (Services)
```typescript
// src/services/ExampleService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExampleService } from './ExampleService.ts';
import { DatabaseTestHelper } from '../test-utils/database-test-helper.ts';

describe('ExampleService', () => {
  let db: Database;
  let service: ExampleService;

  beforeEach(async () => {
    // In-memory database
    db = DatabaseTestHelper.createTestDatabase();
    service = new ExampleService(db);
  });

  afterEach(() => {
    // Clean up
    db.close();
  });

  it('should perform operation', async () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = await service.doSomething(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Template (GDPR)
```typescript
// src/services/gdpr/Example.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GdprService } from './GdprService.ts';
import { DatabaseTestHelper } from '../../test-utils/database-test-helper.ts';

describe('GDPR Integration Tests', () => {
  let db: Database;
  let gdprService: GdprService;

  beforeEach(async () => {
    db = DatabaseTestHelper.createTestDatabase();
    // Seed test data
    await DatabaseTestHelper.seedTestUser(db, { userId: 1 });

    gdprService = new GdprService(db, encryptionService, auditLogger);
  });

  afterEach(() => {
    db.close();
  });

  it('should export all user data', async () => {
    const result = await gdprService.exportUserData(1);

    expect(result.metadata.totalRecords).toBeGreaterThan(0);
    expect(result.data.user).toBeDefined();
  });
});
```

### E2E Test Template (Playwright)
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { ElectronApplication } from 'playwright';

test.describe('Authentication', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async ({ playwright }) => {
    electronApp = await playwright._electron.launch({
      args: ['electron/main.ts'],
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should login successfully', async () => {
    const window = await electronApp.firstWindow();

    // Fill login form
    await window.fill('#email', 'test@example.com');
    await window.fill('#password', 'password123');
    await window.click('#login-button');

    // Verify redirect to dashboard
    await expect(window).toHaveURL(/dashboard/);
  });
});
```

---

## Test Debugging

### Verbose Output
```bash
# Show detailed test output
pnpm test --reporter=verbose

# Show console.log in tests
pnpm test --reporter=verbose --reporter=html
```

### Run Single Test
```bash
# Use .only to focus on one test
it.only('should test this specific thing', async () => {
  // ...
});

# Run tests
pnpm test
```

### Debug with Inspector
```bash
# Node inspector (unit tests)
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Playwright inspector (E2E)
pnpm test:e2e --debug
```

### Watch Mode
```bash
# Auto-run tests on file changes
pnpm test --watch

# Useful during TDD
```

---

## CI/CD Testing

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'  # CRITICAL

      - run: pnpm install
      - run: pnpm rebuild:node  # CRITICAL for tests
      - run: pnpm test
      - run: pnpm test:e2e
```

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
pnpm lint:fix
pnpm type-check
pnpm test  # Run tests before commit
```

---

## Coverage Reports

### Generate Coverage
```bash
# Run with coverage
pnpm test:coverage

# Output location:
# coverage/index.html
```

### Coverage Thresholds
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      lines: 80,      // Target: 80%+
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

### View Coverage Report
```bash
# Open in browser
start coverage/index.html  # Windows
open coverage/index.html   # macOS
xdg-open coverage/index.html  # Linux
```

---

## Test Data Management

### Database Test Helper
```typescript
// src/test-utils/database-test-helper.ts
export class DatabaseTestHelper {
  static createTestDatabase(): Database {
    // In-memory database for tests
    return new Database(':memory:');
  }

  static async seedTestUser(db: Database, options = {}) {
    const userId = options.userId || 1;
    const email = options.email || 'test@example.com';

    // Insert test user
    db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, email]);
  }

  static async clearDatabase(db: Database) {
    // Delete all data (test cleanup)
    const tables = ['users', 'cases', 'evidence', /* ... */];
    for (const table of tables) {
      db.run(`DELETE FROM ${table}`);
    }
  }
}
```

### User Factory (Test Data)
```typescript
// tests/helpers/UserFactory.ts
export class UserFactory {
  static create(overrides = {}) {
    return {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      ...overrides,
    };
  }

  static async createInDatabase(db: Database, overrides = {}) {
    const user = UserFactory.create(overrides);
    // Hash password, encrypt fields, insert
    return insertedUser;
  }
}
```

---

## Common Test Failures

### 1. Module Version Mismatch
```
Error: MODULE_NOT_FOUND: better-sqlite3
```
**Fix:**
```bash
pnpm rebuild:node
pnpm test
```

### 2. Database Lock
```
Error: SQLITE_BUSY: database is locked
```
**Fix:**
```typescript
// Close database in afterEach
afterEach(() => {
  db.close();  // CRITICAL
});
```

### 3. Async Timeout
```
Error: Test timeout of 5000ms exceeded
```
**Fix:**
```typescript
// Increase timeout for slow operations
it('should perform slow operation', async () => {
  // ...
}, { timeout: 10000 });  // 10 seconds
```

### 4. Encryption Service Not Initialized
```
Error: Cannot read property 'encrypt' of undefined
```
**Fix:**
```typescript
beforeEach(() => {
  const encryptionKey = crypto.randomBytes(32);
  encryptionService = new EncryptionService(encryptionKey);
});
```

---

## Test-Driven Development (TDD)

### Red-Green-Refactor
```bash
# 1. RED: Write failing test
pnpm test src/services/NewFeature.test.ts
# ❌ Expected: feature works, Actual: not implemented

# 2. GREEN: Implement minimum code to pass
# ... write code ...
pnpm test src/services/NewFeature.test.ts
# ✅ All tests passing

# 3. REFACTOR: Improve code quality
# ... refactor ...
pnpm test src/services/NewFeature.test.ts
# ✅ Still passing
```

---

## Performance Testing

### Benchmark Tests
```typescript
import { bench, describe } from 'vitest';

describe('Performance Benchmarks', () => {
  bench('encrypt 1000 fields', async () => {
    for (let i = 0; i < 1000; i++) {
      await encryptionService.encrypt('test data');
    }
  });
});
```

### Run Benchmarks
```bash
pnpm test --run --reporter=verbose --benchmark
```

---

## Test Best Practices

### ✅ DO:
- Use in-memory database for unit tests
- Clean up resources in `afterEach`
- Use descriptive test names
- Test edge cases (null, empty, invalid)
- Mock external dependencies
- Use test helpers for common operations

### ❌ DON'T:
- Rely on test execution order
- Use real database files (use `:memory:`)
- Skip cleanup (causes flaky tests)
- Test implementation details
- Hard-code test data
- Use `console.log` (use proper assertions)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run all unit tests |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm rebuild:node` | Rebuild before tests |
| `pnpm test --watch` | TDD mode (auto-run) |
| `pnpm test:e2e --ui` | Debug E2E tests |

---

## Test Suite Health

### Current Status (As of 2025-10-21)
```
Test Files: 57 passed
     Tests: 1156 passed (99.7% pass rate)
  Coverage: ~75% (target: 80%)
  Duration: ~12-15 seconds

Known Issues:
- 4 tests fail with Node 22.x (use Node 20.18.0)
```

### Monitoring Test Health
```bash
# Check test status
pnpm test --reporter=json > test-results.json

# Track over time
git log --oneline -- test-results.json
```

---

**Golden Rule:** Always run `pnpm rebuild:node` before tests. Always clean up database connections in `afterEach`. Never commit code with failing tests.
