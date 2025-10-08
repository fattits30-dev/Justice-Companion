# Simple Orchestrator - User Guide

## Overview

The Simple Orchestrator watches your code files and creates tasks when tests fail. **You** (the current Claude Code session) process the tasks directly - no external Claude CLI processes.

## Architecture

```
Simple Orchestrator (File Watcher + Test Runner)
        ↓
    Task Queue (JSON files in automation/tasks/)
        ↓
    You (Claude Code) - Read tasks & fix errors
        ↓
    Complete Task (Move to automation/results/)
```

## Quick Start

### 1. Start the Orchestrator

```bash
cd automation
start_simple.bat
```

This will:
- Watch files in `src/`, `electron/`, `scripts/`, `mcp-server/src/`
- Monitor extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
- Run tests automatically when files change
- Create tasks when tests fail

### 2. Check for Tasks

In a **separate terminal** or **this Claude Code session**:

```bash
python automation/scripts/check_tasks.py
```

Output:
```
============================================================
Pending Tasks (2)
============================================================

Task: a1b2c3d4...
Type: test_failure
File: src/services/NotesService.ts
Created: 2025-10-06T01:23:45.678Z
Status: pending
Exit code: 1
Output preview:
  FAIL src/services/NotesService.test.ts
  × NotesService > createNote > should validate input
  ... (15 more lines)
File: automation/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
```

### 3. Process a Task (in Claude Code)

Read the task file:
```bash
cat automation/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
```

Fix the error (use your normal Claude Code tools):
```bash
# Read the failing file
Read src/services/NotesService.ts

# Fix the issue
Edit src/services/NotesService.ts ...

# Verify tests pass
npm test -- NotesService.test.ts
```

### 4. Mark Task as Complete

```bash
python automation/scripts/complete_task.py a1b2c3d4
```

This moves the task from `automation/tasks/` to `automation/results/`.

## Commands Reference

### Orchestrator Control

```bash
# Start orchestrator
automation/start_simple.bat

# Stop orchestrator
Ctrl+C in the orchestrator window

# Check status
python automation/status.py
```

### Task Management

```bash
# List all pending tasks
python automation/scripts/check_tasks.py

# Complete a task
python automation/scripts/complete_task.py <task_id>

# View task details
cat automation/tasks/<task_id>.json
```

### Manual Operations

```bash
# Run tests manually
npm test

# Run specific test file
npm test -- src/services/NotesService.test.ts

# Type check
npm run type-check

# Lint
npm run lint
```

## File Structure

```
automation/
├── tasks/               # Pending tasks (JSON files)
├── results/             # Completed tasks (archive)
├── state/               # Orchestrator state
│   └── app_state.json
├── scripts/
│   ├── simple_orchestrator.py   # Main orchestrator
│   ├── check_tasks.py           # View pending tasks
│   └── complete_task.py         # Mark task complete
├── .env                 # Configuration
├── start_simple.bat     # Start script
└── SIMPLE_ORCHESTRATOR_GUIDE.md
```

## Task File Format

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "test_failure",
  "created_at": "2025-10-06T01:23:45.678Z",
  "file_path": "src/services/NotesService.ts",
  "status": "pending",
  "description": "Fix test failures in src/services/NotesService.ts",
  "test_result": {
    "success": false,
    "exit_code": 1,
    "stdout": "FAIL src/services/NotesService.test.ts...",
    "stderr": "",
    "duration": 2.5
  }
}
```

## Workflow Example

### Scenario: You save a file with a syntax error

1. **Orchestrator detects change:**
   ```
   [SimpleOrchestrator] File change detected: 1 file(s)
   [SimpleOrchestrator] Processing: src/services/NotesService.ts
   [SimpleOrchestrator] Running tests for: src/services/NotesService.ts
   [SimpleOrchestrator] ✗ Tests failed
   [SimpleOrchestrator] ✓ Created task: automation/tasks/a1b2c3d4-...json
   ```

2. **You check tasks:**
   ```bash
   python automation/scripts/check_tasks.py
   ```

3. **You read the task and fix it:**
   ```bash
   # In Claude Code
   Read automation/tasks/a1b2c3d4-...json
   Read src/services/NotesService.ts
   Edit src/services/NotesService.ts ...
   ```

4. **Verify fix:**
   ```bash
   npm test -- NotesService.test.ts
   ```

5. **Complete task:**
   ```bash
   python automation/scripts/complete_task.py a1b2c3d4
   ```

## Configuration

Edit `automation/.env`:

```bash
# Watch these directories (comma-separated)
WATCH_PATHS=src,electron,scripts,mcp-server/src

# Watch these file extensions
WATCH_EXTENSIONS=.ts,.tsx,.js,.jsx,.json

# Debounce file changes (seconds)
FILE_WATCH_DEBOUNCE_SECONDS=5.0

# Ignore patterns (in addition to .orchestratorignore)
IGNORE_PATTERNS=node_modules,dist,*.test.ts
```

## Filtering

The orchestrator automatically ignores:
- Test files (`*.test.ts`, `*.spec.ts`)
- Config files (`package.json`, `tsconfig.json`, etc.)
- Build outputs (`dist/`, `node_modules/`)
- Documentation (`.md`, `.txt`)
- All patterns in `.orchestratorignore`

## Troubleshooting

### No tasks being created

Check that:
1. Orchestrator is running (`python automation/status.py`)
2. Files are in watched directories (`src/`, `electron/`, etc.)
3. File extensions match (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`)
4. Files aren't ignored (check `.orchestratorignore`)

### Tests not running

Check:
1. `npm test` works manually
2. Test runner has correct project root
3. No syntax errors preventing test execution

### Can't see tasks

Check:
1. `automation/tasks/` directory exists
2. Orchestrator has write permissions
3. Tasks aren't being filtered out

## Benefits of Simple Orchestrator

✅ **No external processes** - No Claude CLI spawning
✅ **Direct integration** - You process tasks in this session
✅ **Full control** - See exactly what's happening
✅ **Fast feedback** - Immediate task creation
✅ **Low overhead** - Just file watching + test running
✅ **Easy debugging** - Read task files directly

## Differences from Old Orchestrator

| Feature | Old Orchestrator | Simple Orchestrator |
|---------|------------------|---------------------|
| Claude instances | Spawns CLI processes | None - YOU process tasks |
| Task processing | Automatic retry logic | Manual - you read tasks |
| Complexity | High (multi-process) | Low (single process) |
| Monitoring | Hard to see what's happening | Easy - read task files |
| Debugging | Complex process management | Simple file operations |

---

**Ready to use!** Start the orchestrator and let it watch your files while you code.
