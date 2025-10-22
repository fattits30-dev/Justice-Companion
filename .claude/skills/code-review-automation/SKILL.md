---
name: code-review-automation
description: "Automated code quality checks: pre-commit hooks, ESLint auto-fixes, TypeScript validation, import optimization, format checking. Runs before commits to catch issues early. Use when setting up quality gates or debugging failed commits."
allowed-tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob", "mcp__cclsp__*"]
---

# Code Review Automation Skill

## Purpose
Enforce code quality standards through automated pre-commit checks and continuous validation.

## When Claude Uses This
- Setting up pre-commit hooks
- Debugging failed commits
- Fixing linting errors
- Optimizing imports
- Type checking failures
- Format violations

## Quality Gates

### Pre-Commit Checks (via Husky)

Current setup in `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged
pnpm lint-staged
```

Configured in `package.json`:
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

### Quality Checks Matrix

| Check | Tool | Runs On | Auto-Fix | Blocks Commit |
|-------|------|---------|----------|---------------|
| **Linting** | ESLint | Pre-commit | ✅ Yes | ❌ No (warns) |
| **Formatting** | Prettier | Pre-commit | ✅ Yes | ❌ No (fixes) |
| **Type Safety** | TypeScript | Manual | ❌ No | ⚠️ Should |
| **Import Order** | eslint-plugin-import | Pre-commit | ✅ Yes | ❌ No |
| **Tests** | Vitest | CI only | ❌ No | ✅ Yes (CI) |
| **E2E Tests** | Playwright | CI only | ❌ No | ✅ Yes (CI) |

## ESLint Configuration

### Current Setup
```javascript
// eslint.config.js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'import': importPlugin,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off', // Using TypeScript

      // Imports
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc' }
      }],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // TypeScript handles this
    },
  },
];
```

### Common ESLint Fixes

**Unused Imports**
```bash
# Auto-fix unused imports
pnpm lint:fix
```

**Import Order**
```typescript
// ❌ BEFORE: Unorganized
import { Button } from '@/components/ui/Button';
import React from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';

// ✅ AFTER: Organized
import React, { useState } from 'react';

import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
```

**Unused Variables**
```typescript
// ❌ BEFORE
const fetchData = async (id: number) => {
  const response = await fetch(`/api/${id}`);
  const data = await response.json();
  return data;
};

// ✅ AFTER: Prefix with _ if intentionally unused
const fetchData = async (_id: number) => {
  const response = await fetch('/api/endpoint');
  const data = await response.json();
  return data;
};
```

## TypeScript Validation

### Type Check Command
```bash
# Check all TypeScript files
pnpm type-check

# Watch mode (dev)
tsc --noEmit --watch
```

### Common Type Errors

**Missing Type Annotations**
```typescript
// ❌ BAD: Implicit any
const handleClick = (event) => {
  console.log(event.target.value);
};

// ✅ GOOD: Explicit types
const handleClick = (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
};
```

**Null/Undefined Checks**
```typescript
// ❌ BAD: Potential null error
const user = users.find(u => u.id === userId);
console.log(user.name); // Error if user is undefined

// ✅ GOOD: Guard clause
const user = users.find(u => u.id === userId);
if (!user) return;
console.log(user.name);
```

**Type Assertions**
```typescript
// ❌ BAD: Unsafe assertion
const data = response.data as UserData;

// ✅ GOOD: Type guard
function isUserData(data: unknown): data is UserData {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUserData(response.data)) {
  // data is safely typed as UserData
}
```

## Import Optimization

### Auto-Fix Import Issues
```bash
# Fix all import-related ESLint errors
pnpm lint:fix

# Or use manual script
node scripts/fix-imports.mjs
```

### Import Patterns

**Absolute Imports (Preferred)**
```typescript
// ✅ GOOD: Absolute imports via path alias
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { UserRepository } from '@/repositories/UserRepository';

// ❌ BAD: Relative imports (harder to refactor)
import { Button } from '../../components/ui/Button';
```

**Barrel Exports (Use Sparingly)**
```typescript
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';

// Usage:
import { Button, Input, Label } from '@/components/ui';
```

## Prettier Configuration

```javascript
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### Format Commands
```bash
# Format all files
pnpm format

# Check formatting without changing
pnpm format:check

