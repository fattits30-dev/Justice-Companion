#!/usr/bin/env python3
"""
Simple Orchestrator - File Watcher + Test Runner + Task Queue
Justice Companion - No External Claude Instances

This orchestrator:
1. Watches files for changes
2. Runs tests automatically
3. Creates task files for errors
4. YOU (current Claude session) process tasks by reading the queue
"""

import os
import sys
import json
import time
import signal
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from state_manager import StateManager
from file_watcher import FileWatcher, load_orchestrator_ignore
from test_runner import TestRunner


class SimpleOrchestrator:
    """
    Simplified orchestrator - watches files, runs tests, creates task queue.

    No external Claude processes - YOU (current session) process tasks.
    """

    def __init__(self, config: Dict):
        """Initialize orchestrator."""
        # Configuration
        self.config = config
        self.project_root = Path(config.get('PROJECT_ROOT', '.'))

        # Directories
        self.tasks_dir = self.project_root / 'automation' / 'tasks'
        self.tasks_dir.mkdir(parents=True, exist_ok=True)

        self.results_dir = self.project_root / 'automation' / 'results'
        self.results_dir.mkdir(parents=True, exist_ok=True)

        # State management
        state_file = Path(config.get('STATE_FILE', 'automation/state/app_state.json'))
        lock_file = Path(config.get('LOCK_FILE', 'automation/state/app_state.lock'))
        self.state_manager = StateManager(state_file, lock_file)

        # Test runner
        self.test_runner = TestRunner(self.project_root)

        # File watching configuration
        self.watch_extensions = config.get('WATCH_EXTENSIONS', '').split(',')
        self.watch_extensions = [ext.strip() for ext in self.watch_extensions if ext.strip()]

        self.ignore_patterns = config.get('IGNORE_PATTERNS', '').split(',')
        self.ignore_patterns = [p.strip() for p in self.ignore_patterns if p.strip()]
        self.ignore_patterns.extend(load_orchestrator_ignore())

        # Parse watch paths
        watch_paths_config = config.get('WATCH_PATHS', str(self.project_root))
        watch_paths_list = [p.strip() for p in watch_paths_config.split(',') if p.strip()]
        self.watch_paths = []
        for p in watch_paths_list:
            path = Path(p)
            if not path.is_absolute():
                path = self.project_root / path
            self.watch_paths.append(str(path))

        # Runtime state
        self._running = False
        self._shutdown_requested = False
        self.file_watcher: Optional[FileWatcher] = None

        # Statistics
        self.stats = {
            'files_changed': 0,
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'tasks_created': 0,
            'uptime_start': None
        }

    def start(self) -> None:
        """Start orchestrator."""
        print("[SimpleOrchestrator] Starting...")

        # Register signal handlers
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

        # Update state
        def update_status(state):
            state['processes']['orchestrator']['status'] = 'running'
            state['processes']['orchestrator']['pid'] = os.getpid()
            state['processes']['orchestrator']['last_heartbeat'] = datetime.now(timezone.utc).isoformat()
            return state

        self.state_manager.update(update_status)

        # Initialize statistics
        self.stats['uptime_start'] = datetime.now(timezone.utc)

        # Start file watcher
        print(f"[SimpleOrchestrator] Watching paths: {self.watch_paths}")
        print(f"[SimpleOrchestrator] Extensions: {self.watch_extensions}")

        self.file_watcher = FileWatcher(
            paths_to_watch=self.watch_paths,
            debounce_seconds=float(self.config.get('FILE_WATCH_DEBOUNCE_SECONDS', 2.0)),
            callback=self.process_file_change
        )
        self.file_watcher.start()

        self._running = True

        print("[SimpleOrchestrator] [OK] Running")
        print(f"[SimpleOrchestrator] Tasks directory: {self.tasks_dir}")
        print(f"[SimpleOrchestrator] Results directory: {self.results_dir}")
        print("[SimpleOrchestrator] Waiting for file changes...")

        # Main loop
        try:
            while self._running and not self._shutdown_requested:
                time.sleep(1)

                # Update heartbeat every 30 seconds
                if int(time.time()) % 30 == 0:
                    def update_heartbeat(state):
                        state['processes']['orchestrator']['last_heartbeat'] = datetime.now(timezone.utc).isoformat()
                        return state
                    self.state_manager.update(update_heartbeat)

        except KeyboardInterrupt:
            print("\n[SimpleOrchestrator] Keyboard interrupt received")
        finally:
            self.stop()

    def stop(self) -> None:
        """Stop orchestrator."""
        print("[SimpleOrchestrator] Stopping...")

        self._running = False

        if self.file_watcher:
            self.file_watcher.stop()

        def update_stopped(state):
            state['processes']['orchestrator']['status'] = 'stopped'
            state['processes']['orchestrator']['pid'] = None
            return state

        self.state_manager.update(update_stopped)

        print("[SimpleOrchestrator] [OK] Stopped")

    def process_file_change(self, event_data: Dict) -> None:
        """
        Handle file change event.

        Args:
            event_data: {'files': [...], 'timestamp': '...'}
        """
        files = event_data.get('files', [])

        if not files:
            return

        print(f"\n[SimpleOrchestrator] File change detected: {len(files)} file(s)")

        for file_path in files:
            # Filter files
            if not self._should_process_file(file_path):
                print(f"[SimpleOrchestrator] Skipping (filtered): {file_path}")
                continue

            print(f"[SimpleOrchestrator] Processing: {file_path}")
            self.stats['files_changed'] += 1

            # Run tests
            self._run_tests_for_file(file_path)

    def _should_process_file(self, file_path: str) -> bool:
        """Check if file should be processed."""
        path = Path(file_path)

        # Check extension
        if self.watch_extensions and path.suffix not in self.watch_extensions:
            return False

        # Check ignore patterns
        for pattern in self.ignore_patterns:
            if pattern in str(path):
                return False

        # Skip test files
        if '.test.' in path.name or '.spec.' in path.name:
            return False

        # Skip config files
        if path.name in ['package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts']:
            return False

        return True

    def _run_tests_for_file(self, file_path: str) -> None:
        """Run tests for a file and create tasks if failures occur."""
        print(f"[SimpleOrchestrator] Running tests for: {file_path}")

        self.stats['tests_run'] += 1

        # Run tests
        test_result = self.test_runner.run_tests()

        if test_result.get('success'):
            print(f"[SimpleOrchestrator] [OK] Tests passed")
            self.stats['tests_passed'] += 1
        else:
            print(f"[SimpleOrchestrator] [ERROR] Tests failed")
            self.stats['tests_failed'] += 1

            # Create task for failures
            self._create_task_for_test_failure(file_path, test_result)

    def _create_task_for_test_failure(self, file_path: str, test_result: Dict) -> None:
        """Create a task file for test failures."""
        task_id = str(uuid4())

        task = {
            'id': task_id,
            'type': 'test_failure',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'file_path': file_path,
            'test_result': test_result,
            'status': 'pending',
            'description': f"Fix test failures in {file_path}"
        }

        # Write task file
        task_file = self.tasks_dir / f"{task_id}.json"
        with open(task_file, 'w') as f:
            json.dump(task, f, indent=2)

        print(f"[SimpleOrchestrator] [OK] Created task: {task_file}")
        self.stats['tasks_created'] += 1

        # Update state
        def add_task(state):
            state['queues']['pending'].append(task)
            return state

        self.state_manager.update(add_task)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"\n[SimpleOrchestrator] Received signal {signum}")
        self._shutdown_requested = True

    def print_stats(self) -> None:
        """Print current statistics."""
        uptime = datetime.now(timezone.utc) - self.stats['uptime_start']

        print("\n" + "="*60)
        print("SimpleOrchestrator Statistics")
        print("="*60)
        print(f"Uptime:         {uptime}")
        print(f"Files changed:  {self.stats['files_changed']}")
        print(f"Tests run:      {self.stats['tests_run']}")
        print(f"Tests passed:   {self.stats['tests_passed']}")
        print(f"Tests failed:   {self.stats['tests_failed']}")
        print(f"Tasks created:  {self.stats['tasks_created']}")
        print("="*60 + "\n")


def load_config() -> Dict:
    """Load configuration from .env file."""
    env_file = Path(__file__).parent.parent / '.env'
    config = {
        'PROJECT_ROOT': str(Path(__file__).parent.parent.parent),
    }

    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                if '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()

    return config


def main():
    """Main entry point."""
    print("="*60)
    print("Simple Orchestrator - Justice Companion")
    print("="*60)

    # Load config
    config = load_config()

    # Create orchestrator
    orchestrator = SimpleOrchestrator(config)

    # Start
    try:
        orchestrator.start()
    except Exception as e:
        print(f"[SimpleOrchestrator] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        orchestrator.print_stats()


if __name__ == '__main__':
    main()
