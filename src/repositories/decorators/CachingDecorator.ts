/**
 * Caching Decorator for Repositories
 *
 * Adds a caching layer to repository operations to improve performance
 * by reducing redundant database queries. Automatically handles cache
 * invalidation on write operations.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../shared/infrastructure/di/types.ts';
import type { ICacheService } from '../../shared/infrastructure/di/interfaces.ts';
import { RepositoryDecorator } from './RepositoryDecorator.ts';

/**
 * Adds caching layer to repository operations
 * Uses CacheService for consistent cache management
 *
 * Features:
 * - Automatic cache lookup for read operations
 * - Cache invalidation on create/update/delete
 * - TTL-based expiration
 * - Pattern-based cache clearing
 *
 * @template T The type of repository being decorated
 */
@injectable()
export class CachingDecorator<T> extends RepositoryDecorator<T> {
  private readonly DEFAULT_TTL_SECONDS = 300; // 5 minutes

  constructor(
    repository: T,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {
    super(repository);
  }

  /**
   * Wrap findById with cache lookup
   */
  async findById(id: number): Promise<any> {
    const cacheKey = this.getCacheKey('findById', id);

    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - call repository
    const result = await (this.repository as any).findById(id);

    // Store in cache
    if (result) {
      this.cache.set(cacheKey, result, this.DEFAULT_TTL_SECONDS);
    }

    return result;
  }

  /**
   * Wrap findAll with cache lookup
   */
  async findAll(): Promise<any[]> {
    const cacheKey = this.getCacheKey('findAll');

    // Try cache first
    const cached = this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - call repository
    const result = await (this.repository as any).findAll();

    // Store in cache (shorter TTL for lists)
    if (result) {
      this.cache.set(cacheKey, result, 60); // 1 minute for lists
    }

    return result;
  }

  /**
   * Wrap findByUserId with cache lookup
   */
  async findByUserId(userId: number): Promise<any[]> {
    if (!this.hasMethod('findByUserId')) {
      return this.forwardCall('findByUserId', userId);
    }

    const cacheKey = this.getCacheKey('findByUserId', userId);

    // Try cache first
    const cached = this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - call repository
    const result = await (this.repository as any).findByUserId(userId);

    // Store in cache
    if (result) {
      this.cache.set(cacheKey, result, this.DEFAULT_TTL_SECONDS);
    }

    return result;
  }

  /**
   * Invalidate cache on write operations
   */
  async create(input: any): Promise<any> {
    const result = await (this.repository as any).create(input);
    await this.invalidateCache();
    return result;
  }

  async update(id: number, input: any): Promise<any> {
    const result = await (this.repository as any).update(id, input);
    await this.invalidateCacheForId(id);
    return result;
  }

  async delete(id: number): Promise<boolean> {
    const result = await (this.repository as any).delete(id);
    await this.invalidateCacheForId(id);
    return result;
  }

  /**
   * Batch operations - invalidate all cache
   */
  async createBatch(items: any[]): Promise<any[]> {
    if (!this.hasMethod('createBatch')) {
      return this.forwardCall('createBatch', items);
    }

    const result = await (this.repository as any).createBatch(items);
    await this.invalidateCache();
    return result;
  }

  async deleteBatch(ids: number[]): Promise<number> {
    if (!this.hasMethod('deleteBatch')) {
      return this.forwardCall('deleteBatch', ids);
    }

    const result = await (this.repository as any).deleteBatch(ids);
    await this.invalidateCache();
    return result;
  }

  /**
   * Generate cache key for method and arguments
   */
  private getCacheKey(method: string, ...args: any[]): string {
    return `${this.getRepositoryName()}:${method}:${args.join(':')}`;
  }

  /**
   * Invalidate all cache for this repository
   */
  private async invalidateCache(): Promise<void> {
    // Clear all cache entries for this repository
    const pattern = `${this.getRepositoryName()}:*`;
    this.clearByPattern(pattern);
  }

  /**
   * Invalidate cache for a specific entity ID
   */
  private async invalidateCacheForId(id: number): Promise<void> {
    // Clear specific ID entries
    const patterns = [
      `${this.getRepositoryName()}:findById:${id}`,
      `${this.getRepositoryName()}:findAll*`,
      `${this.getRepositoryName()}:findByUserId:*`,
    ];

    patterns.forEach(pattern => this.clearByPattern(pattern));
  }

  /**
   * Clear cache entries matching a pattern
   * Note: Basic pattern matching since ICacheService doesn't have pattern support
   */
  private clearByPattern(pattern: string): void {
    // For now, we'll clear specific keys or all cache
    // In production, implement pattern-based clearing in CacheService
    if (pattern.includes('*')) {
      // Clear all for this repository (simplified)
      const baseKey = pattern.split(':')[0];
      // This would need to be enhanced in the actual CacheService
      this.cache.clear();
    } else {
      // Clear specific key
      this.cache.delete(pattern);
    }
  }
}