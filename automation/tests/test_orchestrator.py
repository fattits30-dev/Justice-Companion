#!/usr/bin/env python3
"""
Test Suite for Orchestrator
Justice Companion Automation Framework
"""

import os
import sys
import time
import pytest
import threading
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock, call
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from orchestrator import Orchestrator
from auto_fixer import FixResult


class TestOrchestratorInitialization:
    """Test orchestrator initialization."""

    def test_init_with_valid_config(self, tmp_path):
        """Test initialization with valid configuration."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '5',
            'AUTO_FIX_ENABLED': 'true',
            'WATCH_PATHS': [str(tmp_path)]
        }

        # Create package.json for test runner validation
        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orchestrator = Orchestrator(config)

            assert orchestrator.project_root == tmp_path
            assert orchestrator.max_retries == 5
            assert orchestrator.auto_fix_enabled is True

    def test_init_missing_api_key(self, tmp_path):
        """Test initialization fails without API key."""
        config = {
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock')
        }

        # Create package.json so test runner validation passes
        (tmp_path / 'package.json').write_text('{}')

        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            Orchestrator(config)

    def test_init_creates_components(self, tmp_path):
        """Test that all components are created."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orchestrator = Orchestrator(config)

            assert orchestrator.state_manager is not None
            assert orchestrator.test_runner is not None
            assert orchestrator.auto_fixer is not None
            assert orchestrator.error_escalator is not None


