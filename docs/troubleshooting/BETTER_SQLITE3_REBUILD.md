# Better-SQLite3 Rebuild Fix

## Issue
When running the Justice Companion application, you may encounter the following error:

```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 139.
Please try re-compiling or re-installing the module.
```

This error occurs because the `better-sqlite3` native module needs to be rebuilt for your specific Electron/Node.js version.

## Symptoms
- ⚠️ Authentication services fail to initialize
- ⚠️ Database operations fail silently
- ❌ App appears to load but core features don't work
- Error log shows: `Authentication initialization failed - auth features will not work!`

## Root Cause
The `better-sqlite3` package includes a native Node.js module (`.node` binary) that must be compiled for the specific Node.js version your Electron uses. When you:
- Switch Electron versions
- Install dependencies on a different machine
- Update Node.js versions

The pre-compiled binary may not match your runtime environment.

## Solution

### Quick Fix
Run the electron-rebuild command:

```bash
npx electron-rebuild -f -w better-sqlite3
```

This rebuilds only the `better-sqlite3` module for your current Electron version.

### After Installing Dependencies
Always run after `npm install` on a new machine:

```bash
npm install
npx electron-rebuild -f -w better-sqlite3
```

### Automated Solution (Recommended)
Add a postinstall script to `package.json`:

```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3"
  }
}
```

This automatically rebuilds `better-sqlite3` after every `npm install`.

## Verification
After rebuilding, check the logs for successful initialization:

```bash
# Start the app
npm run electron:dev

# Check logs (should show these messages):
# ✅ Database initialized and migrations complete
# ✅ Authentication services initialized successfully
# 🔐 Local user authentication ready
```

Or check `logs/errors.log`:

```bash
tail -50 logs/errors.log | grep "Authentication"
# Should show: ✅ Authentication services initialized successfully
```

## Technical Details

### Node Module Versions
- **MODULE_VERSION 127**: Node.js v20.x
- **MODULE_VERSION 139**: Node.js v22.x (Electron 38.x)

Electron 38.x (used by Justice Companion) uses Node.js v22, which requires MODULE_VERSION 139.

### Why This Happens
1. `npm install` downloads pre-built binaries from npm registry
2. Pre-built binaries are compiled for specific Node.js versions
3. If the binary version doesn't match your runtime, it fails to load
4. Native modules must be rebuilt using `electron-rebuild`

### Files Affected
- `node_modules/better-sqlite3/build/Release/better_sqlite3.node` (native binary)

### Build Dependencies
Ensure you have build tools installed:

**Windows**:
```bash
npm install --global windows-build-tools
```

**macOS**:
```bash
xcode-select --install
```

**Linux**:
```bash
sudo apt-get install build-essential python3
```

## E2E Test Environment (Playwright)

### Issue
When running E2E tests with Playwright, you may encounter the **reverse** version mismatch:

```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version using
NODE_MODULE_VERSION 139. This version of Node.js requires NODE_MODULE_VERSION 127.
```

This is because:
- **Electron** uses Node v22 (MODULE_VERSION 139)
- **Playwright** uses Node v20 (MODULE_VERSION 127)

### Solution
The E2E test scripts automatically handle this:

```bash
# These scripts automatically rebuild for Node v20 before tests,
# then rebuild for Electron after tests:
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:ui
```

**How it works:**
1. `pretest:e2e` runs `scripts/rebuild-for-node.js` → rebuilds for current Node.js (v20 for Playwright)
2. `test:e2e` runs Playwright tests
3. `posttest:e2e` runs `scripts/rebuild-for-electron.js` → rebuilds for Electron (v22)

**Manual rebuild commands:**
```bash
# Rebuild for current Node.js version (for Playwright/manual testing)
npm run rebuild:node

# Rebuild for Electron
npm run rebuild:electron
```

### Important Notes
- ⚠️ **Always** run `npm run rebuild:electron` after manual Playwright tests
- ⚠️ Running E2E tests will **temporarily break** Electron until posttest rebuild completes
- ✅ Use `npm run test:e2e` (not `playwright test` directly) to ensure automatic rebuilds

## Related Issues
- [Electron Rebuild Documentation](https://github.com/electron/rebuild)
- [Better-SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3)

## Discovered
- **Date**: 2025-10-09
- **Context**: Auth system initialization failing due to database connection errors
- **Resolution Time**: ~15 minutes diagnosis + 30 seconds rebuild
- **E2E Test Fix**: 2025-10-09 (added dual-environment rebuild scripts)

---

**Last Updated**: 2025-10-09
**Maintainer**: Justice Companion Team
