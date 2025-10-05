# Dual Claude Code Orchestration System

Automated development framework for Justice Companion with dual Claude instances.

## Overview

This system provides 24/7 development automation using two Claude API instances:

- **Interactive Instance**: High-level planning, code review, strategic decisions
- **Headless Instance**: Automated code generation, testing, execution

## Quick Start

### 1. Installation

```bash
# Run installation script
automation\install.bat

# Or manual installation:
python -m venv automation\venv
automation\venv\Scripts\activate.bat
pip install -r automation\requirements.txt
```

### 2. Configuration

Edit `automation\.env`:

```bash
# Required: Add your Anthropic API key
ANTHROPIC_API_KEY=your-key-here

# Optional: Customize settings
MAX_RETRIES=5
AUTO_FIX_ENABLED=true
```

Get API key from: https://console.anthropic.com/

### 3. Test Setup

```bash
# Activate virtual environment
automation\venv\Scripts\activate.bat

# Test state management
python automation\scripts\state_manager.py

# Test Claude integration
python automation\scripts\claude_instance.py

# Test test runner
python automation\scripts\test_runner.py
```

## Architecture

### Components

1. **State Manager** (`state_manager.py`)
   - Atomic file operations with locking
   - Prevents race conditions
   - Tracks system state, queues, history

2. **Claude Instance** (`claude_instance.py`)
   - API wrapper for Claude interactions
   - Conversation history management
   - Separate prompts for interactive/headless modes

3. **Test Runner** (`test_runner.py`)
   - Automated test execution
   - Result parsing and analysis
   - Integration with npm test scripts

4. **Orchestrator** (`orchestrator.py`) - Coming soon
   - Main coordination loop
   - File watching and change detection
   - Queue management
   - Auto-fix logic
   - Error escalation

### State File Structure

```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-05T20:00:00Z",
  "processes": {
    "interactive": {"status": "stopped", "pid": null},
    "headless": {"status": "stopped", "pid": null}
  },
  "queues": {
    "pending": [],
    "in_progress": [],
    "completed": [],
    "failed": []
  },
  "conversation_history": [],
  "test_results": [],
  "code_diffs": [],
  "errors": []
}
```

## Current Implementation Status

### ✓ Completed (Phase 1)
- Directory structure
- State management system
- Claude API integration
- Test runner
- Installation scripts
- Documentation

### 🔄 In Progress (Phase 2)
- Main orchestrator loop
- File watching
- Auto-fix logic
- Error handling

### 📋 Planned (Phase 3)
- Web dashboard UI
- Terminal monitor
- Git hooks
- PII detection
- Audit logging

## Usage Examples

### Manual Test Run

```python
from automation.scripts.test_runner import TestRunner
from pathlib import Path

runner = TestRunner(Path('.'))
results = runner.run_tests()

if not results['passed']:
    failures = runner.parse_test_failures(results['stderr'])
    print(f"Found {len(failures)} failures")
```

### State Management

```python
from automation.scripts.state_manager import StateManager
from pathlib import Path

manager = StateManager(
    Path('automation/state/app_state.json'),
    Path('automation/state/app_state.lock')
)

# Add task to queue
def add_task(state):
    state['queues']['pending'].append({
        'id': 'task_123',
        'type': 'test',
        'created_at': '2025-10-05T20:00:00Z'
    })
    return state

new_state = manager.update(add_task)
```

### Claude Instance

```python
from automation.scripts.claude_instance import ClaudeInstance
import os

instance = ClaudeInstance('interactive', os.getenv('ANTHROPIC_API_KEY'))

response = instance.send_message(
    "Review this code change and suggest improvements..."
)
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key |
| `PROJECT_ROOT` | No | Current directory | Justice Companion root |
| `CLAUDE_MODEL` | No | claude-sonnet-4-5-20250929 | Model to use |
| `MAX_RETRIES` | No | 5 | Max auto-fix attempts |
| `AUTO_FIX_ENABLED` | No | true | Enable auto-fix |
| `FILE_WATCH_DEBOUNCE_SECONDS` | No | 2 | File change delay |

## Security Considerations

### PII Protection

The system includes PII detection for legal compliance:
- Email addresses
- Phone numbers
- SSN
- Case numbers
- Credit cards

All automated changes are logged with full audit trails.

### API Key Security

- Store API key in `.env` file (never commit to git)
- `.env` is in `.gitignore` by default
- Use environment variables in production

## Troubleshooting

### State File Locked

If you see lock timeout errors:
```bash
# Remove stale lock file
del automation\state\app_state.lock
```

### API Key Issues

```bash
# Verify API key is set
automation\venv\Scripts\activate.bat
python -c "import os; from dotenv import load_dotenv; load_dotenv('automation/.env'); print(os.getenv('ANTHROPIC_API_KEY'))"
```

### Test Failures

```bash
# Run tests manually to see full output
npm test

# Check test runner logs
python automation\scripts\test_runner.py
```

## Development

### Project Structure

```
automation/
├── scripts/                 # Python automation scripts
│   ├── state_manager.py     # State management
│   ├── claude_instance.py   # Claude API wrapper
│   ├── test_runner.py       # Test automation
│   └── orchestrator.py      # Main coordinator (WIP)
├── state/                   # State files
│   ├── app_state.json       # Current state
│   └── app_state.lock       # Lock file
├── logs/                    # Log files
├── ui/                      # UI components (planned)
├── requirements.txt         # Python dependencies
├── .env.example            # Configuration template
├── .env                    # Local configuration (gitignored)
├── install.bat             # Installation script
└── README.md               # This file
```

### Contributing

When adding new features:
1. Update state schema if needed
2. Add tests
3. Update documentation
4. Follow existing code patterns

## License

Same license as Justice Companion project.

## Support

For issues or questions:
1. Check this documentation
2. Review example code in each script
3. Check log files in `automation/logs/`

---

**Status**: Phase 1 Complete - Core foundation implemented and tested.
