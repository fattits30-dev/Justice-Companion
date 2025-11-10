# ✅ Cline Caretaker Setup - COMPLETE

**Date:** 2025-11-10
**Status:** Ready to Use

## What Was Created

I've set up a comprehensive caretaker system for Justice Companion with 5 automated workflows, complete configuration files, and detailed documentation.

### Files Created (10 total)

#### Configuration Files
1. **`.clinerules`** - Core caretaker responsibilities and operational rules (363 lines)
2. **`.localclaude/config.json`** - Workflow configuration
3. **`.localclaude/plan.json`** - Multi-phase work plan with 15 tasks
4. **`.localclaude/memory.json`** - Knowledge base for historical context

#### Documentation
5. **`docs/guides/cline-project-stewardship.md`** - Comprehensive playbook (existing)

#### Workflow Files (in `docs/cline-workflows/`)
6. **Daily Status Sweep** - Operational health check (runs daily)
7. **Quality Gate Check** - Pre-merge verification (per PR)
8. **Release Readiness Check** - Production verification (weekly)
9. **Documentation Stewardship** - Post-merge doc maintenance (after features)
10. **Maintenance Backlog Review** - Technical debt cleanup (bi-weekly)

#### Guides
11. **`docs/cline-workflows/README.md`** - Complete setup guide
12. **`docs/cline-workflows/QUICK-REFERENCE.md`** - One-page cheat sheet

---

## Quick Start (3 Steps)

### Step 1: Verify Files Exist

Run this command to verify all files were created:

```bash
# Windows (PowerShell)
Get-ChildItem -Path .clinerules, .localclaude\config.json, .localclaude\plan.json, .localclaude\memory.json, docs\cline-workflows\*.md | Select-Object Name, Length

# macOS/Linux
ls -lh .clinerules .localclaude/*.json docs/cline-workflows/*.md
```

**Expected output:** 12 files listed

### Step 2: Add Workflows to Cline

#### Option A: Copy Files to Cline Directory (Easiest)

**Windows:**
```powershell
# Create Cline workflows directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\Cline\Workflows"

# Copy all workflow files
Copy-Item "docs\cline-workflows\*.md" -Destination "$env:USERPROFILE\Documents\Cline\Workflows\"

# Verify copy
Get-ChildItem "$env:USERPROFILE\Documents\Cline\Workflows" | Select-Object Name
```

**macOS/Linux:**
```bash
# Create Cline workflows directory if it doesn't exist
mkdir -p ~/Documents/Cline/Workflows

# Copy all workflow files
cp docs/cline-workflows/*.md ~/Documents/Cline/Workflows/

# Verify copy
ls -1 ~/Documents/Cline/Workflows/
```

**Expected output:** 7 files (5 workflows + README + QUICK-REFERENCE)

#### Option B: Manual Copy-Paste in Cline UI

1. Open VS Code
2. Click **Cline** icon in sidebar
3. Go to **Workflows** tab
4. Click **New Workflow** or **+**
5. Copy-paste each workflow file (see section below)

### Step 3: Test the Setup

Run the Daily Status Sweep workflow:

1. Open Command Palette: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
2. Type: `Cline: Run Workflow`
3. Select: `Justice Companion Caretaker - Daily Status Sweep`
4. Wait for completion (5-10 minutes)
5. Check outputs:
   ```bash
   cat .localclaude/history.jsonl
   ```

**If successful:** You'll see a daily digest entry with repository status, open issues, and next actions.

---

## Copy-Paste Workflows (Option B)

If using Cline UI to add workflows manually, copy the content of each file below:

### Workflow 1: Daily Status Sweep

**File:** `docs/cline-workflows/Justice Companion Caretaker - Daily Status Sweep.md`

**Copy entire file contents and paste into Cline workflow editor.**

**Name in Cline:** `Justice Companion Caretaker - Daily Status Sweep`

