# Orchestrator Quick Start

## Start the Orchestrator

**Windows:**
```batch
automation\start.bat
```

**Linux/Mac:**
```bash
cd automation
python scripts/orchestrator.py
```

## Stop the Orchestrator

**Windows:**
```batch
automation\stop.bat
```

**Linux/Mac:**
```bash
# Find PID
cat automation/state/app_state.json | grep -A 1 orchestrator

# Kill process
kill <PID>
```

## Check Status

```bash
python automation/status.py
```

## Troubleshooting

### Orchestrator won't start
1. Check `.env` file exists: `automation/.env`
2. Check Python installed: `python --version`
3. Check API key set: `ANTHROPIC_API_KEY` in `.env`

### Too many tasks stuck
1. Stop orchestrator: `automation\stop.bat`
2. Clear state: Delete `automation/state/app_state.json`
3. Restart: `automation\start.bat`

### Watching wrong files
Edit `automation/.env`:
- `WATCH_PATHS` - Directories to watch
- `IGNORE_PATTERNS` - Files to ignore
