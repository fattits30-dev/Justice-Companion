# Justice Companion Caretaker - Daily Status Sweep

## Purpose
Perform daily operational cadence: fetch repository state, triage backlog, identify blockers, and update risk register.

## Workflow Steps

### 1. Load Context Files
Read these files before starting:
- `.clinerules` - Core caretaker responsibilities
- `docs/guides/cline-project-stewardship.md` - Detailed playbook
- `.localclaude/plan.json` - Current work plan
- `.localclaude/memory.json` - Historical decisions
- `.localclaude/config.json` - Workflow configuration

### 2. Repository Status Check
Execute these commands:
```bash
git fetch --all --prune
git status
git log --oneline --since="24 hours ago"
```

**Capture:**
- New commits
- Changed files
- Uncommitted changes

### 3. Issue & PR Review
Use GitHub API or web interface to check:
- Open issues (filter: `is:issue is:open`)
- Open PRs (filter: `is:pr is:open`)
- Stale items (>7 days without updates)

**For each open item:**
- Identify blockers (label: `blocked`)
- Check owner assignment
- Review CI status
- Note priority (labels: `P0`, `P1`, `P2`)

### 4. Quality Gate Status
Run automated checks:
```bash
pnpm lint 2>&1 | tee .localclaude/lint-report.txt
pnpm type-check 2>&1 | tee .localclaude/typecheck-report.txt
pnpm test --reporter=json --outputFile=.localclaude/test-report.json
pnpm audit --json > .localclaude/audit-report.json
```

**Assess:**
- Linting errors/warnings
- TypeScript errors
- Test pass rate
- Security vulnerabilities (CVSS scores)

### 5. Risk Register Update
Identify new risks:
- **Code Quality:** Lint/type errors > 10
- **Test Health:** Pass rate < 95%
- **Security:** CVSS > 7.0 vulnerabilities
- **Dependencies:** Outdated packages with known issues
- **Build:** Recent build failures

**Document in `.localclaude/memory.json`:**
```json
{
  "timestamp": "2025-11-10T09:00:00Z",
  "type": "risk",
  "severity": "high",
  "title": "Auth flow test failing",
  "description": "3 E2E tests failing in auth flow after migration",
  "mitigation": "Assigned to @dev-team, target fix by EOD",
  "references": ["test-report.json"]
}
```

### 6. Backlog Triage
Load `.localclaude/plan.json` and update:
1. Mark completed tasks as `completed`
2. Update task priorities based on new risks
3. Add new tasks discovered during sweep
4. Assign owners to unassigned tasks

Use workflow CLI:
```bash
pnpm workflow
# Select: update, add, or complete
```

### 7. Generate Daily Digest
Create summary in `.localclaude/history.jsonl`:
```json
{
  "timestamp": "2025-11-10T09:30:00Z",
  "type": "daily_digest",
  "data": {
    "commits_since_yesterday": 5,
    "open_issues": 12,
    "open_prs": 3,
    "blockers": [
      {"id": "#123", "title": "Auth flow broken", "owner": "unassigned"}
    ],
    "lint_errors": 2,
    "type_errors": 0,
    "test_pass_rate": 98.5,
    "security_vulnerabilities": {
      "critical": 0,
      "high": 1,
      "moderate": 3,
      "low": 5
    },
    "risks": [
      {
        "severity": "high",
        "title": "High severity vuln in dependency",
        "package": "better-sqlite3",
        "cve": "CVE-2024-1234"
      }
    ],
    "next_actions": [
      "Assign owner to #123",
      "Update better-sqlite3 to 11.10.0",
      "Fix 2 remaining lint errors"
    ]
  }
}
```

### 8. Escalate Blockers
If any P0 blockers found:
1. Create GitHub issue with label `P0` and `blocker`
2. @-mention repository owner
3. Include repro steps and logs
4. Link to relevant commits/PRs

### 9. Archive Reports
Move reports to archive folder:
```bash
mkdir -p .localclaude/archives/$(date +%Y-%m-%d)
mv .localclaude/*-report.* .localclaude/archives/$(date +%Y-%m-%d)/
```

## Expected Outputs

### Console Summary
```
=== Justice Companion Daily Status Sweep ===
Date: 2025-11-10 09:00:00

Repository Status:
✓ Up to date with origin/cleanup/linting-fixes
✓ 5 commits since yesterday
✓ No uncommitted changes

Issues & PRs:
⚠ 12 open issues (1 P0, 3 P1, 8 P2)
⚠ 3 open PRs (all passing CI)
⚠ 1 blocker: #123 "Auth flow broken" (unassigned)

Quality Gates:
✓ Linting: 2 errors (down from 5)
✓ Type Check: PASS
✓ Tests: 98.5% pass (1152/1170)
⚠ Security: 1 high severity vulnerability

Risk Register:
🔴 HIGH: CVE-2024-1234 in better-sqlite3
🟡 MEDIUM: 3 stale PRs >7 days old
🟢 LOW: 2 lint errors remaining

Next Actions:
1. Assign owner to #123
2. Update better-sqlite3 to 11.10.0
3. Review and merge stale PRs
4. Fix 2 remaining lint errors

Full report: .localclaude/history.jsonl
```

### Updated Files
- `.localclaude/history.jsonl` - New digest entry
- `.localclaude/memory.json` - New risk entries
- `.localclaude/plan.json` - Updated task statuses
- `.localclaude/archives/YYYY-MM-DD/` - Report snapshots

## Success Criteria
- ✓ All commands executed successfully
- ✓ Daily digest generated
- ✓ Blockers escalated (if any)
- ✓ Risk register updated
- ✓ Backlog triaged
- ✓ Reports archived

## Run Frequency
**Daily at 9 AM** (or on-demand via Cline workflow trigger)

## Related Workflows
- "Quality Gate Check" (runs per PR)
- "Release Readiness Check" (runs weekly)
- "Documentation Stewardship" (runs after feature merges)
- "Maintenance Backlog Review" (runs bi-weekly)
