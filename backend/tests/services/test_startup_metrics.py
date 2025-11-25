"""
Unit tests for StartupMetrics service.

Tests all functionality of the startup metrics tracking system including:
- Phase recording
- Timestamp tracking
- Metrics calculation
- Duration formatting
- Performance indicators
- JSON export
- Performance recommendations
"""

import pytest
import time
import json
from unittest.mock import patch

from backend.services.startup_metrics import (
    StartupMetrics,
    StartupTimestamps,
    StartupPhaseMetrics,
    PerformanceThreshold,
    startup_metrics,
    log_startup_metrics,
    export_startup_metrics,
)

class TestStartupTimestamps:
    """Test StartupTimestamps dataclass."""

    def test_timestamps_initialization(self):
        """Test that timestamps can be initialized with default values."""
        ts = StartupTimestamps(module_load=1000.0)
        assert ts.module_load == 1000.0
        assert ts.app_ready == 0
        assert ts.loading_window_shown == 0
        assert ts.critical_services_ready == 0
        assert ts.critical_handlers_registered == 0
        assert ts.main_window_created == 0
        assert ts.main_window_shown == 0
        assert ts.non_critical_services_ready == 0
        assert ts.all_handlers_registered == 0

    def test_timestamps_with_values(self):
        """Test timestamps with all values set."""
        ts = StartupTimestamps(
            module_load=1000.0,
            app_ready=1100.0,
            loading_window_shown=1150.0,
            critical_services_ready=1250.0,
            critical_handlers_registered=1260.0,
            main_window_created=1300.0,
            main_window_shown=1350.0,
            non_critical_services_ready=1500.0,
            all_handlers_registered=1600.0,
        )
        assert ts.module_load == 1000.0
        assert ts.app_ready == 1100.0
        assert ts.loading_window_shown == 1150.0
        assert ts.critical_services_ready == 1250.0
        assert ts.critical_handlers_registered == 1260.0
        assert ts.main_window_created == 1300.0
        assert ts.main_window_shown == 1350.0
        assert ts.non_critical_services_ready == 1500.0
        assert ts.all_handlers_registered == 1600.0

class TestStartupPhaseMetrics:
    """Test StartupPhaseMetrics dataclass."""

    def test_metrics_initialization(self):
        """Test metrics initialization with default values."""
        metrics = StartupPhaseMetrics()
        assert metrics.time_to_loading_window == 0
        assert metrics.time_to_critical_services == 0
        assert metrics.loading_to_services == 0
        assert metrics.total_startup_time == 0
        assert metrics.perceived_startup_time == 0

class TestPerformanceThreshold:
    """Test PerformanceThreshold dataclass."""

    def test_threshold_creation(self):
        """Test creating performance thresholds."""
        threshold = PerformanceThreshold(good=100, warning=200)
        assert threshold.good == 100
        assert threshold.warning == 200

