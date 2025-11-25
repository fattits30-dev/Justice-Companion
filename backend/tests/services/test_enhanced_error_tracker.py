"""
Test suite for EnhancedErrorTracker

Tests all functionality including:
- Error normalization and fingerprinting
- Rate limiting and sampling
- Error grouping and deduplication
- Alert triggering
- Metrics calculation
- Memory usage tracking
- Cleanup operations
"""

import pytest
import asyncio
import time

from backend.services.enhanced_error_tracker import (
    EnhancedErrorTracker,
    track_error,
)

@pytest.fixture
def tracker():
    """Create a fresh error tracker for each test"""
    return EnhancedErrorTracker()

@pytest.fixture
def custom_tracker():
    """Create a tracker with custom configuration"""
    config = {
        "sampling": {
            "critical": 1.0,
            "error": 1.0,
            "warning": 1.0,  # 100% for testing
            "info": 1.0,     # 100% for testing
            "debug": 1.0,    # 100% for testing
        },
        "rate_limit": {
            "max_errors_per_group": 5,
            "max_total_errors": 100,
            "window_ms": 60000,
        }
    }
    return EnhancedErrorTracker(config=config)

class TestErrorNormalization:
    """Test error data normalization"""

    @pytest.mark.asyncio
    async def test_normalize_minimal_error(self, tracker):
        """Test normalization with minimal error data"""
        await tracker.track_error({
            "message": "Test error"
        })

        assert tracker.stats.total_errors == 1
        assert len(tracker.error_groups) == 1

        # Get the error from the group
        group = list(tracker.error_groups.values())[0]
        error = group.errors[0]

        assert error.name == "Error"
        assert error.message == "Test error"
        assert error.level == "error"
        assert error.id is not None
        assert error.timestamp is not None

    @pytest.mark.asyncio
    async def test_normalize_complete_error(self, tracker):
        """Test normalization with complete error data"""
        await tracker.track_error({
            "id": "custom-id",
            "name": "CustomError",
            "message": "Custom error message",
            "stack": "Error: Custom error\n    at testFunction (test.py:10:5)",
            "level": "critical",
            "context": {
                "user_id": "user123",
                "component": "TestComponent",
            },
            "tags": {"environment": "test"},
        })

        group = list(tracker.error_groups.values())[0]
        error = group.errors[0]

        assert error.id == "custom-id"
        assert error.name == "CustomError"
        assert error.message == "Custom error message"
        assert error.level == "critical"
        assert error.context.user_id == "user123"
        assert error.context.component == "TestComponent"
        assert error.tags["environment"] == "test"

class TestFingerprinting:
    """Test error fingerprinting and grouping"""

    @pytest.mark.asyncio
    async def test_same_fingerprint_groups_errors(self, tracker):
        """Test that similar errors get the same fingerprint"""
        # Track same error twice
        for _ in range(2):
            await tracker.track_error({
                "name": "DatabaseError",
                "message": "Connection timeout",
                "context": {"component": "DatabaseService"},
            })

        # Should create only one group
        assert len(tracker.error_groups) == 1
        group = list(tracker.error_groups.values())[0]
        assert group.count == 2

    @pytest.mark.asyncio
    async def test_different_errors_different_fingerprints(self, tracker):
        """Test that different errors get different fingerprints"""
        await tracker.track_error({
            "name": "DatabaseError",
            "message": "Connection timeout",
        })

        await tracker.track_error({
            "name": "ValidationError",
            "message": "Invalid input",
        })

        # Should create two groups
        assert len(tracker.error_groups) == 2

    @pytest.mark.asyncio
    async def test_normalize_dynamic_values(self, tracker):
        """Test that dynamic values are normalized for grouping"""
        # These errors differ only in dynamic values
        await tracker.track_error({
            "name": "NotFoundError",
            "message": "User 12345 not found",
        })

        await tracker.track_error({
            "name": "NotFoundError",
            "message": "User 67890 not found",
        })

        # Should create only one group (numbers normalized)
        assert len(tracker.error_groups) == 1
        group = list(tracker.error_groups.values())[0]
        assert group.count == 2

