# Integration Test Plan - Authentication Fixes

**Purpose**: Test all 6 authentication fixes working together in real-world scenarios

**Time Required**: ~20 minutes

**Prerequisites**: All manual tests and database queries passed

---

## Test Overview

This integration test validates that all 6 fixes work together seamlessly in complete user workflows.

### Test Scope

1. **New User Journey**: Registration → Consent → Dashboard → Logout → Login
2. **Session Persistence Flow**: Login (Remember Me) → Close App → Reopen → Still Logged In
3. **Error Recovery Flow**: Invalid Login → Error Display → Retry with Valid Credentials → Success
4. **Security Flow**: Password Validation → IPC Guards → Audit Logging

---

## Integration Test 1: Complete New User Journey (10 min)

### Objective
Validate end-to-end flow from registration to logout, testing all 6 fixes in sequence.

### Prerequisites
- App freshly started
- No existing test users
- Database empty or backed up

---

### Step 1: Registration (Fix #1, #4, #5)

**Actions**:
1. Start app: `pnpm electron:dev`
2. Click "Register" or navigate to registration screen
3. Fill form:
   - Username: `integtest_user_001`
   - Email: `integtest_001@example.com`
   - Password: `IntegTest123!`
   - Confirm Password: `IntegTest123!`
4. Click "Create Account" or "Register"

