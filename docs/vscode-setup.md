# VS Code Setup for Justice Companion

**Purpose:** Configure VS Code for optimal development experience with auto-fix, real-time error detection, and TypeScript import extensions.

**Status:** Production-ready configuration
**Last Updated:** 2025-10-20

---

## Quick Start (5 Minutes)

### 1. Install Required Extensions

VS Code will automatically prompt you to install recommended extensions when you open the project. Click **"Install All"** or install manually:

**Essential Extensions:**
- **ESLint** (`dbaeumer.vscode-eslint`) - Auto-fix import extensions on save
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **TypeScript Next** (`ms-vscode.vscode-typescript-next`) - Latest TypeScript features

**Optional but Recommended:**
- **Vitest Explorer** (`vitest.explorer`) - Test runner integration
- **Playwright** (`ms-playwright.playwright`) - E2E test debugging
- **GitLens** (`eamodio.gitlens`) - Git history visualization
- **SQLite Viewer** (`qwtel.sqlite-viewer`) - Database inspection
- **TailwindCSS IntelliSense** (`bradlc.vscode-tailwindcss`) - CSS class autocomplete
- **Error Lens** (`usernamehw.errorlens`) - Inline error messages
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`) - Typo detection

### 2. Reload VS Code

After installing extensions:

```
Ctrl+Shift+P (Cmd+Shift+P on macOS)
→ Type: "Developer: Reload Window"
→ Press Enter
```

### 3. Verify Auto-Fix Works

Create a test file to verify configuration:

**File:** `src/test-auto-fix.ts`

```typescript
// ❌ Missing .ts extension (should auto-fix on save)
import { UserRepository } from './repositories/UserRepository';

// ❌ Wrong extension .js (should auto-fix to .ts on save)
import { logger } from './utils/logger.js';

export const test = () => {};
```

**Steps:**
1. Save the file: `Ctrl+S` (Cmd+S on macOS)
2. ESLint should automatically fix imports to:
   ```typescript
   import { UserRepository } from './repositories/UserRepository.ts';
   import { logger } from './utils/logger.ts';
   ```
3. Delete the test file: `rm src/test-auto-fix.ts`

---

## Configuration Details

### TypeScript Auto-Import Settings

**What They Do:**
```json
{
  "typescript.preferences.importModuleSpecifierEnding": "ts",
  "javascript.preferences.importModuleSpecifierEnding": "js"
}
```

**Effect:**
- When you use TypeScript's auto-import feature (e.g., typing `UserRepository` and selecting from autocomplete), VS Code will automatically add `.ts` extension
- Example: `import { UserRepository } from './repositories/UserRepository.ts';`
- Works for all relative imports (`./`, `../`)
- Does NOT affect npm package imports (e.g., `import { z } from 'zod';`)

### ESLint Auto-Fix on Save

**What It Does:**
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
  ]
}
```

**Effect:**
- Automatically fixes ESLint errors when you save a file
- Adds missing `.ts` extensions to relative imports
- Corrects `.js` extensions to `.ts` for TypeScript sources
- Fixes other linting issues (unused variables, formatting, etc.)

### Prettier Integration

**What It Does:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**Effect:**
- Automatically formats code on save
- Uses Prettier configuration from `.prettierrc` (if exists)
- Formats all file types: TypeScript, JSON, CSS, Markdown, etc.

---

## Real-Time Error Highlighting

### Built-in TypeScript Errors

VS Code shows TypeScript errors in real-time (red squiggly lines):

**Example:**
```typescript
// ❌ TypeScript error: Cannot find module './UserRepository' or its corresponding type declarations
import { UserRepository } from './repositories/UserRepository';
```

**Fix:** Add `.ts` extension
```typescript
// ✅ No error
import { UserRepository } from './repositories/UserRepository.ts';
```

### ESLint Errors (with Error Lens)

If you install **Error Lens** extension, ESLint errors appear inline:

**Before:**
```typescript
import { UserRepository } from './repositories/UserRepository';
// Red underline only
```

**After (with Error Lens):**
```typescript
import { UserRepository } from './repositories/UserRepository';
// ❌ Missing file extension "ts" for "./repositories/UserRepository" [import/extensions]
```

**Install Error Lens:**
```
Ctrl+Shift+X → Search "Error Lens" → Install
```

---

## Troubleshooting

### Issue: Auto-Fix Not Working

**Symptoms:**
- Saving file doesn't fix import extensions
- ESLint errors remain after save

**Solutions:**

1. **Check ESLint Extension is Active:**
   - Open Output panel: `Ctrl+Shift+U` (Cmd+Shift+U on macOS)
   - Select "ESLint" from dropdown
   - Look for "ESLint server is running" message

2. **Restart ESLint Server:**
   ```
   Ctrl+Shift+P → "ESLint: Restart ESLint Server"
   ```

