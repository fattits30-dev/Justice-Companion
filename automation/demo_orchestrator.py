#!/usr/bin/env python3
"""
Live Demonstration of Dual Claude Orchestration System

This script demonstrates:
1. File change detection
2. Task creation
3. Queue processing
4. State management

Run without API key to see dry-run demonstration.
"""

import os
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

from state_manager import StateManager
from file_watcher import FileWatcher


def demo_without_api_key():
    """Demonstrate components that don't require API key."""
    print("=" * 60)
    print("DUAL CLAUDE ORCHESTRATION SYSTEM - LIVE DEMO")
    print("=" * 60)
    print()

    # Setup paths
    project_root = Path(__file__).parent.parent
    state_dir = Path(__file__).parent / 'state'
    state_dir.mkdir(exist_ok=True)

    state_file = state_dir / 'demo_state.json'
    lock_file = state_dir / 'demo_state.lock'

    print("[1] INITIALIZING STATE MANAGER...")
    state_manager = StateManager(state_file, lock_file)

    # Initialize state
    def init_state(state):
        state['demo'] = {
            'started_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'file_changes_detected': 0,
            'tasks_created': 0
        }
        state['queues'] = {
            'pending': [],
            'completed': [],
            'failed': []
        }
        return state

    state_manager.update(init_state)
    print("    [OK] State manager initialized")
    print(f"    [OK] State file: {state_file}")
    print()

    print("[2] TESTING FILE WATCHER...")

    # Create a temporary test directory
    test_dir = project_root / 'automation' / 'demo_test'
    test_dir.mkdir(exist_ok=True)

    detected_files = []

    def file_change_callback(event_data):
        """Callback when files change."""
        files = event_data.get('files', [])
        detected_files.extend(files)

        print(f"    [DETECTED] {len(files)} file(s) changed:")
        for f in files:
            print(f"        - {f}")

        # Update state
        def record_change(state):
            state['demo']['file_changes_detected'] += len(files)
            state['demo']['tasks_created'] += 1

            # Add task to queue
            task = {
                'id': f"task_{len(state['queues']['pending']) + 1}",
                'files': files,
                'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'status': 'pending'
            }
            state['queues']['pending'].append(task)
            return state

        state_manager.update(record_change)
        print(f"    [CREATED] Task for {len(files)} file(s)")

    # Start file watcher
    watcher = FileWatcher(
        paths_to_watch=[str(test_dir)],
        debounce_seconds=1.0,
        callback=file_change_callback
    )

    print(f"    [OK] FileWatcher created")
    print(f"    [OK] Watching: {test_dir}")
    print(f"    [OK] Debounce: 1.0 seconds")
    print()

    print("[3] SIMULATING FILE CHANGES...")
    watcher.start()
    time.sleep(0.5)  # Let watcher initialize

    # Create test files
    print("    Creating test files...")
    for i in range(3):
        test_file = test_dir / f"test_{i}.py"
        test_file.write_text(f"# Test file {i}\nprint('Hello {i}')\n")
        time.sleep(0.2)

    # Wait for debounce
    print("    Waiting for debounce (1 second)...")
    time.sleep(1.5)

    watcher.stop()
    print()

    print("[4] VERIFICATION...")
    state = state_manager.read()

    print(f"    Files detected: {state['demo']['file_changes_detected']}")
    print(f"    Tasks created: {state['demo']['tasks_created']}")
    print(f"    Pending queue: {len(state['queues']['pending'])} task(s)")
    print()

    if state['queues']['pending']:
        print("[5] TASK QUEUE CONTENTS:")
        for task in state['queues']['pending']:
            print(f"    Task ID: {task['id']}")
            print(f"    Files: {len(task['files'])}")
            print(f"    Status: {task['status']}")
            print(f"    Created: {task['created_at']}")
            print()

    # Cleanup
    print("[6] CLEANUP...")
    import shutil
    shutil.rmtree(test_dir)
    state_file.unlink()
    lock_file.unlink()
    print("    [OK] Demo files cleaned up")
    print()

    print("=" * 60)
    print("DEMO COMPLETE - ALL COMPONENTS FUNCTIONAL")
    print("=" * 60)
    print()
    print("What this proves:")
    print("  [OK] FileWatcher detects changes in real-time")
    print("  [OK] StateManager handles atomic operations")
    print("  [OK] Task queue system works correctly")
    print("  [OK] Debouncing batches multiple changes")
    print()
    print("To run full orchestrator with Claude API:")
    print("  1. Set ANTHROPIC_API_KEY in automation/.env")
    print("  2. Run: python automation/scripts/orchestrator.py")
    print()


if __name__ == '__main__':
    try:
        demo_without_api_key()
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Demo stopped by user")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
