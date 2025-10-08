#!/usr/bin/env python3
"""
End-to-End Integration Test for Dual Claude Orchestration System
Justice Companion Automation Framework

Tests the complete flow from file change detection to automated fix.
"""

import os
import sys
import time
import pytest
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from orchestrator import Orchestrator
from auto_fixer import FixResult


class TestEndToEndIntegration:
    """End-to-end integration tests for the complete system."""

    @pytest.fixture
    def test_project(self, tmp_path):
        """Create a test project with necessary files."""
        # Create package.json
        (tmp_path / 'package.json').write_text('''{
  "name": "test-project",
  "scripts": {
    "test": "echo \\"Tests passed\\""
  }
}''')

        # Create a source file
        source_file = tmp_path / 'calculator.py'
        source_file.write_text('''def add(a, b):
    return a + b

def subtract(a, b):
    return a - b
''')

        # Create a test file
        test_file = tmp_path / 'calculator.test.py'
        test_file.write_text('''import calculator

def test_add():
    assert calculator.add(2, 3) == 5

def test_subtract():
    assert calculator.subtract(5, 3) == 2
''')

        return tmp_path

    @pytest.fixture
    def orchestrator(self, test_project):
        """Create orchestrator for integration testing."""
        config = {
            'ANTHROPIC_API_KEY': 'test-key-12345',
            'PROJECT_ROOT': str(test_project),
            'STATE_FILE': str(test_project / 'state.json'),
            'LOCK_FILE': str(test_project / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'true',
            'FILE_WATCH_DEBOUNCE_SECONDS': '0.5',
            'WATCH_PATHS': [str(test_project)]
        }

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            # Cleanup
            if orch._running:
                orch.stop()

    def test_complete_workflow_file_to_fix(self, orchestrator, test_project):
        """
        Test complete workflow: file change --> detection --> fix --> verification.

        Scenario:
        1. File is changed (simulated)
        2. Orchestrator detects change
        3. Interactive Claude plans fix
        4. Headless Claude executes fix
        5. Tests run
        6. Task marked complete
        """
        # Mock Claude instances
        orchestrator.claude_interactive.send_message = Mock(return_value="""
Here's the strategy:
1. Run the test file to identify failures
2. If tests fail, check syntax errors
3. Fix any import issues
4. Verify tests pass after fix
""")

        orchestrator.claude_headless.send_message = Mock(return_value="""
I've fixed the issue by updating the imports.
The tests should now pass.
""")

        # Mock test runner to simulate success
        orchestrator.test_runner.run_tests = Mock(return_value={
            'passed': True,
            'returncode': 0,
            'stdout': 'All tests passed',
            'stderr': '',
            'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
            'duration': 1.2,
            'test_path': None
        })

        # Mock AutoFixer to return success
        orchestrator.auto_fixer.fix_with_retry = Mock(return_value=FixResult(
            success=True,
            attempts=1,
            final_test_result={'passed': True},
            failure_reason=None,
            total_duration=2.5
        ))

        # Step 1: Simulate file change event
        print("\n[Test] Step 1: Simulating file change...")
        event_data = {
            'type': 'file_change',
            'files': [str(test_project / 'calculator.py')],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Verify task was created
        state = orchestrator.state_manager.read()
        assert len(state['queues']['pending']) == 1
        task = state['queues']['pending'][0]
        print(f"[Test] [OK] Task created: {task['id']}")

        # Step 2: Process the task
        print("[Test] Step 2: Processing task...")
        orchestrator._process_task(task)

        # Step 3: Verify task completed
        print("[Test] Step 3: Verifying completion...")
        state = orchestrator.state_manager.read()

        assert len(state['queues']['completed']) == 1
        completed_task = state['queues']['completed'][0]
        assert completed_task['id'] == task['id']
        assert completed_task['status'] == 'completed'
        print(f"[Test] [OK] Task completed: {completed_task['id']}")

        # Verify statistics
        assert orchestrator.stats['tasks_processed'] == 1
        assert orchestrator.stats['tasks_succeeded'] == 1
        assert orchestrator.stats['tasks_failed'] == 0
        print("[Test] [OK] Statistics tracked correctly")

        # Verify Claude instances were called
        orchestrator.claude_interactive.send_message.assert_called_once()
        orchestrator.auto_fixer.fix_with_retry.assert_called_once()
        print("[Test] [OK] Claude instances called correctly")

    def test_workflow_with_fix_failure(self, orchestrator, test_project):
        """
        Test workflow when fix fails and requires escalation.

        Scenario:
        1. File change detected
        2. Fix attempted but fails
        3. Retry logic kicks in
        4. After max retries, escalate
        5. Task marked as failed
        """
        # Mock Claude instances
        orchestrator.claude_interactive.send_message = Mock(return_value="""
Fix strategy:
1. Check syntax errors
2. Fix type mismatches
3. Run tests
""")

        # Mock AutoFixer to return failure
        orchestrator.auto_fixer.fix_with_retry = Mock(return_value=FixResult(
            success=False,
            attempts=3,
            final_test_result={'passed': False, 'stderr': 'Syntax error'},
            failure_reason='Max retries exhausted',
            total_duration=10.0
        ))

        # Mock ErrorEscalator
        from error_escalator import EscalationResult

        orchestrator.error_escalator.escalate = Mock(return_value=EscalationResult(
            level=2,
            action_taken='github_issue_created',
            success=True,
            details='https://github.com/owner/repo/issues/1'
        ))

        # Simulate file change
        event_data = {
            'type': 'file_change',
            'files': [str(test_project / 'calculator.py')],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Get the task
        state = orchestrator.state_manager.read()
        task = state['queues']['pending'][0]

        # Add fix attempt history to trigger escalation
        def add_attempts(state):
            if 'fix_attempts' not in state:
                state['fix_attempts'] = {}

            state['fix_attempts'][task['id']] = [
                {'attempt_num': i, 'success': False}
                for i in range(1, 4)
            ]
            return state

        orchestrator.state_manager.update(add_attempts)

        # Process the task
        orchestrator._process_task(task)

        # Verify task failed
        state = orchestrator.state_manager.read()
        assert len(state['queues']['failed']) == 1
        failed_task = state['queues']['failed'][0]
        assert failed_task['id'] == task['id']
        assert failed_task['status'] == 'failed'

        # Verify escalation was called
        orchestrator.error_escalator.escalate.assert_called_once()

        # Verify statistics
        assert orchestrator.stats['tasks_failed'] == 1
        assert orchestrator.stats['tasks_escalated'] == 1

    def test_workflow_auto_fix_disabled(self, orchestrator, test_project):
        """
        Test workflow when auto-fix is disabled.

        Scenario:
        1. File change detected
        2. Task created
        3. Auto-fix skipped (disabled)
        4. Task marked complete without processing
        """
        # Disable auto-fix
        orchestrator.auto_fix_enabled = False

        # Simulate file change
        event_data = {
            'type': 'file_change',
            'files': [str(test_project / 'calculator.py')],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Get the task
        state = orchestrator.state_manager.read()
        task = state['queues']['pending'][0]

        # Process the task
        orchestrator._process_task(task)

        # Verify task completed without calling Claude
        state = orchestrator.state_manager.read()
        assert len(state['queues']['completed']) == 1

        # Verify Claude was NOT called
        orchestrator.claude_interactive.send_message.assert_not_called()

    def test_multiple_files_processed_sequentially(self, orchestrator, test_project):
        """
        Test processing multiple file changes sequentially.

        Scenario:
        1. Multiple files changed
        2. Tasks created for each
        3. Orchestrator processes them one by one
        4. All tasks complete successfully
        """
        # Mock successful processing
        orchestrator.claude_interactive.send_message = Mock(return_value="Fix strategy...")
        orchestrator.auto_fixer.fix_with_retry = Mock(return_value=FixResult(
            success=True,
            attempts=1,
            final_test_result={'passed': True},
            failure_reason=None,
            total_duration=1.0
        ))
        orchestrator.test_runner.run_tests = Mock(return_value={
            'passed': True,
            'returncode': 0,
            'stdout': 'Tests passed',
            'stderr': '',
            'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
            'duration': 1.0,
            'test_path': None
        })

        # Simulate multiple file changes
        files = [
            str(test_project / 'calculator.py'),
            str(test_project / 'calculator.test.py')
        ]

        event_data = {
            'type': 'file_change',
            'files': files,
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Verify tasks created
        state = orchestrator.state_manager.read()
        assert len(state['queues']['pending']) == 2

        # Process all tasks
        while True:
            task = orchestrator._get_next_pending_task()
            if not task:
                break
            orchestrator._process_task(task)

        # Verify all completed
        state = orchestrator.state_manager.read()
        assert len(state['queues']['completed']) == 2
        assert orchestrator.stats['tasks_processed'] == 2
        assert orchestrator.stats['tasks_succeeded'] == 2

    def test_conversation_history_logged(self, orchestrator, test_project):
        """
        Test that conversation history is properly logged.

        Scenario:
        1. File change creates task
        2. Task is processed
        3. All events logged to conversation_history
        """
        # Mock successful processing
        orchestrator.auto_fix_enabled = False

        # Simulate file change
        event_data = {
            'type': 'file_change',
            'files': [str(test_project / 'calculator.py')],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Get and process task
        task = orchestrator._get_next_pending_task()
        orchestrator._process_task(task)

        # Verify conversation history
        state = orchestrator.state_manager.read()
        history = state.get('conversation_history', [])

        assert len(history) >= 2  # At least task_created and task_completed
        assert any(h['type'] == 'task_created' for h in history)
        assert any(h['type'] == 'task_completed' for h in history)

    def test_state_persistence_across_restart(self, orchestrator, test_project):
        """
        Test that state persists across orchestrator restarts.

        Scenario:
        1. Create tasks
        2. Stop orchestrator
        3. Start new orchestrator
        4. Verify tasks still in queue
        """
        # Add tasks to queue
        event_data = {
            'type': 'file_change',
            'files': [str(test_project / 'calculator.py')],
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

        orchestrator.process_file_change(event_data)

        # Get initial state
        state1 = orchestrator.state_manager.read()
        task_count_before = len(state1['queues']['pending'])

        # Create new orchestrator (simulating restart)
        config = {
            'ANTHROPIC_API_KEY': 'test-key-12345',
            'PROJECT_ROOT': str(test_project),
            'STATE_FILE': str(test_project / 'state.json'),
            'LOCK_FILE': str(test_project / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'true',
            'WATCH_PATHS': [str(test_project)]
        }

        with patch('orchestrator.ClaudeInstance'):
            new_orchestrator = Orchestrator(config)

            # Get state from new orchestrator
            state2 = new_orchestrator.state_manager.read()
            task_count_after = len(state2['queues']['pending'])

            assert task_count_after == task_count_before
            assert state2['queues']['pending'][0]['id'] == state1['queues']['pending'][0]['id']


class TestOrchestratorWithRealFileWatcher:
    """Integration test with real FileWatcher (mocked file system events)."""

    @pytest.fixture
    def test_project(self, tmp_path):
        """Create test project."""
        (tmp_path / 'package.json').write_text('{}')
        return tmp_path

    def test_file_watcher_integration(self, test_project):
        """
        Test FileWatcher integration with Orchestrator.

        Note: This test uses mocked FileWatcher to avoid actual file system watching.
        """
        config = {
            'ANTHROPIC_API_KEY': 'test-key-12345',
            'PROJECT_ROOT': str(test_project),
            'STATE_FILE': str(test_project / 'state.json'),
            'LOCK_FILE': str(test_project / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'false',
            'FILE_WATCH_DEBOUNCE_SECONDS': '0.5',
            'WATCH_PATHS': [str(test_project)]
        }

        with patch('orchestrator.ClaudeInstance'):
            with patch('orchestrator.FileWatcher') as MockFileWatcher:
                mock_watcher = Mock()
                MockFileWatcher.return_value = mock_watcher

                orchestrator = Orchestrator(config)
                orchestrator.start()

                # Verify FileWatcher was created with correct params
                MockFileWatcher.assert_called_once()
                call_args = MockFileWatcher.call_args

                assert call_args.kwargs['paths_to_watch'] == [str(test_project)]
                assert call_args.kwargs['debounce_seconds'] == 0.5
                assert call_args.kwargs['callback'] == orchestrator.process_file_change

                # Verify FileWatcher.start() was called
                mock_watcher.start.assert_called_once()

                orchestrator.stop()

                # Verify FileWatcher.stop() was called
                mock_watcher.stop.assert_called_once()


class TestErrorRecovery:
    """Test error recovery scenarios."""

    @pytest.fixture
    def orchestrator(self, tmp_path):
        """Create orchestrator for testing."""
        (tmp_path / 'package.json').write_text('{}')

        config = {
            'ANTHROPIC_API_KEY': 'test-key-12345',
            'PROJECT_ROOT': str(tmp_path),
            'STATE_FILE': str(tmp_path / 'state.json'),
            'LOCK_FILE': str(tmp_path / 'state.lock'),
            'MAX_RETRIES': '3',
            'AUTO_FIX_ENABLED': 'true',
            'WATCH_PATHS': [str(tmp_path)]
        }

        with patch('orchestrator.ClaudeInstance'):
            orch = Orchestrator(config)
            yield orch

            if orch._running:
                orch.stop()

    def test_recovery_from_claude_api_error(self, orchestrator):
        """Test recovery when Claude API fails."""
        # Mock Claude to raise exception
        orchestrator.claude_interactive.send_message = Mock(
            side_effect=Exception("API Error")
        )

        # Create task
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'description': 'Test task',
            'status': 'in_progress'
        }

        # Get plan (should handle error gracefully)
        plan = orchestrator._get_interactive_plan(task)

        # Should return fallback plan with error
        assert 'error' in plan
        assert 'strategy' in plan

    def test_recovery_from_test_runner_error(self, orchestrator):
        """Test recovery when test runner fails."""
        # Mock test runner to raise exception
        orchestrator.test_runner.run_tests = Mock(
            side_effect=Exception("Test runner error")
        )

        # Create task
        task = {
            'id': 'test_task_1',
            'file_path': '/test.py',
            'description': 'Test task'
        }

        # Process task (should not crash)
        orchestrator._process_task(task)

        # Verify task marked as failed
        state = orchestrator.state_manager.read()
        assert orchestrator.stats['tasks_failed'] == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
