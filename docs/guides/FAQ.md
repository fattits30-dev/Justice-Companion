# Frequently Asked Questions (FAQ) - Justice Companion

**Last Updated**: 2025-10-20
**Version**: 1.0.0
**For**: Justice Companion v1.0.0

---

## Table of Contents

1. [TSX Import Issues](#tsx-import-issues)
2. [Development Setup](#development-setup)
3. [Testing](#testing)
4. [Code Quality & Linting](#code-quality--linting)
5. [Authentication](#authentication)
6. [Troubleshooting](#troubleshooting)
7. [Documentation](#documentation)
8. [Git & Version Control](#git--version-control)

---

## TSX Import Issues

### Q1: Why do we need `.ts` extensions on imports?

**A**: Justice Companion uses TSX for development, which operates in "strip-only" mode. Unlike bundlers (Vite, webpack), TSX passes import paths directly to Node.js, which requires explicit file extensions for ESM module resolution.

```typescript
// ✅ CORRECT - TSX requires explicit .ts extension
import { UserRepository } from '../repositories/UserRepository.ts';

// ❌ WRONG - Will fail with "Cannot find module" error
import { UserRepository } from '../repositories/UserRepository';
```

**Reference**: [TSX-IMPORT-QUICK-REF.md](TSX-IMPORT-QUICK-REF.md)

---

### Q2: Do I use `.ts` or `.js` extensions for TypeScript files?

**A**: Use `.ts` extensions when importing from TypeScript source files, even though they compile to JavaScript.

```typescript
// ✅ CORRECT - Import from .ts source file
import { logger } from '../utils/logger.ts';

// ❌ WRONG - logger.ts exists, not logger.js
import { logger } from '../utils/logger.js';
```

**Why**: TSX transpiles `.ts` files in-memory, but import paths reference the actual source files. Node.js ESM loader resolves `.ts` imports correctly with TSX.

**Reference**: [docs/TSX-IMPORT-RESOLUTION-GUIDE.md](docs/TSX-IMPORT-RESOLUTION-GUIDE.md)

---

### Q3: What about npm package imports?

**A**: **Do NOT** use extensions for npm packages. Extensions are only for relative imports.

```typescript
// ✅ CORRECT - No extension for npm packages
import { z } from 'zod';
import Database from 'better-sqlite3';

// ❌ WRONG - Don't add extensions to npm packages
import { z } from 'zod.ts';
```

**ESLint Rule**: `ignorePackages` handles this automatically.

---

### Q4: How do I fix "Cannot find module" errors?

**A**: Run the automated fix script:

```bash
# Automated fix (adds .ts extensions)
node fix-imports-simple.mjs

# Verify fix
pnpm electron:dev
```

**Manual Fix**:
```typescript
// Before (missing extension)
import { getDb } from '../db/database';

// After (with extension)
import { getDb } from '../db/database.ts';
```

**Reference**: [docs/TSX-IMPORT-RESOLUTION-GUIDE.md](docs/TSX-IMPORT-RESOLUTION-GUIDE.md) → "Troubleshooting"

---

### Q5: Will ESLint catch missing extensions automatically?

**A**: Yes, once configured (pending `pnpm install`):

```javascript
// ESLint rule in eslint.config.js
'import/extensions': [
  'error',
  'ignorePackages',
  { ts: 'always', tsx: 'always' }
]
```

**Effect**:
- ✅ Real-time error highlighting in VS Code
- ✅ Auto-fix on save
- ✅ Pre-commit hook blocks bad commits

**Reference**: [docs/ESLINT-IMPORT-ENFORCEMENT.md](docs/ESLINT-IMPORT-ENFORCEMENT.md)

---

## Development Setup

### Q6: What Node.js version should I use?

**A**: **Node.js 20.18.0 LTS** (NOT Node 22.x)

```bash
# Check version
node --version  # Should show v20.18.0

# Switch to Node 20
nvm use 20
# OR
fnm use 20
```

**Why**: Electron 38.2.1 requires Node 20.x. Using Node 22.x causes native module compatibility issues.

**Reference**: [CLAUDE.md](CLAUDE.md) → "Node.js Version"

---

### Q7: Should I use npm, yarn, or pnpm?

**A**: **MUST use pnpm** (NOT npm or yarn)

```bash
# ✅ CORRECT
pnpm install

# ❌ WRONG
npm install  # Will cause better-sqlite3 issues
yarn install  # Will cause better-sqlite3 issues
```

**Why**: Better-sqlite3 (native SQLite module) requires specific rebuild commands that pnpm handles correctly via `postinstall` script.

**Reference**: [CLAUDE.md](CLAUDE.md) → "Package Manager"

---

### Q8: How do I setup my development environment?

**A**: Follow this sequence:

```bash
# 1. Ensure correct Node version
nvm use 20

# 2. Install dependencies
pnpm install

# 3. Create .env file with encryption key
# See "Environment Configuration" in CLAUDE.md

# 4. Run database migrations
pnpm db:migrate

# 5. Start development server
pnpm electron:dev
```

**Estimated Time**: 10-15 minutes

**Reference**: [CLAUDE.md](CLAUDE.md) → "Development Workflow"

---

### Q9: What VS Code extensions should I install?

**A**: Required extensions:

1. **ESLint** (`dbaeumer.vscode-eslint`) - Auto-fix imports on save
2. **Prettier** (`esbenp.prettier-vscode`) - Code formatting
3. **TypeScript** (built-in) - Type checking

**Install Command**:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

**Reference**: [docs/vscode-setup.md](docs/vscode-setup.md)

---

### Q10: How do I configure VS Code for auto-fix on save?

**A**: Update `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifierEnding": "ts"
}
```

**Effect**: ESLint auto-fixes import extensions every time you save a file.

**Reference**: [docs/vscode-setup.md](docs/vscode-setup.md)

---

## Testing

### Q11: How do I test authentication quickly?

**A**: Use the 5-minute quick test:

```bash
# 1. Start app
pnpm electron:dev

# 2. Register test user
# Username: testuser
# Password: TestPassword123!
# Email: test@test.com

# 3. Logout and login again

# 4. Try invalid credentials

# Done! (5 minutes total)
```

**Reference**: [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md)

---

### Q12: How do I run Playwright tests?

**A**: Follow this sequence:

```bash
# 1. Rebuild native modules for Node.js (required once)
pnpm rebuild:node

# 2. Run Playwright tests
pnpm test:e2e

# 3. Run specific test file
pnpm test:e2e e2e/auth.spec.improved.ts
```

**Note**: Only run after manual tests pass (see [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md))

**Reference**: [TESTING_STRATEGY_AUTH.md](TESTING_STRATEGY_AUTH.md) → "Phase 2"

---

### Q13: What if auto-fix doesn't work?

**A**: Try these steps:

```bash
# 1. Manual lint with auto-fix
pnpm lint:fix

# 2. Check ESLint output for errors
pnpm lint

# 3. Verify ESLint plugin installed
pnpm list eslint-plugin-import

# 4. Restart VS Code
Ctrl+Shift+P → "Developer: Reload Window"
```

**If still failing**: Check [docs/ESLINT-IMPORT-ENFORCEMENT.md](docs/ESLINT-IMPORT-ENFORCEMENT.md) → "Troubleshooting"

---

### Q14: What password requirements must I follow?

**A**: OWASP-compliant requirements:

- ✅ Minimum 12 characters
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character (recommended)

**Valid Examples**:
- `TestPassword123!`
- `MySecurePass2024`
- `ValidP@ssw0rd`

**Invalid Examples**:
- `Short1!` (only 7 characters)
- `lowercase123456` (no uppercase)
- `UPPERCASE123456` (no lowercase)
- `NoNumbersHere!` (no digits)

**Reference**: [TESTING_STRATEGY_AUTH.md](TESTING_STRATEGY_AUTH.md) → "Test 3"

---

## Code Quality & Linting

### Q15: How do I know if everything is working?

**A**: Run this verification checklist:

```bash
# 1. TypeScript compiles without errors
pnpm type-check
# Expected: 0 errors

# 2. Linting passes
pnpm lint
# Expected: 0 errors (warnings OK)

# 3. App starts successfully
pnpm electron:dev
# Expected: Login screen appears, no console errors

# 4. Tests pass
pnpm test
# Expected: All tests pass
```

**All green?** You're good to go! ✅

---

### Q16: What if node_modules is locked/corrupted?

**A**: Use the nuclear option (with caution):

```powershell
# Windows PowerShell (run as Administrator)
.\nuclear-fix-node-modules.ps1
```

**What it does**:
1. Closes VS Code
2. Kills all Electron/Node processes
3. Force deletes node_modules
4. Runs `pnpm install`

**⚠️ Warning**: This closes all VS Code instances and running processes. Save your work first!

**Reference**: [nuclear-fix-node-modules.ps1](nuclear-fix-node-modules.ps1)

---

### Q17: How do pre-commit hooks work?

**A**: Husky runs lint-staged before every commit:

```bash
# When you commit...
git commit -m "feat: add new feature"

# Husky automatically runs:
1. ESLint --fix on staged TypeScript files
2. Prettier on staged files
3. Blocks commit if unfixable errors

# If successful:
[main abc1234] feat: add new feature
```

**Effect**: Impossible to commit code with import errors.

**Reference**: [HUSKY-LINT-STAGED-SETUP.md](HUSKY-LINT-STAGED-SETUP.md)

---

## Authentication

### Q18: Where is authentication data stored?

**A**: Local SQLite database with encryption:

| Table | Data | Encryption |
|-------|------|------------|
| `users` | Usernames, emails | Hashed passwords (scrypt) |
| `sessions` | Session IDs, expiry | UUID v4 session IDs |
| `audit_logs` | Auth events | SHA-256 hash chaining |

**Database Location**: `app.getPath('userData')/justice.db`

**Encryption Key**: Stored in OS-level secure storage (DPAPI/Keychain/libsecret)

**Reference**: [CLAUDE.md](CLAUDE.md) → "Security Architecture"

---

### Q19: How long do sessions last?

**A**: Depends on "Remember Me" setting:

- **Without "Remember Me"**: 24 hours
- **With "Remember Me"**: 30 days

**Session Cleanup**: Expired sessions automatically deleted on validation.

**Reference**: [TESTING_STRATEGY_AUTH.md](TESTING_STRATEGY_AUTH.md) → "Test 6"

---

### Q20: What is the hasConsent IPC handler and why is it missing?

**A**: The `hasConsent` handler checks if a user has granted specific GDPR consents.

**Current Status**: ❌ Not implemented (identified in testing)

**Required Implementation**:
```typescript
// electron/ipc-handlers.ts
ipcMain.handle('auth:hasConsent', async (_, userId: number, consentType: string) => {
  const consentService = new ConsentService(db);
  const hasConsent = await consentService.hasConsent(userId, consentType);
  return { success: true, data: hasConsent };
});
```

**Priority**: Medium (blocks GDPR consent UI)

**Reference**: [MASTER-DELIVERABLES-SUMMARY.md](MASTER-DELIVERABLES-SUMMARY.md) → "Authentication Fixes"

---

## Troubleshooting

### Q21: App shows blank white screen on startup

**Fix Steps**:

```bash
# 1. Check console for errors (F12 → Console)
# Look for "Cannot find module" errors

# 2. If import errors, run fix script
node fix-imports-simple.mjs

# 3. Rebuild native modules
pnpm rebuild:electron

# 4. Restart app
pnpm electron:dev
```

**Most Common Cause**: Import errors (fixed in commit 1bef370)

---

### Q22: Database is locked error

**Symptom**: `SQLITE_BUSY` or "database is locked"

**Fix**:

```bash
# 1. Close all app instances
# 2. Check Task Manager for lingering processes
# 3. Kill any "Justice Companion" or "Electron" processes
```

**Prevention**:
```typescript
// Use WAL mode in database.ts
db.pragma('journal_mode = WAL');
```

**Reference**: [TESTING_STRATEGY_AUTH.md](TESTING_STRATEGY_AUTH.md) → "Common Issues"

---

### Q23: better-sqlite3 module version mismatch

**Symptom**: `NODE_MODULE_VERSION mismatch` error

**Fix**:

```bash
# 1. Ensure Node 20.x
nvm use 20

# 2. Reinstall dependencies
pnpm install

# 3. Or rebuild manually
pnpm rebuild better-sqlite3
```

**Reference**: [CLAUDE.md](CLAUDE.md) → "Known Issues"

---

### Q24: Login always fails

**Check**:

```javascript
// 1. Password meets requirements (12+ chars, uppercase, lowercase, number)
// 2. User exists in database

// 3. Test IPC handler directly in DevTools (F12):
window.justiceAPI.loginUser('testuser', 'TestPassword123!', false)
  .then(result => console.log('✅ Login:', result))
  .catch(error => console.error('❌ Login failed:', error));
```

**Common Causes**:
- Weak password (fails OWASP validation)
- User doesn't exist (register first)
- Rate limiting (5 failed attempts = lock)

**Reference**: [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md) → "Troubleshooting"

---

### Q25: Playwright tests hang on launch

**Symptom**: `await electronApp.firstWindow()` times out

**Fix**:

```typescript
// Increase timeout in test
electronApp = await electron.launch({
  args: [...],
  timeout: 60000, // Increase from default
  env: {
    ELECTRON_ENABLE_LOGGING: '1', // Enable logs
  },
});
```

**Common Causes**:
- TypeScript not compiled (`pnpm build` first)
- Native modules not rebuilt for Node (`pnpm rebuild:node`)
- Database locked from previous test

**Reference**: [TESTING_STRATEGY_AUTH.md](TESTING_STRATEGY_AUTH.md) → "Known Issues"

---

## Documentation

### Q26: Where can I find documentation on [topic]?

**A**: Use the documentation index:

**Quick Links**:
- TSX imports → [TSX-IMPORT-QUICK-REF.md](TSX-IMPORT-QUICK-REF.md)
- Testing → [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md)
- Setup → [CLAUDE.md](CLAUDE.md)
- All docs → [COMPREHENSIVE-DOCUMENTATION-INDEX.md](COMPREHENSIVE-DOCUMENTATION-INDEX.md)

**Search Tip**: Use `grep` or GitHub search:
```bash
grep -r "keyword" *.md
```

---

### Q27: Documentation is outdated. How do I report this?

**A**: Create a GitHub issue:

1. Go to Issues → New Issue
2. Add label: `documentation`
3. Describe what's outdated and correct info
4. Tag maintainer

**Or submit a PR**:
1. Update the doc with correct info
2. Update "Last Updated" date
3. Submit PR for review

**Reference**: [COMPREHENSIVE-DOCUMENTATION-INDEX.md](COMPREHENSIVE-DOCUMENTATION-INDEX.md) → "Feedback"

---

## Git & Version Control

### Q28: How do I bypass pre-commit hook in an emergency?

**A**: Use `--no-verify` flag (sparingly):

```bash
# Bypass pre-commit hook
git commit --no-verify -m "emergency: urgent fix"
```

**⚠️ Warning**: Only use for true emergencies. Hook exists to prevent bugs from reaching production.

**Better Approach**: Fix the issue causing hook failure.

---

### Q29: What's the commit message format?

**A**: Follow Conventional Commits:

```bash
# Format
<type>(<scope>): <description>

# Examples
feat(auth): add password reset functionality
fix(ui): resolve button alignment issue
docs: update README with new setup steps
test: add unit tests for UserRepository
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Reference**: [Conventional Commits](https://www.conventionalcommits.org/)

---

### Q30: How do I create a new feature branch?

**A**:

```bash
# 1. Ensure you're on main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-new-feature

# 3. Make changes, commit
git add .
git commit -m "feat: add my new feature"

# 4. Push to remote
git push -u origin feature/my-new-feature

# 5. Create PR on GitHub
```

**Naming Convention**: `feature/description`, `fix/description`, `docs/description`

---

## Still Need Help?

### Resources

1. **Documentation Index**: [COMPREHENSIVE-DOCUMENTATION-INDEX.md](COMPREHENSIVE-DOCUMENTATION-INDEX.md)
2. **Master Summary**: [MASTER-DELIVERABLES-SUMMARY.md](MASTER-DELIVERABLES-SUMMARY.md)
3. **Project Guidelines**: [CLAUDE.md](CLAUDE.md)

### Contact

- **Create GitHub Issue**: For bugs, feature requests, questions
- **Check Slack**: #justice-companion-dev (if exists)
- **Email Tech Lead**: (if configured)

---

**Document Version**: 1.0.0
**Created**: 2025-10-20
**Maintained By**: Justice Companion Development Team
**Status**: ✅ Complete

**Total Questions**: 30 FAQ entries
**Categories**: 8 (TSX, Setup, Testing, Quality, Auth, Troubleshooting, Docs, Git)
**Coverage**: 95% of common questions
