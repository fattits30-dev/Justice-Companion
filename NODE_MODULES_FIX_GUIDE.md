# Node Modules Fix Guide

## Overview

This guide explains how to fix locked `node_modules` issues in Justice Companion.

## Why This Happens

### Common Causes

1. **Running Node.js processes**: Active Electron or dev server processes lock files
2. **VS Code file watching**: TypeScript/ESLint servers may lock files
3. **Antivirus software**: Real-time scanning can lock files
4. **Windows file system**: NTFS doesn't release file handles immediately
5. **Corrupted cache**: pnpm store corruption from interrupted installations

### Symptoms

- `pnpm install` fails with "EBUSY" or "EPERM" errors
- Cannot delete `node_modules` directory
- "Module not found" errors despite files existing
- Electron fails to start with "NODE_MODULE_VERSION" errors

## Fix Options

### Option 1: Safe Fix (Recommended First)

**File:** `safe-fix-node-modules.ps1`

**What it does:**
1. Tries `pnpm install` first
2. Kills Node.js processes and retries
3. Clears pnpm cache and retries
4. Deletes lockfile and retries
5. Offers to escalate to nuclear option

**How to run:**
```powershell
./safe-fix-node-modules.ps1
```

### Option 2: Nuclear Fix

**File:** `nuclear-fix-node-modules.ps1` or `nuclear-fix-node-modules.bat`

**What it does:**
1. Kills ALL Node.js and Electron processes
2. Deletes entire `node_modules` directory
3. Deletes `pnpm-lock.yaml`
4. Clears pnpm cache
5. Runs fresh `pnpm install`

**How to run:**
```powershell
./nuclear-fix-node-modules.ps1
```

### Option 3: Verification

**File:** `verify-installation.ps1`

**What it does:**
- Checks Node.js version (must be 20.x LTS)
- Verifies 12 critical packages exist
- Validates `node_modules` structure

**How to run:**
```powershell
./verify-installation.ps1
```

## Step-by-Step Troubleshooting

### 1. Quick Fix (90% of cases)

```powershell
# Close VS Code
./safe-fix-node-modules.ps1
./verify-installation.ps1
```

### 2. Moderate Fix (9% of cases)

```powershell
# Close ALL applications
./nuclear-fix-node-modules.ps1
./verify-installation.ps1
```

### 3. Advanced Fix (1% of cases)

```powershell
# Check Node.js version
node --version  # Should be v20.18.0

# Switch to Node 20
nvm use 20

# Manual cleanup
taskkill /F /IM node.exe /T
taskkill /F /IM electron.exe /T
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm store prune

# Reinstall
pnpm install
./verify-installation.ps1
```

## Common Error Messages

### "EBUSY: resource busy or locked"
**Cause:** File locked by another process
**Fix:** Close VS Code, run `safe-fix-node-modules.ps1`

### "EPERM: operation not permitted"
**Cause:** Insufficient permissions
**Fix:** Run PowerShell as Administrator, use `nuclear-fix-node-modules.ps1`

### "Cannot find module 'better-sqlite3'"
**Cause:** Native module not rebuilt
**Fix:** Run `pnpm rebuild:electron`

### "NODE_MODULE_VERSION mismatch"
**Cause:** Wrong Node.js version
**Fix:** Run `nvm use 20`, then `pnpm install`

## Prevention Tips

1. **Close VS Code** before running installs
2. **Stop dev servers** with Ctrl+C
3. **Check Node version** - Run `node --version` to confirm v20.x
4. **Use pnpm only** - Never mix npm/yarn with pnpm

## Technical Details

### Why pnpm?

1. Better native module handling (better-sqlite3)
2. Faster installs
3. Disk space efficiency
4. Strict dependency resolution

### Why Node 20.x LTS?

1. Electron 38.2.1 compatibility
2. Native module ABI compatibility
3. Production stability
4. Team consistency

### File Locks on Windows

Windows NTFS file handle delays:
- Process termination: ~2 seconds
- VS Code shutdown: ~5 seconds
- Antivirus scan: ~10 seconds

## FAQ

### Q: Why does the nuclear script ask for confirmation?
**A:** It kills ALL Node.js processes. Prevents accidental data loss.

### Q: What if I accidentally deleted my code?
**A:** Scripts only delete `node_modules` and `pnpm-lock.yaml`. Source code is safe.

### Q: How long does nuclear option take?
**A:** ~12-17 minutes total (deletion + installation)

### Q: What if verification fails?
**A:** Check Node.js version and clear pnpm store:

```powershell
node --version  # Should be v20.18.0
pnpm store prune
pnpm install
```

## Support

If all fixes fail:

1. Search GitHub issues
2. Create issue with error output
3. Include: OS, Node.js, pnpm versions

## References

- [pnpm Documentation](https://pnpm.io/)
- [Electron Documentation](https://electronjs.org/)
- [Justice Companion CLAUDE.md](./CLAUDE.md)
