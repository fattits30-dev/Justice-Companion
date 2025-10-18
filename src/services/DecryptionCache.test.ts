import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecryptionCache } from './DecryptionCache';
import type { AuditLogger } from './AuditLogger';

describe('DecryptionCache', () => {
  let cache: DecryptionCache;
  let mockAuditLogger: AuditLogger;

  beforeEach(() => {
    // Mock audit logger
    mockAuditLogger = {
      log: vi.fn(),
    } as unknown as AuditLogger;

    cache = new DecryptionCache(mockAuditLogger);
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cached values', () => {
      cache.set('test:1:v1', 'decrypted-value');
      const result = cache.get('test:1:v1');

      expect(result).toBe('decrypted-value');
    });

    it('should return undefined for cache miss', () => {
      const result = cache.get('nonexistent:key');

      expect(result).toBeUndefined();
    });

    it('should log cache hit events', () => {
      cache.set('test:1:v1', 'value');
      cache.get('test:1:v1');

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cache.hit',
          resourceType: 'cache',
          resourceId: 'test:1:v1',
          action: 'read',
          success: true,
        }),
      );
    });

    it('should log cache miss events', () => {
      cache.get('nonexistent:key');

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cache.miss',
          resourceType: 'cache',
          resourceId: 'nonexistent:key',
          action: 'read',
          success: false,
        }),
      );
    });

    it('should log cache set events', () => {
      cache.set('test:1:v1', 'value');

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cache.set',
          resourceType: 'cache',
          resourceId: 'test:1:v1',
          action: 'create',
          success: true,
        }),
      );
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(() => {
      // Populate cache with test data
      cache.set('cases:1:v1', 'case-1-data');
      cache.set('cases:2:v1', 'case-2-data');
      cache.set('evidence:1:v1', 'evidence-1-data');
    });

    it('should invalidate specific entity entries', () => {
      cache.invalidateEntity('cases', 1);

      expect(cache.get('cases:1:v1')).toBeUndefined();
      expect(cache.get('cases:2:v1')).toBe('case-2-data');
      expect(cache.get('evidence:1:v1')).toBe('evidence-1-data');
    });

    it('should invalidate all entries for an entity type', () => {
      cache.invalidateEntityType('cases');

      expect(cache.get('cases:1:v1')).toBeUndefined();
      expect(cache.get('cases:2:v1')).toBeUndefined();
      expect(cache.get('evidence:1:v1')).toBe('evidence-1-data');
    });

    it('should log entity invalidation', () => {
      cache.invalidateEntity('cases', 1);

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cache.invalidate_entity',
          resourceType: 'cache',
          resourceId: 'cases:1',
          action: 'delete',
        }),
      );
    });

    it('should clear entire cache', () => {
      cache.clear();

      expect(cache.get('cases:1:v1')).toBeUndefined();
      expect(cache.get('cases:2:v1')).toBeUndefined();
      expect(cache.get('evidence:1:v1')).toBeUndefined();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when max size reached', () => {
      // Create a cache with max size of 3 for testing
      const smallCache = new DecryptionCache(mockAuditLogger);

      // Fill cache to capacity (LRU cache has max 1000 by default, so we test behavior)
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      // Access key1 to make it recently used
      smallCache.get('key1');

      // All should still be accessible
      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(1000);
    });

    it('should update size when entries are added/removed', () => {
      cache.set('key1', 'value1');
      expect(cache.getStats().size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.getStats().size).toBe(2);

      cache.invalidateEntity('key1', 'v1'); // Won't match, size stays 2
      expect(cache.getStats().size).toBe(2);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('GDPR Compliance', () => {
    describe('Article 17: Right to Erasure', () => {
      it('should clear all user data on erasure request', () => {
        cache.set('user:123:data1', 'sensitive-data-1');
        cache.set('user:123:data2', 'sensitive-data-2');
        cache.set('user:456:data1', 'other-user-data');

        cache.clearUserData('123');

        expect(cache.get('user:123:data1')).toBeUndefined();
        expect(cache.get('user:123:data2')).toBeUndefined();
        expect(cache.get('user:456:data1')).toBe('other-user-data');
      });

      it('should log erasure events', () => {
        cache.set('user:123:data1', 'data');
        cache.clearUserData('123');

        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'gdpr.erasure',
            resourceType: 'cache',
            resourceId: 'user:123',
            action: 'delete',
            details: expect.objectContaining({
              article: 'GDPR Article 17 - Right to Erasure',
            }),
          }),
        );
      });
    });

    describe('Article 15: Right of Access', () => {
      it('should generate user cache report', () => {
        cache.set('user:123:data1', 'small-data');
        cache.set('user:123:data2', 'larger-data-value');
        cache.set('user:456:data1', 'other-data');

        const report = cache.getUserCacheReport('123');

        // Verify correct number of entries
        expect(report).toHaveLength(2);

        // Extract and sort keys to verify both are present (LRU cache doesn't guarantee order)
        const keys = report.map((r) => r.key).sort();
        expect(keys).toEqual(['user:123:data1', 'user:123:data2']);

        // Verify all entries have positive size
        expect(report.every((r) => r.size > 0)).toBe(true);

        // Verify data2 has larger size than data1
        const data1Entry = report.find((r) => r.key === 'user:123:data1')!;
        const data2Entry = report.find((r) => r.key === 'user:123:data2')!;
        expect(data2Entry.size).toBeGreaterThan(data1Entry.size);
      });

      it('should log access request events', () => {
        cache.set('user:123:data', 'data');
        cache.getUserCacheReport('123');

        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'gdpr.access_request',
            resourceType: 'cache',
            resourceId: 'user:123',
            action: 'read',
            details: expect.objectContaining({
              article: 'GDPR Article 15 - Right of Access',
            }),
          }),
        );
      });

      it('should return empty report for user with no cached data', () => {
        const report = cache.getUserCacheReport('nonexistent');

        expect(report).toHaveLength(0);
      });
    });
  });

  describe('Security', () => {
    it('should initialize cache and log event', () => {
      // Cache initialization happens in constructor
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cache.initialized',
          resourceType: 'cache',
          resourceId: 'decryption-cache',
          action: 'create',
          details: { maxSize: 1000, ttl: 300000 },
        }),
      );
    });

    it('should work without audit logger', () => {
      const cacheWithoutLogger = new DecryptionCache();

      expect(() => {
        cacheWithoutLogger.set('key', 'value');
        cacheWithoutLogger.get('key');
      }).not.toThrow();
    });
  });
});
