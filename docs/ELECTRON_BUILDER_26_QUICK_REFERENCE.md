# electron-builder 26 Quick Reference

**Version:** 26.0.12
**Status:** ✅ Production Ready
**Last Updated:** 2025-11-16

---

## Quick Commands

```bash
# Windows build (primary platform)
npm run build:win

# Linux build (requires Linux/WSL/Docker)
npm run build:linux

# macOS build (requires macOS)
npm run build:mac

# All platforms
npm run build

# Dev mode (no build)
npm run electron:dev
```

---

## Expected Outputs

### Windows
```
release/Justice Companion Setup 1.0.0.exe  (194 MB)
release/Justice Companion Setup 1.0.0.exe.blockmap
```

### Linux
```
release/Justice Companion-1.0.0.AppImage
release/justice-companion_1.0.0_amd64.deb
```

### macOS
```
release/Justice Companion-1.0.0.dmg
```

---

## Known Warnings (Safe to Ignore)

### 1. Node Engine Mismatch
```
npm warn EBADENGINE Unsupported engine {
  package: '@electron/rebuild@4.0.1',
  required: { node: '>=22.12.0' },
  current: { node: 'v20.18.0' }
}
```
**Action:** Ignore (builds work correctly)

### 2. ESBuild import.meta
```
⚠️ "import.meta" is not available with the "cjs" output format
```
**Action:** Ignore (pre-existing, non-blocking)

### 3. Chunk Size Warning
```
(!) Some chunks are larger than 500 kB after minification
```
**Action:** Ignore (performance is acceptable)

---

## Build Failures & Solutions

### Problem: TailwindCSS PostCSS Error
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin
```

**Solution:** Already fixed in postcss.config.mjs
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // ✅ Correct for TailwindCSS v4
    autoprefixer: {}
  }
};
```

### Problem: Linux Build Fails on Windows
```
cannot execute mksquashfs: file does not exist
```

**Solution:** Expected - use Linux/WSL/Docker for Linux builds
```bash
# Option 1: WSL
wsl npm run build:linux

# Option 2: Docker
docker run --rm -v "$(pwd):/project" electronuserland/builder:wine npm run build:linux

# Option 3: GitHub Actions (recommended)
git push  # CI builds Linux automatically
```

### Problem: better-sqlite3 Module Error
```
Error: The module was compiled against a different Node.js version
```

**Solution:** Rebuild native modules
```bash
npm run rebuild:electron
```

---

## Rollback (Emergency)

If electron-builder 26 causes critical issues:

```bash
npm install electron-builder@25.1.8 --save-dev
# Keep @tailwindcss/postcss (DO NOT remove)
npm run build:win  # Verify
git add package.json package-lock.json
git commit -m "chore: rollback electron-builder to 25.1.8"
```

---

## Dependencies Matrix

| Package | Version | Required For |
|---------|---------|--------------|
| electron-builder | 26.0.12 | Multi-platform builds |
| @tailwindcss/postcss | 4.1.17 | TailwindCSS v4 support |
| tailwindcss | 4.1.17 | CSS framework |
| electron | 38.7.0 | Runtime |
| Node.js | 20.18.0 LTS | Development |

---

## Build Pipeline Flow

```mermaid
graph TD
    A[npm run build:win] --> B[node scripts/build-electron-esbuild.mjs]
    B --> C[ESBuild: Compile Electron main process]
    C --> D[vite build: Bundle renderer process]
    D --> E[electron-builder: Package app]
    E --> F[Download Electron 38.7.0]
    F --> G[@electron/rebuild: Rebuild native modules]
    G --> H[Create NSIS installer]
    H --> I[Output: release/Justice Companion Setup 1.0.0.exe]
```

---

## Troubleshooting Checklist

- [ ] Node.js 20.18.0 LTS active? (`node --version`)
- [ ] npm 10.8.2 installed? (`npm --version`)
- [ ] Dependencies installed? (`npm install`)
- [ ] Vite build succeeds? (`npm run build`)
- [ ] Electron main process compiles? (`node scripts/build-electron-esbuild.mjs`)
- [ ] PostCSS configured correctly? (Check `postcss.config.mjs`)
- [ ] Better-sqlite3 rebuilt? (`npm run rebuild:electron`)
- [ ] Release directory writable? (`mkdir release`)

---

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: release/*
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 26.0.12 | 2025-11-16 | Initial migration from 25.1.8 |
| 25.1.8 | (previous) | Stable baseline |

---

## Support Resources

- **Full Migration Report:** `docs/ELECTRON_BUILDER_26_MIGRATION_REPORT.md`
- **Project Documentation:** `CLAUDE.md`
- **electron-builder Docs:** https://www.electron.build
- **GitHub Issues:** https://github.com/electron-userland/electron-builder/issues

---

**Questions?** Check the full migration report or open an issue.
