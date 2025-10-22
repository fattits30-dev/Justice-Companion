# Quick Testing Guide - Authentication Flow

**⚡ TL;DR**: Manual test first → If passes → Run Playwright tests

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start the App
```bash
# Ensure correct Node version
nvm use 20

# Start the app
pnpm electron:dev
```

### Step 2: Test Registration
1. Open the app
2. Click "Register"
3. Fill in:
   - Username: `testuser`
   - Email: `test@test.com`
   - Password: `TestPassword123!`
4. Click "Create Account"
5. ✅ Should see dashboard or success message

### Step 3: Test Login
1. If logged in, logout first
2. Login with:
   - Username: `testuser`
   - Password: `TestPassword123!`
3. ✅ Should see dashboard

### Step 4: Test Invalid Login
1. Login with:
   - Username: `wronguser`
   - Password: `WrongPassword123!`
2. ✅ Should see error message

---

## 🎯 Critical Success Indicators

| What to Check | Expected Result | How to Verify |
|---------------|-----------------|---------------|
| **App Launches** | Login screen appears | No blank white screen |
| **No Import Errors** | Clean console | Press F12, check Console tab |
| **Registration Works** | User created | Check database or dashboard appears |
| **Login Works** | Dashboard appears | See "Welcome" or "Dashboard" text |
| **Invalid Login Rejected** | Error message | See "Invalid credentials" message |

---

## 🔍 Quick Console Checks

Open DevTools (F12) and run these commands:

```javascript
// Check if IPC bridge is working
console.log(window.justiceAPI);
// Should show: { loginUser: [Function], registerUser: [Function], ... }

// Test registration via IPC
window.justiceAPI.registerUser('testuser2', 'TestPassword123!', 'test2@test.com')
  .then(result => console.log('✅ Register:', result))
  .catch(error => console.error('❌ Register failed:', error));

// Test login via IPC
window.justiceAPI.loginUser('testuser2', 'TestPassword123!', false)
  .then(result => console.log('✅ Login:', result))
  .catch(error => console.error('❌ Login failed:', error));
```

---

## 🐛 Quick Troubleshooting

### Problem: Blank white screen
**Fix**: Check console for import errors (F12 → Console)
```bash
# If errors, rebuild native modules
pnpm rebuild:electron
```

### Problem: "Cannot find module" errors
**Cause**: Import paths incorrect
**Status**: ✅ Already fixed in commit 1bef370 (74 files updated)

### Problem: Database locked
**Fix**: Close all other instances of the app
```bash
# Windows Task Manager → End "Justice Companion" processes
```

### Problem: Login always fails
**Check**:
1. Password meets requirements (12+ chars, uppercase, lowercase, number)
2. User exists in database
3. Check console for errors

---

## 📊 Manual Test Results Template

```
Date: [TODAY'S DATE]
Tester: [YOUR NAME]

✅ / ❌  App launches without errors
✅ / ❌  Registration works
✅ / ❌  Login works with valid credentials
✅ / ❌  Login rejected with invalid credentials
✅ / ❌  Password validation enforced (weak passwords rejected)

Overall: [X/5] tests passed

Critical Issues:
- [List any blockers here]

Next Step: [Proceed to Playwright tests / Fix issues first]
```

---

## 🤖 Run Automated Tests (After Manual Pass)

```bash
# Rebuild native modules for Node.js (required once)
pnpm rebuild:node

# Run Playwright tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e e2e/auth.spec.ts
```

**Expected**: All tests pass ✅ (or most pass with known issues documented)

---

## 📝 Quick Database Verification (SQL)

Open your SQLite viewer (DB Browser, DBeaver, etc.) and check:

```sql
-- Check users table
SELECT id, username, email, role, is_active, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Check sessions table
SELECT id, user_id, expires_at, remember_me, created_at
FROM sessions
ORDER BY created_at DESC
LIMIT 5;

-- Check audit logs
SELECT event_type, user_id, success, created_at
FROM audit_logs
WHERE event_type LIKE 'user.%'
ORDER BY created_at DESC
LIMIT 10;

-- Verify password is hashed (not plaintext)
SELECT username, password_hash, password_salt
FROM users
WHERE username = 'testuser';
-- password_hash should be 128 hex characters
-- password_salt should be 32 hex characters
```

---

## 📞 Need Help?

1. **Check TESTING_STRATEGY_AUTH.md** for detailed test plans
2. **Check e2e/auth.spec.improved.ts** for test examples
3. **Run database dump**: See `tests/helpers/DatabaseTestHelper.ts`
4. **Check console logs**: F12 → Console tab

---

## ✅ Success Criteria (Go/No-Go)

**✅ PROCEED TO PHASE 2 (Playwright) IF**:
- App launches without errors
- Registration creates user
- Login works end-to-end
- Database operations verified
- No critical console errors

**❌ FIX ISSUES FIRST IF**:
- Blank white screen on launch
- "Cannot find module" errors
- Registration/Login doesn't work
- Database not updated
- Critical errors in console

---

---

## 🆕 Post-Fix Authentication Validation (15 Minutes)

**Purpose**: Validate all 6 critical authentication fixes are working correctly.

