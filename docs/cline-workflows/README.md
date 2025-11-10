# Cline Caretaker Workflows - Setup Guide

This directory contains 5 comprehensive workflow files for Cline to act as the project caretaker for Justice Companion.

## Overview

The caretaker system consists of 5 workflows that run at different cadences:

1. **Daily Status Sweep** - Daily operational health check
2. **Quality Gate Check** - Per-PR verification before merge
3. **Release Readiness Check** - Weekly pre-release verification
4. **Documentation Stewardship** - Post-merge doc maintenance
5. **Maintenance Backlog Review** - Bi-weekly technical debt review

## Quick Start

### Step 1: Verify Project Files

Ensure these files exist in your project:
- ✅ `.clinerules` (project root)
- ✅ `docs/guides/cline-project-stewardship.md` (comprehensive playbook)
- ✅ `.localclaude/config.json` (workflow configuration)
- ✅ `.localclaude/plan.json` (work plan)
- ✅ `.localclaude/memory.json` (historical context)

### Step 2: Add Workflows to Cline

**Option A: Via Cline UI (Recommended)**

1. Open VS Code with Cline extension installed
2. Click Cline icon in sidebar
3. Go to **Workflows** tab
4. Click **New Workflow** or **Add Workflow**
5. For each workflow file in this directory:
   - Copy the entire file contents
   - Paste into Cline workflow editor
   - Give it a name matching the filename
   - Save

**Option B: Copy to Cline Workflows Directory**

1. Locate your Cline workflows directory:
   - **Windows:** `C:\Users\<username>\Documents\Cline\Workflows\`
   - **macOS:** `~/Documents/Cline/Workflows/`
   - **Linux:** `~/.local/share/Cline/Workflows/`

2. Copy all `.md` files from this directory to that location:
   ```bash
   # Windows (PowerShell)
   Copy-Item "docs\cline-workflows\*.md" -Destination "$env:USERPROFILE\Documents\Cline\Workflows\"

   # macOS/Linux
   cp docs/cline-workflows/*.md ~/Documents/Cline/Workflows/
   ```

3. Restart VS Code or reload Cline

### Step 3: Configure Workflow Resources

Each workflow needs access to these project files. In Cline's workflow editor:

1. Open each workflow
2. Click **Resources** or **Add Files**
3. Add these files:
   - `.clinerules`
   - `docs/guides/cline-project-stewardship.md`
   - `.localclaude/config.json`
   - `.localclaude/plan.json`
   - `.localclaude/memory.json`

### Step 4: Set Up Run Presets (Optional)

For each workflow, add relevant commands as "Run Presets":

**Daily Status Sweep:**
```bash
git fetch --all --prune
git status
pnpm workflow
```

**Quality Gate Check:**
```bash
pnpm lint
pnpm type-check
pnpm test
pnpm test:e2e
pnpm build
```

**Release Readiness Check:**
```bash
pnpm db:migrate:status
pnpm build:win
pnpm build:mac
pnpm build:linux
pnpm test
```

**Documentation Stewardship:**
```bash
git log --oneline --merges --since="24 hours ago"
pnpm docs:generate
```

**Maintenance Backlog Review:**
```bash
pnpm outdated
pnpm audit
git grep -n "TODO\|FIXME\|HACK\|BUG" src/
```

## Workflow Descriptions

### 1. Daily Status Sweep
**Frequency:** Daily at 9 AM (or on-demand)

**Purpose:** Operational cadence check

**Key Actions:**
- Fetch latest repository state
- Review open issues and PRs
- Identify blockers
- Update risk register
- Triage backlog
- Generate daily digest

**Outputs:**
- `.localclaude/history.jsonl` (daily digest entry)
- `.localclaude/memory.json` (new risk entries)
- Console summary with next actions

**Run Command:**
```
Cline: Run Workflow → Daily Status Sweep
```

### 2. Quality Gate Check
**Frequency:** Per PR (manually triggered or via CI)

**Purpose:** Comprehensive pre-merge verification

**Key Actions:**
- Run linting, type-check, tests
- Build verification
- Security scan
- Performance baseline
- Generate quality report
- Comment on PR with results

**Pass Criteria:**
- Zero lint errors
- Zero type errors
- 100% test pass rate
- Zero high/critical vulnerabilities
- Build succeeds

**Outputs:**
- `.localclaude/quality-gate-<commit>.json`
- PR comment with pass/fail summary

**Run Command:**
```
Cline: Run Workflow → Quality Gate Check
```

### 3. Release Readiness Check
**Frequency:** Weekly (Fridays at 2 PM) or pre-release

**Purpose:** Verify production readiness

**Key Actions:**
- Documentation verification
- Database migration safety check
- Multi-platform build verification
- Security audit
- Performance benchmarks
- Manual smoke test

**Release Decision:**
- 🟢 **Green Light:** All criteria met, proceed with release
- 🟡 **Yellow Light:** Minor issues, proceed with caution
- 🔴 **Red Light:** Critical issues, block release

**Outputs:**
- `.localclaude/release-checklist-vX.Y.Z.json`
- Release notes draft (if green light)

**Run Command:**
```
Cline: Run Workflow → Release Readiness Check
```

### 4. Documentation Stewardship
**Frequency:** After feature merges

**Purpose:** Maintain living documentation

**Key Actions:**
- Compare docs before/after merge
- Identify gaps (user guides, API docs, ADRs)
- Quick wins (CHANGELOG, .env.example)
- Queue larger doc projects
- Archive obsolete docs

**Gap Types:**
- Missing user guides
- Outdated API docs
- Missing ADRs
- Incomplete JSDoc

**Outputs:**
- `.localclaude/history.jsonl` (documentation health report)
- GitHub issues for larger doc projects
- Queued tasks in plan.json

**Run Command:**
```
Cline: Run Workflow → Documentation Stewardship
```

### 5. Maintenance Backlog Review
**Frequency:** Bi-weekly (every 14 days)

**Purpose:** Technical debt and dependency hygiene

**Key Actions:**
- Check for outdated dependencies
- Auto-update patch versions
- Inventory technical debt markers
- Analyze performance tuning opportunities
- Review error log patterns
- Calculate code quality metrics

**Outputs:**
- `.localclaude/maintenance-report.json`
- GitHub issues for critical debt
- Updated plan.json with action items

**Run Command:**
```
Cline: Run Workflow → Maintenance Backlog Review
```

## Using the Workflows

### Manual Trigger

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type `Cline: Run Workflow`
3. Select desired workflow
4. Wait for completion
5. Review outputs in:
   - Cline chat panel
   - `.localclaude/history.jsonl`
   - `.localclaude/memory.json`
   - Console output

### Automated Triggers

Set up automated runs via:

**GitHub Actions (CI):**
```yaml
# .github/workflows/cline-workflows.yml
name: Cline Workflows
on:
  pull_request:  # Quality Gate Check
  schedule:
    - cron: '0 9 * * 1'  # Daily Status Sweep (Mon-Fri 9 AM)
    - cron: '0 14 * * 5'  # Release Readiness (Fri 2 PM)
    - cron: '0 9 */14 * *'  # Maintenance Review (every 14 days)
  push:
    branches: [main, develop]  # Documentation Stewardship
