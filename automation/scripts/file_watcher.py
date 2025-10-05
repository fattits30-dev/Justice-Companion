#!/usr/bin/env python3
"""
File Watcher - Debounced File System Monitoring
Justice Companion Automation Framework

Monitors specified directories for file changes and batches events
to avoid overwhelming the system with rapid change notifications.
"""

import os
import time
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Set, Callable, Optional, Dict, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent


class FileWatcher:
    """
    File system watcher with debouncing and ignore patterns.

    Features:
    - Multi-directory monitoring
    - Event debouncing (batches rapid changes)
    - Configurable ignore patterns
    - Thread-safe operation
    - Clean shutdown
    - Cross-platform support
    """

    # Default ignore patterns
    DEFAULT_IGNORE_PATTERNS = {
        '__pycache__',
        '*.pyc',
        'node_modules',
        '.git',
        '*.log',
        '*.lock',
        'automation/state',
        '.pytest_cache',
        '.vscode',
        '.idea',
        '*.tmp',
        'dist',
        'build',
    }

    def __init__(
        self,
        paths_to_watch: List[str],
        debounce_seconds: float = 2.0,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        ignore_patterns: Optional[Set[str]] = None
    ):
        """
        Initialize file watcher.

        Args:
            paths_to_watch: List of directory paths to monitor
            debounce_seconds: Time to wait before processing batched events (default: 2.0)
            callback: Function to call with batched events (receives dict with type, files, timestamp)
            ignore_patterns: Set of patterns to ignore (uses DEFAULT_IGNORE_PATTERNS if None)
        """
        self.paths_to_watch = [Path(p).resolve() for p in paths_to_watch]
        self.debounce_seconds = debounce_seconds
        self.callback = callback
        self.ignore_patterns = ignore_patterns or self.DEFAULT_IGNORE_PATTERNS

        # State
        self._observer: Optional[Observer] = None
        self._event_handler: Optional['_DebouncedEventHandler'] = None
        self._is_running = False
        self._lock = threading.Lock()

    def start(self) -> None:
        """
        Start watching directories.

        Raises:
            RuntimeError: If watcher is already running
            FileNotFoundError: If any watch path doesn't exist
        """
        with self._lock:
            if self._is_running:
                raise RuntimeError("FileWatcher is already running")

            # Validate paths exist
            for path in self.paths_to_watch:
                if not path.exists():
                    raise FileNotFoundError(f"Watch path does not exist: {path}")
                if not path.is_dir():
                    raise ValueError(f"Watch path is not a directory: {path}")

            # Create event handler
            self._event_handler = _DebouncedEventHandler(
                debounce_seconds=self.debounce_seconds,
                callback=self.callback,
                ignore_patterns=self.ignore_patterns
            )

            # Create and configure observer
            self._observer = Observer()
            for path in self.paths_to_watch:
                self._observer.schedule(
                    self._event_handler,
                    str(path),
                    recursive=True
                )

            # Start observer
            self._observer.start()
            self._is_running = True

    def stop(self) -> None:
        """
        Stop watching directories and cleanup resources.

        Waits for debounce timer to complete and processes any pending events.
        """
        with self._lock:
            if not self._is_running:
                return

            # Stop event handler first (processes pending events)
            if self._event_handler:
                self._event_handler.stop()

            # Stop observer
            if self._observer:
                self._observer.stop()
                self._observer.join(timeout=5.0)

            self._is_running = False
            self._observer = None
            self._event_handler = None

    def is_running(self) -> bool:
        """Check if watcher is currently running."""
        with self._lock:
            return self._is_running

    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
        return False


class _DebouncedEventHandler(FileSystemEventHandler):
    """
    Internal event handler that debounces file system events.

    Collects events and batches them after a debounce period to avoid
    processing every single file change individually.
    """

    def __init__(
        self,
        debounce_seconds: float,
        callback: Optional[Callable[[Dict[str, Any]], None]],
        ignore_patterns: Set[str]
    ):
        """
        Initialize event handler.

        Args:
            debounce_seconds: Seconds to wait before processing batch
            callback: Function to call with batched events
            ignore_patterns: Set of patterns to ignore
        """
        super().__init__()
        self.debounce_seconds = debounce_seconds
        self.callback = callback
        self.ignore_patterns = ignore_patterns

        # Event batching
        self._pending_files: Set[str] = set()
        self._timer: Optional[threading.Timer] = None
        self._lock = threading.Lock()
        self._stopped = False

    def _should_ignore(self, path: str) -> bool:
        """
        Check if path matches any ignore pattern.

        Args:
            path: File or directory path to check

        Returns:
            True if path should be ignored
        """
        path_obj = Path(path)
        path_str = str(path_obj)

        for pattern in self.ignore_patterns:
            # Direct name match
            if pattern in path_obj.parts:
                return True

            # Wildcard pattern (*.ext)
            if pattern.startswith('*'):
                ext = pattern[1:]  # Remove *
                if path_str.endswith(ext):
                    return True

            # Path contains pattern
            if pattern in path_str.replace('\\', '/'):
                return True

        return False

    def on_any_event(self, event: FileSystemEvent) -> None:
        """
        Handle any file system event.

        Args:
            event: File system event from watchdog
        """
        # Ignore directory events and ignored paths
        if event.is_directory:
            return

        if self._should_ignore(event.src_path):
            return

        with self._lock:
            if self._stopped:
                return

            # Add to pending files
            self._pending_files.add(event.src_path)

            # Reset debounce timer
            if self._timer:
                self._timer.cancel()

            self._timer = threading.Timer(
                self.debounce_seconds,
                self._process_batch
            )
            self._timer.daemon = True
            self._timer.start()

    def _process_batch(self) -> None:
        """
        Process batched events after debounce period.

        Called by timer after debounce_seconds of inactivity.
        """
        with self._lock:
            if self._stopped or not self._pending_files:
                return

            # Create event payload
            files = sorted(list(self._pending_files))
            event_data = {
                "type": "file_change",
                "files": files,
                "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            }

            # Clear pending files
            self._pending_files.clear()
            self._timer = None

        # Call callback outside lock to avoid deadlock
        if self.callback:
            try:
                self.callback(event_data)
            except Exception as e:
                # Don't let callback errors break the watcher
                print(f"Error in file watcher callback: {e}")

    def stop(self) -> None:
        """
        Stop event handler and process any pending events.
        """
        with self._lock:
            self._stopped = True

            # Cancel pending timer
            if self._timer:
                self._timer.cancel()
                self._timer = None

        # Process any remaining events
        self._process_batch()


# Example usage and testing
if __name__ == '__main__':
    import json

    def on_files_changed(event_data: Dict[str, Any]) -> None:
        """Example callback function."""
        print(f"\n[FILE CHANGE DETECTED]")
        print(f"Timestamp: {event_data['timestamp']}")
        print(f"Files changed ({len(event_data['files'])}):")
        for file_path in event_data['files']:
            print(f"  - {file_path}")

    # Watch current directory
    print("Starting file watcher (watching current directory)...")
    print("Make some file changes to test. Press Ctrl+C to stop.\n")

    watcher = FileWatcher(
        paths_to_watch=['.'],
        debounce_seconds=2.0,
        callback=on_files_changed
    )

    try:
        watcher.start()

        # Keep running until interrupted
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\nStopping file watcher...")
        watcher.stop()
        print("Stopped.")
