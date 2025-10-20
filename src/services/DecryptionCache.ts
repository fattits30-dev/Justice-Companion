import { LRUCache } from 'lru-cache';
import type { AuditLogger } from './AuditLogger.ts';

/**
 * In-memory LRU cache for decrypted values
 *
 * SECURITY CONSTRAINTS:
 * - Never persisted to disk (GDPR Article 32 - Encryption at rest)
 * - Auto-eviction after 5 minutes (minimize exposure window)
 * - Max 1000 entries (prevent memory exhaustion)
 * - Cleared on logout (session isolation)
 */
export class DecryptionCache {
  private cache: LRUCache<string, string>;
  private auditLogger?: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger;

    this.cache = new LRUCache<string, string>({
      max: 1000, // Maximum 1000 entries
      ttl: 1000 * 60 * 5, // 5 minutes TTL
      updateAgeOnGet: true, // Reset TTL on access

      // Audit cache eviction for security monitoring
      dispose: (_value, key, reason) => {
        this.auditLogger?.log({
          eventType: 'cache.evict',
          resourceType: 'cache',
          resourceId: key,
          action: 'evict',
          details: { reason },
          success: true,
        });
      },
    });

    this.auditLogger?.log({
      eventType: 'cache.initialized',
      resourceType: 'cache',
      resourceId: 'decryption-cache',
      action: 'create',
      details: { maxSize: 1000, ttl: 300000 },
      success: true,
    });
  }

  /**
   * Get cached decrypted value
   *
   * @param key - Cache key
   * @returns Decrypted value or undefined if not cached
   */
  public get(key: string): string | undefined {
    const value = this.cache.get(key);

    if (value) {
      this.auditLogger?.log({
        eventType: 'cache.hit',
        resourceType: 'cache',
        resourceId: key,
        action: 'read',
        success: true,
      });
    } else {
      this.auditLogger?.log({
        eventType: 'cache.miss',
        resourceType: 'cache',
        resourceId: key,
        action: 'read',
        success: false,
      });
    }

    return value;
  }

  /**
   * Set cached decrypted value
   *
   * @param key - Cache key
   * @param value - Decrypted value
   */
  public set(key: string, value: string): void {
    this.cache.set(key, value);

    this.auditLogger?.log({
      eventType: 'cache.set',
      resourceType: 'cache',
      resourceId: key,
      action: 'create',
      success: true,
    });
  }

  /**
   * Invalidate cache entries for a specific entity
   * Called on UPDATE/DELETE operations
   *
   * @param entity - Entity type (e.g., 'cases', 'evidence')
   * @param id - Entity ID
   */
  public invalidateEntity(entity: string, id: string | number): void {
    const keysToDelete: string[] = [];

    // LRUCache doesn't support prefix search, so we need to iterate
    this.cache.forEach((_value, key) => {
      if (key.startsWith(`${entity}:${id}:`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    this.auditLogger?.log({
      eventType: 'cache.invalidate_entity',
      resourceType: 'cache',
      resourceId: `${entity}:${id}`,
      action: 'delete',
      details: { keysDeleted: keysToDelete.length },
      success: true,
    });
  }

  /**
   * Invalidate all cache entries for an entity type
   * Called on bulk operations
   *
   * @param entity - Entity type (e.g., 'cases', 'evidence')
   */
  public invalidateEntityType(entity: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_value, key) => {
      if (key.startsWith(`${entity}:`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    this.auditLogger?.log({
      eventType: 'cache.invalidate_type',
      resourceType: 'cache',
      resourceId: entity,
      action: 'delete',
      details: { keysDeleted: keysToDelete.length },
      success: true,
    });
  }

  /**
   * Clear entire cache (called on logout)
   * GDPR Compliance: Ensures session isolation
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    this.auditLogger?.log({
      eventType: 'cache.clear',
      resourceType: 'cache',
      resourceId: 'decryption-cache',
      action: 'delete',
      details: { entriesCleared: size, reason: 'User logout or session end' },
      success: true,
    });
  }

  /**
   * Get cache statistics for monitoring
   *
   * @returns Cache statistics
   */
  public getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000,
    };
  }

  /**
   * GDPR Article 17: Right to Erasure
   * Clear cache when user requests data deletion
   *
   * @param userId - User ID to clear data for
   */
  public clearUserData(userId: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_value, key) => {
      // Key format may include user context
      // For now, this is a placeholder - actual implementation
      // depends on whether userId is included in cache keys
      if (key.includes(`user:${userId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    this.auditLogger?.log({
      eventType: 'gdpr.erasure',
      resourceType: 'cache',
      resourceId: `user:${userId}`,
      action: 'delete',
      details: {
        keysDeleted: keysToDelete.length,
        article: 'GDPR Article 17 - Right to Erasure',
      },
      success: true,
    });
  }

  /**
   * GDPR Article 15: Right of Access
   * Report all cached data for a user
   *
   * @param userId - User ID to generate report for
   * @returns Array of cache entries with metadata
   */
  public getUserCacheReport(userId: string): Array<{ key: string; size: number }> {
    const report: Array<{ key: string; size: number }> = [];

    this.cache.forEach((value, key) => {
      if (key.includes(`user:${userId}`)) {
        report.push({
          key,
          size: Buffer.byteLength(value, 'utf-8'),
        });
      }
    });

    this.auditLogger?.log({
      eventType: 'gdpr.access_request',
      resourceType: 'cache',
      resourceId: `user:${userId}`,
      action: 'read',
      details: {
        entriesFound: report.length,
        article: 'GDPR Article 15 - Right of Access',
      },
      success: true,
    });

    return report;
  }
}