```

**Git Hooks:**
```bash
# .git/hooks/pre-push
pnpm lint && pnpm type-check && pnpm test

# .git/hooks/post-merge
# Trigger Documentation Stewardship
```

**Cron Jobs (Local):**
```bash
# Add to crontab
0 9 * * 1-5 cd /path/to/Justice-Companion && cline run "Daily Status Sweep"
0 14 * * 5 cd /path/to/Justice-Companion && cline run "Release Readiness Check"
```

## Workflow Outputs Explained

### `.localclaude/history.jsonl`
JSONL file with one JSON object per line, each representing an event:
- Daily digests
- Quality gate results
- Documentation health reports
- Maintenance summaries

**Example entry:**
```json
{"timestamp":"2025-11-10T09:00:00Z","type":"daily_digest","data":{...}}
```

**Reading history:**
```bash
# View last 10 entries
tail -10 .localclaude/history.jsonl | jq .

# Filter by type
jq 'select(.type == "quality_gate")' .localclaude/history.jsonl
```

### `.localclaude/memory.json`
JSON object storing decisions, patterns, and context:
- Architectural decisions
- Risk entries
- Performance baselines
- Historical patterns

**Example entry:**
```json
{
  "decisions": [
    {
      "timestamp": "2025-11-10T12:00:00Z",
      "title": "Migrated to KeyManager for encryption keys",
      "rationale": "Fixes CVSS 9.1 vulnerability",
      "references": ["src/services/KeyManager.ts"]
    }
  ]
}
```

### `.localclaude/plan.json`
Work plan with phases and tasks:
- Operational Cadence
- Quality Gates
- Release Readiness
- Documentation Stewardship
- Maintenance Hygiene

**Managing plan:**
```bash
# View plan
pnpm workflow

# Commands:
# - list: Show all tasks
# - add: Create new task
# - update: Modify task
# - complete: Mark task done
# - notes: Add context
```

## Customization

### Adding Custom Workflows

Create new `.md` file in this directory:

```markdown
# Your Custom Workflow