**Resources to add:**
- `.clinerules`
- `docs/guides/cline-project-stewardship.md`
- `.localclaude/config.json`
- `.localclaude/plan.json`
- `.localclaude/memory.json`

**Run preset (optional):**
```bash
git fetch --all --prune && git status && pnpm workflow
```

---

### Workflow 2: Quality Gate Check

**File:** `docs/cline-workflows/Justice Companion Caretaker - Quality Gate Check.md`

**Copy entire file contents and paste into Cline workflow editor.**

**Name in Cline:** `Justice Companion Caretaker - Quality Gate Check`

**Resources to add:**
- `.clinerules`
- `docs/guides/cline-project-stewardship.md`
- `.localclaude/config.json`
- `.localclaude/plan.json`
- `.localclaude/memory.json`

**Run preset (optional):**
```bash
pnpm lint && pnpm type-check && pnpm test && pnpm test:e2e && pnpm build
```

---

### Workflow 3: Release Readiness Check

**File:** `docs/cline-workflows/Justice Companion Caretaker - Release Readiness Check.md`

**Copy entire file contents and paste into Cline workflow editor.**

**Name in Cline:** `Justice Companion Caretaker - Release Readiness Check`

**Resources to add:**
- `.clinerules`
- `docs/guides/cline-project-stewardship.md`
- `.localclaude/config.json`
- `.localclaude/plan.json`
- `.localclaude/memory.json`

**Run preset (optional):**
```bash
pnpm db:migrate:status && pnpm build:win && pnpm build:mac && pnpm build:linux
```

---

### Workflow 4: Documentation Stewardship

**File:** `docs/cline-workflows/Justice Companion Caretaker - Documentation Stewardship.md`

**Copy entire file contents and paste into Cline workflow editor.**

**Name in Cline:** `Justice Companion Caretaker - Documentation Stewardship`

**Resources to add:**
- `.clinerules`
- `docs/guides/cline-project-stewardship.md`
- `.localclaude/config.json`
- `.localclaude/plan.json`
- `.localclaude/memory.json`

**Run preset (optional):**
```bash
git log --oneline --merges --since="24 hours ago" && pnpm docs:generate
```

---

### Workflow 5: Maintenance Backlog Review

**File:** `docs/cline-workflows/Justice Companion Caretaker - Maintenance Backlog Review.md`

**Copy entire file contents and paste into Cline workflow editor.**

**Name in Cline:** `Justice Companion Caretaker - Maintenance Backlog Review`

**Resources to add:**
- `.clinerules`
- `docs/guides/cline-project-stewardship.md`
- `.localclaude/config.json`
- `.localclaude/plan.json`
- `.localclaude/memory.json`

**Run preset (optional):**
```bash
pnpm outdated && pnpm audit && git grep -n "TODO\|FIXME\|HACK\|BUG" src/
```

---

## Usage Guide

### Daily Workflow

**Every morning (9 AM):**
1. Run **Daily Status Sweep** workflow
2. Review output in `.localclaude/history.jsonl`
3. Check for P0 blockers
4. Update tasks via `pnpm workflow`

**Before every PR:**
1. Run **Quality Gate Check** workflow
2. Ensure all gates pass (lint, type-check, tests, build)
3. Fix any failures before merge

**After feature merge:**
1. Run **Documentation Stewardship** workflow
2. Update CHANGELOG.md
3. Add new env vars to .env.example
4. Queue larger doc tasks

**Every Friday (2 PM):**
1. Run **Release Readiness Check** workflow
2. Verify all 6 categories (docs, db, builds, security, performance, testing)
3. Make release decision (green/yellow/red light)

**Every 2 weeks:**
1. Run **Maintenance Backlog Review** workflow
2. Update dependencies (patches auto, review majors)
3. Address technical debt (TODOs, FIXMEs, HACKs)
4. Fix top 3 error patterns

### Command Reference

