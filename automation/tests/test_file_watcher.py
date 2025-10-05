#!/usr/bin/env python3
"""
Test suite for FileWatcher
Justice Companion Automation Framework

Tests cover:
- Basic functionality (start, stop, context manager)
- File detection (create, modify, delete)
- Debouncing (batching rapid changes)
- Ignore patterns (pycache, logs, node_modules, etc.)
- Callback behavior (data format, error handling)
- Thread safety (cleanup, multiple cycles)

All tests are designed to be cross-platform compatible, with special
handling for Windows file system event timing.
"""

import os
import time
import json
import tempfile
import threading
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import Mock, patch

import pytest

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from file_watcher import FileWatcher


@pytest.fixture
def temp_watch_dir(tmp_path):
    """Create a temporary directory for watching."""
    watch_dir = tmp_path / "watch_test"
    watch_dir.mkdir()
    return watch_dir


@pytest.fixture
def mock_callback():
    """Create a mock callback function."""
    return Mock()


class TestFileWatcherBasics:
    """Test basic FileWatcher functionality."""

    def test_initialization(self, temp_watch_dir):
        """Test FileWatcher initialization."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=1.0
        )

        assert not watcher.is_running()
        assert watcher.debounce_seconds == 1.0
        assert len(watcher.paths_to_watch) == 1

    def test_start_and_stop(self, temp_watch_dir):
        """Test starting and stopping the watcher."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=1.0
        )

        # Start watcher
        watcher.start()
        assert watcher.is_running()

        # Stop watcher
        watcher.stop()
        assert not watcher.is_running()

    def test_start_already_running(self, temp_watch_dir):
        """Test that starting an already running watcher raises error."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=1.0
        )

        watcher.start()
        try:
            with pytest.raises(RuntimeError, match="already running"):
                watcher.start()
        finally:
            watcher.stop()

    def test_start_nonexistent_path(self):
        """Test that starting with nonexistent path raises error."""
        watcher = FileWatcher(
            paths_to_watch=["/nonexistent/path/that/does/not/exist"],
            debounce_seconds=1.0
        )

        with pytest.raises(FileNotFoundError):
            watcher.start()

    def test_context_manager(self, temp_watch_dir):
        """Test using FileWatcher as context manager."""
        with FileWatcher(paths_to_watch=[str(temp_watch_dir)]) as watcher:
            assert watcher.is_running()

        assert not watcher.is_running()


class TestFileDetection:
    """Test file change detection."""

    def test_detects_file_creation(self, temp_watch_dir, mock_callback):
        """Test that file creation is detected."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for watcher to initialize
        try:
            # Create a file
            test_file = temp_watch_dir / "test.txt"
            test_file.write_text("Hello, World!")

            # Wait for debounce + processing
            time.sleep(1.0)

            # Check callback was called
            assert mock_callback.called
            call_args = mock_callback.call_args[0][0]
            assert call_args['type'] == 'file_change'
            assert any('test.txt' in f for f in call_args['files'])
        finally:
            watcher.stop()

    def test_detects_file_modification(self, temp_watch_dir, mock_callback):
        """Test that file modification is detected."""
        # Create file before starting watcher
        test_file = temp_watch_dir / "existing.txt"
        test_file.write_text("Initial content")

        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for watcher to initialize
        try:
            # Modify the file
            test_file.write_text("Modified content")

            # Wait for debounce + processing
            time.sleep(1.0)

            # Check callback was called
            assert mock_callback.called
            call_args = mock_callback.call_args[0][0]
            assert call_args['type'] == 'file_change'
            assert any('existing.txt' in f for f in call_args['files'])
        finally:
            watcher.stop()

    def test_detects_file_deletion(self, temp_watch_dir, mock_callback):
        """Test that file deletion is detected."""
        # Create file before starting watcher
        test_file = temp_watch_dir / "to_delete.txt"
        test_file.write_text("Delete me")

        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for watcher to initialize
        try:
            # Delete the file
            test_file.unlink()

            # Wait for debounce + processing
            time.sleep(1.0)

            # Check callback was called
            assert mock_callback.called
            call_args = mock_callback.call_args[0][0]
            assert call_args['type'] == 'file_change'
            assert any('to_delete.txt' in f for f in call_args['files'])
        finally:
            watcher.stop()


class TestDebouncing:
    """Test debouncing functionality."""

    def test_debouncing_batches_multiple_changes(self, temp_watch_dir, mock_callback):
        """Test that rapid changes are batched into a single event."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for watcher to initialize
        try:
            # Create multiple files rapidly
            for i in range(5):
                test_file = temp_watch_dir / f"test_{i}.txt"
                test_file.write_text(f"Content {i}")
                time.sleep(0.05)  # Very short delay

            # Wait for debounce period
            time.sleep(1.0)

            # Should be called only once with all files
            assert mock_callback.call_count == 1
            call_args = mock_callback.call_args[0][0]
            assert call_args['type'] == 'file_change'
            # Should have all 5 files (or at least multiple files)
            assert len(call_args['files']) >= 3  # Relaxed assertion for timing
        finally:
            watcher.stop()

    def test_debouncing_resets_timer(self, temp_watch_dir, mock_callback):
        """Test that timer resets with each new event."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for watcher to initialize
        try:
            # Create files with delays less than debounce period
            for i in range(3):
                test_file = temp_watch_dir / f"reset_{i}.txt"
                test_file.write_text(f"Content {i}")
                time.sleep(0.3)  # Less than debounce period

            # Wait for final debounce
            time.sleep(0.8)

            # Should be called only once despite multiple changes
            assert mock_callback.call_count == 1
            call_args = mock_callback.call_args[0][0]
            assert len(call_args['files']) >= 2
        finally:
            watcher.stop()


