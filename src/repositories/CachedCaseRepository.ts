import { CaseRepository } from './CaseRepository.ts';
import { getCacheService, type CacheService } from '../services/CacheService.ts';
import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case.ts';

/**
 * Cached wrapper for CaseRepository
 * Provides async methods with LRU caching for high-performance case lookups
 *
 * Performance characteristics:
 * - Case lookups: 0ms (cache hit) vs 50-200ms (database + decryption)
 * - 5-minute TTL to balance freshness with performance
 * - Automatic invalidation on updates/deletes
 *
 * @example
 * ```typescript
 * const cachedRepo = new CachedCaseRepository(encryptionService, auditLogger);
 * const case = await cachedRepo.findByIdAsync(123);
 * ```
 */
export class CachedCaseRepository {
  private baseRepo: CaseRepository;
  private cache: CacheService;

  constructor(
    encryptionService: EncryptionService,
    auditLogger?: AuditLogger
  ) {
    this.baseRepo = new CaseRepository(encryptionService, auditLogger);
    this.cache = getCacheService();
  }

  /**
   * Create a new case
   */
  async createAsync(input: CreateCaseInput): Promise<Case> {
    const createdCase = this.baseRepo.create(input);

    // No need to invalidate - new case won't be cached yet
    // But we could pre-cache it
    const cacheKey = `case:${createdCase.id}`;
    await this.cache.getCached(
      cacheKey,
      async () => createdCase,
      'cases'
    );

    return createdCase;
  }

  /**
   * Find case by ID with caching
   */
  async findByIdAsync(id: number): Promise<Case | null> {
    const cacheKey = `case:${id}`;

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.findById(id),
      'cases'
    );
  }

  /**
   * Find all cases with optional status filter (with caching)
   */
  async findAllAsync(status?: CaseStatus): Promise<Case[]> {
    const cacheKey = status ? `cases:status:${status}` : 'cases:all';

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.findAll(status),
      'cases'
    );
  }

  /**
   * Update case and invalidate caches
   */
  async updateAsync(id: number, input: UpdateCaseInput): Promise<Case | null> {
    const updatedCase = this.baseRepo.update(id, input);

    if (updatedCase) {
      // Invalidate specific case cache
      this.cache.invalidate(`case:${id}`, 'cases');

      // Invalidate list caches (since status might have changed)
      this.cache.invalidatePattern('cases:*', 'cases');

      // Pre-cache the updated case
      const cacheKey = `case:${id}`;
      await this.cache.getCached(
        cacheKey,
        async () => updatedCase,
        'cases'
      );
    }

    return updatedCase;
  }

  /**
   * Delete case and invalidate caches
   */
  async deleteAsync(id: number): Promise<boolean> {
    const result = this.baseRepo.delete(id);

    if (result) {
      // Invalidate specific case cache
      this.cache.invalidate(`case:${id}`, 'cases');

      // Invalidate list caches
      this.cache.invalidatePattern('cases:*', 'cases');

      // Invalidate related evidence caches
      this.cache.invalidatePattern(`evidence:case:${id}:*`, 'evidence');
    }

    return result;
  }

  /**
   * Close a case
   */
  async closeAsync(id: number): Promise<Case | null> {
    return this.updateAsync(id, { status: 'closed' });
  }

  /**
   * Get case count by status with caching
   */
  async countByStatusAsync(): Promise<Record<CaseStatus, number>> {
    const cacheKey = 'cases:count:by-status';

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.countByStatus(),
      'cases',
      10 * 60 * 1000 // 10 minute TTL for counts
    );
  }

  /**
   * Get case statistics with caching
   */
  async getStatisticsAsync(): Promise<{ totalCases: number; statusCounts: Record<CaseStatus, number> }> {
    const cacheKey = 'cases:statistics';

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.getStatistics(),
      'cases',
      10 * 60 * 1000 // 10 minute TTL for statistics
    );
  }

  /**
   * Batch find cases by IDs with caching
   */
  async findByIdsAsync(ids: number[]): Promise<(Case | null)[]> {
    const results: (Case | null)[] = [];

    // Check cache for each ID and collect misses
    const misses: number[] = [];
    const cachePromises = ids.map(async (id) => {
      const cacheKey = `case:${id}`;
      try {
        // Try to get from cache first
        const cached = await this.cache.getCached(
          cacheKey,
          async () => null,
          'cases'
        );
        if (cached) {
          return { id, case: cached };
        }
      } catch {
        // Cache miss
      }
      misses.push(id);
      return { id, case: null };
    });

    const cacheResults = await Promise.all(cachePromises);

    // Fetch all misses from database
    if (misses.length > 0) {
      const fetchedCases = await Promise.all(
        misses.map(id => this.findByIdAsync(id))
      );

      // Build a map of fetched cases
      const fetchedMap = new Map<number, Case | null>();
      misses.forEach((id, index) => {
        fetchedMap.set(id, fetchedCases[index]);
      });

      // Combine cache hits and fetched cases in original order
      for (const id of ids) {
        const cacheResult = cacheResults.find(r => r.id === id);
        if (cacheResult?.case) {
          results.push(cacheResult.case);
        } else {
          results.push(fetchedMap.get(id) || null);
        }
      }
    } else {
      // All were cache hits
      for (const id of ids) {
        const cacheResult = cacheResults.find(r => r.id === id);
        results.push(cacheResult?.case || null);
      }
    }

    return results;
  }

  /**
   * Preload cases into cache (cache warming)
   */
  async preloadCases(status?: CaseStatus): Promise<void> {
    const cases = await this.findAllAsync(status);

    // Cache individual cases
    const entries = cases.map(caseItem => ({
      key: `case:${caseItem.id}`,
      fetchFn: async () => caseItem,
    }));

    await this.cache.preload(entries, 'cases');
  }

  /**
   * Invalidate all case-related caches
   */
  invalidateAll(): void {
    this.cache.clear('cases');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return this.cache.getStats('cases');
  }
}