**Workflow management:**
```bash
pnpm workflow        # Open CLI
pnpm workflow list   # List tasks
pnpm workflow add    # Add task
```

**Quality checks:**
```bash
pnpm lint           # ESLint
pnpm type-check     # TypeScript
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm build          # Production build
pnpm audit          # Security scan
```

**Database:**
```bash
pnpm db:migrate              # Run migrations
pnpm db:migrate:status       # Check status
pnpm db:backup               # Create backup
```

### Key Files

**Read these before taking action:**
- `.clinerules` - Core responsibilities
- `docs/guides/cline-project-stewardship.md` - Detailed playbook
- `.localclaude/plan.json` - Current work
- `.localclaude/memory.json` - Historical context

**Write to these after taking action:**
- `.localclaude/history.jsonl` - Event log (append only)
- `.localclaude/memory.json` - New decisions

---

## Automation Setup (Optional)

### GitHub Actions

Create `.github/workflows/cline-caretaker.yml`:

```yaml
name: Cline Caretaker Workflows

on:
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: '0 9 * * 1-5'  # Daily Status Sweep (Mon-Fri 9 AM)
    - cron: '0 14 * * 5'   # Release Readiness (Fri 2 PM)
    - cron: '0 9 1,15 * *' # Maintenance Review (1st & 15th)
  push:
    branches: [main, develop]

jobs:
  quality-gate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build

  daily-sweep:
    if: github.event.schedule == '0 9 * * 1-5'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: git fetch --all --prune
      - run: gh issue list --state open --json number,title

  release-check:
    if: github.event.schedule == '0 14 * * 5'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm db:migrate:status
      - run: pnpm test
      - run: pnpm build
```

### Git Hooks

Add to `.git/hooks/pre-push`:

```bash
#!/bin/bash
echo "Running pre-push quality gates..."
pnpm lint && pnpm type-check && pnpm test
if [ $? -ne 0 ]; then
  echo "❌ Quality gates failed. Push aborted."
  exit 1
fi
echo "✅ Quality gates passed."
```

Make executable:
```bash
chmod +x .git/hooks/pre-push
```

### Cron Jobs (Local Machine)

Add to crontab (`crontab -e`):

```bash
# Daily Status Sweep (Mon-Fri 9 AM)
0 9 * * 1-5 cd /path/to/Justice-Companion && /usr/local/bin/cline run "Daily Status Sweep"

# Release Readiness Check (Fri 2 PM)
0 14 * * 5 cd /path/to/Justice-Companion && /usr/local/bin/cline run "Release Readiness Check"

# Maintenance Review (Every 2 weeks)
0 9 1,15 * * cd /path/to/Justice-Companion && /usr/local/bin/cline run "Maintenance Backlog Review"
```

---

## Troubleshooting

### Workflows Not Showing in Cline

**Issue:** Added workflows but not appearing in list

