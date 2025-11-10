# Justice Companion Caretaker - Documentation Stewardship

## Purpose
Maintain living documentation by reviewing diffs after feature merges, identifying gaps, and queuing updates to keep docs synchronized with code.

## Workflow Steps

### 1. Trigger Detection

Run this workflow after:
- Feature branch merged to `main` or `develop`
- New API endpoints added
- Database schema changed
- Breaking changes introduced
- New dependencies added

**Detect merge commits:**
```bash
git log --oneline --merges --since="24 hours ago"
```

**For each merge, capture:**
- Commit SHA
- Branch name
- Feature description (from PR title)
- Files changed

### 2. Documentation Diff Analysis

#### Compare Docs Before/After Merge
```bash
# Get merge commit
MERGE_SHA=$(git log --merges --format="%H" -1)

# Get parent commits (before merge)
PARENT1=$(git log --format="%P" -1 $MERGE_SHA | cut -d' ' -f1)
PARENT2=$(git log --format="%P" -1 $MERGE_SHA | cut -d' ' -f2)

# Diff docs directory
git diff $PARENT1 $MERGE_SHA -- docs/ > .localclaude/docs-diff.txt
```

**Identify doc changes:**
- New doc files added
- Existing docs modified
- Docs deleted
- Screenshots updated

#### Code Changes Needing Doc Updates
```bash
# Check for new TypeScript interfaces/types
git diff $PARENT1 $MERGE_SHA -- src/**/*.ts | grep -A 5 "^+export interface\|^+export type"

# Check for new functions/methods
git diff $PARENT1 $MERGE_SHA -- src/**/*.ts | grep -A 3 "^+export function\|^+export const.*=.*("

# Check for database migrations
git diff $PARENT1 $MERGE_SHA -- src/db/migrations/

# Check for new environment variables
git diff $PARENT1 $MERGE_SHA -- .env.example
```

### 3. Gap Identification

#### New Features Without User Guides
**Check:**
- New UI components without usage examples
- New API endpoints without request/response docs
- New CLI commands without help text

**Example gaps:**
```json
{
  "gap_type": "missing_user_guide",
  "feature": "GDPR data export",
  "files_changed": [
    "src/services/gdpr/DataExporter.ts",
    "src/components/settings/GdprPanel.tsx"
  ],
  "doc_needed": "docs/guides/gdpr-data-export.md",
  "priority": "high",
  "reason": "User-facing feature requiring instructions"
}
```

#### Changed APIs Without Updated Docs
**Check:**
- Function signatures changed
- Parameters added/removed
- Return types modified
- Error handling updated

**Example gaps:**
```json
{
  "gap_type": "outdated_api_doc",
  "api": "AuthenticationService.login()",
  "change": "Added optional 'rememberMe' parameter",
  "current_doc": "docs/api/authentication.md:45",
  "action": "Update parameter table with rememberMe field"
}
```

#### Missing ADRs (Architecture Decision Records)
**Check:**
- New architectural patterns introduced
- Technology choices made (e.g., new dependencies)
- Design trade-offs documented

**Example gaps:**
```json
{
  "gap_type": "missing_adr",
  "decision": "Migrated from .env to KeyManager for encryption keys",
  "rationale": "Fixes CVSS 9.1 vulnerability, improves security",
  "doc_needed": "docs/adr/0005-os-keychain-encryption-keys.md",
  "priority": "high"
}
```

### 4. Automated Documentation Updates

#### Generate API Documentation
```bash
# Generate TypeDoc API docs
pnpm docs:generate

# Check for drift
git diff docs/api/
```

**If drift detected:**
- Review generated docs
- Commit if accurate
- Manually fix if generation missed context

#### Update Code Comments
Run ESLint rule to check JSDoc coverage:
```bash
pnpm lint --rule 'jsdoc/require-jsdoc: warn'
```

**For new public functions without JSDoc:**
- Add description
- Document parameters
- Document return value
- Document exceptions

**Example:**
```typescript
/**
 * Exports all user data in machine-readable JSON format (GDPR Article 20).
 *
 * @param userId - Unique identifier of user requesting export
 * @param options - Export configuration options
 * @param options.format - Output format ('json' only currently supported)
 * @param options.includeAuditLogs - Whether to include audit trail (default: true)
 * @returns Export result with file path and metadata
 * @throws {GdprRateLimitError} If user exceeded 5 exports per 24 hours
 * @throws {GdprConsentError} If user lacks data_processing consent
 */
export async function exportUserData(
  userId: string,
  options: ExportOptions
): Promise<ExportResult> {
  // ...
}
```

