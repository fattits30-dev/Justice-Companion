# Cline Caretaker Workflows - Quick Reference

One-page guide to all caretaker workflows. Print or keep open while working.

---

## 🌅 Daily Status Sweep
**When:** Every morning (9 AM) or start of work day
**Duration:** 5-10 minutes
**Purpose:** Operational health check

### Quick Steps
1. `git fetch --all && git status`
2. Review open issues/PRs on GitHub
3. Run `pnpm lint && pnpm type-check && pnpm test`
4. Check security: `pnpm audit --audit-level=high`
5. Update `.localclaude/plan.json`: `pnpm workflow`

### Key Outputs
- Daily digest in `.localclaude/history.jsonl`
- Risk entries in `.localclaude/memory.json`
- Updated task statuses in `.localclaude/plan.json`

### Red Flags
🔴 P0 blocker unassigned
🔴 Critical/high security vulnerability
🔴 Test pass rate < 95%
🔴 >3 stale PRs (>7 days)

---

## ✅ Quality Gate Check
**When:** Before every PR merge
**Duration:** 10-15 minutes
**Purpose:** Prevent broken code from reaching main

### Checklist
- [ ] `pnpm lint` → 0 errors
- [ ] `pnpm type-check` → 0 errors
- [ ] `pnpm test` → 100% pass
- [ ] `pnpm test:e2e` → 100% pass
- [ ] `pnpm build` → Success
- [ ] `pnpm audit --audit-level=moderate` → 0 high/critical
- [ ] Performance baseline: Cold start <3s, Memory <200MB

### Pass Criteria
ALL gates must pass. If ANY fail, block merge.

### Actions on Failure
1. Add `do-not-merge` label to PR
2. Comment with failure summary
3. Assign owner to fix
4. Re-run after fixes

---

## 🚀 Release Readiness Check
**When:** Weekly (Friday 2 PM) or before planned release
**Duration:** 30-60 minutes
**Purpose:** Verify production readiness

### 6 Categories
1. **Documentation** → README, CHANGELOG, API docs current
2. **Database** → Migrations tested, backups verified
3. **Builds** → Windows, macOS, Linux all succeed
4. **Security** → 0 critical/high vulnerabilities, keys secured
5. **Performance** → Benchmarks met (cold start, memory, queries)
6. **Testing** → Manual smoke test passed

### Release Decisions
🟢 **Green Light** → All criteria met, proceed
🟡 **Yellow Light** → Minor issues, proceed with caution
🔴 **Red Light** → Critical issues, block release

### Pre-Release Commands
```bash
npm version minor  # or patch/major
git tag v1.2.0
git push origin v1.2.0
# GitHub Actions auto-builds release
```

---

## 📝 Documentation Stewardship
**When:** After feature merges to main/develop
**Duration:** 15-30 minutes
**Purpose:** Keep docs synchronized with code

### Trigger Detection
```bash
git log --oneline --merges --since="24 hours ago"
```

### Gap Types to Check
- [ ] New features without user guides
- [ ] Changed APIs without updated docs
- [ ] Missing ADRs (architecture decisions)
- [ ] Incomplete JSDoc comments
- [ ] Outdated screenshots

### Quick Wins (Do Immediately)
- Update CHANGELOG.md with new commits
- Add new env vars to .env.example
- Refresh README feature list
- Generate API docs: `pnpm docs:generate`

### Queue for Later
- User guides (>30 min effort)
- Architecture diagrams
- Video tutorials
- Comprehensive ADRs

---

## 🛠️ Maintenance Backlog Review
**When:** Bi-weekly (every 14 days)
**Duration:** 60-90 minutes
**Purpose:** Technical debt and dependency hygiene

### 5 Review Areas

#### 1. Dependencies
```bash
pnpm outdated
pnpm audit
```
- Auto-update patches
- Review minor/major updates
- Fix high/critical vulnerabilities

#### 2. Technical Debt
```bash
git grep -n "TODO\|FIXME\|HACK\|BUG" src/
```
- Count markers by type
- Convert critical to issues
- Clean up resolved TODOs

#### 3. Performance
- Profile slow queries (>100ms)
- Identify large React components
- Check for memory leaks
- Analyze bundle size

#### 4. Error Patterns
```bash
jq 'select(.type == "error")' .localclaude/history.jsonl
```
- Group by error type
- Find root causes
- File bug tickets for top 3

#### 5. Code Quality
```bash
pnpm test:coverage
pnpm complexity-report
pnpm depcheck
```
- Check test coverage (target >80%)
- Identify high-complexity files
- Remove dead code

