"""
Unit tests for DecryptionCache service.

Tests cover:
- Basic get/set operations
- TTL expiration
- LRU eviction
- Entity invalidation
- GDPR compliance (Articles 15 & 17)
- Thread safety
- Statistics and monitoring
"""

import time
import threading
import pytest
from unittest.mock import Mock

from backend.services.security.decryption_cache import (
    DecryptionCache,
    CacheEntry,
    get_decryption_cache,
    reset_decryption_cache
)

class TestCacheEntry:
    """Test CacheEntry dataclass."""

    def test_cache_entry_creation(self):
        """Test creating a cache entry with all fields."""
        entry = CacheEntry(
            value="decrypted_value",
            timestamp=time.time(),
            ttl_seconds=300,
            access_count=5
        )

        assert entry.value == "decrypted_value"
        assert entry.ttl_seconds == 300
        assert entry.access_count == 5

    def test_cache_entry_defaults(self):
        """Test cache entry with default access_count."""
        entry = CacheEntry(
            value="test",
            timestamp=time.time(),
            ttl_seconds=60
        )

        assert entry.access_count == 0

class TestDecryptionCacheBasics:
    """Test basic cache operations."""

    def test_cache_initialization(self):
        """Test cache initializes with correct defaults."""
        cache = DecryptionCache()

        assert cache.max_size == 1000
        assert cache.default_ttl == 300
        assert cache.get_stats()["size"] == 0

    def test_cache_initialization_with_custom_values(self):
        """Test cache initialization with custom max_size and TTL."""
        cache = DecryptionCache(max_size=500, default_ttl=600)

        assert cache.max_size == 500
        assert cache.default_ttl == 600

    def test_set_and_get(self):
        """Test basic set and get operations."""
        cache = DecryptionCache()

        cache.set("test:key", "decrypted_value")
        value = cache.get("test:key")

        assert value == "decrypted_value"

    def test_get_nonexistent_key(self):
        """Test getting a key that doesn't exist returns None."""
        cache = DecryptionCache()

        value = cache.get("nonexistent:key")

        assert value is None

    def test_set_updates_existing_key(self):
        """Test setting an existing key updates the value."""
        cache = DecryptionCache()

        cache.set("test:key", "value1")
        cache.set("test:key", "value2")

        value = cache.get("test:key")
        assert value == "value2"

        # Should only have 1 entry
        stats = cache.get_stats()
        assert stats["size"] == 1

class TestTTLExpiration:
    """Test TTL (time-to-live) expiration."""

    def test_ttl_expiration(self):
        """Test entries expire after TTL."""
        cache = DecryptionCache(default_ttl=1)  # 1 second TTL

        cache.set("test:key", "value")

        # Should exist immediately
        assert cache.get("test:key") == "value"

        # Wait for expiration
        time.sleep(1.5)

        # Should be expired and return None
        assert cache.get("test:key") is None

    def test_custom_ttl_per_entry(self):
        """Test custom TTL per entry."""
        cache = DecryptionCache(default_ttl=10)

        # Set entry with custom short TTL
        cache.set("test:key", "value", ttl=1)

        # Should exist immediately
        assert cache.get("test:key") == "value"

        # Wait for expiration
        time.sleep(1.5)

        # Should be expired
        assert cache.get("test:key") is None

    def test_ttl_reset_on_get(self):
        """Test TTL resets on access (update_age_on_get)."""
        cache = DecryptionCache(default_ttl=2)

        cache.set("test:key", "value")

        # Access every 1 second for 3 seconds
        time.sleep(1)
        assert cache.get("test:key") == "value"  # Resets TTL

        time.sleep(1)
        assert cache.get("test:key") == "value"  # Resets TTL again

        # Entry should still be valid after 2 seconds due to TTL resets
        time.sleep(0.5)
        assert cache.get("test:key") == "value"

class TestLRUEviction:
    """Test LRU (Least Recently Used) eviction."""

    def test_lru_eviction_at_capacity(self):
        """Test LRU eviction when cache reaches max_size."""
        cache = DecryptionCache(max_size=3)

        # Fill cache to capacity
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        assert cache.get_stats()["size"] == 3

        # Add one more entry (should evict key1)
        cache.set("key4", "value4")

        assert cache.get_stats()["size"] == 3
        assert cache.get("key1") is None  # Evicted
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"
        assert cache.get("key4") == "value4"

    def test_lru_access_order(self):
        """Test LRU evicts least recently accessed entry."""
        cache = DecryptionCache(max_size=3)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Access key1 to make it most recently used
        cache.get("key1")

        # Add new entry (should evict key2, least recently used)
        cache.set("key4", "value4")

        assert cache.get("key1") == "value1"  # Still exists
        assert cache.get("key2") is None  # Evicted
        assert cache.get("key3") == "value3"
        assert cache.get("key4") == "value4"

