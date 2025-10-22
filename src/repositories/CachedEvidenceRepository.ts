import { EvidenceRepository } from './EvidenceRepository.ts';
import { getCacheService, type CacheService } from '../services/CacheService.ts';
import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '../models/Evidence.ts';

/**
 * Cached wrapper for EvidenceRepository
 * Provides async methods with LRU caching for high-performance evidence lookups
 *
 * Performance characteristics:
 * - Evidence lookups: 0ms (cache hit) vs 50-200ms (database + decryption)
 * - 5-minute TTL to balance freshness with performance
 * - Automatic invalidation on updates/deletes
 * - Efficient batch operations for case evidence
 *
 * @example
 * ```typescript
 * const cachedRepo = new CachedEvidenceRepository(encryptionService, auditLogger);
 * const evidence = await cachedRepo.findByIdAsync(123);
 * const caseEvidence = await cachedRepo.findByCaseIdAsync(456);
 * ```
 */
export class CachedEvidenceRepository {
  private baseRepo: EvidenceRepository;
  private cache: CacheService;

  constructor(
    encryptionService: EncryptionService,
    auditLogger?: AuditLogger
  ) {
    this.baseRepo = new EvidenceRepository(encryptionService, auditLogger);
    this.cache = getCacheService();
  }

  /**
   * Create new evidence with encrypted content
   */
  async createAsync(input: CreateEvidenceInput): Promise<Evidence> {
    const createdEvidence = this.baseRepo.create(input);

    // Invalidate case-specific evidence list cache
    this.cache.invalidatePattern(`evidence:case:${input.caseId}:*`, 'evidence');

    // Pre-cache the new evidence
    const cacheKey = `evidence:${createdEvidence.id}`;
    await this.cache.getCached(
      cacheKey,
      async () => createdEvidence,
      'evidence'
    );

    return createdEvidence;
  }

  /**
   * Find evidence by ID with caching
   */
  async findByIdAsync(id: number): Promise<Evidence | null> {
    const cacheKey = `evidence:${id}`;

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.findById(id),
      'evidence'
    );
  }

  /**
   * Find all evidence for a case with caching
   */
  async findByCaseIdAsync(caseId: number): Promise<Evidence[]> {
    const cacheKey = `evidence:case:${caseId}:all`;

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.findByCaseId(caseId),
      'evidence'
    );
  }

  /**
   * Find all evidence with optional type filter (with caching)
   */
  async findAllAsync(evidenceType?: string): Promise<Evidence[]> {
    const cacheKey = evidenceType
      ? `evidence:type:${evidenceType}`
      : 'evidence:all';

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.findAll(evidenceType),
      'evidence'
    );
  }

  /**
   * Update evidence with encrypted content and invalidate caches
   */
  async updateAsync(id: number, input: UpdateEvidenceInput): Promise<Evidence | null> {
    // Get the evidence first to know its caseId for cache invalidation
    const existingEvidence = await this.findByIdAsync(id);

    const updatedEvidence = this.baseRepo.update(id, input);

    if (updatedEvidence && existingEvidence) {
      // Invalidate specific evidence cache
      this.cache.invalidate(`evidence:${id}`, 'evidence');

      // Invalidate case-specific evidence list cache
      this.cache.invalidatePattern(`evidence:case:${existingEvidence.caseId}:*`, 'evidence');

      // Invalidate type-specific caches if type changed
      if (input.evidenceType) {
        this.cache.invalidate(`evidence:type:${existingEvidence.evidenceType}`, 'evidence');
        this.cache.invalidate(`evidence:type:${input.evidenceType}`, 'evidence');
      }

      // Invalidate general list caches
      this.cache.invalidate('evidence:all', 'evidence');

      // Pre-cache the updated evidence
      const cacheKey = `evidence:${id}`;
      await this.cache.getCached(
        cacheKey,
        async () => updatedEvidence,
        'evidence'
      );
    }

    return updatedEvidence;
  }

  /**
   * Delete evidence and invalidate caches
   */
  async deleteAsync(id: number): Promise<boolean> {
    // Get the evidence first to know its caseId for cache invalidation
    const evidence = await this.findByIdAsync(id);

    const result = this.baseRepo.delete(id);

    if (result && evidence) {
      // Invalidate specific evidence cache
      this.cache.invalidate(`evidence:${id}`, 'evidence');

      // Invalidate case-specific evidence list cache
      this.cache.invalidatePattern(`evidence:case:${evidence.caseId}:*`, 'evidence');

      // Invalidate type-specific cache
      this.cache.invalidate(`evidence:type:${evidence.evidenceType}`, 'evidence');

      // Invalidate general list caches
      this.cache.invalidate('evidence:all', 'evidence');
    }

    return result;
  }

  /**
   * Count evidence by case with caching
   */
  async countByCaseAsync(caseId: number): Promise<number> {
    const cacheKey = `evidence:case:${caseId}:count`;

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.countByCase(caseId),
      'evidence',
      10 * 60 * 1000 // 10 minute TTL for counts
    );
  }

  /**
   * Count evidence by type with caching
   */
  async countByTypeAsync(caseId?: number): Promise<Record<string, number>> {
    const cacheKey = caseId
      ? `evidence:case:${caseId}:count-by-type`
      : 'evidence:count-by-type';

    return this.cache.getCached(
      cacheKey,
      async () => this.baseRepo.countByType(caseId),
      'evidence',
      10 * 60 * 1000 // 10 minute TTL for counts
    );
  }

  /**
   * Batch find evidence by IDs with caching
   */
  async findByIdsAsync(ids: number[]): Promise<(Evidence | null)[]> {
    // Process each ID through cache
    const promises = ids.map(id => this.findByIdAsync(id));
    const evidenceList = await Promise.all(promises);

    return evidenceList;
  }

  /**
   * Preload evidence for a case (cache warming)
   */
  async preloadCaseEvidence(caseId: number): Promise<void> {
    const evidenceList = await this.findByCaseIdAsync(caseId);

    // Cache individual evidence items
    const entries = evidenceList.map(evidence => ({
      key: `evidence:${evidence.id}`,
      fetchFn: async () => evidence,
    }));

    await this.cache.preload(entries, 'evidence');
  }

  /**
   * Bulk delete evidence for a case
   */
  async deleteByCaseIdAsync(caseId: number): Promise<number> {
    const evidenceList = await this.findByCaseIdAsync(caseId);
    let deletedCount = 0;

    for (const evidence of evidenceList) {
      if (await this.deleteAsync(evidence.id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Search evidence by content (with caching for repeated searches)
   */
  async searchByContentAsync(searchTerm: string, caseId?: number): Promise<Evidence[]> {
    const cacheKey = caseId
      ? `evidence:search:${caseId}:${searchTerm}`
      : `evidence:search:all:${searchTerm}`;

    return this.cache.getCached(
      cacheKey,
      async () => {
        // Get all evidence for the case or all
        const allEvidence = caseId
          ? await this.baseRepo.findByCaseId(caseId)
          : await this.baseRepo.findAll();

        // Filter by content (simple contains search)
        return allEvidence.filter(e =>
          e.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      },
      'evidence',
      2 * 60 * 1000 // 2 minute TTL for search results
    );
  }

  /**
   * Invalidate all evidence-related caches
   */
  invalidateAll(): void {
    this.cache.clear('evidence');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return this.cache.getStats('evidence');
  }
}