#### Refresh README Sections
Check if these sections need updates:
- **Features list:** Match `src/features/` directory
- **Installation:** Reflect latest dependencies
- **Environment variables:** Sync with `.env.example`
- **Commands:** Sync with `package.json` scripts

```bash
# Compare package.json scripts with README
node -e "
const pkg = require('./package.json');
const readme = require('fs').readFileSync('README.md', 'utf8');
Object.keys(pkg.scripts).forEach(script => {
  if (!readme.includes(\`pnpm \${script}\`)) {
    console.log(\`Missing in README: pnpm \${script}\`);
  }
});
"
```

### 5. Create Documentation Tasks

For each identified gap, create a task:

```bash
pnpm workflow
# Select: add
```

**Task template:**
```json
{
  "id": "doc-update-001",
  "type": "documentation",
  "title": "Add user guide for GDPR data export",
  "description": "Create docs/guides/gdpr-data-export.md explaining how users can export their data via Settings > Privacy > Export Data.",
  "priority": "high",
  "assignee": "unassigned",
  "created_at": "2025-11-10T12:00:00Z",
  "due_date": "2025-11-12",
  "context": {
    "merge_commit": "abc123",
    "feature_branch": "feature/gdpr-export",
    "related_files": [
      "src/services/gdpr/DataExporter.ts",
      "src/components/settings/GdprPanel.tsx"
    ]
  }
}
```

### 6. Quick Wins (Immediate Updates)

For simple changes, update docs immediately:

#### Update CHANGELOG.md
```bash
# Get commits since last release
LAST_TAG=$(git describe --tags --abbrev=0)
git log $LAST_TAG..HEAD --oneline --no-merges

# Categorize commits
FEATURES=$(git log $LAST_TAG..HEAD --oneline --grep="feat:")
FIXES=$(git log $LAST_TAG..HEAD --oneline --grep="fix:")
BREAKING=$(git log $LAST_TAG..HEAD --oneline --grep="BREAKING CHANGE")
```

**Append to CHANGELOG.md:**
```markdown
## [Unreleased]

### Features
- Added GDPR data export functionality (Article 20 compliance)
- Implemented OS keychain storage for encryption keys

### Bug Fixes
- Fixed memory leak in case list view
- Resolved authentication session persistence issue

### Security
- Migrated encryption keys from .env to OS keychain (CVSS 9.1 fix)
```

#### Update .env.example
```bash
# Compare .env with .env.example
diff -u .env.example .env | grep "^+"
```

**Add missing variables to .env.example:**
```bash
# New GDPR configuration
GDPR_EXPORT_RATE_LIMIT=5
GDPR_EXPORT_WINDOW_HOURS=24
```

#### Update Migration Guide
If database schema changed:

```bash
git diff $PARENT1 $MERGE_SHA -- src/db/migrations/
```

**Append to migration guide:**
```markdown
### v1.2.0 Migrations

**Migration 0010_add_gdpr_tables:**
- Adds `gdpr_exports` table to track user data exports
- Adds `gdpr_deletions` table to track data deletion requests
- **Breaking:** None
- **Rollback:** `pnpm db:migrate:rollback`
```

### 7. Queue Larger Documentation Projects

For substantial doc work, create GitHub issues:

**Issue template:**
```markdown
## Documentation Gap: GDPR Compliance Guide

**Type:** User Guide
**Priority:** High
**Effort:** 2-3 hours

### Context
Merged PR #145 added full GDPR data export and deletion flows (Articles 17 & 20). Users need comprehensive guide on:
- How to export data
- What data is included
- How to request deletion
- What data is preserved (audit logs)

### Deliverables
- [ ] Create `docs/guides/gdpr-compliance.md`
- [ ] Add screenshots of export flow
- [ ] Document rate limits
- [ ] Explain consent requirements
- [ ] Include FAQ section

### Related Files
- `src/services/gdpr/DataExporter.ts`
- `src/services/gdpr/DataDeleter.ts`
- `src/components/settings/GdprPanel.tsx`

### Definition of Done
- Guide published in docs/
- Linked from README.md
- Reviewed by at least one other developer
```

### 8. Living Documentation Maintenance

#### Archive Obsolete Docs
```bash
# Find docs referencing deleted code
git log --diff-filter=D --summary | grep "delete mode"
```

**For each deleted file:**
- Check if docs reference it
- Move obsolete docs to `docs/archive/`
- Update index/table of contents

