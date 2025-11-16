# Authentication Migration Testing Checklist

**Version:** 1.0
**Date:** 2025-11-13
**Migration:** Electron IPC → HTTP REST API

---

## Pre-Testing Setup

### 1. Start Backend Server

```bash
cd backend
python -m uvicorn backend.main:app --reload --port 8000
```

**Verify backend is running:**
```bash
curl http://127.0.0.1:8000/health
# Expected: {"status":"healthy"...}
```

### 2. Start Frontend Application

```bash
npm run electron:dev
```

### 3. Open Browser DevTools

- Press F12 in Electron window
- Go to Console tab
- Go to Network tab
- Go to Application tab → Storage → Local Storage

---

## Automated Tests

### Run Test Suite

```bash
node scripts/test-auth-migration.mjs
```

**Expected Result:**
```
✅ All tests passed! Migration successful.
Passed: 7/7
```

**If tests fail:**
- Check backend is running on port 8000
- Check database is initialized
- Check for error messages in console
- Review network tab for failed requests

---

## Manual UI Testing

### Test 1: User Registration

**Steps:**
1. Launch app → Should show login screen
2. Click "Create account"
3. Fill form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: TestPassword123!
   - Confirm Password: TestPassword123!
   - Check "Accept terms"
4. Click "Sign Up"

**Expected Results:**
- [ ] Form validates all fields
- [ ] Shows loading state ("Creating account...")
- [ ] Redirects to login screen on success
- [ ] Shows success message
- [ ] No console errors

**Network Tab Check:**
- [ ] POST request to `/auth/register`
- [ ] Status: 201 Created
- [ ] Response includes `user` and `session`

**Failure Cases to Test:**
- [ ] Blank fields → Shows validation errors
- [ ] Invalid email → "Please enter a valid email"
- [ ] Short password (<12 chars) → "Password must be at least 12 characters"
- [ ] Passwords don't match → "Passwords do not match"
- [ ] Terms not accepted → "You must accept terms"

---

### Test 2: User Login (Valid Credentials)

**Steps:**
1. Enter username: Test User
2. Enter password: TestPassword123!
3. Check "Remember me" (optional)
4. Click "Sign In"

**Expected Results:**
- [ ] Shows loading state ("Logging in...")
- [ ] Redirects to dashboard
- [ ] Shows user's name in header
- [ ] localStorage has `sessionId`

**Network Tab Check:**
- [ ] POST request to `/auth/login`
- [ ] Status: 200 OK
- [ ] Response includes `user` and `session`
- [ ] Request body has `remember_me` field

**localStorage Check:**
```javascript
localStorage.getItem('sessionId')
// Should return: "550e8400-e29b-41d4-a716-446655440000" (UUID format)
```

---

### Test 3: User Login (Invalid Credentials)

**Steps:**
1. Enter username: Test User
2. Enter password: WrongPassword123!
3. Click "Sign In"

**Expected Results:**
- [ ] Shows error message: "Invalid credentials"
- [ ] Does NOT redirect to dashboard
- [ ] Form remains visible
- [ ] Username field NOT cleared
- [ ] Password field cleared
- [ ] No sessionId in localStorage

**Network Tab Check:**
- [ ] POST request to `/auth/login`
- [ ] Status: 401 Unauthorized
- [ ] Response: `{ detail: { message: "Invalid credentials", attempts_remaining: 5 } }`

---

### Test 4: Rate Limiting (Login)

**Steps:**
1. Attempt login with wrong password 5 times
2. Try to login again (6th attempt)

**Expected Results:**
- [ ] After 5 failed attempts, shows error: "Too many login attempts. Account locked for X seconds."
- [ ] Login button disabled for lockout period
- [ ] Timer shows countdown (optional)

**Network Tab Check:**
- [ ] 6th POST request to `/auth/login`
- [ ] Status: 429 Too Many Requests
- [ ] Response includes `rate_limit_info` with `retry_after_seconds`

**Wait 15 minutes and retry:**
- [ ] Login works after lockout expires

---

### Test 5: Protected Route Access (Authenticated)

**Steps:**
1. Login successfully
2. Navigate to /dashboard
3. Navigate to /cases
4. Navigate to /chat
5. Navigate to /settings

**Expected Results:**
- [ ] All routes accessible
- [ ] No redirects to login
- [ ] User data displayed correctly
- [ ] No console errors

**Network Tab Check:**
- [ ] No GET requests to `/auth/session/{id}` (session cached)
- [ ] Protected API calls include session context

---

### Test 6: Protected Route Access (Not Authenticated)

