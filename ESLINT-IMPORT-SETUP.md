# ESLint Import Extensions Configuration

## Overview

This document explains the ESLint configuration for enforcing `.ts` and `.tsx` extensions on all relative imports in the Justice Companion codebase.

## Why This Matters

TypeScript imports MUST include file extensions (`.ts`/`.tsx`) for:
1. **TSX Compatibility:** The TSX runtime requires explicit extensions
2. **Future-Proofing:** ESM modules require extensions
3. **Consistency:** Prevents mixed import styles across the codebase
4. **Error Prevention:** Catches missing extensions before runtime

## What Was Changed

### 1. Package.json
Added `eslint-plugin-import` to devDependencies:
```json
"eslint-plugin-import": "^2.31.0"
```

### 2. eslint.config.js
Updated ESLint flat config with:

**Import Statement:**
```javascript
import importPlugin from 'eslint-plugin-import';
```

**Plugin Registration:**
```javascript
plugins: {
  'react-hooks': reactHooks,
  'react-refresh': reactRefresh,
  'import': importPlugin,
},
```

**Rule Configuration:**
```javascript
'import/extensions': [
  'error',
  'ignorePackages',
  {
    ts: 'always',   // Require .ts for TypeScript files
    tsx: 'always',  // Require .tsx for React TypeScript files
    js: 'never',    // No .js extension for JavaScript imports
    jsx: 'never',
  },
],
```

## Installation Instructions

### If Installation Failed

Due to locked `electron` module, follow these steps:

#### Option 1: Using PowerShell Script (Recommended)
```powershell
.\install-eslint-plugin.ps1
```

This script will:
1. Stop all Node.js and Electron processes
2. Wait for processes to terminate
3. Run `pnpm install`

#### Option 2: Manual Installation
```bash
# 1. Close all running Node.js and Electron processes
# 2. Run installation
pnpm install

# If still fails, try:
pnpm install --force

# Or delete node_modules and reinstall:
rm -rf node_modules
pnpm install
```

### Verify Installation
```bash
# Check if plugin is installed
ls node_modules/eslint-plugin-import

# Should show plugin directory
```

## Testing the Configuration

### Step 1: Create Test File

A test file has been created at `src/test-eslint-imports.ts`:

```typescript
// ❌ Should error - missing .ts extension
import { UserRepository } from '../repositories/UserRepository';

// ✅ Should pass - correct .ts extension
import { AuditLogger } from '../services/AuditLogger.ts';

// ✅ Should pass - npm package (no extension)
import { z } from 'zod';
```

### Step 2: Run ESLint on Test File

```bash
pnpm lint src/test-eslint-imports.ts
```

**Expected Output:**
```
F:\Justice Companion take 2\src\test-eslint-imports.ts
  5:29  error  Missing file extension "ts" for "../repositories/UserRepository"  import/extensions
```

### Step 3: Test Auto-Fix

```bash
pnpm lint:fix src/test-eslint-imports.ts
```

**Expected Result:**
The missing `.ts` extension should be automatically added:
```typescript
import { UserRepository } from '../repositories/UserRepository.ts';
```

### Step 4: Verify Full Codebase

```bash
pnpm lint
```

**Expected Result:**
All files should pass because commit `1bef370` already fixed all import extensions.

### Step 5: Clean Up

```bash
rm src/test-eslint-imports.ts
```

## Rule Behavior

### ✅ Valid Imports

```typescript
// Relative imports with .ts extension
import { UserRepository } from '../repositories/UserRepository.ts';
import { Case } from '../../models/Case.ts';

// Relative imports with .tsx extension
import { Button } from '../components/ui/Button.tsx';
import { CaseList } from '../features/cases/CaseList.tsx';

// npm packages without extension
import { z } from 'zod';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
```

### ❌ Invalid Imports

```typescript
// Missing .ts extension
import { UserRepository } from '../repositories/UserRepository';

// Missing .tsx extension
import { Button } from '../components/ui/Button';

// Incorrect .js extension
import { UserRepository } from '../repositories/UserRepository.js';
```

## Auto-Fix Support

The `import/extensions` rule supports ESLint's `--fix` flag:

```bash
# Fix single file
pnpm lint:fix src/path/to/file.ts

# Fix all files
pnpm lint:fix
```

The auto-fix will:
- Add missing `.ts` extensions to TypeScript files
- Add missing `.tsx` extensions to React TypeScript files
- Leave npm package imports unchanged

## Integration with CI/CD

The GitHub Actions CI workflow already runs `pnpm lint` on every push and PR.

With this configuration, the CI will:
1. Fail if any import is missing a `.ts` or `.tsx` extension
2. Prevent merge until all imports are fixed
3. Enforce consistency across all branches

## Troubleshooting

### "Cannot find module 'eslint-plugin-import'"

**Cause:** Plugin not installed
**Fix:**
```bash
pnpm install
```

### "Resource busy or locked"

**Cause:** Node.js or Electron process locking files
**Fix:**
```bash
# Windows PowerShell
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force

# Then retry
pnpm install
```

### ESLint Not Detecting Errors

**Cause:** ESLint cache
**Fix:**
```bash
# Clear ESLint cache
rm -rf node_modules/.cache/eslint

# Run lint again
pnpm lint
```

### False Positives

**Cause:** ESLint may flag some edge cases
**Fix:** Add file-specific overrides in `eslint.config.js`:
```javascript
{
  files: ['path/to/specific/file.ts'],
  rules: {
    'import/extensions': 'off',
  },
},
```

## Related Documentation

- **F:\Justice Companion take 2\docs\ESLINT-IMPORT-ENFORCEMENT.md** - Detailed rule explanation
- **F:\Justice Companion take 2\TSX-IMPORT-COMPREHENSIVE-ACTION-PLAN.md** - Overall TSX migration plan
- **Commit 1bef370** - Bulk fix of 74+ files with missing extensions

## References

- [eslint-plugin-import Documentation](https://github.com/import-js/eslint-plugin-import)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

## Status

- ✅ `package.json` updated with dependency
- ✅ `eslint.config.js` updated with rules
- ✅ Test file created (`src/test-eslint-imports.ts`)
- ⏳ **Pending:** Install `eslint-plugin-import` via `pnpm install`
- ⏳ **Pending:** Test ESLint configuration
- ⏳ **Pending:** Verify full codebase compliance
- ⏳ **Pending:** Delete test file

## Next Steps

1. **Install the plugin:**
   ```bash
   pnpm install
   # OR
   .\install-eslint-plugin.ps1
   ```

2. **Test the configuration:**
   ```bash
   pnpm lint src/test-eslint-imports.ts
   ```

3. **Verify full codebase:**
   ```bash
   pnpm lint
   ```

4. **Clean up:**
   ```bash
   rm src/test-eslint-imports.ts
   rm install-eslint-plugin.ps1
   ```

## Conclusion

Once installed and tested, this ESLint configuration will automatically catch and fix missing `.ts` and `.tsx` extensions on all relative imports, preventing future TSX compatibility issues.
