"""
DecryptionCache - In-memory LRU cache for decrypted values with GDPR compliance.

Migrated from: src/services/DecryptionCache.ts

SECURITY CONSTRAINTS:
- Never persisted to disk (GDPR Article 32 - Encryption at rest)
- Auto-eviction after 5 minutes (minimize exposure window)
- Max 1000 entries (prevent memory exhaustion)
- Cleared on logout (session isolation)
- Thread-safe operations with RLock

Features:
- LRU (Least Recently Used) eviction policy
- TTL (Time-to-Live) with automatic expiration
- Entity-based invalidation for data consistency
- Audit logging for security monitoring
- GDPR Article 15 (Right of Access) support
- GDPR Article 17 (Right to Erasure) support

Usage:
    from backend.services.decryption_cache import DecryptionCache
    from backend.services.audit_logger import AuditLogger

    # Initialize cache with optional audit logging
    cache = DecryptionCache(audit_logger=audit_logger)

    # Cache decrypted value
    cache.set("cases:123:title", "Decrypted Case Title")

    # Retrieve cached value
    value = cache.get("cases:123:title")  # Returns "Decrypted Case Title" or None

    # Invalidate specific entity when updated
    cache.invalidate_entity("cases", 123)

    # Clear all cache on logout (GDPR compliance)
    cache.clear()
"""

import time
import threading
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from collections import OrderedDict

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """
    Cache entry with metadata for TTL and access tracking.

    Attributes:
        value: Decrypted value stored in cache
        timestamp: Unix timestamp when entry was created (seconds)
        ttl_seconds: Time-to-live in seconds
        access_count: Number of times entry was accessed
    """

    value: str
    timestamp: float
    ttl_seconds: int
    access_count: int = 0