**Steps:**
1. Logout (if logged in)
2. Clear localStorage: `localStorage.clear()`
3. Try to navigate to /dashboard

**Expected Results:**
- [ ] Immediately redirects to /login
- [ ] Shows message: "Please login to continue"
- [ ] URL changes to /login
- [ ] No flash of dashboard content

---

### Test 7: Session Restoration on App Restart

**Steps:**
1. Login successfully
2. Note sessionId: `localStorage.getItem('sessionId')`
3. Close Electron app
4. Reopen Electron app

**Expected Results:**
- [ ] Automatically restores session
- [ ] Shows dashboard (not login screen)
- [ ] User's name displayed
- [ ] Same sessionId in localStorage

**Network Tab Check:**
- [ ] GET request to `/auth/session/{id}` on app startup
- [ ] Status: 200 OK
- [ ] Response includes valid user data

---

### Test 8: Session Expiration

**Method 1: Wait 24 hours (not practical)**

**Method 2: Manually expire session**
1. Login successfully
2. Get sessionId from localStorage
3. In backend, update session expiration:
   ```sql
   UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = 'SESSION_ID';
   ```
4. Refresh app or navigate to protected route

**Expected Results:**
- [ ] Session validation fails
- [ ] Redirects to login
- [ ] Shows message: "Session expired. Please login again."
- [ ] localStorage cleared

**Network Tab Check:**
- [ ] GET request to `/auth/session/{id}`
- [ ] Status: 404 Not Found
- [ ] Response: `{ detail: "Session not found or expired" }`

---

### Test 9: User Logout

**Steps:**
1. Login successfully
2. Click user menu → "Logout"

**Expected Results:**
- [ ] Shows confirmation dialog (optional)
- [ ] Redirects to /login
- [ ] localStorage cleared (no sessionId)
- [ ] Dashboard no longer accessible

**Network Tab Check:**
- [ ] POST request to `/auth/logout`
- [ ] Status: 200 OK
- [ ] Response: `{ success: true, message: "Logged out successfully" }`

**Re-access protected route:**
- [ ] Redirects to login (not accessible)

---

### Test 10: Remember Me Functionality

**Test 10a: WITHOUT Remember Me**
1. Login WITHOUT checking "Remember me"
2. Check session expiration:
   ```javascript
   // In console
   localStorage.getItem('sessionId')
   // Check backend: session should expire in 24 hours
   ```

**Test 10b: WITH Remember Me**
1. Login WITH "Remember me" checked
2. Check session expiration:
   ```javascript
   // In console
   localStorage.getItem('sessionId')
   // Check backend: session should expire in 30 days
   ```

**Expected Results:**
- [ ] Remember Me = false → 24-hour session
- [ ] Remember Me = true → 30-day session

---

## Error Handling Tests

### Test 11: Backend Offline

**Steps:**
1. Stop backend server
2. Try to login

**Expected Results:**
- [ ] Shows error: "Unable to connect. Please check your connection."
- [ ] Shows retry button
- [ ] No console crash
- [ ] App remains responsive

---

### Test 12: Network Timeout

**Steps:**
1. Simulate slow network (Chrome DevTools → Network → Throttling → Slow 3G)
2. Try to login

**Expected Results:**
- [ ] Shows loading state
- [ ] Waits up to 30 seconds
- [ ] Shows error if timeout
- [ ] Does not hang indefinitely

---

### Test 13: CORS Errors

**Steps:**
1. Change backend URL to wrong origin in `src/lib/apiClient.ts`
2. Try to login

**Expected Results:**
- [ ] Shows CORS error in console
- [ ] Shows user-friendly error: "Unable to connect"
- [ ] Does not expose technical details to user

---

## Security Tests

### Test 14: SQL Injection Prevention

**Steps:**
1. Try to login with username: `admin' OR '1'='1`
2. Try to login with password: `' OR '1'='1`

**Expected Results:**
- [ ] Login fails (invalid credentials)
- [ ] No database error
- [ ] No SQL query visible in error
- [ ] Audit log shows failed attempt

---

### Test 15: XSS Prevention

**Steps:**
1. Register with username: `<script>alert('XSS')</script>`
2. Login and check if script executes

**Expected Results:**
- [ ] Script does NOT execute
- [ ] Username displayed as plain text
- [ ] HTML escaped properly

---

### Test 16: Password Visibility Toggle

**Steps:**
1. Enter password
2. Click eye icon to show password
3. Click eye icon again to hide password

**Expected Results:**
- [ ] Password initially hidden (dots)
- [ ] Click shows plain text
- [ ] Click again hides text
- [ ] Icon changes (eye → eye-slash)

---

