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

After rebuilding, verify the fix:

1. **Check database connection**:
   ```bash
   npm run db:migrate:status
   ```

2. **Run database tests**:
   ```bash
   npm test -- src/repositories
   ```

3. **Start the application**:
   ```bash
   npm run electron:dev
   ```

4. **Check authentication** - Look for this log message:
   ```
   ✅ Authentication services initialized successfully
   🔐 Local user authentication ready (scrypt password hashing, 24-hour sessions)
   ```

## Technical Details

### Node Module Versions
- **NODE_MODULE_VERSION 127**: Node.js v22.11.0
- **NODE_MODULE_VERSION 128**: Node.js v22.20.0
- **NODE_MODULE_VERSION 139**: Electron v38.x (uses Node.js v22.x)

### Why This Happens
Electron bundles its own version of Node.js, which may differ from the system Node.js version. The `better-sqlite3` package compiles native C++ code that links directly to Node.js internals. These internals change between Node.js versions, requiring the module to be recompiled for each specific version.

### Files Affected
The rebuild process regenerates:
- `node_modules/better-sqlite3/build/Release/better_sqlite3.node`

This is the compiled native binary that interfaces between Node.js and SQLite3.

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

## Related Issues
- Database tests failing with "NODE_MODULE_VERSION" error
- E2E tests timing out or failing to start
- Repository operations returning undefined
- Audit logging not working

## Discovered
This issue was identified during comprehensive testing when:
- All database tests (14/14) were failing
- 83 tests were being skipped due to database unavailability
- Authentication services couldn't initialize properly

The fix was implemented as a `postinstall` script to ensure consistent operation across all development environments.
