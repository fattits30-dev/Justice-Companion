# KeyManager Health Check Test Plan

## Test Environment
- **Platform:** Windows 11 (WSL2)
- **Node:** v20.19.5
- **Electron:** 38.3.0

## Health Checks to Test

### ✅ Test 1: Normal Startup (Happy Path)
**Scenario:** App starts with valid encryption key in safeStorage
**Expected:** All 5 health checks pass, app starts normally
**Simulation:** Run `pnpm electron:dev` with existing setup
**Status:** PENDING

---

### ✅ Test 2: First-Time Setup (.env Migration)
**Scenario:** No key in safeStorage, valid key in .env
**Expected:**
- Health check 3 detects missing key
- Auto-migrates from .env
- Shows warning dialog to remove .env key
- All checks pass, app starts

**Simulation:**
```bash
# 1. Remove safeStorage key
rm "$(node -p "require('electron').app.getPath('userData')")/.encryption-key"

# 2. Ensure .env has key
echo "ENCRYPTION_KEY_BASE64=$(openssl rand -base64 32)" > .env

# 3. Start app
pnpm electron:dev
```
**Status:** PENDING

---

### ❌ Test 3: Missing Encryption Key
**Scenario:** No key in safeStorage OR .env
**Expected:**
- Health check 3 fails
- Shows error dialog: "No Encryption Key Found"
- Provides instructions to generate key
- App quits

**Simulation:**
```bash
# 1. Remove safeStorage key
rm "$(node -p "require('electron').app.getPath('userData')")/.encryption-key"

# 2. Remove .env key
grep -v "ENCRYPTION_KEY_BASE64" .env > .env.tmp && mv .env.tmp .env

# 3. Start app (should fail gracefully)
pnpm electron:dev
```
**Status:** PENDING

---

### ❌ Test 4: Invalid Key Length
**Scenario:** Key exists but is not 32 bytes
**Expected:**
- Health check 4 fails
- Shows error dialog: "Invalid Encryption Key"
- App quits

**Simulation:**
```bash
# 1. Create invalid key (16 bytes instead of 32)
echo "ENCRYPTION_KEY_BASE64=$(openssl rand -base64 16)" > .env

# 2. Remove existing safeStorage key
rm "$(node -p "require('electron').app.getPath('userData')")/.encryption-key"

# 3. Start app (should detect and fail)
pnpm electron:dev
```
**Status:** PENDING

---

### ❌ Test 5: Corrupted Key File
**Scenario:** safeStorage key file exists but is corrupted
**Expected:**
- Health check 4 fails when trying to load key
- Shows error dialog: "Encryption Key Load Failed"
- App quits

**Simulation:**
```bash
# 1. Find key file
KEY_FILE="$(node -p "require('electron').app.getPath('userData')")/.encryption-key"

# 2. Corrupt it (write random garbage)
echo "CORRUPTED_DATA_NOT_VALID_ENCRYPTION" > "$KEY_FILE"

# 3. Start app (should detect corruption)
pnpm electron:dev
```
**Status:** PENDING

---

### ✅ Test 6: Encryption Round-Trip Success
**Scenario:** All previous checks pass, test encryption/decryption
**Expected:**
- Health check 5 passes
- Test data encrypts and decrypts correctly
- App starts

**Note:** This is tested automatically in normal startup (Test 1)
**Status:** PENDING

---

## Test Execution

### Prerequisites
```bash
# 1. Ensure you have a backup of your .env file
cp .env .env.backup

# 2. Note userData path for safeStorage
node -p "require('electron').app.getPath('userData')"
# Example: C:\Users\<username>\AppData\Roaming\justice-companion
```

### Execution Order
1. ✅ Test 1 (Happy path)
2. ✅ Test 2 (.env migration)
3. ❌ Test 3 (Missing key)
4. ❌ Test 4 (Invalid length)
5. ❌ Test 5 (Corrupted file)
6. ✅ Test 6 (Round-trip - automatic in Test 1)

### Cleanup After Tests
```bash
# Restore original .env
cp .env.backup .env

# Regenerate safeStorage key (if needed)
pnpm electron:dev  # Will auto-migrate from .env
```

---

## Expected Results Summary

| Test | Scenario | Should Start? | Dialog Shown? |
|------|----------|---------------|---------------|
| 1 | Normal startup | ✅ Yes | No |
| 2 | .env migration | ✅ Yes | ⚠️ Warning (remove .env key) |
| 3 | Missing key | ❌ No | ❌ Error (generate key) |
| 4 | Invalid length | ❌ No | ❌ Error (regenerate key) |
| 5 | Corrupted file | ❌ No | ❌ Error (regenerate key) |
| 6 | Round-trip | ✅ Yes | No (included in Test 1) |

---

## Success Criteria

✅ **All tests must:**
1. Show correct error dialog for failure scenarios
2. Provide actionable recovery instructions
3. Prevent app boot on critical failures
4. Log detailed information to console
5. Not expose sensitive key material in dialogs

✅ **Error dialogs must:**
1. Be user-friendly (no technical jargon)
2. Explain what went wrong
3. Provide step-by-step fix instructions
4. Not require looking at logs for basic recovery
