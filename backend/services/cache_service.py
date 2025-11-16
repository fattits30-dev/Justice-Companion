"""
High-performance LRU caching service for Justice Companion backend.

Features:
- Multiple named caches with different TTL configurations
- Cache-aside pattern for transparent caching
- Pattern-based invalidation for bulk operations
- Comprehensive metrics and monitoring
- Memory-efficient with automatic eviction
- Thread-safe operations with RLock
- Feature flag support for safe rollback

Example:
    ```python
    cache_service = CacheService()

    # Simple caching with fallback
    async def fetch_case(case_id: str) -> Case:
        return await repository.find_by_id(case_id)

    case = await cache_service.get_cached(
        f"case:{case_id}",
        fetch_case,
        cache_name="cases"
    )

    # Invalidate on update
    cache_service.invalidate(f"case:{case_id}")
    cache_service.invalidate_pattern(f"case:user:{user_id}:*")
    ```
"""

import os
import re
import time
import threading
import logging
from typing import Optional, Any, Dict, List, Callable, Awaitable, TypeVar, Generic
from dataclasses import dataclass, field
from collections import OrderedDict
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class CacheStats:
    """Cache statistics for monitoring and debugging."""
    name: str
    hits: int
    misses: int
    hit_rate: float
    size: int
    max_size: int
    evictions: int


@dataclass
class CacheConfig:
    """Configuration for a named cache instance."""
    name: str
    max_items: int  # Maximum items in cache
    ttl_ms: Optional[int] = None  # Time to live in milliseconds
    update_age_on_get: bool = True  # Update item age on access (true LRU)


@dataclass
class CacheEntry(Generic[T]):
    """Cache entry metadata for debugging."""
    value: T
    timestamp: float  # Unix timestamp in seconds
    access_count: int = 0
    ttl_ms: Optional[int] = None  # Per-entry TTL override


class LRUCache(Generic[T]):
    """
    Thread-safe LRU cache implementation with TTL support.

    Uses OrderedDict for O(1) access and reordering.
    """

    def __init__(
        self,
        max_items: int,
        ttl_ms: Optional[int] = None,
        update_age_on_get: bool = True,
        on_evict: Optional[Callable[[str, str], None]] = None
    ):
        """
        Initialize LRU cache.

        Args:
            max_items: Maximum number of items in cache
            ttl_ms: Default time-to-live in milliseconds
            update_age_on_get: Whether to move item to end on access
            on_evict: Callback when item is evicted
        """
        self._cache: OrderedDict[str, CacheEntry[T]] = OrderedDict()
        self._lock = threading.RLock()
        self.max_items = max_items
        self.ttl_ms = ttl_ms
        self.update_age_on_get = update_age_on_get
        self.on_evict = on_evict

    def get(self, key: str) -> Optional[CacheEntry[T]]:
        """
        Get value from cache with TTL check.

        Args:
            key: Cache key

        Returns:
            Cache entry if found and not expired, None otherwise
        """
        with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]

            # Check if entry has expired
            if self._is_expired(entry):
                del self._cache[key]
                if self.on_evict:
                    self.on_evict(key, "expired")
                return None

            # Move to end (most recently used) if enabled
            if self.update_age_on_get:
                self._cache.move_to_end(key)

            return entry

    def set(
        self,
        key: str,
        entry: CacheEntry[T],
        ttl_ms: Optional[int] = None
    ) -> None:
        """
        Set cache value with TTL.

        Args:
            key: Cache key
            entry: Cache entry with value and metadata
            ttl_ms: Optional TTL override for this entry
        """
        with self._lock:
            # Set entry-specific TTL if provided
            if ttl_ms is not None:
                entry.ttl_ms = ttl_ms

            # Update existing entry
            if key in self._cache:
                self._cache[key] = entry
                self._cache.move_to_end(key)
            else:
                # Evict oldest if at capacity
                if len(self._cache) >= self.max_items:
                    oldest_key, _ = self._cache.popitem(last=False)
                    if self.on_evict:
                        self.on_evict(oldest_key, "evict")

                self._cache[key] = entry

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if key was deleted, False if not found
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """Clear all entries from cache."""
        with self._lock:
            self._cache.clear()

    def keys(self) -> List[str]:
        """Get all cache keys."""
        with self._lock:
            return list(self._cache.keys())

    def entries(self) -> List[tuple[str, CacheEntry[T]]]:
        """Get all cache entries."""
        with self._lock:
            return list(self._cache.items())

    @property
    def size(self) -> int:
        """Get current cache size."""
        with self._lock:
            return len(self._cache)

    def _is_expired(self, entry: CacheEntry[T]) -> bool:
        """
        Check if cache entry has expired.

        Args:
            entry: Cache entry to check

        Returns:
            True if expired, False otherwise
        """
        # Use entry-specific TTL if set, otherwise use cache default
        ttl = entry.ttl_ms if entry.ttl_ms is not None else self.ttl_ms

        if ttl is None:
            return False

        current_time = time.time()
        age_ms = (current_time - entry.timestamp) * 1000
        return age_ms > ttl