class TestRateLimiting:
    """Test rate limiting functionality"""

    @pytest.mark.asyncio
    async def test_rate_limit_per_group(self, custom_tracker):
        """Test that rate limiting works per error group"""
        # Track same error beyond rate limit
        for i in range(10):
            await custom_tracker.track_error({
                "name": "TestError",
                "message": "Rate limit test",
            })

        # Should only track up to max_errors_per_group (5)
        group = list(custom_tracker.error_groups.values())[0]
        assert group.count <= custom_tracker.config.rate_limit.max_errors_per_group
        assert custom_tracker.stats.errors_rate_limited > 0

    @pytest.mark.asyncio
    async def test_rate_limit_resets(self, custom_tracker):
        """Test that rate limiter resets after window"""
        # Track errors up to limit
        for _ in range(5):
            await custom_tracker.track_error({
                "message": "Test error"
            })

        initial_count = custom_tracker.stats.total_errors

        # Simulate window expiration by manipulating rate limiter
        for limiter in custom_tracker.rate_limiters.values():
            limiter.reset_at = 0  # Force reset

        # Track one more error
        await custom_tracker.track_error({
            "message": "Test error"
        })

        # Should be tracked (rate limit reset)
        assert custom_tracker.stats.total_errors > initial_count

class TestSampling:
    """Test error sampling functionality"""

    @pytest.mark.asyncio
    async def test_critical_errors_always_tracked(self, tracker):
        """Test that critical errors are always tracked (100% sampling)"""
        # Track multiple critical errors
        for _ in range(10):
            await tracker.track_error({
                "message": "Critical error",
                "level": "critical",
            })

        # All should be tracked
        assert tracker.stats.total_errors == 10
        assert tracker.stats.errors_sampled == 0

    @pytest.mark.asyncio
    async def test_debug_errors_heavily_sampled(self, tracker):
        """Test that debug errors are heavily sampled"""
        # Track many debug errors
        for _ in range(100):
            await tracker.track_error({
                "message": "Debug message",
                "level": "debug",
            })

        # Most should be sampled out (1% sampling rate)
        assert tracker.stats.errors_sampled > 50
        assert tracker.stats.total_errors < 20

class TestErrorGrouping:
    """Test error grouping functionality"""

    @pytest.mark.asyncio
    async def test_error_group_creation(self, tracker):
        """Test that error groups are created correctly"""
        await tracker.track_error({
            "name": "TestError",
            "message": "Test message",
        })

        assert len(tracker.error_groups) == 1
        assert tracker.stats.total_groups == 1

        group = list(tracker.error_groups.values())[0]
        assert group.count == 1
        assert len(group.errors) == 1
        assert group.first_seen > 0
        assert group.last_seen > 0

    @pytest.mark.asyncio
    async def test_error_group_update(self, tracker):
        """Test that error groups are updated correctly"""
        # Track same error multiple times
        for i in range(3):
            await tracker.track_error({
                "message": f"Test error {i}",  # Different message but will normalize
            })
            await asyncio.sleep(0.01)  # Small delay to ensure different timestamps

        # Should have one group
        assert len(tracker.error_groups) == 1
        group = list(tracker.error_groups.values())[0]

        # Group should be updated
        assert group.count == 3
        assert len(group.errors) == 3
        assert group.last_seen > group.first_seen

    @pytest.mark.asyncio
    async def test_error_group_limits_history(self, tracker):
        """Test that error groups limit stored errors to 10"""
        # Track same error 15 times
        for _ in range(15):
            await tracker.track_error({
                "message": "Test error",
            })

        group = list(tracker.error_groups.values())[0]

        # Should only keep last 10 errors
        assert group.count == 15
        assert len(group.errors) <= 10

class TestAlerts:
    """Test alert functionality"""

    @pytest.mark.asyncio
    async def test_alert_triggered_on_threshold(self, tracker):
        """Test that alerts are triggered when threshold is reached"""
        # Track same error 10 times (threshold)
        for _ in range(10):
            await tracker.track_error({
                "message": "Alert test error",
            })

        # Alert should be triggered
        assert tracker.stats.alerts_triggered >= 1

    @pytest.mark.asyncio
    async def test_alert_triggered_on_multiples(self, tracker):
        """Test that alerts are triggered on multiples of threshold"""
        # Track same error 20 times
        for _ in range(20):
            await tracker.track_error({
                "message": "Alert test error",
            })

        # Should trigger alerts at 10 and 20
        assert tracker.stats.alerts_triggered >= 2