**Expected Results**:
- ✅ No console errors (verify Fix #5: IPC guards)
- ✅ Dashboard appears (not blank screen) → **Validates Fix #1** (IPC response structure)
- ✅ User state populated correctly (`user.username` displayed)
- ✅ NO "Cannot read property 'user' of undefined" error

**Verification** (DevTools → Console):
```javascript
// Check user state
console.log('Current user:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
// Or check via IPC
window.justiceAPI.getCurrentUser(localStorage.getItem('sessionId'))
  .then(result => console.log('User from IPC:', result.data));
```

**Database Verification**:
```sql
SELECT id, username, email, created_at
FROM users
WHERE username = 'integtest_user_001';
-- Should return 1 row
```

**Pass Criteria**: User created, dashboard visible, no errors

---

### Step 2: Consent Banner (Fix #4)

**Actions**:
1. Observe consent banner after registration (should auto-appear)
2. Read consent text
3. Click "Accept" or "Continue"

**Expected Results**:
- ✅ Consent banner appears immediately after registration → **Validates Fix #4** (hasConsent bypass)
- ✅ Banner shows GDPR-compliant text
- ✅ Clicking "Accept" dismisses banner
- ✅ Dashboard remains visible after dismissal

**Verification**:
```javascript
// In DevTools console
// Check if consent banner is hidden
document.querySelector('[data-testid="consent-banner"]'); // Should be null
```

**Database Verification** (optional, if consent tracked):
```sql
SELECT user_id, consent_type, created_at
FROM user_consents
WHERE user_id = (SELECT id FROM users WHERE username = 'integtest_user_001');
```

**Pass Criteria**: Consent banner appears and dismisses correctly

---

### Step 3: Explore Dashboard (Fix #1, #2)

**Actions**:
1. Navigate through dashboard (Cases, Evidence, Settings)
2. Check user profile/settings
3. Verify username displayed correctly

**Expected Results**:
- ✅ User data persists across navigation
- ✅ No blank screens or crashes
- ✅ Username displayed in UI (e.g., "Welcome, integtest_user_001")
- ✅ No re-authentication required

**Verification**:
```javascript
// Check session persistence
console.log('Session ID:', localStorage.getItem('sessionId'));
console.log('User authenticated:', window.__AUTH_STATE__?.isAuthenticated);
```

**Pass Criteria**: Dashboard fully functional, user state persists

---

### Step 4: Logout (Fix #1, #5)

**Actions**:
1. Click "Logout" or "Sign Out" button
2. Observe transition to login screen
3. Verify session cleared

**Expected Results**:
- ✅ Redirected to login screen
- ✅ No errors in console
- ✅ Session cleared from database
- ✅ localStorage sessionId removed

**Verification**:
```javascript
// After logout
console.log('Session ID after logout:', localStorage.getItem('sessionId')); // Should be null
```

**Database Verification**:
```sql
SELECT COUNT(*) AS active_sessions
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'integtest_user_001')
  AND datetime(expires_at) > datetime('now');
-- Should return 0
```

**Pass Criteria**: Logout successful, session cleared

---

### Step 5: Re-Login (Fix #1, #6)

**Actions**:
1. Enter credentials:
   - Username: `integtest_user_001`
   - Password: `IntegTest123!`
   - Remember Me: ☐ (unchecked)
2. Click "Login"

**Expected Results**:
- ✅ Login succeeds → **Validates Fix #1** (IPC response)
- ✅ Password validation passes → **Validates Fix #6** (consistent validation)
- ✅ Dashboard appears
- ✅ New session created

**Database Verification**:
```sql
SELECT id, user_id, remember_me, created_at
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'integtest_user_001')
ORDER BY created_at DESC
LIMIT 1;
-- Should show new session with remember_me = 0
```

**Pass Criteria**: Re-login successful

---

## Integration Test 2: Session Persistence Flow (5 min)

### Objective
Validate Fix #2 (session persistence race condition) prevents login screen flash.

---

### Step 1: Login with Remember Me

**Actions**:
1. Login with:
   - Username: `integtest_user_001`
   - Password: `IntegTest123!`
   - Remember Me: ☑ (checked)
2. Wait for dashboard to appear

**Expected Results**:
- ✅ Login succeeds
- ✅ Dashboard visible
- ✅ SessionId stored in localStorage

**Verification**:
```javascript
console.log('Session ID:', localStorage.getItem('sessionId'));
```

**Pass Criteria**: Session created with Remember Me

---

### Step 2: Close and Reopen App

**Actions**:
1. Close app completely (Alt+F4 or Cmd+Q)
2. Wait 5 seconds
3. Reopen app: `pnpm electron:dev`
4. **Observe initial load carefully**

**Expected Results**:
- ✅ Dashboard appears **immediately** (no login screen flash) → **Validates Fix #2**
- ✅ No white screen during load
- ✅ User state restored from localStorage session
- ✅ No re-authentication required

**Critical**: Watch for login screen flash (common issue before Fix #2)

**Verification**:
```javascript
// Check session was restored
window.justiceAPI.getCurrentUser(localStorage.getItem('sessionId'))
  .then(result => console.log('Session restored:', result.success));
```

**Database Verification**:
```sql
SELECT id, remember_me, expires_at
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'integtest_user_001')
ORDER BY created_at DESC
LIMIT 1;

-- Verify remember_me = 1 and expires_at is ~30 days from now
```

**Pass Criteria**: Session persists, no login screen flash

---

## Integration Test 3: Error Recovery Flow (3 min)

### Objective
Validate Fix #3 (ErrorBoundary) and Fix #5 (IPC guards) handle errors gracefully.

---

### Step 1: Invalid Login Attempt

**Actions**:
1. Logout if logged in
2. Try to login with:
   - Username: `integtest_user_001`
   - Password: `WrongPassword123!`
3. Click "Login"

**Expected Results**:
- ✅ Error message displays ("Invalid credentials") → **Validates Fix #3** (ErrorBoundary)
- ✅ NO blank white screen
- ✅ Login form remains visible
- ✅ Can retry login immediately

**Verification**:
```javascript
// Check error state
document.querySelector('[data-testid="error-message"]')?.textContent;
// Should show error message
```

**Pass Criteria**: Error handled gracefully, no crash

---

### Step 2: Retry with Valid Credentials

**Actions**:
1. Clear password field
2. Enter correct password: `IntegTest123!`
3. Click "Login"

**Expected Results**:
- ✅ Login succeeds
- ✅ Error message clears
- ✅ Dashboard appears
- ✅ No residual errors

**Pass Criteria**: Recovery from error state works

---

## Integration Test 4: Security Flow (2 min)

### Objective
Validate Fix #6 (password validation) prevents weak passwords.

---

### Step 1: Short Password Rejection

**Actions**:
1. Logout if logged in
2. Navigate to login screen
3. Try to login with:
   - Username: `integtest_user_001`
   - Password: `short` (5 characters)
4. Click "Login"

**Expected Results**:
- ✅ Client-side error displayed → **Validates Fix #6**
- ✅ Error message: "Password must be at least 8 characters"
- ✅ NO IPC call made (validation happens client-side)
- ✅ Consistent with registration validation

**Verification** (DevTools → Network):
- No IPC call to `auth:login` (validation prevents it)

**Pass Criteria**: Short password rejected

---

### Step 2: Valid Password Accepted

**Actions**:
1. Clear password field
2. Enter valid password: `IntegTest123!` (13 characters)
3. Click "Login"

**Expected Results**:
- ✅ Password validation passes
- ✅ IPC call made
- ✅ Login succeeds

**Pass Criteria**: Valid password accepted

---

## Comprehensive Integration Test (All Fixes)

### Objective
Run all fixes in a single continuous workflow.

---

### Complete Workflow Test

**Time**: ~15 minutes

**Steps**:
1. **Register** new user (`integtest_complete_001`) → Fix #1, #4, #5
2. **Verify** consent banner appears → Fix #4
3. **Accept** consent → Fix #4
4. **Logout** → Fix #1, #5
5. **Try invalid login** (wrong password) → Fix #3, #6
6. **Verify** error displays (not blank screen) → Fix #3
7. **Try short password** (<8 chars) → Fix #6
8. **Verify** client-side validation rejects it → Fix #6
9. **Login** with valid credentials + Remember Me → Fix #1, #2, #6
10. **Close** app completely
11. **Reopen** app
12. **Verify** dashboard appears immediately (no flash) → Fix #2
13. **Navigate** through app features
14. **Logout**
15. **Verify** session cleared

**Expected Results**:
- ✅ All 15 steps complete without errors
- ✅ No console errors throughout workflow
- ✅ All 6 fixes validated in real-world usage

**Pass Criteria**: Complete workflow succeeds end-to-end

---

## Integration Test Results Template

```markdown
# Integration Test Results

**Date**: [YYYY-MM-DD]
**Tester**: [Your Name]
**Environment**: Windows 11, Node 20.18.0, Electron 38.2.1

## Test 1: New User Journey

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1.1 | Registration | ✅ / ❌ | |
| 1.2 | Consent Banner | ✅ / ❌ | |
| 1.3 | Dashboard Navigation | ✅ / ❌ | |
| 1.4 | Logout | ✅ / ❌ | |
| 1.5 | Re-Login | ✅ / ❌ | |

**Overall**: [PASS / FAIL]

## Test 2: Session Persistence

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 2.1 | Login with Remember Me | ✅ / ❌ | |
| 2.2 | Close and Reopen App | ✅ / ❌ | |
| 2.3 | No Login Screen Flash | ✅ / ❌ | **Critical for Fix #2** |

**Overall**: [PASS / FAIL]

## Test 3: Error Recovery

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 3.1 | Invalid Login Error | ✅ / ❌ | |
| 3.2 | Retry with Valid Credentials | ✅ / ❌ | |

**Overall**: [PASS / FAIL]

## Test 4: Security Validation

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 4.1 | Short Password Rejected | ✅ / ❌ | |
| 4.2 | Valid Password Accepted | ✅ / ❌ | |

**Overall**: [PASS / FAIL]

## Comprehensive Test

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| All 15 steps | Complete workflow | ✅ / ❌ | |

**Overall**: [PASS / FAIL]

---

## Summary

- **Tests Passed**: [X / 5]
- **Critical Issues**: [None / List issues]
- **Recommendation**: [APPROVE for deployment / REQUIRES FIXES]

## Issues Found

1. [Issue description]
   - Severity: [Critical / High / Medium / Low]
   - Fix: [Proposed solution]

## Sign-Off

- [ ] All integration tests passed
- [ ] No critical issues found
- [ ] Ready for production deployment

**Signature**: _______________
**Date**: _______________
```

---

## Troubleshooting

### Issue: Session persistence test fails (login screen flashes)

**Cause**: Fix #2 not properly implemented or race condition still exists

**Debug**:
1. Open `AuthContext.tsx`
2. Check lines 53-86 (combined useEffect)
3. Verify `storedSessionId` loads BEFORE `isLoading` set to false
4. Add console.log to track execution order:
   ```typescript
   console.log('[AuthContext] Loading session:', storedSessionId);
   console.log('[AuthContext] Session check result:', result);
   ```

**Fix**: Ensure session check completes before setting `isLoading = false`

---

### Issue: Error boundary test fails (blank screen on error)

**Cause**: ErrorBoundary not wrapping AuthFlow

**Debug**:
1. Open `App.tsx`
2. Verify ErrorBoundary wraps `<AuthFlow />`
3. Check ErrorBoundary fallback UI renders

**Fix**: Ensure ErrorBoundary is properly implemented

---

## Success Criteria

**PASS Integration Tests IF**:
- [ ] Test 1: New User Journey → All 5 steps pass
- [ ] Test 2: Session Persistence → No login screen flash
- [ ] Test 3: Error Recovery → Errors display, can retry
- [ ] Test 4: Security → Password validation consistent
- [ ] Comprehensive Test → All 15 steps complete

**FAIL Integration Tests IF**:
- [ ] Any critical step fails
- [ ] Login screen flash observed (Fix #2 broken)
- [ ] Blank white screen on error (Fix #3 broken)
- [ ] IPC errors in console (Fix #1 or #5 broken)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**For**: Justice Companion Authentication Fixes Validation
