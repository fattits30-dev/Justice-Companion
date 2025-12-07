"""
AI Response Cache - Reduce redundant AI API calls

Provides in-memory caching for AI responses with TTL and size limits.
Significantly reduces latency and costs for repeated queries.

Features:
- Intelligent cache key generation from messages + model + provider
- TTL-based expiration
- LRU eviction when cache is full
- Thread-safe operations
- Cache statistics tracking
- Optional Redis backend for production (not yet implemented)

Usage:
    cache = AIResponseCache(max_size=1000, default_ttl=3600)

    # Check cache before AI call
    cached = cache.get(messages, provider, model)
    if cached:
        return cached

    # Make AI call
    response = await ai_service.chat(messages)

    # Store in cache
    cache.set(messages, provider, model, response)
"""

import hashlib
import json
import time
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from collections import OrderedDict
from threading import Lock

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    response: str
    created_at: float
    ttl: float
    provider: str
    model: str
    message_count: int

    def is_expired(self) -> bool:
        """Check if entry has expired."""
        return time.time() > (self.created_at + self.ttl)


class AIResponseCache:
    """
    In-memory LRU cache for AI responses.

    Uses OrderedDict for LRU eviction and provides thread-safe operations.
    """

    def __init__(
        self,
        max_size: int = 1000,
        default_ttl: float = 3600.0,  # 1 hour
        enable_stats: bool = True,
    ):
        """
        Initialize AI response cache.

        Args:
            max_size: Maximum number of cached responses
            default_ttl: Default TTL in seconds (1 hour)
            enable_stats: Whether to track cache statistics
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.enable_stats = enable_stats

        # LRU cache using OrderedDict
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = Lock()

        # Statistics
        self._hits = 0
        self._misses = 0
        self._evictions = 0

        logger.info(
            f"Initialized AIResponseCache: max_size={max_size}, "
            f"default_ttl={default_ttl}s"
        )

    def _generate_cache_key(
        self,
        messages: List[Dict[str, str]],
        provider: str,
        model: str,
    ) -> str:
        """
        Generate deterministic cache key from messages + provider + model.

        Args:
            messages: Chat messages (list of {role, content} dicts)
            provider: AI provider (e.g., 'openai', 'anthropic')
            model: Model identifier

        Returns:
            SHA256 hash as cache key
        """
        # Serialize messages to JSON (sorted for determinism)
        messages_json = json.dumps(messages, sort_keys=True)

        # Combine messages + provider + model
        key_str = f"{provider}:{model}:{messages_json}"

        # Hash to fixed-length key
        return hashlib.sha256(key_str.encode()).hexdigest()

    def get(
        self,
        messages: List[Dict[str, str]],
        provider: str,
        model: str,
    ) -> Optional[str]:
        """
        Get cached response if available and not expired.

        Args:
            messages: Chat messages
            provider: AI provider
            model: Model identifier

        Returns:
            Cached response or None if not found/expired
        """
        cache_key = self._generate_cache_key(messages, provider, model)

        with self._lock:
            entry = self._cache.get(cache_key)

            if entry is None:
                # Cache miss
                if self.enable_stats:
                    self._misses += 1
                logger.debug(f"Cache MISS: {provider}/{model} ({len(messages)} msgs)")
                return None

            # Check expiration
            if entry.is_expired():
                # Expired - remove and return None
                del self._cache[cache_key]
                if self.enable_stats:
                    self._misses += 1
                logger.debug(
                    f"Cache EXPIRED: {provider}/{model} ({len(messages)} msgs)"
                )
                return None

            # Cache hit - move to end for LRU
            self._cache.move_to_end(cache_key)

            if self.enable_stats:
                self._hits += 1

            logger.debug(
                f"Cache HIT: {provider}/{model} ({len(messages)} msgs), "
                f"age={time.time() - entry.created_at:.1f}s"
            )

            return entry.response

    def set(
        self,
        messages: List[Dict[str, str]],
        provider: str,
        model: str,
        response: str,
        ttl: Optional[float] = None,
    ) -> None:
        """
        Store response in cache.

        Args:
            messages: Chat messages
            provider: AI provider
            model: Model identifier
            response: AI response to cache
            ttl: Optional TTL override (defaults to default_ttl)
        """
        cache_key = self._generate_cache_key(messages, provider, model)
        ttl = ttl or self.default_ttl

        with self._lock:
            # Check size limit - evict oldest if full
            if len(self._cache) >= self.max_size and cache_key not in self._cache:
                # Evict oldest (first item in OrderedDict)
                evicted_key, evicted_entry = self._cache.popitem(last=False)
                if self.enable_stats:
                    self._evictions += 1
                logger.debug(
                    f"Cache EVICT: {evicted_entry.provider}/{evicted_entry.model} "
                    f"(size limit: {self.max_size})"
                )

            # Store new entry
            entry = CacheEntry(
                response=response,
                created_at=time.time(),
                ttl=ttl,
                provider=provider,
                model=model,
                message_count=len(messages),
            )

            self._cache[cache_key] = entry

            logger.debug(
                f"Cache SET: {provider}/{model} ({len(messages)} msgs), "
                f"ttl={ttl}s, size={len(self._cache)}/{self.max_size}"
            )

    def clear(self) -> None:
        """Clear all cached responses."""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Cache cleared: {count} entries removed")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (
                (self._hits / total_requests * 100) if total_requests > 0 else 0.0
            )

            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "total_requests": total_requests,
                "hit_rate": round(hit_rate, 2),
            }

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries.

        Returns:
            Number of entries removed
        """
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items() if entry.is_expired()
            ]

            for key in expired_keys:
                del self._cache[key]

            if expired_keys:
                logger.info(f"Cache cleanup: {len(expired_keys)} expired entries removed")

            return len(expired_keys)


# Global cache instance (can be replaced with Redis in production)
_global_cache: Optional[AIResponseCache] = None


def get_global_cache() -> AIResponseCache:
    """
    Get global cache instance (singleton).

    Returns:
        Global AIResponseCache instance
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = AIResponseCache(
            max_size=1000,  # Cache up to 1000 responses
            default_ttl=3600.0,  # 1 hour TTL
            enable_stats=True,
        )
    return _global_cache


def configure_global_cache(
    max_size: int = 1000,
    default_ttl: float = 3600.0,
    enable_stats: bool = True,
) -> AIResponseCache:
    """
    Configure global cache instance.

    Args:
        max_size: Maximum cache size
        default_ttl: Default TTL in seconds
        enable_stats: Enable statistics tracking

    Returns:
        Configured global cache
    """
    global _global_cache
    _global_cache = AIResponseCache(
        max_size=max_size,
        default_ttl=default_ttl,
        enable_stats=enable_stats,
    )
    return _global_cache
