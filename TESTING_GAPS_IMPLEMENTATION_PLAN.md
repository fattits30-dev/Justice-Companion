# Settings Module Testing Gaps - Implementation Plan

**Priority:** Critical Security & E2E Tests (Sprint 1)
**Estimated Effort:** 16 hours
**Target:** Improve test quality score from 76.55/100 to 85/100

---

## 1. Security Tests for useLocalStorage Hook

**File:** `src/hooks/useLocalStorage.test.ts`
**Estimated Time:** 4 hours
**Priority:** CRITICAL

### Tests to Add:

```typescript
describe('Security Tests', () => {
  it('should prevent prototype pollution via __proto__ injection', () => {
    // Test case: Malicious JSON attempts to pollute Object.prototype
    localStorage.setItem('testKey', '{"__proto__": {"isAdmin": true}}');
    const { result } = renderHook(() => useLocalStorage('testKey', {}));

    expect(Object.prototype.isAdmin).toBeUndefined();
    expect(result.current[0].__proto__).toBeUndefined();
    expect(result.current[0].isAdmin).toBeUndefined();
  });

  it('should prevent constructor injection attacks', () => {
    localStorage.setItem('testKey', '{"constructor": {"prototype": {"polluted": true}}}');
    const { result } = renderHook(() => useLocalStorage('testKey', {}));

    expect(result.current[0].constructor.prototype.polluted).toBeUndefined();
  });

  it('should sanitize XSS payloads when reading from localStorage', () => {
    const xssPayload = '<img src=x onerror=alert(document.cookie)>';
    localStorage.setItem('testKey', JSON.stringify(xssPayload));

    const { result } = renderHook(() => useLocalStorage('testKey', ''));

    // Value should be returned as-is, but when rendered it should be escaped
    expect(result.current[0]).toBe(xssPayload);

    // When rendered in React, HTML should be escaped (test in component)
    const TestComponent = () => <div data-testid="content">{result.current[0]}</div>;
    render(<TestComponent />);

    // Should render as text, not execute script
    expect(screen.getByTestId('content').innerHTML).toBe(
      '&lt;img src=x onerror=alert(document.cookie)&gt;'
    );
  });

  it('should reject payloads exceeding 5MB (DoS protection)', () => {
    const largePayload = 'A'.repeat(6 * 1024 * 1024); // 6MB string
    const warnSpy = vi.spyOn(console, 'warn');

    const { result } = renderHook(() => useLocalStorage('testKey', ''));

    act(() => {
      result.current[1](largePayload);
    });

    // Should warn about large payload
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('localStorage value too large')
    );

    // Should not set the value (or truncate it)
    expect(localStorage.getItem('testKey')).toBeNull();

    warnSpy.mockRestore();
  });

  it('should handle circular references safely', () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj; // Create circular reference

    const { result } = renderHook(() => useLocalStorage('testKey', {}));

    // Should not throw when trying to stringify circular object
    expect(() => {
      act(() => {
        result.current[1](circularObj);
      });
    }).not.toThrow();

    // Should log error and not update state
    expect(result.current[0]).toEqual({});
  });

  it('should validate JSON.parse output type matches expected type', () => {
    // Store a string, but expect an object
    localStorage.setItem('testKey', JSON.stringify('string value'));

    const { result } = renderHook(() => useLocalStorage('testKey', { default: 'object' }));

    // Should return default value if type mismatch
    expect(result.current[0]).toEqual({ default: 'object' });
  });
});
```

### Implementation Changes Needed in `useLocalStorage.ts`:

```typescript
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);

      // Security: Prevent prototype pollution
      if (parsed && typeof parsed === 'object') {
        delete parsed.__proto__;
        delete parsed.constructor;
        delete parsed.prototype;
      }

      // Validation: Type check
      if (typeof parsed !== typeof defaultValue) {
        console.warn(`localStorage type mismatch for key "${key}": expected ${typeof defaultValue}, got ${typeof parsed}`);
        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Security: Check payload size (5MB limit)
      const serialized = JSON.stringify(valueToStore);
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);

      if (sizeInMB > 5) {
        console.warn(`localStorage value too large (${sizeInMB.toFixed(2)}MB) for key "${key}". Skipping.`);
        return;
      }

      setStoredValue(valueToStore);
      window.localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        console.error(`Circular reference detected in localStorage value for key "${key}"`);
      } else {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  };

  return [storedValue, setValue];
}
```

---

## 2. E2E Tests for Critical User Workflows

**File:** `tests/e2e/settings.e2e.test.ts` (NEW)
**Estimated Time:** 6 hours
**Priority:** CRITICAL

### E2E Test Suite:

