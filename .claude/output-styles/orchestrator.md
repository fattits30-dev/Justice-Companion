Ultrathink. Context7 on. PLAN MODE ONLY until I approve.

Objective
Build a generic “Workflow Builder” that:
1) Prompts the user: “What are we building?”
2) Generates a full multi-phase plan with sub-agents.
3) Seeds and runs a task workflow using an MCP server.
4) Tracks progress, enforces acceptance criteria, and marks features done.

Outcomes
- App-agnostic. Works for any project brief.
- Minimal UI (CLI or Web) that:
  a) Collects the brief and options.
  b) Shows the plan for approval or edits.
  c) Starts execution and live status view.
- MCP “workflow” server present or generated:
  tools: plan.init, plan.add, plan.status, plan.start, plan.next, plan.done, plan.fail, summary.sync, log.append.
- Context memory (Context7 JSON). Rolling notes: decision | artifact | note.
- WORKFLOW_SUMMARY.md updated after each change.

Inputs to ask me now
1) One-paragraph brief.
2) Target surface: CLI or Web (Next.js/Tauri).
3) Stack preferences.
4) Must-have features.
5) Constraints: time, tokens, repos, licenses.

Deliverables (you will create them)
- `apps/ui` (prompt → plan → execute).
- `mcp/workflow-server` (stdio) or wire an existing one.
- `.agent/plan.json`, `.agent/state.json`, `.agent/log.ndjson`.
- `packages/memory/context7.json`.
- Tests for core flows. Docs (README, CLAUDE.md).

Sub-agents (your internal roles; branch per role)
- PlannerAgent: roadmap, acceptance_criteria, dependencies.
- OrchestratorAgent: calls MCP tools, coordinates loops.
- BuilderBE: backend tasks.
- BuilderFE: frontend tasks.
- InfraAgent: scripts, CI, Docker (optional).
- TestAgent: unit/e2e; gates; coverage.
- DocsAgent: README, CLAUDE.md; usage; limits.
- PolishAgent: UX tidy; error states; logging.

Plan phases and gates
P0 Plan (this mode)
- Produce a ROADMAP: tasks with id, title, component, acceptance_criteria, dependencies, files_to_touch, tests_to_create.
- Stop for my approval.

P1 Seed workflow
- Create or verify MCP workflow server and register it.
- Tool call sequence to stage plan:
  - workflow.plan.init
  - many workflow.plan.add { id, title, component, acceptance_criteria }
  - workflow.summary.sync
- Gate: plan.status shows tasks; summary present.

P2 Backend
- API skeleton and health checks. Data layer if needed.
- Gate: unit tests pass; smoke test OK.

P3 Frontend/UI
- Prompt screen → plan review → execute view.
- Gate: e2e smoke run passes.

P4 Orchestration loop
- Implement executor: for each task
  - workflow.plan.start {id} or plan.next
  - apply diffs
  - run tests
  - if green: workflow.plan.done {id, notes}, summary.sync, log.append
  - if red: plan.fail {id, reason} and add a fix task (plan.add)
- Gate: two demo tasks completed end-to-end.

P5 Docs + polish
- README, CLAUDE.md, usage, config.
- Gate: clean checkout → build → start → run demo feature.

Operating rules
- Respect path allowlist. Ignore node_modules/.next/.turbo/.git caches.
- Keep tokens low; summarize into WORKFLOW_SUMMARY.md and Context7.
- Conventional commits. One task per commit.

Your actions now (PLAN MODE)
1) Ask me the five inputs.
2) Generate the ROADMAP and show:
   - Task table with id, title, component, dependencies, acceptance_criteria.
   - files_to_touch and tests_to_create.
3) Show exact MCP tool calls you will make to seed the plan.
4) Show repo tree you will create.
5) Wait for approval.

After approval (exit Plan Mode)
- Execute the seeding tool calls.
- Scaffold repo per plan.
- Begin P2–P4 loops with sub-agent branches.
- Keep WORKFLOW_SUMMARY.md and Context7 synchronized.

Definition of Done
- From a clean checkout: build UI, start MCP workflow server, collect a brief, approve the plan, complete at least one feature to “done” with tests.

Acknowledge readiness and request the five inputs.
