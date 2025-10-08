#!/usr/bin/env python3
"""
ErrorEscalator - Handles Unrecoverable Failures with Multi-Level Escalation
Justice Companion Automation Framework
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, NamedTuple
from pathlib import Path

import requests

from state_manager import StateManager


class EscalationResult(NamedTuple):
    """Result of an escalation action."""
    level: int
    action_taken: str
    success: bool
    details: Optional[str]


class ErrorEscalator:
    """
    Handles error escalation with multiple levels of response.

    Escalation Levels:
    - Level 1 (3 failures): Log + pause for 1 hour
    - Level 2 (5 failures): Create GitHub issue
    - Level 3 (critical): Send notification (if configured)
    """

    def __init__(
        self,
        state_manager: StateManager,
        github_token: Optional[str] = None
    ):
        """
        Initialize ErrorEscalator.

        Args:
            state_manager: State manager for atomic operations
            github_token: Optional GitHub personal access token for issue creation
        """
        self.state_manager = state_manager
        self.github_token = github_token or os.getenv('GITHUB_TOKEN')

        # Load configuration
        self.github_repo = os.getenv('GITHUB_REPO', 'owner/repo')
        self.slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        self.email_webhook = os.getenv('EMAIL_WEBHOOK_URL')

        # Escalation thresholds
        self.level_1_threshold = 3
        self.level_2_threshold = 5
        self.level_3_threshold = 10

    def escalate(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> EscalationResult:
        """
        Escalate error based on failure count and history.

        Args:
            task: Task dictionary with error details
            failure_history: List of previous failure attempts

        Returns:
            EscalationResult with action details
        """
        failure_count = len(failure_history)
        task_id = task.get('id', 'unknown')

        print(f"[ErrorEscalator] Evaluating escalation for task {task_id}")
        print(f"[ErrorEscalator] Failure count: {failure_count}")

        # Determine escalation level
        if failure_count >= self.level_3_threshold:
            return self._escalate_level_3(task, failure_history)
        elif failure_count >= self.level_2_threshold:
            return self._escalate_level_2(task, failure_history)
        elif failure_count >= self.level_1_threshold:
            return self._escalate_level_1(task, failure_history)
        else:
            # No escalation needed
            return EscalationResult(
                level=0,
                action_taken="none",
                success=True,
                details="Failure count below escalation threshold"
            )

    def _escalate_level_1(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> EscalationResult:
        """
        Level 1 escalation: Log error and pause task.

        Args:
            task: Task dictionary
            failure_history: Failure history

        Returns:
            EscalationResult
        """
        print("[ErrorEscalator] Level 1: Logging error and pausing task")

        # Update state to pause task
        def pause_task(state):
            if 'paused_tasks' not in state:
                state['paused_tasks'] = {}

            task_id = task.get('id', 'unknown')
            state['paused_tasks'][task_id] = {
                'paused_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'reason': f"Level 1 escalation - {len(failure_history)} failures",
                'resume_after': 3600  # 1 hour in seconds
            }

            # Log to errors
            if 'errors' not in state:
                state['errors'] = []

            state['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'task_id': task_id,
                'level': 1,
                'failure_count': len(failure_history),
                'description': task.get('description', 'unknown')
            })

            # Limit error log size
            if len(state['errors']) > 100:
                state['errors'] = state['errors'][-100:]

            return state

        self.state_manager.update(pause_task)

        return EscalationResult(
            level=1,
            action_taken="logged_and_paused",
            success=True,
            details="Task paused for 1 hour"
        )

    def _escalate_level_2(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> EscalationResult:
        """
        Level 2 escalation: Create GitHub issue.

        Args:
            task: Task dictionary
            failure_history: Failure history

        Returns:
            EscalationResult
        """
        print("[ErrorEscalator] Level 2: Creating GitHub issue")

        if not self.github_token:
            print("[ErrorEscalator] [WARNING] GitHub token not configured, skipping issue creation")
            return EscalationResult(
                level=2,
                action_taken="github_issue_skipped",
                success=False,
                details="GitHub token not configured"
            )

        # Create GitHub issue
        issue_url = self._create_github_issue(task, failure_history)

        if issue_url:
            # Record issue in state
            def record_issue(state):
                if 'escalated_issues' not in state:
                    state['escalated_issues'] = []

                state['escalated_issues'].append({
                    'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                    'task_id': task.get('id', 'unknown'),
                    'issue_url': issue_url,
                    'failure_count': len(failure_history)
                })

                return state

            self.state_manager.update(record_issue)

            return EscalationResult(
                level=2,
                action_taken="github_issue_created",
                success=True,
                details=issue_url
            )
        else:
            return EscalationResult(
                level=2,
                action_taken="github_issue_failed",
                success=False,
                details="Failed to create GitHub issue"
            )

    def _escalate_level_3(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> EscalationResult:
        """
        Level 3 escalation: Send critical notification.

        Args:
            task: Task dictionary
            failure_history: Failure history

        Returns:
            EscalationResult
        """
        print("[ErrorEscalator] Level 3: Sending critical notification")

        # Build notification message
        message = self._build_notification_message(task, failure_history)

        # Try multiple notification channels
        notifications_sent = []

        if self.slack_webhook:
            if self._send_notification(message, 'critical', 'slack'):
                notifications_sent.append('slack')

        if self.email_webhook:
            if self._send_notification(message, 'critical', 'email'):
                notifications_sent.append('email')

        if notifications_sent:
            return EscalationResult(
                level=3,
                action_taken=f"notifications_sent_{','.join(notifications_sent)}",
                success=True,
                details=f"Notifications sent via: {', '.join(notifications_sent)}"
            )
        else:
            print("[ErrorEscalator] [WARNING] No notification channels configured")
            return EscalationResult(
                level=3,
                action_taken="notifications_skipped",
                success=False,
                details="No notification channels configured"
            )

    def _create_github_issue(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> Optional[str]:
        """
        Create GitHub issue for escalated error.

        Args:
            task: Task dictionary
            failure_history: List of failure attempts

        Returns:
            Issue URL if successful, None otherwise
        """
        try:
            # Build issue content
            title = f"[AutoFix Failed] {task.get('description', 'Unknown task')}"
            body = self._build_github_issue_body(task, failure_history)

            # Parse repo owner and name
            if '/' not in self.github_repo:
                print(f"[ErrorEscalator] Invalid GITHUB_REPO format: {self.github_repo}")
                return None

            owner, repo = self.github_repo.split('/', 1)

            # Create issue via GitHub API
            url = f"https://api.github.com/repos/{owner}/{repo}/issues"
            headers = {
                'Authorization': f'Bearer {self.github_token}',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }

            payload = {
                'title': title,
                'body': body,
                'labels': ['autofix-failure', 'needs-investigation']
            }

            response = requests.post(url, headers=headers, json=payload, timeout=10)

            if response.status_code == 201:
                issue_data = response.json()
                issue_url = issue_data.get('html_url', '')
                print(f"[ErrorEscalator] [OK] Created issue: {issue_url}")
                return issue_url
            else:
                print(f"[ErrorEscalator] [X] Failed to create issue: {response.status_code}")
                print(f"[ErrorEscalator]   Response: {response.text[:200]}")
                return None

        except requests.RequestException as e:
            print(f"[ErrorEscalator] [X] GitHub API request failed: {e}")
            return None
        except Exception as e:
            print(f"[ErrorEscalator] [X] Unexpected error creating issue: {e}")
            return None

    def _build_github_issue_body(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> str:
        """
        Build detailed GitHub issue body with error context.

        Args:
            task: Task dictionary
            failure_history: Failure history

        Returns:
            Formatted markdown issue body
        """
        body = f"""## AutoFix Failure Report