```typescript
import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../electron/main.ts')],
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Settings E2E Tests', () => {
  test('should update AI settings and verify in chat', async () => {
    const window = await electronApp.firstWindow();

    // Step 1: Register and login
    await window.click('text=Register');
    await window.fill('[name="username"]', 'testuser');
    await window.fill('[name="email"]', 'test@example.com');
    await window.fill('[name="password"]', 'SecurePass123!');
    await window.click('button[type="submit"]');

    // Step 2: Navigate to Settings
    await window.click('text=Settings');
    await expect(window.locator('h1:has-text("Settings")')).toBeVisible();

    // Step 3: Switch to AI Configuration tab
    await window.click('role=tab[name=/ai configuration/i]');
    await expect(window.locator('text=AI & Legal Data')).toBeVisible();

    // Step 4: Disable RAG
    const ragToggle = window.locator('button[aria-label*="toggle enhanced legal responses"]');
    await expect(ragToggle).toHaveAttribute('aria-pressed', 'true');
    await ragToggle.click();
    await expect(ragToggle).toHaveAttribute('aria-pressed', 'false');

    // Step 5: Change response length to 'concise'
    await window.selectOption('select[aria-label*="response length"]', 'concise');

    // Step 6: Navigate to Chat
    await window.click('text=Chat');
    await expect(window.locator('h1:has-text("Chat")')).toBeVisible();

    // Step 7: Verify settings applied
    // Send a test message and verify response is concise (not using RAG)
    await window.fill('textarea[placeholder*="message"]', 'What is employment law?');
    await window.click('button[aria-label*="send"]');

    // Wait for response
    await window.waitForSelector('.message-bubble.assistant', { timeout: 10000 });

    // Verify: Response should be concise and not include RAG citations
    const responseText = await window.locator('.message-bubble.assistant').last().textContent();
    expect(responseText.length).toBeLessThan(500); // Concise response
    expect(responseText).not.toContain('legislation.gov.uk'); // No RAG citations
  });

  test('should export GDPR data and validate JSON structure', async () => {
    const window = await electronApp.firstWindow();

    // Navigate to Settings → Data & Privacy
    await window.click('text=Settings');
    await window.click('role=tab[name=/data & privacy/i]');
    await expect(window.locator('text=Privacy & Security')).toBeVisible();

    // Set up download listener
    const downloadPromise = window.waitForEvent('download');

    // Click Export My Data
    await window.click('button:has-text("Export My Data")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/user-data-\d{4}-\d{2}-\d{2}\.json/);

    // Save to temp file
    const tempPath = path.join(__dirname, 'temp-export.json');
    await download.saveAs(tempPath);

    // Validate JSON structure
    const exportedData = JSON.parse(await fs.readFile(tempPath, 'utf-8'));

    expect(exportedData).toHaveProperty('profile');
    expect(exportedData).toHaveProperty('cases');
    expect(exportedData).toHaveProperty('conversations');
    expect(exportedData).toHaveProperty('consents');
    expect(exportedData).toHaveProperty('exportedAt');

    // Validate profile structure
    expect(exportedData.profile).toHaveProperty('name');
    expect(exportedData.profile).toHaveProperty('email');

    // Clean up
    await fs.unlink(tempPath);

    // Verify toast notification
    await expect(window.locator('text=/data exported successfully/i')).toBeVisible();
  });

  test('should clear all data and verify deletion', async () => {
    const window = await electronApp.firstWindow();

    // Step 1: Create test data
    // Create a case
    await window.click('text=Cases');
    await window.click('button:has-text("New Case")');
    await window.fill('[name="title"]', 'Test Case for Deletion');
    await window.selectOption('[name="type"]', 'employment');
    await window.click('button[type="submit"]');

    // Verify case created
    await expect(window.locator('text=Test Case for Deletion')).toBeVisible();

    // Step 2: Navigate to Settings → Data & Privacy
    await window.click('text=Settings');
    await window.click('role=tab[name=/data & privacy/i]');

    // Step 3: Click Clear All Data
    await window.click('button:has-text("Clear All Data")');

    // Step 4: Verify confirmation dialog
    await expect(window.locator('text=/are you sure you want to clear all data/i')).toBeVisible();

    // Step 5: Confirm deletion
    const confirmButton = window.locator('dialog button:has-text("Clear All Data")');
    await confirmButton.click();

    // Step 6: Verify success toast
    await expect(window.locator('text=/data cleared successfully/i')).toBeVisible();

    // Step 7: Navigate to Cases and verify no data
    await window.click('text=Cases');
    await expect(window.locator('text=Test Case for Deletion')).not.toBeVisible();
    await expect(window.locator('text=/no cases found/i')).toBeVisible();
  });

  test('should persist dark mode setting across app restart', async () => {
    const window = await electronApp.firstWindow();

    // Step 1: Enable dark mode
    await window.click('text=Settings');
    await window.click('role=tab[name=/preferences/i]');

    const darkModeToggle = window.locator('button[aria-label*="toggle dark mode"]');
    await darkModeToggle.click();
    await expect(darkModeToggle).toHaveAttribute('aria-pressed', 'true');

    // Step 2: Verify dark mode applied (check body class or CSS variable)
    const bodyClass = await window.evaluate(() => document.body.className);
    expect(bodyClass).toContain('dark');

    // Step 3: Close and reopen app
    await electronApp.close();
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.ts')],
    });
    const newWindow = await electronApp.firstWindow();

    // Step 4: Verify dark mode persisted
    const newBodyClass = await newWindow.evaluate(() => document.body.className);
    expect(newBodyClass).toContain('dark');
  });

  test('should enforce required consent and prevent revocation', async () => {
    const window = await electronApp.firstWindow();

    // Navigate to Settings → Account
    await window.click('text=Settings');
    await window.click('role=tab[name=/account/i]');
    await expect(window.locator('text=Consent Management')).toBeVisible();

    // Verify data_processing consent is marked as Required
    const dataProcessingRow = window.locator('tr:has-text("Data Processing")');
    await expect(dataProcessingRow.locator('text=Required')).toBeVisible();
    await expect(dataProcessingRow.locator('text=Granted')).toBeVisible();

    // Verify revoke button is disabled
    const revokeButton = dataProcessingRow.locator('button:has-text("Cannot revoke")');
    await expect(revokeButton).toBeDisabled();

    // Try to revoke (should not work)
    await revokeButton.click({ force: true });

    // Verify consent still granted
    await expect(dataProcessingRow.locator('text=Granted')).toBeVisible();
  });
});
```

