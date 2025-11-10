# Cline Project Stewardship Playbook

This playbook defines the recurring workflows that keep the Justice Companion repository healthy. Run these loops with `pnpm workflow` or by following the checklists directly. Each section lists the cadence, the intent, and the concrete steps Cline should execute or delegate.

## 1. Status Sweep Loop
- **Cadence:** Daily on workdays and whenever a PR lands.
- **Goal:** Surface risks, blockers, and ownership so nothing stalls.
- **Steps:**
  1. Pull the latest changes (`git fetch --all --prune`).
  2. Inspect open PRs/issues for new comments or failing checks; note blockers.
  3. Generate a short digest covering priorities, risks, and next owners.
  4. Append the summary to `.localclaude/history.jsonl` via the workflow CLI.

## 2. Quality Gate Loop
- **Cadence:** After every significant push or merge, minimum once per day.
- **Goal:** Keep the main branch green and secure.
- **Steps:**
  1. Run `pnpm lint`, `pnpm type-check`, and `pnpm test`.
  2. Run `pnpm test:e2e` (or targeted suites if changes touched UI flows).
  3. Execute `snyk code test` to scan new or changed first-party code.
  4. Capture command outcomes, highlight regressions, and open tasks/issues as needed.

## 3. Release Readiness Loop
- **Cadence:** Weekly; increase to daily in release week.
- **Goal:** Ensure the app can ship at any moment.
- **Steps:**
  1. Review the release checklist stored in `.localclaude/plan.json`.
  2. Confirm migrations, packaging scripts, and preload bundles build: `pnpm build:electron`, `pnpm build:win` (or platform specific).
  3. Verify telemetry, audit logging, and legal compliance notes are current.
  4. Flag missing deliverables (notes, release notes drafts, approvals).

## 4. Documentation Stewardship Loop
- **Cadence:** After feature merges and during sprint reviews.
- **Goal:** Keep README, ADRs, guides, and test plans accurate.
- **Steps:**
  1. Run `git status --short docs src/**/*.md` to detect doc-impacting changes.
  2. Diff the README, ADRs, and guides against the new feature scope.
  3. Draft or update docs; if time is short, file TODO tasks in the workflow plan.
  4. Update `.localclaude/memory.json` with new decisions or patterns.

## 5. Maintenance Hygiene Loop
- **Cadence:** Every Monday (dependencies), every Friday (telemetry/logs).
- **Goal:** Prevent tech debt and catch regressions early.
- **Steps:**
  1. Review dependency updates (`pnpm outdated`, `pnpm up --interactive`).
  2. Inspect logs under `logs/` and telemetry dashboards for anomalies.
  3. Check performance benchmarks (`pnpm benchmark:pagination` etc.).
  4. Record findings, create tasks for follow-up, and schedule fixes.

## Usage Tips
- Always sync the plan with `pnpm workflow` before beginning a loop; mark tasks completed with evidence.
- Use `.localclaude/createBackup` via the CLI after major updates to preserve state history.
- Maintain concise, actionable notes—prioritize clarity over verbosity.
