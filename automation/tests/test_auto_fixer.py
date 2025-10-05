#!/usr/bin/env python3
"""
Test Suite for AutoFixer
Justice Companion Automation Framework
"""

import time
import pytest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch, call

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from auto_fixer import AutoFixer, FixResult
from state_manager import StateManager


class TestAutoFixer:
    """Test suite for AutoFixer retry logic and circuit breaker."""

    @pytest.fixture
    def mock_state_manager(self, tmp_path):
        """Create a real StateManager with temp files."""
        state_file = tmp_path / "test_state.json"
        lock_file = tmp_path / "test_state.lock"
        return StateManager(state_file, lock_file)

    @pytest.fixture
    def mock_test_runner(self):
        """Create mock TestRunner."""
        mock = Mock()
        mock.run_tests = Mock(return_value={
            'passed': False,
            'returncode': 1,
            'stdout': 'Test failed',
            'stderr': 'Error: Expected true to be false',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 2.5,
            'test_path': 'test.ts'
        })
        mock.parse_test_failures = Mock(return_value=[
            {'line': 'Error: Expected true to be false', 'type': 'test_failure', 'severity': 'high'}
        ])
        return mock

    @pytest.fixture
    def mock_claude(self):
        """Create mock Claude instance."""
        mock = Mock()
        mock.send_message = Mock(return_value="Fixed code: function test() { return true; }")
        return mock

    @pytest.fixture
    def auto_fixer(self, mock_state_manager, mock_test_runner, mock_claude):
        """Create AutoFixer instance with mocks."""
        fixer = AutoFixer(mock_state_manager, mock_test_runner, mock_claude)
        # Override retry delays for faster testing
        fixer.retry_delays = [0.01, 0.02, 0.04, 0.08, 0.16]
        return fixer

    @pytest.fixture
    def sample_task(self):
        """Create sample task for testing."""
        return {
            'id': 'test_task_123',
            'description': 'Fix failing test',
            'file_path': 'src/test.ts',
            'test_path': 'src/test.ts'
        }

    def test_fix_with_retry_success_first_attempt(
        self,
        auto_fixer,
        sample_task,
        mock_test_runner,
        mock_claude
    ):
        """Test successful fix on first attempt."""
        # Mock test to pass on first attempt
        mock_test_runner.run_tests.return_value = {
            'passed': True,
            'returncode': 0,
            'stdout': 'All tests passed',
            'stderr': '',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 1.2,
            'test_path': 'src/test.ts'
        }

        result = auto_fixer.fix_with_retry(sample_task, max_retries=3)

        assert result.success is True
        assert result.attempts == 1
        assert result.failure_reason is None
        assert mock_claude.send_message.call_count == 1

    def test_fix_with_retry_success_after_retries(
        self,
        auto_fixer,
        sample_task,
        mock_test_runner,
        mock_claude
    ):
        """Test successful fix after multiple retries."""
        # Fail twice, then succeed
        call_count = [0]

        def mock_run_tests(test_path=None):
            call_count[0] += 1
            if call_count[0] < 3:
                return {
                    'passed': False,
                    'returncode': 1,
                    'stdout': '',
                    'stderr': f'Error: Attempt {call_count[0]} failed',
                    'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                    'duration': 1.0,
                    'test_path': test_path
                }
            else:
                return {
                    'passed': True,
                    'returncode': 0,
                    'stdout': 'All tests passed',
                    'stderr': '',
                    'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                    'duration': 1.0,
                    'test_path': test_path
                }

        mock_test_runner.run_tests.side_effect = mock_run_tests

        result = auto_fixer.fix_with_retry(sample_task, max_retries=5)

        assert result.success is True
        assert result.attempts == 3
        assert mock_claude.send_message.call_count == 3

    def test_fix_with_retry_max_retries_exhausted(
        self,
        auto_fixer,
        sample_task,
        mock_test_runner
    ):
        """Test failure when max retries exhausted."""
        # Always fail
        mock_test_runner.run_tests.return_value = {
            'passed': False,
            'returncode': 1,
            'stdout': '',
            'stderr': 'Persistent error',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 1.0,
            'test_path': 'src/test.ts'
        }

        result = auto_fixer.fix_with_retry(sample_task, max_retries=3)

        assert result.success is False
        assert result.attempts == 3
        assert result.failure_reason == "Max retries exhausted"

    def test_exponential_backoff_timing(self, auto_fixer, sample_task, mock_test_runner):
        """Test that exponential backoff delays are applied correctly."""
        # Always fail to test all delays
        mock_test_runner.run_tests.return_value = {
            'passed': False,
            'returncode': 1,
            'stdout': '',
            'stderr': 'Error',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 1.0,
            'test_path': 'src/test.ts'
        }

        start_time = time.time()
        result = auto_fixer.fix_with_retry(sample_task, max_retries=3)
        duration = time.time() - start_time

        # Should have delays: 0.01 + 0.02 = 0.03s minimum
        # Allow some tolerance for test execution time
        assert duration >= 0.03
        assert duration < 2.0  # Should be much less than 2s with our fast delays

    def test_circuit_breaker_activates(
        self,
        auto_fixer,
        mock_test_runner,
        mock_state_manager
    ):
        """Test circuit breaker activates after threshold failures."""
        # Set low threshold for testing
        auto_fixer.circuit_breaker_threshold = 2
        auto_fixer.circuit_breaker_window = 60

        task1 = {
            'id': 'task_cb_1',
            'description': 'Test task 1',
            'file_path': 'src/problem.ts',
            'test_path': 'src/problem.ts'
        }

        task2 = {
            'id': 'task_cb_2',
            'description': 'Test task 2',
            'file_path': 'src/problem.ts',  # Same file
            'test_path': 'src/problem.ts'
        }

        # Always fail
        mock_test_runner.run_tests.return_value = {
            'passed': False,
            'returncode': 1,
            'stdout': '',
            'stderr': 'Error',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 1.0,
            'test_path': 'src/problem.ts'
        }

        # First task - should fail normally
        result1 = auto_fixer.fix_with_retry(task1, max_retries=2)
        assert result1.success is False
        assert result1.attempts == 2

        # Second task - circuit breaker should activate
        result2 = auto_fixer.fix_with_retry(task2, max_retries=2)
        assert result2.success is False
        assert result2.failure_reason == "Circuit breaker active for src/problem.ts"
        assert result2.attempts == 0

    def test_circuit_breaker_respects_time_window(
        self,
        auto_fixer,
        mock_state_manager,
        mock_test_runner
    ):
        """Test circuit breaker respects time window."""
        auto_fixer.circuit_breaker_threshold = 3
        auto_fixer.circuit_breaker_window = 2  # 2 seconds

        task = {
            'id': 'task_window_1',
            'description': 'Test',
            'file_path': 'src/file.ts',
            'test_path': 'src/file.ts'
        }

        # Mock failures outside time window
        old_timestamp = (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat().replace('+00:00', 'Z')

        def update_with_old_failures(state):
            state['fix_attempts'] = {
                'old_task_1': [{
                    'timestamp': old_timestamp,
                    'success': False,
                    'file_path': 'src/file.ts'
                }],
                'old_task_2': [{
                    'timestamp': old_timestamp,
                    'success': False,
                    'file_path': 'src/file.ts'
                }],
                'old_task_3': [{
                    'timestamp': old_timestamp,
                    'success': False,
                    'file_path': 'src/file.ts'
                }]
            }
            return state

        mock_state_manager.update(update_with_old_failures)

        # Circuit breaker should NOT activate (old failures)
        should_retry = auto_fixer._should_retry(task, 1)
        assert should_retry is True

    def test_failure_analysis_detects_patterns(self, auto_fixer):
        """Test failure analysis detects common error patterns."""
        test_result = {
            'passed': False,
            'returncode': 1,
            'stdout': 'Test suite failed',
            'stderr': 'TypeError: Cannot read property "id" of undefined',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 2.0,
            'test_path': 'test.ts'
        }

        analysis = auto_fixer._analyze_failure(test_result)

        assert analysis['passed'] is False
        assert 'type_error' in analysis['detected_patterns']
        assert 'type_error' in analysis['summary']

    def test_fix_attempts_recorded_in_state(
        self,
        auto_fixer,
        sample_task,
        mock_test_runner,
        mock_state_manager
    ):
        """Test that fix attempts are recorded in state."""
        mock_test_runner.run_tests.return_value = {
            'passed': False,
            'returncode': 1,
            'stdout': '',
            'stderr': 'Error',
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'duration': 1.0,
            'test_path': 'src/test.ts'
        }

        auto_fixer.fix_with_retry(sample_task, max_retries=2)

        # Check state
        state = mock_state_manager.read()
        assert 'fix_attempts' in state
        assert sample_task['id'] in state['fix_attempts']
        assert len(state['fix_attempts'][sample_task['id']]) == 2

    def test_retry_delays_exponential(self, auto_fixer):
        """Test that retry delays follow exponential backoff pattern."""
        delays = [auto_fixer._get_retry_delay(i) for i in range(1, 6)]

        # Default delays: [1, 2, 4, 8, 16]
        # But we set them to [0.01, 0.02, 0.04, 0.08, 0.16] in fixture
        assert delays[0] == 0.01
        assert delays[1] == 0.02
        assert delays[2] == 0.04
        assert delays[3] == 0.08
        assert delays[4] == 0.16

    def test_build_fix_prompt_includes_context(self, auto_fixer, sample_task):
        """Test that fix prompt includes task context."""
        prompt = auto_fixer._build_fix_prompt(sample_task, 1)

        assert sample_task['description'] in prompt
        assert sample_task['file_path'] in prompt
        assert 'Attempt: 1' in prompt

    def test_build_fix_prompt_includes_previous_attempt(
        self,
        auto_fixer,
        sample_task,
        mock_state_manager
    ):
        """Test that fix prompt includes previous attempt context."""
        # Add previous attempt to state
        def add_previous_attempt(state):
            state['fix_attempts'] = {
                sample_task['id']: [{
                    'attempt_num': 1,
                    'success': False,
                    'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                    'error_summary': 'Previous error message'
                }]
            }
            return state

        mock_state_manager.update(add_previous_attempt)

        prompt = auto_fixer._build_fix_prompt(sample_task, 2)

        assert 'Previous attempt failed' in prompt
        assert 'Previous error message' in prompt

    def test_get_recent_failures_for_file(self, auto_fixer):
        """Test getting recent failures for a specific file."""
        now = datetime.now(timezone.utc)
        recent = (now - timedelta(seconds=30)).isoformat().replace('+00:00', 'Z')
        old = (now - timedelta(seconds=7200)).isoformat().replace('+00:00', 'Z')

        fix_attempts = {
            'task1': [{
                'timestamp': recent,
                'success': False,
                'file_path': 'src/file.ts'
            }],
            'task2': [{
                'timestamp': old,
                'success': False,
                'file_path': 'src/file.ts'
            }],
            'task3': [{
                'timestamp': recent,
                'success': False,
                'file_path': 'src/other.ts'
            }]
        }

        failures = auto_fixer._get_recent_failures_for_file(
            fix_attempts,
            'src/file.ts',
            3600
        )

        # Should only get recent failure for src/file.ts
        assert len(failures) == 1
        assert failures[0]['timestamp'] == recent


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