class CacheService:
    """
    High-performance LRU caching service with multiple named caches.

    Provides cache-aside pattern, pattern-based invalidation, and
    comprehensive monitoring for the Justice Companion backend.
    """

    # Default cache configurations for different data types
    DEFAULT_CONFIGS: List[CacheConfig] = [
        CacheConfig(
            name="sessions",
            max_items=1000,
            ttl_ms=60 * 60 * 1000,  # 1 hour
            update_age_on_get=True
        ),
        CacheConfig(
            name="cases",
            max_items=500,
            ttl_ms=5 * 60 * 1000,  # 5 minutes
            update_age_on_get=True
        ),
        CacheConfig(
            name="evidence",
            max_items=1000,
            ttl_ms=5 * 60 * 1000,  # 5 minutes
            update_age_on_get=True
        ),
        CacheConfig(
            name="profiles",
            max_items=200,
            ttl_ms=30 * 60 * 1000,  # 30 minutes
            update_age_on_get=True
        ),
        CacheConfig(
            name="default",
            max_items=500,
            ttl_ms=10 * 60 * 1000,  # 10 minutes default
            update_age_on_get=True
        ),
    ]

    def __init__(self, configs: Optional[List[CacheConfig]] = None):
        """
        Initialize cache service with named caches.

        Args:
            configs: Optional list of cache configurations.
                    Uses DEFAULT_CONFIGS if not provided.
        """
        # Feature flag for safe rollback
        self.enabled = os.environ.get("ENABLE_CACHE", "true").lower() != "false"

        self._caches: Dict[str, LRUCache[Any]] = {}
        self._stats: Dict[str, Dict[str, int]] = {}
        self._lock = threading.RLock()

        # Initialize caches with provided or default configs
        cache_configs = configs or self.DEFAULT_CONFIGS

        for config in cache_configs:
            self._create_cache(config)

        # Log cache initialization
        if self.enabled:
            cache_names = ", ".join(self._caches.keys())
            logger.info(f"[CacheService] Initialized with caches: {cache_names}")
        else:
            logger.info("[CacheService] Cache disabled via feature flag")

    def _create_cache(self, config: CacheConfig) -> None:
        """
        Create a named cache with specific configuration.

        Args:
            config: Cache configuration
        """
        def on_evict(key: str, reason: str) -> None:
            """Callback for tracking evictions."""
            if reason == "evict":
                with self._lock:
                    stats = self._stats.get(config.name)
                    if stats:
                        stats["evictions"] += 1

        cache = LRUCache(
            max_items=config.max_items,
            ttl_ms=config.ttl_ms,
            update_age_on_get=config.update_age_on_get,
            on_evict=on_evict
        )

        with self._lock:
            self._caches[config.name] = cache
            self._stats[config.name] = {
                "hits": 0,
                "misses": 0,
                "evictions": 0
            }

    async def get_cached(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[T]],
        cache_name: str = "default",
        ttl_ms: Optional[int] = None
    ) -> T:
        """
        Get cached value or fetch from source (cache-aside pattern).

        Args:
            key: Unique cache key
            fetch_fn: Async function to fetch value if not cached
            cache_name: Named cache to use (default: "default")
            ttl_ms: Optional custom TTL for this entry (milliseconds)

        Returns:
            Cached or fetched value

        Raises:
            Exception: Re-raises exceptions from fetch_fn on cache miss
        """
        # Skip cache if disabled
        if not self.enabled:
            return await fetch_fn()

        # Get cache and stats, fallback to default if not found
        with self._lock:
            cache = self._caches.get(cache_name) or self._caches.get("default")
            stats = self._stats.get(cache_name) or self._stats.get("default")

        if not cache or not stats:
            logger.warning(f"[CacheService] Cache '{cache_name}' not found, using direct fetch")
            return await fetch_fn()

        try:
            # Check cache first
            cached = cache.get(key)
            if cached is not None:
                with self._lock:
                    stats["hits"] += 1
                cached.access_count += 1
                return cached.value

            # Cache miss - fetch from source
            with self._lock:
                stats["misses"] += 1

            value = await fetch_fn()

            # Store in cache with metadata
            entry = CacheEntry(
                value=value,
                timestamp=time.time(),
                access_count=0,
                ttl_ms=ttl_ms
            )

            cache.set(key, entry, ttl_ms=ttl_ms)

            return value

        except Exception as error:
            # Log error but don't fail the operation
            logger.error(
                f"[CacheService] Error in get_cached: {error}",
                extra={
                    "context": "CacheService.get_cached",
                    "key": key,
                    "cache_name": cache_name
                },
                exc_info=True
            )

            # Fallback to direct fetch on cache error
            return await fetch_fn()

    def invalidate(self, key: str, cache_name: Optional[str] = None) -> None:
        """
        Invalidate a specific cache entry.

        Args:
            key: Cache key to invalidate
            cache_name: Optional specific cache, otherwise checks all
        """
        if not self.enabled:
            return

        with self._lock:
            if cache_name:
                cache = self._caches.get(cache_name)
                if cache:
                    cache.delete(key)
            else:
                # Invalidate across all caches
                for cache in self._caches.values():
                    cache.delete(key)

    def invalidate_pattern(
        self,
        pattern: str,
        cache_name: Optional[str] = None
    ) -> None:
        """
        Invalidate all keys matching a pattern.

        Supports wildcards: 'user:*', 'case:123:*'

        Args:
            pattern: Pattern to match (supports * wildcard)
            cache_name: Optional specific cache, otherwise checks all
        """
        if not self.enabled:
            return

        # Convert pattern to regex
        regex_pattern = "^" + pattern.replace("*", ".*") + "$"
        regex = re.compile(regex_pattern)

        with self._lock:
            caches_to_check = (
                [self._caches.get(cache_name)]
                if cache_name
                else list(self._caches.values())
            )

        for cache in caches_to_check:
            if cache is None:
                continue

            # Get all keys and filter by pattern
            keys = cache.keys()
            for key in keys:
                if regex.match(key):
                    cache.delete(key)

    def clear(self, cache_name: Optional[str] = None) -> None:
        """
        Clear all entries from a specific cache or all caches.

        Args:
            cache_name: Optional cache name, clears all if not specified
        """
        if not self.enabled:
            return

        with self._lock:
            if cache_name:
                cache = self._caches.get(cache_name)
                if cache:
                    cache.clear()
            else:
                # Clear all caches
                for cache in self._caches.values():
                    cache.clear()

    def get_stats(self, cache_name: Optional[str] = None) -> List[CacheStats]:
        """
        Get statistics for a specific cache or all caches.

        Args:
            cache_name: Optional cache name

        Returns:
            List of cache statistics
        """
        results: List[CacheStats] = []

        with self._lock:
            caches_to_report = (
                [cache_name] if cache_name else list(self._caches.keys())
            )

            for name in caches_to_report:
                cache = self._caches.get(name)
                stats = self._stats.get(name)

                if cache and stats:
                    total = stats["hits"] + stats["misses"]
                    hit_rate = (stats["hits"] / total * 100) if total > 0 else 0

                    results.append(CacheStats(
                        name=name,
                        hits=stats["hits"],
                        misses=stats["misses"],
                        hit_rate=round(hit_rate, 2),
                        size=cache.size,
                        max_size=cache.max_items,
                        evictions=stats["evictions"]
                    ))

        return results

    def inspect(
        self,
        cache_name: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get detailed information about cache entries (for debugging).

        Args:
            cache_name: Cache to inspect
            limit: Maximum entries to return

        Returns:
            List of cache entries with keys and metadata
        """
        with self._lock:
            cache = self._caches.get(cache_name)
            if not cache:
                return []

            entries: List[Dict[str, Any]] = []

            for idx, (key, entry) in enumerate(cache.entries()):
                if idx >= limit:
                    break

                entries.append({
                    "key": key,
                    "timestamp": datetime.fromtimestamp(entry.timestamp).isoformat(),
                    "access_count": entry.access_count,
                    "ttl_ms": entry.ttl_ms,
                    "value_type": type(entry.value).__name__
                })

            return entries

    def reset_stats(self, cache_name: Optional[str] = None) -> None:
        """
        Reset statistics for monitoring.

        Args:
            cache_name: Optional cache name, resets all if not specified
        """
        with self._lock:
            caches_to_reset = (
                [cache_name] if cache_name else list(self._stats.keys())
            )

            for name in caches_to_reset:
                stats = self._stats.get(name)
                if stats:
                    stats["hits"] = 0
                    stats["misses"] = 0
                    stats["evictions"] = 0

    def is_enabled(self) -> bool:
        """
        Check if caching is enabled.

        Returns:
            True if caching is enabled
        """
        return self.enabled

    def set_enabled(self, enabled: bool) -> None:
        """
        Enable or disable caching at runtime.

        Args:
            enabled: Whether to enable caching
        """
        self.enabled = enabled
        if not enabled:
            # Clear all caches when disabling
            self.clear()

        logger.info(f"[CacheService] Cache {'enabled' if enabled else 'disabled'}")

    async def preload(
        self,
        entries: List[Dict[str, Any]],
        cache_name: str = "default"
    ) -> None:
        """
        Preload cache with multiple entries.

        Useful for warming up the cache during application startup.

        Args:
            entries: List of dicts with 'key' and 'fetch_fn' keys
            cache_name: Cache to preload into

        Example:
            ```python
            await cache_service.preload([
                {"key": "user:1", "fetch_fn": lambda: fetch_user(1)},
                {"key": "user:2", "fetch_fn": lambda: fetch_user(2)},
            ], cache_name="profiles")
            ```
        """
        if not self.enabled:
            return

        import asyncio

        tasks = [
            self.get_cached(
                entry["key"],
                entry["fetch_fn"],
                cache_name
            )
            for entry in entries
        ]

        await asyncio.gather(*tasks, return_exceptions=True)

        logger.info(f"[CacheService] Preloaded {len(entries)} entries into '{cache_name}' cache")


# Singleton instance for global access
_cache_service_instance: Optional[CacheService] = None
_instance_lock = threading.Lock()


def get_cache_service(configs: Optional[List[CacheConfig]] = None) -> CacheService:
    """
    Get or create the global cache service instance.

    Args:
        configs: Optional cache configurations (only used on first call)

    Returns:
        Singleton CacheService instance
    """
    global _cache_service_instance

    if _cache_service_instance is None:
        with _instance_lock:
            # Double-check locking pattern
            if _cache_service_instance is None:
                _cache_service_instance = CacheService(configs)

    return _cache_service_instance


def reset_cache_service() -> None:
    """
    Reset the global cache service (mainly for testing).

    Clears all caches and destroys the singleton instance.
    """
    global _cache_service_instance

    with _instance_lock:
        if _cache_service_instance:
            _cache_service_instance.clear()
            _cache_service_instance = None
            logger.info("[CacheService] Singleton instance reset")
