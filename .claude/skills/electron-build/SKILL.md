---
name: electron-build
description: "Multi-platform Electron build orchestration for Justice Companion: handles Windows .exe, macOS .dmg, Linux .AppImage/.deb builds with better-sqlite3 native module rebuilds. Use when building releases, debugging build failures, or preparing production deployments."
allowed-tools: ["Bash", "Read", "Grep", "mcp__memory__*"]
---

# Electron Build Skill

## Purpose
Production-grade build orchestration for Electron desktop app with native module support.

## When Claude Uses This
- User requests "build for production" or "create release"
- Debugging "Electron failed to install" errors
- Before creating GitHub releases
- When asked about multi-platform builds

## Build Requirements

### Critical Constraints
1. **Node.js 20.18.0 LTS** - Electron 38.2.1 requires Node 20.x (NOT 22.x)
2. **pnpm only** - better-sqlite3 native module requires pnpm
3. **Rebuild sequence** - Must rebuild better-sqlite3 for Electron runtime

### Platform-Specific

| Platform | Output | Build Time | Requirements |
|----------|--------|------------|--------------|
| Windows  | `.exe` installer | 10-15 min | Visual Studio Build Tools |
| macOS    | `.dmg` disk image | 5-8 min | Xcode Command Line Tools |
| Linux    | `.AppImage` + `.deb` | 5-8 min | libsqlite3-dev |

## Build Workflow

### 1. Pre-Build Validation
```bash
# Verify Node version
node --version  # Must be v20.18.0

# Check pnpm lockfile
test -f pnpm-lock.yaml

# Ensure dependencies installed
pnpm list better-sqlite3
```

### 2. Rebuild Native Module
```bash
# Rebuild for Electron runtime
pnpm rebuild:electron

# Verify rebuild succeeded
pnpm electron:dev  # Should start without errors
```

### 3. Execute Build
```bash
# Build all platforms (requires macOS for .dmg)
pnpm build

# Platform-specific builds
pnpm build:win    # Windows .exe
pnpm build:mac    # macOS .dmg
pnpm build:linux  # Linux .AppImage + .deb
```

### 4. Verify Output
```bash
# Check release directory
ls -lh release/

# Validate installer size
# Windows: ~150-200MB
# macOS: ~200-250MB
# Linux: ~180-220MB
```

## Troubleshooting

### NODE_MODULE_VERSION Mismatch
**Symptom:** `Error: The module was compiled against a different Node.js version`
**Fix:**
```bash
nvm use 20
pnpm install
pnpm rebuild better-sqlite3
```

### Electron Failed to Install
**Symptom:** `Electron failed to install correctly`
**Fix:**
```bash
pnpm rebuild:electron
```

### ASAR Unpacking Errors
**Symptom:** `Error: ENOENT: no such file or directory, open 'app.asar/node_modules/...'`
**Fix:** Verify `asarUnpack` configuration in package.json:
```json
{
  "build": {
    "asarUnpack": ["node_modules/node-llama-cpp/**/*"]
  }
}
```

## CI/CD Integration

### GitHub Actions Release Workflow
```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'
      - run: pnpm install
      - run: pnpm build
```

## Example Usage

```typescript
// Claude automatically runs this skill when:
user: "Build the app for Windows production release"

// Claude executes:
// 1. Validates Node 20.18.0 is active
// 2. Runs pnpm rebuild:electron
// 3. Executes pnpm build:win
// 4. Verifies output in release/ directory
// 5. Stores build metadata in mcp__memory
```

## Output Format

**Build Report:**
- ✅ Node.js: v20.18.0 (correct version)
- ✅ Native Module: better-sqlite3 rebuilt for Electron
- ✅ Build: Windows installer created (187MB)
- ✅ Output: `release/Justice Companion Setup 1.0.0.exe`

**Next Steps:** Upload to GitHub release or deploy to distribution server.
