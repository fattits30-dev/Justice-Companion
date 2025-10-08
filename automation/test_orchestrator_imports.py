#!/usr/bin/env python3
"""Test orchestrator imports to find hanging module."""

import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

print("[TEST] Testing imports...")

print("[TEST] 1. Import os...")
import os
print("[TEST]   OK")

print("[TEST] 2. Import dotenv...")
from dotenv import load_dotenv
print("[TEST]   OK")

print("[TEST] 3. Load .env file...")
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)
print("[TEST]   OK")

print("[TEST] 4. Import StateManager...")
from state_manager import StateManager
print("[TEST]   OK")

print("[TEST] 5. Import FileWatcher...")
from file_watcher import FileWatcher
print("[TEST]   OK")

print("[TEST] 6. Import AutoFixer...")
from auto_fixer import AutoFixer
print("[TEST]   OK")

print("[TEST] 7. Import ErrorEscalator...")
from error_escalator import ErrorEscalator
print("[TEST]   OK")

print("[TEST] 8. Import ClaudeInstance...")
from claude_instance import ClaudeInstance
print("[TEST]   OK")

print("[TEST] 9. Import TestRunner...")
from test_runner import TestRunner
print("[TEST]   OK")

print("[TEST] [OK] All imports successful!")
