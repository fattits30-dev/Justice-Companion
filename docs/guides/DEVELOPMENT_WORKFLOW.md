# Justice Companion - Complete Development Workflow Guide

**Last Updated**: 2025-10-09
**For**: Cursor IDE + GitHub Integration
**Status**: Production-Ready Setup

---

## 🎯 Quick Start (5 Minutes)

```bash
# 1. Install recommended extensions
# Open Command Palette (Ctrl+Shift+P) → "Extensions: Show Recommended Extensions" → Install All

# 2. Verify setup
npm run guard          # Run all quality checks
npm test               # Run test suite (95.3% passing ✅)

# 3. Start development
npm run dev            # Terminal 1: Vite dev server (http://localhost:5173)
npm run electron:dev   # Terminal 2: Electron app

# 4. Database is ready
npm run db:migrate:status  # Shows all migrations applied ✅
```

---

## ⌨️ Custom Keyboard Shortcuts

The project includes `.vscode/keybindings.json` with productivity shortcuts:

### Testing
- `Ctrl+Shift+T` - Run unit tests
- `Ctrl+Shift+E` - Run E2E tests

### Quality Checks
- `Ctrl+Shift+L` - Run ESLint
- `Ctrl+Shift+K` - Type check
- `Ctrl+Shift+G` - **Run guard** (all checks)

### Development
- `Ctrl+Shift+D` - Start dev server
- `Ctrl+Shift+B` - Build project

### Database
- `Ctrl+Shift+M` - Run migrations
- `Ctrl+Shift+Backspace` - Migration status

### Navigation
- `Ctrl+Shift+O` - Open TODO Tree

---

## 📊 Cursor IDE Features

### 1. TODO Tree Integration

Your TODO.md is tracked automatically:

```markdown
- [x] **Reach 95%+ Test Pass Rate** ✅ ACHIEVED
- [ ] **Achieve 80%+ Code Coverage**
```

- View: Press `Ctrl+Shift+O` or click TODO Tree in sidebar
- Updates automatically when you edit TODO.md
- Color-coded: ✅ Green (done), ⏳ Yellow (pending), ⚠️ Red (blocking)

### 2. ESLint + Prettier

**Auto-format on save** is enabled:
- Save file (Ctrl+S) → Auto-formats with Prettier
- ESLint errors show inline with Error Lens extension
- Manual format: `Ctrl+Shift+P` → "Format Document"

### 3. Tailwind IntelliSense

- Type `className=""` → Get autocomplete for Tailwind classes
- Hover over class names → See CSS preview
- Works in `cva()` and `cx()` functions

### 4. Git Integration (GitLens)

- Hover over code → See blame information
- Click line gutter → See commit details
- `Ctrl+Shift+G` → Open Source Control panel

---

## 🔧 GitHub Integration

### GitHub Actions (Automated)

**Already configured** - runs automatically on:

1. **`.github/workflows/test.yml`** - On every push/PR
   - TypeScript compilation
   - ESLint checks
   - Unit tests (943/990 passing)
   - E2E tests with Playwright
   - Security audit

2. **`.github/workflows/release.yml`** - On version tags
   - Creates GitHub Release
   - Builds Windows/macOS/Linux installers
   - Attaches binaries to release

3. **`.github/workflows/ci.yml`** - Continuous integration
4. **`.github/workflows/codeql.yml`** - Security scanning
5. **`.github/workflows/dev-quality-agents.yml`** - Quality automation

### Creating a Release

```bash
# 1. Update version in package.json
npm version patch   # 1.0.0 → 1.0.1 (bug fix)
npm version minor   # 1.0.1 → 1.1.0 (new feature)
npm version major   # 1.1.0 → 2.0.0 (breaking change)

# 2. Push tag to trigger release workflow
git push --tags

# 3. GitHub Actions automatically:
#    - Runs all tests
#    - Builds installers for Windows/macOS/Linux
#    - Creates GitHub Release with changelog
#    - Uploads binaries
```

### GitHub Issues

**Templates available** (`.github/ISSUE_TEMPLATE/`):

1. **Bug Report** - `bug_report.yml`
   - Structured form for bug reports
   - Auto-labels: `bug`

2. **Feature Request** - `feature_request.yml`
   - Structured form for feature requests
   - Auto-labels: `enhancement`

**Create Issue**:
- GitHub repo → Issues → New Issue → Choose template

### Pull Requests

**Template** (`.github/pull_request_template.md`) includes:
- Description
- Type of change (feature/bug fix/docs)
- Related issues
- Testing checklist
- Screenshots

**PR Workflow**:
```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes, commit
git add .
git commit -m "feat: add new feature"

# 3. Push branch
git push origin feature/your-feature

# 4. Create PR on GitHub
# 5. GitHub Actions runs tests automatically
# 6. Merge when approved and tests pass
```

---

## 📦 GitHub Projects Board Setup

**Manual Setup Required** (GitHub UI):

1. Go to your GitHub repo
2. Click **"Projects"** tab
3. Click **"New project"**
4. Choose **"Board"** template
5. Name it: "Justice Companion Roadmap"

