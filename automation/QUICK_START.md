# Dual Claude Orchestration System - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
cd "Justice Companion"
pip install -r automation/requirements.txt
```

Required packages:
- `anthropic` - Claude API client
- `python-dotenv` - Environment variable management
- `filelock` - State file locking
- `watchdog` - File system monitoring
- `requests` - HTTP requests for error escalation
- `pytest` - Testing framework

### 2. Configure Environment

```bash
# Copy example environment file
cp automation/.env.example automation/.env

# Edit with your settings
# REQUIRED: Set your Anthropic API key
# REQUIRED: Set project root path
```

**Minimum Configuration:**

```bash
ANTHROPIC_API_KEY=sk-ant-...your-key-here
PROJECT_ROOT=C:\Users\sava6\Desktop\Justice Companion
```

### 3. Run the Orchestrator

```bash
# Start the orchestrator
python automation/scripts/orchestrator.py
```

Expected output:
```
============================================================
Dual Claude Code Orchestration System
Justice Companion Automation Framework
============================================================
[Orchestrator] Starting Dual Claude Orchestration System...
[Orchestrator] ✓ All systems operational
[Orchestrator] Watching: C:\Users\sava6\Desktop\Justice Companion
[Orchestrator] Auto-fix: enabled
```

### 4. Test It Works

In another terminal:

```bash
# Make a change to any watched file
echo "// Test change" >> src/test.ts

# Watch the orchestrator console for:
# [Orchestrator] File change detected: 1 file(s)
# [Orchestrator] Created task task_abc123...
```

---

## 📋 Component Overview

### Core Components (7 Scripts)

| Component | Purpose | Lines | Tests |
|-----------|---------|-------|-------|
| **orchestrator.py** | Main coordination loop | 738 | 35 |
| **file_watcher.py** | Monitors file changes | 328 | 10 |
| **auto_fixer.py** | Retry logic with backoff | 479 | 15 |
| **error_escalator.py** | Multi-level escalation | 511 | 12 |
| **state_manager.py** | Atomic state operations | 191 | N/A |
| **claude_instance.py** | Claude API wrapper | 164 | N/A |
| **test_runner.py** | Test execution | 217 | N/A |
| **TOTAL** | | **2,628** | **72** |

### Test Files (4 Suites)

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| test_file_watcher.py | 10 | FileWatcher component |
| test_auto_fixer.py | 15 | AutoFixer component |
| test_error_escalator.py | 12 | ErrorEscalator component |
| test_orchestrator.py | 26 | Orchestrator unit tests |
| test_integration.py | 9 | End-to-end workflows |
| **TOTAL** | **72** | **100% pass rate** |

---

## 🎯 Common Tasks

### Run Tests

```bash
# All tests
pytest automation/tests/ -v

# Specific component
pytest automation/tests/test_orchestrator.py -v

# Integration tests only
pytest automation/tests/test_integration.py -v

# With coverage
pytest automation/tests/ --cov=automation/scripts --cov-report=html
```

### Monitor Orchestrator

```bash
# Check orchestrator status
python -c "
from automation.scripts.state_manager import StateManager
from pathlib import Path

