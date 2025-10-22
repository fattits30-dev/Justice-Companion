# Authentication Testing Strategy - Justice Companion

**Status**: Post-TSX import fixes (74 files updated)
**Priority**: Critical - Authentication is the security foundation
**Test Coverage Target**: 100% for auth flow critical paths

---

## 🎯 Executive Summary

After fixing 74 import issues to support TSX's ESM module resolution, we need to verify the authentication system works end-to-end. This document provides a **two-phase testing approach**:

1. **Phase 1**: Manual verification (immediate, user-driven)
2. **Phase 2**: Automated Playwright tests (after manual pass)

---

## 📋 Phase 1: Manual Testing Checklist

### Prerequisites
```bash
# Ensure correct Node version
nvm use 20  # or fnm use 20

# Verify node_modules are intact
pnpm install

# Rebuild native modules for Electron
pnpm rebuild:electron

# Start the app
pnpm electron:dev
```

### Test 1: Application Launch ✅
**Objective**: Verify app starts without import errors

- [ ] App window opens successfully
- [ ] No "Cannot find module" errors in console (Ctrl+Shift+I)
- [ ] Login/Register UI appears
- [ ] No blank white screen

**Expected Behavior**: Login screen with username/password fields

**Debug if fails**:
```javascript
// In DevTools console (F12):
console.log(window.justiceAPI);  // Should show API methods
console.log(window.electron);    // Should show electron API
```

---

### Test 2: User Registration ✅
**Objective**: Verify user creation flow (database write operations)

**Steps**:
1. Click "Register" or navigate to registration page
2. Fill in registration form:
   - Username: `testuser_manual`
   - Email: `test@example.com`
   - Password: `TestPassword123!` (meets OWASP requirements)
   - Confirm Password: `TestPassword123!` (if field exists)
3. Click "Register" or "Create Account"

**Expected Results**:
- [ ] User created successfully
- [ ] No console errors related to UserRepository imports
- [ ] User redirected to dashboard OR login screen
- [ ] Success message displayed

**Database Verification**:
```sql
-- Check user was created in SQLite database
SELECT id, username, email, role, is_active, created_at
FROM users
WHERE username = 'testuser_manual';
```

**Debug if fails**:
```javascript
// Check IPC handler registration
window.justiceAPI.registerUser('test', 'Test1234567890!', 'test@test.com')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

---

### Test 3: Password Validation ✅
**Objective**: Verify OWASP password requirements enforced

**Test Cases**:
| Input Password | Expected Behavior | Reason |
|---------------|-------------------|---------|
| `Short1!` | ❌ Error: "Password must be at least 12 characters" | Too short (7 chars) |
| `lowercase123456` | ❌ Error: "Password must contain uppercase letter" | No uppercase |
| `UPPERCASE123456` | ❌ Error: "Password must contain lowercase letter" | No lowercase |
| `NoNumbersHere!` | ❌ Error: "Password must contain at least one number" | No digits |
| `ValidPass123!` | ✅ Success | Meets all requirements |

**Steps**:
1. Try registering with each password above
2. Verify correct error messages appear
3. Verify only valid password succeeds

---

### Test 4: Login with Valid Credentials ✅
**Objective**: Verify authentication flow (UserRepository → AuthenticationService → SessionRepository)

**Steps**:
1. If already logged in, logout first
2. Navigate to login page
3. Enter credentials:
   - Username: `testuser_manual`
   - Password: `TestPassword123!`
   - Remember Me: ☐ (unchecked for now)
4. Click "Login"

**Expected Results**:
- [ ] Login succeeds without errors
- [ ] User redirected to dashboard
- [ ] Session created in database (check sessions table)
- [ ] User's `last_login_at` timestamp updated
- [ ] Console logs show successful authentication

**Database Verification**:
```sql
-- Check session was created
SELECT id, user_id, expires_at, remember_me, created_at
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'testuser_manual')
ORDER BY created_at DESC
LIMIT 1;

-- Check last login updated
SELECT username, last_login_at
FROM users
WHERE username = 'testuser_manual';
```

**IPC Flow Verification** (in DevTools console):
```javascript
// Test IPC handler directly
window.justiceAPI.loginUser('testuser_manual', 'TestPassword123!', false)
  .then(result => {
    console.log('Login result:', result);
    console.log('Session ID:', result.data?.sessionId);
    console.log('User ID:', result.data?.userId);
  })
  .catch(error => console.error('Login failed:', error));
