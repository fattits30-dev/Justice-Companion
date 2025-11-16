# Dashboard HTTP API Testing Guide

**Status:** Ready for Testing
**Date:** 2025-11-13
**Component:** `src/components/Dashboard.migrated.tsx`
**Backend:** `backend/routes/dashboard.py`

---

## Prerequisites

Before testing, ensure:

1. **Backend is running:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Test user exists:**
   ```bash
   # Register a test user
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "TestPassword123!"
     }'
   ```

3. **Sample data exists:**
   ```bash
   # Create test cases, deadlines, and evidence using the API
   # See backend/tests/fixtures/ for sample data scripts
   ```

4. **Frontend dev server running:**
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

---

## Test Plan

### Phase 1: Manual Testing

#### 1.1 Dashboard Load Test

**Test:** Dashboard loads successfully with all widgets

**Steps:**
1. Log in as test user
2. Navigate to dashboard
3. Verify all widgets load within 2 seconds
4. Check browser console for errors

**Expected Results:**
- ✅ Stats widget shows correct counts
- ✅ Recent cases widget shows last 5 cases
- ✅ Deadlines widget shows upcoming deadlines
- ✅ No console errors
- ✅ Loading skeletons appear during fetch
- ✅ Smooth transition to loaded state

**Test Data:**
```json
{
  "sessionId": "<from login response>",
  "expectedStats": {
    "totalCases": 5,
    "activeCases": 3,
    "closedCases": 2,
    "totalEvidence": 10,
    "totalDeadlines": 4,
    "overdueDeadlines": 1,
    "unreadNotifications": 2
  }
}
```

**API Calls to Monitor:**
```http
GET /dashboard/stats
GET /dashboard/recent-cases?limit=5
GET /dashboard/deadlines?limit=5
```

---

#### 1.2 Stats Widget Test

**Test:** Statistics display correctly

**Steps:**
1. Create 5 test cases (3 active, 2 closed)
2. Upload 10 evidence files
3. Create 4 deadlines (1 overdue)
4. Reload dashboard
5. Verify stats match expected counts

**Expected Results:**
- ✅ Total Cases: 5
- ✅ Active Cases: 3
- ✅ Closed Cases: 2 (not shown separately)
- ✅ Total Evidence: 10
- ✅ Total Deadlines: 4
- ✅ Overdue Deadlines: 1 (shown in red)

**Test SQL Query:**
```sql
-- Verify stats in database
SELECT
  (SELECT COUNT(*) FROM cases WHERE user_id = 1) as total_cases,
  (SELECT COUNT(*) FROM cases WHERE user_id = 1 AND status = 'active') as active_cases,
  (SELECT COUNT(*) FROM evidence WHERE case_id IN (SELECT id FROM cases WHERE user_id = 1)) as total_evidence,
  (SELECT COUNT(*) FROM deadlines WHERE user_id = 1 AND deleted_at IS NULL) as total_deadlines,
  (SELECT COUNT(*) FROM deadlines WHERE user_id = 1 AND status != 'completed' AND deadline_date < datetime('now')) as overdue_deadlines;
```

---

#### 1.3 Recent Cases Widget Test

**Test:** Recent cases display with correct status badges

**Steps:**
1. Create 10 test cases with different statuses
2. Update 3 cases recently
3. Reload dashboard
4. Verify recent cases show last 5 updated cases

**Expected Results:**
- ✅ Shows exactly 5 most recently updated cases
- ✅ Cases sorted by `lastUpdated` descending
- ✅ Status badges display correct colors:
  - Active: Green
  - Pending: Yellow
  - Closed: Gray
- ✅ Case titles are clickable
- ✅ Last updated dates format correctly (e.g., "12 Nov 2025")

**Test Data:**
```json
{
  "cases": [
    { "id": 1, "title": "Case A", "status": "active", "lastUpdated": "2025-11-13T10:00:00Z" },
    { "id": 2, "title": "Case B", "status": "pending", "lastUpdated": "2025-11-12T15:30:00Z" },
    { "id": 3, "title": "Case C", "status": "closed", "lastUpdated": "2025-11-11T09:00:00Z" }
  ]
}
```

---

#### 1.4 Deadlines Widget Test

**Test:** Upcoming deadlines display with overdue highlighting

**Steps:**
1. Create 5 deadlines:
   - 1 overdue (2 days ago)
   - 1 due today
   - 1 due in 2 days
   - 1 due in 7 days
   - 1 due in 30 days
2. Reload dashboard
3. Verify deadlines display correctly

**Expected Results:**
- ✅ Deadlines sorted by date ascending
- ✅ Overdue deadline has red border and "OVERDUE" badge
- ✅ Priority badges display:
  - High: Red/Warning
  - Medium: Gray/Neutral
  - Low: Green/Success