class TestIgnorePatterns:
    """Test ignore pattern functionality."""

    def test_ignores_pycache(self, temp_watch_dir, mock_callback):
        """Test that __pycache__ directories are ignored."""
        # Create __pycache__ directory
        pycache_dir = temp_watch_dir / "__pycache__"
        pycache_dir.mkdir()

        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        try:
            # Create file in __pycache__
            pyc_file = pycache_dir / "test.pyc"
            pyc_file.write_text("bytecode")

            # Wait for potential callback
            time.sleep(1.0)

            # Callback should not be called
            assert not mock_callback.called
        finally:
            watcher.stop()

    def test_ignores_pyc_files(self, temp_watch_dir, mock_callback):
        """Test that .pyc files are ignored."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        try:
            # Create .pyc file
            pyc_file = temp_watch_dir / "module.pyc"
            pyc_file.write_text("bytecode")

            # Wait for potential callback
            time.sleep(1.0)

            # Callback should not be called
            assert not mock_callback.called
        finally:
            watcher.stop()

    def test_ignores_log_files(self, temp_watch_dir, mock_callback):
        """Test that .log files are ignored."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        try:
            # Create .log file
            log_file = temp_watch_dir / "app.log"
            log_file.write_text("log content")

            # Wait for potential callback
            time.sleep(1.0)

            # Callback should not be called
            assert not mock_callback.called
        finally:
            watcher.stop()

    def test_custom_ignore_patterns(self, temp_watch_dir, mock_callback):
        """Test custom ignore patterns."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback,
            ignore_patterns={'*.ignore', 'test_dir'}
        )

        watcher.start()
        try:
            # Create ignored file
            ignored_file = temp_watch_dir / "test.ignore"
            ignored_file.write_text("ignored")

            # Create non-ignored file
            normal_file = temp_watch_dir / "test.txt"
            normal_file.write_text("not ignored")

            # Wait for callback
            time.sleep(1.0)

            # Should be called only for non-ignored file
            assert mock_callback.called
            call_args = mock_callback.call_args[0][0]
            files = call_args['files']
            assert any('test.txt' in f for f in files)
            assert not any('test.ignore' in f for f in files)
        finally:
            watcher.stop()

    def test_ignores_automation_state_directory(self, temp_watch_dir, mock_callback):
        """Test that automation/state directory is ignored."""
        # Create automation/state directory
        state_dir = temp_watch_dir / "automation" / "state"
        state_dir.mkdir(parents=True)

        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        try:
            # Create file in state directory
            state_file = state_dir / "app_state.json"
            state_file.write_text('{"test": true}')

            # Wait for potential callback
            time.sleep(1.0)

            # Callback should not be called
            assert not mock_callback.called
        finally:
            watcher.stop()


class TestCallbackBehavior:
    """Test callback behavior and data format."""

    def test_callback_receives_correct_format(self, temp_watch_dir, mock_callback):
        """Test that callback receives correctly formatted data."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        try:
            # Create file
            test_file = temp_watch_dir / "format_test.txt"
            test_file.write_text("test")

            # Wait for callback
            time.sleep(1.0)

            # Verify format
            assert mock_callback.called
            call_args = mock_callback.call_args[0][0]

            # Check required fields
            assert 'type' in call_args
            assert 'files' in call_args
            assert 'timestamp' in call_args

            # Check types
            assert call_args['type'] == 'file_change'
            assert isinstance(call_args['files'], list)
            assert isinstance(call_args['timestamp'], str)

            # Check timestamp format (ISO 8601 with Z)
            assert call_args['timestamp'].endswith('Z')
        finally:
            watcher.stop()

    def test_callback_error_doesnt_break_watcher(self, temp_watch_dir):
        """Test that callback errors don't crash the watcher."""
        # Callback that raises error
        def error_callback(data):
            raise ValueError("Callback error!")

        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=error_callback
        )

        watcher.start()
        try:
            # Create file - should not crash
            test_file = temp_watch_dir / "error_test.txt"
            test_file.write_text("test")

            # Wait and create another file
            time.sleep(1.0)
            test_file2 = temp_watch_dir / "error_test2.txt"
            test_file2.write_text("test2")

            time.sleep(1.0)

            # Watcher should still be running
            assert watcher.is_running()
        finally:
            watcher.stop()


class TestThreadSafety:
    """Test thread safety and cleanup."""

    def test_stop_cleans_up_properly(self, temp_watch_dir, mock_callback):
        """Test that stop() cleans up resources properly."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        watcher.start()
        time.sleep(0.5)  # Wait for initialization
        assert watcher.is_running()

        # Create a file and wait for full debounce cycle to complete
        test_file = temp_watch_dir / "test.txt"
        test_file.write_text("test")
        time.sleep(1.5)  # Wait longer than debounce

        # Verify event was processed
        assert mock_callback.called

        # Stop and verify cleanup
        watcher.stop()
        assert not watcher.is_running()

    def test_multiple_start_stop_cycles(self, temp_watch_dir, mock_callback):
        """Test multiple start/stop cycles work correctly."""
        watcher = FileWatcher(
            paths_to_watch=[str(temp_watch_dir)],
            debounce_seconds=0.5,
            callback=mock_callback
        )

        # First cycle
        watcher.start()
        assert watcher.is_running()
        watcher.stop()
        assert not watcher.is_running()

        # Second cycle
        watcher.start()
        assert watcher.is_running()
        watcher.stop()
        assert not watcher.is_running()


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