3. **Check ESLint Configuration:**
   ```bash
   # Verify ESLint works from command line
   pnpm lint
   ```

4. **Reinstall Dependencies:**
   ```bash
   pnpm install
   ```

5. **Reload VS Code:**
   ```
   Ctrl+Shift+P → "Developer: Reload Window"
   ```

### Issue: TypeScript Auto-Import Not Adding Extensions

**Symptoms:**
- Using VS Code autocomplete doesn't add `.ts` extension
- Manual imports work, but autocomplete doesn't

**Solutions:**

1. **Verify Settings:**
   - Open Settings: `Ctrl+,` (Cmd+, on macOS)
   - Search: "importModuleSpecifierEnding"
   - Ensure "TypeScript › Preferences: Import Module Specifier Ending" is set to "ts"

2. **Check TypeScript Version:**
   ```bash
   # Should be 5.9.3 or higher
   pnpm list typescript
   ```

3. **Use Workspace TypeScript:**
   - Press `Ctrl+Shift+P`
   - Type: "TypeScript: Select TypeScript Version"
   - Choose "Use Workspace Version"

4. **Restart TypeScript Server:**
   ```
   Ctrl+Shift+P → "TypeScript: Restart TS Server"
   ```

### Issue: Extensions Not Recommended

**Symptoms:**
- VS Code doesn't prompt to install extensions

**Solutions:**

1. **Manually Open Extensions:**
   ```
   Ctrl+Shift+P → "Show Recommended Extensions"
   ```

2. **Verify `.vscode/extensions.json` exists:**
   ```bash
   cat .vscode/extensions.json
   ```

3. **Reinstall Extensions:**
   - Open Extensions panel: `Ctrl+Shift+X`
   - Search for extension ID (e.g., `dbaeumer.vscode-eslint`)
   - Click "Install"

### Issue: ESLint Performance Slow

**Symptoms:**
- ESLint takes >5 seconds to run
- VS Code lags when editing TypeScript files

**Solutions:**

1. **Enable ESLint Caching:**
   ```bash
   # Already enabled in package.json
   pnpm lint
   ```

2. **Exclude Large Directories:**
   - Already configured in `.vscode/settings.json`:
     ```json
     {
       "files.watcherExclude": {
         "**/node_modules/**": true,
         "**/dist/**": true,
         "**/release/**": true
       }
     }
     ```

3. **Disable TypeScript-Aware Rules (if needed):**
   - Edit `eslint.config.js` (or `.eslintrc.json`)
   - Comment out `parserOptions.project` for faster linting

### Issue: Prettier Conflicts with ESLint

**Symptoms:**
- File reformats on save, then ESLint errors appear
- Infinite loop of formatting/linting

**Solutions:**

1. **Install Prettier-ESLint Config:**
   ```bash
   pnpm add -D eslint-config-prettier
   ```

2. **Update ESLint Config:**
   ```javascript
   // eslint.config.js
   import prettier from 'eslint-config-prettier';

   export default [
     // ... existing config ...
     prettier, // Disables ESLint rules that conflict with Prettier
   ];
   ```

3. **Verify Prettier Configuration:**
   ```bash
   pnpm format:check
   ```

---

## Best Practices

### 1. Use VS Code Auto-Import Feature

**How:**
1. Start typing a class/function name (e.g., `UserRepository`)
2. Wait for autocomplete suggestions
3. Select from dropdown (with `.ts` extension shown)
4. Press `Enter`

**Result:**
```typescript
import { UserRepository } from './repositories/UserRepository.ts';
```

**Benefit:** Automatic `.ts` extension, no manual typing

### 2. Save Frequently

**Why:**
- Auto-fix runs on every save
- Catches errors early
- Prevents accumulation of linting issues

**Shortcut:**
- `Ctrl+S` (Windows/Linux)
- `Cmd+S` (macOS)
- Or enable auto-save: `File → Auto Save`

### 3. Review ESLint Output

**How:**
1. Open Problems panel: `Ctrl+Shift+M` (Cmd+Shift+M on macOS)
2. Filter by "ESLint" source
3. Click on error to navigate to file

**Example:**
```
Problems (2)
├── src/repositories/UserRepository.ts
│   └── Missing file extension "ts" for "../models/User" [import/extensions]
└── src/services/AuthenticationService.ts
    └── Missing file extension "ts" for "../repositories/UserRepository" [import/extensions]
```

### 4. Run Manual Linting Before Committing

**Why:**
- Catches issues auto-fix couldn't resolve
- Ensures CI/CD pipeline passes

**Command:**
```bash
pnpm lint
```

**Fix Issues:**
```bash
pnpm lint:fix
```

### 5. Keep Extensions Updated

**How:**
1. Open Extensions panel: `Ctrl+Shift+X`
2. Click "Update" button on outdated extensions
3. Reload VS Code after updates

**Recommended Update Frequency:** Weekly

---

## Advanced Configuration