- ✅ "Days until" calculation correct
- ✅ Case title displayed (if linked to case)

**Test Data:**
```json
{
  "deadlines": [
    {
      "id": 1,
      "title": "File ET1 Tribunal Claim",
      "deadlineDate": "2025-11-11T23:59:59Z",
      "priority": "high",
      "daysUntil": -2,
      "isOverdue": true,
      "caseId": 1,
      "caseTitle": "Smith v. Jones"
    },
    {
      "id": 2,
      "title": "Submit Evidence Bundle",
      "deadlineDate": "2025-11-13T23:59:59Z",
      "priority": "high",
      "daysUntil": 0,
      "isOverdue": false,
      "caseId": 1,
      "caseTitle": "Smith v. Jones"
    }
  ]
}
```

---

#### 1.5 Empty State Test

**Test:** Empty states display correctly when no data

**Steps:**
1. Create new user with no data
2. Log in
3. Navigate to dashboard
4. Verify empty state messages

**Expected Results:**
- ✅ Stats show 0 for all counts
- ✅ Recent cases show "Ready to start your first case?" message
- ✅ Deadlines widget not shown (hidden when no deadlines)
- ✅ "New Case" button is clickable
- ✅ Helpful tips displayed

---

#### 1.6 Error Handling Test

**Test:** Error states display user-friendly messages

**Steps:**
1. **Test 401 Unauthorized (Session Expired):**
   - Manually expire session in database
   - Reload dashboard
   - Verify "Session expired" message
   - Verify auto-redirect to login after 2 seconds

2. **Test 500 Server Error:**
   - Stop backend server
   - Reload dashboard
   - Verify "Server error" message
   - Verify "Try Again" button appears

3. **Test Network Error:**
   - Disconnect from internet
   - Reload dashboard
   - Verify network error message

**Expected Results:**
- ✅ 401: Shows "Session expired. Please log in again."
- ✅ 401: Auto-redirects to login after 2 seconds
- ✅ 500: Shows "Server error. Please try again later."
- ✅ Network: Shows "Failed to load dashboard"
- ✅ "Try Again" button successfully reloads dashboard
- ✅ No stack traces or technical errors shown to user

---

#### 1.7 Performance Test

**Test:** Dashboard loads within performance targets

**Steps:**
1. Open browser DevTools Network tab
2. Clear cache
3. Reload dashboard
4. Measure total load time

**Expected Results:**
- ✅ Initial load: <2 seconds (with network latency)
- ✅ API calls execute in parallel (not sequential)
- ✅ Loading skeletons appear immediately
- ✅ No UI blocking during data fetch
- ✅ Smooth animations on card hover

**Performance Targets:**
| Metric | Target | Measured |
|--------|--------|----------|
| Time to First Byte | <100ms | ___ ms |
| API Response Time | <500ms | ___ ms |
| Total Load Time | <2s | ___ s |
| Parallel Requests | 3 | ___ |

---

### Phase 2: Automated Testing

#### 2.1 Integration Tests

**File:** `tests/integration/dashboard.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../src/lib/apiClient';

describe('Dashboard HTTP API Integration', () => {
  let sessionId: string;

  beforeEach(async () => {
    // Login to get session
    const loginRes = await apiClient.auth.login('testuser', 'TestPassword123!');
    expect(loginRes.success).toBe(true);
    sessionId = loginRes.data.session.id;
    apiClient.setSessionId(sessionId);
  });

  it('should load dashboard stats successfully', async () => {
    const statsRes = await apiClient.dashboard.getStats();

    expect(statsRes.success).toBe(true);
    expect(statsRes.data).toBeDefined();
    expect(statsRes.data.totalCases).toBeGreaterThanOrEqual(0);
    expect(statsRes.data.activeCases).toBeGreaterThanOrEqual(0);
    expect(statsRes.data.totalEvidence).toBeGreaterThanOrEqual(0);
  });

  it('should load recent cases with limit', async () => {
    const casesRes = await apiClient.dashboard.getRecentCases(5);

    expect(casesRes.success).toBe(true);
    expect(casesRes.data.cases).toBeDefined();
    expect(casesRes.data.cases.length).toBeLessThanOrEqual(5);
    expect(casesRes.data.total).toBeGreaterThanOrEqual(0);
  });

  it('should load upcoming deadlines', async () => {
    const deadlinesRes = await apiClient.dashboard.getUpcomingDeadlines(5);

    expect(deadlinesRes.success).toBe(true);
    expect(deadlinesRes.data.upcomingDeadlines).toBeDefined();
    expect(deadlinesRes.data.totalDeadlines).toBeGreaterThanOrEqual(0);
    expect(deadlinesRes.data.overdueCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle parallel requests correctly', async () => {
    const startTime = Date.now();

    const [statsRes, casesRes, deadlinesRes] = await Promise.all([
      apiClient.dashboard.getStats(),
      apiClient.dashboard.getRecentCases(5),
      apiClient.dashboard.getUpcomingDeadlines(5),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(statsRes.success).toBe(true);
    expect(casesRes.success).toBe(true);
    expect(deadlinesRes.success).toBe(true);
    expect(duration).toBeLessThan(2000); // Should complete in <2 seconds
  });

  it('should return 401 for invalid session', async () => {
    apiClient.setSessionId('invalid-session-id');

    try {
      await apiClient.dashboard.getStats();
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    }
  });
});
```

