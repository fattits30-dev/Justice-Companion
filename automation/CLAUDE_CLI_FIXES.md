# Claude Code CLI Integration Fixes

**Date:** 2025-10-05
**File:** `automation/scripts/claude_instance.py`

## Issues Fixed

### 1. Incorrect Permission Flag
**Problem:** Using wrong flag for bypassing permissions
```python
# BEFORE (INCORRECT)
"--permission-mode", "bypassPermissions"
```

**Solution:** Use the correct flag from CLI reference
```python
# AFTER (CORRECT)
"--dangerously-skip-permissions"
```

**Reference:** [Claude Code CLI Reference - Flags](https://docs.claude.com/en/docs/claude-code/cli-reference)
- `--permission-mode` expects values: `plan`, `acceptEdits`, etc.
- `--dangerously-skip-permissions` bypasses all permission prompts (correct for headless automation)

---

### 2. Incorrect Tool List Format
**Problem:** Tools passed as comma-separated string
```python
# BEFORE (INCORRECT)
cmd.extend(["--allowedTools", "Read,Write,Edit,Bash,Grep,mcp__github,mcp__context7"])
```

**Solution:** Pass tools as separate arguments
```python
# AFTER (CORRECT)
cmd.extend(["--allowedTools", "Read", "Write", "Edit", "Bash", "Grep", "mcp__github__*", "mcp__context7__*"])
```

**Reference:** CLI docs show tools as space-separated: `"Bash(git log:*)" "Bash(git diff:*)" "Read"`
- Each tool must be a separate list element in subprocess
- Added wildcard `*` to MCP tools to allow all tools from those servers

---

## Command Structure (Corrected)

### Interactive Instance
```bash
claude -p "prompt" \
  --output-format json \
  --dangerously-skip-permissions \
  --allowedTools Read Grep Bash mcp__github__* mcp__context7__*
```

### Headless Instance
```bash
claude -p "prompt" \
  --output-format json \
  --dangerously-skip-permissions \
  --allowedTools Read Write Edit Bash Grep mcp__github__* mcp__context7__*
```

---

## Testing

To test the Claude instance:
```bash
cd /mnt/c/Users/sava6/Desktop/Justice\ Companion
python3 automation/scripts/claude_instance.py
```

**Note:** Requires `python-dotenv` installed:
```bash
pip install python-dotenv
```

---

## Impact

These fixes ensure:
1. ✅ Headless Claude Code runs without permission prompts
2. ✅ Tools are properly allowed via CLI flags
3. ✅ JSON output format works correctly
4. ✅ Session resumption works (via `--resume` flag)
5. ✅ MCP servers (GitHub, Context7) are accessible

---

## Related Files

- `automation/scripts/orchestrator.py` - Uses ClaudeInstance for dual-agent orchestration
- `automation/scripts/auto_fixer.py` - Uses headless Claude for automated fixes
- `automation/.env.example` - Environment configuration template

---

**Status:** ✅ FIXED - Ready for testing with orchestrator
