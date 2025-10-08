#!/usr/bin/env python3
"""
File Monitor Agent - Watches files and publishes change events
Justice Companion Multi-Agent System

Responsibility: ONE JOB - Watch files and notify when changes happen
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime, timezone

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from file_watcher import FileWatcher, load_orchestrator_ignore
from state_manager import StateManager


class FileMonitorAgent:
    """
    Agent responsible for monitoring file changes.

    Single Responsibility: Watch configured directories and publish events
    """

    def __init__(self, config: dict):
        self.config = config
        self.agent_id = "file_monitor"

        # Determine project root (parent of automation directory)
        self.project_root = Path(__file__).parent.parent.parent

        # State management (relative to project root)
        state_file = self.project_root / 'automation' / 'state' / 'app_state.json'
        lock_file = self.project_root / 'automation' / 'state' / 'app_state.lock'
        self.state = StateManager(state_file, lock_file)

        # Events directory for publishing (relative to project root)
        self.events_dir = self.project_root / 'automation' / 'events'
        self.events_dir.mkdir(parents=True, exist_ok=True)

        # Load ignore patterns
        self.ignore_patterns = load_orchestrator_ignore()

        # Parse watch configuration (paths relative to project root)
        watch_paths_str = config.get('WATCH_PATHS', 'src,electron,scripts')
        self.watch_paths = [str(self.project_root / p.strip()) for p in watch_paths_str.split(',')]

        watch_ext_str = config.get('WATCH_EXTENSIONS', '.ts,.tsx,.js,.jsx,.json')
        self.watch_extensions = [e.strip() for e in watch_ext_str.split(',')]

        self.debounce = float(config.get('FILE_WATCH_DEBOUNCE_SECONDS', 5.0))

        # Statistics
        self.stats = {
            'events_published': 0,
            'files_watched': 0,
            'start_time': None
        }

    def start(self):
        """Start the file monitor agent."""
        print(f"[{self.agent_id}] Starting File Monitor Agent")
        print(f"[{self.agent_id}] Watching: {self.watch_paths}")
        print(f"[{self.agent_id}] Extensions: {self.watch_extensions}")
        print(f"[{self.agent_id}] Debounce: {self.debounce}s")

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

        # Start watcher
        watcher = FileWatcher(
            paths_to_watch=self.watch_paths,
            debounce_seconds=self.debounce,
            callback=self.on_file_change
        )

        watcher.start()

        print(f"[{self.agent_id}] [READY] Monitoring for file changes...")

        # Keep alive
        try:
            while True:
                time.sleep(10)
                self._heartbeat()
        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] Shutting down...")
            watcher.stop()
            self._print_stats()

    def on_file_change(self, event_data: dict):
        """
        Handle file change event.

        Publishes event to events directory for other agents to consume.
        """
        files = event_data.get('files', [])

        if not files:
            return

        # Filter files
        filtered_files = []
        for file_path in files:
            if self._should_watch(file_path):
                filtered_files.append(file_path)

        if not filtered_files:
            print(f"[{self.agent_id}] Filtered out {len(files)} file(s)")
            return

        print(f"\n[{self.agent_id}] File change detected: {len(filtered_files)} file(s)")
        for f in filtered_files:
            print(f"  - {f}")

        # Publish event
        event = {
            'event_type': 'file_changed',
            'agent_id': self.agent_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'files': filtered_files,
            'count': len(filtered_files)
        }

        self._publish_event(event)
        self.stats['events_published'] += 1
        self.stats['files_watched'] += len(filtered_files)

    def _should_watch(self, file_path: str) -> bool:
        """Check if file should be watched."""
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

        return True

    def _publish_event(self, event: dict):
        """Publish event to events directory."""
        event_id = event['timestamp'].replace(':', '-').replace('.', '-')
        event_file = self.events_dir / f"{event['event_type']}_{event_id}.json"

        with open(event_file, 'w') as f:
            json.dump(event, f, indent=2)

        print(f"[{self.agent_id}] Published event: {event_file.name}")

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
        print(f"Uptime:           {uptime}")
        print(f"Events published: {self.stats['events_published']}")
        print(f"Files watched:    {self.stats['files_watched']}")
        print("="*60 + "\n")


def load_config():
    """Load configuration from .env file."""
    env_file = Path(__file__).parent.parent / '.env'
    config = {}

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
    print("FILE MONITOR AGENT")
    print("Justice Companion Multi-Agent System")
    print("="*60)

    config = load_config()
    agent = FileMonitorAgent(config)
    agent.start()
