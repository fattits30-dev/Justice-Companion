# E2E Test Setup & Troubleshooting Guide

## Overview

This guide helps you resolve issues when running E2E tests, particularly the `better-sqlite3` binary file lock issue on Windows.

---

## The Problem: better-sqlite3 Binary Lock

### What's Happening?

The `better-sqlite3` native module must be compiled for different Node.js versions:
- **Electron** uses Node.js v22 (module version 139)
- **Playwright E2E tests** use Node.js v22 (module version 127)

When you run E2E tests, the `pretest:e2e` hook automatically rebuilds the binary for Node.js. However, on Windows, if any process is using the binary file, you'll see:

```
EBUSY: resource busy or locked, open '...\better_sqlite3.node'
```

### Common Causes

1. **Electron app running** - The dev server (`pnpm dev`) is still running
2. **VS Code terminal** - VS Code's integrated terminal may have loaded the module
3. **Zombie processes** - Previous test runs didn't clean up properly
4. **File system cache** - Windows file system is caching the binary

---

## Solution 1: Clean Process Cleanup (Recommended)

### Step 1: Run the Cleanup Script

```powershell
pnpm run test:e2e:cleanup
```

This will:
- Find all Electron processes
- Find all Node.js test processes
- Prompt you to kill them safely

### Step 2: Close VS Code Terminal

If the cleanup script doesn't resolve it:
1. Close all VS Code terminal windows
2. Close VS Code entirely
3. Reopen VS Code
4. Open a new terminal

### Step 3: Run Tests

```powershell
pnpm test:e2e -- tests/e2e/specs/authentication.e2e.test.ts
```

---

## Solution 2: Manual Process Termination

### Check for Running Processes

```powershell
# Find Electron processes
Get-Process -Name "electron" -ErrorAction SilentlyContinue

# Find Node.js processes
Get-Process -Name "node" -ErrorAction SilentlyContinue
```

### Kill Processes

```powershell
# Kill all Electron processes
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill all Node.js processes (CAREFUL - this kills ALL node processes)
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Verify and Run Tests

```powershell
# Verify no processes are running
Get-Process -Name "electron","node" -ErrorAction SilentlyContinue

# Run tests
pnpm test:e2e -- tests/e2e/specs/authentication.e2e.test.ts
```

---

## Solution 3: Skip Pretest Hook (Quick Workaround)

If the binary is already built for Node.js, you can skip the rebuild:

```powershell
# Run Playwright directly (skips pretest:e2e hook)
npx playwright test tests/e2e/specs/authentication.e2e.test.ts
```

**Note**: This only works if the binary was previously built for Node.js. If you get a module version mismatch error, you must rebuild.

---

## Solution 4: Restart Computer (Nuclear Option)

If all else fails:
1. Save all your work
2. Restart your computer
3. Open VS Code
4. Run tests immediately:
   ```powershell
   pnpm test:e2e -- tests/e2e/specs/authentication.e2e.test.ts
   ```

---

## Verifying the Fix

After running the authentication E2E tests, you should see:

```
✓ tests/e2e/specs/authentication.e2e.test.ts (9 tests)
  ✓ Authentication Flow (9)
    ✓ should complete full registration flow
    ✓ should login existing user
    ✓ should reject invalid credentials
    ✓ should maintain session after page refresh
    ✓ should logout user and return to login screen
    ✓ should enforce password requirements
    ✓ should redirect to login after session expires
    ✓ should show consent banner on first login
    ✓ should not show consent banner after consent granted

Test Files  1 passed (1)
     Tests  9 passed (9)
```

---

## Understanding the Test Fixes

### What Was Fixed

1. **Password Hashing Format** (Critical Fix)
   - **Before**: Tests used `Buffer.concat([salt, hash]).toString('base64')`
   - **After**: Tests use `hash.toString('hex')` and `salt.toString('hex')` separately
   - **Why**: AuthenticationService stores hash and salt as separate hex strings

2. **UI Text Consistency**
   - **Before**: Tests looked for "Sign In" button
   - **After**: LoginScreen now has "Sign In" heading and "Login" button
   - **Why**: Tests expect specific text for element selection

3. **Accessibility Improvements**
   - Added ARIA labels to all form inputs
   - Added loading states with spinners
   - Added screen reader support
   - Added keyboard navigation support

---

## Preventing Future Issues

### Best Practices

1. **Always close Electron before running E2E tests**
   ```powershell
   # Stop dev server if running
   Ctrl+C in the terminal running `pnpm dev`
   ```

2. **Use the cleanup script regularly**
   ```powershell
   pnpm run test:e2e:cleanup
   ```

3. **Run tests in a fresh terminal**
   - Close all terminals
   - Open a new terminal
   - Run tests immediately

4. **Don't run dev and tests simultaneously**
   - Stop `pnpm dev` before running E2E tests
   - The binary can only be built for one runtime at a time

---

## Advanced: Check Binary Version

To see which Node.js version the binary is built for:

```powershell
# Check the binary file timestamp
Get-Item "node_modules\.pnpm\better-sqlite3@12.4.1\node_modules\better-sqlite3\build\Release\better_sqlite3.node" | Select-Object LastWriteTime

# If it was modified recently, it's likely built for the last runtime you used
```

---

## Need More Help?

### Check Logs

The full npm log is saved at:
```
C:\Users\sava6\AppData\Local\npm-cache\_logs\
```

Look for the most recent `*-debug-0.log` file.

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EBUSY: resource busy or locked` | Binary file is locked | Run cleanup script |
| `NODE_MODULE_VERSION mismatch` | Binary built for wrong runtime | Rebuild with `pnpm rebuild:node` |
| `Cannot find module 'better-sqlite3'` | Module not installed | Run `pnpm install` |
| `gyp ERR! clean error` | Build artifacts locked | Delete `node_modules` and reinstall |

---

## Summary of Authentication Test Changes

### Files Modified

1. **tests/e2e/specs/authentication.e2e.test.ts**
   - Fixed password hashing to use hex encoding (lines 266-267, 329-330, 500-501)
   - Updated button selector from "Sign In" to "Login" (lines 178, 233, 293, 356, 541)

2. **src/components/auth/LoginScreen.tsx**
   - Added "Sign In" heading (line 72)
   - Added accessibility labels (ARIA attributes)
   - Added loading spinner animation
   - Improved focus states and keyboard navigation

3. **src/components/auth/RegistrationScreen.tsx**
   - Added accessibility labels (ARIA attributes)
   - Added password strength indicator with ARIA live region
   - Added loading spinner animation
   - Improved form validation feedback

### Expected Test Results

All 9 authentication tests should now pass:
- ✅ Registration flow with GDPR consent
- ✅ Login with valid credentials
- ✅ Rejection of invalid credentials
- ✅ Session persistence across page refresh
- ✅ Logout functionality
- ✅ Password requirement enforcement
- ✅ Session expiration handling
- ✅ Consent banner display logic
- ✅ Consent persistence

---

**Last Updated**: 2025-10-11  
**Tested On**: Windows 11, Node.js v22.20.0, Electron v38.2.1

