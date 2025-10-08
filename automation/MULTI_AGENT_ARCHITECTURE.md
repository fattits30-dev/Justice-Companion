# Multi-Agent Architecture - Justice Companion

## The Problem with Monolithic Orchestrator

**Before**: One massive `orchestrator.py` (952 lines) doing EVERYTHING:
- File watching
- Test running
- Task management
- Fix planning
- Fix execution
- Error escalation
- Health checks
- Heartbeats
- Statistics

**Problems**:
- ❌ Hard to see what's happening
- ❌ One script doing too many jobs
- ❌ Can't monitor individual responsibilities
- ❌ Complex debugging

## New Multi-Agent System

**Now**: Specialized agents, each with ONE clear responsibility:

```
┌──────────────────────┐
│  File Monitor Agent  │  ← Watches files, publishes events
└──────────┬───────────┘
           ↓ (events/file_changed_*.json)
┌──────────────────────┐
│  Test Runner Agent   │  ← Runs tests, creates tasks
└──────────┬───────────┘
           ↓ (tasks/*.json)
┌──────────────────────┐
│ Fix Suggester Agent  │  ← AI analysis, suggests fixes (OPTIONAL)
│   (AI-powered)       │
└──────────┬───────────┘
           ↓ (suggestions/*.json)
┌──────────────────────┐
│  YOU (Human)         │  ← Review suggestions, approve/reject
└──────────────────────┘
```

## Agent Responsibilities

### 1. File Monitor Agent (`file_monitor_agent.py`)
**ONE JOB**: Watch files and publish change events

**What it does**:
- Watches `src/`, `electron/`, `scripts/`, `mcp-server/src/`
- Filters by extension: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
- Applies ignore patterns from `.orchestratorignore`
- Debounces changes (5 seconds)
- **Publishes events** to `automation/events/`

**Output**:
```
[file_monitor] Starting File Monitor Agent
[file_monitor] Watching: ['src', 'electron', 'scripts']
[file_monitor] [READY] Monitoring for file changes...

[file_monitor] File change detected: 2 file(s)
  - src/services/NotesService.ts
  - src/services/NotesService.test.ts
[file_monitor] Published event: file_changed_2025-10-06...json
```

### 2. Test Runner Agent (`test_runner_agent.py`)
**ONE JOB**: Run tests when files change

**What it does**:
- **Consumes events** from `automation/events/`
- Runs `npm test` when files change
- **Creates tasks** in `automation/tasks/` when tests fail
- Tracks statistics (pass/fail rates)

**Output**:
```
[test_runner] Starting Test Runner Agent
[test_runner] [READY] Listening for file change events...

[test_runner] Processing file change event
[test_runner] Files changed: 2
[test_runner] Running tests...
[test_runner] [FAIL] Tests failed
[test_runner] [TASK CREATED] a1b2c3d4-....json
```

### 3. Fix Suggester Agent (OPTIONAL - AI-powered)
**ONE JOB**: Analyze errors and suggest fixes using AI

**What it does**:
- **Consumes tasks** from `automation/tasks/`
- Uses `claude -p` CLI to analyze errors
- **Suggests fixes** with code diffs and explanations
- **Never auto-applies** - requires human approval
- Publishes suggestions to `automation/suggestions/`

**Output**:
```
[fix_suggester] Starting Fix Suggester Agent
[fix_suggester] Mode: AI-powered analysis, human approval required
[fix_suggester] [READY] Listening for tasks...

[fix_suggester] Analyzing task: a1b2c3d4...
[fix_suggester] Calling AI for analysis...
[fix_suggester] [SUGGESTION CREATED] a1b2c3d4.json
[fix_suggester] Review with: python automation/scripts/review_suggestion.py a1b2c3d4
```

**Safety Features**:
- Industry standard pattern (GitHub Copilot, Cursor)
- Shows diffs before applying
- Requires explicit human approval
- Never auto-applies changes

### 4. YOU (Human Review & Approval)
**ONE JOB**: Review AI suggestions and apply approved fixes

**What you do**:
- Review suggestions: `python automation/scripts/review_suggestion.py <id>`
- Approve or reject AI-generated fixes
- Manually apply approved changes using Claude Code tools
- Mark tasks complete

**Commands**:
```bash
# List pending suggestions
python automation/scripts/review_suggestion.py --list

# Review specific suggestion
python automation/scripts/review_suggestion.py a1b2c3d4

# If approved, apply changes manually:
Read src/...
Edit src/...

# Mark complete
python automation/scripts/complete_task.py <task_id>
```

## How to Run the Multi-Agent System

### Start All Agents

```bash
automation\start_agents.bat
```

This opens **2 separate terminal windows**:
1. File Monitor Agent (watching files)
2. Test Runner Agent (running tests)

