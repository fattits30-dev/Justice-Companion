---
name: task-enforcer
description: Ensures work follows the current task from Planner MCP
hook-events:
  - UserPromptSubmit
commands:
  - command: node
    args:
      - .claude/hooks/scripts/check-current-task.mjs
---

## Task Enforcement Protocol

This hook ensures you follow the structured task workflow:

### Before Starting ANY Work:

1. **Check Planner MCP** - What is the current active task?
   ```
   Use: mcp__planner__ tools to check current tasks
   ```

2. **Verify Task Status** - Is there an active task?
   - If YES → Work ONLY on that task
   - If NO → Ask user what task to start

3. **Use Sequential Thinking** - For complex tasks, plan first
   ```
   Use: mcp__sequential-thinking__sequentialthinking
   ```

4. **Stay Focused** - Do not switch tasks mid-work
   - Complete current task fully
   - Update Planner progress
   - Mark complete when done
   - THEN move to next task

### During Work:

- Update Planner MCP with progress
- Use appropriate MCP tools (GitHub, Context7, Memory)
- Follow the workflow in CLAUDE.md

### After Completion:

- Mark task complete in Planner MCP
- Create commit via GitHub MCP
- Update Memory MCP with learnings
- Check for next task

---

**This enforces single-task focus and prevents context switching.**
