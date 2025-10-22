---
name: release-workflow
description: "End-to-end release automation for Justice Companion: version bumping, changelog generation, multi-platform builds (Windows/Mac/Linux), GitHub release creation. Use when preparing production releases, hotfixes, or beta releases."
allowed-tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob", "mcp__github__*"]
---

# Release Workflow Skill

## Purpose
Automate the entire release process from version bump to published GitHub release with installers.

## When Claude Uses This
- User requests "create release"
- Preparing production deployment
- Publishing beta/RC versions
- Creating hotfix releases
- Updating version numbers

## Release Types

| Type | Version Bump | Changelog | Build All Platforms | Use Case |
|------|-------------|-----------|---------------------|----------|
| **Major** | 1.0.0 → 2.0.0 | Required | Yes | Breaking changes |
| **Minor** | 1.0.0 → 1.1.0 | Required | Yes | New features |
| **Patch** | 1.0.0 → 1.0.1 | Optional | Yes | Bug fixes |
| **Beta** | 1.0.0 → 1.1.0-beta.1 | Optional | No | Testing |
| **Hotfix** | 1.0.0 → 1.0.1 | Required | Platform-specific | Emergency fix |

## Release Workflow

### Phase 1: Pre-Release Validation

```bash
# 1. Ensure clean working directory
git status
# Should show: "nothing to commit, working tree clean"

# 2. Run full test suite
pnpm test
pnpm test:e2e

# 3. Type check
pnpm type-check

# 4. Lint check
pnpm lint

# 5. Build validation
pnpm build

# 6. Check Node version
node --version  # Must be v20.18.0
```

### Phase 2: Version Bump

```bash
# Use npm version (updates package.json + creates git tag)
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# For pre-releases
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0
npm version prerelease --preid=rc    # 1.0.0 → 1.0.1-rc.0
```

### Phase 3: Changelog Generation

```typescript
// scripts/generate-changelog.ts
import { execSync } from 'child_process';
import fs from 'fs';

interface Commit {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
}

function generateChangelog(fromTag: string, toTag: string): string {
  // Get commits between tags
  const gitLog = execSync(
    `git log ${fromTag}..${toTag} --pretty=format:"%H|%s|%b"`
  ).toString();

  const commits = gitLog
    .split('\n')
    .filter(Boolean)
    .map(parseCommit);

  // Group by type
  const grouped = {
    breaking: [] as Commit[],
    feat: [] as Commit[],
    fix: [] as Commit[],
    perf: [] as Commit[],
    docs: [] as Commit[],
    chore: [] as Commit[],
  };

  for (const commit of commits) {
    if (commit.breaking) {
      grouped.breaking.push(commit);
    } else if (grouped[commit.type]) {
      grouped[commit.type].push(commit);
    }
  }

  // Generate changelog markdown
  let changelog = `# ${toTag}\n\n`;
  changelog += `Release Date: ${new Date().toISOString().split('T')[0]}\n\n`;

  if (grouped.breaking.length > 0) {
    changelog += '## ⚠️ BREAKING CHANGES\n\n';
    for (const commit of grouped.breaking) {
      changelog += `- ${commit.subject} (${commit.hash.substring(0, 7)})\n`;
    }
    changelog += '\n';
  }

  if (grouped.feat.length > 0) {
    changelog += '## ✨ Features\n\n';
    for (const commit of grouped.feat) {
      changelog += `- ${commit.subject} (${commit.hash.substring(0, 7)})\n`;
    }
    changelog += '\n';
  }

  if (grouped.fix.length > 0) {
    changelog += '## 🐛 Bug Fixes\n\n';
    for (const commit of grouped.fix) {
      changelog += `- ${commit.subject} (${commit.hash.substring(0, 7)})\n`;
    }
    changelog += '\n';
  }

  if (grouped.perf.length > 0) {
    changelog += '## ⚡ Performance\n\n';
    for (const commit of grouped.perf) {
      changelog += `- ${commit.subject} (${commit.hash.substring(0, 7)})\n`;
    }
    changelog += '\n';
  }

  return changelog;
}

