# ESLint Import Extension Enforcement Guide

**Purpose:** Configure ESLint to automatically enforce `.ts` extensions on relative imports

**Status:** Recommended for implementation
**Effort:** ~15 minutes setup
**Impact:** Prevents future TSX import resolution issues

---

## Why This Matters

Without ESLint enforcement, developers can accidentally:
- Omit `.ts` extensions on relative imports (TSX error)
- Use `.js` extensions for TypeScript sources (incorrect)
- Create inconsistent import conventions across the codebase

ESLint can catch these issues automatically during development and in CI/CD.

---

## Installation

### 1. Install Required Packages

```bash
pnpm add -D eslint-plugin-import @typescript-eslint/parser
```

**Note:** `@typescript-eslint/parser` may already be installed. Verify in `package.json`.

### 2. Verify Installation

```bash
pnpm list eslint-plugin-import
pnpm list @typescript-eslint/parser
```

---

## Configuration

### Option A: ESLint Flat Config (ESLint 9+)

**File:** `eslint.config.js` (create if doesn't exist)

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['dist', 'node_modules', 'electron', '*.js', '*.mjs'] },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Import extension rules
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'always',   // Require .ts for TypeScript files
          tsx: 'always',  // Require .tsx for React TypeScript files
          js: 'never',    // No .js extension for JavaScript imports
          jsx: 'never',   // No .jsx extension for React imports
        },
      ],

      // Other recommended rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
```

### Option B: Legacy ESLint Config (ESLint 8)

**File:** `.eslintrc.json` (create if doesn't exist)

```json
{
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "react-hooks",
    "react-refresh",
    "import"
  ],
  "rules": {
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "ts": "always",
        "tsx": "always",
        "js": "never",
        "jsx": "never"
      }
    ],
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { "argsIgnorePattern": "^_" }
    ]
  },
  "ignorePatterns": ["dist", "node_modules", "electron", "*.js", "*.mjs"]
}
```

---

## Import Resolver Configuration

For advanced features (path alias resolution, etc.), add resolver settings.

### Enhanced Configuration with Resolver

```javascript
// eslint.config.js (flat config)
export default [
  // ... existing config ...
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    // ... rest of config ...
  },
];
```

**Required Package:**
```bash
pnpm add -D eslint-import-resolver-typescript
```

---

## Testing the Configuration

### 1. Create Test File with Errors

**File:** `src/test-imports.ts`

```typescript
// ❌ Should error - missing .ts extension
import { UserRepository } from '../repositories/UserRepository';

// ❌ Should error - wrong extension (.js for .ts source)
import { logger } from '../utils/logger.js';

// ✅ Should pass - correct .ts extension
import { AuditLogger } from '../services/AuditLogger.ts';

// ✅ Should pass - npm package (no extension)
import { z } from 'zod';
```

### 2. Run ESLint

```bash
pnpm lint
```

**Expected Output:**

```
src/test-imports.ts
  2:35  error  Missing file extension "ts" for "../repositories/UserRepository"  import/extensions
  5:29  error  Unexpected use of file extension "js" for "../utils/logger.js"    import/extensions

✖ 2 problems (2 errors, 0 warnings)
```

### 3. Auto-Fix

```bash
pnpm lint:fix
```

ESLint should automatically add/correct extensions where possible.

### 4. Clean Up

```bash
rm src/test-imports.ts
```

---

## VS Code Integration

### 1. Install VS Code ESLint Extension

**Extension ID:** `dbaeumer.vscode-eslint`

Install from VS Code Extensions marketplace or:
```bash
code --install-extension dbaeumer.vscode-eslint
```

### 2. Configure VS Code Settings

**File:** `.vscode/settings.json`

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.preferences.importModuleSpecifierEnding": "ts",
  "javascript.preferences.importModuleSpecifierEnding": "js"
}
```

**Effect:**
- Auto-fixes ESLint issues on file save
- TypeScript auto-imports add `.ts` extensions automatically
- Real-time error highlighting in editor

### 3. Restart VS Code

```bash
# Close and reopen VS Code, or:
Ctrl+Shift+P → "Developer: Reload Window"
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/quality.yml`

```yaml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Lint code
        run: pnpm lint

      - name: Check import extensions
        run: |
          echo "Checking for missing .ts extensions..."
          ! grep -r "from ['\"]\.\.*/[^'\"]*[^.ts|.js|.json|.css]['\"]" src/ || {
            echo "❌ Found imports without extensions"
            exit 1
          }
```

**Effect:**
- Fails PR if linting errors exist
- Catches missing extensions before merge
- Enforces code quality standards

---

## Pre-Commit Hooks

### 1. Install Husky and lint-staged

```bash
pnpm add -D husky lint-staged
```

### 2. Initialize Husky

```bash
pnpm husky install
pnpm husky add .husky/pre-commit "pnpm lint-staged"
```

### 3. Configure lint-staged