### Multi-Root Workspaces

If you have multiple projects in one VS Code workspace:

**File:** `.code-workspace`

```json
{
  "folders": [
    { "path": "." },
    { "path": "../another-project" }
  ],
  "settings": {
    "typescript.preferences.importModuleSpecifierEnding": "ts",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  }
}
```

### Project-Specific Settings Override

**File:** `.vscode/settings.json` (local to Justice Companion)

```json
{
  // Override global VS Code settings
  "editor.tabSize": 2,          // Use 2 spaces (not 4)
  "editor.insertSpaces": true,  // Use spaces (not tabs)
  "editor.formatOnSave": true   // Always format on save
}
```

### Custom ESLint Rules for Electron

**File:** `eslint.config.js`

```javascript
export default [
  {
    files: ['electron/**/*.ts'],
    rules: {
      // Electron-specific rules
      'no-console': 'off', // Allow console.log in Electron main process
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // React-specific rules
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

---

## Command Palette Cheat Sheet

**Open Command Palette:** `Ctrl+Shift+P` (Cmd+Shift+P on macOS)

**Useful Commands:**

| Command | Purpose |
|---------|---------|
| `Developer: Reload Window` | Restart VS Code without closing |
| `ESLint: Restart ESLint Server` | Restart ESLint if auto-fix stops working |
| `TypeScript: Restart TS Server` | Restart TypeScript if autocomplete breaks |
| `TypeScript: Select TypeScript Version` | Choose workspace TypeScript version |
| `Show Recommended Extensions` | Show project-specific extension recommendations |
| `Preferences: Open User Settings (JSON)` | Edit global VS Code settings |
| `Preferences: Open Workspace Settings (JSON)` | Edit project-specific settings |
| `Format Document` | Manually format current file (Shift+Alt+F) |
| `Organize Imports` | Sort and remove unused imports |

---

## Keyboard Shortcuts

**Essential Shortcuts:**

| Shortcut (Windows/Linux) | Shortcut (macOS) | Action |
|--------------------------|------------------|--------|
| `Ctrl+S` | `Cmd+S` | Save file (triggers auto-fix) |
| `Shift+Alt+F` | `Shift+Option+F` | Format document |
| `Ctrl+Shift+M` | `Cmd+Shift+M` | Open Problems panel |
| `Ctrl+Shift+U` | `Cmd+Shift+U` | Open Output panel |
| `Ctrl+Shift+X` | `Cmd+Shift+X` | Open Extensions panel |
| `Ctrl+Shift+P` | `Cmd+Shift+P` | Open Command Palette |
| `Ctrl+,` | `Cmd+,` | Open Settings |
| `Ctrl+Shift+.` | `Cmd+Shift+.` | Breadcrumb navigation |
| `F2` | `F2` | Rename symbol (refactor) |
| `F12` | `F12` | Go to definition |

---

## Related Documentation

- [ESLint Import Extension Enforcement](./ESLINT-IMPORT-ENFORCEMENT.md) - Full ESLint configuration guide
- [TSX Import Resolution Guide](./TSX-IMPORT-RESOLUTION-GUIDE.md) - Technical details on import resolution
- [TSX Import Quick Reference](../TSX-IMPORT-QUICK-REF.md) - Developer cheat sheet
- [CLAUDE.md](../CLAUDE.md) - Project architecture and setup

---

## Summary

### What You Get with This Setup

✅ **Auto-Fix on Save**
- Missing `.ts` extensions added automatically
- Wrong `.js` extensions corrected to `.ts`
- Other ESLint errors fixed automatically

✅ **Real-Time Error Detection**
- TypeScript errors highlighted in red
- ESLint errors shown in Problems panel
- Optional inline error messages with Error Lens

✅ **Smart Auto-Import**
- TypeScript autocomplete adds `.ts` extensions
- No manual typing of extensions required
- Works for all relative imports

✅ **Consistent Formatting**
- Prettier formats code on save
- Consistent style across entire project
- No formatting debates in PRs

### Quick Checklist

- [ ] Install ESLint extension (`dbaeumer.vscode-eslint`)
- [ ] Install Prettier extension (`esbenp.prettier-vscode`)
- [ ] Reload VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")
- [ ] Test auto-fix with sample file (see Quick Start)
- [ ] Verify TypeScript auto-import adds `.ts` extensions
- [ ] Run `pnpm lint` to check for existing issues
- [ ] Optional: Install Error Lens for inline errors
- [ ] Optional: Enable auto-save (`File → Auto Save`)

### Support

**If you encounter issues:**
1. Check [Troubleshooting](#troubleshooting) section above
2. Run `pnpm lint` to verify ESLint works from CLI
3. Check ESLint Output panel: `Ctrl+Shift+U` → Select "ESLint"
4. Restart VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
5. Ask team for help in development channel

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-20
**Maintained By:** Justice Companion Development Team
