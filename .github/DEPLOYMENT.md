# Deployment Guide

This guide covers the complete deployment process for Justice Companion, including CI/CD pipeline configuration, security considerations, and release procedures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [CI/CD Pipeline Overview](#cicd-pipeline-overview)
- [Environment Setup](#environment-setup)
- [Release Process](#release-process)
- [Security Configuration](#security-configuration)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: 20.18.0 LTS (NOT Node 22.x)
- **pnpm**: 9.15.0 or higher
- **Git**: Latest version
- **GitHub Account**: With repository access
- **Code Signing Certificates** (optional but recommended):
  - macOS: Apple Developer certificate
  - Windows: Code signing certificate (.pfx)

### Required Secrets

Configure the following secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `SNYK_TOKEN` | Snyk API token for security scanning | Optional |
| `MACOS_CERTIFICATE` | Base64-encoded macOS signing certificate | Optional |
| `MACOS_CERTIFICATE_PASSWORD` | Password for macOS certificate | Optional |
| `WINDOWS_CERTIFICATE` | Base64-encoded Windows signing certificate (.pfx) | Optional |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for Windows certificate | Optional |
| `APPLE_ID` | Apple ID for notarization | Optional |
| `APPLE_ID_PASSWORD` | App-specific password for Apple ID | Optional |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Optional |

---

## CI/CD Pipeline Overview

### Workflows

Justice Companion uses 6 GitHub Actions workflows:

#### 1. **CI Pipeline** (`.github/workflows/ci.yml`)

**Triggers**: Push/PR to `main` and `develop` branches

**Jobs**:
- **Quality & Security Checks**: Formatting, linting, type checking, vulnerability scanning
- **Test Suite**: Unit tests on Ubuntu, Windows, macOS (with 80% coverage threshold)
- **E2E Tests**: Playwright tests on Ubuntu and Windows
- **Build Verification**: Verify builds complete successfully on all platforms
- **Performance Tests**: Database and encryption benchmarks
- **SAST Analysis**: CodeQL security analysis

**Quality Gates**:
- ✅ All lint/format/type checks must pass
- ✅ Test coverage ≥ 80%
- ✅ No critical/high security vulnerabilities
- ✅ No secrets in codebase
- ✅ Bundle size < 50MB
- ✅ All tests passing

**Duration**: ~15-20 minutes

#### 2. **Release Pipeline** (`.github/workflows/release.yml`)

**Triggers**: Version tags (e.g., `v1.0.0`, `v1.2.3-beta.1`)

**Jobs**:
- **Pre-release Security Validation**: Blocks release if critical vulnerabilities found
- **Build Release**: Builds Windows .exe, macOS .dmg, Linux .AppImage + .deb
- **Create GitHub Release**: Auto-generates release notes and uploads installers
- **Verify Release**: Confirms release was created successfully
- **Deploy Updates**: (Optional) Deploy to auto-update server

**Security Checks**:
- ❌ **BLOCKS RELEASE** if critical/high vulnerabilities found
- ❌ **BLOCKS RELEASE** if secrets detected in codebase
- ✅ Code signing (when certificates configured)
- ✅ SHA256 checksum generation

**Duration**: ~30-40 minutes

#### 3. **Quality Gate** (`.github/workflows/quality.yml`)

**Triggers**: Pull requests to `main` and `develop`

**Features**:
- Automated PR comments with quality report
- Coverage analysis with visual reports
- Bundle size tracking
- Security audit results
- Actionable fix suggestions

**Reports**:
- Formatting status
- Lint errors/warnings
- Type checking results
- Test coverage metrics
- Security vulnerabilities
- Bundle size analysis

#### 4. **Security Scanning** (`.github/workflows/security.yml`)

**Triggers**:
- Daily at 2 AM UTC (cron)
- Push to `main`
- Pull requests
- Manual trigger

**Scans**:
- **Dependency vulnerabilities**: npm audit, Trivy, Snyk
- **Secret detection**: GitLeaks, TruffleHog
- **SAST**: CodeQL with security-extended queries
- **License compliance**: Checks for forbidden licenses (GPL, AGPL, etc.)
- **SBOM generation**: CycloneDX format

**Outputs**:
- SARIF reports uploaded to GitHub Security tab
- License compliance report
- Software Bill of Materials (SBOM)

#### 5. **Dependency Management** (`.github/workflows/dependency-update.yml`)

**Triggers**:
- Weekly on Monday at 9 AM UTC
- Manual trigger

**Automation**:
- **Safe updates**: Automated PR for patch/minor version updates
- **Security fixes**: High-priority PR for vulnerability fixes
- **Testing**: All updates tested before PR creation

**PR Labels**:
- `dependencies`: All dependency updates
- `security`: Security-related updates
- `priority-high`: Urgent security fixes

#### 6. **Performance Monitoring** (`.github/workflows/performance.yml`)

**Triggers**:
- Push to `main`/`develop`
- Pull requests
- Weekly on Sunday at 3 AM UTC
- Manual trigger

**Benchmarks**:
- Database insert/query/pagination performance
- Encryption/decryption throughput
- Bundle size tracking
- Memory usage analysis
- Application startup time

---

## Environment Setup

### Local Development

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd Justice-Companion
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Create `.env` file**:
   ```bash
   # Generate encryption key
   node scripts/generate-encryption-key.js

   # Or manually on Linux/macOS:
   openssl rand -base64 32

   # Or manually on Windows PowerShell:
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

   Create `.env`:
   ```env
   ENCRYPTION_KEY_BASE64=<your-generated-key>
   ```

4. **Run migrations**:
   ```bash
   pnpm db:migrate
   ```

5. **Start development**:
   ```bash
   pnpm electron:dev
   ```

### CI/CD Environment

#### Enable Workflows

1. Navigate to repository **Settings > Actions > General**
2. Enable **"Allow all actions and reusable workflows"**
3. Set **Workflow permissions** to **"Read and write permissions"**
4. Enable **"Allow GitHub Actions to create and approve pull requests"**

#### Configure Branch Protection

Navigate to **Settings > Branches** and add rules for `main`:

- ✅ **Require status checks to pass before merging**
  - Required checks:
    - `Quality & Security Checks`
    - `Test Suite`
    - `Build Verification`
    - `SAST Security Analysis`
- ✅ **Require branches to be up to date before merging**
- ✅ **Require approvals**: 1 required review
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Do not allow bypassing the above settings**

#### Configure Code Signing (Optional)

**macOS Code Signing**:

1. Export your Developer ID Application certificate from Keychain Access
2. Convert to base64:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```
3. Add secrets:
   - `MACOS_CERTIFICATE`: Paste base64 certificate
   - `MACOS_CERTIFICATE_PASSWORD`: Certificate password
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your team ID (found in Apple Developer portal)

**Windows Code Signing**:

1. Export your code signing certificate as `.pfx`
2. Convert to base64:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Set-Clipboard
   ```
3. Add secrets:
   - `WINDOWS_CERTIFICATE`: Paste base64 certificate
   - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

---

## Release Process

### Standard Release

1. **Ensure all changes are merged to `main`**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Update version in `package.json`**:
   ```bash
   # Manual edit or use npm version
   npm version patch  # For bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # For new features (1.0.0 -> 1.1.0)
   npm version major  # For breaking changes (1.0.0 -> 2.0.0)
   ```

3. **Create and push version tag**:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

4. **Monitor release workflow**:
   - Navigate to **Actions** tab
   - Watch **Release Pipeline** workflow
   - Verify all jobs complete successfully

5. **Verify release**:
   - Check **Releases** page for new release
   - Download and test installers on all platforms
   - Verify SHA256 checksums match

### Beta/Pre-release

For beta releases, use version tags with pre-release identifiers:

```bash
npm version prerelease --preid=beta
git push origin v1.2.3-beta.1
```

This will create a GitHub release marked as **pre-release**.

### Hotfix Release

1. **Create hotfix branch from `main`**:
   ```bash
   git checkout -b hotfix/critical-bug main
   ```

2. **Make fixes and commit**:
   ```bash
   git commit -m "fix: critical security vulnerability"
   ```

3. **Create PR to `main`**:
   - All quality gates must pass
   - Require immediate review

4. **After merge, create hotfix release**:
   ```bash
   git checkout main
   git pull origin main
   npm version patch
   git push origin v1.2.4
   ```

---

## Security Configuration

### Pre-deployment Security Checklist

Before any release, verify:

- [ ] No hardcoded secrets or API keys
- [ ] `.env` file is in `.gitignore`
- [ ] All dependencies audited: `pnpm audit`
- [ ] Security scans passed (CodeQL, Trivy, GitLeaks)
- [ ] License compliance verified
- [ ] SBOM generated
- [ ] Code signing configured (optional)
- [ ] Release notes include security fixes

### Critical Security Gates

The release pipeline **BLOCKS** deployment if:

1. **Critical or High vulnerabilities** found in dependencies
2. **Secrets detected** in codebase (GitLeaks)
3. **Forbidden licenses** detected (GPL, AGPL, SSPL, LGPL)

### Security Monitoring

- **Daily scans**: Automated security workflow runs daily at 2 AM UTC
- **GitHub Security Alerts**: Enable Dependabot alerts in repository settings
- **SARIF reports**: View in repository **Security > Code scanning alerts**

---

## Rollback Procedures

### Rollback a Release

If a critical issue is discovered after release:

1. **Delete problematic release**:
   ```bash
   gh release delete v1.2.3 --yes
   git tag -d v1.2.3
   git push origin :refs/tags/v1.2.3
   ```

2. **Revert changes in `main`**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Re-release with fix**:
   ```bash
   npm version patch
   git push origin v1.2.4
   ```

### Database Migration Rollback

If database migration causes issues:

```bash
pnpm db:migrate:rollback
```

This creates automatic backup before rollback.

### Emergency Hotfix

For critical production issues:

1. **Immediately revert to last known good release**
2. **Communicate with users** (GitHub release notes, announcement)
3. **Create hotfix branch** from last stable tag
4. **Fast-track review and release**

---

## Monitoring & Observability

### Application Monitoring

**TODO: Implement monitoring stack**

Recommended tools:
- **Crash reporting**: Sentry, BugSnag
- **Error tracking**: Sentry
- **Usage analytics**: PostHog (privacy-friendly)
- **Performance monitoring**: Custom metrics in-app

### Pipeline Monitoring

Track CI/CD metrics:
- **Build success rate**: Target 95%+
- **Average build time**: Target <15 minutes
- **Test coverage**: Target ≥80%
- **Deployment frequency**: Track release cadence
- **Lead time**: Commit to production time
- **MTTR** (Mean Time To Recovery): Target <24 hours

### Security Monitoring

- **GitHub Security Advisories**: Enable email notifications
- **Dependabot alerts**: Review weekly
- **CodeQL alerts**: Triage within 7 days
- **Trivy scan results**: Address critical/high within 48 hours

---

## Troubleshooting

### Build Failures

**Issue**: `better-sqlite3` module version mismatch

**Solution**:
```bash
nvm use 20  # or fnm use 20
pnpm install
pnpm rebuild:electron  # For Electron runtime
pnpm rebuild:node      # For Node.js tests
```

**Issue**: Electron build fails with "Application entry file not found"

**Solution**:
```bash
pnpm build:electron
# Verify dist/electron/main.js exists
```

**Issue**: Tests fail with "Encryption key not found"

**Solution**:
```bash
node scripts/generate-encryption-key.js
# Ensure .env file exists with ENCRYPTION_KEY_BASE64
```

### Release Failures

**Issue**: Release blocked by security vulnerabilities

**Solution**:
```bash
pnpm audit
pnpm audit fix
# Or manually update vulnerable packages
pnpm update <package-name>@latest
```

**Issue**: Code signing fails on macOS

**Solution**:
- Verify certificate is valid and not expired
- Check Apple ID app-specific password
- Ensure certificate is Developer ID Application type
- Re-export certificate from Keychain Access

**Issue**: Windows installer build fails

**Solution**:
- Verify Windows runner has required build tools
- Check icon file exists: `build/icon.ico`
- Ensure `electron-builder` version is compatible

### Performance Issues

**Issue**: Bundle size exceeds 50MB

**Solution**:
```bash
# Analyze bundle size
pnpm build:electron
du -sh dist/

# Check for large dependencies
npx webpack-bundle-analyzer dist/stats.json
```

**Issue**: Slow CI/CD pipeline (>20 minutes)

**Optimization**:
- Enable pnpm caching in workflows (already configured)
- Parallelize independent jobs
- Use matrix strategy for platform-specific builds
- Consider using GitHub Actions cache for `node_modules`

---

## Best Practices

### Version Numbering

Follow **Semantic Versioning** (SemVer):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward-compatible

Pre-release identifiers:
- **Alpha**: `v1.2.0-alpha.1` (internal testing)
- **Beta**: `v1.2.0-beta.1` (external testing)
- **RC**: `v1.2.0-rc.1` (release candidate)

### Release Notes

Include in every release:

1. **Summary**: Brief description of changes
2. **New Features**: User-facing improvements
3. **Bug Fixes**: Issues resolved
4. **Security Fixes**: Vulnerabilities addressed
5. **Breaking Changes**: Migration guide if applicable
6. **Known Issues**: Current limitations

### Testing Before Release

Checklist:
- [ ] All CI checks passed
- [ ] Manual testing on all target platforms (Windows, macOS, Linux)
- [ ] Database migrations tested
- [ ] Auto-update tested (if configured)
- [ ] Security audit clean
- [ ] Performance benchmarks acceptable

---

## Support & Resources

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Q&A and community support
- **Security Issues**: Report privately to security@justicecompanion.app
- **Documentation**: See [CLAUDE.md](../CLAUDE.md) for development guide

---

**Last Updated**: 2025-01-17
