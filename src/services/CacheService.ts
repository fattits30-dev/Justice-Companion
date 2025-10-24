import { LRUCache } from 'lru-cache';
import { errorLogger } from '../utils/error-logger.ts';

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  name: string;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

/**
 * Configuration for a named cache instance
 */
interface CacheConfig {
  name: string;
  max: number; // Max items in cache
  ttl?: number; // Time to live in milliseconds
  updateAgeOnGet?: boolean; // Update item age on access (true LRU)
}

/**
 * Cache entry metadata for debugging
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

/**
 * High-performance LRU caching service for Justice Companion
 *
 * Features:
 * - Multiple named caches with different TTL configurations
 * - Cache-aside pattern for transparent caching
 * - Pattern-based invalidation for bulk operations
 * - Comprehensive metrics and monitoring
 * - Memory-efficient with automatic eviction
 * - Feature flag support for safe rollback
 *
 * @example
 * ```typescript
 * const cacheService = new CacheService();
 *
 * // Simple caching with fallback
 * const case = await cacheService.getCached(
 *   `case:${id}`,
 *   () => repository.findById(id),
 *   'cases'
 * );
 *
 * // Invalidate on update
 * cacheService.invalidate(`case:${id}`);
 * cacheService.invalidatePattern(`case:user:${userId}:*`);
 * ```
 */
export class CacheService {
  private caches: Map<string, LRUCache<string, CacheEntry<any>>>;
  private stats: Map<string, { hits: number; misses: number; evictions: number }>;
  private enabled: boolean;

  /**
   * Default cache configurations for different data types
   */
  private readonly defaultConfigs: CacheConfig[] = [
    {
      name: 'sessions',
      max: 1000,
      ttl: 60 * 60 * 1000, // 1 hour
      updateAgeOnGet: true,
    },
    {
      name: 'cases',
      max: 500,
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true,
    },
    {
      name: 'evidence',
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true,
    },
    {
      name: 'profiles',
      max: 200,
      ttl: 30 * 60 * 1000, // 30 minutes
      updateAgeOnGet: true,
    },
    {
      name: 'default',
      max: 500,
      ttl: 10 * 60 * 1000, // 10 minutes default
      updateAgeOnGet: true,
    },
  ];

  constructor(configs?: CacheConfig[]) {
    // Feature flag for safe rollback
    this.enabled = process.env.ENABLE_CACHE !== 'false';

    this.caches = new Map();
    this.stats = new Map();

    // Initialize caches with provided or default configs
    const cacheConfigs = configs || this.defaultConfigs;

    for (const config of cacheConfigs) {
      this.createCache(config);
    }

    // Log cache initialization
    if (this.enabled) {
      console.log('[CacheService] Initialized with caches:',
        Array.from(this.caches.keys()).join(', '));
    } else {
      console.log('[CacheService] Cache disabled via feature flag');
    }
  }

  /**
   * Create a named cache with specific configuration
   */
  private createCache(config: CacheConfig): void {
    const cache = new LRUCache<string, CacheEntry<any>>({
      max: config.max,
      ttl: config.ttl,
      updateAgeOnGet: config.updateAgeOnGet ?? true,

      // Track evictions for metrics
      dispose: (_value, _key, reason) => {
        if (reason === 'evict') {
          const stats = this.stats.get(config.name);
          if (stats) {
            stats.evictions++;
          }
        }
      },
    });

    this.caches.set(config.name, cache);
    this.stats.set(config.name, { hits: 0, misses: 0, evictions: 0 });
  }

