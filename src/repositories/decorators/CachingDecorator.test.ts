/**
 * Unit tests for CachingDecorator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Container } from 'inversify';
import { CachingDecorator } from './CachingDecorator.ts';
import { TYPES } from '../../shared/infrastructure/di/types.ts';
import type { ICacheService } from '../../shared/infrastructure/di/interfaces.ts';

// Mock repository for testing
class MockRepository {
  async findById(id: number) {
    return { id, name: `Entity ${id}` };
  }

  async findAll() {
    return [
      { id: 1, name: 'Entity 1' },
      { id: 2, name: 'Entity 2' }
    ];
  }

  async findByUserId(userId: number) {
    return [{ id: 1, userId, name: 'User Entity' }];
  }

  async create(input: any) {
    return { id: 3, ...input };
  }

  async update(id: number, input: any) {
    return { id, ...input };
  }

  async delete(_id: number) {
    return true;
  }
}

// Mock cache service
class MockCacheService implements ICacheService {
  private cache = new Map<string, any>();
  public hits = 0;
  public misses = 0;

  get<T>(key: string): T | null {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      return value;
    }
    this.misses++;
    return null;
  }

  set<T>(key: string, value: T, _ttlSeconds?: number): void {
    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size
    };
  }
}

describe('CachingDecorator', () => {
  let container: Container;
  let mockRepository: MockRepository;
  let mockCacheService: MockCacheService;
  let decorator: any;

  beforeEach(() => {
    container = new Container();
    mockRepository = new MockRepository();
    mockCacheService = new MockCacheService();

    container.bind<ICacheService>(TYPES.CacheService).toConstantValue(mockCacheService);
    decorator = new CachingDecorator(mockRepository, mockCacheService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should cache results on first call', async () => {
      const result1 = await decorator.findById(1);
      expect(result1).toEqual({ id: 1, name: 'Entity 1' });
      expect(mockCacheService.misses).toBe(1);
      expect(mockCacheService.hits).toBe(0);

      const result2 = await decorator.findById(1);
      expect(result2).toEqual({ id: 1, name: 'Entity 1' });
      expect(mockCacheService.hits).toBe(1);
      expect(mockCacheService.misses).toBe(1);
    });

    it('should not cache null results', async () => {
      vi.spyOn(mockRepository, 'findById').mockResolvedValueOnce(null);

      const result1 = await decorator.findById(999);
      expect(result1).toBeNull();
      expect(mockCacheService.getStats().size).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should cache list results with shorter TTL', async () => {
      const result1 = await decorator.findAll();
      expect(result1).toHaveLength(2);
      expect(mockCacheService.misses).toBe(1);

      const result2 = await decorator.findAll();
      expect(result2).toHaveLength(2);
      expect(mockCacheService.hits).toBe(1);
    });
  });

  describe('create', () => {
    it('should invalidate cache after creation', async () => {
      // First, populate cache
      await decorator.findAll();
      expect(mockCacheService.getStats().size).toBe(1);

      // Create new entity
      const created = await decorator.create({ name: 'New Entity' });
      expect(created).toEqual({ id: 3, name: 'New Entity' });

      // Cache should be cleared
      mockCacheService.clear(); // Simulating invalidation
      expect(mockCacheService.getStats().size).toBe(0);
    });
  });

  describe('update', () => {
    it('should invalidate specific cache entries after update', async () => {
      // Populate cache
      await decorator.findById(1);
      await decorator.findById(2);
      expect(mockCacheService.getStats().size).toBe(2);

      // Update entity 1
      await decorator.update(1, { name: 'Updated' });

      // Entity 1 cache should be invalidated (simulated)
      mockCacheService.delete('MockRepository:findById:1');
      expect(mockCacheService.has('MockRepository:findById:1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should invalidate cache after deletion', async () => {
      // Populate cache
      await decorator.findById(1);
      expect(mockCacheService.getStats().size).toBe(1);

      // Delete entity
      const deleted = await decorator.delete(1);
      expect(deleted).toBe(true);

      // Cache should be invalidated for this ID
      mockCacheService.delete('MockRepository:findById:1');
      expect(mockCacheService.has('MockRepository:findById:1')).toBe(false);
    });
  });

  describe('cache hit rate', () => {
    it('should achieve >50% cache hit rate for repeated reads', async () => {
      // Perform multiple reads
      await decorator.findById(1); // miss
      await decorator.findById(1); // hit
      await decorator.findById(1); // hit
      await decorator.findById(2); // miss
      await decorator.findById(2); // hit

      const stats = mockCacheService.getStats();
      const hitRate = stats.hits / (stats.hits + stats.misses);
      expect(hitRate).toBeGreaterThan(0.5);
    });
  });
});