#!/usr/bin/env python3
"""
Orchestrator - Main Coordination Loop for Dual Claude System
Justice Companion Automation Framework

Coordinates FileWatcher, AutoFixer, ErrorEscalator, and Claude instances
to provide automated code fixing with proper task queue management.
"""

import os
import sys
import time
import signal
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Optional, List
from uuid import uuid4

from state_manager import StateManager
from file_watcher import FileWatcher, should_ignore_file, load_orchestrator_ignore
from auto_fixer import AutoFixer
from error_escalator import ErrorEscalator
from claude_instance import ClaudeInstance
from test_runner import TestRunner


def safe_print(message: str) -> None:
    """
    Print message safely, handling Unicode encoding errors on Windows.

    Replaces unencodable characters with '?' to avoid UnicodeEncodeError.
    """
    try:
        print(message)
    except UnicodeEncodeError:
        # Encode to ASCII, replacing unencodable characters with '?'
        safe_message = message.encode('ascii', errors='replace').decode('ascii')
        print(safe_message)


class Orchestrator:
    """
    Main orchestrator for the Dual Claude Orchestration System.

    Features:
    - Event loop coordinating interactive/headless Claude instances
    - Task queue management (pending, in_progress, completed, failed)
    - Heartbeat mechanism (updates every 30s)
    - Health checks (every 5 minutes)
    - Graceful shutdown handling
    - Integration with FileWatcher, AutoFixer, ErrorEscalator
    """

    def __init__(self, config: Dict):
        """
        Initialize orchestrator.

        Args:
            config: Configuration dictionary with paths and settings
        """
        # Configuration
        self.config = config
        self.project_root = Path(config.get('PROJECT_ROOT', '.'))
        self.max_retries = int(config.get('MAX_RETRIES', 5))
        self.auto_fix_enabled = config.get('AUTO_FIX_ENABLED', 'true').lower() == 'true'
        self.heartbeat_interval = 30  # seconds
        self.health_check_interval = 300  # 5 minutes

        # File watching configuration
        self.watch_extensions = config.get('WATCH_EXTENSIONS', '').split(',')
        self.watch_extensions = [ext.strip() for ext in self.watch_extensions if ext.strip()]

        self.ignore_patterns = config.get('IGNORE_PATTERNS', '').split(',')
        self.ignore_patterns = [p.strip() for p in self.ignore_patterns if p.strip()]

        # Load .orchestratorignore patterns
        self.ignore_patterns.extend(load_orchestrator_ignore())

        # Batch processing configuration
        self.max_batch_size = int(config.get('MAX_BATCH_SIZE', 10))

        # Auto-fix file type filtering
        self.auto_fix_file_types = config.get('AUTO_FIX_FILE_TYPES', '').split(',')
        self.auto_fix_file_types = [ft.strip() for ft in self.auto_fix_file_types if ft.strip()]

        self.auto_fix_exclude = config.get('AUTO_FIX_EXCLUDE', '').split(',')
        self.auto_fix_exclude = [ex.strip() for ex in self.auto_fix_exclude if ex.strip()]

        # State management
        state_file = Path(config.get('STATE_FILE', 'automation/state/app_state.json'))
        lock_file = Path(config.get('LOCK_FILE', 'automation/state/app_state.lock'))
        self.state_manager = StateManager(state_file, lock_file)

        # Test runner
        self.test_runner = TestRunner(self.project_root)

        # Claude instances
        api_key = config.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in config")

        self.claude_interactive = ClaudeInstance('interactive', api_key)
        self.claude_headless = ClaudeInstance('headless', api_key)

        # Components
        self.auto_fixer = AutoFixer(
            self.state_manager,
            self.test_runner,
            self.claude_headless
        )

        github_token = config.get('GITHUB_TOKEN')
        self.error_escalator = ErrorEscalator(self.state_manager, github_token)

        # File watcher (initialized in start())
        self.file_watcher: Optional[FileWatcher] = None

        # Parse WATCH_PATHS (can be string or list)
        watch_paths_config = config.get('WATCH_PATHS', str(self.project_root))
        if isinstance(watch_paths_config, str):
            # Convert comma-separated string to list of absolute paths
            watch_paths_list = [p.strip() for p in watch_paths_config.split(',') if p.strip()]
            self.watch_paths = []
            for p in watch_paths_list:
                path = Path(p)
                if not path.is_absolute():
                    # Relative to project root
                    path = self.project_root / path
                self.watch_paths.append(str(path))
        else:
            self.watch_paths = watch_paths_config

        # Runtime state
        self._running = False
        self._shutdown_requested = False
        self._event_loop_thread: Optional[threading.Thread] = None
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._health_check_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Statistics
        self.stats = {
            'tasks_processed': 0,
            'tasks_succeeded': 0,
            'tasks_failed': 0,
            'tasks_escalated': 0,
            'uptime_start': None
        }

    def start(self) -> None:
        """
        Start orchestrator and all components.

        Raises:
            RuntimeError: If orchestrator is already running
        """
        with self._lock:
            if self._running:
                raise RuntimeError("Orchestrator is already running")

            safe_print("[Orchestrator] Starting Dual Claude Orchestration System...")

            # Register signal handlers
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)

            # Update state to mark orchestrator as running
            self._update_orchestrator_status('running')

            # Initialize statistics
            self.stats['uptime_start'] = datetime.now(timezone.utc)

            # Start file watcher
            safe_print("[Orchestrator] Starting FileWatcher...")
            self.file_watcher = FileWatcher(
                paths_to_watch=self.watch_paths,
                debounce_seconds=float(
                    self.config.get('FILE_WATCH_DEBOUNCE_SECONDS', 2.0)
                ),
                callback=self.process_file_change
            )
            self.file_watcher.start()

            # Start event loop thread
            safe_print("[Orchestrator] Starting event loop...")
            self._running = True
            self._event_loop_thread = threading.Thread(
                target=self._event_loop,
                daemon=False,
                name="OrchestratorEventLoop"
            )
            self._event_loop_thread.start()

            # Start heartbeat thread
            safe_print("[Orchestrator] Starting heartbeat...")
            self._heartbeat_thread = threading.Thread(
                target=self._heartbeat_loop,
                daemon=True,
                name="OrchestratorHeartbeat"
            )
            self._heartbeat_thread.start()

            # Start health check thread
            safe_print("[Orchestrator] Starting health checks...")
            self._health_check_thread = threading.Thread(
                target=self._health_check_loop,
                daemon=True,
                name="OrchestratorHealthCheck"
            )
            self._health_check_thread.start()

            safe_print("[Orchestrator] [OK] All systems operational")
            safe_print(f"[Orchestrator] Watching: {', '.join(self.watch_paths)}")
            safe_print(f"[Orchestrator] Auto-fix: {'enabled' if self.auto_fix_enabled else 'disabled'}")

    def stop(self) -> None:
        """
        Stop orchestrator gracefully and cleanup resources.

        Waits for current task to complete and saves state.
        """
        safe_print("\n[Orchestrator] Initiating graceful shutdown...")

        with self._lock:
            if not self._running:
                safe_print("[Orchestrator] Not running, nothing to stop")
                return

            self._shutdown_requested = True

        # Stop file watcher first (no new tasks)
        if self.file_watcher:
            safe_print("[Orchestrator] Stopping FileWatcher...")
            self.file_watcher.stop()

        # Wait for event loop to finish current task
        safe_print("[Orchestrator] Waiting for event loop to finish...")
        if self._event_loop_thread:
            self._event_loop_thread.join(timeout=30.0)

        # Update state
        self._update_orchestrator_status('stopped')

        with self._lock:
            self._running = False

        # Print final statistics
        self._print_statistics()

        safe_print("[Orchestrator] [OK] Shutdown complete")

    def process_file_change(self, event_data: Dict) -> None:
        """
        Handle file change event from FileWatcher.

        Creates tasks for changed files after filtering and batching.

        Args:
            event_data: Event data from FileWatcher with 'files' and 'timestamp'
        """
        files = event_data.get('files', [])
        timestamp = event_data.get('timestamp')

        if not files:
            return

        safe_print(f"\n[Orchestrator] File change detected: {len(files)} file(s)")

        # Step 1: Filter files by ignore patterns
        filtered_files = []
        for file_path in files:
            if should_ignore_file(file_path, self.ignore_patterns):
                safe_print(f"[Orchestrator] Ignoring file: {Path(file_path).name}")
                continue
            filtered_files.append(file_path)

        # Step 2: Filter by extension (if configured)
        if self.watch_extensions:
            extension_filtered = []
            for file_path in filtered_files:
                file_ext = Path(file_path).suffix
                if file_ext in self.watch_extensions:
                    extension_filtered.append(file_path)
                else:
                    safe_print(f"[Orchestrator] Skipping {Path(file_path).name} (extension {file_ext} not watched)")
            filtered_files = extension_filtered

        if not filtered_files:
            safe_print("[Orchestrator] No relevant files after filtering")
            return

        safe_print(f"[Orchestrator] Processing {len(filtered_files)} file(s) after filtering")

        # Step 3: Batch processing (max MAX_BATCH_SIZE files at a time)
        if len(filtered_files) > self.max_batch_size:
            safe_print(f"[Orchestrator] Batching: Processing first {self.max_batch_size} files, "
                      f"queueing {len(filtered_files) - self.max_batch_size} for later")
            batch = filtered_files[:self.max_batch_size]
            # TODO: Queue remaining files for later processing
        else:
            batch = filtered_files

        # Step 4: Create tasks for batched files
        for file_path in batch:
            # Check if file should be auto-fixed (if auto-fix is enabled)
            should_auto_fix = self.auto_fix_enabled
            if should_auto_fix and self.auto_fix_file_types:
                file_ext = Path(file_path).suffix
                if file_ext not in self.auto_fix_file_types:
                    should_auto_fix = False
                    safe_print(f"[Orchestrator] Auto-fix disabled for {Path(file_path).name} (type: {file_ext})")

            # Check auto-fix exclusions
            if should_auto_fix and self.auto_fix_exclude:
                if should_ignore_file(file_path, self.auto_fix_exclude):
                    should_auto_fix = False
                    safe_print(f"[Orchestrator] Auto-fix excluded for {Path(file_path).name}")

            task = {
                'id': f"task_{uuid4().hex[:8]}",
                'type': 'file_change',
                'file_path': file_path,
                'description': f"Process changes in {Path(file_path).name}",
                'created_at': timestamp,
                'status': 'pending',
                'retry_count': 0,
                'auto_fix': should_auto_fix
            }

            # Add to pending queue
            def add_to_pending(state):
                if 'queues' not in state:
                    state['queues'] = {
                        'pending': [],
                        'in_progress': [],
                        'completed': [],
                        'failed': []
                    }

                state['queues']['pending'].append(task)

                # Log to conversation history
                if 'conversation_history' not in state:
                    state['conversation_history'] = []

                state['conversation_history'].append({
                    'timestamp': timestamp,
                    'type': 'task_created',
                    'task_id': task['id'],
                    'file_path': file_path,
                    'auto_fix': should_auto_fix
                })

                return state

            self.state_manager.update(add_to_pending)

            fix_status = "with auto-fix" if should_auto_fix else "without auto-fix"
            safe_print(f"[Orchestrator] Created task {task['id']} for {Path(file_path).name} ({fix_status})")

    def _event_loop(self) -> None:
        """
        Main event loop that processes tasks from pending queue.

        Runs continuously until shutdown is requested.
        """
        safe_print("[Orchestrator] Event loop started")

        while not self._shutdown_requested:
            try:
                # Get next pending task
                task = self._get_next_pending_task()

                if task:
                    # Process the task
                    self._process_task(task)
                else:
                    # No tasks, sleep briefly
                    time.sleep(1)

            except Exception as e:
                safe_print(f"[Orchestrator] Error in event loop: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(5)  # Back off on error

        safe_print("[Orchestrator] Event loop stopped")

    def _get_next_pending_task(self) -> Optional[Dict]:
        """
        Get next task from pending queue.

        Returns:
            Task dictionary or None if queue is empty
        """
        def get_and_move(state):
            queues = state.get('queues', {})
            pending = queues.get('pending', [])

            if not pending:
                return state, None

            # Get first task
            task = pending.pop(0)

            # Move to in_progress
            task['status'] = 'in_progress'
            task['started_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            in_progress = queues.get('in_progress', [])
            in_progress.append(task)

            queues['pending'] = pending
            queues['in_progress'] = in_progress
            state['queues'] = queues

            return state, task

        # Use a list to capture the task from the closure
        result = [None]

        def update_wrapper(state):
            updated_state, task = get_and_move(state)
            result[0] = task
            return updated_state

        self.state_manager.update(update_wrapper)

        return result[0]

    def _process_task(self, task: Dict) -> None:
        """
        Process a single task through the full pipeline.

        Args:
            task: Task dictionary to process
        """
        task_id = task['id']
        file_path = task['file_path']

        safe_print(f"\n[Orchestrator] Processing task {task_id}")
        safe_print(f"[Orchestrator] File: {file_path}")

        self.stats['tasks_processed'] += 1

        try:
            # Check if this task should be auto-fixed
            should_auto_fix = task.get('auto_fix', self.auto_fix_enabled)

            # Step 1: Get strategy from interactive Claude
            if should_auto_fix:
                safe_print("[Orchestrator] Step 1: Getting fix strategy from Interactive Claude...")
                plan = self._get_interactive_plan(task)

                # Step 2: Execute fix with headless Claude
                safe_print("[Orchestrator] Step 2: Executing fix with Headless Claude...")
                fix_result = self._execute_headless_fix(plan, task)

                # Step 3: Verify fix with tests
                safe_print("[Orchestrator] Step 3: Verifying fix...")
                if fix_result.success:
                    verified = self._verify_fix(task)

                    if verified:
                        # Success!
                        safe_print(f"[Orchestrator] [OK] Task {task_id} completed successfully")
                        self._mark_task_completed(task)
                        self.stats['tasks_succeeded'] += 1
                    else:
                        # Tests failed after fix
                        safe_print(f"[Orchestrator] [X] Fix verification failed for {task_id}")
                        self._handle_fix_failure(task, fix_result)
                else:
                    # Fix failed
                    safe_print(f"[Orchestrator] [X] Fix failed for {task_id}")
                    self._handle_fix_failure(task, fix_result)
            else:
                # Auto-fix disabled for this task, just log and complete
                safe_print("[Orchestrator] Auto-fix disabled for this task, marking as completed")
                self._mark_task_completed(task)
                self.stats['tasks_succeeded'] += 1

        except Exception as e:
            safe_print(f"[Orchestrator] [X] Exception processing task {task_id}: {e}")
            import traceback
            traceback.print_exc()

            # Mark as failed
            self._mark_task_failed(task, str(e))
            self.stats['tasks_failed'] += 1

    def _get_interactive_plan(self, task: Dict) -> Dict:
        """
        Ask interactive Claude for high-level fix strategy.

        Args:
            task: Task dictionary

        Returns:
            Plan dictionary with strategy and guidance
        """
        file_path = task['file_path']

        # Build prompt for interactive Claude
        prompt = f"""A file has been modified and needs review:

File: {file_path}
Task: {task.get('description', 'Review and validate changes')}

Please provide:
1. High-level strategy for validating these changes
2. What tests should be run
3. Any potential issues to watch for
4. Guidance for the Headless instance if fixes are needed

Keep it concise and actionable."""

        try:
            response = self.claude_interactive.send_message(prompt)

            return {
                'strategy': response,
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'task_id': task['id']
            }

        except Exception as e:
            safe_print(f"[Orchestrator] Warning: Interactive Claude error: {e}")
            # Return basic fallback plan
            return {
                'strategy': f"Run tests for {file_path} and fix any failures",
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'task_id': task['id'],
                'error': str(e)
            }

    def _execute_headless_fix(self, plan: Dict, task: Dict) -> 'FixResult':
        """
        Execute fix using headless Claude with retry logic.

        Args:
            plan: Plan from interactive Claude
            task: Task dictionary

        Returns:
            FixResult from AutoFixer
        """
        # Enhance task with plan guidance
        enhanced_task = {
            **task,
            'plan': plan.get('strategy', ''),
            'test_path': self._determine_test_path(task)
        }

        # Use AutoFixer for retry logic
        return self.auto_fixer.fix_with_retry(enhanced_task)

    def _verify_fix(self, task: Dict) -> bool:
        """
        Run tests to verify fix was successful.

        Args:
            task: Task dictionary

        Returns:
            True if tests pass, False otherwise
        """
        test_path = self._determine_test_path(task)

        safe_print(f"[Orchestrator] Running tests: {test_path or 'all tests'}")

        test_result = self.test_runner.run_tests(test_path=test_path)

        # Log test result
        def log_test_result(state):
            if 'test_results' not in state:
                state['test_results'] = []

            state['test_results'].append({
                'task_id': task['id'],
                'timestamp': test_result['timestamp'],
                'passed': test_result['passed'],
                'duration': test_result['duration'],
                'test_path': test_path
            })

            # Limit history
            if len(state['test_results']) > 100:
                state['test_results'] = state['test_results'][-100:]

            return state

        self.state_manager.update(log_test_result)

        return test_result['passed']

    def _handle_fix_failure(self, task: Dict, fix_result) -> None:
        """
        Handle fix failure by checking escalation thresholds.

        Args:
            task: Task dictionary
            fix_result: FixResult from AutoFixer
        """
        task_id = task['id']

        # Get fix attempt history
        state = self.state_manager.read()
        fix_attempts = state.get('fix_attempts', {}).get(task_id, [])

        # Check if we should escalate
        if len(fix_attempts) >= self.max_retries:
            safe_print(f"[Orchestrator] Max retries reached, escalating {task_id}")

            escalation_result = self.error_escalator.escalate(task, fix_attempts)

            safe_print(f"[Orchestrator] Escalation: Level {escalation_result.level}, "
                  f"Action: {escalation_result.action_taken}")

            self.stats['tasks_escalated'] += 1

        # Mark task as failed
        self._mark_task_failed(task, fix_result.failure_reason or "Unknown failure")

    def _mark_task_completed(self, task: Dict) -> None:
        """
        Move task to completed queue.

        Args:
            task: Task dictionary
        """
        def move_to_completed(state):
            queues = state.get('queues', {})
            in_progress = queues.get('in_progress', [])
            completed = queues.get('completed', [])

            # Remove from in_progress
            in_progress = [t for t in in_progress if t['id'] != task['id']]

            # Add to completed
            task['status'] = 'completed'
            task['completed_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            completed.append(task)

            # Limit completed history
            if len(completed) > 50:
                completed = completed[-50:]

            queues['in_progress'] = in_progress
            queues['completed'] = completed
            state['queues'] = queues

            # Log to conversation history
            if 'conversation_history' not in state:
                state['conversation_history'] = []

            state['conversation_history'].append({
                'timestamp': task['completed_at'],
                'type': 'task_completed',
                'task_id': task['id'],
                'file_path': task.get('file_path')
            })

            return state

        self.state_manager.update(move_to_completed)

    def _mark_task_failed(self, task: Dict, reason: str) -> None:
        """
        Move task to failed queue.

        Args:
            task: Task dictionary
            reason: Failure reason
        """
        def move_to_failed(state):
            queues = state.get('queues', {})
            in_progress = queues.get('in_progress', [])
            failed = queues.get('failed', [])

            # Remove from in_progress
            in_progress = [t for t in in_progress if t['id'] != task['id']]

            # Add to failed
            task['status'] = 'failed'
            task['failed_at'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            task['failure_reason'] = reason
            failed.append(task)

            # Limit failed history
            if len(failed) > 50:
                failed = failed[-50:]

            queues['in_progress'] = in_progress
            queues['failed'] = failed
            state['queues'] = queues

            # Log to conversation history
            if 'conversation_history' not in state:
                state['conversation_history'] = []

            state['conversation_history'].append({
                'timestamp': task['failed_at'],
                'type': 'task_failed',
                'task_id': task['id'],
                'file_path': task.get('file_path'),
                'reason': reason
            })

            return state

        self.state_manager.update(move_to_failed)
        self.stats['tasks_failed'] += 1

    def _determine_test_path(self, task: Dict) -> Optional[str]:
        """
        Determine test path for a given file.

        Args:
            task: Task dictionary

        Returns:
            Test file path or None for all tests
        """
        file_path = task.get('file_path', '')

        # If it's already a test file, return it
        if '.test.' in file_path or '.spec.' in file_path:
            return file_path

        # Try to find corresponding test file
        path = Path(file_path)

        # Common patterns: foo.ts -> foo.test.ts
        test_patterns = [
            path.parent / f"{path.stem}.test{path.suffix}",
            path.parent / f"{path.stem}.spec{path.suffix}",
        ]

        for test_path in test_patterns:
            if test_path.exists():
                return str(test_path)

        # Return None to run all tests
        return None

    def _update_heartbeat(self) -> None:
        """Update orchestrator heartbeat in state."""
        def update(state):
            if 'processes' not in state:
                state['processes'] = {}

            if 'orchestrator' not in state['processes']:
                state['processes']['orchestrator'] = {}

            state['processes']['orchestrator']['last_heartbeat'] = \
                datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            return state

        try:
            self.state_manager.update(update)
        except Exception as e:
            safe_print(f"[Orchestrator] Warning: Heartbeat update failed: {e}")

    def _heartbeat_loop(self) -> None:
        """Heartbeat loop running in background thread."""
        safe_print("[Orchestrator] Heartbeat loop started")

        while not self._shutdown_requested:
            self._update_heartbeat()
            time.sleep(self.heartbeat_interval)

        safe_print("[Orchestrator] Heartbeat loop stopped")

    def _health_check(self) -> None:
        """Perform health check on system components."""
        safe_print("\n[Orchestrator] Running health check...")

        checks = {
            'state_manager': False,
            'file_watcher': False,
            'test_runner': False,
            'claude_instances': False
        }

        # Check state manager
        try:
            state = self.state_manager.read()
            checks['state_manager'] = 'queues' in state
        except Exception as e:
            safe_print(f"[Orchestrator] [X] State manager check failed: {e}")

        # Check file watcher
        try:
            if self.file_watcher:
                checks['file_watcher'] = self.file_watcher.is_running()
        except Exception as e:
            safe_print(f"[Orchestrator] [X] File watcher check failed: {e}")

        # Check test runner
        try:
            checks['test_runner'] = (self.project_root / 'package.json').exists()
        except Exception as e:
            safe_print(f"[Orchestrator] [X] Test runner check failed: {e}")

        # Check Claude instances
        try:
            checks['claude_instances'] = (
                self.claude_interactive is not None and
                self.claude_headless is not None
            )
        except Exception as e:
            safe_print(f"[Orchestrator] [X] Claude instances check failed: {e}")

        # Print results
        all_healthy = all(checks.values())
        status = "[OK] HEALTHY" if all_healthy else "[X] DEGRADED"

        safe_print(f"[Orchestrator] Health check: {status}")
        for component, healthy in checks.items():
            symbol = "[OK]" if healthy else "[X]"
            safe_print(f"[Orchestrator]   {symbol} {component}")

    def _health_check_loop(self) -> None:
        """Health check loop running in background thread."""
        safe_print("[Orchestrator] Health check loop started")

        while not self._shutdown_requested:
            time.sleep(self.health_check_interval)
            if not self._shutdown_requested:
                self._health_check()

        safe_print("[Orchestrator] Health check loop stopped")

    def _update_orchestrator_status(self, status: str) -> None:
        """
        Update orchestrator status in state.

        Args:
            status: Status string ('running', 'stopped', etc.)
        """
        def update(state):
            if 'processes' not in state:
                state['processes'] = {}

            if 'orchestrator' not in state['processes']:
                state['processes']['orchestrator'] = {}

            state['processes']['orchestrator']['status'] = status
            state['processes']['orchestrator']['pid'] = os.getpid()
            state['processes']['orchestrator']['last_heartbeat'] = \
                datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            return state

        self.state_manager.update(update)

    def _signal_handler(self, signum, frame) -> None:
        """
        Handle shutdown signals gracefully.

        Args:
            signum: Signal number
            frame: Current stack frame
        """
        signal_name = signal.Signals(signum).name
        safe_print(f"\n[Orchestrator] Received {signal_name}, initiating shutdown...")

        self.stop()
        sys.exit(0)

    def _print_statistics(self) -> None:
        """Print final statistics on shutdown."""
        uptime = None
        if self.stats['uptime_start']:
            uptime = datetime.now(timezone.utc) - self.stats['uptime_start']

        safe_print("\n[Orchestrator] Session Statistics:")
        safe_print(f"  Uptime: {uptime or 'N/A'}")
        safe_print(f"  Tasks processed: {self.stats['tasks_processed']}")
        safe_print(f"  Tasks succeeded: {self.stats['tasks_succeeded']}")
        safe_print(f"  Tasks failed: {self.stats['tasks_failed']}")
        safe_print(f"  Tasks escalated: {self.stats['tasks_escalated']}")

        if self.stats['tasks_processed'] > 0:
            success_rate = (self.stats['tasks_succeeded'] / self.stats['tasks_processed']) * 100
            safe_print(f"  Success rate: {success_rate:.1f}%")


# Main entry point
if __name__ == '__main__':
    safe_print("[DEBUG] Starting main()")
    from dotenv import load_dotenv
    safe_print("[DEBUG] Imported dotenv")

    # Load environment
    env_path = Path(__file__).parent.parent / '.env'
    safe_print(f"[DEBUG] Loading env from: {env_path}")
    load_dotenv(env_path)
    safe_print("[DEBUG] Loaded .env")

    # Build configuration
    safe_print("[DEBUG] Building config")
    config = {
        'ANTHROPIC_API_KEY': os.getenv('ANTHROPIC_API_KEY'),
        'PROJECT_ROOT': os.getenv('PROJECT_ROOT', str(Path.cwd())),
        'STATE_FILE': os.getenv('STATE_FILE', 'automation/state/app_state.json'),
        'LOCK_FILE': os.getenv('LOCK_FILE', 'automation/state/app_state.lock'),
        'MAX_RETRIES': os.getenv('MAX_RETRIES', '5'),
        'AUTO_FIX_ENABLED': os.getenv('AUTO_FIX_ENABLED', 'true'),
        'FILE_WATCH_DEBOUNCE_SECONDS': os.getenv('FILE_WATCH_DEBOUNCE_SECONDS', '5.0'),
        'GITHUB_TOKEN': os.getenv('GITHUB_TOKEN'),
        'WATCH_PATHS': os.getenv('WATCH_PATHS', str(Path.cwd())),
        'WATCH_EXTENSIONS': os.getenv('WATCH_EXTENSIONS', ''),
        'IGNORE_PATTERNS': os.getenv('IGNORE_PATTERNS', ''),
        'BATCH_WINDOW_SECONDS': os.getenv('BATCH_WINDOW_SECONDS', '10.0'),
        'MAX_BATCH_SIZE': os.getenv('MAX_BATCH_SIZE', '10'),
        'AUTO_FIX_FILE_TYPES': os.getenv('AUTO_FIX_FILE_TYPES', ''),
        'AUTO_FIX_EXCLUDE': os.getenv('AUTO_FIX_EXCLUDE', '')
    }

    # Validate required config
    if not config['ANTHROPIC_API_KEY']:
        safe_print("Error: ANTHROPIC_API_KEY not set in environment")
        sys.exit(1)

    # Create and start orchestrator
    safe_print("=" * 60)
    safe_print("Dual Claude Code Orchestration System")
    safe_print("Justice Companion Automation Framework")
    safe_print("=" * 60)

    orchestrator = Orchestrator(config)

    try:
        orchestrator.start()

        # Keep main thread alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        safe_print("\n[Main] Keyboard interrupt received")
        orchestrator.stop()
    except Exception as e:
        safe_print(f"\n[Main] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        orchestrator.stop()
        sys.exit(1)
