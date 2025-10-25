import { getDb } from '../db/database.ts';
import type Database from 'better-sqlite3';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus, CaseType } from '../domains/cases/entities/Case.ts';
import { EncryptionService } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import { DecryptionCache } from '../services/DecryptionCache.ts';
import { BaseRepository } from './BaseRepository.ts';
import type { PaginationParams, PaginatedResult } from '../types/pagination.ts';
import { PaginationParamsSchema } from '../types/pagination.ts';

/**
 * Case Repository with pagination and caching support
 *
 * MIGRATION STATUS: New implementation extending BaseRepository
 * - Maintains full backward compatibility with existing CaseRepository
 * - Adds pagination support via findPaginated()
 * - Adds caching support for decrypted descriptions
 * - All existing methods work identically
 *
 * @example
 * ```typescript
 * // NEW: Paginated query
 * const page1 = repo.findPaginated({ limit: 20 });
 * const page2 = repo.findPaginated({ limit: 20, cursor: page1.nextCursor });
 *
 * // LEGACY: Still works
 * const allCases = repo.findAll();
 * ```
 */
export class CaseRepositoryPaginated extends BaseRepository<Case> {
  constructor(
    encryptionService: EncryptionService,
    auditLogger?: AuditLogger,
    cache?: DecryptionCache,
    db?: Database.Database, // Optional db for testing/benchmarks
  ) {
    super(db || getDb(), encryptionService, auditLogger, cache);
  }

  /**
   * Define table name for BaseRepository
   */
  protected getTableName(): string {
    return 'cases';
  }

  /**
   * Define encrypted fields for BaseRepository
   */
  protected getEncryptedFields(): string[] {
    return ['description'];
  }

  /**
   * Map database row to Case domain model
   */
  protected mapToDomain(row: unknown): Case {
    const caseRow = row as Record<string, unknown> & {
      id: number;
      title: string;
      description: string | null;
      case_type?: string;
      caseType?: string;
      status: CaseStatus;
      user_id?: number | null;
      userId?: number | null;
      created_at?: string;
      createdAt?: string;
      updated_at?: string;
      updatedAt?: string;
    };

    return {
      id: caseRow.id,
      title: caseRow.title,
      description: this.decryptField('description', caseRow.description, caseRow.id),
      caseType: (caseRow.case_type || caseRow.caseType) as CaseType,
      status: caseRow.status,
      userId: caseRow.user_id ?? caseRow.userId ?? null,
      createdAt: (caseRow.created_at || caseRow.createdAt) as string,
      updatedAt: (caseRow.updated_at || caseRow.updatedAt) as string,
    };
  }

