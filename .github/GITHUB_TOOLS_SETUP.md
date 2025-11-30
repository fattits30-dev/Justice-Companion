# GitHub Tools Setup Guide

This document explains all the GitHub automation tools configured for Justice Companion.

## ✅ Enabled Tools

### 1. Branch Protection (Main Branch)

**Status**: ✅ Enabled

**Configuration:**

- Requires pull request reviews before merging
- Requires 1 approving review
- Requires code owner reviews
- Dismisses stale reviews on new commits
- Requires status checks to pass:
  - `test` - Frontend tests must pass
  - `typecheck` - TypeScript compilation must succeed
  - `lint` - Code linting must pass
- Blocks force pushes
- Blocks deletions

**Benefit**: Ensures all code is reviewed and tested before merging.

### 2. GitHub Discussions

**Status**: ✅ Enabled

**Location**: https://github.com/fattits30-dev/Justice-Companion/discussions

**Use for:**

- Feature discussions
- Q&A
- Community support
- Announcements

### 3. Dependabot

**Status**: ✅ Enabled (already was)

**What it does:**

- Automatically checks for dependency updates
- Creates PRs for security vulnerabilities
- Runs daily

### 4. Secret Scanning

**Status**: ✅ Enabled (already was)

**What it does:**

- Scans commits for accidentally committed secrets
- Push protection prevents secret commits
- Alerts on exposed API keys, tokens, etc.

### 5. CodeQL Analysis

**Status**: ✅ Enabled (already was)

**What it does:**

- Scans code for security vulnerabilities
- Detects XSS, SQL injection, path traversal, etc.
- Runs on every push and PR

---

## 🔧 Configured Tools (Need Activation)

### 6. Renovate Bot

**Status**: ⚙️ Configured (needs GitHub App installation)

**Configuration file**: `renovate.json`

**To activate:**

1. Go to https://github.com/apps/renovate
2. Click "Install"
3. Select "fattits30-dev/Justice-Companion"

**What it does:**

- Better than Dependabot - more customizable
- Groups related updates (e.g., all TypeScript types)
- Auto-merges patch updates for dependencies
- Runs on schedule (Monday mornings)
- Creates dependency dashboard

**Features:**

- Groups Python dependencies together
- Auto-merges security updates immediately
- Auto-merges TypeScript type definitions
- Limits concurrent PRs to avoid spam

### 7. SonarCloud

**Status**: ⚙️ Configured (needs account + token)

**Configuration files**:

- `sonar-project.properties`
- `.github/workflows/sonarcloud.yml`

**To activate:**

1. Go to https://sonarcloud.io
2. Sign in with GitHub
3. Import "Justice-Companion" repository
4. Copy the project token
5. Add secret to GitHub:
   - Go to: Settings → Secrets and variables → Actions
   - Create secret: `SONAR_TOKEN` = [your token]

**What it does:**

- Code quality analysis
- Detects code smells
- Tracks technical debt
- Security hotspot detection
- Duplicate code detection
- Coverage visualization

**Benefits:**

- Quality gate on PRs
- Detailed code metrics
- Security vulnerability detection
- Maintainability ratings

### 8. Codecov

**Status**: ⚙️ Configured (needs account + token)

**Configuration files**:

- `codecov.yml`
- `.github/workflows/codecov.yml`

**To activate:**

1. Go to https://codecov.io
2. Sign in with GitHub
3. Add "Justice-Companion" repository
4. Copy the upload token
5. Add secret to GitHub:
   - Go to: Settings → Secrets and variables → Actions
   - Create secret: `CODECOV_TOKEN` = [your token]

**What it does:**

- Tracks test coverage over time
- Comments on PRs with coverage changes
- Separate coverage for frontend & backend
- Coverage badges for README

**Coverage targets:**

- Project overall: 70% target
- New code (patches): 80% target
- Allows 2% drop in coverage

**Benefits:**

- Ensures tests are maintained
- Prevents coverage regression
- Beautiful coverage reports
- Coverage trends over time

---

## 📋 Project Templates

### Pull Request Template

**File**: `.github/pull_request_template.md`

**Features:**

- Type of change checklist
- Related issues linking
- Security considerations
- Testing checklist
- Documentation updates

### Issue Templates

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.yml`):

- Structured form with required fields
- Steps to reproduce
- Expected vs actual behavior
- Version and browser info

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.yml`):

- Problem statement
- Proposed solution
- Feature area classification
- Priority levels

**Security Vulnerability** (`.github/ISSUE_TEMPLATE/security.yml`):

- Private reporting option
- Severity levels
- Affected components
- Responsible disclosure checklist

### Code Owners

**File**: `.github/CODEOWNERS`

**Auto-assigns reviewers for:**

- Backend files → @fattits30-dev
- Frontend files → @fattits30-dev
- Security-sensitive files → @fattits30-dev
- Infrastructure/CI → @fattits30-dev

---

## 🚀 Quick Setup Commands

### Enable All Configured Tools

```bash
# 1. Install Renovate Bot
open https://github.com/apps/renovate
# Click "Install" and select your repository

# 2. Setup SonarCloud
open https://sonarcloud.io
# Import repository, get token, add as SONAR_TOKEN secret

# 3. Setup Codecov
open https://codecov.io
# Add repository, get token, add as CODECOV_TOKEN secret
```

---

## 📊 GitHub Actions Workflows

### Existing Workflows

- `test.yml` - Runs tests on push/PR
- `typecheck.yml` - TypeScript validation
- `lint.yml` - Code linting

### New Workflows (will activate when tokens added)

- `sonarcloud.yml` - Code quality analysis
- `codecov.yml` - Coverage tracking

---

## 🔒 Required Secrets

To fully activate all tools, add these secrets in:
**Settings → Secrets and variables → Actions**

| Secret Name     | Used By    | How to Get                                 |
| --------------- | ---------- | ------------------------------------------ |
| `SONAR_TOKEN`   | SonarCloud | https://sonarcloud.io → Account → Security |
| `CODECOV_TOKEN` | Codecov    | https://codecov.io → Repository Settings   |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

## 📈 Expected Benefits

### Code Quality

- ✅ Automated security scanning
- ✅ Code smell detection
- ✅ Consistent code reviews
- ✅ Coverage tracking

### Productivity

- ✅ Auto-merge safe dependency updates
- ✅ Grouped related updates
- ✅ Clear PR templates
- ✅ Structured issue reporting

### Security

- ✅ Branch protection prevents accidents
- ✅ Secret scanning
- ✅ Vulnerability alerts
- ✅ Security-focused issue template

### Collaboration

- ✅ GitHub Discussions for community
- ✅ Code owners auto-assign reviewers
- ✅ Clear contribution guidelines

---

## 🎯 Next Steps

1. **Install Renovate Bot** - Takes 2 minutes
2. **Setup SonarCloud** - Takes 5 minutes
3. **Setup Codecov** - Takes 5 minutes
4. **Star this repo** - Show support! ⭐

That's it! All tools will start working automatically.