### Test 17: Session Hijacking Prevention

**Steps:**
1. Login and get sessionId
2. Open new browser/incognito window
3. Manually set sessionId in localStorage
4. Try to access dashboard

**Expected Results:**
- [ ] Session works (same user)
- [ ] Same IP address tracked
- [ ] Audit log shows session reuse
- [ ] (Future: Detect suspicious activity)

---

## Performance Tests

### Test 18: Login Performance

**Steps:**
1. Open Chrome DevTools → Performance tab
2. Start recording
3. Login
4. Stop recording

**Expected Results:**
- [ ] Total login time < 500ms
- [ ] Network request time < 100ms
- [ ] React render time < 50ms
- [ ] No long tasks (>50ms)

---

### Test 19: Session Validation Performance

**Steps:**
1. Open Chrome DevTools → Network tab
2. Navigate between protected routes
3. Measure session validation time

**Expected Results:**
- [ ] Session validation < 50ms
- [ ] Cached in memory (not validated on every route)
- [ ] No unnecessary API calls

---

## Accessibility Tests

### Test 20: Keyboard Navigation

**Steps:**
1. Tab through login form
2. Press Enter to submit

**Expected Results:**
- [ ] Can tab to all fields
- [ ] Focus visible on all elements
- [ ] Enter key submits form
- [ ] Escape key closes modals

---

### Test 21: Screen Reader Support

**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate login form

**Expected Results:**
- [ ] All labels announced
- [ ] Error messages announced
- [ ] Button states announced
- [ ] Form structure clear

---

## Cross-Browser Tests

### Test 22: Browser Compatibility

**Test in:**
- [ ] Chrome (Electron default)
- [ ] Firefox (if supported)
- [ ] Safari (macOS only)
- [ ] Edge (Windows only)

**Expected Results:**
- [ ] All features work consistently
- [ ] No browser-specific bugs
- [ ] localStorage works in all browsers

---

## Edge Cases

### Test 23: Duplicate Registration

**Steps:**
1. Register user: test@example.com
2. Try to register same email again

**Expected Results:**
- [ ] Shows error: "User already exists"
- [ ] Status: 400 Bad Request
- [ ] Does not create duplicate

---

### Test 24: Case Sensitivity

**Steps:**
1. Register: Test@Example.com
2. Try to login with: test@example.com

**Expected Results:**
- [ ] Email is case-insensitive
- [ ] Login succeeds
- [ ] Username comparison correct

---

### Test 25: Special Characters in Password

**Steps:**
1. Register with password: `P@$$w0rd!#%&*()`
2. Login with same password

**Expected Results:**
- [ ] Registration succeeds
- [ ] Login succeeds
- [ ] Password stored correctly

---

## Documentation Review

### Test 26: API Documentation

**Steps:**
1. Open http://127.0.0.1:8000/docs
2. Review all auth endpoints
3. Try "Try it out" feature

**Expected Results:**
- [ ] All endpoints documented
- [ ] Request/response examples clear
- [ ] "Try it out" works correctly
- [ ] Error codes documented

---

## Final Checklist

### Code Review
- [ ] Review `src/lib/apiClient.ts` for security issues
- [ ] Review `src/contexts/AuthContext.tsx` for logic errors
- [ ] Review error handling throughout
- [ ] Check TypeScript types are correct
- [ ] Verify no console.log in production code

### Testing Summary
- [ ] All automated tests pass (7/7)
- [ ] All manual UI tests pass
- [ ] All error handling tests pass
- [ ] All security tests pass
- [ ] All performance tests pass
- [ ] All accessibility tests pass

### Documentation
- [ ] Read AUTH_HTTP_MIGRATION.md
- [ ] Read QUICK_START_AUTH_HTTP.md
- [ ] Read AUTH_ARCHITECTURE.md
- [ ] Review Swagger docs (http://127.0.0.1:8000/docs)

### Sign-Off
- [ ] QA Engineer: _________________ Date: _______
- [ ] Security Engineer: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______

---

## Issues Found

| Issue # | Description | Severity | Status | Assigned To |
|---------|-------------|----------|--------|-------------|
| 1       |             |          |        |             |
| 2       |             |          |        |             |
| 3       |             |          |        |             |

**Severity:**
- P0: Critical (blocks release)
- P1: High (must fix before release)
- P2: Medium (should fix before release)
- P3: Low (can fix after release)

---

## Notes

**Tester Name:** _______________________
**Test Date:** _______________________
**Environment:** Development / Staging / Production
**Backend Version:** _______________________
**Frontend Version:** _______________________

**Additional Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**END OF TESTING CHECKLIST**