### Priority Levels
**P0** (Fix This Week): Security, memory leaks, data corruption
**P1** (Fix in 2 Weeks): Performance, high-impact bugs, critical debt
**P2** (Fix in 1 Month): Moderate issues, code complexity
**P3** (Backlog): Nice-to-haves, minor improvements

---

## 🎯 Common Commands

### Workflow Management
```bash
pnpm workflow        # Open workflow CLI
pnpm workflow list   # List all tasks
pnpm workflow add    # Add new task
```

### Quality Checks
```bash
pnpm lint           # ESLint
pnpm lint:fix       # Auto-fix lint errors
pnpm type-check     # TypeScript
pnpm test           # Unit tests (Vitest)
pnpm test:e2e       # E2E tests (Playwright)
pnpm test:coverage  # Coverage report
pnpm build          # Production build
pnpm audit          # Security scan
```

### Database Operations
```bash
pnpm db:migrate               # Run migrations
pnpm db:migrate:status        # Check status
pnpm db:migrate:rollback      # Rollback last
pnpm db:backup                # Create backup
```

### Documentation
```bash
pnpm docs:generate  # Generate API docs from TypeScript
```

---

## 📁 Key Files

### Read Before Acting
- `.clinerules` → Core caretaker responsibilities
- `docs/guides/cline-project-stewardship.md` → Comprehensive playbook
- `.localclaude/plan.json` → Current work plan
- `.localclaude/memory.json` → Historical decisions

### Write After Acting
- `.localclaude/history.jsonl` → Event log (append only)
- `.localclaude/memory.json` → Add new decisions/patterns

---

## 🚨 Emergency Procedures

### Critical Build Failure
1. Label issue as `P0`, `build-failure`
2. Roll back last commit if safe: `git revert HEAD`
3. Investigate: `pnpm build --debug`
4. Document in `.localclaude/memory.json`

### Security Vulnerability (CVSS >7.0)
1. Create P0 issue immediately
2. Check for fix: `pnpm update <package>`
3. If no fix: Find alternative or patch
4. Document in SECURITY.md

### Test Failures
1. Identify: `pnpm test --reporter=verbose`
2. Check git blame for recent changes
3. Create issue with repro steps
4. Mark related tasks as blocked

---

## 💡 Pro Tips

### Workflow Efficiency
- Run "Daily Status Sweep" first thing every morning
- Keep `.localclaude/plan.json` up to date via `pnpm workflow`
- Review `.localclaude/history.jsonl` weekly for patterns
- Use `jq` to query history: `jq 'select(.type == "error")' .localclaude/history.jsonl`

### Documentation Maintenance
- Update CHANGELOG.md after every feature merge
- Generate API docs automatically: `pnpm docs:generate`
- Keep .env.example synchronized with .env
- Archive obsolete docs to `docs/archive/`

### Quality Assurance
- Never skip quality gates (lint, type-check, tests)
- Fix P0 issues before any other work
- Maintain >80% test coverage
- Zero tolerance for critical/high security vulnerabilities

### Technical Debt
- Convert all FIXME/HACK comments to GitHub issues
- Schedule debt paydown in every sprint
- Refactor high-complexity files (>50 complexity score)
- Remove dead code regularly

---

## 📊 KPI Targets

| Metric | Target | Current |
|--------|--------|---------|
| Test Pass Rate | 100% | Check: `pnpm test` |
| Test Coverage | >80% | Check: `pnpm test:coverage` |
| TypeScript Errors | 0 | Check: `pnpm type-check` |
| Lint Errors | 0 | Check: `pnpm lint` |
| Critical Vulnerabilities | 0 | Check: `pnpm audit` |
| High Vulnerabilities | 0 | Check: `pnpm audit` |
| Build Success Rate | 100% | Check: `pnpm build` |
| Cold Start Time | <3s | Manual test |
| Memory (Idle) | <200MB | Check: `ps aux` |

---

## 🔗 Quick Links

- **GitHub Repo:** https://github.com/justice-companion/justice-companion
- **Issues:** https://github.com/justice-companion/justice-companion/issues
- **Pull Requests:** https://github.com/justice-companion/justice-companion/pulls
- **CI/CD:** GitHub Actions → .github/workflows/
- **Documentation:** docs/
- **Workflow CLI:** `pnpm workflow`

---

## 📞 Getting Help

1. Read `.clinerules` for detailed guidance
2. Check `.localclaude/memory.json` for past decisions
3. Search `.localclaude/history.jsonl` for similar issues
4. Review `docs/guides/cline-project-stewardship.md`
5. Create GitHub issue with `help-wanted` label

---

**Keep this reference handy!** Pin to your desktop or print for quick access.

**Last Updated:** 2025-11-10 | **Version:** 1.0.0
