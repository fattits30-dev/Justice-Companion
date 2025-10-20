import type Database from 'better-sqlite3';
import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import { DecryptionCache } from '../services/DecryptionCache.ts';
import { PaginationParamsSchema, type PaginationParams, type PaginatedResult } from '../types/pagination.ts';
import { generateCacheKey } from '../types/cache.ts';

/**
 * Base repository interface with dual API support
 * - Legacy: findAll() returns all items
 * - New: findPaginated() returns paginated items
 */
export interface IRepository<T> {
  /**
   * @deprecated Use findPaginated for better performance
   * Maintained for backward compatibility
   */
  findAll(): T[];

  /**
   * Paginated query with selective decryption
   */
  findPaginated(params: PaginationParams): PaginatedResult<T>;

  /**
   * Find by ID with cache support
   */
  findById(id: number, useCache?: boolean): T | null;
}

/**
 * Base repository with pagination and caching support
 *
 * Provides:
 * - Cursor-based pagination
 * - Selective decryption (only decrypt displayed items)
 * - LRU caching for decrypted values
 * - Audit logging for all operations
 * - Backward compatibility with legacy findAll()
 *
 * @example
 * ```typescript
 * export class CaseRepository extends BaseRepository<Case> {
 *   protected getTableName() { return 'cases'; }
 *   protected getEncryptedFields() { return ['description']; }
 *   protected mapToDomain(row: unknown): Case { ... }
 * }
 * ```
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(
    protected db: Database.Database,
    protected encryptionService: EncryptionService,
    protected auditLogger?: AuditLogger,
    protected cache?: DecryptionCache,
  ) {}

  /**
   * Abstract method: Define table name
   */
  protected abstract getTableName(): string;

  /**
   * Abstract method: Define encrypted fields
   * @returns Array of field names that are encrypted
   */
  protected abstract getEncryptedFields(): string[];

  /**
   * Abstract method: Map database row to domain model
   * @param row - Raw database row (use type guards to safely access fields)
   * @returns Domain model instance
   */
  protected abstract mapToDomain(row: unknown): T;

  /**
   * Decrypt a single field with caching
   *
   * @param fieldName - Name of the encrypted field
   * @param encryptedValue - Encrypted JSON string
   * @param entityId - Entity ID for cache key generation
   * @returns Decrypted plaintext or null
   */
  protected decryptField(
    fieldName: string,
    encryptedValue: string | null,
    entityId: number,
  ): string | null {
    if (!encryptedValue) {return null;}

    // Check cache first (if available)
    if (this.cache) {
      const cacheKey = generateCacheKey(
        `${this.getTableName()}.${fieldName}`,
        entityId,
        encryptedValue,
      );

      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Decrypt and cache
      try {
        const encryptedData = JSON.parse(encryptedValue);
        const decrypted = this.encryptionService.decrypt(encryptedData);

        if (decrypted) {
          this.cache.set(cacheKey, decrypted);
        }

        return decrypted;
      } catch (_error) {
        // If JSON parse fails or decryption fails, return as-is (backward compatibility)
        return encryptedValue;
      }
    }

    // No cache - just decrypt
    try {
      const encryptedData = JSON.parse(encryptedValue);
      return this.encryptionService.decrypt(encryptedData);
    } catch (_error) {
      // Backward compatibility: return as-is if not encrypted
      return encryptedValue;
    }
  }

  /**
   * LEGACY: Find all items (backward compatible)
   * @deprecated Use findPaginated for better performance
   *
   * WARNING: This loads ALL records into memory and decrypts them.
   * For large datasets, use findPaginated() instead.
   */
  public findAll(): T[] {
    const tableName = this.getTableName();
    const query = `SELECT rowid, * FROM ${tableName} ORDER BY rowid DESC`;

    this.auditLogger?.log({
      eventType: 'query.all',
      resourceType: tableName,
      resourceId: 'all',
      action: 'read',
      details: { warning: 'Using deprecated findAll() - consider pagination' },
      success: true,
    });

    const rows = this.db.prepare(query).all();
    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * NEW: Paginated query with selective decryption
   *
   * @param params - Pagination parameters (limit, cursor, direction)
   * @returns Paginated result with items, cursors, and hasMore flag
   */
  public findPaginated(params: PaginationParams): PaginatedResult<T> {
    // Validate input with Zod
    const validated = PaginationParamsSchema.parse(params);
    const { limit, cursor, direction } = validated;

    const tableName = this.getTableName();

    // Decode cursor to get starting rowid
    let startRowId = 0;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const [rowid] = decoded.split(':');
        startRowId = parseInt(rowid, 10);
      } catch (_error) {
        throw new Error('Invalid cursor format');
      }
    }

    // Build query with LIMIT (fetch limit + 1 to check hasMore)
    const orderDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparator = direction === 'asc' ? '>' : '<';
    const whereClause = cursor ? `WHERE rowid ${comparator} ?` : '';

    const query = `
      SELECT rowid, * FROM ${tableName}
      ${whereClause}
      ORDER BY rowid ${orderDirection}
      LIMIT ?
    `;

    const queryParams = cursor ? [startRowId, limit + 1] : [limit + 1];

    this.auditLogger?.log({
      eventType: 'query.paginated',
      resourceType: tableName,
      resourceId: cursor || 'start',
      action: 'read',
      details: { cursor, limit, direction },
      success: true,
    });

    type SqlRow = Record<string, unknown> & { rowid: number };
    const rows = this.db.prepare(query).all(...queryParams) as SqlRow[];

    // Check if there are more results
    const hasMore = rows.length > limit;
    const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;

    // Decrypt only the items in this page
    const items = itemsToReturn.map((row) => this.mapToDomain(row));

    // Generate cursors for next/prev pages
    const nextCursor =
      hasMore && itemsToReturn.length > 0
        ? Buffer.from(`${itemsToReturn[itemsToReturn.length - 1].rowid}:${Date.now()}`).toString(
            'base64',
          )
        : undefined;

    const prevCursor =
      cursor && startRowId > 0
        ? Buffer.from(`${startRowId}:${Date.now()}`).toString('base64')
        : undefined;

    return {
      items,
      nextCursor,
      prevCursor,
      hasMore,
      pageSize: limit,
      // totalCount omitted by default (expensive to calculate)
    };
  }

  /**
   * Find entity by ID with optional caching
   *
   * @param id - Entity ID
   * @param useCache - Whether to use cache (default: true)
   * @returns Entity or null if not found
   */
  public findById(id: number, useCache = true): T | null {
    const tableName = this.getTableName();
    const query = `SELECT rowid, * FROM ${tableName} WHERE id = ?`;

    const row = this.db.prepare(query).get(id);

    if (!row) {
      return null;
    }

    // Temporarily disable cache for this call if requested
    const originalCache = this.cache;
    if (!useCache) {
      this.cache = undefined;
    }

    const result = this.mapToDomain(row);

    // Restore cache
    this.cache = originalCache;

    this.auditLogger?.log({
      eventType: 'query.by_id',
      resourceType: tableName,
      resourceId: id.toString(),
      action: 'read',
      details: { cached: useCache },
      success: true,
    });

    return result;
  }

  /**
   * Optional: Get total count (expensive, use sparingly)
   *
   * @returns Total number of entities in table
   */
  public getTotalCount(): number {
    const tableName = this.getTableName();
    const query = `SELECT COUNT(*) as count FROM ${tableName}`;
    const result = this.db.prepare(query).get() as { count: number };

    this.auditLogger?.log({
      eventType: 'query.count',
      resourceType: tableName,
      resourceId: 'all',
      action: 'read',
      details: { count: result.count },
      success: true,
    });

    return result.count;
  }

  /**
   * Helper: Invalidate cache for an entity
   * Call this after UPDATE or DELETE operations
   *
   * @param id - Entity ID
   */
  protected invalidateCache(id: number): void {
    if (this.cache) {
      this.cache.invalidateEntity(this.getTableName(), id);
    }
  }

  /**
   * Helper: Invalidate all cache entries for this entity type
   * Call this after bulk operations
   */
  protected invalidateAllCache(): void {
    if (this.cache) {
      this.cache.invalidateEntityType(this.getTableName());
    }
  }
}