function parseCommit(line: string): Commit {
  const [hash, subject, body] = line.split('|');
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);

  if (!match) {
    return {
      hash,
      type: 'chore',
      subject,
      breaking: body?.includes('BREAKING CHANGE') || false,
    };
  }

  const [, type, scope, message] = match;

  return {
    hash,
    type,
    scope,
    subject: message,
    body,
    breaking: body?.includes('BREAKING CHANGE') || false,
  };
}
```

### Phase 4: Multi-Platform Build

```bash
# Build for all platforms
pnpm build:win   # Windows .exe (10-15 min)
pnpm build:mac   # macOS .dmg (5-8 min)
pnpm build:linux # Linux .AppImage + .deb (5-8 min)

# Or build all at once
pnpm electron:build

# Verify outputs
ls release/
# Should contain:
# - Justice-Companion-Setup-1.0.0.exe (Windows)
# - Justice-Companion-1.0.0.dmg (macOS)
# - Justice-Companion-1.0.0.AppImage (Linux)
# - justice-companion_1.0.0_amd64.deb (Debian)
```

### Phase 5: GitHub Release

```bash
# Using GitHub CLI (gh)
gh release create v1.0.0 \
  --title "Justice Companion v1.0.0" \
  --notes-file CHANGELOG.md \
  release/Justice-Companion-Setup-1.0.0.exe \
  release/Justice-Companion-1.0.0.dmg \
  release/Justice-Companion-1.0.0.AppImage \
  release/justice-companion_1.0.0_amd64.deb

# Or using GitHub MCP
mcp__github__create_release \
  --owner justicecompanion \
  --repo justice-companion \
  --tag v1.0.0 \
  --name "Justice Companion v1.0.0" \
  --body "$(cat CHANGELOG.md)"
```

## Automated Release Script

```bash
# scripts/release.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface ReleaseOptions {
  type: 'major' | 'minor' | 'patch' | 'beta' | 'rc';
  skipTests?: boolean;
  dryRun?: boolean;
}

