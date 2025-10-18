# CI/CD Quick Reference Guide

**Project**: Justice Companion
**Last Updated**: 2025-10-18

---

## Workflows Overview

| Workflow | Trigger | Duration | Purpose |
|----------|---------|----------|---------|
| **CI** | Push/PR to main/develop | ~30 min | Quality checks, tests, build verification |
| **Release** | Git tag `v*` | ~50 min | Build installers, create GitHub release |
| **Quality Gate** | Pull requests | ~20 min | Automated PR quality report |
| **Security** | Daily 2 AM, Push, PR | ~40 min | Vulnerability scanning, SBOM |
| **Performance** | Weekly, Push, PR | ~30 min | Performance benchmarks |
| **Dependency Update** | Weekly Monday | ~20 min | Automated dependency updates |

---

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm electron:dev

# Run tests
pnpm test
pnpm test:coverage
pnpm test:e2e

# Code quality
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm format
pnpm format:check
```

### Building

```bash
# Build for development
pnpm build:electron

# Build for specific platforms
pnpm build:win      # Windows .exe
pnpm build:mac      # macOS .dmg
pnpm build:linux    # Linux .AppImage + .deb

# Rebuild native modules
pnpm rebuild:electron  # For Electron runtime
pnpm rebuild:node      # For Node.js tests
```

### Database

```bash
# Run migrations
pnpm db:migrate

# Check migration status
pnpm db:migrate:status

# Rollback last migration
pnpm db:migrate:rollback

# Create backup
pnpm db:backup

# List backups
pnpm db:backup:list
```

---

## Creating a Release

### Step 1: Prepare Release

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Run full test suite
pnpm test
pnpm type-check
pnpm lint

# Build and verify
pnpm build:electron
```

### Step 2: Create and Push Tag

```bash
# Create version tag (SemVer)
git tag v1.0.0

# Push tag to trigger release
git push origin v1.0.0
```

### Step 3: Monitor Release

1. Go to GitHub Actions tab
2. Watch "Release Pipeline" workflow
3. Verify all jobs pass (4 jobs):
   - pre-release-security ✅
   - build-release (Windows, macOS, Linux) ✅
   - create-release ✅
   - verify-release ✅

4. Check GitHub Releases for new release
5. Download and test installers

### Pre-Release Versions

```bash
# Beta release
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1

# Alpha release
git tag v2.0.0-alpha.1
git push origin v2.0.0-alpha.1

# Release candidate
git tag v1.5.0-rc.1
git push origin v1.5.0-rc.1
```

**Note**: Tags containing `beta`, `alpha`, or `rc` are automatically marked as pre-releases.

---

## Troubleshooting CI Failures

### Test Failures

**Symptom**: Tests fail in CI but pass locally
**Cause**: better-sqlite3 not rebuilt for Node.js

```bash
# Solution: Already in CI workflow
pnpm rebuild:node
pnpm test
```

**Symptom**: 4 tests fail with "NODE_MODULE_VERSION mismatch"
**Cause**: Wrong Node.js version

```bash
# Solution: Ensure Node 20.x
nvm use 20  # or fnm use 20
pnpm install
```

### Type Check Failures

**Symptom**: Type errors in settings scripts
**Status**: ⚠️ Known issue (26 errors in script files, non-blocking)

```bash
# Scripts are excluded from production build
# See eslint.config.js:
ignores: ['scripts/**/*']

# To fix (optional):
# 1. Add proper types to script files
# 2. Or move scripts to separate tsconfig
```

### Lint Failures

**Symptom**: ESLint errors block merge
**Solution**:

```bash
# Auto-fix
pnpm lint:fix

# Manual fix for remaining issues
pnpm lint  # Review errors
# Fix in code editor
```

### Format Failures

**Symptom**: Prettier format check fails
**Solution**:

```bash
# Auto-format all files
pnpm format

# Check specific files
pnpm format:check
```

### Coverage Failures

**Symptom**: Coverage below 75% threshold
**Solution**:

```bash
# Run coverage report
pnpm test:coverage

# Identify untested files in coverage/index.html
# Write tests for uncovered code
```

### Security Scan Failures

**Symptom**: Trivy finds HIGH/CRITICAL vulnerabilities
**Solution**:

```bash
# Check audit report
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Update package.json manually if needed
# Re-run tests after updates
```

### Build Failures

**Symptom**: Electron build fails
**Cause**: Missing dependencies or incorrect Node version

```bash
# Solution:
nvm use 20  # Ensure Node 20.x
pnpm install --frozen-lockfile
pnpm build:electron
```

---

## Quality Gate Interpretation

### PR Quality Report

**Example Report**:
```markdown
| Check | Status | Details |
|-------|--------|---------|
| 🎨 Formatting | ✅ PASSED | All files properly formatted |
| 🔍 Linting | ❌ FAILED | 3 errors, 12 warnings |
| 📝 Type Check | ✅ PASSED | No type errors |
| 🧪 Tests | ⚠️ WARNING | Coverage: 78% (<80% target) |
| 🔒 Security | ✅ PASSED | No vulnerabilities found |
| 📦 Bundle Size | ✅ PASSED | Bundle size: 12MB (<50MB) |
```

**Action Required**:
1. ❌ FAILED checks: Must fix before merge
2. ⚠️ WARNING checks: Should fix, but not blocking
3. ✅ PASSED checks: No action needed

**Fix Commands**:
```bash
# Formatting
pnpm format

# Linting
pnpm lint:fix

# Type errors
pnpm type-check  # Review errors in output

# Tests
pnpm test  # Review failures
```

