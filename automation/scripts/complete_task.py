#!/usr/bin/env python3
"""
Complete Task - Mark a task as completed
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone


def main():
    """Mark a task as completed."""
    if len(sys.argv) < 2:
        print("Usage: python complete_task.py <task_id>")
        print("\nUse check_tasks.py to see pending tasks")
        return

    task_id = sys.argv[1]

    # Find task file
    tasks_dir = Path(__file__).parent.parent / 'tasks'
    task_files = list(tasks_dir.glob(f"{task_id}*.json"))

    if not task_files:
        print(f"[ERROR] Task not found: {task_id}")
        return

    task_file = task_files[0]

    # Load task
    with open(task_file) as f:
        task = json.load(f)

    # Move to results
    results_dir = Path(__file__).parent.parent / 'results'
    results_dir.mkdir(parents=True, exist_ok=True)

    task['status'] = 'completed'
    task['completed_at'] = datetime.now(timezone.utc).isoformat()

    result_file = results_dir / task_file.name

    with open(result_file, 'w') as f:
        json.dump(task, f, indent=2)

    # Remove from tasks
    task_file.unlink()

    print(f"[OK] Task completed: {task['id'][:8]}...")
    print(f"  Moved to: {result_file}")


if __name__ == '__main__':
    main()