  /**
   * Create a new case
   * (Unchanged from original implementation)
   */
  create(input: CreateCaseInput): Case {
    try {
      const db = this.db;
      const encryption = this.requireEncryptionService();

      // Encrypt description before INSERT
      let descriptionToStore: string | null = null;
      if (input.description) {
        const encryptedDescription = encryption.encrypt(input.description);
        descriptionToStore = encryptedDescription ? JSON.stringify(encryptedDescription) : null;
      }

      const stmt = db.prepare(`
        INSERT INTO cases (title, description, case_type, status)
        VALUES (@title, @description, @caseType, 'active')
      `);

      const result = stmt.run({
        title: input.title,
        description: descriptionToStore,
        caseType: input.caseType,
      });

      const createdCase = this.findById(result.lastInsertRowid as number)!;

      // Audit: Case created
      this.auditLogger?.log({
        eventType: 'case.create',
        resourceType: 'case',
        resourceId: createdCase.id.toString(),
        action: 'create',
        details: {
          title: createdCase.title,
          caseType: createdCase.caseType,
        },
        success: true,
      });

      return createdCase;
    } catch (error) {
      // Audit: Failed case creation
      this.auditLogger?.log({
        eventType: 'case.create',
        resourceType: 'case',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all cases with optional status filter
   * @deprecated Use findPaginated for better performance with large datasets
   *
   * PERFORMANCE WARNING: This loads ALL cases into memory.
   * For datasets > 100 cases, use findPaginated() instead.
   */
  findAll(status?: CaseStatus): Case[] {
    const db = this.db;

    let query = `
      SELECT
        rowid,
        id,
        title,
        description,
        case_type as caseType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
    `;

    type CaseRow = Record<string, unknown>;
    let rows: CaseRow[];

    if (status) {
      query += ' WHERE status = ?';
      rows = db.prepare(query).all(status) as CaseRow[];
    } else {
      rows = db.prepare(query).all() as CaseRow[];
    }

    // Decrypt all descriptions using BaseRepository's caching logic
    return rows.map((row) => this.mapToDomain(row));
  }

  /**
   * NEW: Find cases by status with pagination
   *
   * @param status - Case status filter
   * @param params - Pagination parameters
   * @returns Paginated result
   */
  findByStatusPaginated(status: CaseStatus, params: PaginationParams): PaginatedResult<Case> {
    const validated = this.validatePaginationParams(params);
    const { limit, cursor, direction } = validated;

    const db = this.db;

    // Decode cursor
    let startRowId = 0;
    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [rowid] = decoded.split(':');
      startRowId = parseInt(rowid, 10);
    }

    // Build query
    const orderDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparator = direction === 'asc' ? '>' : '<';

    let whereClause = `WHERE status = ?`;
    const queryParams: (string | number)[] = [status];

    if (cursor) {
      whereClause += ` AND rowid ${comparator} ?`;
      queryParams.push(startRowId);
    }

    const query = `
      SELECT rowid, * FROM cases
      ${whereClause}
      ORDER BY rowid ${orderDirection}
      LIMIT ?
    `;

    queryParams.push(limit + 1);

    this.auditLogger?.log({
      eventType: 'query.by_status_paginated',
      resourceType: 'cases',
      resourceId: status,
      action: 'read',
      details: { status, cursor, limit, direction },
      success: true,
    });

    type SqlRow = Record<string, unknown> & { rowid: number };
    const rows = db.prepare(query).all(...queryParams) as SqlRow[];

    // Process results
    const hasMore = rows.length > limit;
    const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;
    const items = itemsToReturn.map((row) => this.mapToDomain(row));

    const nextCursor =
      hasMore && itemsToReturn.length > 0
        ? Buffer.from(`${itemsToReturn[itemsToReturn.length - 1].rowid}:${Date.now()}`).toString(
            'base64',
          )
        : undefined;

    return {
      items,
      nextCursor,
      prevCursor: undefined,
      hasMore,
      pageSize: limit,
      totalReturned: items.length,
    };
  }

  /**
   * Update case with cache invalidation
   */
  update(id: number, input: UpdateCaseInput): Case | null {
    try {
      const db = this.db;
      const encryption = this.requireEncryptionService();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.title !== undefined) {
        updates.push('title = @title');
        params.title = input.title;
      }
      if (input.description !== undefined) {
        updates.push('description = @description');
        // Encrypt description before UPDATE
        if (input.description) {
          const encryptedDescription = encryption.encrypt(input.description);
          params.description = encryptedDescription ? JSON.stringify(encryptedDescription) : null;
        } else {
          params.description = null;
        }
      }
      if (input.caseType !== undefined) {
        updates.push('case_type = @caseType');
        params.caseType = input.caseType;
      }
      if (input.status !== undefined) {
        updates.push('status = @status');
        params.status = input.status;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE cases
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      // Invalidate cache for this case
      this.invalidateCache(id);

      const updatedCase = this.findById(id);

      // Audit: Case updated
      this.auditLogger?.log({
        eventType: 'case.update',
        resourceType: 'case',
        resourceId: id.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedCase;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'case.update',
        resourceType: 'case',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete case with cache invalidation
   */
  delete(id: number): boolean {
    try {
      const db = this.db;
      const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Invalidate cache for this case
      if (success) {
        this.invalidateCache(id);
      }

      // Audit: Case deleted
      this.auditLogger?.log({
        eventType: 'case.delete',
        resourceType: 'case',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'case.delete',
        resourceType: 'case',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Close a case
   */
  close(id: number): Case | null {
    return this.update(id, { status: 'closed' });
  }

  /**
   * Get case count by status
   */
  countByStatus(): Record<CaseStatus, number> {
    const db = this.db;
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM cases
      GROUP BY status
    `);

    const results = stmt.all() as Array<{ status: CaseStatus; count: number }>;

    const counts: Record<CaseStatus, number> = {
      active: 0,
      closed: 0,
      pending: 0,
    };

    results.forEach((row) => {
      counts[row.status] = row.count;
    });

    return counts;
  }

  /**
   * Get case statistics (total count + status breakdown)
   */
  getStatistics(): { totalCases: number; statusCounts: Record<CaseStatus, number> } {
    const statusCounts = this.countByStatus();
    const totalCases = statusCounts.active + statusCounts.closed + statusCounts.pending;

    return {
      totalCases,
      statusCounts,
    };
  }

  /**
   * Helper: Validate pagination params
   */
  private validatePaginationParams(params: PaginationParams) {
    return PaginationParamsSchema.parse(params);
  }

  /**
   * Helper: Require encryption service
   */
  private requireEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      throw new Error('EncryptionService not configured for CaseRepository');
    }
    return this.encryptionService;
  }
}