```

---

### Test 5: Login with Invalid Credentials ❌
**Objective**: Verify error handling and rate limiting

**Test Cases**:
| Scenario | Username | Password | Expected Behavior |
|----------|----------|----------|-------------------|
| Wrong password | `testuser_manual` | `WrongPassword123!` | ❌ Error: "Invalid credentials" |
| Non-existent user | `nonexistent_user` | `TestPassword123!` | ❌ Error: "Invalid credentials" |
| Empty fields | `` | `` | ❌ Error: "Username cannot be empty" |

**Steps**:
1. Try each invalid login above
2. Verify error messages displayed
3. Verify user NOT logged in (no session created)

**Rate Limiting Test** (5 attempts):
1. Try invalid login 5 times rapidly
2. Verify account locked message after 5th attempt
3. Wait 15 minutes OR check rate limit in `RateLimitService`
4. Verify login works again after cooldown

---

### Test 6: Session Persistence (Remember Me) ✅
**Objective**: Verify long-lived sessions with Remember Me

**Steps**:
1. Logout if logged in
2. Login with Remember Me checked:
   - Username: `testuser_manual`
   - Password: `TestPassword123!`
   - Remember Me: ☑ (checked)
3. Close the app completely (`Alt+F4` or `Cmd+Q`)
4. Reopen the app
5. Verify user is still logged in (no login screen)

**Expected Results**:
- [ ] Session persists across app restarts
- [ ] User goes directly to dashboard on reopen
- [ ] Session has 30-day expiration (not 24 hours)

**Database Verification**:
```sql
-- Check remember_me flag set
SELECT id, user_id, expires_at, remember_me, created_at
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'testuser_manual')
ORDER BY created_at DESC
LIMIT 1;

-- Verify expiration is ~30 days from now
-- expires_at should be approximately: current_timestamp + 30 days
```

---

### Test 7: Logout Functionality ✅
**Objective**: Verify session deletion and cleanup

**Steps**:
1. Login if not already logged in
2. Click "Logout" button (or equivalent)
3. Verify redirected to login screen
4. Try accessing protected pages (should redirect to login)

**Expected Results**:
- [ ] Session deleted from database
- [ ] User redirected to login/register page
- [ ] No active sessions remain for user
- [ ] Console logs show successful logout

**Database Verification**:
```sql
-- Check session was deleted
SELECT COUNT(*) as active_sessions
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'testuser_manual')
  AND expires_at > datetime('now');

-- Should return 0 active sessions
```

---

### Test 8: Encryption Verification 🔐
**Objective**: Verify EncryptionService integration

**Steps**:
1. Login with test user
2. Open DevTools → Application → IndexedDB or Local Storage
3. Inspect stored data

**Expected Results**:
- [ ] Password never stored in plaintext (should be hashed)
- [ ] Sensitive fields encrypted in database
- [ ] Session IDs are UUIDs (not predictable)

**Database Verification**:
```sql
-- Check password is hashed (not plaintext)
SELECT username, password_hash, password_salt
FROM users
WHERE username = 'testuser_manual';

-- password_hash should be 128 hex characters (64 bytes)
-- password_salt should be 32 hex characters (16 bytes)
```

---

### Test 9: Audit Logging ✅
**Objective**: Verify all auth events logged

**Steps**:
1. Perform register → login → logout flow
2. Check audit_logs table

**Expected Audit Events**:
```sql
SELECT event_type, user_id, success, created_at, details
FROM audit_logs
WHERE event_type IN ('user.register', 'user.login', 'user.logout')
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Results**:
- [ ] `user.register` event logged (success: true)
- [ ] `user.login` event logged (success: true)
- [ ] `user.logout` event logged (success: true)
- [ ] Failed login attempts logged (success: false)

---

### Test 10: Session Expiration ⏰
**Objective**: Verify expired sessions rejected

**Steps**:
1. Login to create a session
2. Manually expire the session in database:
   ```sql
   UPDATE sessions
   SET expires_at = datetime('now', '-1 hour')
   WHERE user_id = (SELECT id FROM users WHERE username = 'testuser_manual');
   ```
