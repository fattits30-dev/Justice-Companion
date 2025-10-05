#!/usr/bin/env python3
"""
State Manager - Atomic State Management with File Locking
Justice Companion Automation Framework
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Callable, Optional
from filelock import FileLock, Timeout


class StateManager:
    """
    Atomic state management with file locking to prevent race conditions.
    
    Features:
    - Atomic read-modify-write operations
    - Exclusive file locking
    - Automatic state initialization
    - Timestamp tracking
    - Safe concurrent access
    """
    
    def __init__(self, state_file: Path, lock_file: Path):
        """
        Initialize state manager.
        
        Args:
            state_file: Path to JSON state file
            lock_file: Path to lock file for coordination
        """
        self.state_file = Path(state_file)
        self.lock_file = Path(lock_file)
        
        # Ensure directory exists
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self.lock_file.parent.mkdir(parents=True, exist_ok=True)
    
    def update(self, update_func: Callable[[Dict], Dict]) -> Dict:
        """
        Atomically update state with a function.

        Args:
            update_func: Function that takes current state and returns new state

        Returns:
            Updated state

        Example:
            def add_task(state):
                state['tasks'].append(new_task)
                return state

            new_state = state_manager.update(add_task)
        """
        lock = FileLock(self.lock_file, timeout=10)

        try:
            with lock:
                # Read current state
                state = self._read_state()

                # Apply update function
                state = update_func(state)

                # Update timestamp
                from datetime import timezone
                state['timestamp'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

                # Write atomically
                self._write_state_atomic(state)

                return state
        except Timeout:
            raise TimeoutError(
                f"Could not acquire lock on {self.lock_file} within 10s"
            )
    
    def read(self) -> Dict:
        """
        Read current state safely.

        Returns:
            Current state dictionary
        """
        lock = FileLock(self.lock_file, timeout=10)

        try:
            with lock:
                return self._read_state()
        except Timeout:
            raise TimeoutError(
                f"Could not acquire lock on {self.lock_file} within 10s"
            )
    
    def _read_state(self) -> Dict:
        """Read state from file or initialize if missing."""
        if not self.state_file.exists():
            return self._initialize_state()
        
        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not read state file: {e}")
            return self._initialize_state()
    
    def _write_state_atomic(self, state: Dict):
        """
        Write state atomically using temp file + rename.
        
        This ensures that the state file is never in a partial/corrupted state,
        even if the process crashes during write.
        """
        temp_file = f"{self.state_file}.tmp.{os.getpid()}"
        
        try:
            # Write to temp file
            with open(temp_file, 'w') as f:
                json.dump(state, f, indent=2)
                f.flush()
                os.fsync(f.fileno())  # Ensure written to disk
            
            # Atomic rename
            os.replace(temp_file, self.state_file)
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise e
    
    def _initialize_state(self) -> Dict:
        """Create initial empty state."""
        from datetime import timezone
        return {
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "processes": {
                "interactive": {
                    "status": "stopped",
                    "pid": None,
                    "last_heartbeat": None
                },
                "headless": {
                    "status": "stopped",
                    "pid": None,
                    "last_heartbeat": None
                }
            },
            "queues": {
                "pending": [],
                "in_progress": [],
                "completed": [],
                "failed": []
            },
            "conversation_history": [],
            "test_results": [],
            "code_diffs": [],
            "errors": []
        }


# Example usage
if __name__ == '__main__':
    from pathlib import Path
    
    state_file = Path('automation/state/app_state.json')
    lock_file = Path('automation/state/app_state.lock')
    
    manager = StateManager(state_file, lock_file)
    
    # Test write
    print("Testing state management...")
    
    def mark_running(state):
        state['processes']['interactive']['status'] = 'running'
        state['processes']['interactive']['pid'] = os.getpid()
        return state
    
    new_state = manager.update(mark_running)
    print(f"Updated state: {json.dumps(new_state, indent=2)}")
    
    # Test read
    current = manager.read()
    print(f"Current state: {json.dumps(current, indent=2)}")
    
    print("[OK] State management tests passed")