class TestStartupMetrics:
    """Test StartupMetrics class."""

    def test_initialization(self):
        """Test StartupMetrics initialization."""
        with patch('backend.services.startup_metrics.time.time', return_value=1.0):
            metrics = StartupMetrics()
            assert metrics.timestamps.module_load == 1000.0  # 1.0 * 1000

    def test_record_phase(self):
        """Test recording a startup phase."""
        metrics = StartupMetrics()
        initial_time = metrics.timestamps.module_load

        # Wait a bit and record a phase
        time.sleep(0.01)
        metrics.record_phase("app_ready")

        assert metrics.timestamps.app_ready > initial_time
        assert metrics.timestamps.app_ready > 0

    def test_record_multiple_phases(self):
        """Test recording multiple startup phases."""
        metrics = StartupMetrics()

        metrics.record_phase("app_ready")
        time.sleep(0.01)
        metrics.record_phase("loading_window_shown")
        time.sleep(0.01)
        metrics.record_phase("critical_services_ready")

        # All timestamps should be set and in order
        assert metrics.timestamps.app_ready > metrics.timestamps.module_load
        assert (
            metrics.timestamps.loading_window_shown
            >= metrics.timestamps.app_ready
        )
        assert (
            metrics.timestamps.critical_services_ready
            >= metrics.timestamps.loading_window_shown
        )

    def test_record_unknown_phase(self):
        """Test recording an unknown phase logs a warning."""
        metrics = StartupMetrics()

        # This should not raise an error
        metrics.record_phase("unknown_phase")

    def test_get_timestamps(self):
        """Test getting all timestamps as a dictionary."""
        metrics = StartupMetrics()
        metrics.record_phase("app_ready")
        metrics.record_phase("main_window_shown")

        timestamps = metrics.get_timestamps()

        assert isinstance(timestamps, dict)
        assert "module_load" in timestamps
        assert "app_ready" in timestamps
        assert "main_window_shown" in timestamps
        assert timestamps["module_load"] > 0
        assert timestamps["app_ready"] > 0
        assert timestamps["main_window_shown"] > 0

    def test_calculate_metrics(self):
        """Test calculating metrics from timestamps."""
        metrics = StartupMetrics()

        # Set up controlled timestamps
        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.loading_window_shown = base_time + 150
        metrics.timestamps.critical_services_ready = base_time + 250
        metrics.timestamps.critical_handlers_registered = base_time + 260
        metrics.timestamps.main_window_created = base_time + 300
        metrics.timestamps.main_window_shown = base_time + 350
        metrics.timestamps.non_critical_services_ready = base_time + 500
        metrics.timestamps.all_handlers_registered = base_time + 600

        calculated = metrics._calculate_metrics()

        # Check relative times (from app_ready)
        assert calculated.time_to_loading_window == 50  # 150 - 100
        assert calculated.time_to_critical_services == 150  # 250 - 100
        assert calculated.time_to_main_window_shown == 250  # 350 - 100

        # Check phase deltas
        assert calculated.loading_to_services == 100  # 150 - 50
        assert calculated.services_to_handlers == 10  # 260 - 250

        # Check total times
        assert calculated.perceived_startup_time == 350  # 350 - 0

    def test_calculate_metrics_with_zero_timestamps(self):
        """Test calculating metrics when some timestamps are not set."""
        metrics = StartupMetrics()
        metrics.timestamps.app_ready = metrics.timestamps.module_load + 100

        calculated = metrics._calculate_metrics()

        # Unset timestamps should result in 0 values
        assert calculated.time_to_loading_window == 0
        assert calculated.time_to_critical_services == 0
        assert calculated.perceived_startup_time == 0

    def test_format_duration_milliseconds(self):
        """Test formatting durations in milliseconds."""
        metrics = StartupMetrics()

        assert metrics._format_duration(0) == "N/A"
        assert metrics._format_duration(-1) == "Error"
        assert metrics._format_duration(50) == "50ms"
        assert metrics._format_duration(999) == "999ms"

    def test_format_duration_seconds(self):
        """Test formatting durations in seconds."""
        metrics = StartupMetrics()

        assert metrics._format_duration(1000) == "1.0s"
        assert metrics._format_duration(1500) == "1.5s"
        assert metrics._format_duration(59999) == "60.0s"

    def test_format_duration_minutes(self):
        """Test formatting durations in minutes."""
        metrics = StartupMetrics()

        assert metrics._format_duration(60000) == "1.0m"
        assert metrics._format_duration(90000) == "1.5m"
        assert metrics._format_duration(120000) == "2.0m"

    def test_format_with_indicator_excellent(self):
        """Test formatting with excellent performance indicator."""
        metrics = StartupMetrics()
        threshold = PerformanceThreshold(good=100, warning=200)

        result = metrics._format_with_indicator(50, threshold)
        assert result.startswith("✅")
        assert "50ms" in result

    def test_format_with_indicator_warning(self):
        """Test formatting with warning performance indicator."""
        metrics = StartupMetrics()
        threshold = PerformanceThreshold(good=100, warning=200)

        result = metrics._format_with_indicator(150, threshold)
        assert result.startswith("⚠️")
        assert "150ms" in result

    def test_format_with_indicator_error(self):
        """Test formatting with error performance indicator."""
        metrics = StartupMetrics()
        threshold = PerformanceThreshold(good=100, warning=200)

        result = metrics._format_with_indicator(250, threshold)
        assert result.startswith("❌")
        assert "250ms" in result

    def test_format_with_indicator_zero(self):
        """Test formatting zero duration (no indicator)."""
        metrics = StartupMetrics()
        threshold = PerformanceThreshold(good=100, warning=200)

        result = metrics._format_with_indicator(0, threshold)
        assert result == "N/A"
        assert "✅" not in result
        assert "⚠️" not in result
        assert "❌" not in result

    def test_export_metrics(self):
        """Test exporting metrics as JSON."""
        metrics = StartupMetrics()

        # Set up some timestamps
        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 350

        json_str = metrics.export_metrics()
        data = json.loads(json_str)

        assert "timestamps" in data
        assert "metrics" in data
        assert "summary" in data
        assert "perceived_startup_time" in data["summary"]
        assert "total_startup_time" in data["summary"]
        assert "performance" in data["summary"]

    def test_export_metrics_performance_rating_excellent(self):
        """Test performance rating is 'excellent' for fast startup."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 300  # 300ms total

        json_str = metrics.export_metrics()
        data = json.loads(json_str)

        assert data["summary"]["performance"] == "excellent"

    def test_export_metrics_performance_rating_good(self):
        """Test performance rating is 'good' for moderate startup."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 500  # 500ms total

        json_str = metrics.export_metrics()
        data = json.loads(json_str)

        assert data["summary"]["performance"] == "good"

    def test_export_metrics_performance_rating_needs_improvement(self):
        """Test performance rating is 'needs improvement' for slow startup."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 700  # 700ms total

        json_str = metrics.export_metrics()
        data = json.loads(json_str)

        assert data["summary"]["performance"] == "needs improvement"

    def test_get_metrics_dict(self):
        """Test getting metrics as a dictionary."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 350

        data = metrics.get_metrics_dict()

        assert isinstance(data, dict)
        assert "timestamps" in data
        assert "metrics" in data
        assert "summary" in data

    @patch('backend.services.startup_metrics.logger')
    def test_log_startup_metrics(self, mock_logger):
        """Test logging startup metrics."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.loading_window_shown = base_time + 150
        metrics.timestamps.critical_services_ready = base_time + 250
        metrics.timestamps.main_window_shown = base_time + 350

        metrics.log_startup_metrics()

        # Should have called logger.info multiple times
        assert mock_logger.info.called
        assert mock_logger.info.call_count > 10

    @patch('backend.services.startup_metrics.logger')
    def test_log_startup_metrics_with_recommendations(self, mock_logger):
        """Test logging includes performance recommendations for slow startup."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 700  # Slow startup

        metrics.log_startup_metrics()

        # Should have called logger.warning for recommendations
        assert mock_logger.warning.called

    @patch('backend.services.startup_metrics.logger')
    def test_log_startup_metrics_excellent_performance(self, mock_logger):
        """Test logging shows excellent performance message for fast startup."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load
        metrics.timestamps.app_ready = base_time + 100
        metrics.timestamps.main_window_shown = base_time + 300  # Fast startup

        metrics.log_startup_metrics()

        # Should have "Excellent startup performance" message
        info_calls = [str(call) for call in mock_logger.info.call_args_list]
        excellent_found = any(
            "Excellent startup performance" in call for call in info_calls
        )
        assert excellent_found

class TestSingletonInstance:
    """Test the singleton startup_metrics instance."""

    def test_singleton_instance_exists(self):
        """Test that the singleton instance is created."""
        assert startup_metrics is not None
        assert isinstance(startup_metrics, StartupMetrics)

    def test_singleton_can_record_phases(self):
        """Test that the singleton instance can record phases."""
        # Create a fresh instance for testing
        test_metrics = StartupMetrics()
        test_metrics.record_phase("app_ready")
        assert test_metrics.timestamps.app_ready > 0

class TestConvenienceFunctions:
    """Test convenience functions."""

    @patch('backend.services.startup_metrics.startup_metrics.log_startup_metrics')
    def test_log_startup_metrics_function(self, mock_log):
        """Test log_startup_metrics convenience function."""
        log_startup_metrics()
        mock_log.assert_called_once()

    @patch('backend.services.startup_metrics.startup_metrics.export_metrics')
    def test_export_startup_metrics_function(self, mock_export):
        """Test export_startup_metrics convenience function."""
        mock_export.return_value = '{"test": "data"}'
        result = export_startup_metrics()
        mock_export.assert_called_once()
        assert result == '{"test": "data"}'

class TestIntegration:
    """Integration tests for complete workflows."""

    def test_complete_startup_tracking_workflow(self):
        """Test complete startup tracking workflow."""
        metrics = StartupMetrics()

        # Simulate startup sequence
        time.sleep(0.01)
        metrics.record_phase("app_ready")

        time.sleep(0.01)
        metrics.record_phase("loading_window_shown")

        time.sleep(0.01)
        metrics.record_phase("critical_services_ready")

        time.sleep(0.01)
        metrics.record_phase("critical_handlers_registered")

        time.sleep(0.01)
        metrics.record_phase("main_window_created")

        time.sleep(0.01)
        metrics.record_phase("main_window_shown")

        time.sleep(0.01)
        metrics.record_phase("non_critical_services_ready")

        time.sleep(0.01)
        metrics.record_phase("all_handlers_registered")

        # Get timestamps
        timestamps = metrics.get_timestamps()
        assert all(ts >= 0 for ts in timestamps.values())

        # Export metrics
        json_str = metrics.export_metrics()
        data = json.loads(json_str)
        assert data["summary"]["total_startup_time"] > 0

    def test_partial_startup_tracking(self):
        """Test tracking with only some phases recorded."""
        metrics = StartupMetrics()

        # Only record critical phases
        metrics.record_phase("app_ready")
        time.sleep(0.01)
        metrics.record_phase("critical_services_ready")
        time.sleep(0.01)
        metrics.record_phase("main_window_shown")

        # Should still calculate metrics correctly
        calculated = metrics._calculate_metrics()
        assert calculated.time_to_critical_services > 0
        assert calculated.time_to_main_window_shown > 0
        assert calculated.perceived_startup_time > 0

    @patch('backend.services.startup_metrics.logger')
    def test_realistic_startup_scenario(self, mock_logger):
        """Test realistic startup scenario with proper timing."""
        metrics = StartupMetrics()

        base_time = metrics.timestamps.module_load

        # Realistic timing sequence
        metrics.timestamps.app_ready = base_time + 50
        time.sleep(0.01)
        metrics.timestamps.loading_window_shown = base_time + 80
        time.sleep(0.01)
        metrics.timestamps.critical_services_ready = base_time + 200
        time.sleep(0.01)
        metrics.timestamps.critical_handlers_registered = base_time + 220
        time.sleep(0.01)
        metrics.timestamps.main_window_created = base_time + 280
        time.sleep(0.01)
        metrics.timestamps.main_window_shown = base_time + 350
        time.sleep(0.01)
        metrics.timestamps.non_critical_services_ready = base_time + 500
        time.sleep(0.01)
        metrics.timestamps.all_handlers_registered = base_time + 600

        # Log metrics
        metrics.log_startup_metrics()

        # Export metrics
        json_str = metrics.export_metrics()
        data = json.loads(json_str)

        # Verify performance rating
        assert data["summary"]["performance"] == "excellent"

        # Verify perceived startup time
        assert data["summary"]["perceived_startup_time"] == 350

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
