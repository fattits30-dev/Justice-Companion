"""
Example usage of StartupMetrics service.

Demonstrates how to track application startup performance and generate reports.
"""

import time
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

from startup_metrics import (
    startup_metrics,
    log_startup_metrics,
    export_startup_metrics,
)


def simulate_application_startup():
    """Simulate a realistic application startup sequence."""
    print("Starting application initialization...\n")

    # Phase 1: App becomes ready
    print("[Phase 1] Application ready...")
    time.sleep(0.05)  # Simulate app initialization
    startup_metrics.record_phase("app_ready")

    # Phase 2: Show loading window
    print("[Phase 2] Showing loading window...")
    time.sleep(0.03)  # Simulate loading window creation
    startup_metrics.record_phase("loading_window_shown")

    # Phase 3: Initialize critical services
    print("[Phase 3] Initializing critical services (database, encryption, auth)...")
    time.sleep(0.15)  # Simulate database and encryption setup
    startup_metrics.record_phase("critical_services_ready")

    # Phase 4: Register critical API handlers
    print("[Phase 4] Registering critical API handlers...")
    time.sleep(0.01)  # Simulate handler registration
    startup_metrics.record_phase("critical_handlers_registered")

    # Phase 5: Create main window
    print("[Phase 5] Creating main window...")
    time.sleep(0.05)  # Simulate window creation
    startup_metrics.record_phase("main_window_created")

    # Phase 6: Show main window to user
    print("[Phase 6] Showing main window...")
    time.sleep(0.05)  # Simulate window visibility
    startup_metrics.record_phase("main_window_shown")

    # Phase 7: Initialize non-critical services (AI, etc.)
    print("[Phase 7] Initializing non-critical services (AI, analytics)...")
    time.sleep(0.20)  # Simulate AI service initialization
    startup_metrics.record_phase("non_critical_services_ready")

    # Phase 8: Register all remaining handlers
    print("[Phase 8] Registering remaining API handlers...")
    time.sleep(0.10)  # Simulate additional handler registration
    startup_metrics.record_phase("all_handlers_registered")

    print("\n" + "=" * 70)
    print("Application startup complete!")
    print("=" * 70 + "\n")


def example_basic_usage():
    """Example 1: Basic usage with automatic logging."""
    print("=" * 70)
    print("Example 1: Basic Usage")
    print("=" * 70 + "\n")

    simulate_application_startup()

    # Log detailed metrics to console
    log_startup_metrics()


def example_export_metrics():
    """Example 2: Export metrics to JSON."""
    print("\n" + "=" * 70)
    print("Example 2: Export Metrics to JSON")
    print("=" * 70 + "\n")

    # Export metrics as JSON string
    json_data = export_startup_metrics()
    print("Exported JSON data:")
    print(json_data)


def example_programmatic_access():
    """Example 3: Programmatic access to metrics."""
    print("\n" + "=" * 70)
    print("Example 3: Programmatic Access")
    print("=" * 70 + "\n")

    # Get metrics as dictionary
    metrics_dict = startup_metrics.get_metrics_dict()

    # Access specific values
    perceived_time = metrics_dict["summary"]["perceived_startup_time"]
    total_time = metrics_dict["summary"]["total_startup_time"]
    performance = metrics_dict["summary"]["performance"]

    print(f"Perceived Startup Time: {perceived_time:.0f}ms")
    print(f"Total Startup Time: {total_time:.0f}ms")
    print(f"Performance Rating: {performance.upper()}")

    # Access phase timings
    print("\nPhase Timings (from app ready):")
    metrics = metrics_dict["metrics"]
    print(f"  - Loading window: {metrics['time_to_loading_window']:.0f}ms")
    print(f"  - Critical services: {metrics['time_to_critical_services']:.0f}ms")
    print(f"  - Main window shown: {metrics['time_to_main_window_shown']:.0f}ms")

    # Performance analysis
    print("\nPerformance Analysis:")
    if performance == "excellent":
        print("  ✅ Startup performance is excellent!")
        print("  ✅ All targets met")
    elif performance == "good":
        print("  ⚠️  Startup performance is good but could be improved")
        print("  💡 Consider optimizing critical service initialization")
    else:
        print("  ❌ Startup performance needs improvement")
        print("  💡 Check recommendations in the detailed metrics above")


def example_custom_instance():
    """Example 4: Using a custom metrics instance."""
    print("\n" + "=" * 70)
    print("Example 4: Custom Metrics Instance")
    print("=" * 70 + "\n")

    from startup_metrics import StartupMetrics

    # Create a custom instance for testing
    custom_metrics = StartupMetrics()

    print("Recording test startup sequence...")
    time.sleep(0.05)
    custom_metrics.record_phase("app_ready")

    time.sleep(0.10)
    custom_metrics.record_phase("critical_services_ready")

    time.sleep(0.15)
    custom_metrics.record_phase("main_window_shown")

    # Log metrics for custom instance
    print("\nCustom instance metrics:")
    custom_metrics.log_startup_metrics()


def example_integration_with_fastapi():
    """Example 5: Integration pattern with FastAPI."""
    print("\n" + "=" * 70)
    print("Example 5: FastAPI Integration Pattern")
    print("=" * 70 + "\n")

    print("""
# Integration with FastAPI backend

from fastapi import FastAPI
from backend.services.startup_metrics import startup_metrics

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    '''Record application startup phases.'''
    startup_metrics.record_phase("app_ready")

    # Initialize database
    await initialize_database()
    startup_metrics.record_phase("critical_services_ready")

    # Register API routes
    register_api_routes()
    startup_metrics.record_phase("critical_handlers_registered")

    # Initialize AI services
    await initialize_ai_services()
    startup_metrics.record_phase("non_critical_services_ready")

    # Log final metrics
    startup_metrics.log_startup_metrics()

@app.get("/api/metrics/startup")
async def get_startup_metrics():
    '''API endpoint to get startup metrics.'''
    return startup_metrics.get_metrics_dict()

@app.get("/api/metrics/startup/export")
async def export_startup_metrics_endpoint():
    '''API endpoint to export metrics as JSON.'''
    from fastapi.responses import JSONResponse
    import json

    json_str = startup_metrics.export_metrics()
    return JSONResponse(content=json.loads(json_str))
    """)


def example_save_metrics_to_file():
    """Example 6: Save metrics to file."""
    print("\n" + "=" * 70)
    print("Example 6: Save Metrics to File")
    print("=" * 70 + "\n")

    import os

    # Export metrics
    json_data = export_startup_metrics()

    # Save to file
    output_dir = "logs"
    os.makedirs(output_dir, exist_ok=True)

    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"startup_metrics_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(json_data)

    print(f"Metrics saved to: {filepath}")
    print(f"File size: {os.path.getsize(filepath)} bytes")


def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("StartupMetrics Service - Usage Examples")
    print("=" * 70 + "\n")

    # Example 1: Basic usage
    example_basic_usage()

    # Example 2: Export to JSON
    example_export_metrics()

    # Example 3: Programmatic access
    example_programmatic_access()

    # Example 4: Custom instance
    example_custom_instance()

    # Example 5: FastAPI integration
    example_integration_with_fastapi()

    # Example 6: Save to file
    example_save_metrics_to_file()

    print("\n" + "=" * 70)
    print("All examples completed successfully!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
