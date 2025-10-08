#!/usr/bin/env python3
"""Quick test of ClaudeInstance initialization."""

import os
import sys

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

print("[TEST] Starting ClaudeInstance initialization test...")

try:
    print("[TEST] Importing ClaudeInstance...")
    from claude_instance import ClaudeInstance
    print("[TEST] Import successful")

    print("[TEST] Creating interactive instance...")
    interactive = ClaudeInstance('interactive')
    print(f"[TEST] Interactive instance created: {interactive.claude_exe}")

    print("[TEST] Creating headless instance...")
    headless = ClaudeInstance('headless')
    print(f"[TEST] Headless instance created: {headless.claude_exe}")

    print("[TEST] [OK] All tests passed!")

except Exception as e:
    print(f"[TEST] [ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
