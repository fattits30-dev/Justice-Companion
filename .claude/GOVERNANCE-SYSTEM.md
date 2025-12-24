# AI Governance System - Quick Start

## What Was Built

A complete "cage" system that keeps Claude Code disciplined, focused, and productive on Justice Companion development.

## The 4-Layer System

### Layer 1: Prompt Injector
**File:** `hooks/01-prompt-injector.md`
- Runs on EVERY user prompt
- Auto-injects compliance reminders
- Cannot be bypassed
- Reminds about MCP usage, task focus, code quality

### Layer 2: Task Enforcer
**File:** `hooks/02-task-enforcer.md`
- Forces check of Planner MCP before work
- Enforces single-task discipline
- Prevents context switching
- Requires progress updates

### Layer 3: Quality Gate
**File:** `hooks/03-pre-commit-gate.md`
- Validates code quality before commits
- Runs linting, type checking, tests
- Blocks commits if quality fails
- Termux-aware (skips tests if needed)

### Layer 4: Completion Validator
**File:** `hooks/04-stop-validator.md`
- Checks work completion before ending session
- Displays completion checklist
- Warns about incomplete work
- Ensures clean state

## How to Use

### First Time Setup

1. Navigate to Justice Companion:
   ```bash
   cd ~/Justice-Companion
   ```

2. Verify hooks are present:
   ```bash
   ls -la .claude/hooks/
   ```

3. Start Claude Code:
   ```bash
   claude
   ```

4. The governance system is now active!

### What You'll Notice

**Every Prompt Gets Enhanced:**
```
Your prompt: "Add a new feature"

What Claude sees:
"Add a new feature

[AUTO-INJECTED]
REMINDER:
- Check Planner MCP for current task
- Use Sequential Thinking for complex work
- Run ./scripts/lint.sh before committing
[etc...]"
```

**Task Discipline:**
- Claude will check Planner MCP before starting
- Won't switch tasks mid-work
- Updates progress regularly

**Quality Enforcement:**
- Before commits, quality checks run automatically
- Linting, tests, type checking
- Commits blocked if quality fails

**Complete Work:**
- Before ending, completion checklist appears
- Warns about uncommitted changes
- Ensures work is properly finished

## System Flow Example

```
1. You: "Add login button to dashboard"
   ↓
2. [Prompt Injector] Adds compliance reminders
   ↓
3. [Task Enforcer] "Check Planner MCP for current task"
   ↓
4. Claude: Checks Planner MCP
   Claude: Uses Sequential Thinking to plan
   Claude: Implements feature
   Claude: Runs tests
   ↓
5. Claude: Tries to commit via GitHub MCP
   ↓
6. [Quality Gate] Runs validation
   - Linting... ✅
   - TypeCheck... ✅
   - Tests... ✅
   ↓
7. Claude: Commits successfully
   Claude: Updates Planner MCP
   Claude: Stores learnings in Memory MCP
   ↓
8. You: "That's all for now"
   ↓
9. [Completion Validator] Checks completion
   - Task complete ✅
   - Tests pass ✅
   - Code committed ✅
   - Planner updated ✅
   ↓
10. Session ends cleanly ✓
```

## Benefits

✅ **Never miss MCP tool usage** - Automatic reminders
✅ **Single-task focus** - No context switching
✅ **Consistent quality** - Automated validation
✅ **Complete work** - No half-finished tasks
✅ **Full audit trail** - Everything tracked in Git/Planner
✅ **Knowledge retention** - Memory MCP updated

## Customization

### Make It Stricter

Edit hook files to add more requirements:
- Additional code checks
- Documentation requirements
- Security scans
- Coverage thresholds

### Make It Looser

Remove checklist items you don't need:
- Comment out checks in hook files
- Remove validation steps from scripts
- Disable specific hooks

### Add Custom Rules

Create new hook files:
```bash
# Example: Add deployment checks
.claude/hooks/05-deployment-gate.md
```

## Troubleshooting

### View Active Hooks
```
/hooks
```

### Disable Temporarily
```bash
claude --disable-hooks
```

### Check Hook Output
Look for system messages from hooks in Claude's responses.

### Debug Issues
```bash
claude --debug
```

## Files Created

```
Justice-Companion/.claude/hooks/
├── README.md                          # Detailed documentation
├── GOVERNANCE-SYSTEM.md               # This file (quick start)
├── 01-prompt-injector.md              # Compliance reminders
├── 02-task-enforcer.md                # Task discipline
├── 03-pre-commit-gate.md              # Quality validation
├── 04-stop-validator.md               # Completion checks
└── scripts/
    ├── check-current-task.mjs         # Task reminder
    ├── validate-quality.sh            # Quality checks
    └── check-completion.sh            # Completion checks
```

## Next Steps

1. **Test it:** Start a Claude Code session
2. **Try a task:** Ask Claude to implement something
3. **Observe:** Watch the governance system in action
4. **Adjust:** Customize hooks to your preferences

---

**The governance system is now your AI project manager!**

It ensures Claude:
- Uses MCP tools correctly
- Stays focused on one task
- Maintains code quality
- Completes work properly
- Tracks everything

No more half-finished work. No more forgotten commits. No more skipped tests.

**Just disciplined, productive AI development.** 🚀