async function createRelease(options: ReleaseOptions) {
  console.log('🚀 Starting release process...\n');

  // Step 1: Validation
  console.log('1️⃣ Validating environment...');
  validateEnvironment();

  // Step 2: Run tests (unless skipped)
  if (!options.skipTests) {
    console.log('2️⃣ Running tests...');
    execSync('pnpm test', { stdio: 'inherit' });
    execSync('pnpm test:e2e', { stdio: 'inherit' });
  }

  // Step 3: Version bump
  console.log('3️⃣ Bumping version...');
  const versionCmd = options.type === 'beta' || options.type === 'rc'
    ? `npm version prerelease --preid=${options.type}`
    : `npm version ${options.type}`;

  const newVersion = execSync(versionCmd).toString().trim();
  console.log(`   New version: ${newVersion}`);

  // Step 4: Generate changelog
  console.log('4️⃣ Generating changelog...');
  const previousTag = execSync('git describe --tags --abbrev=0 HEAD~1')
    .toString()
    .trim();
  const changelog = generateChangelog(previousTag, newVersion);
  fs.writeFileSync('CHANGELOG.md', changelog);
  console.log('   Changelog generated');

  // Step 5: Build for all platforms
  console.log('5️⃣ Building for all platforms...');
  console.log('   This may take 20-30 minutes...');

  execSync('pnpm build:win', { stdio: 'inherit' });
  execSync('pnpm build:mac', { stdio: 'inherit' });
  execSync('pnpm build:linux', { stdio: 'inherit' });

  // Step 6: Verify build outputs
  console.log('6️⃣ Verifying build outputs...');
  const releaseDir = 'release';
  const expectedFiles = [
    `Justice-Companion-Setup-${newVersion}.exe`,
    `Justice-Companion-${newVersion}.dmg`,
    `Justice-Companion-${newVersion}.AppImage`,
    `justice-companion_${newVersion}_amd64.deb`,
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(releaseDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Build output missing: ${file}`);
    }
    const stats = fs.statSync(filePath);
    console.log(`   ✓ ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  if (options.dryRun) {
    console.log('\n🏁 Dry run complete. No changes pushed.');
    return;
  }

  // Step 7: Push to GitHub
  console.log('7️⃣ Pushing to GitHub...');
  execSync(`git push origin main`, { stdio: 'inherit' });
  execSync(`git push origin ${newVersion}`, { stdio: 'inherit' });

  // Step 8: Create GitHub release
  console.log('8️⃣ Creating GitHub release...');
  const releaseNotes = fs.readFileSync('CHANGELOG.md', 'utf-8');

  execSync(
    `gh release create ${newVersion} ` +
    `--title "Justice Companion ${newVersion}" ` +
    `--notes "${releaseNotes}" ` +
    expectedFiles.map(f => `release/${f}`).join(' '),
    { stdio: 'inherit' }
  );

  console.log('\n✅ Release complete!');
  console.log(`   Version: ${newVersion}`);
  console.log(`   URL: https://github.com/justicecompanion/justice-companion/releases/tag/${newVersion}`);
}

function validateEnvironment() {
  // Check Node version
  const nodeVersion = process.version;
  if (!nodeVersion.startsWith('v20.')) {
    throw new Error(`Node.js 20.x required, got ${nodeVersion}`);
  }

  // Check git status
  const status = execSync('git status --porcelain').toString();
  if (status.trim() !== '') {
    throw new Error('Working directory not clean. Commit or stash changes.');
  }

  // Check branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  if (branch !== 'main') {
    throw new Error(`Must be on main branch, currently on ${branch}`);
  }

  // Check gh CLI
  try {
    execSync('gh --version');
  } catch {
    throw new Error('GitHub CLI (gh) not installed');
  }

  console.log('   ✓ Node.js 20.x');
  console.log('   ✓ Clean working directory');
  console.log('   ✓ On main branch');
  console.log('   ✓ GitHub CLI installed');
}
```

## Usage Examples

```bash
# Patch release (bug fix)
pnpm release patch

# Minor release (new feature)
pnpm release minor

# Major release (breaking change)
pnpm release major

# Beta release
pnpm release beta

# Dry run (no push/publish)
pnpm release minor --dry-run

# Skip tests (not recommended)
pnpm release patch --skip-tests
```

## Hotfix Workflow

For emergency fixes:

```bash
# 1. Create hotfix branch from latest release
git checkout -b hotfix/1.0.1 v1.0.0

# 2. Apply fix
git commit -m "fix: critical security issue"

# 3. Build affected platform only
pnpm build:win  # Or specific platform

# 4. Create patch release
pnpm release patch

# 5. Merge back to main
git checkout main
git merge hotfix/1.0.1
git push origin main
```

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] No linting errors
- [ ] Type check passes
- [ ] Clean git status
- [ ] On main branch
- [ ] Node 20.x active

### During Release
- [ ] Version bumped
- [ ] Changelog generated
- [ ] All platforms built successfully
- [ ] Build outputs verified

### Post-Release
- [ ] GitHub release created
- [ ] Installers uploaded
- [ ] Release notes published
- [ ] Documentation updated
- [ ] Team notified

## Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "release": "tsx scripts/release.ts",
    "release:patch": "tsx scripts/release.ts patch",
    "release:minor": "tsx scripts/release.ts minor",
    "release:major": "tsx scripts/release.ts major",
    "release:beta": "tsx scripts/release.ts beta",
    "changelog": "tsx scripts/generate-changelog.ts"
  }
}
```

## GitHub Actions Integration

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

      - name: Build
        run: pnpm electron:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-build
          path: release/

  release:
    needs: build
    runs-on: ubuntu-latest

    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            *-build/*
          body_path: CHANGELOG.md
```

## References
- Semantic Versioning: https://semver.org/
- Conventional Commits: https://www.conventionalcommits.org/
- GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github
- Electron Builder: https://www.electron.build/
