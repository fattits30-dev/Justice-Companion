# E2E Testing Guide - Justice Companion

## Overview

This guide covers the end-to-end (E2E) testing infrastructure for Justice Companion built with Playwright and Electron.

**Created**: 2025-10-08
**Status**: Complete and operational
**Test Framework**: Playwright v1.55.1
**Total Tests**: 17 tests across 5 test suites

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Test Structure](#test-structure)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Debugging Tests](#debugging-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js v22.20.0 or higher
- All npm dependencies installed (`npm install`)
- Electron app built (`npm run build`)

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Report

```bash
npm run test:e2e:report
```

---

## Architecture

### Directory Structure

```
tests/
  e2e/
    setup/
      electron-setup.ts       # Electron app launcher utilities
      test-database.ts        # Test database setup/teardown
      fixtures.ts             # Test data fixtures
      global-setup.ts         # Global setup (runs once before all tests)
      global-teardown.ts      # Global teardown (runs once after all tests)
    specs/
      case-management.e2e.test.ts    # Case CRUD tests (5 tests)
      evidence-upload.e2e.test.ts    # Evidence handling tests (4 tests)
      ai-chat.e2e.test.ts            # AI chat tests (3 tests)
      facts-tracking.e2e.test.ts     # Facts feature tests (4 tests)
      user-journey.e2e.test.ts       # Complete workflow test (1 test)
    playwright.config.ts      # Playwright configuration
    tsconfig.json            # TypeScript config for E2E tests
```

### Test Infrastructure Components

#### 1. Electron App Launcher (`electron-setup.ts`)

Provides utilities to launch and control the Electron app:

- `launchElectronApp(options)` - Launch Electron with test database
- `closeElectronApp(testApp)` - Close app and cleanup
- `waitForElement(page, selector)` - Wait for element to be visible
- `clickAndWait(page, selector)` - Click and wait for UI update
- `fillField(page, selector, value)` - Fill form field
- `takeScreenshot(page, name)` - Capture screenshot for debugging

**Example**:
```typescript
const testApp = await launchElectronApp({ seedData: true });
const { app, window, dbPath } = testApp;

// Interact with app
await window.click('[data-testid="create-case-btn"]');
await window.fill('[name="title"]', 'Test Case');

// Cleanup
await closeElectronApp(testApp);
```

#### 2. Test Database Utilities (`test-database.ts`)

Manages isolated test databases:

- `setupTestDatabase(config)` - Create clean test database
- `cleanupTestDatabase(dbPath)` - Delete test database
- `getTestDatabase(dbPath)` - Get database connection for verification
- `verifyDatabaseState(dbPath)` - Check database record counts

**Example**:
```typescript
// Setup (happens automatically in launchElectronApp)
const dbPath = await setupTestDatabase({ seedData: true });

// Verify data
const db = getTestDatabase(dbPath);
const cases = db.prepare('SELECT * FROM cases').all();
expect(cases.length).toBe(1);
db.close();

// Cleanup
await cleanupTestDatabase(dbPath);
```

#### 3. Test Fixtures (`fixtures.ts`)

Provides reusable test data:

- `casesFixtures` - Sample cases for different types
- `evidenceFixtures` - Sample evidence items
- `userFactsFixtures` - Sample user facts
- `caseFactsFixtures` - Sample case facts
- `chatMessagesFixtures` - Sample chat messages
- `createTestFile(name, content)` - Create test files for uploads

**Example**:
```typescript
import { casesFixtures, createTestFile } from '../setup/fixtures.js';

const caseData = casesFixtures.employment;
await window.fill('[name="title"]', caseData.title);

const testFile = createTestFile('contract.pdf', 'PDF content');
await window.setInputFiles('input[type="file"]', testFile);
```

---

## Test Structure

### Test Suites

#### 1. Case Management Tests (5 tests)
**File**: `case-management.e2e.test.ts`

- Create new case and persist to database
- View case details
- Update case information
- Delete case
- Verify case persistence across app restarts

#### 2. Evidence Upload Tests (4 tests)
**File**: `evidence-upload.e2e.test.ts`

- Upload document evidence
- Upload photo evidence
- View uploaded evidence
- Delete evidence

#### 3. AI Chat Tests (3 tests)
**File**: `ai-chat.e2e.test.ts`

- Send chat message and receive response
- Display conversation history
- Create new conversation

#### 4. Facts Tracking Tests (4 tests)
**File**: `facts-tracking.e2e.test.ts`

- Create user fact
- Create case fact
- Filter facts by category
- Update and delete facts

#### 5. Complete User Journey Test (1 test)
**File**: `user-journey.e2e.test.ts`

**9-Step Comprehensive Workflow**:
1. Launch app and verify ready
2. Create new case
3. Add user facts
4. Upload evidence
5. Add case facts
6. Chat with AI
7. View case summary
8. Verify data persistence
9. Verify audit trail

---

## Running Tests

### Available npm Scripts

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode (step through)
npm run test:e2e:debug

# Open Playwright UI for interactive testing
npm run test:e2e:ui

# View HTML test report
npm run test:e2e:report
```

### Run Specific Test File

```bash
# Run only case management tests
npx playwright test tests/e2e/specs/case-management.e2e.test.ts

# Run only user journey test
npx playwright test tests/e2e/specs/user-journey.e2e.test.ts
```

### Run Tests by Name

```bash
# Run all tests with "create" in the name
npx playwright test tests/e2e -g "create"

# Run all tests with "evidence" in the name
npx playwright test tests/e2e -g "evidence"
```

---

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, type ElectronTestApp } from '../setup/electron-setup.js';
import { getTestDatabase } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('Feature Name E2E', () => {
  test('should do something', async () => {
    const { window, dbPath } = testApp;

    // Wait for app to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Interact with UI
    await window.click('[data-testid="button"]');
    await window.fill('[name="input"]', 'value');

    // Verify UI state
    const element = await window.$('text=Expected Text');
    expect(element).toBeTruthy();

    // Verify database state
    const db = getTestDatabase(dbPath);
    const record = db.prepare('SELECT * FROM table WHERE id = ?').get(1);
    expect(record).toBeDefined();
    db.close();
  });
});
```

### Test Best Practices

1. **Isolation**: Each test should start with a clean database
2. **Wait for Elements**: Always wait for elements before interacting
3. **Verify Both UI and Database**: Check UI updates AND database persistence
4. **Use Data Test IDs**: Prefer `[data-testid="..."]` selectors over text
5. **Descriptive Test Names**: Use "should..." format for clarity
6. **Cleanup**: Always close app in `afterEach`

### Selectors Priority

1. **Best**: `[data-testid="element-id"]` (stable, semantic)
2. **Good**: `button:has-text("Save")` (readable)
3. **Okay**: `[name="fieldName"]` (form fields)
4. **Avoid**: `.css-class-123` (fragile)

---

## Debugging Tests

### 1. Visual Debugging (Headed Mode)

```bash
npm run test:e2e:headed
```

This opens a visible browser window so you can see what's happening.

### 2. Step-Through Debugging

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector to step through tests line by line.

### 3. Screenshots on Failure

Tests automatically capture screenshots on failure:
- Location: `test-results/screenshots/`
- Named: `test-name.png`

### 4. Manual Screenshots

```typescript
import { takeScreenshot } from '../setup/electron-setup.js';

await takeScreenshot(window, 'before-click');
await window.click('[data-testid="button"]');
await takeScreenshot(window, 'after-click');
```

### 5. Console Logs

```typescript
// Check what's in the page
const title = await window.textContent('h1');
console.log('Page title:', title);

// Evaluate JavaScript in page context
const isVisible = await window.evaluate(() => {
  return document.querySelector('[data-testid="element"]') !== null;
});
console.log('Element visible:', isVisible);
```

### 6. Database Inspection

```typescript
const db = getTestDatabase(dbPath);

// See all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

// See all records
const records = db.prepare('SELECT * FROM cases').all();
console.log('Cases:', records);

db.close();
```

---

## Best Practices

### Database Isolation

Each test MUST use a separate test database:

```typescript
// GOOD: Clean database per test
test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: false });
});

// BAD: Shared database state
const testApp = await launchElectronApp(); // Don't do this outside beforeEach
```

### Waiting for Elements

Always wait for elements to be ready:

```typescript
// GOOD: Wait for element
await window.waitForSelector('[data-testid="button"]', { state: 'visible' });
await window.click('[data-testid="button"]');

// BAD: Click immediately (might fail)
await window.click('[data-testid="button"]'); // Element might not be ready
```

### Assertions

Use explicit assertions:

```typescript
// GOOD: Clear assertion
const element = await window.$('[data-testid="case-title"]');
expect(element).toBeTruthy();

const text = await element?.textContent();
expect(text).toContain('Expected Case Title');

// OKAY: Combined assertion
expect(await window.$('[data-testid="case-title"]')).toBeTruthy();
```

### Error Handling

Handle missing elements gracefully:

```typescript
const button = await window.$('[data-testid="optional-button"]');
if (button) {
  await button.click();
  // Continue with rest of test
}
```

---

## Troubleshooting

### Test Fails: "Element not found"

**Cause**: Element selector is incorrect or element hasn't loaded yet

**Solutions**:
1. Add wait: `await window.waitForSelector(selector)`
2. Increase timeout: `await window.waitForTimeout(2000)`
3. Check selector: Use Playwright Inspector to verify
4. Check if element exists in UI at all

### Test Fails: "Database file is locked"

**Cause**: Previous test didn't close database connection

**Solutions**:
1. Always call `db.close()` after using database
2. Ensure `closeElectronApp()` is called in `afterEach`
3. Check for orphaned Node processes: `taskkill /F /IM electron.exe`

### Test Fails: "Timeout waiting for app to launch"

**Cause**: Electron app isn't building correctly or taking too long to start

**Solutions**:
1. Build app first: `npm run build`
2. Check `dist-electron/main.js` exists
3. Increase timeout: `launchElectronApp({ timeout: 60000 })`
4. Check for errors in Electron console

### All Tests Fail: "Cannot find module"

**Cause**: TypeScript/module resolution issue

**Solutions**:
1. Check `tests/e2e/tsconfig.json` exists
2. Run `npm install` to ensure all deps are installed
3. Check import paths use `.js` extension (ES modules)

### Tests Pass Locally But Fail in CI

**Cause**: Timing issues, environment differences

**Solutions**:
1. Increase retry count: `retries: 2` in `playwright.config.ts`
2. Add more `waitForTimeout()` calls
3. Use `waitForLoadState('networkidle')` before interactions
4. Check CI has enough memory/CPU

---

## Test Metrics

### Current Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Case Management | 5 | CRUD operations, persistence |
| Evidence Upload | 4 | Document/photo upload, viewing, deletion |
| AI Chat | 3 | Messaging, conversations |
| Facts Tracking | 4 | User/case facts, filtering |
| User Journey | 1 | Complete 9-step workflow |
| **TOTAL** | **17** | **Full application coverage** |

### Execution Time

- **Per Test**: ~5-10 seconds (with clean database)
- **Full Suite**: ~2-3 minutes (serial execution)
- **User Journey Test**: ~15-20 seconds

### Success Criteria

- All tests MUST pass before merging to main
- Tests MUST run in isolation (no shared state)
- Tests MUST verify both UI and database state
- Tests MUST clean up after themselves

---

## Future Enhancements

### Planned Tests

1. **Performance Tests**: Measure page load times, AI response times
2. **Accessibility Tests**: WCAG compliance, keyboard navigation
3. **Visual Regression Tests**: Screenshot comparison
4. **Network Tests**: Offline mode, API failures
5. **Security Tests**: Input validation, XSS prevention

### Infrastructure Improvements

1. **Parallel Execution**: Run tests in parallel with isolated databases
2. **Docker Support**: Run tests in containerized environment
3. **CI/CD Integration**: GitHub Actions workflow
4. **Test Reports**: Advanced reporting with screenshots/videos
5. **Flaky Test Detection**: Automatic retry and tracking

---

## Support

### Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Justice Companion CLAUDE.md](./CLAUDE.md)

### Getting Help

1. Check this guide first
2. Review test examples in `tests/e2e/specs/`
3. Check Playwright documentation
4. Open an issue on GitHub

---

## Changelog

### 2025-10-08 - Initial Release
- Complete E2E test infrastructure
- 17 tests across 5 test suites
- Electron app launcher
- Test database utilities
- Comprehensive fixtures
- Full documentation

---

**Last Updated**: 2025-10-08
**Maintained By**: Justice Companion Testing Team