class TestEntityInvalidation:
    """Test entity-based invalidation."""

    def test_invalidate_entity(self):
        """Test invalidating all entries for a specific entity."""
        cache = DecryptionCache()

        cache.set("cases:123:title", "Case Title")
        cache.set("cases:123:description", "Case Description")
        cache.set("cases:456:title", "Other Case")
        cache.set("evidence:789:note", "Evidence Note")

        # Invalidate case 123
        deleted_count = cache.invalidate_entity("cases", 123)

        assert deleted_count == 2
        assert cache.get("cases:123:title") is None
        assert cache.get("cases:123:description") is None
        assert cache.get("cases:456:title") == "Other Case"  # Still exists
        assert cache.get("evidence:789:note") == "Evidence Note"  # Still exists

    def test_invalidate_entity_type(self):
        """Test invalidating all entries for an entity type."""
        cache = DecryptionCache()

        cache.set("cases:123:title", "Case 1")
        cache.set("cases:456:title", "Case 2")
        cache.set("evidence:789:note", "Evidence 1")
        cache.set("evidence:999:note", "Evidence 2")

        # Invalidate all cases
        deleted_count = cache.invalidate_entity_type("cases")

        assert deleted_count == 2
        assert cache.get("cases:123:title") is None
        assert cache.get("cases:456:title") is None
        assert cache.get("evidence:789:note") == "Evidence 1"  # Still exists
        assert cache.get("evidence:999:note") == "Evidence 2"  # Still exists

    def test_invalidate_entity_no_matches(self):
        """Test invalidating entity with no matching entries."""
        cache = DecryptionCache()

        cache.set("cases:123:title", "Case Title")

        deleted_count = cache.invalidate_entity("cases", 999)

        assert deleted_count == 0
        assert cache.get("cases:123:title") == "Case Title"  # Still exists

class TestCacheClear:
    """Test cache clearing operations."""

    def test_clear_all(self):
        """Test clearing entire cache."""
        cache = DecryptionCache()

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        assert cache.get_stats()["size"] == 3

        cleared_count = cache.clear()

        assert cleared_count == 3
        assert cache.get_stats()["size"] == 0
        assert cache.get("key1") is None
        assert cache.get("key2") is None

    def test_clear_resets_stats(self):
        """Test clearing cache resets statistics."""
        cache = DecryptionCache()

        cache.set("key1", "value1")
        cache.get("key1")  # Hit
        cache.get("key2")  # Miss

        stats_before = cache.get_stats()
        assert stats_before["hits"] == 1
        assert stats_before["misses"] == 1

        cache.clear()

        stats_after = cache.get_stats()
        assert stats_after["hits"] == 0
        assert stats_after["misses"] == 0
        assert stats_after["sets"] == 0

class TestGDPRCompliance:
    """Test GDPR compliance features."""

    def test_clear_user_data_article_17(self):
        """Test GDPR Article 17: Right to Erasure."""
        cache = DecryptionCache()

        # Simulate user-specific cache entries
        cache.set("user:123:profile", "User Profile")
        cache.set("cases:456:user:123:note", "User Note")
        cache.set("user:999:profile", "Other User")

        # Clear data for user 123
        deleted_count = cache.clear_user_data("123")

        assert deleted_count == 2
        assert cache.get("user:123:profile") is None
        assert cache.get("cases:456:user:123:note") is None
        assert cache.get("user:999:profile") == "Other User"  # Still exists

    def test_get_user_cache_report_article_15(self):
        """Test GDPR Article 15: Right of Access."""
        cache = DecryptionCache()

        cache.set("user:123:profile", "User Profile Data")
        cache.set("user:123:settings", "User Settings")
        cache.set("user:999:profile", "Other User")

        # Get report for user 123
        report = cache.get_user_cache_report("123")

        assert len(report) == 2
        assert any(entry["key"] == "user:123:profile" for entry in report)
        assert any(entry["key"] == "user:123:settings" for entry in report)

        # Check report structure
        for entry in report:
            assert "key" in entry
            assert "size_bytes" in entry
            assert "created_at" in entry
            assert "ttl_seconds" in entry
            assert "access_count" in entry

    def test_user_cache_report_no_data(self):
        """Test user cache report with no data for user."""
        cache = DecryptionCache()

        cache.set("user:999:profile", "Other User")

        report = cache.get_user_cache_report("123")

        assert len(report) == 0

class TestStatistics:
    """Test cache statistics and monitoring."""

    def test_stats_tracking(self):
        """Test cache statistics tracking."""
        cache = DecryptionCache()

        # Initial stats
        stats = cache.get_stats()
        assert stats["size"] == 0
        assert stats["hits"] == 0
        assert stats["misses"] == 0

        # Set entries
        cache.set("key1", "value1")
        cache.set("key2", "value2")

        stats = cache.get_stats()
        assert stats["size"] == 2
        assert stats["sets"] == 2

        # Generate hits and misses
        cache.get("key1")  # Hit
        cache.get("key1")  # Hit
        cache.get("key3")  # Miss

        stats = cache.get_stats()
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == 66.67  # 2/3 * 100

    def test_eviction_tracking(self):
        """Test eviction statistics tracking."""
        cache = DecryptionCache(max_size=2)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")  # Triggers eviction

        stats = cache.get_stats()
        assert stats["evictions"] == 1

