# Authentication Database Verification Guide

**Purpose**: Verify database state after authentication operations to ensure all 6 fixes are working correctly.

**Time Required**: ~5 minutes

**Tools**: DB Browser for SQLite, DBeaver, or SQLite CLI

---

## Database Location

```
Windows: F:\Justice Companion take 2\justice.db
macOS: ~/Library/Application Support/Justice-Companion/justice.db
Linux: ~/.config/Justice-Companion/justice.db
```

---

## Query 1: Verify Users Table Populated

**Validates**: Fix #1 (IPC response structure), Fix #4 (hasConsent bypass)

```sql
-- Check recent users
SELECT
  id,
  username,
  email,
  role,
  is_active,
  created_at,
  last_login_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- ✅ At least 1 test user exists
- ✅ `username` matches what you registered (e.g., `testuser_1234567890`)
- ✅ `email` is valid format
- ✅ `role` is `'user'` (default)
- ✅ `is_active` is `1` (true)
- ✅ `created_at` is recent timestamp
- ✅ `last_login_at` updated after login

**If Fails**:
- Registration may have failed silently
- Check IPC handler logs in Electron console
- Verify Fix #1 implementation in `AuthContext.tsx`

---

## Query 2: Verify Sessions Table Valid

**Validates**: Fix #1 (IPC response), Fix #2 (session persistence), Fix #5 (IPC guards)

```sql
-- Check active sessions
SELECT
  id AS session_id,
  user_id,
  expires_at,
  remember_me,
  created_at,
  CASE
    WHEN datetime(expires_at) > datetime('now') THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END AS status
FROM sessions
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- ✅ `session_id` is UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- ✅ `user_id` matches a valid user from users table
- ✅ `expires_at` is 24 hours from now (if `remember_me = 0`)
- ✅ `expires_at` is 30 days from now (if `remember_me = 1`)
- ✅ `status` is `'ACTIVE'` for recent logins
- ✅ Session created when login succeeded

**If Fails**:
- Session not created → Check Fix #1 (IPC response structure)
- Session expired immediately → Check `expires_at` calculation
- `remember_me` always 0 → Check login checkbox in UI

---

## Query 3: Verify Audit Logs Recorded

**Validates**: All fixes (audit logs should record all auth events)

```sql
-- Check authentication audit trail
SELECT
  id,
  event_type,
  user_id,
  success,
  details,
  created_at
FROM audit_logs
WHERE event_type IN ('user.register', 'user.login', 'user.logout', 'user.login_failed')
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Results**:
- ✅ `user.register` event logged with `success = 1`
- ✅ `user.login` event logged with `success = 1`
- ✅ `user.logout` event logged with `success = 1`
- ✅ `user.login_failed` event logged if invalid credentials (with `success = 0`)
- ✅ `details` JSON contains relevant information
- ✅ All events have immutable hash chain (if implemented)

**Sample Details JSON**:
```json
{
  "username": "testuser_1234567890",
  "ip_address": "127.0.0.1",
  "user_agent": "Electron/38.2.1"
}
```

**If Fails**:
- Missing audit logs → Check `AuditLogger` service integration
- `success = 0` for valid login → Check Fix #1, #6 (IPC/password validation)

---

## Query 4: Verify Passwords Hashed (NOT Plaintext)

**Validates**: Security - passwords should NEVER be stored in plaintext

```sql
-- Check password security
SELECT
  username,
  password_hash,
  password_salt,
  LENGTH(password_hash) AS hash_length,
  LENGTH(password_salt) AS salt_length
FROM users
WHERE username LIKE 'testuser_%'
LIMIT 5;
```

**Expected Results**:
- ✅ `password_hash` is 128 hex characters (64 bytes scrypt output)
- ✅ `password_salt` is 32 hex characters (16 bytes random salt)
- ✅ `hash_length = 128`
- ✅ `salt_length = 32`
- ✅ NO passwords stored as plaintext (e.g., `'TestPassword123!'`)

**Example Output**:
```
username              password_hash                                       password_salt               hash_length  salt_length
--------------------  --------------------------------------------------  --------------------------  -----------  -----------
testuser_1234567890   3a8f9b2c...d7e4f1a6 (128 chars)                    7d2e9f1b...a4c8d3e7 (32)   128          32
```

**If Fails**:
- Plaintext password found → **CRITICAL SECURITY ISSUE** → Check `AuthenticationService.hashPassword()`
- Wrong hash length → Check scrypt configuration

---

## Query 5: Verify Encrypted Fields Are Encrypted

**Validates**: EncryptionService integration (if applicable to auth data)

```sql
-- Check for encrypted fields (if user data contains encrypted fields)
-- Example: If user table has encrypted personal info
SELECT
  username,
  email, -- Should be plaintext or encrypted depending on schema
  created_at
