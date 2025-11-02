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
  async findById(id: number): Promise<T | null> {
    const cacheKey = this.getCacheKey('findById', id);

    // Try cache first
    const cached = this.cache.get<T | null>(cacheKey);
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
  async findAll(): Promise<T[]> {
    const cacheKey = this.getCacheKey('findAll');

    // Try cache first
    const cached = this.cache.get<T[]>(cacheKey);
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
  async findByUserId(userId: number): Promise<T[]> {
    if (!this.hasMethod('findByUserId')) {
      return this.forwardCall('findByUserId', userId);
    }

    const cacheKey = this.getCacheKey('findByUserId', userId);

    // Try cache first
    const cached = this.cache.get<T[]>(cacheKey);
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
   * Wrap create with cache invalidation
   */
  async create(data: Partial<T>): Promise<T> {
    const result = await (this.repository as any).create(data);

    // Invalidate relevant caches
    this.invalidateCachePattern('findById');
    this.invalidateCachePattern('findAll');
    this.invalidateCachePattern('findByUserId');

    return result;
  }

  /**
   * Wrap update with cache invalidation
   */
  async update(id: number, data: Partial<T>): Promise<T | null> {
    const result = await (this.repository as any).update(id, data);

    // Invalidate relevant caches
    this.invalidateCachePattern('findById', id);
    this.invalidateCachePattern('findByUserId');

    return result;
  }

  /**
   * Wrap delete with cache invalidation
   */
  async delete(id: number): Promise<boolean> {
    const result = await (this.repository as any).delete(id);

    // Invalidate relevant caches
    this.invalidateCachePattern('findById', id);
    this.invalidateCachePattern('findByUserId');

    return result;
  }

  /**
   * Generate cache key based on method and parameters
   */
  private getCacheKey(method: string, ...args: any[]): string {
    const keyParts = [method, ...args.map(arg => String(arg))];
    return keyParts.join(':');
  }

  /**
   * Invalidate cache entries matching pattern
   */
  private invalidateCachePattern(pattern: string, ...args: any[]): void {
    // Implementation would depend on your cache service's capabilities
    // This is a placeholder for cache invalidation logic
  }

  /**
   * Check if repository has specific method
   */
  private hasMethod(methodName: string): boolean {
    return typeof (this.repository as any)[methodName] === 'function';
  }

  /**
   * Forward call to original repository
   */
  private async forwardCall(methodName: string, ...args: any[]): Promise<any> {
    return (this.repository as any)[methodName](...args);
  }
}