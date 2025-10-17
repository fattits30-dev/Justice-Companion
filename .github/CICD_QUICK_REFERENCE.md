# CI/CD Quick Reference Guide

**For**: Justice Companion Developers
**Last Updated**: 2025-01-17

---

## Quick Links

- [GitHub Actions Workflows](https://github.com/YOUR-ORG/justice-companion/actions)
- [Security Alerts](https://github.com/YOUR-ORG/justice-companion/security)
- [Deployment Guide](.github/DEPLOYMENT.md)
- [DevOps Audit Report](.github/DEVOPS_AUDIT_REPORT.md)

---

## Common Workflows

### Run All Tests Locally

```bash
# Rebuild better-sqlite3 for Node.js
pnpm rebuild:node

# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Before Committing

```bash
# Format code
pnpm format

# Fix linting issues
pnpm lint:fix

# Type check
pnpm type-check

# Run tests
pnpm test
```

### Create a Release

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Push tag to trigger release
git push origin v1.2.3

# Monitor release at: github.com/YOUR-ORG/justice-companion/actions
```

---

## GitHub Actions Workflows

### CI Pipeline (`.github/workflows/ci.yml`)
**Triggers**: Push/PR to main, develop
**Duration**: ~15-20 minutes
**What it does**:
- ✅ Code quality checks (format, lint, type check)
- ✅ Security scanning (Trivy, CodeQL, GitLeaks)
- ✅ Unit tests on 3 platforms (Ubuntu, Windows, macOS)
- ✅ E2E tests
- ✅ Build verification
- ✅ Performance benchmarks

**Quality Gates**:
- Test coverage ≥ 80%
- No critical/high vulnerabilities
- All tests passing
- Type checking passes
- Bundle size < 50MB

### Release Pipeline (`.github/workflows/release.yml`)
**Triggers**: Version tags (`v1.0.0`, `v1.2.3-beta.1`)
**Duration**: ~30-40 minutes
**What it does**:
- 🔒 Pre-release security validation (BLOCKS release on vulnerabilities)
- 🏗️ Builds Windows .exe, macOS .dmg, Linux .AppImage + .deb
- 📦 Creates GitHub release with installers
- ✅ Generates SHA256 checksums
- 🚀 (Optional) Deploys to auto-update server

**IMPORTANT**: Release will FAIL if critical/high security vulnerabilities exist.

### Quality Gate (`.github/workflows/quality.yml`)
**Triggers**: Pull requests to main, develop
**Duration**: ~15 minutes
**What it does**:
- 📊 Posts quality report to PR
- 📈 Shows coverage metrics
- 🔍 Lists lint/type/format issues
- 🔒 Security audit results
- 💡 Provides fix suggestions

### Security Scanning (`.github/workflows/security.yml`)
**Triggers**: Daily at 2 AM UTC, push to main, PRs
**Duration**: ~15 minutes
**What it does**:
- 🔍 Dependency vulnerability scanning (Trivy, Snyk)
- 🔐 Secret detection (GitLeaks, TruffleHog)
- 🛡️ SAST analysis (CodeQL)
- 📜 License compliance check
- 📋 SBOM generation (CycloneDX)

**Alerts**: Check Security tab for findings

### Dependency Updates (`.github/workflows/dependency-update.yml`)
**Triggers**: Weekly Monday 9 AM UTC
**Duration**: ~15 minutes
**What it does**:
- 🔄 Checks for outdated dependencies
- ⬆️ Updates patch/minor versions (safe)
- 🧪 Runs tests to verify updates
- 📝 Creates automated PR

**Security Updates**: Separate PR for vulnerability fixes (high priority)

### Performance Monitoring (`.github/workflows/performance.yml`)
**Triggers**: Push to main, PRs, weekly Sunday 3 AM UTC
**Duration**: ~20 minutes
**What it does**:
- ⚡ Database performance benchmarks
- 🔐 Encryption throughput tests
- 📦 Bundle size tracking
- 💾 Memory usage analysis
- 🚀 Startup time measurement

---

## Understanding Workflow Status

### ✅ Green Check (Success)
All quality gates passed. PR is ready for review.

### ❌ Red X (Failure)
Something failed. Click for details:
- Failed tests → Fix code and re-run tests
- Linting errors → Run `pnpm lint:fix`
- Type errors → Fix TypeScript issues
- Security issues → Update vulnerable dependencies

### 🟡 Yellow Dot (In Progress)
Workflow is currently running. Wait for completion.

### ⚪ Gray Circle (Pending)
Workflow queued. Will start soon.

---

## Common Issues & Fixes

### Issue: "better-sqlite3 module version mismatch"

**Solution**:
```bash
# Ensure Node 20.x is active
nvm use 20  # or: fnm use 20

# Rebuild better-sqlite3
pnpm rebuild:electron  # For Electron
pnpm rebuild:node      # For Node.js tests
```

### Issue: "Tests failing in CI but passing locally"

**Causes**:
1. Different Node.js version
2. Missing environment variables
3. Different better-sqlite3 build

**Solution**:
```bash
# Match CI environment
nvm use 20.18.0
pnpm install
pnpm rebuild:node
pnpm test
```

### Issue: "Release blocked by security vulnerabilities"

**Solution**:
```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically (if possible)
pnpm audit fix

# Or update specific packages
pnpm update <package-name>@latest

# Create new release after fixing
```

### Issue: "PR quality gate failing on coverage"

**Solution**:
```bash
# Run coverage locally
pnpm test:coverage

# Check coverage report
open coverage/index.html

# Add tests for uncovered code
# Re-run coverage
pnpm test:coverage
```

### Issue: "Workflow permission denied"

**Solution**: Repository admin needs to:
1. Go to Settings > Actions > General
2. Set Workflow permissions to "Read and write permissions"
3. Enable "Allow GitHub Actions to create and approve pull requests"

---

## Monitoring & Alerts

### Where to Check

| What | Where | How Often |
|------|-------|-----------|
| Build Status | Actions tab | Every push/PR |
| Security Alerts | Security tab > Dependabot alerts | Daily |
| Code Scanning | Security tab > Code scanning | Daily |
| Test Coverage | Codecov badge in README | Every PR |
| Release Status | Releases page | Each release |

### Setting Up Notifications

1. **Watch Repository**: Click "Watch" → "All Activity"
2. **Email Notifications**: Settings → Notifications → Enable workflow notifications
3. **Slack Integration** (optional):
   ```yaml
   # Add to workflow .yml:
   - name: Notify Slack
     uses: 8398a7/action-slack@v3
     with:
       status: ${{ job.status }}
       webhook_url: ${{ secrets.SLACK_WEBHOOK }}
   ```

---

## Security Best Practices

### Never Commit
- ❌ `.env` files
- ❌ Encryption keys
- ❌ API tokens
- ❌ Passwords
- ❌ Private keys/certificates

### Always Use
- ✅ GitHub Secrets for sensitive data
- ✅ `.gitignore` for sensitive files
- ✅ Zod schemas for input validation
- ✅ `EncryptionService` for sensitive fields
- ✅ `AuthorizationMiddleware` for protected operations

### Before Merging
- ✅ All tests passing
- ✅ Security scan clean
- ✅ Code reviewed by peer
- ✅ No console.log() in production code
- ✅ Updated documentation if needed

---

## Release Checklist

### Pre-Release
- [ ] All tests passing on main branch
- [ ] Security scan clean (no critical/high vulnerabilities)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Database migrations tested

### Release
```bash
# 1. Ensure on main branch
git checkout main
git pull origin main

# 2. Update version
npm version patch  # or minor/major

# 3. Push tag
git push origin v1.2.3

# 4. Monitor release
# Go to: github.com/YOUR-ORG/justice-companion/actions
```

### Post-Release
- [ ] GitHub release created successfully
- [ ] All platform installers uploaded
- [ ] SHA256 checksums generated
- [ ] Release notes reviewed
- [ ] Test installers on all platforms
- [ ] Monitor for crash reports (if Sentry configured)

---

## Performance Benchmarks

### Targets

| Metric | Target | Current |
|--------|--------|---------|
| Database insert (1000 records) | <200ms | TBD |
| Encryption (1000 ops) | <100ms | TBD |
| Application startup | <3s | TBD |
| Bundle size | <50MB | Check `dist/` |
| Memory usage (idle) | <150MB | TBD |

### How to Benchmark

```bash
# Run performance workflow manually
# Go to Actions > Performance Monitoring > Run workflow

# Or run locally:
pnpm build:electron
node scripts/demo-startup-metrics.js
```

---

## Troubleshooting Workflows

### View Workflow Logs

1. Go to **Actions** tab
2. Click failed workflow run
3. Click failed job
4. Expand step to see logs

### Re-run Failed Workflow

1. Go to failed workflow run
2. Click "Re-run jobs" → "Re-run failed jobs"

### Cancel Running Workflow

1. Go to running workflow
2. Click "Cancel workflow"

### Skip Workflows

Add to commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

---

## Getting Help

### Documentation
- [DEPLOYMENT.md](.github/DEPLOYMENT.md) - Full deployment guide
- [DEVOPS_AUDIT_REPORT.md](.github/DEVOPS_AUDIT_REPORT.md) - DevOps assessment
- [CLAUDE.md](../CLAUDE.md) - Development guide

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Q&A and community support
- **Security Issues**: Report privately to security@justicecompanion.app

### Useful Commands

```bash
# View workflow files
ls .github/workflows/

# Check workflow syntax
cat .github/workflows/ci.yml

# View secrets (admin only)
gh secret list

# Manually trigger workflow
gh workflow run ci.yml
```

---

## Advanced Topics

### Custom Workflow Triggers

```yaml
on:
  workflow_dispatch:  # Manual trigger
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
```

### Workflow Dependencies

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    # ...

  deploy:
    needs: [test]  # Runs only if test passes
    runs-on: ubuntu-latest
    # ...
```

### Conditional Steps

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
```

---

## Quick Command Reference

### Local Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server
pnpm electron:dev     # Start Electron app
pnpm test             # Run tests
pnpm lint:fix         # Fix lint issues
pnpm format           # Format code
pnpm type-check       # Check types
```

### Database
```bash
pnpm db:migrate       # Run migrations
pnpm db:backup        # Create backup
pnpm db:migrate:rollback  # Rollback migration
```

### Building
```bash
pnpm build:electron   # Build Electron app
pnpm build:win        # Build Windows installer
pnpm build:mac        # Build macOS DMG
pnpm build:linux      # Build Linux packages
```

### Release
```bash
npm version patch     # Bump patch version
git push origin v1.2.3  # Trigger release
gh release view v1.2.3  # View release
```

---

**Need more help?** Check the [full deployment guide](.github/DEPLOYMENT.md) or ask in GitHub Discussions.

**Last Updated**: 2025-01-17