#### Update Diagrams
Check if architecture diagrams need refresh:
```bash
# Find diagrams in docs
find docs/ -name "*.png" -o -name "*.svg" -o -name "*.mermaid"
```

**Update if:**
- New components added
- Data flow changed
- Architecture evolved

**Tools:**
- Mermaid for sequence/flow diagrams
- Excalidraw for hand-drawn diagrams
- PlantUML for UML diagrams

### 9. Documentation Health Report

Generate report in `.localclaude/history.jsonl`:
```json
{
  "timestamp": "2025-11-10T13:00:00Z",
  "type": "documentation_stewardship",
  "merge_commit": "abc123",
  "feature": "GDPR data export",
  "analysis": {
    "docs_changed": 3,
    "gaps_identified": 5,
    "quick_wins_completed": 2,
    "tasks_queued": 3,
    "issues_created": 1
  },
  "gaps": [
    {
      "type": "missing_user_guide",
      "priority": "high",
      "action": "Create docs/guides/gdpr-data-export.md"
    },
    {
      "type": "outdated_api_doc",
      "priority": "medium",
      "action": "Update DataExporter JSDoc comments"
    },
    {
      "type": "missing_adr",
      "priority": "high",
      "action": "Document encryption key migration decision"
    }
  ],
  "quick_wins": [
    "Updated CHANGELOG.md with GDPR features",
    "Added GDPR env vars to .env.example"
  ],
  "queued_tasks": [
    "doc-update-001: Add GDPR user guide",
    "doc-update-002: Generate API docs",
    "doc-update-003: Update architecture diagram"
  ]
}
```

## Expected Outputs

### Console Summary
```
=== Justice Companion Documentation Stewardship ===
Merge Commit: abc123 (feature/gdpr-export)
Date: 2025-11-10 13:00:00

📄 Documentation Changes:
✓ 3 doc files modified
✓ 1 new guide added (docs/guides/gdpr-overview.md)
✓ 2 screenshots updated

🔍 Gap Analysis:
⚠️ 5 gaps identified:
  1. Missing user guide for GDPR data export (HIGH)
  2. Outdated API docs for DataExporter (MEDIUM)
  3. Missing ADR for encryption key migration (HIGH)
  4. Incomplete JSDoc for new functions (LOW)
  5. Architecture diagram needs update (MEDIUM)

⚡ Quick Wins (Completed Immediately):
✅ Updated CHANGELOG.md with GDPR features
✅ Added GDPR env vars to .env.example

📋 Tasks Queued:
- doc-update-001: Add GDPR user guide (Priority: HIGH)
- doc-update-002: Generate API docs (Priority: MEDIUM)
- doc-update-003: Update architecture diagram (Priority: MEDIUM)

🐛 GitHub Issues Created:
#234 - Documentation Gap: GDPR Compliance Guide

Next steps:
1. Review queued tasks in workflow: pnpm workflow
2. Assign owners to doc-update-* tasks
3. Set deadlines for high-priority gaps

Full report: .localclaude/history.jsonl
```

## Automation Hooks

### Post-Merge Hook
Add to `.git/hooks/post-merge` (or CI pipeline):
```bash
#!/bin/bash
echo "Running documentation stewardship check..."

# Get merge commit
MERGE_SHA=$(git rev-parse HEAD)

# Check if docs updated
DOCS_CHANGED=$(git diff HEAD~1 HEAD -- docs/ | wc -l)

if [ $DOCS_CHANGED -eq 0 ]; then
  echo "⚠️  WARNING: Code changed but docs unchanged"
  echo "Consider running: pnpm workflow (Documentation Stewardship)"
fi
```

### GitHub Actions Integration
```yaml
name: Documentation Check
on:
  pull_request:
    types: [closed]
jobs:
  doc-check:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - name: Check for doc gaps
        run: |
          DOCS_CHANGED=$(git diff HEAD~1 HEAD -- docs/ | wc -l)
          if [ $DOCS_CHANGED -eq 0 ]; then
            echo "::warning::No documentation changes in this PR"
          fi
```

## Success Criteria
- ✓ Documentation diff analyzed
- ✓ All gaps identified and categorized
- ✓ Quick wins completed immediately
- ✓ Larger tasks queued with priorities
- ✓ Health report generated

## Run Frequency
**After every feature merge** to `main` or `develop`

## Related Workflows
- "Quality Gate Check" (pre-merge verification)
- "Release Readiness Check" (ensures docs ready for release)