---

## Security Best Practices

### Secrets Management

**Never commit**:
- `.env` files
- `certificate.pfx` or `certificate.p12`
- API keys
- Encryption keys

**Use GitHub Secrets for**:
- `ENCRYPTION_KEY_BASE64`
- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `MACOS_CERTIFICATE`
- `APPLE_ID`
- `APPLE_ID_PASSWORD`
- `APPLE_TEAM_ID`
- `SENTRY_DSN`
- `SNYK_TOKEN` (optional)

### Code Signing

**Windows**:
1. Obtain code signing certificate (DigiCert, Sectigo)
2. Export as `.pfx`
3. Convert to Base64:
   ```powershell
   $pfxBytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
   $base64 = [System.Convert]::ToBase64String($pfxBytes)
   $base64 | Out-File "certificate-base64.txt"
   ```
4. Add to GitHub Secrets: `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`

**macOS**:
1. Enroll in Apple Developer Program ($99/year)
2. Create "Developer ID Application" certificate
3. Export as `.p12`
4. Convert to Base64:
   ```bash
   base64 -i certificate.p12 -o certificate-base64.txt
   ```
5. Add to GitHub Secrets: `MACOS_CERTIFICATE`, `APPLE_ID`, etc.

### Vulnerability Management

**Weekly**:
- Review security scan results in GitHub Security tab
- Check dependency update PRs
- Apply security patches

**Monthly**:
- Run manual security audit: `pnpm audit`
- Review SBOM artifacts
- Update dependencies: `pnpm update`

---

## Performance Monitoring

### Benchmark Results

**Good Performance**:
```
Insert 1000 records: <500ms
Query 1000 records: <100ms
Pagination (20 items): <10ms
Encryption (1000 ops): <150ms
Bundle size: <50MB
```

**Performance Regression**:
```
⚠️ Threshold: 15% slower than baseline
❌ Action: Investigate and optimize before merge
```

### Viewing Benchmark Reports

1. Go to GitHub Actions → Performance Monitoring workflow
2. Click on latest run
3. Download "performance-benchmarks" artifact
4. Open `benchmark-report.md`

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (99%+ pass rate)
- [ ] Code coverage ≥75%
- [ ] No HIGH/CRITICAL security vulnerabilities
- [ ] Type check passes (0 errors in production code)
- [ ] Lint passes (0 errors, minimal warnings)
- [ ] Bundle size <50MB
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Migration guide written (if breaking changes)

### Deployment

- [ ] Create version tag (`git tag v1.0.0`)
- [ ] Push tag (`git push origin v1.0.0`)
- [ ] Monitor release workflow
- [ ] Verify all platform builds succeed
- [ ] Download and test installers
- [ ] Verify SHA256 checksums
- [ ] Check auto-update server (if configured)

### Post-Deployment

- [ ] Monitor error logs (Sentry if configured)
- [ ] Check user reports/issues
- [ ] Monitor update adoption rate
- [ ] Review performance metrics
- [ ] Update documentation
- [ ] Communicate release to users

---

## Emergency Procedures

### Rollback Release

**When**: Critical bug found in production release

**Steps**:
1. Go to GitHub Actions
2. Run "Rollback Release" workflow
3. Enter previous stable version (e.g., `1.0.0`)
4. Enter rollback reason
5. Monitor workflow completion
6. Verify previous release re-published
7. Update auto-update server (if configured)
8. Notify users

**Manual Rollback**:
```bash
# Re-publish previous release as latest
gh release view v1.0.0
gh release edit v1.0.0 --draft=false --latest

# Notify team
gh issue create --title "🚨 Rollback to v1.0.0" \
  --label rollback,critical \
  --body "Critical bug found, rolled back to v1.0.0"
```

### CI Pipeline Down

**Symptom**: All CI jobs failing
**Possible Causes**:
- GitHub Actions outage
- Runner capacity issues
- Dependency registry down

**Actions**:
1. Check GitHub Status: https://www.githubstatus.com/
2. Re-run failed jobs
3. If persistent, run tests locally:
   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   pnpm build:electron
   ```
4. Contact GitHub Support if needed

### Test Failures After Dependency Update

**Symptom**: Tests fail after automated dependency PR
**Actions**:
1. Review PR changes in `package.json` and `pnpm-lock.yaml`
2. Identify breaking changes in changelog
3. Options:
   - Fix code to work with new version
   - Pin dependency to previous version
   - Close PR and update manually

```bash
# Pin specific version
pnpm add better-sqlite3@11.7.0
```

---

## Useful Links

- **GitHub Actions**: https://github.com/your-org/justice-companion/actions
- **Releases**: https://github.com/your-org/justice-companion/releases
- **Security**: https://github.com/your-org/justice-companion/security
- **Issues**: https://github.com/your-org/justice-companion/issues
- **Documentation**: `/CLAUDE.md`, `/CI-CD-ASSESSMENT.md`
- **Automation Guide**: `/.github/AUTOMATION-GUIDE.md`

---

## Getting Help

**CI/CD Issues**:
1. Check this quick reference
2. Review CI-CD-ASSESSMENT.md for detailed analysis
3. Check workflow logs in GitHub Actions
4. Search existing issues
5. Contact DevOps team

**Development Issues**:
1. Review CLAUDE.md for project setup
2. Check KNOWN_ISSUES.md
3. Run `pnpm type-check` and `pnpm lint`
4. Search existing issues
5. Contact development team

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-10-18
**Maintained By**: DevOps Team