**File:** `package.json` (add to existing file)

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{js,jsx,json,css,md}": [
      "prettier --write"
    ]
  }
}
```

### 4. Add postinstall script

**File:** `package.json` (update scripts section)

```json
{
  "scripts": {
    "postinstall": "husky install && electron-rebuild -f -w better-sqlite3"
  }
}
```

**Effect:**
- Runs ESLint + Prettier on staged files before commit
- Blocks commit if linting errors exist
- Auto-fixes issues where possible

---

## Common ESLint Errors and Fixes

### Error 1: Missing Extension

**ESLint Output:**
```
error  Missing file extension "ts" for "../repositories/UserRepository"  import/extensions
```

**Code:**
```typescript
import { UserRepository } from '../repositories/UserRepository';
```

**Fix:**
```typescript
import { UserRepository } from '../repositories/UserRepository.ts';
```

**Auto-fix:** ✅ ESLint can fix this automatically

### Error 2: Wrong Extension (.js for .ts)

**ESLint Output:**
```
error  Unexpected use of file extension "js" for "../utils/logger.js"  import/extensions
```

**Code:**
```typescript
import { logger } from '../utils/logger.js';
```

**Fix:**
```typescript
import { logger } from '../utils/logger.ts';
```

**Auto-fix:** ✅ ESLint can fix this automatically

### Error 3: Extension on npm Package

**ESLint Output:**
```
error  Unexpected use of file extension "ts" for "zod"  import/extensions
```

**Code:**
```typescript
import { z } from 'zod.ts';  // Wrong!
```

**Fix:**
```typescript
import { z } from 'zod';  // No extension for npm packages
```

**Auto-fix:** ✅ ESLint can fix this automatically

---

## Troubleshooting

### Issue: "Cannot find module 'eslint-plugin-import'"

**Solution:**
```bash
pnpm add -D eslint-plugin-import
```

### Issue: "Parsing error: Cannot read file"

**Cause:** TypeScript project configuration issue

**Solution:**
Ensure `parserOptions.project` points to valid `tsconfig.json`:
```javascript
parserOptions: {
  project: './tsconfig.json',
}
```

### Issue: ESLint is slow

**Cause:** TypeScript-aware linting requires type-checking

**Solution:** Disable type-aware rules or use `TIMING=1`:
```bash
TIMING=1 pnpm lint
```

### Issue: False positives on JSON imports

**Cause:** ESLint trying to enforce `.ts` on JSON files

**Solution:** Already handled by `ignorePackages` and extension list:
```javascript
'import/extensions': [
  'error',
  'ignorePackages',
  {
    ts: 'always',
    tsx: 'always',
    json: 'always',  // Add this if needed
  },
]
```

---

## Gradual Adoption Strategy

If you have a large codebase with many violations:

### Phase 1: Warning Mode (Week 1)

Change rule severity to `warn`:
```javascript
'import/extensions': [
  'warn',  // Changed from 'error'
  'ignorePackages',
  { ts: 'always', tsx: 'always' },
]
```

**Effect:** Developers see warnings but commits don't fail

### Phase 2: Targeted Fixes (Week 2-3)

Run automated fix:
```bash
node fix-imports-simple.mjs
pnpm lint:fix
```

Review and commit changes.

### Phase 3: Enforcement Mode (Week 4+)

Change rule severity to `error`:
```javascript
'import/extensions': [
  'error',  // Enforced
  'ignorePackages',
  { ts: 'always', tsx: 'always' },
]
```

**Effect:** Linting errors block commits/PRs

---

## Performance Considerations

### Lint Caching

**File:** `.eslintcache` (already in `.gitignore`)

Enable caching in `package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --cache",
    "lint:fix": "eslint . --ext ts,tsx --cache --fix"
  }
}
```

**Effect:** Subsequent lints are 2-3x faster

### Parallel Linting

For large codebases, lint in parallel:
```bash
pnpm add -D eslint-parallel
```

Update scripts:
```json
{
  "scripts": {
    "lint": "eslint-parallel . --ext ts,tsx"
  }
}
```

---

## Summary

### What You Get

- ✅ Automatic detection of missing `.ts` extensions
- ✅ Auto-fix capability for most issues
- ✅ Real-time error highlighting in VS Code
- ✅ Pre-commit validation prevents bad commits
- ✅ CI/CD enforcement blocks PRs with violations

### Implementation Checklist

- [ ] Install `eslint-plugin-import`
- [ ] Configure ESLint rules (see Configuration section)
- [ ] Test with sample file (see Testing section)
- [ ] Configure VS Code integration (see VS Code Integration)
- [ ] Add pre-commit hooks (see Pre-Commit Hooks)
- [ ] Update CI/CD pipeline (see CI/CD Integration)
- [ ] Run automated fix on existing code: `node fix-imports-simple.mjs`
- [ ] Commit changes and verify in CI

### Maintenance

- Review ESLint output regularly
- Update rules as project evolves
- Monitor CI/CD for new violations
- Educate team on import conventions

---

## Related Documentation

- [TSX Import Resolution Guide](./TSX-IMPORT-RESOLUTION-GUIDE.md) - Full technical details
- [TSX Import Quick Reference](../TSX-IMPORT-QUICK-REF.md) - Developer cheat sheet
- [ESLint Documentation](https://eslint.org/docs/latest/) - Official ESLint docs
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) - Plugin documentation

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-20
**Maintained By:** Justice Companion Development Team
