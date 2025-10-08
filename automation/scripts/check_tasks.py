#!/usr/bin/env python3
"""
Check Tasks - View pending tasks in the queue
"""

import json
from pathlib import Path
from datetime import datetime


def main():
    """Display all pending tasks."""
    tasks_dir = Path(__file__).parent.parent / 'tasks'

    if not tasks_dir.exists():
        print("No tasks directory found")
        return

    task_files = list(tasks_dir.glob('*.json'))

    if not task_files:
        print("[OK] No pending tasks")
        return

    print("="*60)
    print(f"Pending Tasks ({len(task_files)})")
    print("="*60)

    for task_file in sorted(task_files):
        with open(task_file) as f:
            task = json.load(f)

        print(f"\nTask: {task['id'][:8]}...")
        print(f"Type: {task['type']}")
        print(f"File: {task['file_path']}")
        print(f"Created: {task['created_at']}")
        print(f"Status: {task['status']}")

        if task['type'] == 'test_failure':
            test_result = task.get('test_result', {})
            print(f"Exit code: {test_result.get('exit_code')}")

            stdout = test_result.get('stdout', '')
            if stdout:
                lines = stdout.split('\n')
                print(f"Output preview:")
                for line in lines[:5]:
                    print(f"  {line}")
                if len(lines) > 5:
                    print(f"  ... ({len(lines) - 5} more lines)")

        print(f"File: {task_file}")

    print("\n" + "="*60)


if __name__ == '__main__':
    main()