### Columns to Create:

| Column | Description | Cards From |
|--------|-------------|------------|
| 🎯 Current Sprint | Week 9-10: Testing & Quality | TODO.md "IN PROGRESS" |
| 📋 Next Up | Week 2-4: Security Foundation | TODO.md "NEXT UP" |
| 🔮 Future | Weeks 5-8, 11-12 | TODO.md "Feature Completion" |
| ✅ Done | Completed phases | TODO.md "COMPLETED WORK" |
| 🐛 Bugs | Bug reports | GitHub Issues (label:bug) |

### Automation Rules:

1. **Auto-add issues**: When issue created → Add to "📋 Next Up"
2. **Auto-move**: When issue closed → Move to "✅ Done"
3. **Auto-label**: PRs linked to issues inherit labels

---

## 🛡️ Branch Protection Rules

**Manual Setup Required** (GitHub UI):

1. GitHub repo → Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require pull request reviews before merging (1 approval)
   - ✅ Require status checks to pass before merging
     - `test` (from test.yml workflow)
     - `type-check`
     - `lint`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
5. Click "Create"

**Result**: Can't push directly to `main` - must create PR and pass checks.

---

## 🔄 Daily Development Workflow

### Morning Routine (5 min)

```bash
# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Verify environment
npm run guard            # All checks pass? ✅
npm run db:migrate:status # Migrations applied? ✅

# 4. Start development
npm run dev              # Terminal 1
npm run electron:dev     # Terminal 2
```

### During Development

```bash
# Run tests for file you're working on
npm test -- YourComponent.test.tsx

# Check your changes
git status               # What changed?
git diff                 # See changes

# Commit frequently
git add src/components/YourComponent.tsx
git commit -m "feat(ui): add YourComponent"
```

### Before Committing

```bash
# Run all quality checks
npm run guard

# If guard passes ✅
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

### End of Day

```bash
# Push your work (even if not done)
git push origin feature/your-feature

# GitHub Actions will test it overnight
# Check results next morning at:
# https://github.com/YOUR_REPO/actions
```

---

## 📈 Monitoring & Metrics

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

**Current Metrics**:
- Test Pass Rate: 95.3% (943/990) ✅ **Target exceeded!**
- Code Coverage: ~60% ⏳ Target: 80%

### GitHub Insights

**Repository Insights** (GitHub UI):
- **Pulse**: Recent activity, PRs, issues
- **Contributors**: Who's contributing
- **Traffic**: Views, clones, referrers
- **Commits**: Commit frequency, times
- **Code Frequency**: Additions/deletions over time

---

## 🎓 Learning Resources

### Project Documentation

- **[MASTER_BUILD_GUIDE.md](MASTER_BUILD_GUIDE.md)** - Complete 8-phase roadmap
- **[BUILD_QUICK_REFERENCE.md](BUILD_QUICK_REFERENCE.md)** - Quick command reference
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)** - Contribution guidelines
- **[TODO.md](../../TODO.md)** - Current project status

### API Documentation

- **[IPC_API_REFERENCE.md](../api/IPC_API_REFERENCE.md)** - All IPC handlers documented
- **[IPC_QUICK_REFERENCE.md](../api/IPC_QUICK_REFERENCE.md)** - IPC cheat sheet

### Implementation Guides

- **[ENCRYPTION_IMPLEMENTATION.md](../implementation/ENCRYPTION_IMPLEMENTATION.md)** - Encryption system
- **[FACTS_FEATURE_IMPLEMENTATION.md](../implementation/FACTS_FEATURE_IMPLEMENTATION.md)** - Facts feature
- **[AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](../../AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)** - Auth system

---

## 🚨 Troubleshooting

### Tests Failing

```bash
# Clear cache and retry
rm -rf node_modules/.vite
npm test

# Run specific test file
npm test -- src/path/to/test.test.tsx

# See test output in detail
npm test -- --reporter=verbose
```

### TypeScript Errors

```bash
# Check errors
npm run type-check

# Restart TypeScript server in Cursor
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Database Issues

```bash
# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback <migration_name>

# Fresh start (destructive!)
rm justice.db
npm run db:migrate
```

### Git Issues

```bash
# Merge conflicts
git status                # See conflicting files
# Edit files to resolve conflicts
git add .
git commit -m "fix: resolve merge conflicts"

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git restore .
```

---

## 🎉 You're Ready!

Your development environment is fully configured with:

✅ **Cursor IDE** - Extensions, shortcuts, auto-format
✅ **GitHub Actions** - Automated testing, releases
✅ **GitHub Projects** - Task tracking (manual setup)
✅ **Quality Tools** - ESLint, Prettier, TypeScript
✅ **Database** - Migrations applied
✅ **Documentation** - Complete guides
✅ **Test Suite** - 95.3% passing

**Next Steps**:
1. Set up GitHub Projects board (see above)
2. Configure branch protection (see above)
3. Start coding! Press `Ctrl+Shift+D` to begin

---

**Questions?** See [CONTRIBUTING.md](../../CONTRIBUTING.md) or create a GitHub Issue.
