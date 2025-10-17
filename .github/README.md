# Justice Companion - DevOps & CI/CD

This directory contains the complete DevOps infrastructure for the Justice Companion application.

---

## 📁 Directory Contents

### Workflows (`.github/workflows/`)

| Workflow | Purpose | Trigger | Duration |
|----------|---------|---------|----------|
| **ci.yml** | Continuous Integration | Push/PR to main, develop | ~15-20 min |
| **release.yml** | Release Automation | Version tags (v1.0.0) | ~30-40 min |
| **quality.yml** | PR Quality Gate | Pull requests | ~15 min |
| **security.yml** | Security Scanning | Daily 2 AM UTC, push, PRs | ~15 min |
| **dependency-update.yml** | Dependency Management | Weekly Monday 9 AM UTC | ~15-20 min |
| **performance.yml** | Performance Benchmarks | Weekly Sunday 3 AM UTC, push, PRs | ~20 min |

### Documentation

| Document | Purpose | Length |
|----------|---------|--------|
| **DEPLOYMENT.md** | Complete deployment guide | 600+ lines |
| **DEVOPS_AUDIT_REPORT.md** | DevOps maturity assessment | 800+ lines |
| **CICD_QUICK_REFERENCE.md** | Developer quick reference | 500+ lines |
| **DEVOPS_IMPLEMENTATION_SUMMARY.md** | Implementation overview | 600+ lines |
| **README.md** | This file | - |

---

## 🚀 Quick Start

### For Developers

**First time setup**:
1. Read [CICD_QUICK_REFERENCE.md](CICD_QUICK_REFERENCE.md)
2. Configure local environment (see [DEPLOYMENT.md](DEPLOYMENT.md))
3. Run `pnpm install` and start coding

**Before committing**:
```bash
pnpm format && pnpm lint:fix && pnpm type-check && pnpm test
```

**Creating a release**:
```bash
npm version patch  # or minor/major
git push origin v1.2.3
```

### For DevOps Engineers

**Initial setup**:
1. Read [DEPLOYMENT.md](DEPLOYMENT.md) in full
2. Enable GitHub Actions in repository settings
3. Configure branch protection rules
4. Add code signing secrets (optional)
5. Run initial security scan

**Monitoring**:
- Check **Actions** tab for workflow status
- Review **Security** tab for alerts
- Monitor **Releases** page for deployments

---

## 🎯 Quality Gates

### CI Pipeline
- ✅ Test coverage ≥ 80%
- ✅ No critical/high vulnerabilities
- ✅ All tests passing
- ✅ Type checking passes
- ✅ Bundle size < 50MB

### Release Pipeline
- ❌ **BLOCKS** release on critical/high vulnerabilities
- ❌ **BLOCKS** release if secrets detected
- ✅ Code signing (when configured)
- ✅ SHA256 checksums

---

## 🔒 Security

### Automated Scans
- **Daily**: Full security scan at 2 AM UTC
- **Every PR**: Security audit and secret detection
- **Every release**: Comprehensive vulnerability check (BLOCKING)

### Tools Used
- Trivy (dependency vulnerabilities)
- CodeQL (SAST)
- GitLeaks (secret detection)
- TruffleHog (deep secret scanning)
- Snyk (optional, requires token)

### View Security Alerts
- Repository **Security** tab
- Workflow run summaries
- PR quality gate comments

---

## 📊 Monitoring

### Pipeline Metrics
Track in Actions tab:
- Build success rate
- Average build time
- Test pass rate
- Coverage trends

### Application Metrics
⚠️ **TODO**: Implement production monitoring
- Crash reporting (Sentry)
- Error tracking
- Performance monitoring
- Usage analytics

---

## 📚 Documentation Guide

### For New Developers
1. Start with [CICD_QUICK_REFERENCE.md](CICD_QUICK_REFERENCE.md)
2. Review common workflows and commands
3. Learn troubleshooting techniques

### For DevOps Setup
1. Read [DEPLOYMENT.md](DEPLOYMENT.md) completely
2. Follow prerequisites section
3. Configure CI/CD environment
4. Set up monitoring (when implemented)

### For Security Review
1. Read [DEVOPS_AUDIT_REPORT.md](DEVOPS_AUDIT_REPORT.md)
2. Review critical findings
3. Check security practices section
4. Verify compliance requirements

### For Implementation Overview
1. Read [DEVOPS_IMPLEMENTATION_SUMMARY.md](DEVOPS_IMPLEMENTATION_SUMMARY.md)
2. Understand what was built
3. Review quality gates
4. Check next steps

---

## ⚠️ Current Status

### DevOps Infrastructure: ✅ READY
- ✅ All workflows created and tested
- ✅ Security scanning configured
- ✅ Quality gates implemented
- ✅ Documentation complete

### Application Status: ❌ NOT READY
- ❌ 6 critical authorization vulnerabilities
- ❌ 71 failing tests
- ❌ No production monitoring
- ❌ 0% IPC handler test coverage

**DO NOT DEPLOY** until critical issues are resolved.

See [DEVOPS_AUDIT_REPORT.md](DEVOPS_AUDIT_REPORT.md) for details.

---

## 🛠️ Troubleshooting

### Common Issues

**Issue**: Workflows not running
- **Fix**: Enable Actions in repository settings

**Issue**: better-sqlite3 errors
- **Fix**: `nvm use 20 && pnpm rebuild:node`

**Issue**: Security scan blocking release
- **Fix**: `pnpm audit && pnpm audit fix`

**Issue**: Tests failing in CI
- **Fix**: Check Node version matches CI (20.18.0)

More troubleshooting: [CICD_QUICK_REFERENCE.md#common-issues--fixes](CICD_QUICK_REFERENCE.md#common-issues--fixes)

---

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Electron Builder](https://www.electron.build/)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
- [Semantic Versioning](https://semver.org/)

---

## 📞 Support

- **GitHub Issues**: Bug reports
- **GitHub Discussions**: Q&A
- **Security**: security@justicecompanion.app

---

**Created**: 2025-01-17
**Total Files**: 10 (6 workflows + 5 docs)
**Total Lines**: ~4,250 lines
**Status**: ✅ Infrastructure ready, ❌ Application not ready
