# E2E Testing - Quick Start Guide

## Prerequisites

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Build the Electron app (REQUIRED)
npm run build
```

## Running Tests

### Run All Tests (Headless)
```bash
npm run test:e2e
```

### Run Tests with Visible Browser
```bash
npm run test:e2e:headed
```

### Debug a Specific Test
```bash
npm run test:e2e:debug -- case-management.e2e.test.ts
```

### View Test Report
```bash
npm run test:e2e:report
```

## What Gets Tested

- ✓ Case Management (5 tests) - Create, read, update, delete cases
- ✓ Evidence Upload (4 tests) - Upload documents and photos
- ✓ AI Chat (3 tests) - Send messages, view conversations
- ✓ Facts Tracking (4 tests) - User/case facts with filtering
- ✓ Complete User Journey (1 test) - 9-step end-to-end workflow

**Total: 17 tests**

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run test:e2e` | Run all tests (headless) |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:debug` | Debug tests with Playwright Inspector |
| `npm run test:e2e:ui` | Open Playwright UI |
| `npm run test:e2e:report` | View HTML test report |

## Test Results Location

```
test-results/
  ├── html-report/     # HTML test report (open index.html)
  ├── screenshots/     # Screenshots on failure
  ├── videos/          # Videos on failure
  └── results.json     # JSON test results
```

## Troubleshooting

### Tests fail: "Cannot find module"
```bash
# Rebuild the app
npm run build
```

### Tests fail: "Element not found"
- Some UI features may not be implemented yet
- Check if `data-testid` attributes exist in UI components
- Run in headed mode to see what's happening: `npm run test:e2e:headed`

### Tests timeout
```bash
# Increase timeout in tests/e2e/playwright.config.ts
timeout: 60000  # 60 seconds
```

## Writing New Tests

See `E2E_TESTING_GUIDE.md` for complete documentation.

**Quick Template**:
```typescript
import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp } from '../setup/electron-setup.js';

let testApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test('should do something', async () => {
  const { window } = testApp;
  // Your test here
});
```

## Next Steps

1. Build app: `npm run build`
2. Run tests: `npm run test:e2e`
3. View report: `npm run test:e2e:report`
4. Read full guide: `E2E_TESTING_GUIDE.md`

---

**Need Help?** Check `E2E_TESTING_GUIDE.md` for detailed documentation.
