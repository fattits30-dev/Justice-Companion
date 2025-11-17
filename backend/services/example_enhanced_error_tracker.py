"""
Example usage of EnhancedErrorTracker

Demonstrates:
- Basic error tracking
- Custom configuration
- Metrics retrieval
- Alert handling
- Exception tracking
- Cleanup operations
"""

import asyncio
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.enhanced_error_tracker import (
    EnhancedErrorTracker,
    track_error,
)


async def basic_error_tracking():
    """Example 1: Basic error tracking"""
    print("\n=== Example 1: Basic Error Tracking ===\n")

    tracker = EnhancedErrorTracker()

    # Track a simple error
    await tracker.track_error(
        {
            "name": "DatabaseError",
            "message": "Failed to connect to database",
            "level": "error",
        }
    )

    # Track an error with context
    await tracker.track_error(
        {
            "name": "ValidationError",
            "message": "Invalid email format",
            "level": "warning",
            "context": {
                "user_id": "user-123",
                "component": "UserRegistration",
                "operation": "validate_email",
            },
        }
    )

    # Track a critical error with stack trace
    await tracker.track_error(
        {
            "name": "SystemError",
            "message": "Out of memory",
            "level": "critical",
            "stack": "SystemError: Out of memory\n    at allocate (memory.py:42:10)",
            "context": {
                "component": "MemoryManager",
            },
        }
    )

    # Get statistics
    stats = tracker.get_stats()
    print(f"Total errors tracked: {stats.total_errors}")
    print(f"Error groups: {stats.total_groups}")
    print(f"Average processing time: {stats.avg_processing_time:.2f}ms")
    print(f"Memory usage: {stats.memory_usage:.2f}MB")


async def error_grouping_demo():
    """Example 2: Error grouping demonstration"""
    print("\n=== Example 2: Error Grouping ===\n")

    tracker = EnhancedErrorTracker()

    # Track the same error multiple times with different values
    for user_id in [101, 102, 103, 104, 105]:
        await tracker.track_error(
            {
                "name": "NotFoundError",
                "message": f"User {user_id} not found",
                "level": "error",
                "context": {
                    "user_id": f"user-{user_id}",
                    "component": "UserService",
                },
            }
        )

    # All errors should be grouped together (numbers are normalized)
    print(f"Total errors tracked: {tracker.stats.total_errors}")
    print(f"Error groups created: {tracker.stats.total_groups}")
    print(f"\nExpected: 5 errors in 1 group (same pattern)")

    # Get the error group
    for fingerprint, group in tracker.error_groups.items():
        print(f"\nGroup fingerprint: {fingerprint}")
        print(f"Pattern: {group.pattern}")
        print(f"Count: {group.count}")
        print(f"First seen: {time.ctime(group.first_seen / 1000)}")
        print(f"Last seen: {time.ctime(group.last_seen / 1000)}")


async def rate_limiting_demo():
    """Example 3: Rate limiting demonstration"""
    print("\n=== Example 3: Rate Limiting ===\n")

    # Create tracker with low rate limit for demo
    tracker = EnhancedErrorTracker(
        config={
            "rate_limit": {
                "max_errors_per_group": 5,
                "max_total_errors": 100,
                "window_ms": 60000,
            }
        }
    )

    # Try to track the same error 10 times
    print("Tracking same error 10 times...")
    for i in range(10):
        await tracker.track_error(
            {
                "name": "RateLimitTest",
                "message": "Test error",
            }
        )

    stats = tracker.get_stats()
    print(f"\nTotal errors tracked: {stats.total_errors}")
    print(f"Errors rate limited: {stats.errors_rate_limited}")
    print(f"Expected: ~5 tracked, ~5 rate limited")


async def sampling_demo():
    """Example 4: Error sampling demonstration"""
    print("\n=== Example 4: Error Sampling ===\n")

    tracker = EnhancedErrorTracker()

    # Track many debug errors (1% sampling rate)
    print("Tracking 100 debug errors (1% sampling rate)...")
    for i in range(100):
        await tracker.track_error(
            {
                "name": "DebugMessage",
                "message": f"Debug message {i}",
                "level": "debug",
            }
        )

    # Track critical errors (100% sampling rate)
    print("Tracking 10 critical errors (100% sampling rate)...")
    for i in range(10):
        await tracker.track_error(
            {
                "name": "CriticalError",
                "message": f"Critical error {i}",
                "level": "critical",
            }
        )

    stats = tracker.get_stats()
    print(f"\nTotal errors tracked: {stats.total_errors}")
    print(f"Errors sampled out: {stats.errors_sampled}")
    print(f"Expected: ~11 tracked (1 debug + 10 critical), ~99 sampled")