3. Refresh the app or try to access a protected page
4. Verify user redirected to login screen

**Expected Results**:
- [ ] Expired session rejected
- [ ] User forced to login again
- [ ] No errors during expiration check

---

## 📊 Manual Testing Results Template

```markdown
### Manual Testing Results - [Date]

**Tester**: [Your Name]
**Environment**: Windows 11, Node 20.18.0, Electron 38.2.1
**Database**: F:\Justice Companion take 2\justice.db

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Application Launch | ✅ / ❌ | |
| 2 | User Registration | ✅ / ❌ | |
| 3 | Password Validation | ✅ / ❌ | |
| 4 | Login Valid Credentials | ✅ / ❌ | |
| 5 | Login Invalid Credentials | ✅ / ❌ | |
| 6 | Session Persistence (Remember Me) | ✅ / ❌ | |
| 7 | Logout Functionality | ✅ / ❌ | |
| 8 | Encryption Verification | ✅ / ❌ | |
| 9 | Audit Logging | ✅ / ❌ | |
| 10 | Session Expiration | ✅ / ❌ | |

**Overall Pass Rate**: [X/10]

**Critical Issues Found**:
- [ ] List any critical issues here

**Next Steps**:
- [ ] Fix critical issues
- [ ] Proceed to Phase 2 (Playwright tests)
```

---

## 🤖 Phase 2: Automated Playwright Tests

**Run ONLY after Phase 1 passes 10/10 tests**

### Prerequisites
```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Rebuild native modules for Node.js (required for tests)
pnpm rebuild:node

# Run Playwright tests
pnpm test:e2e
```

### Current Playwright Test Suite

**File**: `e2e/auth.spec.ts`
**Tests**: 6 scenarios

1. ✅ Display login page on first launch
2. ✅ Register a new user
3. ✅ Login with registered credentials
4. ❌ Reject invalid login credentials
5. ✅ Enforce password requirements
6. ✅ Logout successfully

### Known Issues in Playwright Tests

#### Issue 1: TSX Loader Configuration
**Problem**: Playwright may not load TypeScript files correctly with tsx

**Current Configuration** (lines 35-46):
```typescript
electronApp = await electron.launch({
  executablePath: path.join(process.cwd(), 'node_modules', '.bin', 'electron.cmd'),
  args: [
    '--require',
    path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs'),
    path.join(process.cwd(), 'electron', 'main.ts'),
  ],
  env: {
    ...process.env,
    JUSTICE_DB_PATH: TEST_DB_PATH,
    NODE_ENV: 'test',
    NODE_OPTIONS: '--loader tsx',
  },
});
```

**Potential Fix**: Use compiled JavaScript instead
```typescript
// Option 1: Compile TypeScript first
// pnpm build
// Then launch: path.join(process.cwd(), 'dist', 'main.js')

// Option 2: Use tsx executable directly
executablePath: 'node_modules/.bin/tsx',
args: ['electron/main.ts'],
```

#### Issue 2: Test Isolation
**Problem**: Tests depend on previous tests (registration creates user for login test)

**Solution**: Use beforeEach to create fresh test users
```typescript
let testUserCredentials: { username: string; password: string };

test.beforeEach(async () => {
  // Create unique test user for each test
  testUserCredentials = {
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!',
  };
});
```

#### Issue 3: Selector Reliability
**Problem**: Locators use text matching which is brittle

**Improvements**:
```typescript
// Before (brittle):
const registerButton = window.locator('button:has-text("Register")');

// After (robust):
const registerButton = window.locator('[data-testid="register-button"]');
const usernameInput = window.locator('[data-testid="username-input"]');
const passwordInput = window.locator('[data-testid="password-input"]');
```

**Action Required**: Add `data-testid` attributes to UI components

---

### Refined Playwright Test Plan

