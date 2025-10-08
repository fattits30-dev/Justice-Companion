#!/usr/bin/env python3
"""Quick status check for orchestrator configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_file = Path(__file__).parent / '.env'
load_dotenv(env_file)

print("=" * 60)
print("ORCHESTRATOR STATUS CHECK")
print("=" * 60)

# Check API key
api_key = os.getenv('ANTHROPIC_API_KEY', '')
if api_key and api_key != 'your-api-key-here' and api_key.startswith('sk-ant-'):
    print("[OK] API Key: Configured (starts with sk-ant-)")
else:
    print("[WARNING] API Key: NOT CONFIGURED (still placeholder)")
    print("          Edit automation/.env and add your real key")

# Check project root
project_root = os.getenv('PROJECT_ROOT', '')
if project_root and Path(project_root).exists():
    print(f"[OK] Project Root: {project_root}")
else:
    print(f"[WARNING] Project Root: {project_root} (check path)")

# Check what it's watching
watch_paths = os.getenv('WATCH_PATHS', project_root)
print(f"[OK] Watching: {watch_paths}")

# Check auto-fix
auto_fix = os.getenv('AUTO_FIX_ENABLED', 'true')
print(f"[OK] Auto-fix: {auto_fix}")

# Check if state file exists
state_file = Path(__file__).parent / 'state' / 'app_state.json'
if state_file.exists():
    print(f"[OK] State file exists: {state_file}")
    import json
    with open(state_file) as f:
        state = json.load(f)

    if 'processes' in state and 'orchestrator' in state['processes']:
        status = state['processes']['orchestrator'].get('status', 'unknown')
        print(f"[OK] Orchestrator status: {status}")

        if 'queues' in state:
            pending = len(state['queues'].get('pending', []))
            completed = len(state['queues'].get('completed', []))
            failed = len(state['queues'].get('failed', []))
            print(f"[OK] Queue: {pending} pending, {completed} completed, {failed} failed")
else:
    print("[INFO] State file not yet created (will be created on first run)")

print("=" * 60)

# Summary
if api_key and api_key != 'your-api-key-here' and api_key.startswith('sk-ant-'):
    print("STATUS: FULLY CONFIGURED - Ready to process tasks")
else:
    print("STATUS: FILE WATCHING ONLY - Can't process without API key")
    print("")
    print("What's working:")
    print("  [OK] FileWatcher will detect changes")
    print("  [OK] Tasks will be created and queued")
    print("  [X] Tasks WON'T be processed (no API key)")
    print("")
    print("To enable full functionality:")
    print("  1. Get API key from: https://console.anthropic.com/")
    print("  2. Edit automation/.env")
    print("  3. Replace 'your-api-key-here' with real key (sk-ant-...)")
    print("  4. Restart orchestrator")