class DecryptionCache:
    """
    In-memory LRU cache for decrypted values with security and GDPR compliance.

    This cache provides a thread-safe, memory-efficient way to cache decrypted
    database values. All entries automatically expire after TTL and are never
    persisted to disk.

    Security Features:
    - Memory-only storage (no disk persistence)
    - Automatic TTL expiration (default: 5 minutes)
    - Thread-safe operations with RLock
    - Audit logging for security monitoring
    - LRU eviction to prevent memory exhaustion

    GDPR Compliance:
    - Session isolation (cleared on logout)
    - Right of Access (Article 15)
    - Right to Erasure (Article 17)
    - Minimized exposure window with TTL
    """

    # Constants
    DEFAULT_MAX_SIZE = 1000
    DEFAULT_TTL_SECONDS = 300  # 5 minutes
    UPDATE_AGE_ON_GET = True  # Reset TTL on access

    def __init__(
        self,
        audit_logger: Optional[Any] = None,
        max_size: int = DEFAULT_MAX_SIZE,
        default_ttl: int = DEFAULT_TTL_SECONDS,
    ):
        """
        Initialize DecryptionCache with LRU eviction and TTL support.

        Args:
            audit_logger: Optional AuditLogger instance for security monitoring
            max_size: Maximum number of entries (default: 1000)
            default_ttl: Default time-to-live in seconds (default: 300)
        """
        self.audit_logger = audit_logger
        self.max_size = max_size
        self.default_ttl = default_ttl

        # Thread-safe LRU cache using OrderedDict
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()

        # Statistics for monitoring
        self._stats = {"hits": 0, "misses": 0, "evictions": 0, "sets": 0}

        # Log initialization
        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.initialized",
                user_id=None,
                resource_type="cache",
                resource_id="decryption-cache",
                action="create",
                details={"max_size": max_size, "default_ttl_seconds": default_ttl},
                success=True,
            )

        logger.info(
            f"[DecryptionCache] Initialized with max_size={max_size}, " f"ttl={default_ttl}s"
        )

    def get(self, key: str) -> Optional[str]:
        """
        Get cached decrypted value with TTL validation.

        If the entry exists but has expired, it will be automatically removed
        and None will be returned.

        Args:
            key: Cache key (e.g., "cases:123:title")

        Returns:
            Decrypted value if cached and not expired, None otherwise
        """
        with self._lock:
            if key not in self._cache:
                self._record_miss(key)
                return None

            entry = self._cache[key]

            # Check if entry has expired
            if self._is_expired(entry):
                self._evict_entry(key, "expired")
                self._record_miss(key)
                return None

            # Update access metadata
            entry.access_count += 1

            # Move to end (most recently used) if enabled
            if self.UPDATE_AGE_ON_GET:
                self._cache.move_to_end(key)

                # Reset timestamp on access (extends TTL)
                entry.timestamp = time.time()

            self._record_hit(key)
            return entry.value

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        """
        Cache a decrypted value with TTL.

        If cache is at capacity, the least recently used entry will be evicted.

        Args:
            key: Cache key (e.g., "cases:123:title")
            value: Decrypted value to cache
            ttl: Optional custom TTL in seconds (uses default if not provided)
        """
        with self._lock:
            effective_ttl = ttl if ttl is not None else self.default_ttl

            entry = CacheEntry(
                value=value, timestamp=time.time(), ttl_seconds=effective_ttl, access_count=0
            )

            # Update existing entry
            if key in self._cache:
                self._cache[key] = entry
                self._cache.move_to_end(key)
            else:
                # Evict oldest if at capacity
                if len(self._cache) >= self.max_size:
                    oldest_key = next(iter(self._cache))
                    self._evict_entry(oldest_key, "evict")

                self._cache[key] = entry

            self._stats["sets"] += 1

            # Audit log
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="cache.set",
                    user_id=None,
                    resource_type="cache",
                    resource_id=key,
                    action="create",
                    details={"ttl_seconds": effective_ttl},
                    success=True,
                )

    def invalidate_entity(self, entity: str, entity_id: Any) -> int:
        """
        Invalidate all cache entries for a specific entity.

        Called on UPDATE/DELETE operations to maintain data consistency.

        Args:
            entity: Entity type (e.g., "cases", "evidence")
            entity_id: Entity ID (string or int)

        Returns:
            Number of entries invalidated

        Example:
            # After updating case with ID 123
            cache.invalidate_entity("cases", 123)
            # Invalidates: cases:123:title, cases:123:description, etc.
        """
        prefix = f"{entity}:{entity_id}:"
        keys_to_delete: List[str] = []

        with self._lock:
            # Find all keys matching the prefix
            for key in self._cache.keys():
                if key.startswith(prefix):
                    keys_to_delete.append(key)

            # Delete matching entries
            for key in keys_to_delete:
                del self._cache[key]

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.invalidate_entity",
                user_id=None,
                resource_type="cache",
                resource_id=f"{entity}:{entity_id}",
                action="delete",
                details={"keys_deleted": len(keys_to_delete)},
                success=True,
            )

        logger.debug(
            f"[DecryptionCache] Invalidated {len(keys_to_delete)} entries "
            f"for {entity}:{entity_id}"
        )

        return len(keys_to_delete)

    def invalidate_entity_type(self, entity: str) -> int:
        """
        Invalidate all cache entries for an entity type.

        Called on bulk operations that affect multiple entities of the same type.

        Args:
            entity: Entity type (e.g., "cases", "evidence")

        Returns:
            Number of entries invalidated

        Example:
            # After bulk delete of all cases
            cache.invalidate_entity_type("cases")
            # Invalidates: cases:*, cases:123:*, etc.
        """
        prefix = f"{entity}:"
        keys_to_delete: List[str] = []

        with self._lock:
            # Find all keys matching the prefix
            for key in self._cache.keys():
                if key.startswith(prefix):
                    keys_to_delete.append(key)

            # Delete matching entries
            for key in keys_to_delete:
                del self._cache[key]

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.invalidate_type",
                user_id=None,
                resource_type="cache",
                resource_id=entity,
                action="delete",
                details={"keys_deleted": len(keys_to_delete)},
                success=True,
            )

        logger.debug(
            f"[DecryptionCache] Invalidated {len(keys_to_delete)} entries "
            f"for entity type '{entity}'"
        )

        return len(keys_to_delete)

    def clear(self, reason: str = "User logout or session end") -> int:
        """
        Clear entire cache (called on logout).

        GDPR Compliance: Ensures session isolation and minimizes data exposure.

        Args:
            reason: Reason for clearing cache (for audit logging)

        Returns:
            Number of entries cleared
        """
        with self._lock:
            size = len(self._cache)
            self._cache.clear()

            # Reset statistics
            self._stats = {"hits": 0, "misses": 0, "evictions": 0, "sets": 0}

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.clear",
                user_id=None,
                resource_type="cache",
                resource_id="decryption-cache",
                action="delete",
                details={"entries_cleared": size, "reason": reason},
                success=True,
            )

        logger.info(f"[DecryptionCache] Cleared {size} entries. Reason: {reason}")

        return size

    def clear_user_data(self, user_id: str) -> int:
        """
        GDPR Article 17: Right to Erasure.

        Clear all cached data for a specific user when they request data deletion.

        Args:
            user_id: User ID to clear data for

        Returns:
            Number of entries deleted

        Example:
            # When user requests account deletion
            cache.clear_user_data("user-123")
        """
        keys_to_delete: List[str] = []

        with self._lock:
            # Find all keys that include the user ID
            # Key format may vary: "user:123:*" or "cases:123:user:456:*"
            for key in self._cache.keys():
                if f"user:{user_id}" in key:
                    keys_to_delete.append(key)

            # Delete matching entries
            for key in keys_to_delete:
                del self._cache[key]

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="gdpr.erasure",
                user_id=user_id,
                resource_type="cache",
                resource_id=f"user:{user_id}",
                action="delete",
                details={
                    "keys_deleted": len(keys_to_delete),
                    "article": "GDPR Article 17 - Right to Erasure",
                },
                success=True,
            )

        logger.info(
            f"[DecryptionCache] GDPR erasure: deleted {len(keys_to_delete)} "
            f"entries for user {user_id}"
        )

        return len(keys_to_delete)

    def get_user_cache_report(self, user_id: str) -> List[Dict[str, Any]]:
        """
        GDPR Article 15: Right of Access.

        Generate a report of all cached data for a specific user.

        Args:
            user_id: User ID to generate report for

        Returns:
            List of cache entries with metadata (no decrypted values)

        Example:
            # When user requests data access report
            report = cache.get_user_cache_report("user-123")
            # Returns: [{"key": "...", "size_bytes": 256, "created_at": "..."}]
        """
        report: List[Dict[str, Any]] = []

        with self._lock:
            for key, entry in self._cache.items():
                if f"user:{user_id}" in key:
                    report.append(
                        {
                            "key": key,
                            "size_bytes": len(entry.value.encode("utf-8")),
                            "created_at": time.strftime(
                                "%Y-%m-%d %H:%M:%S", time.localtime(entry.timestamp)
                            ),
                            "ttl_seconds": entry.ttl_seconds,
                            "access_count": entry.access_count,
                        }
                    )

        # Audit log
        if self.audit_logger:
            self.audit_logger.log(
                event_type="gdpr.access_request",
                user_id=user_id,
                resource_type="cache",
                resource_id=f"user:{user_id}",
                action="read",
                details={
                    "entries_found": len(report),
                    "article": "GDPR Article 15 - Right of Access",
                },
                success=True,
            )

        return report

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics for monitoring and debugging.

        Returns:
            Dictionary with cache statistics including size, hits, misses, etc.

        Example:
            stats = cache.get_stats()
            print(f"Hit rate: {stats['hit_rate']:.2f}%")
        """
        with self._lock:
            size = len(self._cache)
            hits = self._stats["hits"]
            misses = self._stats["misses"]
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "size": size,
                "max_size": self.max_size,
                "hits": hits,
                "misses": misses,
                "hit_rate": round(hit_rate, 2),
                "evictions": self._stats["evictions"],
                "sets": self._stats["sets"],
                "default_ttl_seconds": self.default_ttl,
            }

    def cleanup_expired(self) -> int:
        """
        Manually cleanup expired entries.

        This is automatically done during get() operations, but can be called
        manually for periodic cleanup tasks.

        Returns:
            Number of expired entries removed
        """
        keys_to_delete: List[str] = []

        with self._lock:
            # Find expired entries
            for key, entry in self._cache.items():
                if self._is_expired(entry):
                    keys_to_delete.append(key)

            # Delete expired entries
            for key in keys_to_delete:
                self._evict_entry(key, "expired")

        logger.debug(
            f"[DecryptionCache] Cleanup: removed {len(keys_to_delete)} " f"expired entries"
        )

        return len(keys_to_delete)

    # ===== PRIVATE HELPER METHODS =====

    def _is_expired(self, entry: CacheEntry) -> bool:
        """
        Check if a cache entry has expired based on TTL.

        Args:
            entry: Cache entry to check

        Returns:
            True if expired, False otherwise
        """
        current_time = time.time()
        age_seconds = current_time - entry.timestamp
        return age_seconds > entry.ttl_seconds

    def _evict_entry(self, key: str, reason: str) -> None:
        """
        Evict an entry from cache and log to audit.

        Args:
            key: Cache key to evict
            reason: Reason for eviction ("evict", "expired")
        """
        if key in self._cache:
            del self._cache[key]
            self._stats["evictions"] += 1

            # Audit log
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="cache.evict",
                    user_id=None,
                    resource_type="cache",
                    resource_id=key,
                    action="evict",
                    details={"reason": reason},
                    success=True,
                )

    def _record_hit(self, key: str) -> None:
        """
        Record a cache hit for statistics and audit logging.

        Args:
            key: Cache key that was hit
        """
        self._stats["hits"] += 1

        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.hit",
                user_id=None,
                resource_type="cache",
                resource_id=key,
                action="read",
                success=True,
            )

    def _record_miss(self, key: str) -> None:
        """
        Record a cache miss for statistics and audit logging.

        Args:
            key: Cache key that was missed
        """
        self._stats["misses"] += 1

        if self.audit_logger:
            self.audit_logger.log(
                event_type="cache.miss",
                user_id=None,
                resource_type="cache",
                resource_id=key,
                action="read",
                success=False,
            )


# ===== SINGLETON INSTANCE FOR GLOBAL ACCESS =====

_decryption_cache_instance: Optional[DecryptionCache] = None
_instance_lock = threading.Lock()


def get_decryption_cache(
    audit_logger: Optional[Any] = None,
    max_size: int = DecryptionCache.DEFAULT_MAX_SIZE,
    default_ttl: int = DecryptionCache.DEFAULT_TTL_SECONDS,
) -> DecryptionCache:
    """
    Get or create the global DecryptionCache singleton instance.

    Thread-safe singleton pattern ensures only one cache instance exists
    per application runtime.

    Args:
        audit_logger: Optional AuditLogger instance (only used on first call)
        max_size: Maximum cache size (only used on first call)
        default_ttl: Default TTL in seconds (only used on first call)

    Returns:
        Singleton DecryptionCache instance

    Example:
        from backend.services.decryption_cache import get_decryption_cache

        cache = get_decryption_cache()
        cache.set("key", "value")
    """
    global _decryption_cache_instance

    if _decryption_cache_instance is None:
        with _instance_lock:
            # Double-check locking pattern
            if _decryption_cache_instance is None:
                _decryption_cache_instance = DecryptionCache(
                    audit_logger=audit_logger, max_size=max_size, default_ttl=default_ttl
                )

    return _decryption_cache_instance


def reset_decryption_cache() -> None:
    """
    Reset the global DecryptionCache singleton instance.

    Mainly used for testing to ensure clean state between test runs.

    Warning:
        This will clear all cached data. Use with caution in production.
    """
    global _decryption_cache_instance

    with _instance_lock:
        if _decryption_cache_instance:
            _decryption_cache_instance.clear(reason="Cache reset")
            _decryption_cache_instance = None
            logger.info("[DecryptionCache] Singleton instance reset")