FROM users
WHERE username LIKE 'testuser_%'
LIMIT 5;
```

**Expected Results** (depends on schema):
- ✅ If `email` is encrypted: should be base64-encoded ciphertext (not plaintext email)
- ✅ If `email` is NOT encrypted: should be plaintext email address
- ✅ Verify schema design document for which fields require encryption

**Note**: Currently, user emails are NOT encrypted in Justice Companion. Encrypted fields are in:
- Cases table (`title`, `description`)
- Evidence table (`file_path`, `notes`)
- AI chat messages (if enabled)

---

## Additional Verification Queries

### Check Session Persistence (Fix #2)

```sql
-- Verify localStorage session ID matches database
-- Run this AFTER logging in with "Remember Me"
-- Then compare with localStorage.getItem('sessionId') in DevTools

SELECT id AS session_id, user_id, remember_me
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'YOUR_TEST_USERNAME')
ORDER BY created_at DESC
LIMIT 1;
```

**Manual Check**:
1. Login with "Remember Me" checked
2. Open DevTools (F12) → Console
3. Run: `localStorage.getItem('sessionId')`
4. Compare with `session_id` from query above
5. ✅ Should match exactly

---

### Check Password Validation (Fix #6)

```sql
-- Check if any users have weak passwords (shouldn't happen due to validation)
-- This is a negative test - should return 0 rows

SELECT username, LENGTH(password_hash) AS hash_length
FROM users
WHERE LENGTH(password_hash) < 128; -- Should be empty
```

**Expected**: **0 rows returned**

**If Returns Rows**:
- Password validation bypassed → Check Fix #6 in `LoginScreen.tsx`
- Scrypt hash failed → Check `AuthenticationService.hashPassword()`

---

### Check IPC Response Structure (Fix #1)

```sql
-- Verify user data matches IPC response format
-- After login, check that user record has all required fields for IPC response

SELECT
  id AS userId,
  username,
  email,
  role
FROM users
WHERE username = 'YOUR_TEST_USERNAME';
```

**Expected IPC Response** (from `AuthContext.tsx`):
```typescript
{
  userId: 1,
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  username: "testuser_1234567890",
  email: "test_1234567890@example.com"
}
```

**Verify**:
- ✅ Database query returns matching `userId`, `username`, `email`
- ✅ IPC response is FLAT (not nested with `{ user: {...}, sessionId }`)

---

## Troubleshooting Common Database Issues

### Issue: "Database is locked"
**Cause**: Multiple connections or transactions
**Fix**:
1. Close all database viewers
2. Close the app
3. Wait 5 seconds
4. Reopen

---

### Issue: "No users found"
**Cause**: Registration failed silently
**Fix**:
1. Check Electron console for errors
2. Verify IPC handler is registered
3. Test registration via DevTools:
   ```javascript
   window.justiceAPI.registerUser('testuser', 'TestPassword123!', 'test@test.com')
     .then(console.log)
     .catch(console.error);
   ```

---

### Issue: "Expired sessions still active"
**Cause**: Session expiration check not running
**Fix**: Check `AuthenticationService.isSessionValid()` implementation

---

## Summary Checklist

After running all queries:

- [ ] Query 1: Users table populated correctly
- [ ] Query 2: Sessions table has valid sessions
- [ ] Query 3: Audit logs recorded all events
- [ ] Query 4: Passwords hashed with scrypt
- [ ] Query 5: Encrypted fields encrypted (if applicable)
- [ ] Session ID matches localStorage
- [ ] No weak passwords in database
- [ ] IPC response format correct

**All checks passed?**
- ✅ YES → Proceed to Playwright tests
- ❌ NO → Fix issues, re-test

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**For**: Justice Companion Authentication Fixes Validation