sm = StateManager(
    Path('automation/state/app_state.json'),
    Path('automation/state/app_state.lock')
)
state = sm.read()
print(f\"Status: {state['processes']['orchestrator']['status']}\")
print(f\"Last heartbeat: {state['processes']['orchestrator']['last_heartbeat']}\")
"
```

### View Task Queue

```bash
# Check pending tasks
python -c "
from automation.scripts.state_manager import StateManager
from pathlib import Path
import json

sm = StateManager(
    Path('automation/state/app_state.json'),
    Path('automation/state/app_state.lock')
)
state = sm.read()
print('Pending:', len(state['queues']['pending']))
print('In Progress:', len(state['queues']['in_progress']))
print('Completed:', len(state['queues']['completed']))
print('Failed:', len(state['queues']['failed']))
"
```

### Clear State (Reset)

```bash
# Stop orchestrator first (Ctrl+C)
# Then clear state
rm automation/state/app_state.json
rm automation/state/app_state.lock

# Restart orchestrator
python automation/scripts/orchestrator.py
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | ✅ Yes | - | Claude API authentication |
| `PROJECT_ROOT` | ✅ Yes | - | Project root directory |
| `STATE_FILE` | No | automation/state/app_state.json | State storage path |
| `LOCK_FILE` | No | automation/state/app_state.lock | Lock file path |
| `CLAUDE_MODEL` | No | claude-sonnet-4-5-20250929 | Claude model version |
| `MAX_RETRIES` | No | 5 | Max fix attempts |
| `AUTO_FIX_ENABLED` | No | true | Enable/disable auto-fixing |
| `FILE_WATCH_DEBOUNCE_SECONDS` | No | 2 | Debounce delay |
| `CIRCUIT_BREAKER_THRESHOLD` | No | 3 | Failures before pause |
| `CIRCUIT_BREAKER_WINDOW` | No | 3600 | Time window (seconds) |
| `GITHUB_TOKEN` | No | - | GitHub API token |
| `GITHUB_REPO` | No | owner/repo | GitHub repository |
| `SLACK_WEBHOOK_URL` | No | - | Slack notifications |
| `EMAIL_WEBHOOK_URL` | No | - | Email notifications |

### Watch Paths

By default, watches `PROJECT_ROOT`. To watch specific directories:

```python
# In orchestrator.py or via config
config['WATCH_PATHS'] = [
    '/path/to/src',
    '/path/to/tests',
    '/path/to/electron'
]
```

---

## 📊 Monitoring & Debugging

### Logs

```bash
# View orchestrator console output
# (Already printed to stdout)

# If logging to file:
tail -f automation/logs/automation.log
```

### State Inspection

```bash
# Pretty-print current state
python -c "
from automation.scripts.state_manager import StateManager
from pathlib import Path
import json

sm = StateManager(
    Path('automation/state/app_state.json'),
    Path('automation/state/app_state.lock')
)
state = sm.read()
print(json.dumps(state, indent=2))
"
```

### Health Check

The orchestrator runs health checks every 5 minutes. To trigger manually:

```python
# In Python REPL
from automation.scripts.orchestrator import Orchestrator
# (create orchestrator instance)
orchestrator._health_check()
```

---

## 🐛 Troubleshooting

### Issue: Orchestrator won't start

**Symptom**: `ValueError: ANTHROPIC_API_KEY not set`

**Solution**:
```bash
# Verify .env file exists
ls automation/.env

# Check API key is set
grep ANTHROPIC_API_KEY automation/.env

# If missing, add it:
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> automation/.env
```

### Issue: Tasks stuck in pending

**Symptom**: Tasks created but not processed

**Solutions**:
1. Check event loop is running:
   ```python
   state = state_manager.read()
   print(state['processes']['orchestrator']['status'])
   # Should be 'running'
   ```

2. Check for exceptions in console output

3. Verify AUTO_FIX_ENABLED=true if you want automatic processing

### Issue: High CPU usage

**Symptom**: Python process using >50% CPU

**Solutions**:
1. Increase `FILE_WATCH_DEBOUNCE_SECONDS` to reduce file system events
2. Limit watch paths to specific directories (not entire project)
3. Add more ignore patterns to FileWatcher

### Issue: Tests failing

**Symptom**: Some tests fail on `pytest` run

**Solutions**:
```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Check Python version (requires 3.8+)
python --version

# Run with verbose output
pytest automation/tests/ -v -s

# Run specific failing test for debugging
pytest automation/tests/test_orchestrator.py::test_name -v -s
```

---

## 🎓 Workflow Examples

### Example 1: Automatic Bug Fix

```
1. Edit src/services/CaseService.ts (introduce bug)
2. Save file
3. FileWatcher detects change (2s debounce)
4. Orchestrator creates task
5. Interactive Claude plans fix strategy
6. Headless Claude implements fix
7. Tests run automatically
8. If pass → task complete ✓
   If fail → retry with exponential backoff
9. After 5 failures → escalate to GitHub issue
```

### Example 2: Manual Review Mode

```bash
# Disable auto-fix for manual control
echo "AUTO_FIX_ENABLED=false" >> automation/.env

# Start orchestrator
python automation/scripts/orchestrator.py

# Now file changes are detected but NOT automatically fixed
# You can review tasks in the pending queue and process manually
```

### Example 3: Test-Driven Development

```
1. Write failing test: calculator.test.ts
2. Save file → task created
3. Orchestrator detects test failure
4. Interactive Claude: "Implement calculator.add()"
5. Headless Claude: Generates implementation
6. Tests run → pass ✓
7. Task complete
```

---

## 📈 Performance Tips

### Optimize File Watching

```bash
# Increase debounce for fewer events
FILE_WATCH_DEBOUNCE_SECONDS=5

# Watch only specific directories
# Edit orchestrator.py:
config['WATCH_PATHS'] = [
    'src/services',
    'src/repositories'
]
```

### Reduce API Calls

```bash
# Lower max retries
MAX_RETRIES=3

# Increase circuit breaker threshold
CIRCUIT_BREAKER_THRESHOLD=5
```

### Limit State Size

State is automatically limited, but you can adjust:

```python
# In orchestrator.py, adjust queue limits:
if len(completed) > 20:  # Down from 50
    completed = completed[-20:]
```

---

## 🔐 Security Best Practices

1. **Never commit .env**: Already in `.gitignore`
2. **Rotate API keys**: Update `ANTHROPIC_API_KEY` periodically
3. **Limit file access**: Set `WATCH_PATHS` to minimum needed
4. **Review escalations**: Check GitHub issues created by ErrorEscalator
5. **Monitor state file**: Contains task metadata (no credentials)

---

## 🚦 Production Deployment

### Systemd Service (Linux)

```ini
# /etc/systemd/system/justice-orchestrator.service
[Unit]
Description=Justice Companion Orchestrator
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/Justice Companion
ExecStart=/usr/bin/python3 automation/scripts/orchestrator.py
Restart=on-failure
RestartSec=10s
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable justice-orchestrator
sudo systemctl start justice-orchestrator

# Check status
sudo systemctl status justice-orchestrator

# View logs
sudo journalctl -u justice-orchestrator -f
```

### Docker Container

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY automation/requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "automation/scripts/orchestrator.py"]
```

```bash
# Build
docker build -t justice-orchestrator .

# Run
docker run -d \
  --name orchestrator \
  -v $(pwd):/app \
  -e ANTHROPIC_API_KEY=your-key \
  justice-orchestrator
```

### Windows Service (NSSM)

```bash
# Install NSSM (Non-Sucking Service Manager)
# Download from: https://nssm.cc/

# Install service
nssm install JusticeOrchestrator "C:\Python311\python.exe" ^
  "C:\path\to\Justice Companion\automation\scripts\orchestrator.py"

# Set environment
nssm set JusticeOrchestrator AppEnvironmentExtra ^
  ANTHROPIC_API_KEY=your-key

# Start service
nssm start JusticeOrchestrator
```

---

## 📚 Further Reading

- **Full Implementation Guide**: `automation/ORCHESTRATOR_IMPLEMENTATION.md`
- **Component Docs**:
  - FileWatcher: See docstrings in `file_watcher.py`
  - AutoFixer: See docstrings in `auto_fixer.py`
  - ErrorEscalator: See docstrings in `error_escalator.py`
- **Test Examples**: `automation/tests/test_integration.py`

---

## 🤝 Support

**Issues**: Check `ORCHESTRATOR_IMPLEMENTATION.md` → Troubleshooting section

**Testing**: Run `pytest automation/tests/ -v` to verify setup

**Updates**: Monitor orchestrator console for errors/warnings

---

**Last Updated**: 2025-10-05
**Status**: ✅ Production Ready
**Test Coverage**: 72 tests, 100% passing
