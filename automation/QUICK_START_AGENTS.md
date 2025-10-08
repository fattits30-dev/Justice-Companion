# Quick Start - Multi-Agent System

## What You Asked For

✅ **Multiple agents, each doing ONE job** (not one script doing everything)
✅ **Observable agents** (you can see each agent's output in separate windows)
✅ **Independent agents** (each runs separately, doing its specific task)

## The Architecture

```
Terminal 1: File Monitor Agent (Pure Automation)
- Watches src/, electron/, scripts/
- Publishes file change events
- Updates every 10 seconds

Terminal 2: Test Runner Agent (Pure Automation)
- Listens for file change events
- Runs npm test
- Creates tasks when tests fail

Terminal 3: Fix Suggester Agent (AI-Powered - OPTIONAL)
- Analyzes tasks using Claude CLI
- Suggests fixes with explanations
- NEVER auto-applies (requires approval)
- Can be disabled if Claude CLI not available

Your Terminal: Human Review & Approval
- Review AI suggestions from automation/suggestions/
- Approve/reject suggested fixes
- Apply approved changes using Claude Code
- Mark tasks complete
```

## Start the System

### Windows:
```bash
# From the project root (C:\Users\sava6\Desktop\Justice Companion)
automation\start_agents.bat
```

This opens **3 separate terminal windows** so you can see each agent working.

**Note**: The batch file automatically changes to the automation directory, but all agents use absolute paths from the project root, so they'll work correctly.

### What You'll See:

**Terminal 1 (File Monitor)**:
```
============================================================
FILE MONITOR AGENT
Justice Companion Multi-Agent System
============================================================
[file_monitor] Starting File Monitor Agent
[file_monitor] Watching: ['src', 'electron', 'scripts', 'mcp-server/src']
[file_monitor] Extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
[file_monitor] Debounce: 5.0s
[file_monitor] [READY] Monitoring for file changes...
```

**Terminal 2 (Test Runner)**:
```
============================================================
TEST RUNNER AGENT
Justice Companion Multi-Agent System
============================================================
[test_runner] Starting Test Runner Agent
[test_runner] [READY] Listening for file change events...
```

**Terminal 3 (Fix Suggester - OPTIONAL)**:
```
============================================================
FIX SUGGESTER AGENT
Justice Companion Multi-Agent System
============================================================
Mode: AI-powered analysis with human approval
============================================================
[fix_suggester] Starting Fix Suggester Agent
[fix_suggester] Mode: AI-powered analysis, human approval required
[fix_suggester] [READY] Listening for tasks...
```

### When You Save a File:

**Terminal 1**:
```
[file_monitor] File change detected: 1 file(s)
  - src/services/NotesService.ts
[file_monitor] Published event: file_changed_2025-10-06T21-00-00.json
```

**Terminal 2**:
```
[test_runner] Processing file change event
[test_runner] Files changed: 1
[test_runner] Running tests...
[test_runner] [FAIL] Tests failed
[test_runner] [TASK CREATED] a1b2c3d4-e5f6-7890.json
```

## Process Tasks (You)

```bash
# Check for tasks
python automation/scripts/check_tasks.py

# Read a task
cat automation/tasks/a1b2c3d4-e5f6-7890.json

# Fix the error (use your Claude Code tools)
Read src/services/NotesService.ts
Edit src/services/NotesService.ts ...

# Verify fix
npm test

# Mark complete
python automation/scripts/complete_task.py a1b2c3d4
```

## Stop the System

Press `Ctrl+C` in each terminal window.

## Key Differences from Before

| Before | After |
|--------|-------|
| 1 script doing everything | 2+ agents, each with 1 job |
| Can't see what's happening | Separate windows per agent |
| 952 lines in one file | ~150 lines per agent |
| Hidden internals | Observable events & tasks (JSON files) |

## The Files

**Agent Scripts**:
- `automation/agents/file_monitor_agent.py` - Watches files
- `automation/agents/test_runner_agent.py` - Runs tests

**Event Queue** (communication between agents):
- `automation/events/` - Event JSON files

**Task Queue** (work for you):
- `automation/tasks/` - Task JSON files

**Results Archive**:
- `automation/results/` - Completed tasks

## Add More Agents (Future)

Want auto-fix? Add these agents:

**Fix Strategy Agent**:
- Reads tasks from `tasks/`
- Plans fixes using `claude -p`
- Publishes to `plans/`

**Fix Executor Agent**:
- Reads plans from `plans/`
- Executes fixes
- Updates task status

Each agent is independent and observable!

---

**Ready to run!** Just execute `automation\start_agents.bat` and watch the agents work in separate windows.
