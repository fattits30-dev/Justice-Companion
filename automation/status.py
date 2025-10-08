#!/usr/bin/env python3
"""Check orchestrator status."""

import json
import sys
from pathlib import Path
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_status():
    # Handle both running from project root and automation directory
    if Path('state/app_state.json').exists():
        state_file = Path('state/app_state.json')
    elif Path('automation/state/app_state.json').exists():
        state_file = Path('automation/state/app_state.json')
    else:
        print("[X] State file not found - orchestrator never started")
        return

    with open(state_file, encoding='utf-8') as f:
        state = json.load(f)

    print("=" * 60)
    print("Justice Companion Orchestrator - Status Report")
    print("=" * 60)
    print()

    # Process status
    orch = state['processes']['orchestrator']
    status = orch['status']
    pid = orch['pid']

    if status == 'running':
        print(f"[OK] Status: RUNNING (PID: {pid})")

        # Check heartbeat
        heartbeat = orch.get('last_heartbeat')
        if heartbeat:
            print(f"     Last heartbeat: {heartbeat}")
    else:
        print(f"[--] Status: STOPPED")

    print()

    # Queue status
    queues = state['queues']
    print("Task Queues:")
    print(f"  Pending:     {len(queues['pending'])} tasks")
    print(f"  In Progress: {len(queues['in_progress'])} tasks")
    print(f"  Completed:   {len(queues['completed'])} tasks")
    print(f"  Failed:      {len(queues['failed'])} tasks")
    print()

    # Statistics
    stats = state.get('statistics', {})
    print("Statistics:")
    print(f"  Total:       {stats.get('total_tasks', 0)} tasks")
    print(f"  Successful:  {stats.get('successful_tasks', 0)} tasks")
    print(f"  Failed:      {stats.get('failed_tasks', 0)} tasks")
    print(f"  Auto-fixed:  {stats.get('auto_fixed_tasks', 0)} tasks")
    print(f"  Escalated:   {stats.get('escalated_tasks', 0)} tasks")
    print()

    # Warnings
    if len(queues['in_progress']) > 20:
        print("[!] WARNING: Many tasks in progress - possible stuck state")

    if len(queues['failed']) > 10:
        print("[!] WARNING: High failure rate - check logs")

    print("=" * 60)

if __name__ == '__main__':
    check_status()