async def alert_demo():
    """Example 5: Alert triggering demonstration"""
    print("\n=== Example 5: Alert Triggering ===\n")

    tracker = EnhancedErrorTracker()

    # Track same error 10 times to trigger alert
    print("Tracking same error 10 times to trigger alert...")
    for i in range(10):
        await tracker.track_error(
            {
                "name": "RepeatedError",
                "message": "This error keeps happening",
                "level": "error",
            }
        )

    stats = tracker.get_stats()
    print(f"\nAlerts triggered: {stats.alerts_triggered}")
    print(f"Expected: 1 alert at threshold of 10 errors")

    # Track 10 more to trigger another alert
    print("\nTracking 10 more errors...")
    for i in range(10):
        await tracker.track_error(
            {
                "name": "RepeatedError",
                "message": "This error keeps happening",
                "level": "error",
            }
        )

    stats = tracker.get_stats()
    print(f"Alerts triggered: {stats.alerts_triggered}")
    print(f"Expected: 2 alerts (at 10 and 20 errors)")


async def metrics_demo():
    """Example 6: Metrics retrieval demonstration"""
    print("\n=== Example 6: Metrics Retrieval ===\n")

    tracker = EnhancedErrorTracker()

    # Track various errors
    await tracker.track_error(
        {
            "name": "DatabaseError",
            "message": "Connection failed",
            "level": "error",
            "context": {"user_id": "user-1"},
        }
    )

    await tracker.track_error(
        {
            "name": "ValidationError",
            "message": "Invalid input",
            "level": "warning",
            "context": {"user_id": "user-2"},
        }
    )

    await tracker.track_error(
        {
            "name": "DatabaseError",
            "message": "Query timeout",
            "level": "error",
            "context": {"user_id": "user-1"},
        }
    )

    # Get metrics
    metrics = await tracker.get_metrics(time_range="1h")

    print(f"Total errors: {metrics.total_errors}")
    print(f"Error rate: {metrics.error_rate:.4f}")
    print(f"Affected users: {metrics.affected_users}")
    print(f"MTTR: {metrics.mttr / 1000 / 60:.1f} minutes")

    print("\nError Distribution:")
    for dist in metrics.error_distribution:
        print(f"  {dist.type}: {dist.count} ({dist.percentage:.1f}%)")

    print("\nTop Errors:")
    for error in metrics.top_errors:
        print(f"  {error.message[:50]}... (count: {error.count})")

    print(f"\nRecent Errors: {len(metrics.recent_errors)}")


async def exception_tracking_demo():
    """Example 7: Tracking Python exceptions"""
    print("\n=== Example 7: Exception Tracking ===\n")

    tracker = EnhancedErrorTracker()

    # Track a caught exception
    try:
        # Simulate an error
        result = 10 / 0
    except ZeroDivisionError as e:
        print("Caught ZeroDivisionError, tracking...")
        await track_error(
            tracker,
            e,
            level="error",
            context={
                "component": "Calculator",
                "operation": "divide",
            },
        )

    # Track a validation error
    try:
        raise ValueError("Invalid email format: missing @")
    except ValueError as e:
        print("Caught ValueError, tracking...")
        await track_error(
            tracker,
            e,
            level="warning",
            context={
                "component": "UserValidator",
                "operation": "validate_email",
                "input": "invalid-email",
            },
        )

    stats = tracker.get_stats()
    print(f"\nTotal errors tracked: {stats.total_errors}")
    print(f"Error groups: {stats.total_groups}")

    # Show error details
    for fingerprint, group in tracker.error_groups.items():
        print(f"\nGroup: {group.pattern}")
        print(f"  Count: {group.count}")
        print(f"  First error: {group.errors[0].name}")