class TestOrchestratorLifecycle:
    """Test orchestrator start/stop lifecycle."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',  # Disable for faster tests
            'FILE_WATCH_DEBOUNCE_SECONDS': '0.5',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            # Cleanup
            if orch._running:
                orch.stop()

    def test_start_initializes_state(self, orchestrator):
        """Test that start() updates state correctly."""
        with patch.object(orchestrator, 'file_watcher'):
            orchestrator.file_watcher = Mock()
            orchestrator.file_watcher.start = Mock()

            orchestrator.start()

            # Check state was updated
            state = orchestrator.state_manager.read()
            assert state['processes']['orchestrator']['status'] == 'running'
            assert state['processes']['orchestrator']['pid'] == os.getpid()

            orchestrator.stop()

    def test_start_raises_if_already_running(self, orchestrator):
        """Test that start() raises error if already running."""
        with patch.object(orchestrator, 'file_watcher'):
            orchestrator.file_watcher = Mock()
            orchestrator.file_watcher.start = Mock()
            orchestrator.file_watcher.stop = Mock()

            orchestrator.start()

            with pytest.raises(RuntimeError, match="already running"):
                orchestrator.start()

            orchestrator.stop()

    def test_stop_updates_state(self, orchestrator):
        """Test that stop() updates state correctly."""
        with patch.object(orchestrator, 'file_watcher'):
            orchestrator.file_watcher = Mock()
            orchestrator.file_watcher.start = Mock()
            orchestrator.file_watcher.stop = Mock()

            orchestrator.start()
            time.sleep(0.5)  # Let threads start
            orchestrator.stop()

            state = orchestrator.state_manager.read()
            assert state['processes']['orchestrator']['status'] == 'stopped'

    def test_stop_when_not_running(self, orchestrator):
        """Test that stop() handles not running state."""
        # Should not raise
        orchestrator.stop()

    def test_heartbeat_updates(self, orchestrator):
        """Test that heartbeat updates periodically."""
        with patch.object(orchestrator, 'file_watcher'):
            orchestrator.file_watcher = Mock()
            orchestrator.file_watcher.start = Mock()
            orchestrator.file_watcher.stop = Mock()

            # Set short heartbeat interval for testing
            orchestrator.heartbeat_interval = 0.5

            orchestrator.start()

            # Wait for at least 2 heartbeats
            time.sleep(1.5)

            state = orchestrator.state_manager.read()
            last_heartbeat = state['processes']['orchestrator'].get('last_heartbeat')

            assert last_heartbeat is not None

            orchestrator.stop()


class TestTaskProcessing:
    """Test task queue and processing."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            if orch._running:
                orch.stop()

    def test_process_file_change_creates_task(self, orchestrator):
        """Test that file change creates a task."""
        event_data = {
            'type': 'file_change',
            'files': ['/path/to/test.py'],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        state = orchestrator.state_manager.read()
        pending = state['queues']['pending']

        assert len(pending) == 1
        assert pending[0]['file_path'] == '/path/to/test.py'
        assert pending[0]['status'] == 'pending'

    def test_process_file_change_multiple_files(self, orchestrator):
        """Test processing multiple files in one event."""
        event_data = {
            'type': 'file_change',
            'files': ['/path/to/file1.py', '/path/to/file2.py'],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        state = orchestrator.state_manager.read()
        pending = state['queues']['pending']

        assert len(pending) == 2

    def test_get_next_pending_task(self, orchestrator):
        """Test getting next task from pending queue."""
        # Add a task to pending queue
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        def add_task(state):
            state['queues']['pending'].append(task)
            return state

        orchestrator.state_manager.update(add_task)

        # Get next task
        next_task = orchestrator._get_next_pending_task()

        assert next_task is not None
        assert next_task['id'] == 'test_task_1'
        assert next_task['status'] == 'in_progress'

        # Verify it moved to in_progress
        state = orchestrator.state_manager.read()
        assert len(state['queues']['pending']) == 0
        assert len(state['queues']['in_progress']) == 1

    def test_mark_task_completed(self, orchestrator):
        """Test marking task as completed."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'status': 'in_progress',
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        # Add to in_progress
        def add_task(state):
            state['queues']['in_progress'].append(task)
            return state

        orchestrator.state_manager.update(add_task)

        # Mark completed
        orchestrator._mark_task_completed(task)

        state = orchestrator.state_manager.read()
        assert len(state['queues']['in_progress']) == 0
        assert len(state['queues']['completed']) == 1
        assert state['queues']['completed'][0]['status'] == 'completed'

    def test_mark_task_failed(self, orchestrator):
        """Test marking task as failed."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'status': 'in_progress',
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        # Add to in_progress
        def add_task(state):
            state['queues']['in_progress'].append(task)
            return state

        orchestrator.state_manager.update(add_task)

        # Mark failed
        orchestrator._mark_task_failed(task, "Test failure")

        state = orchestrator.state_manager.read()
        assert len(state['queues']['in_progress']) == 0
        assert len(state['queues']['failed']) == 1
        assert state['queues']['failed'][0]['status'] == 'failed'
        assert state['queues']['failed'][0]['failure_reason'] == "Test failure"


class TestIntegrationWithComponents:
    """Test integration with FileWatcher, AutoFixer, and ErrorEscalator."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'true',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            if orch._running:
                orch.stop()

    def test_integration_with_auto_fixer(self, orchestrator):
        """Test integration with AutoFixer."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'description': 'Fix test file',
            'test_path': '/test.test.py'
        }

        plan = {
            'strategy': 'Run tests and fix failures',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        # Mock AutoFixer
        mock_result = FixResult(
            success=True,
            attempts=1,
            final_test_result={'passed': True},
            failure_reason=None,
            total_duration=1.5
        )

        orchestrator.auto_fixer.fix_with_retry = Mock(return_value=mock_result)

        # Execute fix
        result = orchestrator._execute_headless_fix(plan, task)

        assert result.success is True
        orchestrator.auto_fixer.fix_with_retry.assert_called_once()

    def test_integration_with_error_escalator(self, orchestrator):
        """Test integration with ErrorEscalator."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'description': 'Fix test file'
        }

        # Create fake failure history in state
        def add_failures(state):
            if 'fix_attempts' not in state:
                state['fix_attempts'] = {}

            state['fix_attempts']['test_task_1'] = [
                {'attempt_num': i, 'success': False}
                for i in range(1, 6)
            ]
            return state

        orchestrator.state_manager.update(add_failures)

        # Mock ErrorEscalator
        from error_escalator import EscalationResult

        mock_escalation = EscalationResult(
            level=2,
            action_taken='github_issue_created',
            success=True,
            details='https://github.com/owner/repo/issues/1'
        )

        orchestrator.error_escalator.escalate = Mock(return_value=mock_escalation)

        # Mock fix result
        fix_result = FixResult(
            success=False,
            attempts=5,
            final_test_result={'passed': False},
            failure_reason='Max retries',
            total_duration=10.0
        )

        # Handle failure
        orchestrator._handle_fix_failure(task, fix_result)

        # Verify escalation was called
        orchestrator.error_escalator.escalate.assert_called_once()

    def test_integration_with_file_watcher(self, orchestrator, tmp_path):
        """Test integration with FileWatcher."""
        with patch('orchestrator.FileWatcher') as MockFileWatcher:
            mock_watcher = Mock()
            MockFileWatcher.return_value = mock_watcher

            orchestrator.start()

            # Verify FileWatcher was created and started
            MockFileWatcher.assert_called_once()
            mock_watcher.start.assert_called_once()

            orchestrator.stop()


class TestHealthChecks:
    """Test health check functionality."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            if orch._running:
                orch.stop()

    def test_health_check_all_healthy(self, orchestrator):
        """Test health check when all components healthy."""
        with patch.object(orchestrator, 'file_watcher'):
            orchestrator.file_watcher = Mock()
            orchestrator.file_watcher.is_running = Mock(return_value=True)

            # Should not raise
            orchestrator._health_check()

    def test_health_check_with_failures(self, orchestrator):
        """Test health check with component failures."""
        # Make state manager fail
        orchestrator.state_manager = None

        # Should not raise, just log warnings
        orchestrator._health_check()


class TestSignalHandling:
    """Test signal handling."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            if orch._running:
                orch.stop()

    def test_signal_handler_triggers_stop(self, orchestrator):
        """Test that signal handler triggers stop."""
        with patch.object(orchestrator, 'stop') as mock_stop:
            with pytest.raises(SystemExit):
                import signal
                orchestrator._signal_handler(signal.SIGTERM, None)

            mock_stop.assert_called_once()


class TestTaskVerification:
    """Test task verification and test path determination."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

    def test_determine_test_path_for_test_file(self, orchestrator):
        """Test determining test path for a test file."""
        task = {'file_path': '/path/to/test.test.ts'}

        test_path = orchestrator._determine_test_path(task)

        assert test_path == '/path/to/test.test.ts'

    def test_determine_test_path_for_source_file(self, orchestrator, tmp_path):
        """Test determining test path for a source file."""
        # Create source and test file
        source_file = tmp_path / 'module.ts'
        test_file = tmp_path / 'module.test.ts'

        source_file.write_text('export const foo = 1;')
        test_file.write_text('test("foo", () => {});')

        task = {'file_path': str(source_file)}

        test_path = orchestrator._determine_test_path(task)

        assert test_path == str(test_file)

    def test_determine_test_path_no_test_found(self, orchestrator, tmp_path):
        """Test determining test path when no test file exists."""
        source_file = tmp_path / 'module.ts'
        source_file.write_text('export const foo = 1;')

        task = {'file_path': str(source_file)}

        test_path = orchestrator._determine_test_path(task)

        assert test_path is None  # Run all tests

    def test_verify_fix_success(self, orchestrator):
        """Test verify_fix when tests pass."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py'
        }

        # Mock test runner
        orchestrator.test_runner.run_tests = Mock(return_value={
            'passed': True,
            'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
            'duration': 1.5,
            'returncode': 0,
            'stdout': '',
            'stderr': ''
        })

        result = orchestrator._verify_fix(task)

        assert result is True

    def test_verify_fix_failure(self, orchestrator):
        """Test verify_fix when tests fail."""
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py'
        }

        # Mock test runner
        orchestrator.test_runner.run_tests = Mock(return_value={
            'passed': False,
            'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
            'duration': 1.5,
            'returncode': 1,
            'stdout': '',
            'stderr': 'Test failed'
        })

        result = orchestrator._verify_fix(task)

        assert result is False


class TestStatistics:
    """Test statistics tracking."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'WATCH_PATHS': [str(tmp_path)]
        }

        (tmp_path / 'package.json').write_text('{}')

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

    def test_statistics_initialization(self, orchestrator):
        """Test that statistics are initialized."""
        assert orchestrator.stats['tasks_processed'] == 0
        assert orchestrator.stats['tasks_succeeded'] == 0
        assert orchestrator.stats['tasks_failed'] == 0
        assert orchestrator.stats['tasks_escalated'] == 0

    def test_statistics_tracking(self, orchestrator):
        """Test that statistics are tracked correctly."""
        # Simulate processing tasks
        orchestrator.stats['tasks_processed'] = 5
        orchestrator.stats['tasks_succeeded'] = 3
        orchestrator.stats['tasks_failed'] = 2

        # Print statistics (should not raise)
        orchestrator._print_statistics()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
