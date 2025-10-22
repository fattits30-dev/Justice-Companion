# TSX Import Quick Reference

⚠️ **Critical for Justice Companion Development** ⚠️

## The Golden Rule

**All relative imports MUST have explicit `.ts` extensions**

## Quick Examples

### ✅ CORRECT

```typescript
// Relative imports - MUST have .ts extension
import { UserRepository } from '../repositories/UserRepository.ts';
import type { User } from '../models/User.ts';
import { getDb } from '../db/database.ts';
import { EncryptionService } from '../services/EncryptionService.ts';

// npm packages - NO extension
import { z } from 'zod';
import Database from 'better-sqlite3';
import { app } from 'electron';

// Non-TS files - use actual extension
import config from './config.json';
import styles from './styles.css';
```

### ❌ WRONG

```typescript
// Missing .ts extension - TSX will fail
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../models/User';
import { getDb } from '../db/database';

// Using .js for TypeScript source - incorrect
import { EncryptionService } from '../services/EncryptionService.js';
```

## Common Scenarios

| Scenario | Extension | Example |
|----------|-----------|---------|
| Importing TypeScript file | `.ts` | `from './User.ts'` |
| Importing from npm package | None | `from 'zod'` |
| Type-only import | `.ts` | `import type { User } from './User.ts'` |
| JSON file | `.json` | `from './config.json'` |
| CSS file | `.css` | `from './styles.css'` |

## Why This Matters

TSX (TypeScript transpiler) operates in "strip-only" mode:
- It removes TypeScript syntax (types, interfaces)
- It does NOT resolve modules (unlike Vite/webpack)
- Import paths are passed directly to Node.js
- Node.js ESM requires explicit file extensions

**Error you'll see if missing:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'F:\...\src\db\database'
imported from F:\...\src\repositories\UserRepository.ts
```

## Quick Fix

If you encounter import errors:

```bash
# Run automated fix script
node fix-imports-simple.mjs

# Verify application runs
pnpm electron:dev
```

## Full Documentation

See [TSX Import Resolution Guide](docs/TSX-IMPORT-RESOLUTION-GUIDE.md) for:
- Detailed technical explanation
- Git diff examples
- Prevention strategies
- ESLint configuration
- Troubleshooting guide

## Quick Checklist Before Committing

- [ ] All relative imports have `.ts` extensions
- [ ] npm package imports have NO extensions
- [ ] Application starts without "Cannot find module" errors
- [ ] Run `pnpm lint` (configure ESLint to catch this)

---

**Last Updated:** 2025-10-20
**Related Commits:** `fd92ce0`, `1bef370`
