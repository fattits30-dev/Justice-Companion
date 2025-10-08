#!/usr/bin/env python3
"""
Intelligent Fixer Agent - 3-Tier Auto-Fix Strategy
Justice Companion Multi-Agent System

Responsibility: Fix errors using 3-tier escalation
  TIER 1: Regex pattern matching (instant, free)
  TIER 2: Codex auto-fix (2 min, via WSL)
  TIER 3: Claude Code (GitHub issue escalation)
"""

import os
import sys
import json
import time
import subprocess
import threading
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from state_manager import StateManager


class IntelligentFixerAgent:
    """
    3-tier intelligent fixer using Regex → Codex → Claude Code.

    Single Responsibility: Attempt fixes using escalating intelligence levels
    """

    def __init__(self, config: Dict):
        """Initialize intelligent fixer agent."""
        self.agent_id = "intelligent_fixer"
        self.config = config

        # Determine project root
        self.project_root = Path(__file__).parent.parent.parent

        # State management
        state_file = self.project_root / 'automation' / 'state' / 'app_state.json'
        lock_file = self.project_root / 'automation' / 'state' / 'app_state.lock'
        self.state = StateManager(state_file, lock_file)

        # Directories
        self.tasks_dir = self.project_root / 'automation' / 'tasks'
        self.fixes_dir = self.project_root / 'automation' / 'fixes'
        self.fixes_dir.mkdir(parents=True, exist_ok=True)

        # Codex rate limiting
        self._last_codex_call = 0.0
        self._codex_lock = threading.Lock()

        # Statistics
        self.stats = {
            'start_time': None,
            'tasks_processed': 0,
            'tier1_fixes': 0,
            'tier2_fixes': 0,
            'tier3_escalations': 0,
            'failed_fixes': 0
        }

        # Tier 1: Regex patterns (inherited from fix_suggester patterns)
        self.regex_patterns = self._build_regex_patterns()

    def _build_regex_patterns(self) -> List[Dict]:
        """Build simple auto-fixable regex patterns."""
        return [
            {
                'name': 'unused_import',
                'pattern': r"'(\w+)' is declared but its value is never read",
                'action': 'remove_unused_import',
                'auto_fixable': True
            },
            {
                'name': 'missing_semicolon',
                'pattern': r"';' expected",
                'action': 'add_semicolon',
                'auto_fixable': True
            },
            {
                'name': 'double_equals',
                'pattern': r"Use '===' instead of '=='",
                'action': 'replace_equality',
                'auto_fixable': True
            },
        ]

    def start(self) -> None:
        """Start intelligent fixer agent."""
        print(f"[{self.agent_id}] Starting Intelligent Fixer Agent")
        print(f"[{self.agent_id}] Mode: 3-Tier Auto-Fix (Regex --> Codex --> Claude)")

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

        print(f"[{self.agent_id}] [OK] READY - Listening for tasks...")

        # Main loop
        try:
            while True:
                self._process_tasks()
                time.sleep(5)  # Check every 5 seconds

                # Heartbeat every 30 seconds
                if int(time.time()) % 30 == 0:
                    self._update_heartbeat()

        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] Shutting down...")
            self._print_stats()

    def _process_tasks(self):
        """Process pending tasks with 3-tier fix strategy."""
        if not self.tasks_dir.exists():
            return

        # Find pending tasks
        for task_file in self.tasks_dir.glob('*.json'):
            try:
                with open(task_file) as f:
                    task = json.load(f)
            except (json.JSONDecodeError, IOError):
                continue

            # Only process pending test_failure tasks
            if task.get('status') != 'pending' or task.get('type') != 'test_failure':
                continue

            # Process task with 3-tier strategy
            self._fix_with_3_tier_strategy(task['id'], task)

    def _fix_with_3_tier_strategy(self, task_id: str, task: Dict):
        """Apply 3-tier fix strategy: Regex --> Codex --> Claude."""
        print(f"\n[{self.agent_id}] Processing task: {task_id[:8]}...")
        self.stats['tasks_processed'] += 1

        test_result = task.get('test_result', {})
        error_output = test_result.get('stdout', '') or test_result.get('stderr', '')
        file_path = task.get('file_path', '')

        # TIER 1: Regex pattern fixes
        if self._try_regex_fix(task_id, file_path, error_output):
            print(f"[{self.agent_id}] [OK] TIER 1: Regex fix successful")
            self.stats['tier1_fixes'] += 1
            self._mark_task_fixed(task_id, 'tier1_regex')
            return

        # TIER 2: Codex auto-fix
        print(f"[{self.agent_id}] TIER 1 failed, escalating to TIER 2 (Codex)...")
        if self._try_codex_fix(task_id, file_path, error_output):
            print(f"[{self.agent_id}] [OK] TIER 2: Codex fix successful")
            self.stats['tier2_fixes'] += 1
            self._mark_task_fixed(task_id, 'tier2_codex')
            return

        # TIER 3: Claude Code (GitHub issue escalation)
        print(f"[{self.agent_id}] TIER 2 failed, escalating to TIER 3 (Claude Code)...")
        self._escalate_to_claude_code(task_id, file_path, error_output)
        print(f"[{self.agent_id}] [OK] TIER 3: Escalated to Claude Code (GitHub issue)")
        self.stats['tier3_escalations'] += 1

    def _try_regex_fix(self, task_id: str, file_path: str, error_output: str) -> bool:
        """TIER 1: Try to fix with regex patterns."""
        # Match error against patterns
        for pattern_def in self.regex_patterns:
            if pattern_def['pattern'] in error_output:
                if pattern_def['auto_fixable']:
                    # TODO: Implement actual regex-based fixes
                    # For now, just log that we would fix it
                    print(f"[{self.agent_id}] [TIER 1] Matched pattern: {pattern_def['name']}")
                    return False  # Not implemented yet

        return False

    def _try_codex_fix(self, task_id: str, file_path: str, error_output: str) -> bool:
        """
        TIER 2: Try to fix with Codex via WSL.

        Invokes Codex CLI to analyze and fix the error.
        """
        MAX_ATTEMPTS = 3
        BASE_BACKOFF_SECONDS = 10
        MIN_INTERVAL_SECONDS = 15
        MAX_ERROR_SNIPPET_CHARS = 300

        # Prepare Codex command inputs
        project_path = str(self.project_root).replace('\\', '/')
        wsl_path = f"/mnt/c/{project_path[3:]}"  # C:\foo\bar -> /mnt/c/foo/bar

        sanitized_error = (error_output or '').replace('\r', ' ').replace('\n', ' ')
        error_snippet = sanitized_error[:MAX_ERROR_SNIPPET_CHARS]
        prompt = f"Fix this error in {file_path}: {error_snippet}"

        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                self._respect_codex_rate_limit(MIN_INTERVAL_SECONDS)

                command = [
                    'wsl', 'codex', 'exec',
                    '-C', wsl_path,
                    '--full-auto',
                    prompt,
                ]

                print(f"[{self.agent_id}] [TIER 2] Invoking Codex (attempt {attempt})...")

                result = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=120  # 2 minutes
                )

                with self._codex_lock:
                    self._last_codex_call = time.time()

                if result.returncode == 0:
                    fix_result = {
                        'task_id': task_id,
                        'tier': 'tier2_codex',
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'file_path': file_path,
                        'codex_output': result.stdout,
                        'success': True
                    }

                    fix_file = self.fixes_dir / f"{task_id}_codex.json"
                    with open(fix_file, 'w') as f:
                        json.dump(fix_result, f, indent=2)

                    return True

                stderr = result.stderr or ''
                if 'rate limit' in stderr.lower() or '429' in stderr:
                    backoff = BASE_BACKOFF_SECONDS * attempt
                    print(f"[{self.agent_id}] [TIER 2] Codex rate limit hit; backing off for {backoff}s")
                    time.sleep(backoff)
                    continue

                print(f"[{self.agent_id}] [TIER 2] Codex failed (exit {result.returncode})")
                return False

            except subprocess.TimeoutExpired:
                print(f"[{self.agent_id}] [TIER 2] Codex timeout (2 min)")
                return False
            except Exception as e:
                print(f"[{self.agent_id}] [TIER 2] Codex error: {e}")
                return False

        return False

    def _respect_codex_rate_limit(self, min_interval_seconds: int) -> None:
        """
        Ensure we leave enough time between Codex invocations to avoid rate limits.
        """
        with self._codex_lock:
            elapsed = time.time() - self._last_codex_call

        if elapsed < min_interval_seconds:
            wait_time = min_interval_seconds - elapsed
            print(f"[{self.agent_id}] [TIER 2] Waiting {wait_time:.1f}s to respect Codex rate limits")
            time.sleep(wait_time)

    def _escalate_to_claude_code(self, task_id: str, file_path: str, error_output: str):
        """
        TIER 3: Escalate to Claude Code via GitHub issue.

        Creates a structured GitHub issue for manual review.
        """
        issue_title = f"[AUTO] Fix needed: {file_path}"
        issue_body = f"""## Automated Fix Request

**Task ID**: `{task_id[:8]}...`
**File**: `{file_path}`
**Tier**: 3 (Claude Code Manual Review)

### Error Output
```
{error_output[:1000]}
```

### Context
- TIER 1 (Regex): No pattern match
- TIER 2 (Codex): Auto-fix failed or timeout

### Action Needed
Please review and fix manually using Claude Code.

---
*Generated by Intelligent Fixer Agent*
*Timestamp: {datetime.now(timezone.utc).isoformat()}*
"""

        # Save escalation for manual processing
        escalation = {
            'task_id': task_id,
            'tier': 'tier3_claude',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'file_path': file_path,
            'issue_title': issue_title,
            'issue_body': issue_body,
            'status': 'pending_manual_review'
        }

        escalation_file = self.fixes_dir / f"{task_id}_escalation.json"
        with open(escalation_file, 'w') as f:
            json.dump(escalation, f, indent=2)

        print(f"[{self.agent_id}] [TIER 3] Escalation saved: {escalation_file.name}")

    def _mark_task_fixed(self, task_id: str, tier: str):
        """Mark task as fixed and move to results."""
        task_file = self.tasks_dir / f"{task_id}.json"
        if not task_file.exists():
            return

        # Load task
        with open(task_file) as f:
            task = json.load(f)

        # Update task status
        task['status'] = 'fixed'
        task['fixed_by'] = tier
        task['fixed_at'] = datetime.now(timezone.utc).isoformat()

        # Move to results
        results_dir = self.project_root / 'automation' / 'results'
        results_dir.mkdir(parents=True, exist_ok=True)

        result_file = results_dir / f"{task_id}.json"
        with open(result_file, 'w') as f:
            json.dump(task, f, indent=2)

        # Remove from tasks
        task_file.unlink()

        print(f"[{self.agent_id}] [OK] Task fixed and moved to results")

    def _update_heartbeat(self):
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
        """Print statistics."""
        uptime = datetime.now(timezone.utc) - self.stats['start_time']

        print("\n" + "="*60)
        print(f"{self.agent_id.upper()} STATISTICS")
        print("="*60)
        print(f"Uptime:             {uptime}")
        print(f"Tasks processed:    {self.stats['tasks_processed']}")
        print(f"Tier 1 fixes:       {self.stats['tier1_fixes']}")
        print(f"Tier 2 fixes:       {self.stats['tier2_fixes']}")
        print(f"Tier 3 escalations: {self.stats['tier3_escalations']}")
        print(f"Failed fixes:       {self.stats['failed_fixes']}")
        print("="*60 + "\n")


def load_config() -> Dict:
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


def main():
    """Main entry point."""
    print("="*60)
    print("INTELLIGENT FIXER AGENT")
    print("Justice Companion Multi-Agent System")
    print("="*60)
    print("Mode: 3-Tier Auto-Fix (Regex --> Codex --> Claude)")
    print("="*60)

    # Load config
    config = load_config()

    # Create agent
    agent = IntelligentFixerAgent(config)

    # Start
    agent.start()


if __name__ == '__main__':
    main()
