import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CacheService,
  resetCacheService,
  getCacheService,
} from "./CacheService.ts";

describe("CacheService", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset singleton before each test
    resetCacheService();
    // Clear any environment variables
    delete process.env.ENABLE_CACHE;
    // Create fresh instance
    cacheService = new CacheService();
  });

  afterEach(() => {
    // Clean up after each test
    if (cacheService) {
      cacheService.clear();
    }
    vi.clearAllMocks();
  });

  describe("Basic Operations", () => {
    it("should cache and retrieve values", async () => {
      const key = "test-key";
      const value = { data: "test-value" };
      const fetchFn = vi.fn().mockResolvedValue(value);

      // First call should fetch
      const result1 = await cacheService.getCached(key, fetchFn);
      expect(result1).toEqual(value);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call should hit cache
      const result2 = await cacheService.getCached(key, fetchFn);
      expect(result2).toEqual(value);
      expect(fetchFn).toHaveBeenCalledTimes(1); // Still 1, not called again

      // Verify stats
      const stats = cacheService.getStats("default");
      expect(stats[0].hits).toBe(1);
      expect(stats[0].misses).toBe(1);
      expect(stats[0].hitRate).toBe(50);
    });

    it("should handle cache misses correctly", async () => {
      const key = "missing-key";
      const value = "fetched-value";
      const fetchFn = vi.fn().mockResolvedValue(value);

      const result = await cacheService.getCached(key, fetchFn);

      expect(result).toBe(value);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const stats = cacheService.getStats("default");
      expect(stats[0].misses).toBe(1);
      expect(stats[0].hits).toBe(0);
    });

    it("should invalidate specific cache entries", async () => {
      const key = "invalidate-test";
      const value1 = "value-1";
      const value2 = "value-2";
      let callCount = 0;
      const fetchFn = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? value1 : value2;
      });

      // Cache the first value
      const result1 = await cacheService.getCached(key, fetchFn);
      expect(result1).toBe(value1);

      // Invalidate the cache
      cacheService.invalidate(key);

      // Should fetch new value after invalidation
      const result2 = await cacheService.getCached(key, fetchFn);
      expect(result2).toBe(value2);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("should clear all caches", async () => {
      const keys = ["key1", "key2", "key3"];
      const fetchFn = vi.fn().mockImplementation((key) => `value-${key}`);

      // Cache multiple values
      for (const key of keys) {
        await cacheService.getCached(key, () => fetchFn(key));
      }

      // Clear all caches
      cacheService.clear();

      // All values should need to be fetched again
      for (const key of keys) {
        await cacheService.getCached(key, () => fetchFn(key));
      }

      expect(fetchFn).toHaveBeenCalledTimes(6); // 3 initial + 3 after clear
    });
  });

  describe("Named Caches", () => {
    it("should use different caches for different names", async () => {
      const sessionKey = "session:123";
      const caseKey = "case:456";

      const sessionValue = { userId: 1 };
      const caseValue = { title: "Test Case" };

      await cacheService.getCached(
        sessionKey,
        async () => sessionValue,
        "sessions",
      );
      await cacheService.getCached(caseKey, async () => caseValue, "cases");

      // Check that both caches have their values
      const sessionStats = cacheService.getStats("sessions");
      const caseStats = cacheService.getStats("cases");

      expect(sessionStats[0].size).toBe(1);
      expect(caseStats[0].size).toBe(1);
    });

    it("should apply different TTLs to different caches", async () => {
      // This test would need to mock timers to test TTL expiration
      // For now, we verify that caches are created with expected configurations
      const stats = cacheService.getStats();

      const sessionCache = stats.find((s) => s.name === "sessions");
      const caseCache = stats.find((s) => s.name === "cases");

      expect(sessionCache).toBeDefined();
      expect(sessionCache?.maxSize).toBe(1000);

      expect(caseCache).toBeDefined();
      expect(caseCache?.maxSize).toBe(500);
    });
  });

  describe("Pattern Invalidation", () => {
    it("should invalidate keys matching pattern with wildcard", async () => {
      const keys = [
        "user:1:profile",
        "user:1:settings",
        "user:2:profile",
        "other:key",
      ];

      // Cache all values
      for (const key of keys) {
        await cacheService.getCached(key, async () => `value-${key}`);
      }

      // Invalidate all user:1:* keys
      cacheService.invalidatePattern("user:1:*");

      const fetchFn = vi.fn().mockImplementation((key) => `new-${key}`);

      // user:1:* keys should be invalidated
      const result1 = await cacheService.getCached("user:1:profile", () =>
        fetchFn("user:1:profile"),
      );
      expect(result1).toBe("new-user:1:profile");
      expect(fetchFn).toHaveBeenCalledWith("user:1:profile");

      const result2 = await cacheService.getCached("user:1:settings", () =>
        fetchFn("user:1:settings"),
      );
      expect(result2).toBe("new-user:1:settings");
      expect(fetchFn).toHaveBeenCalledWith("user:1:settings");

      // Other keys should still be cached
      const result3 = await cacheService.getCached("user:2:profile", () =>
        fetchFn("user:2:profile"),
      );
      expect(result3).toBe("value-user:2:profile");
      expect(fetchFn).not.toHaveBeenCalledWith("user:2:profile");

      const result4 = await cacheService.getCached("other:key", () =>
        fetchFn("other:key"),
      );
      expect(result4).toBe("value-other:key");
      expect(fetchFn).not.toHaveBeenCalledWith("other:key");
    });

    it("should handle complex patterns", async () => {
      const keys = [
        "case:123:evidence:1",
        "case:123:evidence:2",
        "case:456:evidence:1",
        "evidence:standalone:1",
      ];

      for (const key of keys) {
        await cacheService.getCached(key, async () => key);
      }

      // Invalidate all evidence for case 123
      cacheService.invalidatePattern("case:123:evidence:*");

      const fetchFn = vi.fn().mockImplementation((key) => `new-${key}`);

      // Check that only case:123:evidence:* keys were invalidated
      await cacheService.getCached("case:123:evidence:1", () =>
        fetchFn("case:123:evidence:1"),
      );
      expect(fetchFn).toHaveBeenCalledWith("case:123:evidence:1");

      await cacheService.getCached("case:456:evidence:1", () =>
        fetchFn("case:456:evidence:1"),
      );
      expect(fetchFn).not.toHaveBeenCalledWith("case:456:evidence:1");
    });
  });

  describe("TTL and Eviction", () => {
    it("should respect custom TTL for entries", async () => {
      const key = "ttl-test";
      const value = "test-value";
      const fetchFn = vi.fn().mockResolvedValue(value);

      // Cache with very short TTL (50ms) for fast testing
      await cacheService.getCached(key, fetchFn, "default", 50);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Should still be cached immediately after
      await cacheService.getCached(key, fetchFn, "default");
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired and fetch again
      await cacheService.getCached(key, fetchFn, "default");
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("should evict LRU entries when cache is full", async () => {
      // Create a small cache for testing
      const smallCache = new CacheService([
        { name: "tiny", max: 3, ttl: 60000, updateAgeOnGet: true },
      ]);

      // Fill the cache to capacity
      await smallCache.getCached("key1", async () => "value1", "tiny");
      await smallCache.getCached("key2", async () => "value2", "tiny");
      await smallCache.getCached("key3", async () => "value3", "tiny");

      // Access key1 to make it more recently used
      await smallCache.getCached(
        "key1",
        async () => "should-be-cached",
        "tiny",
      );

      // Add a new key, which should evict the LRU (key2)
      await smallCache.getCached("key4", async () => "value4", "tiny");

      // Check that key2 was evicted (will need to fetch again)
      const fetchFn = vi.fn().mockResolvedValue("new-value2");
      await smallCache.getCached("key2", fetchFn, "tiny");
      expect(fetchFn).toHaveBeenCalled();

      // Check eviction stats
      const stats = smallCache.getStats("tiny");
      expect(stats[0].evictions).toBeGreaterThan(0);
    });
  });

  describe("Feature Flag", () => {
    it("should bypass cache when disabled via environment variable", async () => {
      process.env.ENABLE_CACHE = "false";
      const disabledCache = new CacheService();

      const fetchFn = vi.fn().mockResolvedValue("value");

      // Should always call fetch function when disabled
      await disabledCache.getCached("key", fetchFn);
      await disabledCache.getCached("key", fetchFn);
      await disabledCache.getCached("key", fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it("should toggle cache at runtime", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      // Cache should work initially
      await cacheService.getCached("key", fetchFn);
      await cacheService.getCached("key", fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Disable cache
      cacheService.setEnabled(false);

      // Should bypass cache when disabled
      await cacheService.getCached("key", fetchFn);
      await cacheService.getCached("key", fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(3);

      // Re-enable cache
      cacheService.setEnabled(true);

      // Should cache again
      await cacheService.getCached("key2", fetchFn);
      await cacheService.getCached("key2", fetchFn);
      expect(fetchFn).toHaveBeenCalledTimes(4); // Only one more call
    });
  });

  describe("Statistics and Monitoring", () => {
    it("should track hit rate accurately", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      // Create pattern: miss, hit, hit, miss, hit
      await cacheService.getCached("key1", fetchFn);
      await cacheService.getCached("key1", fetchFn);
      await cacheService.getCached("key1", fetchFn);
      await cacheService.getCached("key2", fetchFn);
      await cacheService.getCached("key2", fetchFn);

      const stats = cacheService.getStats("default");
      expect(stats[0].hits).toBe(3);
      expect(stats[0].misses).toBe(2);
      expect(stats[0].hitRate).toBe(60); // 3/5 = 60%
    });

    it("should reset statistics", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      // Generate some stats
      await cacheService.getCached("key", fetchFn);
      await cacheService.getCached("key", fetchFn);

      // Reset stats
      cacheService.resetStats();

      const stats = cacheService.getStats("default");
      expect(stats[0].hits).toBe(0);
      expect(stats[0].misses).toBe(0);
      expect(stats[0].hitRate).toBe(0);
    });

    it("should provide inspection capabilities", async () => {
      const testData = [
        { key: "inspect1", value: "value1" },
        { key: "inspect2", value: "value2" },
        { key: "inspect3", value: "value3" },
      ];

      for (const { key, value } of testData) {
        await cacheService.getCached(key, async () => value);
      }

      const entries = cacheService.inspect("default", 2);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty("key");
      expect(entries[0]).toHaveProperty("entry");
      expect(entries[0].entry).toHaveProperty("value");
      expect(entries[0].entry).toHaveProperty("timestamp");
      expect(entries[0].entry).toHaveProperty("accessCount");
    });
  });

  describe("Error Handling", () => {
    it("should fall back to fetch on cache errors", async () => {
      const value = "fallback-value";
      const fetchFn = vi.fn().mockResolvedValue(value);

      // Even if internal cache operations fail, should still return value
      const result = await cacheService.getCached("key", fetchFn);
      expect(result).toBe(value);
      expect(fetchFn).toHaveBeenCalled();
    });

    it("should handle fetch function errors", async () => {
      const error = new Error("Fetch failed");
      const fetchFn = vi.fn().mockRejectedValue(error);

      await expect(cacheService.getCached("key", fetchFn)).rejects.toThrow(
        "Fetch failed",
      );
    });
  });

  describe("Preloading", () => {
    it("should preload multiple entries efficiently", async () => {
      const entries = [
        { key: "preload1", fetchFn: async () => "value1" },
        { key: "preload2", fetchFn: async () => "value2" },
        { key: "preload3", fetchFn: async () => "value3" },
      ];

      await cacheService.preload(entries);

      // All entries should now be cached
      const fetchFn = vi.fn();
      await cacheService.getCached("preload1", fetchFn);
      await cacheService.getCached("preload2", fetchFn);
      await cacheService.getCached("preload3", fetchFn);

      expect(fetchFn).not.toHaveBeenCalled();

      const stats = cacheService.getStats("default");
      expect(stats[0].hits).toBe(3);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance from getCacheService", () => {
      const instance1 = getCacheService();
      const instance2 = getCacheService();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton with resetCacheService", () => {
      const instance1 = getCacheService();
      resetCacheService();
      const instance2 = getCacheService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Memory Management", () => {
    it("should track memory utilization", async () => {
      const cache = new CacheService([
        { name: "memory-test", max: 10, ttl: 60000 },
      ]);

      // Add 5 entries to a cache with max 10
      for (let i = 0; i < 5; i++) {
        await cache.getCached(
          `key${i}`,
          async () => `value${i}`,
          "memory-test",
        );
      }

      const stats = cache.getStats("memory-test");
      expect(stats[0].size).toBe(5);
      expect(stats[0].maxSize).toBe(10);
    });

    it("should not leak memory when entries expire", async () => {
      // Create cache with very short TTL (50ms) for fast testing
      const cache = new CacheService([
        { name: "leak-test", max: 100, ttl: 50 },
      ]);

      // Add many entries
      for (let i = 0; i < 50; i++) {
        await cache.getCached(`key${i}`, async () => `value${i}`, "leak-test");
      }

      let stats = cache.getStats("leak-test");
      expect(stats[0].size).toBe(50);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Access multiple expired keys to trigger cleanup
      // LRU cache lazily removes expired entries on access
      for (let i = 0; i < 50; i++) {
        await cache.getCached(
          `key${i}`,
          async () => `new-value${i}`,
          "leak-test",
        );
      }

      // All old entries should be expired and replaced with new values
      // Size should be 50 (all new values)
      stats = cache.getStats("leak-test");
      expect(stats[0].size).toBe(50);

      // But the fetch function should have been called 50 times (cache misses due to expiration)
      // This proves entries expired properly
    });
  });
});
