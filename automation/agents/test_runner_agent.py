#!/usr/bin/env python3
"""
Test Runner Agent - Runs tests when files change
Justice Companion Multi-Agent System

Responsibility: ONE JOB - Run tests and report results
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from test_runner import TestRunner
from state_manager import StateManager


class TestRunnerAgent:
    """
    Agent responsible for running tests.

    Single Responsibility: Listen for file changes and run tests
    """

    def __init__(self, config: dict):
        self.config = config
        self.agent_id = "test_runner"

        # Determine project root (parent of automation directory)
        self.project_root = Path(__file__).parent.parent.parent

        # State management (relative to project root)
        state_file = self.project_root / 'automation' / 'state' / 'app_state.json'
        lock_file = self.project_root / 'automation' / 'state' / 'app_state.lock'
        self.state = StateManager(state_file, lock_file)

        # Events directories (relative to project root)
        self.events_dir = self.project_root / 'automation' / 'events'
        self.tasks_dir = self.project_root / 'automation' / 'tasks'
        self.tasks_dir.mkdir(parents=True, exist_ok=True)

        # Test runner
        project_root = self.project_root
        self.test_runner = TestRunner(project_root)

        # Statistics
        self.stats = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'tasks_created': 0,
            'start_time': None
        }

        # Processed events tracking
        self.processed_events = set()

    def start(self):
        """Start the test runner agent."""
        print(f"[{self.agent_id}] Starting Test Runner Agent")

        self.stats['start_time'] = datetime.now(timezone.utc)

        # Update state
        def update_status(state):
            if 'agents' not in state:
                state['agents'] = {}
            state['agents'][self.agent_id] = {
                'status': 'running',
                'last_heartbeat': datetime.now(timezone.utc).isoformat()
            }
            return state

        self.state.update(update_status)

        print(f"[{self.agent_id}] [READY] Listening for file change events...")

        # Event loop
        try:
            while True:
                self._process_events()
                time.sleep(2)  # Check every 2 seconds

                if int(time.time()) % 10 == 0:
                    self._heartbeat()

        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] Shutting down...")
            self._print_stats()

    def _process_events(self):
        """Process events from events directory."""
        if not self.events_dir.exists():
            return

        # Find unprocessed file_changed events
        event_files = sorted(self.events_dir.glob('file_changed_*.json'))

        for event_file in event_files:
            event_id = event_file.stem

            # Skip if already processed
            if event_id in self.processed_events:
                continue

            # Read event
            with open(event_file) as f:
                event = json.load(f)

            # Process event
            self._handle_file_change(event)

            # Mark as processed
            self.processed_events.add(event_id)

            # Clean up old event (optional - keep for debugging)
            # event_file.unlink()

    def _handle_file_change(self, event: dict):
        """Handle file change event by running tests."""
        files = event.get('files', [])

        print(f"\n[{self.agent_id}] Processing file change event")
        print(f"[{self.agent_id}] Files changed: {len(files)}")

        # Run tests
        print(f"[{self.agent_id}] Running tests...")
        self.stats['tests_run'] += 1

        test_result = self.test_runner.run_tests()

        if test_result.get('passed'):  # Fixed: was checking 'success', should be 'passed'
            print(f"[{self.agent_id}] [PASS] Tests passed")
            self.stats['tests_passed'] += 1
        else:
            print(f"[{self.agent_id}] [FAIL] Tests failed")
            self.stats['tests_failed'] += 1

            # Create task for failures
            self._create_fix_task(files, test_result)

    def _create_fix_task(self, files: list, test_result: dict):
        """Create a task for fix agents to process."""
        task_id = str(uuid4())

        task = {
            'id': task_id,
            'type': 'test_failure',
            'status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': self.agent_id,
            'files': files,
            'test_result': test_result,
            'description': f"Fix test failures in {', '.join(files)}"
        }

        # Write task file
        task_file = self.tasks_dir / f"{task_id}.json"
        with open(task_file, 'w') as f:
            json.dump(task, f, indent=2)

        print(f"[{self.agent_id}] [TASK CREATED] {task_file.name}")
        self.stats['tasks_created'] += 1

    def _heartbeat(self):
        """Update heartbeat in state."""
        def update_heartbeat(state):
            if 'agents' not in state:
                state['agents'] = {}
            if self.agent_id not in state['agents']:
                state['agents'][self.agent_id] = {}
            state['agents'][self.agent_id]['last_heartbeat'] = datetime.now(timezone.utc).isoformat()
            return state

        self.state.update(update_heartbeat)

    def _print_stats(self):
        """Print agent statistics."""
        uptime = datetime.now(timezone.utc) - self.stats['start_time']

        print("\n" + "="*60)
        print(f"{self.agent_id.upper()} STATISTICS")
        print("="*60)
        print(f"Uptime:        {uptime}")
        print(f"Tests run:     {self.stats['tests_run']}")
        print(f"Tests passed:  {self.stats['tests_passed']}")
        print(f"Tests failed:  {self.stats['tests_failed']}")
        print(f"Tasks created: {self.stats['tasks_created']}")
        print("="*60 + "\n")


def load_config():
    """Load configuration from .env file."""
    env_file = Path(__file__).parent.parent / '.env'
    config = {'PROJECT_ROOT': str(Path(__file__).parent.parent.parent)}

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


if __name__ == '__main__':
    print("="*60)
    print("TEST RUNNER AGENT")
    print("Justice Companion Multi-Agent System")
    print("="*60)

    config = load_config()
    agent = TestRunnerAgent(config)
    agent.start()
