#!/usr/bin/env python3
"""Test importing orchestrator module."""

import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

print("[TEST] About to import orchestrator module...")

# This should NOT execute the if __name__ == '__main__' block
import orchestrator

print("[TEST] Successfully imported orchestrator module!")
print(f"[TEST] Orchestrator class: {orchestrator.Orchestrator}")
