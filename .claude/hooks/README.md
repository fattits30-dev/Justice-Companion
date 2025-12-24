# Claude Code AI Governance System

This directory contains a complete AI governance system that keeps Claude Code disciplined, focused, and productive.

## System Overview

The governance system creates a "structured framework" (or "cage") that ensures:
- ✅ MCP tools are used correctly
- ✅ Tasks are completed before moving to new ones
- ✅ Code quality standards are maintained
- ✅ Work is properly tracked and committed
- ✅ Sessions end with complete work

## Hook Architecture

```
User Prompt
    ↓
[01-prompt-injector] → Adds compliance reminders to EVERY prompt
    ↓
[02-task-enforcer] → Ensures Planner MCP is checked before work
    ↓
Claude executes work → Uses required MCP tools
    ↓
[03-pre-commit-gate] → Validates quality before GitHub commits
    ↓
[04-stop-validator] → Ensures work is complete before ending
    ↓
Session ends with completed, tested, committed code ✓
```

## Hook Files

### 01-prompt-injector.md
**Event:** `UserPromptSubmit`
**Purpose:** Auto-injects compliance reminders into every user prompt

**What it does:**
- Reminds Claude to use MCP tools (GitHub, Planner, Sequential Thinking, etc.)
- Enforces single-task focus
- Reminds about code quality requirements
- Reminds about Termux/Android limitations

**Cannot be bypassed:** Runs on EVERY prompt automatically

---

### 02-task-enforcer.md
**Event:** `UserPromptSubmit`
**Purpose:** Forces Claude to check Planner MCP before starting work

**What it does:**
- Displays reminder to check current task
- Enforces "one task at a time" discipline
- Prevents context switching
- Requires Planner updates

**Script:** `.claude/hooks/scripts/check-current-task.mjs`

---

### 03-pre-commit-gate.md
**Event:** `PreToolUse` (matches `mcp__github__*`)
**Purpose:** Validates code quality before allowing GitHub commits

**What it does:**
- Runs linting (`./scripts/lint.sh`)
- Runs type checking (`npm run typecheck`)
- Runs tests (`./scripts/test.sh frontend`)
- Shows git status
- Blocks commits if quality checks fail

**Script:** `.claude/hooks/scripts/validate-quality.sh`

**Termux-aware:** Skips tests if environment is limited, but enforces linting minimum

---

### 04-stop-validator.md
**Event:** `Stop`
**Purpose:** Validates work completion before ending session

**What it does:**
- Checks for uncommitted changes
- Displays completion checklist
- Warns if work is incomplete
- Allows user override with acknowledgment

**Script:** `.claude/hooks/scripts/check-completion.sh`

**Completion checklist:**
- [ ] Current task complete
- [ ] Planner MCP updated
- [ ] Tests pass
- [ ] Code committed via GitHub MCP
- [ ] Memory MCP updated
- [ ] Git working directory clean

---

## Helper Scripts

### check-current-task.mjs
Node.js script that outputs a reminder to check Planner MCP.

### validate-quality.sh
Bash script that runs all quality checks and reports results.

**Checks:**
1. ESLint (must pass)
2. TypeScript compilation (must pass)
3. Tests (must pass, or skipped on Termux)
4. Git status (informational)

### check-completion.sh
Bash script that validates session completion state.

**Checks:**
1. Uncommitted changes (warning)
2. Displays completion checklist
3. Returns warnings or success

---

## How It Works Together

### Example: User asks to add a feature

1. **User prompt:** "Add a new button to the dashboard"

2. **01-prompt-injector:** Automatically appends:
   ```
   REMINDER:
   - Check Planner MCP for current task
   - Use Sequential Thinking for complex work
   - Run ./scripts/lint.sh before committing
   - etc.
   ```

3. **02-task-enforcer:** Reminds Claude:
   ```
   📋 Check Planner MCP - what's the current task?
   Work ONLY on that task!
   ```

4. **Claude executes:**
   - Checks Planner MCP
   - Uses Sequential Thinking to plan
   - Implements the feature
   - Updates Planner progress

5. **03-pre-commit-gate:** Before committing:
   ```
   Running linting... ✅
   Running typecheck... ✅
   Running tests... ✅
   Safe to commit!
   ```

6. **Claude commits via GitHub MCP**

7. **04-stop-validator:** Before ending:
   ```
   Checklist:
   ✅ Task complete
   ✅ Tests pass
   ✅ Code committed
   ✅ Planner updated
   ✅ Git clean
   ```

8. **Session ends cleanly ✓**

---

## Benefits

### For Claude
- Clear structure to follow
- No confusion about priorities
- Quality checks automated
- Less likely to make mistakes

### For You
- Consistent code quality
- Proper task tracking
- Complete work (not half-finished)
- Full audit trail in Git/Planner

### For the Project
- Better code quality
- Proper documentation
- Knowledge retention (Memory MCP)
- Easier to resume work

---

## Customization

### Adding New Rules

Edit the hook files to add new requirements:

```markdown
### 6. New Rule
- Your new requirement here
- Another requirement
```

### Adjusting Quality Standards

Edit `.claude/hooks/scripts/validate-quality.sh`:

```bash
# Add new check
echo "🔍 Checking coverage..."
if ! npm run test:coverage; then
    output_message "Coverage below threshold"
    exit 1
fi
```

### Disabling Specific Hooks

Remove or rename the hook file:

```bash
# Disable prompt injector
mv 01-prompt-injector.md 01-prompt-injector.md.disabled
```

Or modify `hook-events` to empty array:

```yaml
hook-events: []
```

---

## Troubleshooting

### Hooks Not Running

Check Claude Code settings:
```bash
/hooks
```

Verify hooks are enabled in `.claude/settings.json`.

### Scripts Failing

Make scripts executable:
```bash
chmod +x .claude/hooks/scripts/*.sh
chmod +x .claude/hooks/scripts/*.mjs
```

Check script paths are correct.

### Too Strict

If hooks are too restrictive:
1. Edit the hook files to be less strict
2. Remove checklist items you don't need
3. Or disable specific hooks temporarily

### Bypassing Hooks (Emergency)

```bash
# Start Claude Code with hooks disabled
claude --disable-hooks
```

**Note:** Only use in emergencies. The governance system is there to help!

---

## Monitoring

To see hooks in action:

1. **Check hook status:**
   ```
   /hooks
   ```

2. **View hook output:**
   Look for `systemMessage` in Claude's responses

3. **Debug mode:**
   ```bash
   claude --debug
   ```

---

## Files Structure

```
.claude/hooks/
├── README.md                          # This file
├── 01-prompt-injector.md              # Auto-injects compliance reminders
├── 02-task-enforcer.md                # Enforces Planner MCP usage
├── 03-pre-commit-gate.md              # Quality validation before commits
├── 04-stop-validator.md               # Completion validation before ending
└── scripts/
    ├── check-current-task.mjs         # Task reminder script
    ├── validate-quality.sh            # Quality check script
    └── check-completion.sh            # Completion check script
```

---

## Next Steps

1. **Test the system:** Start a Claude Code session in Justice Companion
2. **Observe behavior:** Notice how Claude checks tasks and validates quality
3. **Adjust as needed:** Customize hooks to match your workflow
4. **Enjoy productivity:** Let the governance system keep Claude on track!

---

**The governance system is your AI project manager, ensuring consistent quality and complete work every time.**
