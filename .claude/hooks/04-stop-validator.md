---
name: stop-completion-validator
description: Validates task completion before ending session
hook-events:
  - Stop
commands:
  - command: bash
    args:
      - .claude/hooks/scripts/check-completion.sh
---

## Session End Validation Checklist

Before ending the session, verify ALL of the following:

### Task Completion
- [ ] **Current task is complete** (not partially done)
- [ ] **Planner MCP updated** - Task marked as complete
- [ ] **No work left in progress** - No uncommitted changes

### Code Quality
- [ ] **Linting passes** - `./scripts/lint.sh` returns 0 errors
- [ ] **Tests pass** - `./scripts/test.sh frontend` succeeds
- [ ] **TypeScript valid** - `npm run typecheck` succeeds

### Version Control
- [ ] **Changes committed** - Used GitHub MCP to create commit
- [ ] **Commit message clear** - Describes what was done and why
- [ ] **GitHub issue updated** - If working on an issue, update it
- [ ] **PR created if needed** - For significant changes

### Knowledge Captured
- [ ] **Memory MCP updated** - Stored important decisions/patterns
- [ ] **Architecture changes documented** - Updated CLAUDE.md if needed
- [ ] **Learnings recorded** - Saved debugging insights

### Clean State
```bash
git status
```
- [ ] **No untracked files** (or they're intentional)
- [ ] **No unstaged changes** (or they're intentional)
- [ ] **Working directory clean**

---

## If Checklist Incomplete:

**DO NOT END SESSION**

Instead:
1. Complete the missing items
2. Ask user if incomplete work is intentional
3. Get explicit approval to leave work in progress
4. Document what's incomplete in Memory MCP

---

## Exception Cases:

### User Explicitly Says Stop
- If user says "stop now" or similar
- Acknowledge incomplete state
- Save state to Memory MCP for next session
- List what's incomplete

### Termux Limitations
- If tests can't run due to Termux
- Note: "Tests will run in CI"
- Ensure minimum quality (linting) passes

### Exploratory Work
- If session was just exploration/research
- No code changes = less strict requirements
- Still update Memory MCP with findings

---

**This ensures no work is left half-finished without acknowledgment.**