class TestMetrics:
    """Test metrics calculation"""

    @pytest.mark.asyncio
    async def test_get_metrics_basic(self, tracker):
        """Test basic metrics calculation"""
        # Track some errors
        await tracker.track_error({
            "name": "Error1",
            "message": "Test error 1",
        })

        await tracker.track_error({
            "name": "Error2",
            "message": "Test error 2",
        })

        metrics = await tracker.get_metrics(time_range="1h")

        assert metrics.total_errors == 2
        assert len(metrics.error_distribution) == 2
        assert len(metrics.top_errors) == 2
        assert len(metrics.recent_errors) == 2

    @pytest.mark.asyncio
    async def test_get_metrics_with_time_range(self, tracker):
        """Test metrics calculation with different time ranges"""
        # Track an error
        await tracker.track_error({
            "message": "Test error",
        })

        # Test different time ranges
        for time_range in ["1h", "6h", "24h", "7d", "30d"]:
            metrics = await tracker.get_metrics(time_range=time_range)
            assert metrics.total_errors >= 0

    @pytest.mark.asyncio
    async def test_error_distribution(self, tracker):
        """Test error distribution calculation"""
        # Track multiple error types
        await tracker.track_error({"name": "Error1", "message": "Test 1"})
        await tracker.track_error({"name": "Error1", "message": "Test 1"})
        await tracker.track_error({"name": "Error2", "message": "Test 2"})

        metrics = await tracker.get_metrics()

        # Should have distribution for both error types
        assert len(metrics.error_distribution) == 2

        # Error1 should have higher count
        error1_dist = next(d for d in metrics.error_distribution if d.type == "Error1")
        error2_dist = next(d for d in metrics.error_distribution if d.type == "Error2")

        assert error1_dist.count == 2
        assert error2_dist.count == 1
        assert error1_dist.percentage > error2_dist.percentage

    @pytest.mark.asyncio
    async def test_top_errors(self, tracker):
        """Test top errors calculation"""
        # Track errors with different frequencies
        for _ in range(5):
            await tracker.track_error({"name": "FrequentError", "message": "Test"})

        for _ in range(2):
            await tracker.track_error({"name": "RareError", "message": "Test"})

        metrics = await tracker.get_metrics()

        # Should be sorted by count
        assert metrics.top_errors[0].count >= metrics.top_errors[1].count

    @pytest.mark.asyncio
    async def test_affected_users(self, tracker):
        """Test affected users calculation"""
        # Track errors with different users
        await tracker.track_error({
            "message": "Test error",
            "context": {"user_id": "user1"},
        })

        await tracker.track_error({
            "message": "Test error",
            "context": {"user_id": "user2"},
        })

        await tracker.track_error({
            "message": "Test error",
            "context": {"user_id": "user1"},  # Same user
        })

        metrics = await tracker.get_metrics()

        # Should count 2 unique users
        assert metrics.affected_users == 2

class TestStatistics:
    """Test statistics tracking"""

    def test_get_stats(self, tracker):
        """Test getting tracker statistics"""
        stats = tracker.get_stats()

        assert stats.total_errors == 0
        assert stats.total_groups == 0
        assert stats.errors_sampled == 0
        assert stats.errors_rate_limited == 0
        assert stats.memory_usage >= 0

    @pytest.mark.asyncio
    async def test_stats_update(self, tracker):
        """Test that stats are updated correctly"""
        await tracker.track_error({
            "message": "Test error",
        })

        stats = tracker.get_stats()

        assert stats.total_errors == 1
        assert stats.total_groups == 1
        assert stats.avg_processing_time >= 0  # Can be 0 for very fast operations

    def test_memory_usage_calculation(self, tracker):
        """Test memory usage calculation"""
        stats = tracker.get_stats()
        initial_memory = stats.memory_usage

        # Track some errors
        for _ in range(10):
            asyncio.run(tracker.track_error({"message": "Test"}))

        stats = tracker.get_stats()
        assert stats.memory_usage >= initial_memory

