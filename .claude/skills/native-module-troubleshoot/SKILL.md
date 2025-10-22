---
name: native-module-troubleshoot
description: "Troubleshoots better-sqlite3 native module issues in Justice Companion: NODE_MODULE_VERSION mismatches, rebuild failures, Electron compatibility errors. Use when encountering 'Electron failed to install', module version errors, or SQLite binding issues."
allowed-tools: ["Read", "Bash", "Grep", "mcp__memory__*"]
---

# Native Module Troubleshooting Skill

## Purpose
Diagnose and fix better-sqlite3 native module issues for Justice Companion's Electron 38 + Node.js 20.18.0 environment.

## When Claude Uses This
- `NODE_MODULE_VERSION` mismatch errors
- "Electron failed to install correctly" messages
- SQLite binding errors
- After Node.js version changes
- After `pnpm install` failures

## Critical Constraints

### Version Requirements
```
MUST use:
├── Node.js 20.18.0 LTS (NOT 22.x)
├── Electron 38.2.1
├── better-sqlite3 (native module)
└── pnpm (NOT npm or yarn)
```

**Why:** Electron 38 requires Node.js 20.x. better-sqlite3 must be compiled for the correct runtime.

## Common Errors & Fixes

### Error 1: NODE_MODULE_VERSION Mismatch

**Symptom:**
```
Error: The module 'better-sqlite3' was compiled against a different Node.js version.
Using Node.js 20.18.0, but module expects Node.js 22.x
```

**Cause:** better-sqlite3 compiled for wrong Node version

**Fix:**
```bash
# 1. Verify Node version
node --version  # MUST be v20.18.0

# If wrong version:
nvm use 20
# OR
fnm use 20

# 2. Clear node_modules
rm -rf node_modules
rm pnpm-lock.yaml

# 3. Reinstall dependencies
pnpm install

# 4. Verify rebuild
pnpm rebuild better-sqlite3
```

---

### Error 2: Electron Runtime Mismatch

**Symptom:**
```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

**Cause:** better-sqlite3 compiled for Node.js, but Electron needs different ABI

**Fix:**
```bash
# 1. Rebuild for Electron runtime
pnpm rebuild:electron

# This runs:
electron-rebuild -f -w better-sqlite3

# 2. Verify Electron version
pnpm electron --version  # Should be v38.2.1

# 3. Test Electron app
pnpm electron:dev
```

---

### Error 3: Test Failures (Node Runtime)

**Symptom:**
```
Tests fail with:
Error: Cannot find module 'better-sqlite3'
```

**Cause:** Tests run in Node.js (not Electron), need Node runtime rebuild

**Fix:**
```bash
# 1. Rebuild for Node.js runtime
pnpm rebuild:node

# This runs:
pnpm rebuild better-sqlite3

# 2. Run tests
pnpm test

# 3. Before running Electron again, rebuild for Electron:
pnpm rebuild:electron
```

---

### Error 4: Platform Mismatch (CI/CD)

**Symptom:**
```
GitHub Actions fails:
Module was compiled on Windows but CI runs Linux
```

**Cause:** Native modules are platform-specific

**Fix:**
```yaml
# .github/workflows/ci.yml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'  # CRITICAL: Must be 20.x

      - run: pnpm install
      - run: pnpm rebuild:node  # CRITICAL: Rebuild for CI platform
      - run: pnpm test
```

---

### Error 5: Multiple Node Versions Installed

**Symptom:**
```
Works locally, breaks on teammate's machine
```

**Cause:** Different Node.js versions

**Fix:**
```bash
# 1. Create .nvmrc file
echo "20.18.0" > .nvmrc

# 2. Team uses:
nvm use  # Auto-reads .nvmrc

# 3. Verify version
node --version  # Should be v20.18.0

# 4. Reinstall
pnpm install
```

---

## Diagnostic Workflow

### Step 1: Verify Environment
```bash
# Check Node version
node --version
# Expected: v20.18.0

# Check npm registry
npm config get registry
# Expected: https://registry.npmjs.org/

# Check pnpm version
pnpm --version
# Expected: 9.x

# Check Electron version
pnpm electron --version
# Expected: v38.2.1
```

### Step 2: Check Module Installation
```bash
# Verify better-sqlite3 installed
pnpm list better-sqlite3
# Should show version and path

# Check module structure
ls node_modules/better-sqlite3/build/Release/
# Should contain: better_sqlite3.node
```

### Step 3: Test Module Loading
```bash
# Test in Node.js
node -e "require('better-sqlite3')"
# Should succeed with no output

