"""
Standalone test for startup_metrics module.
This test file doesn't import from the services package to avoid dependency issues.
"""

import json
import os
import sys
import time

# Set UTF-8 encoding for Windows console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the module directly
import importlib.util

spec = importlib.util.spec_from_file_location(
    "startup_metrics",
    os.path.join(os.path.dirname(__file__), "services", "startup_metrics.py"),
)
if spec is None or spec.loader is None:
    raise ImportError("Unable to load startup_metrics module specification")

startup_metrics_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup_metrics_module)

# Import classes
StartupMetrics = startup_metrics_module.StartupMetrics
StartupTimestamps = startup_metrics_module.StartupTimestamps
StartupPhaseMetrics = startup_metrics_module.StartupPhaseMetrics
PerformanceThreshold = startup_metrics_module.PerformanceThreshold

def test_basic_functionality():
    """Test basic functionality of StartupMetrics."""
    print("Testing StartupMetrics basic functionality...")

    # Test 1: Initialization
    metrics = StartupMetrics()
    assert metrics.timestamps.module_load > 0, "Module load timestamp not set"
    print("✅ Test 1: Initialization passed")

    # Test 2: Record phases
    time.sleep(0.01)
    metrics.record_phase("app_ready")
    assert metrics.timestamps.app_ready > 0, "app_ready not recorded"
    print("✅ Test 2: Record phase passed")

    # Test 3: Get timestamps
    timestamps = metrics.get_timestamps()
    assert isinstance(timestamps, dict), "Timestamps not returned as dict"
    assert "module_load" in timestamps, "module_load not in timestamps"
    assert "app_ready" in timestamps, "app_ready not in timestamps"
    print("✅ Test 3: Get timestamps passed")

    # Test 4: Format duration
    assert metrics._format_duration(0) == "N/A", "Zero duration not formatted correctly"
    assert metrics._format_duration(-1) == "Error", "Negative duration not formatted correctly"
    assert metrics._format_duration(50) == "50ms", "Milliseconds not formatted correctly"
    assert metrics._format_duration(1000) == "1.0s", "Seconds not formatted correctly"
    assert metrics._format_duration(60000) == "1.0m", "Minutes not formatted correctly"
    print("✅ Test 4: Format duration passed")

    # Test 5: Performance indicators
    threshold = PerformanceThreshold(good=100, warning=200)
    result = metrics._format_with_indicator(50, threshold)
    assert "✅" in result, "Excellent indicator not shown"

    result = metrics._format_with_indicator(150, threshold)
    assert "⚠️" in result, "Warning indicator not shown"

    result = metrics._format_with_indicator(250, threshold)
    assert "❌" in result, "Error indicator not shown"
    print("✅ Test 5: Performance indicators passed")

    # Test 6: Calculate metrics
    base_time = metrics.timestamps.module_load
    metrics.timestamps.app_ready = base_time + 100
    metrics.timestamps.loading_window_shown = base_time + 150
    metrics.timestamps.critical_services_ready = base_time + 250
    metrics.timestamps.main_window_shown = base_time + 350

    calculated = metrics._calculate_metrics()
    assert calculated.time_to_loading_window == 50, "time_to_loading_window incorrect"
    assert calculated.time_to_critical_services == 150, "time_to_critical_services incorrect"
    assert calculated.perceived_startup_time == 350, "perceived_startup_time incorrect"
    print("✅ Test 6: Calculate metrics passed")

    # Test 7: Export metrics
    json_str = metrics.export_metrics()
    data = json.loads(json_str)
    assert "timestamps" in data, "timestamps not in export"
    assert "metrics" in data, "metrics not in export"
    assert "summary" in data, "summary not in export"
    assert "performance" in data["summary"], "performance rating not in summary"
    print("✅ Test 7: Export metrics passed")

    # Test 8: Performance rating
    metrics2 = StartupMetrics()
    base_time2 = metrics2.timestamps.module_load
    metrics2.timestamps.app_ready = base_time2 + 100
    metrics2.timestamps.main_window_shown = base_time2 + 300  # Fast startup

    json_str2 = metrics2.export_metrics()
    data2 = json.loads(json_str2)
    assert data2["summary"]["performance"] == "excellent", "Performance rating not correct for fast startup"
    print("✅ Test 8: Performance rating passed")

    # Test 9: Get metrics dict
    metrics_dict = metrics.get_metrics_dict()
    assert isinstance(metrics_dict, dict), "Metrics dict not returned as dict"
    assert "timestamps" in metrics_dict, "timestamps not in metrics dict"
    assert "metrics" in metrics_dict, "metrics not in metrics dict"
    print("✅ Test 9: Get metrics dict passed")

    # Test 10: Log startup metrics (just verify it doesn't crash)
    try:
        metrics.log_startup_metrics()
        print("✅ Test 10: Log startup metrics passed")
    except Exception as exc:
        print(f"❌ Test 10 failed: {e}")
        raise

def test_complete_workflow():
    """Test complete startup tracking workflow."""
    print("\nTesting complete startup workflow...")

    metrics = StartupMetrics()

    # Simulate realistic startup sequence
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

    # Verify all timestamps are set
    timestamps = metrics.get_timestamps()
    assert all(ts >= 0 for ts in timestamps.values()), "Not all timestamps set"

    # Export and verify
    json_str = metrics.export_metrics()
    data = json.loads(json_str)
    assert data["summary"]["total_startup_time"] > 0, "Total startup time not calculated"

    print("✅ Complete workflow test passed")

def test_singleton_instance():
    """Test the singleton instance."""
    print("\nTesting singleton instance...")

    startup_metrics = startup_metrics_module.startup_metrics
    assert startup_metrics is not None, "Singleton instance not created"
    assert isinstance(startup_metrics, StartupMetrics), "Singleton not StartupMetrics instance"

    # Test convenience functions
    log_startup_metrics = startup_metrics_module.log_startup_metrics
    export_startup_metrics = startup_metrics_module.export_startup_metrics

    assert callable(log_startup_metrics), "log_startup_metrics not callable"
    assert callable(export_startup_metrics), "export_startup_metrics not callable"

    print("✅ Singleton instance test passed")

def main():
    """Run all tests."""
    print("=" * 70)
    print("StartupMetrics Standalone Test Suite")
    print("=" * 70)

    try:
        test_basic_functionality()
        test_complete_workflow()
        test_singleton_instance()

        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        return 0
    except AssertionError as e:
        print("\n" + "=" * 70)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 70)
        return 1
    except Exception as exc:
        print("\n" + "=" * 70)
        print(f"❌ UNEXPECTED ERROR: {e}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