class TestCleanupExpired:
    """Test manual cleanup of expired entries."""

    def test_cleanup_expired_entries(self):
        """Test manual cleanup removes expired entries."""
        cache = DecryptionCache(default_ttl=1)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        # Wait for expiration
        time.sleep(1.5)

        # Manual cleanup
        removed_count = cache.cleanup_expired()

        assert removed_count == 2
        assert cache.get_stats()["size"] == 0

    def test_cleanup_keeps_valid_entries(self):
        """Test cleanup doesn't remove valid entries."""
        cache = DecryptionCache(default_ttl=10)

        cache.set("key1", "value1", ttl=1)  # Will expire
        cache.set("key2", "value2", ttl=10)  # Won't expire

        time.sleep(1.5)

        removed_count = cache.cleanup_expired()

        assert removed_count == 1
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"

class TestAuditLogging:
    """Test audit logging integration."""

    def test_cache_with_audit_logger(self):
        """Test cache operations trigger audit logs."""
        mock_logger = Mock()
        cache = DecryptionCache(audit_logger=mock_logger)

        # Set operation should log
        cache.set("test:key", "value")
        assert mock_logger.log.called

        # Get operation (hit) should log
        mock_logger.reset_mock()
        cache.get("test:key")
        assert mock_logger.log.called

        # Get operation (miss) should log
        mock_logger.reset_mock()
        cache.get("nonexistent:key")
        assert mock_logger.log.called

    def test_audit_log_on_clear(self):
        """Test clear operation triggers audit log."""
        mock_logger = Mock()
        cache = DecryptionCache(audit_logger=mock_logger)

        cache.set("key1", "value1")
        mock_logger.reset_mock()

        cache.clear(reason="Test clear")

        # Should log clear event
        assert mock_logger.log.called
        call_args = mock_logger.log.call_args
        assert call_args[1]["event_type"] == "cache.clear"

class TestThreadSafety:
    """Test thread safety of cache operations."""

    def test_concurrent_set_operations(self):
        """Test concurrent set operations are thread-safe."""
        cache = DecryptionCache()
        num_threads = 10
        operations_per_thread = 100

        def set_values(thread_id):
            for i in range(operations_per_thread):
                cache.set(f"thread{thread_id}:key{i}", f"value{i}")

        threads = [
            threading.Thread(target=set_values, args=(i,))
            for i in range(num_threads)
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # All entries should be set
        stats = cache.get_stats()
        assert stats["size"] == num_threads * operations_per_thread

    def test_concurrent_get_set_operations(self):
        """Test concurrent get and set operations."""
        cache = DecryptionCache()
        num_threads = 5
        operations = 50

        def mixed_operations(thread_id):
            for i in range(operations):
                if i % 2 == 0:
                    cache.set(f"key{thread_id}:{i}", f"value{i}")
                else:
                    cache.get(f"key{thread_id}:{i-1}")

        threads = [
            threading.Thread(target=mixed_operations, args=(i,))
            for i in range(num_threads)
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Should complete without errors
        stats = cache.get_stats()
        assert stats["size"] > 0

class TestSingletonPattern:
    """Test singleton instance management."""

    def test_get_decryption_cache_singleton(self):
        """Test get_decryption_cache returns singleton instance."""
        # Reset first
        reset_decryption_cache()

        cache1 = get_decryption_cache()
        cache2 = get_decryption_cache()

        assert cache1 is cache2

    def test_singleton_shares_state(self):
        """Test singleton instances share state."""
        reset_decryption_cache()

        cache1 = get_decryption_cache()
        cache1.set("test:key", "value")

        cache2 = get_decryption_cache()
        value = cache2.get("test:key")

        assert value == "value"

    def test_reset_decryption_cache(self):
        """Test reset clears singleton instance."""
        cache1 = get_decryption_cache()
        cache1.set("test:key", "value")

        reset_decryption_cache()

        cache2 = get_decryption_cache()

        # Should be new instance with empty cache
        assert cache2.get("test:key") is None

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_key(self):
        """Test setting and getting empty key."""
        cache = DecryptionCache()

        cache.set("", "value")
        value = cache.get("")

        assert value == "value"

    def test_empty_value(self):
        """Test setting empty value."""
        cache = DecryptionCache()

        cache.set("key", "")
        value = cache.get("key")

        assert value == ""

    def test_very_long_key(self):
        """Test handling very long keys."""
        cache = DecryptionCache()

        long_key = "a" * 1000
        cache.set(long_key, "value")

        assert cache.get(long_key) == "value"

    def test_zero_ttl(self):
        """Test entry with zero TTL expires immediately."""
        cache = DecryptionCache()

        cache.set("key", "value", ttl=0)

        # Should expire immediately on next access
        time.sleep(0.1)
        assert cache.get("key") is None

    def test_unicode_values(self):
        """Test caching unicode values."""
        cache = DecryptionCache()

        unicode_value = "Hello 世界 🌍"
        cache.set("key", unicode_value)

        assert cache.get("key") == unicode_value

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