### Setup Required:

1. **Install Playwright for Electron:**
   ```bash
   pnpm add -D @playwright/test playwright
   ```

2. **Create Playwright config:**
   ```typescript
   // playwright.config.ts
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/e2e',
     timeout: 30000,
     use: {
       trace: 'on-first-retry',
     },
     projects: [
       {
         name: 'electron',
         testMatch: '**/*.e2e.test.ts',
       },
     ],
   });
   ```

3. **Update package.json:**
   ```json
   {
     "scripts": {
       "test:e2e": "playwright test"
     }
   }
   ```

---

## 3. Shared Test Utilities

**Files:** `src/test-utils/settings-test-helpers.ts` (NEW)
**Estimated Time:** 4 hours
**Priority:** HIGH

### Create Shared Utilities:

```typescript
// src/test-utils/settings-test-helpers.ts

import { vi } from 'vitest';

/**
 * Shared mock setup for settings tests
 */
export function setupSettingsTestMocks() {
  const mockJusticeAPI = {
    getCurrentUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
    registerUser: vi.fn(),
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    getUserConsents: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
    changePassword: vi.fn(),
    getAllCases: vi.fn(),
    getAllConversations: vi.fn(),
    deleteCase: vi.fn(),
    deleteConversation: vi.fn(),
    exportUserData: vi.fn(),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  (window as any).justiceAPI = mockJusticeAPI;

  return { mockJusticeAPI, mockToast };
}

/**
 * Helper to assert localStorage values
 */
export function expectLocalStorageValue(key: string, value: any) {
  const stored = localStorage.getItem(key);

  if (typeof value === 'boolean' || typeof value === 'string') {
    expect(stored).toBe(String(value));
  } else {
    expect(stored).toBe(JSON.stringify(value));
  }
}

/**
 * Helper to set localStorage with proper JSON encoding
 */
export function setLocalStorageValue(key: string, value: any) {
  if (typeof value === 'boolean' || typeof value === 'string') {
    localStorage.setItem(key, String(value));
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * Test data factories
 */
export const factories = {
  userProfile: (overrides = {}) => ({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }),

  consent: (overrides = {}) => ({
    id: 1,
    userId: 1,
    consentType: 'data_processing' as const,
    granted: true,
    grantedAt: '2025-01-01T00:00:00.000Z',
    revokedAt: null,
    version: '1.0',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }),

  case: (overrides = {}) => ({
    id: 1,
    userId: 1,
    title: 'Test Case',
    type: 'employment' as const,
    status: 'active' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }),
};

/**
 * Custom matchers
 */
export const customMatchers = {
  toHaveLocalStorageValue(key: string, expectedValue: any) {
    const stored = localStorage.getItem(key);
    const expected = typeof expectedValue === 'string' || typeof expectedValue === 'boolean'
      ? String(expectedValue)
      : JSON.stringify(expectedValue);

    const pass = stored === expected;

    return {
      pass,
      message: () => `expected localStorage['${key}'] to be ${expected}, got ${stored}`,
    };
  },
};
```

### Usage Example (Refactored Test):