---

#### 2.2 Component Tests

**File:** `tests/components/Dashboard.migrated.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../../src/components/Dashboard.migrated';
import { apiClient } from '../../src/lib/apiClient';

// Mock apiClient
vi.mock('../../src/lib/apiClient', () => ({
  apiClient: {
    setSessionId: vi.fn(),
    dashboard: {
      getStats: vi.fn(),
      getRecentCases: vi.fn(),
      getUpcomingDeadlines: vi.fn(),
    },
  },
}));

describe('Dashboard.migrated Component', () => {
  const mockSessionId = 'test-session-123';
  const mockUsername = 'John Smith';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(
      <Dashboard
        username={mockUsername}
        sessionId={mockSessionId}
      />
    );

    expect(screen.getByText(/Loading your dashboard/i)).toBeInTheDocument();
  });

  it('should load and display dashboard data', async () => {
    // Mock successful API responses
    vi.mocked(apiClient.dashboard.getStats).mockResolvedValue({
      success: true,
      data: {
        totalCases: 5,
        activeCases: 3,
        closedCases: 2,
        totalEvidence: 10,
        totalDeadlines: 4,
        overdueDeadlines: 1,
        unreadNotifications: 2,
      },
    });

    vi.mocked(apiClient.dashboard.getRecentCases).mockResolvedValue({
      success: true,
      data: {
        cases: [
          {
            id: 1,
            title: 'Test Case',
            status: 'active',
            lastUpdated: '2025-11-13T10:00:00Z',
          },
        ],
        total: 5,
      },
    });

    vi.mocked(apiClient.dashboard.getUpcomingDeadlines).mockResolvedValue({
      success: true,
      data: {
        upcomingDeadlines: [],
        totalDeadlines: 0,
        overdueCount: 0,
      },
    });

    render(
      <Dashboard
        username={mockUsername}
        sessionId={mockSessionId}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your dashboard/i)).not.toBeInTheDocument();
    });

    // Verify stats are displayed
    expect(screen.getByText('5')).toBeInTheDocument(); // Total cases
    expect(screen.getByText('3')).toBeInTheDocument(); // Active cases
    expect(screen.getByText('10')).toBeInTheDocument(); // Total evidence

    // Verify recent case is displayed
    expect(screen.getByText('Test Case')).toBeInTheDocument();
  });

  it('should handle session expiration (401)', async () => {
    const mockLogout = vi.fn();

    vi.mocked(apiClient.dashboard.getStats).mockRejectedValue(
      new ApiError(401, 'Session expired', 'UNAUTHORIZED')
    );

    render(
      <Dashboard
        username={mockUsername}
        sessionId={mockSessionId}
        onLogout={mockLogout}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
    });

    // Wait for auto-logout
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should display empty state when no cases', async () => {
    vi.mocked(apiClient.dashboard.getStats).mockResolvedValue({
      success: true,
      data: {
        totalCases: 0,
        activeCases: 0,
        closedCases: 0,
        totalEvidence: 0,
        totalDeadlines: 0,
        overdueDeadlines: 0,
        unreadNotifications: 0,
      },
    });

    vi.mocked(apiClient.dashboard.getRecentCases).mockResolvedValue({
      success: true,
      data: { cases: [], total: 0 },
    });

    vi.mocked(apiClient.dashboard.getUpcomingDeadlines).mockResolvedValue({
      success: true,
      data: { upcomingDeadlines: [], totalDeadlines: 0, overdueCount: 0 },
    });

    render(
      <Dashboard
        username={mockUsername}
        sessionId={mockSessionId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Ready to start your first case/i)).toBeInTheDocument();
    });
  });
});
```

---

#### 2.3 E2E Tests (Playwright)