# Format specific file
pnpm format src/components/Button.tsx
```

## Pre-Commit Hook Setup

### Install Husky & lint-staged
```bash
# Already installed, but for reference:
pnpm add -D husky lint-staged

# Initialize Husky
pnpm exec husky install

# Create pre-commit hook
pnpm exec husky add .husky/pre-commit "pnpm lint-staged"
```

### Bypass Pre-Commit (Emergency Only)
```bash
# Skip hooks for urgent commits
git commit --no-verify -m "emergency fix"

# Or set environment variable
HUSKY=0 git commit -m "skip hooks"
```

## Continuous Integration Checks

### GitHub Actions Workflow
```yaml
# .github/workflows/quality.yml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Format check
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

## Automated Fixes

### Fix All Script
```bash
# scripts/fix-all.sh
#!/bin/bash

echo "🔧 Running automated fixes..."

# 1. ESLint auto-fix
echo "1️⃣ Fixing ESLint issues..."
pnpm lint:fix

# 2. Format with Prettier
echo "2️⃣ Formatting code..."
pnpm format

# 3. Optimize imports
echo "3️⃣ Optimizing imports..."
node scripts/fix-imports.mjs

# 4. Remove unused code
echo "4️⃣ Removing unused code..."
# Uses ts-unused-exports or similar tool

echo "✅ Automated fixes complete!"
echo "⚠️  Please review changes before committing."
```

### Import Fix Script
```javascript
// scripts/fix-imports.mjs
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{ts,tsx}');

for (const file of files) {
  let content = readFileSync(file, 'utf-8');

  // Remove unused imports (basic regex - ESLint is better)
  const unusedImportRegex = /import\s+{\s*}\s+from\s+['"][^'"]+['"]/g;
  content = content.replace(unusedImportRegex, '');

  // Sort import groups
  const importRegex = /^import\s+.+$/gm;
  const imports = content.match(importRegex) || [];

  if (imports.length > 0) {
    const sorted = sortImports(imports);
    content = content.replace(importRegex, '');
    content = sorted.join('\n') + '\n\n' + content.trim();
  }

  writeFileSync(file, content);
}

function sortImports(imports) {
  const groups = {
    react: [],
    external: [],
    internal: [],
  };

  for (const imp of imports) {
    if (imp.includes('react')) groups.react.push(imp);
    else if (imp.includes('@/')) groups.internal.push(imp);
    else groups.external.push(imp);
  }

  return [
    ...groups.react.sort(),
    '',
    ...groups.external.sort(),
    '',
    ...groups.internal.sort(),
  ].filter(Boolean);
}
```

## Code Review Checklist

### Manual Review Points
- [ ] TypeScript types are explicit (no `any`)
- [ ] Functions have clear names and single responsibility
- [ ] Complex logic has comments
- [ ] Error handling is comprehensive
- [ ] Security: No hardcoded secrets or PII logging
- [ ] Performance: No unnecessary re-renders
- [ ] Accessibility: ARIA labels, keyboard nav
- [ ] Tests cover new functionality

### Automated Checks (Pre-Commit)
- [x] ESLint rules pass
- [x] Prettier formatting applied
- [x] Import order correct
- [ ] TypeScript compiles (should add to pre-commit)
- [ ] Tests pass (CI only)

## VSCode Integration

### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens"
  ]
}
```

### Auto-Fix on Save
```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

## Troubleshooting

### Pre-Commit Hook Not Running
```bash
# Reinstall Husky
rm -rf .husky
pnpm exec husky install
pnpm exec husky add .husky/pre-commit "pnpm lint-staged"

# Check git hooks are enabled
git config core.hooksPath
```

### ESLint Errors Not Auto-Fixing
```bash
# Clear ESLint cache
rm -rf node_modules/.cache/eslint

# Re-run with debug
pnpm lint:fix --debug
```

### TypeScript Errors After Dependency Update
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Rebuild
pnpm install
pnpm type-check
```

## Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "fix:all": "bash scripts/fix-all.sh",
    "prepare": "husky"
  }
}
```

## References
- ESLint: https://eslint.org/docs/latest/
- Prettier: https://prettier.io/docs/en/
- Husky: https://typicode.github.io/husky/
- lint-staged: https://github.com/lint-staged/lint-staged
- TypeScript: https://www.typescriptlang.org/docs/