```typescript
// e2e/auth.spec.ts (improved version)
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

let electronApp: ElectronApplication;
let window: Page;
const TEST_DB_PATH = path.join(process.cwd(), '.test-e2e', 'justice-test.db');

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Clean test database
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    // Launch Electron with compiled JavaScript (more reliable than tsx)
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), 'dist', 'electron', 'main.js')],
      env: {
        ...process.env,
        JUSTICE_DB_PATH: TEST_DB_PATH,
        NODE_ENV: 'test',
      },
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
    // Cleanup test database
    fs.rmSync(path.dirname(TEST_DB_PATH), { recursive: true });
  });

  test('should display login page on first launch', async () => {
    await expect(window).toHaveTitle(/Justice Companion/);

    // Use data-testid for reliable selectors
    await expect(window.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should register a new user with valid credentials', async () => {
    const username = `testuser_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await window.locator('[data-testid="register-link"]').click();
    await window.locator('[data-testid="username-input"]').fill(username);
    await window.locator('[data-testid="email-input"]').fill(email);
    await window.locator('[data-testid="password-input"]').fill(password);
    await window.locator('[data-testid="register-button"]').click();

    // Wait for success (dashboard or success message)
    await expect(
      window.locator('[data-testid="dashboard"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reject registration with weak password', async () => {
    const username = `testuser_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const weakPassword = 'Short1!'; // Only 7 characters

    await window.locator('[data-testid="username-input"]').fill(username);
    await window.locator('[data-testid="email-input"]').fill(email);
    await window.locator('[data-testid="password-input"]').fill(weakPassword);
    await window.locator('[data-testid="register-button"]').click();

    // Expect error message
    await expect(
      window.locator('[data-testid="error-message"]')
    ).toContainText(/at least 12 characters/i);
  });

  test('should login with valid credentials', async () => {
    // First create a test user
    const username = `testuser_${Date.now()}`;
    const password = 'TestPassword123!';

    // Register via IPC (faster than UI)
    await window.evaluate(async ({ user, pass }) => {
      await (window as any).justiceAPI.registerUser(user, pass, `${user}@test.com`);
    }, { user: username, pass: password });

    // Now try to login
    await window.locator('[data-testid="username-input"]').fill(username);
    await window.locator('[data-testid="password-input"]').fill(password);
    await window.locator('[data-testid="login-button"]').click();

    // Verify redirect to dashboard
    await expect(
      window.locator('[data-testid="dashboard"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reject invalid login credentials', async () => {
    await window.locator('[data-testid="username-input"]').fill('invalid_user');
    await window.locator('[data-testid="password-input"]').fill('WrongPassword123!');
    await window.locator('[data-testid="login-button"]').click();

    // Expect error message
    await expect(
      window.locator('[data-testid="error-message"]')
    ).toContainText(/invalid credentials/i);
  });

  test('should logout successfully', async () => {
    // Assume we're logged in from previous test
    await window.locator('[data-testid="logout-button"]').click();

    // Verify redirect to login
    await expect(
      window.locator('[data-testid="login-form"]')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Persistence', () => {
  test('should restore session with Remember Me', async () => {
    // Create test user
    const username = `testuser_${Date.now()}`;
    const password = 'TestPassword123!';

    await window.evaluate(async ({ user, pass }) => {
      await (window as any).justiceAPI.registerUser(user, pass, `${user}@test.com`);
    }, { user: username, pass: password });

    // Login with Remember Me
    await window.locator('[data-testid="username-input"]').fill(username);
    await window.locator('[data-testid="password-input"]').fill(password);
    await window.locator('[data-testid="remember-me-checkbox"]').check();
    await window.locator('[data-testid="login-button"]').click();

    await expect(window.locator('[data-testid="dashboard"]')).toBeVisible();

    // Close and reopen app
    await electronApp.close();

    electronApp = await electron.launch({
      args: [path.join(process.cwd(), 'dist', 'electron', 'main.js')],
      env: {
        ...process.env,
        JUSTICE_DB_PATH: TEST_DB_PATH,
        NODE_ENV: 'test',
      },
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Verify user still logged in (no login form visible)
    await expect(window.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});
```

---

## 🔍 Test Data Management Strategy

### In-Memory Test Database
```typescript
// vitest.config.ts or test setup
import { beforeAll, afterAll } from 'vitest';
import { initDatabase } from './src/db/database';

beforeAll(async () => {
  // Initialize in-memory SQLite for tests
  await initDatabase(':memory:');

  // Run migrations
  await runMigrations();
});

afterAll(async () => {
  // Close database connection
  await closeDatabase();
});
```

### Test User Factory
```typescript
// tests/factories/UserFactory.ts
import { v4 as uuidv4 } from 'uuid';

export class UserFactory {
  static createTestUser(overrides?: Partial<CreateUserInput>) {
    return {
      username: `testuser_${uuidv4().slice(0, 8)}`,
      email: `test_${uuidv4().slice(0, 8)}@example.com`,
      password: 'TestPassword123!',
      ...overrides,
    };
  }

  static createTestSession(userId: number, overrides?: Partial<CreateSessionInput>) {
    return {
      id: uuidv4(),
      userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      rememberMe: false,
      ...overrides,
    };
  }
}
```

### Database Cleanup Between Tests
```typescript
// tests/helpers/database-cleanup.ts
import { getDb } from '../../src/db/database';

export function cleanupDatabase() {
  const db = getDb();

  // Delete in order to respect foreign key constraints
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM cases').run();
  db.prepare('DELETE FROM users').run();
}
```

---

## 🚦 Success Criteria

### Phase 1 Complete When:
- ✅ All 10 manual tests pass (10/10)
- ✅ No import errors in console
- ✅ Authentication flow works end-to-end
- ✅ Database operations verified with SQL queries
- ✅ Audit logs populated correctly

### Phase 2 Complete When:
- ✅ All Playwright tests pass (target: 100%)
- ✅ Tests run reliably on CI/CD (GitHub Actions)
- ✅ Test coverage for critical auth paths: 100%
- ✅ No flaky tests (5 consecutive successful runs)

---

## 🐛 Common Issues & Debugging

### Issue: "Cannot find module" in IPC handlers
**Symptom**: Import errors when calling IPC handlers

**Debug**:
```javascript
// In main process console:
console.log('__dirname:', __dirname);
console.log('Resolved path:', path.join(__dirname, '../src/services/AuthenticationService.ts'));

// Check if file exists:
const fs = require('fs');
const servicePath = path.join(__dirname, '../src/services/AuthenticationService.ts');
console.log('File exists:', fs.existsSync(servicePath));
```

**Fix**: Ensure `.ts` extensions added to all imports (completed in commit 1bef370)

---

### Issue: Database locked error
**Symptom**: `SQLITE_BUSY` or "database is locked"

**Cause**: Multiple connections or write operations in transaction

**Fix**:
```typescript
// Close all connections before tests
afterAll(async () => {
  await db.close();
});

// Use WAL mode for concurrent reads
db.pragma('journal_mode = WAL');
```

---

### Issue: Rate limiting during tests
**Symptom**: Login fails after 5 attempts in tests

**Fix**: Clear rate limit state between tests
```typescript
afterEach(() => {
  const rateLimitService = RateLimitService.getInstance();
  rateLimitService.clearAttempts('testuser_manual');
});
```

---

### Issue: Playwright hangs on launch
**Symptom**: `await electronApp.firstWindow()` times out

**Debug**:
```typescript
electronApp = await electron.launch({
  args: [...],
  timeout: 60000, // Increase timeout
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1', // Enable Electron logs
  },
});

// Check Electron console output
const logs = await electronApp.evaluate(({ app }) => {
  return app.isReady();
});
console.log('Electron ready:', logs);
```

---

## 📚 Next Steps After Testing

1. **Document test results** in GitHub issue or PR
2. **Fix any failing tests** before merging
3. **Add CI/CD workflow** to run tests automatically
4. **Expand test coverage** to other features (cases, evidence, chat)
5. **Add performance benchmarks** for authentication operations

---

## 📝 Notes for AI Assistant (Claude)

When user reports test results:
- Parse results and identify patterns
- Suggest specific debugging steps for failures
- Recommend code fixes with exact file paths
- Generate SQL queries for database verification
- Update this document with new test cases

**Key Files to Monitor**:
- `src/repositories/UserRepository.ts` (import fixes applied)
- `src/repositories/SessionRepository.ts` (import fixes applied)
- `src/services/AuthenticationService.ts`
- `electron/ipc-handlers.ts` (IPC setup)
- `electron/preload.ts` (IPC bridge)
- `e2e/auth.spec.ts` (Playwright tests)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Author**: Claude Code (AI Assistant)
