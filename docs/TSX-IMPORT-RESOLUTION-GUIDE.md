# TSX Import Resolution Guide

**Last Updated:** 2025-10-20
**Issue Fixed:** Missing `.ts` extensions on relative imports causing TSX transpiler failures
**Files Affected:** 74+ TypeScript files across repositories, services, middleware, and models
**Commits:** `fd92ce0` (initial fix), `1bef370` (comprehensive cleanup)

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [Technical Root Cause](#technical-root-cause)
4. [The Solution](#the-solution)
5. [Git Diff Examples](#git-diff-examples)
6. [Developer Guidelines](#developer-guidelines)
7. [Troubleshooting](#troubleshooting)
8. [Prevention Strategies](#prevention-strategies)
9. [Automated Fix Script](#automated-fix-script)

---

## Overview

This document explains the TSX import resolution issue that affected the Justice Companion codebase and provides comprehensive guidance to prevent similar issues in the future.

**Problem Summary:**
- **Issue:** TSX transpiler failed to resolve relative imports without explicit `.ts` extensions
- **Error Pattern:** `Cannot find module 'F:\...\src\db\database' imported from UserRepository.ts`
- **Impact:** 74+ files with incorrect import statements
- **Solution:** Added `.ts` extensions to all relative imports

**TSX Context:**
Justice Companion uses `tsx` for development (`electron:dev` script) which runs TypeScript files directly without compilation. TSX operates in "strip-only" mode, meaning it removes TypeScript syntax but doesn't perform module bundling like Vite or webpack.

---

## The Problem

### Initial Error Symptoms

When running `pnpm electron:dev`, the application failed with errors like:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'F:\Justice Companion take 2\src\db\database'
imported from F:\Justice Companion take 2\src\repositories\UserRepository.ts

Did you mean to import "../db/database.js"?
```

### Misleading Error Message

The error suggested using `.js` extensions, but **this was incorrect**. The actual issue was:

1. **Missing Extensions:** Import statements like `from '../db/database'` (no extension)
2. **TSX Requirement:** TSX requires explicit file extensions for ESM module resolution
3. **Wrong Guidance:** The error suggested `.js` when the correct extension was `.ts`

### Affected Files (74+ Total)

**Repositories (27 files):**
- `UserRepository.ts`, `CaseRepository.ts`, `SessionRepository.ts`
- `EvidenceRepository.ts`, `ChatConversationRepository.ts`
- All cached repositories (`CachedCaseRepository.ts`, etc.)
- `CaseRepositoryPaginated.ts`

**Services (10+ files):**
- `AuthenticationService.ts`, `EncryptionService.ts`
- `CacheService.ts`, `RAGService.ts`
- `ChatConversationService.ts`, `UserProfileService.ts`
- GDPR services (`GdprService.ts`, `DataExporter.ts`, `DataDeleter.ts`)

**Middleware (7 files):**
- `AuthorizationMiddleware.ts`, `ValidationMiddleware.ts`
- Schema files (`case-schemas.ts`, `ai-schemas.ts`, etc.)

**Models, Utils, Types:**
- All model files in `src/models/`
- Test helpers in `src/test-utils/`
- Type definitions in `src/types/`

---

## Technical Root Cause

### ESM Module Resolution in TSX

**ESM (ECMAScript Modules) Specification:**
- When using `type: "module"` or ESM syntax, Node.js requires **explicit file extensions** for relative imports
- This is different from CommonJS which allows extensionless imports
- TSX follows strict ESM rules when transpiling TypeScript

**TSX Strip-Only Mode:**
- TSX **only removes TypeScript syntax** (types, interfaces, decorators)
- It does **NOT bundle or resolve modules** like Vite/webpack
- Import paths are passed through as-is to Node.js
- Therefore, Node.js ESM rules apply directly

### TypeScript vs TSX Behavior

**TypeScript Compiler (`tsc`):**
```typescript
// TypeScript allows this (moduleResolution: "bundler")
import { getDb } from '../db/database';  // ✅ TypeScript resolves this
```

**TSX Transpiler:**
```typescript
// TSX requires explicit extensions
import { getDb } from '../db/database';     // ❌ Error: Cannot find module
import { getDb } from '../db/database.ts';  // ✅ TSX resolves this
```

### TypeScript Configuration Impact

Our `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true
  }
}
```

**Key Points:**
- `moduleResolution: "bundler"` tells TypeScript that a bundler will resolve imports
- `allowImportingTsExtensions: true` allows `.ts` extensions in imports
- These settings work for Vite (bundler mode) but TSX needs explicit extensions

---

## The Solution

### Phase 1: Manual Fix (Commit `fd92ce0`)

Initial fix targeted 3 critical files with `.js` extensions:

```diff
- import { logger } from '../utils/logger.js';
+ import { logger } from '../utils/logger.ts';
```

**Files Changed:**
- `src/services/AuthenticationService.ts`
- `src/services/AuditLogger.ts`
- `src/middleware/ValidationMiddleware.ts`

**Why `.ts` not `.js`:**
- TypeScript source files are `.ts`, not `.js`
- TSX transpiles `.ts` files, so imports must reference `.ts`
- At runtime, Node.js sees the transpiled code, but import paths remain `.ts`

### Phase 2: Automated Comprehensive Fix (Commit `1bef370`)

Created automated script `fix-imports-simple.mjs` to add `.ts` extensions to all relative imports.

**Files Fixed:** 74+ TypeScript files across:
- Repositories (27 files)
- Services (10+ files)
- Middleware schemas (7 files)
- Models, types, utils

**Script Behavior:**
- Recursively scans `src/` directory
- Finds all `.ts` files (excluding tests and `.d.ts`)
- Adds `.ts` extension to relative imports without extensions
- Preserves existing `.js`, `.json`, `.css` extensions

---

## Git Diff Examples

### Example 1: CaseRepository.ts

**Before (Missing Extensions):**
```typescript
import { getDb } from '../db/database';
import type { Case, CreateCaseInput } from '../models/Case';
import { EncryptionService } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';
```

**After (With .ts Extensions):**
```typescript
import { getDb } from '../db/database.ts';
import type { Case, CreateCaseInput } from '../models/Case.ts';
import { EncryptionService } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';
```

**Note:** `.js` extensions remain because they were explicitly used (needs separate fix if transitioning fully to `.ts`).

### Example 2: UserRepository.ts

**Before:**
```typescript
import { getDb } from '../db/database';
import type { User, CreateUserInput, UpdateUserInput } from '../models/User';
import type { AuditLogger } from '../services/AuditLogger';
```

**After:**
```typescript
import { getDb } from '../db/database.ts';
import type { User, CreateUserInput, UpdateUserInput } from '../models/User.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
```

### Example 3: GdprService.ts

**Before:**
```typescript
import type Database from 'better-sqlite3';
import type { EncryptionService } from '../EncryptionService';
import type { AuditLogger } from '../AuditLogger';
import { DataExporter } from './DataExporter';
import { DataDeleter } from './DataDeleter';
```

**After:**
```typescript
import type Database from 'better-sqlite3';
import type { EncryptionService } from '../EncryptionService.ts';
import type { AuditLogger } from '../AuditLogger.ts';
import { DataExporter } from './DataExporter.ts';
import { DataDeleter } from './DataDeleter.ts';
```

**Note:** npm packages (`better-sqlite3`) don't need extensions, only relative imports.

---

## Developer Guidelines

### Import Statement Best Practices for TSX

#### ✅ DO: Always Use `.ts` Extensions for Relative Imports

```typescript
// Correct - explicit .ts extension
import { UserRepository } from '../repositories/UserRepository.ts';
import type { User } from '../models/User.ts';
import { getDb } from '../db/database.ts';
```

#### ❌ DON'T: Omit Extensions on Relative Imports

```typescript
// Incorrect - missing extension (TSX error)
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../models/User';
import { getDb } from '../db/database';
```

#### 🟡 EXCEPTION: npm Package Imports

```typescript
// No extension needed for node_modules
import { z } from 'zod';                    // ✅ npm package
import Database from 'better-sqlite3';      // ✅ npm package
import { app, safeStorage } from 'electron'; // ✅ npm package
```

#### 🟡 EXCEPTION: JSON, CSS, and Asset Imports

```typescript
// Use appropriate extensions for non-TS files
import config from './config.json';         // ✅ .json extension
import styles from './styles.css';          // ✅ .css extension
import logo from './logo.png';              // ✅ .png extension (if supported)
```

### When to Use `.ts` vs `.js` Extensions

**In Source Code (`.ts` files):**

| Import Target | Extension to Use | Example |
|---------------|------------------|---------|
| TypeScript source file | `.ts` | `import { foo } from './bar.ts'` |
| JavaScript source file | `.js` | `import { foo } from './legacy.js'` |
| Type definitions only | `.ts` | `import type { Foo } from './types.ts'` |
| npm packages | None | `import { z } from 'zod'` |
| JSON files | `.json` | `import data from './data.json'` |

**Why Not `.js` for TypeScript Files?**

When writing TypeScript source code, you import from `.ts` files, not `.js` files:

```typescript
// ❌ Wrong - UserRepository.ts exists, not UserRepository.js
import { UserRepository } from './UserRepository.js';

// ✅ Correct - Import from the actual source file
import { UserRepository } from './UserRepository.ts';
```

At runtime, TSX transpiles the TypeScript but keeps the import paths as-is. Node.js's ESM loader then resolves `.ts` imports correctly.

### Migrating from `.js` to `.ts` Extensions

If your codebase has mixed `.js` extensions on TypeScript imports:

**1. Identify Files with `.js` Extensions:**
```bash
grep -r "from.*\.js'" src/
```

**2. Replace `.js` with `.ts`:**
```bash
# Use the provided fix script (see Automated Fix Script section)
node fix-imports-simple.mjs
```

**3. Verify No Errors:**
```bash
pnpm electron:dev
```

---

## Troubleshooting

### Issue: "Cannot find module" Errors

**Symptom:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'F:\...\src\db\database'
```

**Diagnosis:**
1. Check if the import statement has an extension:
   ```typescript
   // ❌ Missing extension
   import { getDb } from '../db/database';
   ```

2. Verify the target file exists:
   ```bash
   ls src/db/database.ts  # Should exist
   ```

**Solution:**
Add `.ts` extension:
```typescript
// ✅ With extension
import { getDb } from '../db/database.ts';
```

### Issue: "Did you mean to import .js?" Suggestion

**Symptom:**
```
Did you mean to import "../db/database.js"?
```

**Why This Happens:**
Node.js ESM loader suggests `.js` because it expects compiled JavaScript files. However, TSX is transpiling TypeScript sources, so use `.ts`.

**Solution:**
Ignore the `.js` suggestion and use `.ts`:
```typescript
import { getDb } from '../db/database.ts';  // ✅ Correct for TSX
```

### Issue: Mixed `.js` and `.ts` Extensions

**Symptom:**
```typescript
import { EncryptionService } from '../services/EncryptionService.js';  // .js
import type { AuditLogger } from '../services/AuditLogger.ts';          // .ts
```

**Why This Happens:**
Legacy code or partial fixes resulted in inconsistent extensions.

**Solution:**
Standardize on `.ts` for all TypeScript source imports:
```typescript
import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
```

### Issue: Path Alias Imports Not Working

**Symptom:**
```typescript
import { getDb } from '@/db/database';  // Error with TSX
```

**Why This Happens:**
TSX doesn't resolve TypeScript path aliases (`@/` from `tsconfig.json`). These work in Vite (bundler) but not in TSX (strip-only).

**Solution:**
Use relative paths instead:
```typescript
import { getDb } from '../db/database.ts';  // ✅ Relative path
```

### Verifying Imports Are Correct

**Method 1: Check Import Syntax**
```typescript
// Pattern to verify:
// ✅ Relative imports MUST have .ts extension
import { Something } from './path/to/file.ts';

// ✅ npm packages NO extension
import { z } from 'zod';

// ✅ JSON files have .json extension
import data from './data.json';
```

**Method 2: Run TSX Development Server**
```bash
pnpm electron:dev
```

If no "Cannot find module" errors appear, imports are correct.

**Method 3: Use Grep to Find Missing Extensions**
```bash
# Find relative imports without extensions (potential issues)
grep -r "from ['\"]\.\.*/[^'\"]*[^.ts|.js|.json]['\"]" src/
```

---

## Prevention Strategies

### 1. ESLint Configuration

**Recommended:** Configure ESLint to enforce `.ts` extensions on relative imports.

**Install Plugin:**
```bash
pnpm add -D eslint-plugin-import
```

**ESLint Config (`eslint.config.js`):**
```javascript
import importPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Enforce .ts extensions on relative imports
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'always',
          tsx: 'always',
          js: 'never',
          jsx: 'never',
        },
      ],
    },
  },
];
```

**Run Linter:**
```bash
pnpm lint
```

### 2. TypeScript Configuration

Ensure `tsconfig.json` allows `.ts` extensions:

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler"
  }
}
```

**Note:** `moduleResolution: "bundler"` is for Vite. TSX doesn't use this but respects `allowImportingTsExtensions`.

### 3. Editor Configuration (VS Code)

**Install Extensions:**
- **ESLint** (dbaeumer.vscode-eslint)
- **TypeScript Import Sorter** (helps organize imports)

**VS Code Settings (`.vscode/settings.json`):**
```json
{
  "typescript.preferences.importModuleSpecifierEnding": "ts",
  "javascript.preferences.importModuleSpecifierEnding": "js",
  "eslint.validate": [
    "typescript",
    "typescriptreact"
  ]
}
```

This setting tells VS Code to auto-add `.ts` extensions when using "Auto Import" features.

### 4. Pre-Commit Hooks

**Install Husky and Lint-Staged:**
```bash
pnpm add -D husky lint-staged
pnpm husky install
```

**Configure `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

**Configure `lint-staged` in `package.json`:**
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

This ensures linting runs before every commit, catching missing extensions.

### 5. Testing Strategy

**Unit Tests with Vitest:**
- Vitest uses Vite (bundler mode) so it's more forgiving of missing extensions
- **Issue:** Tests may pass even if imports are broken for TSX

**Solution:** Run integration tests with TSX:
```bash
# Test with actual TSX transpilation
tsx src/services/AuthenticationService.test.ts
```

**E2E Tests with Playwright:**
- Playwright launches the actual Electron app via TSX
- E2E tests will catch import resolution issues

**Run E2E Tests:**
```bash
pnpm test:e2e
```

---

## Automated Fix Script

The `fix-imports-simple.mjs` script automates adding `.ts` extensions to relative imports.

### Script Location

```
F:\Justice Companion take 2\fix-imports-simple.mjs
```

### Script Source Code

```javascript
#!/usr/bin/env node
/**
 * Simple import fixer - adds .ts extensions to relative imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.includes('.test.') && !file.includes('.spec.') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const files = getAllTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to process...\n`);

let totalFixed = 0;

files.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Add .ts to relative imports that don't have it
    content = content.replace(
      /from\s+['"](\.\.?\/[^'"]+)(?<!\.ts)(?<!\.json)(?<!\.css)(?<!\.js)['"]/g,
      (match, importPath) => {
        if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css')) {
          return match;
        }
        return `from '${importPath}.ts'`;
      }
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      console.log(`✅ Fixed: ${relativePath}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with missing .ts extensions`);
```

### How the Script Works

**Regex Pattern Breakdown:**

```javascript
/from\s+['"](\.\.?\/[^'"]+)(?<!\.ts)(?<!\.json)(?<!\.css)(?<!\.js)['"]/g
```

| Part | Meaning |
|------|---------|
| `from\s+` | Matches "from" followed by whitespace |
| `['"]` | Matches opening quote (single or double) |
| `(\.\.?\/[^'"]+)` | Captures relative path (`./ or ../`) |
| `(?<!\.ts)` | Negative lookbehind: not already `.ts` |
| `(?<!\.json)` | Negative lookbehind: not `.json` |
| `(?<!\.css)` | Negative lookbehind: not `.css` |
| `(?<!\.js)` | Negative lookbehind: not `.js` |
| `['"]` | Matches closing quote |

**Replacement:**
```javascript
return `from '${importPath}.ts'`;
```

Adds `.ts` to the captured import path.

### Running the Script

**1. Ensure Node.js is Active:**
```bash
node --version  # Should be 20.18.0
```

**2. Run the Script:**
```bash
node fix-imports-simple.mjs
```

**3. Review Changes:**
```bash
git diff
```

**4. Test Application:**
```bash
pnpm electron:dev
```

**5. Commit Changes:**
```bash
git add .
git commit -m "fix: add .ts extensions to relative imports for TSX compatibility"
```

### Script Limitations

**What It Fixes:**
- ✅ Missing `.ts` extensions on relative imports
- ✅ Handles both `./` and `../` paths
- ✅ Preserves existing `.js`, `.json`, `.css` extensions

**What It Doesn't Fix:**
- ❌ Path alias imports (`@/...`) - requires manual conversion to relative paths
- ❌ Dynamic imports (`import(...)`) - use separate regex
- ❌ Require statements (`require(...)`) - use separate regex if needed
- ❌ `.js` extensions on TypeScript imports - requires manual fix

### Extending the Script

**Fix Dynamic Imports:**
```javascript
// Add this regex after the main replacement
content = content.replace(
  /import\s*\(\s*['"](\.\.?\/[^'"]+)(?<!\.ts)['"]\s*\)/g,
  (match, importPath) => {
    return `import('${importPath}.ts')`;
  }
);
```

**Convert `.js` to `.ts`:**
```javascript
// Replace .js extensions with .ts for TypeScript source imports
content = content.replace(
  /from\s+['"](\.\.?\/[^'"]+)\.js['"]/g,
  (match, importPath) => {
    // Check if target file is .ts (not actual .js file)
    const targetPath = path.resolve(path.dirname(filePath), importPath + '.ts');
    if (fs.existsSync(targetPath)) {
      return `from '${importPath}.ts'`;
    }
    return match;  // Keep .js if actual JS file
  }
);
```

---

## Additional Resources

### Related Commits

- **`fd92ce0`** - Initial fix: Changed 3 files from `.js` to `.ts` extensions
- **`1bef370`** - Comprehensive fix: Added `.ts` extensions to 74+ files
- **`96a8f46`** - Path alias conversion: Converted `@/` imports to relative paths
- **`4226773`** - TSX compatibility: Fixed TypeScript parameter properties

### Related Documentation

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [TSX GitHub Repository](https://github.com/privatenumber/tsx)
- [Justice Companion CLAUDE.md](../CLAUDE.md) - Project guidelines

### Node.js ESM Specification

**Key Points:**
- Node.js ESM requires explicit file extensions for relative imports
- This is by design to match browser ESM behavior
- Extensions can be omitted for npm packages (node_modules resolution)
- TypeScript allows extensionless imports, but transpilers like TSX don't

**Official Node.js Guidance:**
> "To preserve compatibility with browsers and other standards-compliant module loaders, relative imports must include file extensions."

Source: [Node.js ESM Documentation](https://nodejs.org/api/esm.html#mandatory-file-extensions)

---

## Summary

### What Was Fixed

- **74+ TypeScript files** updated with `.ts` extensions on relative imports
- **Root cause:** TSX transpiler requires explicit file extensions for ESM module resolution
- **Solution:** Automated script added `.ts` to all relative imports without extensions

### Key Takeaways

1. **Always use `.ts` extensions** for relative imports in TypeScript source files
2. **Don't use `.js` extensions** for TypeScript source imports (use `.ts`)
3. **npm packages don't need extensions** (`import { z } from 'zod'`)
4. **TSX is not a bundler** - it strips TypeScript syntax but doesn't resolve modules
5. **ESLint can enforce** correct import extensions (see Prevention Strategies)

### Quick Reference: Import Extension Rules

| Import Type | Extension | Example |
|-------------|-----------|---------|
| TypeScript source | `.ts` | `from './User.ts'` |
| JavaScript source | `.js` | `from './legacy.js'` |
| Type-only import | `.ts` | `from './types.ts'` |
| npm package | None | `from 'zod'` |
| JSON file | `.json` | `from './config.json'` |
| CSS file | `.css` | `from './styles.css'` |

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-20
**Maintained By:** Justice Companion Development Team