# Test in Electron
pnpm electron -e "require('better-sqlite3')"
# Should succeed with no output
```

### Step 4: Rebuild Decision Tree
```
Are you running tests?
├── YES → pnpm rebuild:node
└── NO → Are you running Electron?
    ├── YES → pnpm rebuild:electron
    └── NO → Check Node version (must be 20.18.0)
```

---

## Rebuild Scripts (package.json)

```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3",
    "rebuild:electron": "electron-rebuild -f -w better-sqlite3",
    "rebuild:node": "pnpm rebuild better-sqlite3"
  }
}
```

**How They Work:**
- `postinstall`: Auto-runs after `pnpm install` → rebuilds for Electron
- `rebuild:electron`: Manual rebuild for Electron runtime
- `rebuild:node`: Manual rebuild for Node.js runtime (tests)

---

## Platform-Specific Notes

### Windows (Primary Development)
```powershell
# Install Visual Studio Build Tools (if missing)
winget install Microsoft.VisualStudio.2022.BuildTools

# Verify C++ compiler
where cl.exe
# Should return: C:\Program Files\...\cl.exe

# Rebuild native modules
pnpm rebuild:electron
```

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Rebuild native modules
pnpm rebuild:electron
```

### Linux
```bash
# Install build essentials
sudo apt-get install build-essential libsqlite3-dev

# Rebuild native modules
pnpm rebuild:electron
```

---

## Troubleshooting Checklist

### Before Asking for Help:
- [ ] Node.js version is exactly 20.18.0
- [ ] Using `pnpm` (not npm or yarn)
- [ ] Deleted `node_modules` and `pnpm-lock.yaml`
- [ ] Ran `pnpm install` fresh
- [ ] Ran `pnpm rebuild:electron` for Electron
- [ ] Ran `pnpm rebuild:node` for tests
- [ ] Checked `node_modules/better-sqlite3/build/Release/` exists
- [ ] Verified Electron version is 38.2.1

### Still Broken?
```bash
# Nuclear option: Clear all caches
rm -rf node_modules
rm pnpm-lock.yaml
rm -rf ~/.pnpm-store
rm -rf %LOCALAPPDATA%\npm-cache

# Fresh install
pnpm install
pnpm rebuild:electron

# Test
pnpm electron:dev
```

---

## Prevention Tips

### 1. Lock Node Version
```json
// package.json
{
  "engines": {
    "node": "20.18.0",
    "pnpm": ">=9.0.0"
  }
}
```

### 2. Use .nvmrc
```bash
# .nvmrc
20.18.0
```

### 3. Document in CLAUDE.md
```markdown
## Critical Requirements
- Node.js 20.18.0 LTS (NOT 22.x)
- pnpm only (NOT npm/yarn)
- Rebuild after install: pnpm rebuild:electron
```

### 4. Add Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
NODE_VERSION=$(node --version)
if [ "$NODE_VERSION" != "v20.18.0" ]; then
  echo "ERROR: Node.js must be v20.18.0 (currently $NODE_VERSION)"
  exit 1
fi
```

---

## Quick Reference

| Command | When to Use |
|---------|-------------|
| `pnpm rebuild:electron` | After install, before running Electron |
| `pnpm rebuild:node` | Before running tests |
| `nvm use 20` | Switch to Node 20.18.0 |
| `pnpm install` | Fresh install dependencies |
| `electron-rebuild -f -w better-sqlite3` | Force rebuild for Electron |

---

## Root Cause Analysis

### Why This Happens:
1. **Native modules are platform + runtime specific**
   - Windows .node ≠ macOS .node ≠ Linux .node
   - Node.js ABI ≠ Electron ABI

2. **Electron uses Chromium's V8, not Node's V8**
   - Different module version numbers
   - Requires `electron-rebuild` tool

3. **better-sqlite3 is pure C++**
   - Must be compiled for target platform
   - No pure JavaScript fallback

4. **Tests run in Node, app runs in Electron**
   - Need different builds for different runtimes
   - `rebuild:node` vs `rebuild:electron`

---

## Success Indicators

```bash
# ✅ Good: Electron starts without errors
pnpm electron:dev
# Output: Electron window opens

# ✅ Good: Tests pass
pnpm test
# Output: All tests passing

# ✅ Good: Module loads
node -e "require('better-sqlite3')"
# Output: (no errors)
```

---

**Golden Rule:** When in doubt, delete `node_modules`, reinstall, rebuild for your runtime. Node version MUST be 20.18.0.
