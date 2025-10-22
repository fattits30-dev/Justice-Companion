# Critical Blocker Fix Guide

**Issue:** Missing `pnpm-lock.yaml` causing dependency resolution failures
**Severity:** 🔴 CRITICAL - BLOCKS DEPLOYMENT
**Status:** REQUIRES IMMEDIATE ACTION

---

## Problem Summary

The `pnpm-lock.yaml` file was deleted from the repository, causing:
- ❌ ESLint cannot find `@eslint/js` package
- ❌ TypeScript cannot find type definitions
- ❌ Build system cannot execute
- ❌ Tests cannot run
- ❌ Deployment is blocked

---

## Quick Fix (15 minutes)

### Option 1: Restore from Git History (RECOMMENDED)

**Step 1:** Check git history for the file
```bash
git log --all --full-history -- pnpm-lock.yaml
```

**Step 2:** Restore from the last commit that had it
```bash
# Find the commit SHA from step 1, then:
git checkout <commit-sha> -- pnpm-lock.yaml

# Example:
git checkout 8cb7f6e -- pnpm-lock.yaml
```

**Step 3:** Verify the file is restored
```bash
git status
# Should show:
# M pnpm-lock.yaml (restored)
```

**Step 4:** Reinstall dependencies
```bash
pnpm install
```

**Step 5:** Verify everything works
```bash
pnpm lint
pnpm type-check
pnpm test --run
```

**Step 6:** Commit the restored file
```bash
git add pnpm-lock.yaml
git commit -m "fix: restore pnpm-lock.yaml for dependency consistency"
```

---

### Option 2: Regenerate Lock File (If Option 1 Fails)

**Warning:** This will update all dependencies to latest versions within semver ranges.

**Step 1:** Delete corrupted node_modules
```bash
rm -rf node_modules
```

**Step 2:** Regenerate lock file
```bash
pnpm install
```

**Step 3:** Verify critical dependencies
```bash
# Check that better-sqlite3 is installed
ls node_modules/better-sqlite3/build/Release/

# Check that ESLint dependencies are installed
ls node_modules/@eslint/js/

# Check TypeScript types
ls node_modules/@types/node/
ls node_modules/@types/vite/
```

**Step 4:** Rebuild better-sqlite3 for Electron
```bash
pnpm rebuild:electron
```

**Step 5:** Run verification suite
```bash
# Lint
pnpm lint

# Type check
pnpm type-check

# Tests (rebuild for Node first)
pnpm rebuild:node
pnpm test --run

# Build
pnpm build
```

**Step 6:** Commit new lock file
```bash
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm-lock.yaml with updated dependencies"
```

---

## Verification Checklist

After restoring `pnpm-lock.yaml`, verify all systems are operational:

### 1. Dependencies Installed ✓
```bash
# Should show no errors
pnpm install
```

### 2. Linting Works ✓
```bash
# Should complete without module errors
pnpm lint
```

Expected output:
```
✓ ESLint runs successfully
⚠ May show 320 warnings in legacy code (acceptable)
❌ Should NOT show "Cannot find package" errors
```

### 3. Type Checking Works ✓
```bash
# Should complete without "Cannot find type definition" errors
pnpm type-check
```

Expected output:
```
✓ TypeScript compiles successfully
❌ Should NOT show "Cannot find type definition file" errors
```

### 4. Tests Run ✓
```bash
# Rebuild for Node runtime first
pnpm rebuild:node

# Run tests
pnpm test --run
```

Expected output:
```
✓ 1152/1156 tests passing (99.7%)
✓ 4 known failures on Node 22.x (use Node 20.x)
```

### 5. Build Works ✓
```bash
# Build application
pnpm build
```

Expected output:
```
✓ Vite build completes
✓ dist/ directory created
✓ No module resolution errors
```

### 6. Electron Build Works ✓
```bash
# Rebuild for Electron runtime
pnpm rebuild:electron

# Build Electron
pnpm build:preload
```

Expected output:
```
✓ Preload script compiles
✓ dist-electron/ directory created
```

---

## Common Errors & Solutions

### Error: "Cannot find package '@eslint/js'"

**Cause:** ESLint dependencies not installed

**Solution:**
```bash
pnpm add -D @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

---

### Error: "Cannot find type definition file for 'node'"

**Cause:** TypeScript type definitions not installed

**Solution:**
```bash
pnpm add -D @types/node @types/vite
```

---

### Error: "NODE_MODULE_VERSION mismatch"

**Cause:** better-sqlite3 compiled for wrong runtime

**Solution:**
```bash
# For Electron development
pnpm rebuild:electron

# For Node tests
pnpm rebuild:node
```

---

### Error: "Package subpath './package.json' is not defined"

**Cause:** ESM resolution issue with TypeScript

**Solution:**
1. Verify all imports have `.ts` extensions
2. Check `tsconfig.json` has proper module resolution:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

---

## Post-Fix Actions

### 1. Run Full Verification
```bash
# Execute pre-deployment test script
./pre-deployment-test.ps1
```

### 2. Update Documentation
```bash
# Add note to CLAUDE.md about lock file importance
# Document the fix in CHANGELOG.md
```

### 3. Prevent Future Issues

**Add to `.gitignore` (ensure these are NOT ignored):**
```gitignore
# DO NOT ignore these files:
# pnpm-lock.yaml
# package.json
# package-lock.json (if using npm)
# yarn.lock (if using yarn)
```

**Add to pre-commit hook:**
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check that lock file exists
if [ ! -f "pnpm-lock.yaml" ]; then
    echo "ERROR: pnpm-lock.yaml is missing!"
    echo "Run 'pnpm install' to generate it."
    exit 1
fi

pnpm lint-staged
```

---

## Estimated Time to Complete

| Step | Time |
|------|------|
| Restore pnpm-lock.yaml | 2-5 min |
| pnpm install | 3-5 min |
| pnpm rebuild:electron | 2-3 min |
| Verification (lint, type-check) | 2-3 min |
| Run tests | 5-10 min |
| Run build | 3-5 min |
| **Total** | **15-30 min** |

---

## Success Criteria

✅ All of these must pass:

1. `pnpm install` completes without errors
2. `pnpm lint` runs without "Cannot find package" errors
3. `pnpm type-check` completes without "Cannot find type definition" errors
4. `pnpm test --run` shows 99.7%+ pass rate (1152/1156)
5. `pnpm build` completes and creates `dist/` directory
6. `pnpm build:preload` completes and creates `dist-electron/preload.js`
7. Git working tree shows `pnpm-lock.yaml` as committed

---

## Next Steps After Fix

1. ✅ Commit restored `pnpm-lock.yaml`
2. ✅ Run full pre-deployment test suite
3. ✅ Commit all other changes
4. ✅ Clean up working tree
5. ✅ Proceed with deployment checklist

---

## Emergency Contact

If this fix doesn't work:

1. **Check Node version:**
   ```bash
   node --version
   # Must be 20.18.0 or 20.x (NOT 22.x)
   ```

2. **Nuclear option (last resort):**
   ```bash
   # Delete everything and start fresh
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **Document any issues:**
   - Screenshot errors
   - Save error logs
   - Note exact steps taken

---

**Created:** 2025-10-20
**Priority:** 🔴 CRITICAL
**Status:** AWAITING EXECUTION