## Purpose
Brief description

## Workflow Steps

### 1. Step Name
Description and commands
\```bash
command here
\```

### 2. Next Step
...

## Expected Outputs
What files are created/updated

## Run Frequency
When to run this workflow
```

### Modifying Existing Workflows

1. Open workflow file in editor
2. Modify steps, commands, or criteria
3. Save changes
4. Update in Cline:
   - Delete old workflow
   - Add modified version
   OR
   - Replace file in `~/Documents/Cline/Workflows/`
   - Reload Cline

### Workflow Templates

Use these templates for common workflow patterns:

**Check + Report Pattern:**
```markdown
### 1. Run Check
\```bash
pnpm check-command
\```

### 2. Analyze Results
Parse output and identify issues

### 3. Generate Report
Create summary in `.localclaude/history.jsonl`

### 4. Take Action
Create issues or queue tasks
```

**Diff + Gap Pattern:**
```markdown
### 1. Capture Before State
Record current state

### 2. Capture After State
Record new state after change

### 3. Compare States
Identify what changed

### 4. Identify Gaps
What documentation/tests are missing

### 5. Queue Follow-Up
Create tasks to close gaps
```

## Troubleshooting

### Workflow Not Appearing in Cline

**Issue:** Added workflow but not showing in list

**Solutions:**
1. Restart VS Code completely
2. Check file is in correct directory
3. Verify file extension is `.md`
4. Check Cline logs for errors

### Workflow Fails to Execute

**Issue:** Workflow starts but fails mid-execution

**Solutions:**
1. Check command paths are correct (use absolute paths)
2. Verify dependencies installed (`pnpm install`)
3. Check `.localclaude/` directory exists
4. Review error in Cline output panel

### Cannot Access Project Files

**Issue:** Workflow cannot read `.clinerules` or other files

**Solutions:**
1. Add files to workflow's "Resources" section in Cline
2. Verify file paths are relative to project root
3. Check file permissions (must be readable)

### Commands Not Found

**Issue:** Commands like `pnpm` or `git` not found

**Solutions:**
1. Ensure PATH includes Node.js and Git
2. Use full paths in workflow commands:
   ```bash
   /usr/bin/git status
   /path/to/pnpm test
   ```
3. Add PATH to workflow environment variables

### Outputs Not Generated

**Issue:** Expected `.localclaude/history.jsonl` not created

**Solutions:**
1. Check `.localclaude/` directory exists:
   ```bash
   mkdir -p .localclaude
   ```
2. Verify write permissions
3. Check workflow completed successfully

## Best Practices

### Do's
✅ Run "Daily Status Sweep" every morning
✅ Run "Quality Gate Check" before every PR
✅ Review workflow outputs in `.localclaude/history.jsonl`
✅ Update `.localclaude/memory.json` with important decisions
✅ Customize workflows to fit your project needs
✅ Keep `.clinerules` up to date
✅ Use `pnpm workflow` CLI to manage tasks

### Don'ts
❌ Don't skip quality gates to "move faster"
❌ Don't ignore P0 action items from maintenance review
❌ Don't modify `.localclaude/` files manually (use workflow CLI)
❌ Don't run workflows in unstable branch (use main/develop)
❌ Don't commit sensitive data to workflow outputs

## Support

### Getting Help
- Read `.clinerules` for detailed caretaker responsibilities
- Check `docs/guides/cline-project-stewardship.md` for playbook
- Review `.localclaude/memory.json` for past decisions
- Search `.localclaude/history.jsonl` for similar issues

### Filing Issues
If a workflow is broken:
1. Capture error output from Cline panel
2. Check `.localclaude/history.jsonl` for error entry
3. Create GitHub issue with:
   - Workflow name
   - Steps to reproduce
   - Error message
   - Expected vs actual behavior

### Contributing Improvements
To improve workflows:
1. Modify workflow file
2. Test changes locally
3. Create PR with:
   - Description of change
   - Reason for change
   - Before/after examples
   - Updated documentation

## Version History

- **v1.0.0** (2025-11-10): Initial workflow suite created
  - 5 workflows covering operational, quality, release, docs, maintenance
  - Comprehensive `.clinerules` file
  - Playbook documentation
  - Workflow CLI integration

## Next Steps

After setup:
1. ✅ Verify all workflows added to Cline
2. ✅ Run "Daily Status Sweep" manually to test
3. ✅ Review output in `.localclaude/history.jsonl`
4. ✅ Set up automated triggers (GitHub Actions, cron)
5. ✅ Customize workflows to fit your team's needs
6. ✅ Train team members on using workflows

**You're all set!** Cline is now configured as Justice Companion's caretaker.