```typescript
// Before (duplicated code)
describe('AIConfigurationSettings', () => {
  const mockJusticeAPI = { /* ... */ };
  const mockToast = { /* ... */ };

  beforeEach(() => {
    (window as any).justiceAPI = mockJusticeAPI;
  });

  it('should persist RAG setting', async () => {
    await user.click(ragToggle);
    expect(localStorage.getItem('ragEnabled')).toBe('false');
  });
});

// After (using shared utilities)
import { setupSettingsTestMocks, expectLocalStorageValue, customMatchers } from '@/test-utils/settings-test-helpers';

expect.extend(customMatchers);

describe('AIConfigurationSettings', () => {
  let mocks: ReturnType<typeof setupSettingsTestMocks>;

  beforeEach(() => {
    mocks = setupSettingsTestMocks();
  });

  it('should persist RAG setting', async () => {
    await user.click(ragToggle);
    expectLocalStorageValue('ragEnabled', false); // Cleaner!
    // OR use custom matcher:
    expect('ragEnabled').toHaveLocalStorageValue(false);
  });
});
```

---

## 4. Documentation Updates

**File:** `docs/TESTING_CONVENTIONS.md` (NEW)
**Estimated Time:** 2 hours
**Priority:** MEDIUM

### Documentation Content:

```markdown
# Testing Conventions - Justice Companion

## Overview

This document outlines testing conventions for the Justice Companion project.

## Test Structure

### File Naming
- Unit tests: `[ComponentName].test.tsx`
- E2E tests: `[feature].e2e.test.ts`
- Integration tests: `[feature].integration.test.ts`

### Test Organization

```typescript
describe('ComponentName', () => {
  // Setup
  let mocks: ReturnType<typeof setupSettingsTestMocks>;

  beforeEach(() => {
    mocks = setupSettingsTestMocks();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Feature Group 1', () => {
    it('should do X when Y happens', async () => {
      // Arrange: Set up test data
      // Act: Perform action
      // Assert: Verify outcome
    });
  });
});
```

## localStorage Testing

### Best Practices

1. **Always clear localStorage in beforeEach:**
   ```typescript
   beforeEach(() => {
     localStorage.clear();
   });
   ```

2. **Use helper functions for assertions:**
   ```typescript
   import { expectLocalStorageValue } from '@/test-utils/settings-test-helpers';

   expectLocalStorageValue('ragEnabled', false);
   ```

3. **Test both UI state and persistence:**
   ```typescript
   it('should toggle RAG setting', async () => {
     await user.click(ragToggle);

     // Assert UI state
     expect(ragToggle).toHaveAttribute('aria-pressed', 'false');

     // Assert localStorage persistence
     expectLocalStorageValue('ragEnabled', false);
   });
   ```

## Security Testing

All localStorage-based hooks MUST include tests for:
- Prototype pollution (`__proto__` injection)
- XSS payloads
- Large payload DoS protection
- Type validation

## Accessibility Testing

All interactive components MUST include tests for:
- Keyboard navigation
- Screen reader announcements
- Focus management
- ARIA attributes

## E2E Testing

E2E tests MUST:
- Test complete user workflows
- Verify data persistence across app restarts
- Validate file exports (GDPR data export)
- Test destructive actions with confirmations
```

---

## Implementation Checklist

### Sprint 1 - Week 1

- [ ] Day 1-2: Implement security tests in `useLocalStorage.test.ts`
  - [ ] Prototype pollution test
  - [ ] XSS sanitization test
  - [ ] Large payload DoS test
  - [ ] Circular reference test
  - [ ] Type validation test

- [ ] Day 3: Update `useLocalStorage.ts` implementation
  - [ ] Add prototype pollution protection
  - [ ] Add payload size limit (5MB)
  - [ ] Add circular reference handling
  - [ ] Add type validation

### Sprint 1 - Week 2

- [ ] Day 4-5: Create E2E test suite
  - [ ] Set up Playwright for Electron
  - [ ] Implement "AI settings → Chat verification" test
  - [ ] Implement "GDPR data export" test
  - [ ] Implement "Clear all data" test

- [ ] Day 6-7: Create shared test utilities
  - [ ] `setupSettingsTestMocks()` function
  - [ ] `expectLocalStorageValue()` helper
  - [ ] Test data factories
  - [ ] Custom matchers

- [ ] Day 8: Documentation
  - [ ] Write testing conventions guide
  - [ ] Update README with testing instructions

### Verification

After Sprint 1, run:
```bash
pnpm test -- src/hooks/useLocalStorage.test.ts --run
pnpm test:e2e
pnpm test:coverage
```

**Expected Results:**
- All 27 tests passing in `useLocalStorage.test.ts` (22 existing + 5 new security tests)
- All 5 E2E tests passing
- Test coverage for settings module: ~92% (up from ~89%)
- Overall test quality score: **85/100** (up from 76.55/100)

---

**Last Updated:** 2025-10-18
**Owner:** QA Team
**Next Review:** After Sprint 1 completion