  /**
   * Get cached value or fetch from source (cache-aside pattern)
   *
   * @param key - Unique cache key
   * @param fetchFn - Function to fetch value if not cached
   * @param cacheName - Named cache to use (default: 'default')
   * @param ttl - Optional custom TTL for this entry (milliseconds)
   * @returns Cached or fetched value
   */
  async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    cacheName: string = 'default',
    ttl?: number
  ): Promise<T> {
    // Skip cache if disabled
    if (!this.enabled) {
      return fetchFn();
    }

    const cache = this.caches.get(cacheName) || this.caches.get('default')!;
    const stats = this.stats.get(cacheName) || this.stats.get('default')!;

    try {
      // Check cache first
      const cached = cache.get(key);
      if (cached !== undefined) {
        stats.hits++;
        cached.accessCount++;
        return cached.value;
      }

      // Cache miss - fetch from source
      stats.misses++;
      const value = await fetchFn();

      // Store in cache with metadata
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        accessCount: 0,
      };

      // Use custom TTL if provided
      if (ttl !== undefined) {
        cache.set(key, entry, { ttl });
      } else {
        cache.set(key, entry);
      }

      return value;
    } catch (error) {
      // Log error but don't fail the operation
      errorLogger.logError(error as Error, {
        context: 'CacheService.getCached',
        key,
        cacheName,
      });

      // Fallback to direct fetch on cache error
      return fetchFn();
    }
  }

  /**
   * Invalidate a specific cache entry
   *
   * @param key - Cache key to invalidate
   * @param cacheName - Optional specific cache, otherwise checks all
   */
  invalidate(key: string, cacheName?: string): void {
    if (!this.enabled) {return;}

    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (cache) {
        cache.delete(key);
      }
    } else {
      // Invalidate across all caches
      for (const cache of this.caches.values()) {
        cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * Supports wildcards: 'user:*', 'case:123:*'
   *
   * @param pattern - Pattern to match (supports * wildcard)
   * @param cacheName - Optional specific cache, otherwise checks all
   */
  invalidatePattern(pattern: string, cacheName?: string): void {
    if (!this.enabled) {return;}

    // Convert pattern to regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    const cachesToCheck = cacheName
      ? [this.caches.get(cacheName)].filter(Boolean)
      : Array.from(this.caches.values());

    for (const cache of cachesToCheck) {
      if (!cache) {continue;} // Skip undefined caches

      // Get all keys and filter by pattern
      const keys = Array.from(cache.keys());
      for (const key of keys) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all entries from a specific cache or all caches
   *
   * @param cacheName - Optional cache name, clears all if not specified
   */
  clear(cacheName?: string): void {
    if (!this.enabled) {return;}

    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (cache) {
        cache.clear();
      }
    } else {
      // Clear all caches
      for (const cache of this.caches.values()) {
        cache.clear();
      }
    }
  }

  /**
   * Get statistics for a specific cache or all caches
   *
   * @param cacheName - Optional cache name
   * @returns Cache statistics
   */
  getStats(cacheName?: string): CacheStats[] {
    const results: CacheStats[] = [];

    const cachesToReport = cacheName
      ? [cacheName]
      : Array.from(this.caches.keys());

    for (const name of cachesToReport) {
      const cache = this.caches.get(name);
      const stats = this.stats.get(name);

      if (cache && stats) {
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

        results.push({
          name,
          hits: stats.hits,
          misses: stats.misses,
          hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimals
          size: cache.size,
          maxSize: cache.max,
          evictions: stats.evictions,
        });
      }
    }

    return results;
  }

  /**
   * Get detailed information about cache entries (for debugging)
   *
   * @param cacheName - Cache to inspect
   * @param limit - Max entries to return
   */
  inspect(cacheName: string, limit: number = 10): Array<{ key: string; entry: CacheEntry<any> }> {
    const cache = this.caches.get(cacheName);
    if (!cache) {return [];}

    const entries: Array<{ key: string; entry: CacheEntry<any> }> = [];
    let count = 0;

    for (const [key, entry] of cache.entries()) {
      if (count >= limit) {break;}
      entries.push({ key, entry });
      count++;
    }

    return entries;
  }

  /**
   * Reset statistics for monitoring
   *
   * @param cacheName - Optional cache name, resets all if not specified
   */
  resetStats(cacheName?: string): void {
    const cachesToReset = cacheName
      ? [cacheName]
      : Array.from(this.stats.keys());

    for (const name of cachesToReset) {
      const stats = this.stats.get(name);
      if (stats) {
        stats.hits = 0;
        stats.misses = 0;
        stats.evictions = 0;
      }
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable caching at runtime
   *
   * @param enabled - Whether to enable caching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Clear all caches when disabling
      this.clear();
    }
  }

  /**
   * Preload cache with multiple entries
   * Useful for warming up the cache
   *
   * @param entries - Array of cache entries to preload
   * @param cacheName - Cache to preload into
   */
  async preload<T>(
    entries: Array<{ key: string; fetchFn: () => Promise<T> }>,
    cacheName: string = 'default'
  ): Promise<void> {
    if (!this.enabled) {return;}

    const promises = entries.map(({ key, fetchFn }) =>
      this.getCached(key, fetchFn, cacheName)
    );

    await Promise.all(promises);
  }
}

// Singleton instance for global access
let cacheServiceInstance: CacheService | null = null;

/**
 * Get or create the global cache service instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

/**
 * Reset the global cache service (mainly for testing)
 */
export function resetCacheService(): void {
  if (cacheServiceInstance) {
    cacheServiceInstance.clear();
    cacheServiceInstance = null;
  }
}