# E2E Test Environment better-sqlite3 Compatibility Fix

## Problem Statement

**Issue**: Playwright E2E tests fail with reverse better-sqlite3 version mismatch
```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version using
NODE_MODULE_VERSION 139. This version of Node.js requires NODE_MODULE_VERSION 127.
```

**Root Cause**:
- **Electron** (development environment) uses Node.js v22 → MODULE_VERSION 139
- **Playwright** (test environment) uses Node.js v20 → MODULE_VERSION 127
- better-sqlite3 native module must match exact Node.js version
- After fixing Electron compatibility (PR #11), tests broke with reverse mismatch

**Impact**:
- E2E tests cannot run without manual intervention
- Developers must remember to rebuild before/after tests
- Risk of breaking Electron by forgetting to rebuild after tests

---

## Solution Architecture

### Dual-Environment Rebuild System

Created automated rebuild system that:
1. **Before E2E tests**: Rebuilds better-sqlite3 for Node v20 (Playwright)
2. **After E2E tests**: Rebuilds better-sqlite3 for Node v22 (Electron)
3. **Prevents errors**: Automatic pre/post hooks ensure correct version

### Implementation Components

#### 1. Rebuild Scripts (2 files)

**`scripts/rebuild-for-node.js`** (21 lines)
- Detects current Node.js version
- Rebuilds better-sqlite3 for that version
- Used by Playwright tests (Node v20)

**`scripts/rebuild-for-electron.js`** (23 lines)
- Rebuilds better-sqlite3 for Electron's Node.js version (v22)
- Restores Electron compatibility after tests

#### 2. npm Script Integration

Updated `package.json` with:
- `rebuild:node` - Manual rebuild for Node.js
- `rebuild:electron` - Manual rebuild for Electron
- `pretest:e2e` - Auto-rebuild before tests
- `posttest:e2e` - Auto-rebuild after tests
- Applied to all E2E test variants (headed, debug, ui)

#### 3. Updated Documentation

**`docs/troubleshooting/BETTER_SQLITE3_REBUILD.md`**
- Added "E2E Test Environment" section
- Explained reverse version mismatch
- Documented automatic rebuild system
- Provided manual rebuild commands
- Added important warnings

---

## Usage

### Recommended (Automatic Rebuilds)

```bash
# Run E2E tests - automatically rebuilds before and after
npm run test:e2e

# Headed mode - automatically rebuilds
npm run test:e2e:headed

# Debug mode - automatically rebuilds
npm run test:e2e:debug

# UI mode - automatically rebuilds
npm run test:e2e:ui
```

**How it works:**
1. `pretest:e2e` runs → rebuilds for Node v20
2. Playwright tests run → tests execute successfully
3. `posttest:e2e` runs → rebuilds for Electron v22

### Manual Rebuilds

```bash
# Rebuild for current Node.js version (for Playwright)
npm run rebuild:node

# Rebuild for Electron
npm run rebuild:electron
```

**When to use manual:**
- Running Playwright tests outside npm scripts
- Debugging E2E test setup
- Switching between Electron and test environments

---

## Verification

### Test Rebuild Scripts

```bash
# Kill all Electron processes first
taskkill //F //IM electron.exe

# Test Node rebuild
npm run rebuild:node
# Output: ✅ better-sqlite3 rebuilt successfully for current Node.js version

# Test Electron rebuild
npm run rebuild:electron
# Output: ✅ better-sqlite3 rebuilt successfully for Electron
```

### Verify E2E Tests Work

```bash
# Run single E2E test (with auto-rebuild)
npm run test:e2e -- tests/e2e/specs/ai-chat.e2e.test.ts

# Check that Electron still works after tests
npm run electron:dev
# Should start without better-sqlite3 errors
```

---

## Important Warnings

⚠️ **CRITICAL**: Always use `npm run test:e2e` (not `playwright test` directly)
- Direct Playwright commands skip pre/post rebuild hooks
- This will break Electron environment until manual rebuild

⚠️ **After Manual Tests**: If you run Playwright manually, always run:
```bash
npm run rebuild:electron
```

⚠️ **Process Locking**: Rebuild fails if Electron is running
- Kill all Electron processes before rebuilding
- Use: `taskkill //F //IM electron.exe` (Windows)

---

## Technical Details

### Node Module Versioning

| Environment | Node Version | MODULE_VERSION | Status |
|-------------|--------------|----------------|--------|
| Electron 38.x | v22.x | 139 | ✅ Primary |
| Playwright | v20.x | 127 | ✅ Tests |
| npm rebuild | Current | Varies | Detects |

### Files Modified

**New Files** (3):
- `scripts/rebuild-for-node.js` (21 lines)
- `scripts/rebuild-for-electron.js` (23 lines)
- `docs/implementation/E2E_TEST_SQLITE_FIX.md` (this file)

**Modified Files** (2):
- `package.json` - Added 8 new scripts (rebuild:*, pretest:e2e*, posttest:e2e*)
- `docs/troubleshooting/BETTER_SQLITE3_REBUILD.md` - Added E2E section

### Build Process Flow

```
Electron Development (Default):
  npm install → postinstall → electron-rebuild → Node v22 MODULE_VERSION 139

E2E Test Execution:
  npm run test:e2e
    ↓
  pretest:e2e → rebuild:node → Node v20 MODULE_VERSION 127
    ↓
  playwright test → E2E tests run successfully
    ↓
  posttest:e2e → rebuild:electron → Node v22 MODULE_VERSION 139
    ↓
  Electron ready for development again
```

---

## Related Issues

- **PR #11**: Fixed initial Electron better-sqlite3 issue (MODULE_VERSION 127 → 139)
- **Root Cause**: Native modules require exact Node.js version match
- **Electron Rebuild**: https://github.com/electron/rebuild
- **better-sqlite3**: https://github.com/WiseLibs/better-sqlite3

---

## Success Metrics

✅ **Before Fix**:
- E2E tests fail with MODULE_VERSION mismatch
- Manual rebuild required before/after each test run
- High risk of breaking Electron environment
- Developer friction and wasted time

✅ **After Fix**:
- E2E tests run successfully without manual intervention
- Automatic rebuild ensures correct environment
- Zero risk of breaking Electron (posttest rebuild)
- Developer-friendly with clear documentation

---

## Date & Context

- **Date**: 2025-10-09
- **Phase**: Authentication System Implementation - Phase 2
- **Context**: E2E tests needed for auth system validation
- **Resolution Time**: ~30 minutes (design + implementation + testing + docs)
- **Related PR**: #11 (initial better-sqlite3 fix)

---

**Last Updated**: 2025-10-09
**Author**: Claude (Justice Companion Team)
