#!/usr/bin/env python3
"""
AutoFixer - Retry Logic with Exponential Backoff and Circuit Breaker
Justice Companion Automation Framework
"""

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, NamedTuple
from pathlib import Path

from state_manager import StateManager
from test_runner import TestRunner
from claude_instance import ClaudeInstance


class FixResult(NamedTuple):
    """Result of a fix attempt."""
    success: bool
    attempts: int
    final_test_result: Optional[Dict]
    failure_reason: Optional[str]
    total_duration: float


class AutoFixer:
    """
    Implements retry logic with exponential backoff and circuit breaker.

    Features:
    - Exponential backoff: 1s, 2s, 4s, 8s, 16s
    - Circuit breaker: pause after 3 failures within 1 hour
    - Comprehensive failure analysis
    - State tracking for all fix attempts
    """

    def __init__(
        self,
        state_manager: StateManager,
        test_runner: TestRunner,
        claude_headless: ClaudeInstance
    ):
        """
        Initialize AutoFixer.

        Args:
            state_manager: State manager for atomic operations
            test_runner: Test runner for executing tests
            claude_headless: Headless Claude instance for automated fixes
        """
        self.state_manager = state_manager
        self.test_runner = test_runner
        self.claude_headless = claude_headless

        # Load configuration from environment
        self.max_retries = int(os.getenv('MAX_RETRIES', '5'))
        self.circuit_breaker_threshold = int(os.getenv('CIRCUIT_BREAKER_THRESHOLD', '3'))
        self.circuit_breaker_window = int(os.getenv('CIRCUIT_BREAKER_WINDOW', '3600'))  # 1 hour

        # Exponential backoff delays (seconds)
        self.retry_delays = [1, 2, 4, 8, 16]

    def fix_with_retry(
        self,
        task: Dict,
        max_retries: Optional[int] = None
    ) -> FixResult:
        """
        Attempt to fix a task with exponential backoff retry logic.

        Args:
            task: Task dictionary with 'id', 'description', 'file_path', etc.
            max_retries: Optional override for max retries (default: from env)

        Returns:
            FixResult with success status and metadata
        """
        start_time = time.time()
        max_retries = max_retries or self.max_retries

        task_id = task.get('id', 'unknown')
        file_path = task.get('file_path', 'unknown')

        # Check circuit breaker before attempting
        if not self._should_retry(task, 0):
            return FixResult(
                success=False,
                attempts=0,
                final_test_result=None,
                failure_reason=f"Circuit breaker active for {file_path}",
                total_duration=0
            )

        # Initialize fix attempts tracking in state
        self._initialize_fix_attempt_tracking(task_id)

        # Attempt fixes with retry
        for attempt in range(1, max_retries + 1):
            print(f"[AutoFixer] Attempt {attempt}/{max_retries} for task {task_id}")

            # Check circuit breaker before each retry
            if attempt > 1 and not self._should_retry(task, attempt):
                duration = time.time() - start_time
                return FixResult(
                    success=False,
                    attempts=attempt - 1,
                    final_test_result=None,
                    failure_reason="Circuit breaker activated",
                    total_duration=duration
                )

            # Attempt the fix
            success, test_result = self._attempt_fix(task, attempt)

            # Record attempt in state
            self._record_fix_attempt(task_id, attempt, success, test_result)

            if success:
                duration = time.time() - start_time
                print(f"[AutoFixer] ✓ Fix succeeded on attempt {attempt}")
                return FixResult(
                    success=True,
                    attempts=attempt,
                    final_test_result=test_result,
                    failure_reason=None,
                    total_duration=duration
                )

            # Failed - analyze and decide whether to retry
            failure_analysis = self._analyze_failure(test_result)
            print(f"[AutoFixer] ✗ Attempt {attempt} failed: {failure_analysis.get('summary', 'unknown error')}")

            # If not last attempt, wait with exponential backoff
            if attempt < max_retries:
                delay = self._get_retry_delay(attempt)
                print(f"[AutoFixer] Waiting {delay}s before retry {attempt + 1}...")
                time.sleep(delay)

        # All retries exhausted
        duration = time.time() - start_time
        print(f"[AutoFixer] ✗ All {max_retries} attempts failed for task {task_id}")

        return FixResult(
            success=False,
            attempts=max_retries,
            final_test_result=test_result,
            failure_reason="Max retries exhausted",
            total_duration=duration
        )

    def _attempt_fix(self, task: Dict, attempt_num: int) -> tuple[bool, Dict]:
        """
        Attempt to fix a task using Claude and validate with tests.

        Args:
            task: Task dictionary
            attempt_num: Current attempt number (for context)

        Returns:
            Tuple of (success: bool, test_result: Dict)
        """
        try:
            # Build fix prompt with context
            prompt = self._build_fix_prompt(task, attempt_num)

            # Get fix from Claude
            print(f"[AutoFixer]   Requesting fix from Claude...")
            fix_response = self.claude_headless.send_message(prompt)

            # TODO: Parse and apply the fix (file edits)
            # For now, we'll simulate by just running tests
            # In production, this would extract code blocks and modify files

            # Run tests to validate fix
            test_path = task.get('test_path')
            print(f"[AutoFixer]   Running tests to validate fix...")
            test_result = self.test_runner.run_tests(test_path=test_path)

            return (test_result['passed'], test_result)

        except Exception as e:
            print(f"[AutoFixer]   Exception during fix attempt: {e}")
            return (False, {
                'passed': False,
                'returncode': -1,
                'stdout': '',
                'stderr': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'duration': 0,
                'test_path': task.get('test_path')
            })

    def _build_fix_prompt(self, task: Dict, attempt_num: int) -> str:
        """
        Build prompt for Claude to attempt a fix.

        Args:
            task: Task dictionary
            attempt_num: Current attempt number

        Returns:
            Formatted prompt string
        """
        base_prompt = f"""Fix the following issue in the Justice Companion codebase:

Task: {task.get('description', 'No description provided')}
File: {task.get('file_path', 'unknown')}
Attempt: {attempt_num}

"""

        # Add previous attempt context if available
        if attempt_num > 1:
            state = self.state_manager.read()
            task_id = task.get('id', 'unknown')
            fix_attempts = state.get('fix_attempts', {}).get(task_id, [])

            if fix_attempts:
                last_attempt = fix_attempts[-1]
                base_prompt += f"""Previous attempt failed with:
{last_attempt.get('error_summary', 'Unknown error')}

"""

        base_prompt += """Provide the complete fixed code with explanations.
Format your response with code blocks that can be automatically applied."""

        return base_prompt

    def _analyze_failure(self, test_results: Dict) -> Dict:
        """
        Analyze test failure patterns to inform retry strategy.

        Args:
            test_results: Test results dictionary from TestRunner

        Returns:
            Analysis dictionary with failure patterns and insights
        """
        analysis = {
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'passed': test_results.get('passed', False),
            'returncode': test_results.get('returncode', -1)
        }

        # Combine output for analysis
        output = test_results.get('stdout', '') + test_results.get('stderr', '')

        # Detect common failure patterns
        patterns = {
            'syntax_error': ['SyntaxError', 'Unexpected token'],
            'type_error': ['TypeError', 'is not a function', 'undefined'],
            'test_timeout': ['timeout', 'timed out', 'ETIMEDOUT'],
            'import_error': ['Cannot find module', 'MODULE_NOT_FOUND'],
            'assertion_error': ['AssertionError', 'Expected', 'toBe']
        }

        detected_patterns = []
        for pattern_name, keywords in patterns.items():
            if any(keyword in output for keyword in keywords):
                detected_patterns.append(pattern_name)

        analysis['detected_patterns'] = detected_patterns

        # Generate summary
        if detected_patterns:
            analysis['summary'] = f"Detected: {', '.join(detected_patterns)}"
        else:
            analysis['summary'] = "Unknown failure pattern"

        # Extract specific error lines
        failures = self.test_runner.parse_test_failures(output)
        analysis['failure_count'] = len(failures)
        analysis['failure_details'] = [f['line'] for f in failures[:3]]  # Top 3

        return analysis

    def _should_retry(self, task: Dict, attempt_num: int) -> bool:
        """
        Determine if retry should proceed based on circuit breaker logic.

        Args:
            task: Task dictionary
            attempt_num: Current attempt number

        Returns:
            True if retry should proceed, False if circuit breaker is active
        """
        file_path = task.get('file_path', 'unknown')

        # Read current state
        state = self.state_manager.read()
        fix_attempts = state.get('fix_attempts', {})

        # Get recent failures for this file
        recent_failures = self._get_recent_failures_for_file(
            fix_attempts,
            file_path,
            self.circuit_breaker_window
        )

        # Check if circuit breaker should activate
        if len(recent_failures) >= self.circuit_breaker_threshold:
            print(f"[AutoFixer] ⚠ Circuit breaker active for {file_path}")
            print(f"[AutoFixer]   {len(recent_failures)} failures in last {self.circuit_breaker_window}s")
            return False

        return True

    def _get_recent_failures_for_file(
        self,
        fix_attempts: Dict,
        file_path: str,
        window_seconds: int
    ) -> List[Dict]:
        """
        Get recent failures for a specific file within time window.

        Args:
            fix_attempts: All fix attempts from state
            file_path: File path to filter by
            window_seconds: Time window in seconds

        Returns:
            List of recent failure attempts
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=window_seconds)

        recent_failures = []

        for task_id, attempts in fix_attempts.items():
            for attempt in attempts:
                # Check if this attempt is for the target file
                if attempt.get('file_path') != file_path:
                    continue

                # Check if attempt failed
                if attempt.get('success', False):
                    continue

                # Check if within time window
                attempt_time_str = attempt.get('timestamp', '')
                if not attempt_time_str:
                    continue

                try:
                    attempt_time = datetime.fromisoformat(attempt_time_str.replace('Z', '+00:00'))
                    if attempt_time >= cutoff:
                        recent_failures.append(attempt)
                except (ValueError, AttributeError):
                    continue

        return recent_failures

    def _get_retry_delay(self, attempt_num: int) -> int:
        """
        Get retry delay for given attempt using exponential backoff.

        Args:
            attempt_num: Current attempt number (1-indexed)

        Returns:
            Delay in seconds
        """
        # Map attempt to delay index (0-indexed)
        index = min(attempt_num - 1, len(self.retry_delays) - 1)
        return self.retry_delays[index]

    def _initialize_fix_attempt_tracking(self, task_id: str):
        """
        Initialize fix attempt tracking in state for a task.

        Args:
            task_id: Task identifier
        """
        def init_tracking(state):
            if 'fix_attempts' not in state:
                state['fix_attempts'] = {}

            if task_id not in state['fix_attempts']:
                state['fix_attempts'][task_id] = []

            return state

        self.state_manager.update(init_tracking)

    def _record_fix_attempt(
        self,
        task_id: str,
        attempt_num: int,
        success: bool,
        test_result: Dict
    ):
        """
        Record fix attempt in state for debugging and circuit breaker.

        Args:
            task_id: Task identifier
            attempt_num: Attempt number
            success: Whether fix succeeded
            test_result: Test results dictionary
        """
        def record_attempt(state):
            # Ensure fix_attempts exists
            if 'fix_attempts' not in state:
                state['fix_attempts'] = {}

            if task_id not in state['fix_attempts']:
                state['fix_attempts'][task_id] = []

            # Record attempt
            attempt_record = {
                'attempt_num': attempt_num,
                'success': success,
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'file_path': test_result.get('test_path', 'unknown'),
                'test_passed': test_result.get('passed', False),
                'test_duration': test_result.get('duration', 0),
                'error_summary': test_result.get('stderr', '')[:200]  # First 200 chars
            }

            state['fix_attempts'][task_id].append(attempt_record)

            # Limit history per task to last 10 attempts
            if len(state['fix_attempts'][task_id]) > 10:
                state['fix_attempts'][task_id] = state['fix_attempts'][task_id][-10:]

            return state

        self.state_manager.update(record_attempt)


# Example usage
if __name__ == '__main__':
    from pathlib import Path
    from dotenv import load_dotenv

    # Load environment
    load_dotenv('automation/.env')

    # Initialize components
    state_file = Path('automation/state/app_state.json')
    lock_file = Path('automation/state/app_state.lock')
    project_root = Path('.')

    state_manager = StateManager(state_file, lock_file)
    test_runner = TestRunner(project_root)

    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        exit(1)

    claude_headless = ClaudeInstance('headless', api_key)

    # Initialize AutoFixer
    auto_fixer = AutoFixer(state_manager, test_runner, claude_headless)

    # Test with a sample task
    test_task = {
        'id': 'test_task_001',
        'description': 'Fix failing encryption service test',
        'file_path': 'src/services/EncryptionService.test.ts',
        'test_path': 'src/services/EncryptionService.test.ts'
    }

    print("Testing AutoFixer with sample task...")
    result = auto_fixer.fix_with_retry(test_task, max_retries=3)

    print(f"\nResult:")
    print(f"  Success: {result.success}")
    print(f"  Attempts: {result.attempts}")
    print(f"  Duration: {result.total_duration:.2f}s")
    print(f"  Failure Reason: {result.failure_reason or 'N/A'}")

    print("\n[OK] AutoFixer test complete")