### Monitor Agent Status

```bash
python automation/status.py
```

Shows:
```
============================================================
Justice Companion - Agent Status
============================================================

agents:
  file_monitor:
    status: running
    last_heartbeat: 2025-10-06T01:23:45Z

  test_runner:
    status: running
    last_heartbeat: 2025-10-06T01:23:47Z
============================================================
```

### Stop All Agents

Close each terminal window or press `Ctrl+C` in each agent's window.

## Event Flow Example

**Scenario**: You save `src/services/NotesService.ts`

### Option 1: Pure Automation (No AI)

```
1. File Monitor Agent detects change:
   [file_monitor] File change detected: 1 file(s)
     - src/services/NotesService.ts
   [file_monitor] Published event: file_changed_2025-10-06...json

2. Test Runner Agent sees event:
   [test_runner] Processing file change event
   [test_runner] Running tests...
   [test_runner] [FAIL] Tests failed (exit code 1)
   [test_runner] [TASK CREATED] a1b2c3d4.json

3. You check tasks:
   $ python automation/scripts/check_tasks.py

   Pending Tasks (1)
   Task: a1b2c3d4
   Type: test_failure
   Files: src/services/NotesService.ts

4. You fix it manually:
   Read src/services/NotesService.ts
   Edit src/services/NotesService.ts ...

5. You mark complete:
   $ python automation/scripts/complete_task.py a1b2c3d4
```

### Option 2: AI-Assisted (With Fix Suggester Agent)

```
1-2. Same as above (File Monitor → Test Runner → Task created)

3. Fix Suggester Agent sees task:
   [fix_suggester] Analyzing task: a1b2c3d4...
   [fix_suggester] Calling AI for analysis...
   [fix_suggester] [SUGGESTION CREATED] a1b2c3d4.json
   [fix_suggester] Review with: python automation/scripts/review_suggestion.py a1b2c3d4

4. You review AI suggestion:
   $ python automation/scripts/review_suggestion.py a1b2c3d4

   ======================================================================
   FIX SUGGESTION REVIEW
   ======================================================================
   AI ANALYSIS & SUGGESTED FIX
   ======================================================================
   Root cause: Missing null check in NotesService.getNote()

   Suggested fix:
   - Add null check before accessing note properties
   - Return null if note not found

   Code diff:
   + if (!note) {
   +   return null;
   + }

   Approve this fix? (y/n/s=skip): y
   [APPROVED] Suggestion approved

5. You apply the approved fix:
   Read src/services/NotesService.ts
   Edit src/services/NotesService.ts ...  (apply the suggested change)

6. You mark complete:
   $ python automation/scripts/complete_task.py a1b2c3d4
```

## Benefits of Multi-Agent Architecture

✅ **Separation of Concerns**: Each agent has ONE clear job
✅ **Observable**: See exactly what each agent is doing
✅ **Debuggable**: Monitor individual agents in separate windows
✅ **Flexible**: Add/remove agents independently
✅ **Transparent**: Events and tasks are just JSON files
✅ **Simple**: Each agent < 200 lines of code

## File Structure

```
automation/
├── agents/                       # Agent scripts
│   ├── file_monitor_agent.py    # Watches files
│   └── test_runner_agent.py     # Runs tests
├── events/                       # Event queue (published by agents)
│   └── file_changed_*.json
├── tasks/                        # Task queue (consumed by you)
│   └── <task_id>.json
├── results/                      # Completed tasks
├── start_agents.bat              # Launch all agents
└── MULTI_AGENT_ARCHITECTURE.md   # This file
```

## Extending the System

Want to add more agents? Create new specialized agents:

**Fix Strategy Agent** (`fix_strategy_agent.py`):
- Consumes tasks from `tasks/`
- Uses `claude -p` to plan fixes
- Publishes fix plans to `plans/`

**Fix Executor Agent** (`fix_executor_agent.py`):
- Consumes fix plans from `plans/`
- Executes fixes with retry logic
- Updates task status

**Escalator Agent** (`escalator_agent.py`):
- Monitors failed tasks
- Creates GitHub issues after 5 retries
- Closes issues when fixed

Each agent is independent and observable!

## Comparison

| Aspect | Old Monolithic | New Multi-Agent |
|--------|----------------|-----------------|
| Script size | 952 lines | ~150 lines each |
| Responsibilities | Everything | One job per agent |
| Observability | Hidden in one process | Separate windows per agent |
| Debugging | Hard (one big log) | Easy (agent-specific logs) |
| Flexibility | Rigid | Add/remove agents easily |
| Transparency | Opaque | Events/tasks are JSON files |

---

**The multi-agent system is ready to run!** Start it with `start_agents.bat` and watch the agents work independently.