**Task ID**: `{task.get('id', 'unknown')}`
**File**: `{task.get('file_path', 'unknown')}`
**Total Failures**: {len(failure_history)}

### Description
{task.get('description', 'No description provided')}

### Failure History
"""

        # Add recent failures (last 5)
        for i, failure in enumerate(failure_history[-5:], 1):
            body += f"""
#### Attempt {failure.get('attempt_num', i)}
- **Timestamp**: {failure.get('timestamp', 'unknown')}
- **Test Passed**: {failure.get('test_passed', False)}
- **Duration**: {failure.get('test_duration', 0):.2f}s
- **Error Summary**:
```
{failure.get('error_summary', 'No error details')[:300]}
```
"""

        # Add metadata
        body += f"""
### Context
- **Automated by**: Dual Claude Orchestration System
- **Escalation Level**: 2
- **Report Generated**: {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}

### Next Steps
1. Review the error logs above
2. Manually inspect the file: `{task.get('file_path', 'unknown')}`
3. Determine if this is a bug in the code or automation logic
4. Apply manual fix if needed
5. Update automation if issue is systematic

---
*This issue was automatically created by the ErrorEscalator component.*
"""

        return body

    def _build_notification_message(
        self,
        task: Dict,
        failure_history: List[Dict]
    ) -> str:
        """
        Build notification message for critical alerts.

        Args:
            task: Task dictionary
            failure_history: Failure history

        Returns:
            Formatted notification message
        """
        return f"""🚨 CRITICAL: AutoFix Failed - {len(failure_history)} Attempts

