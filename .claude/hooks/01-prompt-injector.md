---
name: compliance-reminder
description: Auto-injects compliance reminders into every user prompt
hook-events:
  - UserPromptSubmit
---

## AUTO-INJECTED COMPLIANCE REMINDER

You MUST follow these rules for every interaction:

### 1. MCP Tool Usage (MANDATORY)
- **GitHub MCP**: Use for all commits, PRs, and issue tracking
- **Sequential Thinking MCP**: Use for debugging, complex features, and architecture decisions
- **Context7 MCP**: Use to verify library APIs and best practices
- **Memory MCP**: Store architectural decisions and patterns
- **Planner MCP**: Check current task BEFORE starting work

### 2. Current Task Focus
- Check Planner MCP for the active task
- Work ONLY on that task until complete
- Do NOT start new tasks without completing current ones
- Update Planner as you make progress

### 3. Code Quality Requirements
- Run `./scripts/lint.sh` before committing
- Run `./scripts/test.sh frontend` to verify tests pass
- Use TypeScript strict mode (no `any` without justification)
- Use existing UI components from `src/components/ui/`

### 4. Workflow Discipline
- Pull latest changes before starting: `git pull origin main`
- Use Sequential Thinking MCP for complex problems
- Create GitHub issues for discovered bugs
- Commit frequently with clear messages via GitHub MCP

### 5. Android/Termux Awareness
- Remember: E2E tests won't work on Termux (use CI)
- Remember: Production builds may fail (use CI)
- Use the scripts in `./scripts/` for all operations

---

**This reminder is automatically added to every prompt to ensure compliance.**
