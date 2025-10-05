#!/usr/bin/env python3
"""
Test Suite for ErrorEscalator
Justice Companion Automation Framework
"""

import pytest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch, call

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from error_escalator import ErrorEscalator, EscalationResult
from state_manager import StateManager


class TestErrorEscalator:
    """Test suite for ErrorEscalator multi-level escalation."""

    @pytest.fixture
    def mock_state_manager(self, tmp_path):
        """Create a real StateManager with temp files."""
        state_file = tmp_path / "test_state.json"
        lock_file = tmp_path / "test_state.lock"
        return StateManager(state_file, lock_file)

    @pytest.fixture
    def escalator(self, mock_state_manager):
        """Create ErrorEscalator instance."""
        return ErrorEscalator(mock_state_manager, github_token='test_token_123')

    @pytest.fixture
    def sample_task(self):
        """Create sample task for testing."""
        return {
            'id': 'test_task_456',
            'description': 'Fix type error in CaseService',
            'file_path': 'src/services/CaseService.ts'
        }

    @pytest.fixture
    def sample_failures(self):
        """Create sample failure history."""
        return [
            {
                'attempt_num': i,
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'test_passed': False,
                'test_duration': 2.5,
                'error_summary': f'TypeError: Cannot read property "id" of undefined (attempt {i})'
            }
            for i in range(1, 6)
        ]

    def test_no_escalation_below_threshold(self, escalator, sample_task):
        """Test no escalation when below threshold."""
        failures = [{'attempt_num': 1, 'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}]

        result = escalator.escalate(sample_task, failures)

        assert result.level == 0
        assert result.action_taken == "none"
        assert result.success is True

    def test_level_1_escalation_logs_and_pauses(
        self,
        escalator,
        sample_task,
        mock_state_manager
    ):
        """Test Level 1 escalation logs error and pauses task."""
        # 3 failures = Level 1
        failures = [
            {'attempt_num': i, 'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}
            for i in range(1, 4)
        ]

        result = escalator.escalate(sample_task, failures)

        assert result.level == 1
        assert result.action_taken == "logged_and_paused"
        assert result.success is True
        assert "1 hour" in result.details

        # Check state was updated
        state = mock_state_manager.read()
        assert 'paused_tasks' in state
        assert sample_task['id'] in state['paused_tasks']
        assert 'errors' in state
        assert len(state['errors']) > 0

    @patch('requests.post')
    def test_level_2_escalation_creates_github_issue(
        self,
        mock_post,
        escalator,
        sample_task,
        sample_failures,
        mock_state_manager
    ):
        """Test Level 2 escalation creates GitHub issue."""
        # Mock successful GitHub API response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'html_url': 'https://github.com/owner/repo/issues/42',
            'number': 42
        }
        mock_post.return_value = mock_response

        # Set repo
        escalator.github_repo = 'owner/repo'

        # 5 failures = Level 2
        result = escalator.escalate(sample_task, sample_failures)

        assert result.level == 2
        assert result.action_taken == "github_issue_created"
        assert result.success is True
        assert 'github.com' in result.details

        # Verify GitHub API was called
        assert mock_post.call_count == 1
        call_args = mock_post.call_args

        # Check URL
        assert 'api.github.com/repos/owner/repo/issues' in call_args[0][0]

        # Check headers
        headers = call_args[1]['headers']
        assert 'Bearer test_token_123' in headers['Authorization']

        # Check payload
        payload = call_args[1]['json']
        assert sample_task['description'] in payload['title']
        assert 'autofix-failure' in payload['labels']

        # Check state was updated
        state = mock_state_manager.read()
        assert 'escalated_issues' in state
        assert len(state['escalated_issues']) > 0

    @patch('requests.post')
    def test_level_2_escalation_handles_github_failure(
        self,
        mock_post,
        escalator,
        sample_task,
        sample_failures
    ):
        """Test Level 2 handles GitHub API failure gracefully."""
        # Mock failed GitHub API response
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = "Forbidden"
        mock_post.return_value = mock_response

        escalator.github_repo = 'owner/repo'

        result = escalator.escalate(sample_task, sample_failures)

        assert result.level == 2
        assert result.action_taken == "github_issue_failed"
        assert result.success is False

    def test_level_2_escalation_skips_without_token(
        self,
        mock_state_manager,
        sample_task,
        sample_failures
    ):
        """Test Level 2 skips GitHub issue creation without token."""
        escalator = ErrorEscalator(mock_state_manager, github_token=None)

        result = escalator.escalate(sample_task, sample_failures)

        assert result.level == 2
        assert result.action_taken == "github_issue_skipped"
        assert result.success is False
        assert "not configured" in result.details

    @patch('requests.post')
    def test_level_3_escalation_sends_notifications(
        self,
        mock_post,
        escalator,
        sample_task
    ):
        """Test Level 3 escalation sends notifications."""
        # Mock successful webhook responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Configure webhooks
        escalator.slack_webhook = 'https://hooks.slack.com/test'
        escalator.email_webhook = 'https://email.service/test'

        # 10 failures = Level 3
        failures = [
            {'attempt_num': i, 'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}
            for i in range(1, 11)
        ]

        result = escalator.escalate(sample_task, failures)

        assert result.level == 3
        assert 'slack' in result.action_taken or 'email' in result.action_taken
        assert result.success is True

        # Should have called both webhooks
        assert mock_post.call_count == 2

    def test_level_3_escalation_skips_without_webhooks(
        self,
        escalator,
        sample_task
    ):
        """Test Level 3 skips notifications without configured webhooks."""
        # Ensure no webhooks configured
        escalator.slack_webhook = None
        escalator.email_webhook = None

        failures = [
            {'attempt_num': i, 'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}
            for i in range(1, 11)
        ]

        result = escalator.escalate(sample_task, failures)

        assert result.level == 3
        assert result.action_taken == "notifications_skipped"
        assert result.success is False

    def test_build_github_issue_body_includes_details(
        self,
        escalator,
        sample_task,
        sample_failures
    ):
        """Test GitHub issue body includes all necessary details."""
        body = escalator._build_github_issue_body(sample_task, sample_failures)

        # Check required sections
        assert sample_task['id'] in body
        assert sample_task['file_path'] in body
        assert sample_task['description'] in body
        assert str(len(sample_failures)) in body

        # Check failure history
        for failure in sample_failures[-5:]:  # Last 5
            assert str(failure['attempt_num']) in body

    def test_build_notification_message(self, escalator, sample_task, sample_failures):
        """Test notification message formatting."""
        message = escalator._build_notification_message(sample_task, sample_failures)

        assert 'CRITICAL' in message
        assert sample_task['description'] in message
        assert sample_task['file_path'] in message
        assert str(len(sample_failures)) in message

    @patch('requests.post')
    def test_send_notification_slack(self, mock_post, escalator):
        """Test Slack notification sending."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        escalator.slack_webhook = 'https://hooks.slack.com/test'

        success = escalator._send_notification('Test message', 'critical', 'slack')

        assert success is True
        assert mock_post.call_count == 1

        # Check payload
        payload = mock_post.call_args[1]['json']
        assert payload['text'] == 'Test message'
        assert 'username' in payload

    @patch('requests.post')
    def test_send_notification_email(self, mock_post, escalator):
        """Test email notification sending."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        escalator.email_webhook = 'https://email.service/test'

        success = escalator._send_notification('Test message', 'critical', 'email')

        assert success is True
        assert mock_post.call_count == 1

        # Check payload
        payload = mock_post.call_args[1]['json']
        assert payload['body'] == 'Test message'
        assert 'subject' in payload

    @patch('requests.post')
    def test_send_notification_handles_failure(self, mock_post, escalator):
        """Test notification handles API failures gracefully."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        escalator.slack_webhook = 'https://hooks.slack.com/test'

        success = escalator._send_notification('Test message', 'critical', 'slack')

        assert success is False

    def test_escalation_thresholds_configurable(self, mock_state_manager):
        """Test that escalation thresholds are configurable."""
        escalator = ErrorEscalator(mock_state_manager)

        assert escalator.level_1_threshold == 3
        assert escalator.level_2_threshold == 5
        assert escalator.level_3_threshold == 10

    def test_github_issue_creation_validates_repo_format(
        self,
        escalator,
        sample_task,
        sample_failures
    ):
        """Test GitHub issue creation validates repo format."""
        escalator.github_repo = 'invalid_format'  # No slash

        issue_url = escalator._create_github_issue(sample_task, sample_failures)

        assert issue_url is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