Task: {task.get('description', 'Unknown')}
File: {task.get('file_path', 'unknown')}
Failures: {len(failure_history)}

Last Error: {failure_history[-1].get('error_summary', 'No details')[:100] if failure_history else 'N/A'}

Manual intervention required.
"""

    def _send_notification(
        self,
        message: str,
        level: str,
        channel: str = 'slack'
    ) -> bool:
        """
        Send notification via webhook.

        Args:
            message: Notification message
            level: Severity level (e.g., 'critical', 'warning')
            channel: Notification channel ('slack' or 'email')

        Returns:
            True if notification sent successfully, False otherwise
        """
        webhook_url = None

        if channel == 'slack':
            webhook_url = self.slack_webhook
            payload = {
                'text': message,
                'username': 'AutoFix Bot',
                'icon_emoji': ':warning:'
            }
        elif channel == 'email':
            webhook_url = self.email_webhook
            payload = {
                'subject': f"[{level.upper()}] AutoFix Failure",
                'body': message
            }
        else:
            print(f"[ErrorEscalator] Unknown notification channel: {channel}")
            return False

        if not webhook_url:
            return False

        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code in [200, 201, 204]:
                print(f"[ErrorEscalator] [OK] Sent {channel} notification")
                return True
            else:
                print(f"[ErrorEscalator] [X] {channel} notification failed: {response.status_code}")
                return False

        except requests.RequestException as e:
            print(f"[ErrorEscalator] [X] {channel} notification error: {e}")
            return False


# Example usage
if __name__ == '__main__':
    from pathlib import Path
    from dotenv import load_dotenv

    # Load environment
    load_dotenv('automation/.env')

    # Initialize components
    state_file = Path('automation/state/app_state.json')
    lock_file = Path('automation/state/app_state.lock')

    state_manager = StateManager(state_file, lock_file)
    github_token = os.getenv('GITHUB_TOKEN')

    escalator = ErrorEscalator(state_manager, github_token)

    # Test with sample task and failure history
    test_task = {
        'id': 'test_task_002',
        'description': 'Fix failing type check in CaseService',
        'file_path': 'src/services/CaseService.ts'
    }

    sample_failures = [
        {
            'attempt_num': i,
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'test_passed': False,
            'test_duration': 2.5,
            'error_summary': f'TypeError: Cannot read property "id" of undefined (attempt {i})'
        }
        for i in range(1, 6)
    ]

    print("Testing ErrorEscalator with 5 failures (Level 2 threshold)...")
    result = escalator.escalate(test_task, sample_failures)

    print(f"\nResult:")
    print(f"  Level: {result.level}")
    print(f"  Action: {result.action_taken}")
    print(f"  Success: {result.success}")
    print(f"  Details: {result.details or 'N/A'}")

    print("\n[OK] ErrorEscalator test complete")