async def cleanup_demo():
    """Example 8: Cleanup operations"""
    print("\n=== Example 8: Cleanup Operations ===\n")

    tracker = EnhancedErrorTracker()

    # Track some errors
    print("Tracking 5 errors...")
    for i in range(5):
        await tracker.track_error(
            {
                "message": f"Error {i}",
            }
        )

    print(f"Error groups: {len(tracker.error_groups)}")

    # Clear all groups
    print("\nClearing all error groups...")
    tracker.clear_groups()
    print(f"Error groups after clear: {len(tracker.error_groups)}")

    # Track more errors
    print("\nTracking 3 more errors...")
    for i in range(3):
        await tracker.track_error(
            {
                "message": f"New error {i}",
            }
        )

    print(f"Error groups: {len(tracker.error_groups)}")

    # Simulate old error group
    print("\nSimulating old error group (>24 hours old)...")
    for group in tracker.error_groups.values():
        group.last_seen = time.time() * 1000 - (25 * 60 * 60 * 1000)  # 25 hours ago

    # Run cleanup
    print("Running cleanup...")
    tracker.cleanup()
    print(f"Error groups after cleanup: {len(tracker.error_groups)}")


async def custom_config_demo():
    """Example 9: Custom configuration"""
    print("\n=== Example 9: Custom Configuration ===\n")

    # Create tracker with custom config
    config = {
        "sampling": {
            "critical": 1.0,
            "error": 1.0,
            "warning": 0.8,  # 80% of warnings
            "info": 0.3,  # 30% of info
            "debug": 0.05,  # 5% of debug
        },
        "rate_limit": {
            "max_errors_per_group": 50,
            "max_total_errors": 500,
            "window_ms": 30000,  # 30 seconds
        },
        "enable_performance_monitoring": True,
        "performance_monitoring_interval": 30000,
    }

    tracker = EnhancedErrorTracker(config=config)

    print("Tracker configured with custom settings:")
    print(f"  Warning sampling: {tracker.config.sampling.warning * 100}%")
    print(f"  Info sampling: {tracker.config.sampling.info * 100}%")
    print(f"  Debug sampling: {tracker.config.sampling.debug * 100}%")
    print(f"  Max errors per group: {tracker.config.rate_limit.max_errors_per_group}")
    print(f"  Rate limit window: {tracker.config.rate_limit.window_ms}ms")

    # Track some errors
    print("\nTracking 10 info messages...")
    for i in range(10):
        await tracker.track_error(
            {
                "message": f"Info message {i}",
                "level": "info",
            }
        )

    stats = tracker.get_stats()
    print(f"\nTracked: {stats.total_errors} (~3 expected with 30% sampling)")
    print(f"Sampled: {stats.errors_sampled}")


async def performance_monitoring_demo():
    """Example 10: Performance monitoring"""
    print("\n=== Example 10: Performance Monitoring ===\n")

    tracker = EnhancedErrorTracker()

    # Track errors and measure performance
    print("Tracking 100 errors and measuring performance...")
    start_time = time.time()

    for i in range(100):
        await tracker.track_error(
            {
                "name": f"Error{i % 5}",  # 5 different error types
                "message": f"Test error {i}",
                "level": "error",
            }
        )

    elapsed = time.time() - start_time

    stats = tracker.get_stats()
    print(f"\nTotal time: {elapsed * 1000:.2f}ms")
    print(f"Average processing time: {stats.avg_processing_time:.2f}ms")
    print(f"Throughput: {100 / elapsed:.2f} errors/sec")
    print(f"Memory usage: {stats.memory_usage:.2f}MB")
    print(f"Error groups created: {stats.total_groups}")


async def main():
    """Run all examples"""
    print("=" * 60)
    print("Enhanced Error Tracker - Example Usage")
    print("=" * 60)

    examples = [
        basic_error_tracking,
        error_grouping_demo,
        rate_limiting_demo,
        sampling_demo,
        alert_demo,
        metrics_demo,
        exception_tracking_demo,
        cleanup_demo,
        custom_config_demo,
        performance_monitoring_demo,
    ]

    for example in examples:
        try:
            await example()
            await asyncio.sleep(0.1)  # Small delay between examples
        except Exception as e:
            print(f"\nError in {example.__name__}: {e}")

    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