**File:** `tests/e2e/specs/dashboard.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('http://localhost:5173/dashboard');
  });

  test('should load dashboard successfully', async ({ page }) => {
    // Verify welcome message
    await expect(page.locator('h1')).toContainText('Welcome back');

    // Verify stats widgets are visible
    await expect(page.locator('text=Your Cases')).toBeVisible();
    await expect(page.locator('text=Currently Active')).toBeVisible();
    await expect(page.locator('text=Evidence Collected')).toBeVisible();

    // Verify quick actions are visible
    await expect(page.locator('button:has-text("New Case")')).toBeVisible();
    await expect(page.locator('button:has-text("Upload Evidence")')).toBeVisible();
    await expect(page.locator('button:has-text("Start Chat")')).toBeVisible();
  });

  test('should navigate to case details on click', async ({ page }) => {
    // Wait for recent cases to load
    await page.waitForSelector('text=Your Recent Cases');

    // Click on first case (if exists)
    const firstCase = page.locator('[role="button"]').first();
    if (await firstCase.isVisible()) {
      await firstCase.click();
      await expect(page).toHaveURL(/\/cases\/\d+/);
    }
  });

  test('should handle quick action buttons', async ({ page }) => {
    // Click "New Case" button
    await page.click('button:has-text("New Case")');
    // Verify dialog or navigation
    await expect(page.locator('dialog')).toBeVisible();
  });

  test('should display overdue deadlines prominently', async ({ page }) => {
    // Check for overdue deadline indicator
    const overdueText = page.locator('text=OVERDUE');
    if (await overdueText.isVisible()) {
      const parent = overdueText.locator('..');
      await expect(parent).toHaveCSS('border-left-color', /red/);
    }
  });
});
```

---

### Phase 3: Performance Testing

#### 3.1 Load Testing with k6

**File:** `tests/load/dashboard-load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

export default function() {
  const BASE_URL = 'http://localhost:8000';

  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: 'testuser',
    password: 'TestPassword123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const sessionId = loginRes.json('data.session.id');

  // Dashboard stats
  const statsRes = http.get(`${BASE_URL}/dashboard/stats`, {
    headers: { 'X-Session-Id': sessionId },
  });

  check(statsRes, {
    'stats loaded': (r) => r.status === 200,
    'stats response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run load test:**
```bash
k6 run tests/load/dashboard-load-test.js
```

---

## Bug Report Template

If you find issues during testing, report them using this template:

```markdown
## Bug Report: [Brief Description]

**Severity:** [Critical / High / Medium / Low]
**Component:** Dashboard (HTTP API)
**Environment:** [Development / Staging / Production]

### Steps to Reproduce
1.
2.
3.

### Expected Behavior


### Actual Behavior


### Screenshots


### Console Errors
```
[Paste console output here]
```

### Network Request/Response
```json
// Request
{
  "method": "GET",
  "url": "/dashboard/stats",
  "headers": {
    "X-Session-Id": "..."
  }
}

// Response
{
  "status": 500,
  "body": {
    "error": "..."
  }
}
```

### Additional Context


### Suggested Fix (Optional)

```

---

## Test Results Log

### Test Session 1: [Date]

| Test Case | Status | Notes |
|-----------|--------|-------|
| Dashboard Load | ✅ Pass | Load time: 1.2s |
| Stats Widget | ✅ Pass | All counts correct |
| Recent Cases | ✅ Pass | Status badges display correctly |
| Deadlines Widget | ❌ Fail | Overdue highlighting not working |
| Empty State | ✅ Pass | Helpful message displayed |
| 401 Error Handling | ✅ Pass | Auto-logout works |
| 500 Error Handling | ✅ Pass | "Try Again" button works |
| Performance | ✅ Pass | <2s load time |

**Overall:** 7/8 tests passed (87.5%)

**Issues Found:**
1. Overdue deadline highlighting not working (border color not red)

**Action Items:**
- [ ] Fix overdue deadline CSS styling
- [ ] Retest with fix applied

---

## Sign-Off

### Functional Testing
- [ ] All widgets load successfully
- [ ] Data accuracy verified
- [ ] Error handling tested
- [ ] Empty states tested
- [ ] Performance targets met

**Tested By:** _________________
**Date:** _________________
**Signature:** _________________

### Integration Testing
- [ ] API integration tests pass
- [ ] Component tests pass
- [ ] E2E tests pass

**Tested By:** _________________
**Date:** _________________
**Signature:** _________________

### User Acceptance Testing
- [ ] Dashboard usability acceptable
- [ ] UI/UX matches requirements
- [ ] No regressions from previous version

**Tested By:** _________________
**Date:** _________________
**Signature:** _________________

---

**Last Updated:** 2025-11-13
**Version:** 1.0.0
**Status:** Ready for Testing