class TestCleanup:
    """Test cleanup functionality"""

    def test_clear_groups(self, tracker):
        """Test clearing all error groups"""
        # Track some errors
        for _ in range(5):
            asyncio.run(tracker.track_error({"message": "Test"}))

        assert len(tracker.error_groups) > 0

        # Clear groups
        tracker.clear_groups()

        assert len(tracker.error_groups) == 0
        assert tracker.stats.total_groups == 0

    def test_cleanup_old_groups(self, tracker):
        """Test cleanup of old error groups"""
        # Track an error
        asyncio.run(tracker.track_error({"message": "Test"}))

        # Get the group and make it old
        group = list(tracker.error_groups.values())[0]
        group.last_seen = time.time() * 1000 - (25 * 60 * 60 * 1000)  # 25 hours ago

        # Run cleanup
        tracker.cleanup()

        # Old group should be removed
        assert len(tracker.error_groups) == 0

class TestConvenienceFunction:
    """Test convenience function for tracking exceptions"""

    @pytest.mark.asyncio
    async def test_track_error_from_exception(self, tracker):
        """Test tracking a Python exception"""
        try:
            raise ValueError("Test exception")
        except ValueError as e:
            await track_error(tracker, e, level="error", context={"test": True})

        assert tracker.stats.total_errors == 1

        group = list(tracker.error_groups.values())[0]
        error = group.errors[0]

        assert error.name == "ValueError"
        assert error.message == "Test exception"
        assert error.stack is not None
        assert "ValueError" in error.stack

class TestLocationExtraction:
    """Test stack trace location extraction"""

    @pytest.mark.asyncio
    async def test_extract_nodejs_location(self, tracker):
        """Test extracting location from Node.js stack trace"""
        await tracker.track_error({
            "message": "Test error",
            "stack": "Error: Test\n    at testFunction (src/services/test.ts:42:10)",
        })

        group = list(tracker.error_groups.values())[0]
        error = group.errors[0]

        # Location should be extracted
        location = tracker._extract_location(error.stack)
        assert "test.ts:42" in location or "src/services/test.ts:42" in location

    @pytest.mark.asyncio
    async def test_extract_python_location(self, tracker):
        """Test extracting location from Python stack trace"""
        await tracker.track_error({
            "message": "Test error",
            "stack": 'File "backend/services/test.py", line 42, in test_function',
        })

        group = list(tracker.error_groups.values())[0]
        error = group.errors[0]

        location = tracker._extract_location(error.stack)
        assert "test.py:42" in location

class TestMessageNormalization:
    """Test message normalization"""

    def test_normalize_uuids(self, tracker):
        """Test UUID normalization"""
        message = "Error for user 550e8400-e29b-41d4-a716-446655440000"
        normalized = tracker._normalize_message(message)
        assert "<UUID>" in normalized
        assert "550e8400" not in normalized

    def test_normalize_numbers(self, tracker):
        """Test number normalization"""
        message = "Error code 12345"
        normalized = tracker._normalize_message(message)
        assert "<NUM>" in normalized
        assert "12345" not in normalized

    def test_normalize_urls(self, tracker):
        """Test URL normalization"""
        message = "Failed to fetch https://api.example.com/users"
        normalized = tracker._normalize_message(message)
        assert "<URL>" in normalized
        assert "api.example.com" not in normalized

    def test_normalize_file_paths(self, tracker):
        """Test file path normalization"""
        # Windows path
        message = "Error in C:\\Users\\test\\file.txt"
        normalized = tracker._normalize_message(message)
        assert "<PATH>" in normalized

        # Unix path
        message = "Error in /home/user/file.txt"
        normalized = tracker._normalize_message(message)
        assert "<PATH>" in normalized

    def test_normalize_timestamps(self, tracker):
        """Test timestamp normalization"""
        message = "Error at 2024-01-15 10:30:45"
        normalized = tracker._normalize_message(message)
        assert "<TIME>" in normalized
        assert "2024-01-15" not in normalized

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