**Solution:**
1. Restart VS Code completely
2. Check files are in correct directory:
   - **Windows:** `C:\Users\<username>\Documents\Cline\Workflows\`
   - **macOS/Linux:** `~/Documents/Cline/Workflows/`
3. Verify file extension is `.md`
4. Check Cline extension is updated

### Workflow Execution Fails

**Issue:** Workflow starts but fails mid-execution

**Solution:**
1. Check command paths (use absolute paths if needed)
2. Verify dependencies: `pnpm install`
3. Ensure `.localclaude/` directory exists: `mkdir -p .localclaude`
4. Review error in Cline output panel

### Cannot Access Project Files

**Issue:** Workflow cannot read `.clinerules`

**Solution:**
1. Add files to workflow's "Resources" in Cline
2. Use paths relative to project root
3. Check file permissions

### Commands Not Found

**Issue:** `pnpm` or `git` not found

**Solution:**
1. Add to PATH
2. Use full paths in workflows:
   ```bash
   /usr/bin/git status
   /path/to/node_modules/.bin/pnpm test
   ```

---

## Success Metrics

Track these KPIs in `.localclaude/memory.json`:

| Metric | Target | Check Command |
|--------|--------|---------------|
| Test Pass Rate | 100% | `pnpm test` |
| Test Coverage | >80% | `pnpm test:coverage` |
| TypeScript Errors | 0 | `pnpm type-check` |
| Lint Errors | 0 | `pnpm lint` |
| Critical Vulnerabilities | 0 | `pnpm audit` |
| High Vulnerabilities | 0 | `pnpm audit` |
| Build Success | 100% | `pnpm build` |
| Cold Start Time | <3s | Manual test |
| Memory (Idle) | <200MB | `ps aux \| grep Justice` |

---

## Next Steps

### Immediate (Today)
1. ✅ Verify all files created (Step 1 above)
2. ✅ Add workflows to Cline (Step 2 above)
3. ✅ Run Daily Status Sweep to test (Step 3 above)
4. ✅ Review outputs in `.localclaude/history.jsonl`

### This Week
1. ☐ Run Quality Gate Check on next PR
2. ☐ Set up GitHub Actions automation
3. ☐ Create pre-push git hook
4. ☐ Train team members on workflows

### Ongoing
1. ☐ Run Daily Status Sweep every morning
2. ☐ Run Quality Gate Check before every PR
3. ☐ Run Release Readiness Check every Friday
4. ☐ Run Maintenance Review bi-weekly (1st & 15th)

---

## Documentation

**Main Guides:**
- **Setup:** `docs/cline-workflows/README.md` (this was created for you)
- **Quick Reference:** `docs/cline-workflows/QUICK-REFERENCE.md` (print this!)
- **Playbook:** `docs/guides/cline-project-stewardship.md` (comprehensive)
- **Rules:** `.clinerules` (core responsibilities)

**Workflow Files:**
All in `docs/cline-workflows/`:
- `Justice Companion Caretaker - Daily Status Sweep.md`
- `Justice Companion Caretaker - Quality Gate Check.md`
- `Justice Companion Caretaker - Release Readiness Check.md`
- `Justice Companion Caretaker - Documentation Stewardship.md`
- `Justice Companion Caretaker - Maintenance Backlog Review.md`

---

## Support

**Need Help?**
1. Read `.clinerules` for guidance
2. Check `docs/cline-workflows/README.md` for setup help
3. Review `.localclaude/memory.json` for past decisions
4. Search `.localclaude/history.jsonl` for similar issues
5. Create GitHub issue with `cline-workflows` label

**Reporting Issues:**
1. Capture error output from Cline panel
2. Check `.localclaude/history.jsonl` for error entry
3. Create issue with:
   - Workflow name
   - Steps to reproduce
   - Error message
   - Expected vs actual behavior

---

## Summary

**You now have:**
✅ 5 comprehensive workflows covering all aspects of project caretaking
✅ Complete configuration files (`.clinerules`, plan, config, memory)
✅ Detailed documentation and playbooks
✅ Quick reference guide (print-friendly)
✅ Automation setup guides (GitHub Actions, git hooks, cron)

**Cline can now:**
- ✅ Perform daily operational health checks
- ✅ Run quality gates before PR merges
- ✅ Verify release readiness weekly
- ✅ Maintain documentation after feature merges
- ✅ Review technical debt bi-weekly
- ✅ Track all work in `.localclaude/plan.json`
- ✅ Log all events in `.localclaude/history.jsonl`
- ✅ Store decisions in `.localclaude/memory.json`

**Your role:**
- Trigger workflows at appropriate times (or automate)
- Review workflow outputs
- Address P0/P1 action items
- Keep `.localclaude/plan.json` updated via `pnpm workflow`

---

**🎉 Setup Complete!** Cline is now your project's caretaker.

Start with: `Cline: Run Workflow` → `Daily Status Sweep`

**Last Updated:** 2025-11-10 | **Version:** 1.0.0