**Prerequisites**:
- [ ] node_modules installed (run `nuclear-fix-node-modules.ps1` if needed)
- [ ] App builds successfully (`pnpm build`)
- [ ] No TypeScript errors (`pnpm type-check`)

---

### Test 1: Registration Flow (3 min) - Validates Fix #1, #4

**Steps**:
1. Start app: `pnpm electron:dev`
2. Click "Register" or navigate to registration screen
3. Enter test credentials:
   - Username: `testuser_${timestamp}`
   - Email: `test_${timestamp}@example.com`
   - Password: `TestPassword123!`
4. Submit registration

**Expected Results**:
- ✅ No console errors
- ✅ Dashboard appears (no blank screen) → **Validates Fix #1** (IPC response structure)
- ✅ Consent banner displays → **Validates Fix #4** (hasConsent bypass)
- ✅ NO "Cannot read property 'user' of undefined" error

**If Fails**:
- Check browser console (F12) for errors
- Verify Fix #1 implementation in `AuthContext.tsx` (lines 103-110)
- Check IPC response structure is flat: `{ userId, sessionId, username, email }`

---

### Test 2: Login Flow (2 min) - Validates Fix #1, #5

**Steps**:
1. Logout (if logged in from Test 1)
2. Enter credentials from Test 1
3. Click "Login"

**Expected Results**:
- ✅ No console errors
- ✅ Dashboard appears immediately
- ✅ User data populates correctly (username displayed) → **Validates Fix #1**
- ✅ No IPC errors in console → **Validates Fix #5** (IPC guards)

**If Fails**:
- Check Fix #1 (IPC response structure) in `AuthContext.tsx`
- Verify Fix #5 (IPC guards) in `AuthContext.tsx` (lines 57-61)

---

### Test 3: Session Persistence (3 min) - Validates Fix #2

**Steps**:
1. Ensure logged in (from Test 2)
2. Close app completely (Ctrl+C or close window)
3. Restart app: `pnpm electron:dev`
4. **Observe initial load carefully**

**Expected Results**:
- ✅ Dashboard appears **immediately** (no login screen flash) → **Validates Fix #2**
- ✅ No white screen during load
- ✅ User data persists (username/email displayed)
- ✅ Session restored from localStorage

**Critical**: Watch for login screen "flash" - should NOT happen with Fix #2

**If Fails**:
- Check Fix #2 (combined session loading effect) in `AuthContext.tsx` (lines 53-86)
- Verify localStorage has `sessionId` (DevTools → Application → Local Storage)
- Check console for session loading logs

---

### Test 4: Invalid Credentials (2 min) - Validates Fix #3

**Steps**:
1. Logout
2. Enter invalid credentials:
   - Username: `wronguser`
   - Password: `wrongpassword`
3. Click "Login"

**Expected Results**:
- ✅ Error message displays ("Invalid credentials")
- ✅ NO blank white screen → **Validates Fix #3** (ErrorBoundary)
- ✅ Error shown in toast notification or error display
- ✅ Login form remains visible

**If Fails**:
- Verify ErrorBoundary wraps AuthFlow in `App.tsx`
- Check ErrorBoundary implementation renders fallback UI

---

### Test 5: Password Validation (2 min) - Validates Fix #6

**Steps**:
1. Navigate to login screen
2. Enter credentials:
   - Username: `testuser`
   - Password: `short` (< 8 characters)
3. Click "Login"

**Expected Results**:
- ✅ Error message: "Password must be at least 8 characters" → **Validates Fix #6**
- ✅ Client-side validation prevents IPC call
- ✅ Consistent with registration password validation
- ✅ No backend error (validation happens client-side)

**If Fails**:
- Check Fix #6 (password validation) in `LoginScreen.tsx` (lines 40-44)
- Verify error message displays

---

### Test 6: Error Handling (3 min) - Validates Fix #5

**Steps**:
1. Open DevTools (F12)
2. Go to Console tab
3. Type: `window.justiceAPI = undefined;`
4. Try to login (or perform any auth operation)

**Expected Results**:
- ✅ Error logged: "IPC API not available" → **Validates Fix #5**
- ✅ App doesn't crash
- ✅ Graceful error message shown to user

**If Fails**:
- Check Fix #5 (IPC validation guards) in `AuthContext.tsx` (lines 57-61)
- Verify guard checks for `window.justiceAPI` before usage

---

### Summary Checklist

After completing all tests:

- [ ] Test 1: Registration succeeds (Fix #1, #4) ✅
- [ ] Test 2: Login succeeds (Fix #1, #5) ✅
- [ ] Test 3: Session persists, no flash (Fix #2) ✅
- [ ] Test 4: Errors display correctly (Fix #3) ✅
- [ ] Test 5: Password validation works (Fix #6) ✅
- [ ] Test 6: IPC guards prevent crashes (Fix #5) ✅

**All 6 tests passed?**
- ✅ **YES** → Authentication is production-ready, proceed to Playwright tests
- ❌ **NO** → Check specific fix implementation, review console errors, see TESTING_STRATEGY_AUTH.md

---

**Document**: Quick Test Guide
**Version**: 1.1 (Updated with 6-Fix Validation)
**For**: Justice Companion v1.0.0 (post-TSX import fixes + authentication fixes)
