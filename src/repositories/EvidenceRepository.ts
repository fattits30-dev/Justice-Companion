import { getDb } from '../db/database.ts';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '../domains/evidence/entities/Evidence.ts';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import {
  encodeSimpleCursor,
  decodeSimpleCursor,
} from '../utils/cursor-pagination.ts';
import type { PaginatedResult } from '../types/pagination.ts';

/**
 * Repository for managing evidence (documents, photos, emails, recordings, notes)
 * with built-in encryption for sensitive content
 */
export class EvidenceRepository {
  private encryptionService: EncryptionService;
  private auditLogger?: AuditLogger;

  constructor(
    encryptionService: EncryptionService,
    auditLogger?: AuditLogger,
  ) {
    this.encryptionService = encryptionService;
    this.auditLogger = auditLogger;
  }

  /**
   * Create new evidence with encrypted content
   */
  create(input: CreateEvidenceInput): Evidence {
    try {
      const db = getDb();
      const encryption = this.requireEncryptionService();

      // Encrypt content before INSERT (if provided)
      let contentToStore: string | null = null;
      if (input.content) {
        const encryptedContent = encryption.encrypt(input.content);
        contentToStore = encryptedContent ? JSON.stringify(encryptedContent) : null;
      }

      const stmt = db.prepare(`
        INSERT INTO evidence (
          case_id, title, file_path, content, evidence_type, obtained_date
        )
        VALUES (
          @caseId, @title, @filePath, @content, @evidenceType, @obtainedDate
        )
      `);

      const result = stmt.run({
        caseId: input.caseId,
        title: input.title,
        filePath: input.filePath ?? null,
        content: contentToStore,
        evidenceType: input.evidenceType,
        obtainedDate: input.obtainedDate ?? null,
      });

      const createdEvidence = this.findById(result.lastInsertRowid as number)!;

      // Audit: Evidence created
      this.auditLogger?.log({
        eventType: 'evidence.create',
        resourceType: 'evidence',
        resourceId: createdEvidence.id.toString(),
        action: 'create',
        details: {
          caseId: createdEvidence.caseId,
          evidenceType: createdEvidence.evidenceType,
        },
        success: true,
      });

      return createdEvidence;
    } catch (error) {
      // Audit: Failed evidence creation
      this.auditLogger?.log({
        eventType: 'evidence.create',
        resourceType: 'evidence',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find evidence by ID with decrypted content
   */
  findById(id: number): Evidence | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      WHERE id = ?
    `);

    const row = stmt.get(id) as Evidence | null;

    if (row) {
      // Decrypt content after SELECT
      const originalContent = row.content;
      row.content = this.decryptContent(row.content);

      // Audit: PII/content accessed (encrypted content field)
      if (originalContent && row.content !== originalContent) {
        this.auditLogger?.log({
          eventType: 'evidence.content_access',
          resourceType: 'evidence',
          resourceId: id.toString(),
          action: 'read',
          details: {
            caseId: row.caseId,
            evidenceType: row.evidenceType,
            field: 'content',
            encrypted: true,
          },
          success: true,
        });
      }
    }

    return row ?? null;
  }

  /**
   * Find all evidence belonging to a specific user
   */
  findByUserId(userId: number): Evidence[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        user_id as userId,
        created_at as createdAt
      FROM evidence
      WHERE user_id = ?
    `);

    const rows = stmt.all(userId) as Evidence[];

    // Decrypt content for each evidence
    return rows.map(row => ({
      ...row,
      content: this.decryptContent(row.content),
    }));
  }

  /**
   * Find all evidence for a case with decrypted content
   * @deprecated Use findByCaseIdPaginated for better performance with large datasets
   * @warning This method loads ALL evidence for the case into memory
   */
  findByCaseId(caseId: number): Evidence[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      WHERE case_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId) as Evidence[];

    // Use batch decryption if enabled and encryption service is available
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== 'false';

    if (useBatchEncryption && this.encryptionService && rows.length > 0) {
      // Collect all encrypted content for batch decryption
      const encryptedContents = rows.map(row => {
        if (!row.content) {return null;}

        try {
          const encryptedData = JSON.parse(row.content) as EncryptedData;
          return this.encryptionService!.isEncrypted(encryptedData) ? encryptedData : null;
        } catch {
          return null; // Legacy plaintext
        }
      });

      // Batch decrypt all encrypted content
      const decryptedContents = this.encryptionService.batchDecrypt(encryptedContents);

      // Map decrypted content back to rows
      return rows.map((row, index) => {
        let content: string | null = row.content;

        // If we have a decrypted value from batch, use it
        if (encryptedContents[index] !== null) {
          content = decryptedContents[index];
        } else if (row.content && !encryptedContents[index]) {
          // Legacy plaintext or failed parse - keep original
          content = row.content;
        }

        return {
          ...row,
          content,
        };
      });
    }

    // Fallback to individual decryption
    return rows.map((row) => ({
      ...row,
      content: this.decryptContent(row.content),
    }));
  }

  /**
   * Find evidence for a case with cursor-based pagination
   * @param caseId - Case ID to filter by
   * @param limit - Maximum number of items to return (default: 50)
   * @param cursor - Opaque cursor string for pagination (null for first page)
   * @returns Paginated result with evidence items and cursor metadata
   */
  findByCaseIdPaginated(
    caseId: number,
    limit: number = 50,
    cursor: string | null = null
  ): PaginatedResult<Evidence> {
    const db = getDb();

    // Generate WHERE clause for cursor
    const whereClause = cursor
      ? `WHERE case_id = ? AND id < ${decodeSimpleCursor(cursor).rowid}`
      : 'WHERE case_id = ?';

    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `);

    const rows = stmt.all(caseId, limit + 1) as (Evidence & { id: number })[];

    // Check if there are more results
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Generate next cursor from last item's id
    const nextCursor = hasMore && items.length > 0
      ? encodeSimpleCursor(items[items.length - 1].id)
      : undefined;

    // Use batch decryption if enabled
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== 'false';

    if (useBatchEncryption && this.encryptionService && items.length > 0) {
      const encryptedContents = items.map(row => {
        if (!row.content) {return null;}
        try {
          const encryptedData = JSON.parse(row.content) as EncryptedData;
          return this.encryptionService!.isEncrypted(encryptedData) ? encryptedData : null;
        } catch {
          return null;
        }
      });

      const decryptedContents = this.encryptionService.batchDecrypt(encryptedContents);

      const decryptedItems = items.map((row, index) => {
        return {
          ...row,
          content: encryptedContents[index] !== null
            ? decryptedContents[index]
            : row.content,
          updatedAt: row.updatedAt ?? undefined,
        };
      });

      return {
        items: decryptedItems as Evidence[],
        nextCursor,
        prevCursor: undefined,
        hasMore,
        pageSize: limit,
        totalReturned: items.length,
      };
    }

    // Fallback: individual decryption
    const decryptedItems = items.map((row) => {
      return {
        ...row,
        content: this.decryptContent(row.content),
        updatedAt: row.updatedAt ?? undefined,
      };
    });

    return {
      items: decryptedItems as Evidence[],
      nextCursor,
      prevCursor: undefined,
      hasMore,
      pageSize: limit,
      totalReturned: items.length,
    };
  }

  /**
   * Find all evidence with optional type filter
   * @deprecated Use findAllPaginated for better performance with large datasets
   * @warning This method loads ALL evidence into memory
   */
  findAll(evidenceType?: string): Evidence[] {
    const db = getDb();

    let query = `
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
    `;

    let rows: Evidence[];

    if (evidenceType) {
      query += ' WHERE evidence_type = ? ORDER BY created_at DESC';
      rows = db.prepare(query).all(evidenceType) as Evidence[];
    } else {
      query += ' ORDER BY created_at DESC';
      rows = db.prepare(query).all() as Evidence[];
    }

    // Use batch decryption if enabled and encryption service is available
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== 'false';

    if (useBatchEncryption && this.encryptionService && rows.length > 0) {
      // Collect all encrypted content for batch decryption
      const encryptedContents = rows.map(row => {
        if (!row.content) {return null;}

        try {
          const encryptedData = JSON.parse(row.content) as EncryptedData;
          return this.encryptionService!.isEncrypted(encryptedData) ? encryptedData : null;
        } catch {
          return null; // Legacy plaintext
        }
      });

      // Batch decrypt all encrypted content
      const decryptedContents = this.encryptionService.batchDecrypt(encryptedContents);

      // Map decrypted content back to rows
      return rows.map((row, index) => {
        let content: string | null = row.content;

        // If we have a decrypted value from batch, use it
        if (encryptedContents[index] !== null) {
          content = decryptedContents[index];
        } else if (row.content && !encryptedContents[index]) {
          // Legacy plaintext or failed parse - keep original
          content = row.content;
        }

        return {
          ...row,
          content,
        };
      });
    }

    // Fallback to individual decryption
    return rows.map((row) => ({
      ...row,
      content: this.decryptContent(row.content),
    }));
  }

  /**
   * Find all evidence with cursor-based pagination
   * @param evidenceType - Optional type filter ('document', 'photo', 'email', 'recording', 'note')
   * @param limit - Maximum number of items to return (default: 50)
   * @param cursor - Opaque cursor string for pagination (null for first page)
   * @returns Paginated result with evidence items and cursor metadata
   */
  findAllPaginated(
    evidenceType?: string,
    limit: number = 50,
    cursor: string | null = null
  ): PaginatedResult<Evidence> {
    const db = getDb();

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];

    if (cursor) {
      const { rowid } = decodeSimpleCursor(cursor);
      if (evidenceType) {
        whereClause = 'WHERE evidence_type = ? AND id < ?';
        params.push(evidenceType, rowid);
      } else {
        whereClause = 'WHERE id < ?';
        params.push(rowid);
      }
    } else {
      if (evidenceType) {
        whereClause = 'WHERE evidence_type = ?';
        params.push(evidenceType);
      }
    }

    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `);

    params.push(limit + 1);
    const rows = stmt.all(...params) as (Evidence & { id: number })[];

    // Check if there are more results
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Generate next cursor from last item's id
    const nextCursor = hasMore && items.length > 0
      ? encodeSimpleCursor(items[items.length - 1].id)
      : undefined;

    // Use batch decryption if enabled
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== 'false';

    if (useBatchEncryption && this.encryptionService && items.length > 0) {
      const encryptedContents = items.map(row => {
        if (!row.content) {return null;}
        try {
          const encryptedData = JSON.parse(row.content) as EncryptedData;
          return this.encryptionService!.isEncrypted(encryptedData) ? encryptedData : null;
        } catch {
          return null;
        }
      });

      const decryptedContents = this.encryptionService.batchDecrypt(encryptedContents);

      const decryptedItems = items.map((row, index) => {
        return {
          ...row,
          content: encryptedContents[index] !== null
            ? decryptedContents[index]
            : row.content,
          updatedAt: row.updatedAt ?? undefined,
        };
      });

      return {
        items: decryptedItems as Evidence[],
        nextCursor,
        prevCursor: undefined,
        hasMore,
        pageSize: limit,
        totalReturned: items.length,
      };
    }

    // Fallback: individual decryption
    const decryptedItems = items.map((row) => {
      return {
        ...row,
        content: this.decryptContent(row.content),
        updatedAt: row.updatedAt ?? undefined,
      };
    });

    return {
      items: decryptedItems as Evidence[],
      nextCursor,
      prevCursor: undefined,
      hasMore,
      pageSize: limit,
      totalReturned: items.length,
    };
  }

  /**
   * Update evidence with encrypted content
   */
  update(id: number, input: UpdateEvidenceInput): Evidence | null {
    try {
      const db = getDb();
      const encryption = this.requireEncryptionService();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.title !== undefined) {
        updates.push('title = @title');
        params.title = input.title;
      }
      if (input.filePath !== undefined) {
        updates.push('file_path = @filePath');
        params.filePath = input.filePath;
      }
      if (input.content !== undefined) {
        updates.push('content = @content');
        // Encrypt content before UPDATE
        if (input.content) {
          const encryptedContent = encryption.encrypt(input.content);
          params.content = encryptedContent ? JSON.stringify(encryptedContent) : null;
        } else {
          params.content = null;
        }
      }
      if (input.evidenceType !== undefined) {
        updates.push('evidence_type = @evidenceType');
        params.evidenceType = input.evidenceType;
      }
      if (input.obtainedDate !== undefined) {
        updates.push('obtained_date = @obtainedDate');
        params.obtainedDate = input.obtainedDate;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE evidence
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedEvidence = this.findById(id);

      // Audit: Evidence updated
      if (updatedEvidence) {
        this.auditLogger?.log({
          eventType: 'evidence.update',
          resourceType: 'evidence',
          resourceId: id.toString(),
          action: 'update',
          details: {
            fieldsUpdated: Object.keys(input),
            caseId: updatedEvidence.caseId,
            evidenceType: updatedEvidence.evidenceType,
          },
          success: true,
        });
      }

      return updatedEvidence;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'evidence.update',
        resourceType: 'evidence',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete evidence
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM evidence WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Evidence deleted
      this.auditLogger?.log({
        eventType: 'evidence.delete',
        resourceType: 'evidence',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'evidence.delete',
        resourceType: 'evidence',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Count evidence by case
   */
  countByCase(caseId: number): number {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM evidence
      WHERE case_id = ?
    `);

    const result = stmt.get(caseId) as { count: number };
    return result.count;
  }

  /**
   * Count evidence by type
   */
  countByType(caseId?: number): Record<string, number> {
    const db = getDb();

    let query = `
      SELECT evidence_type as type, COUNT(*) as count
      FROM evidence
    `;

    if (caseId !== undefined) {
      query += ' WHERE case_id = ?';
    }

    query += ' GROUP BY evidence_type';

    const stmt = db.prepare(query);
    const results =
      caseId !== undefined
        ? (stmt.all(caseId) as Array<{ type: string; count: number }>)
        : (stmt.all() as Array<{ type: string; count: number }>);

    const counts: Record<string, number> = {
      document: 0,
      photo: 0,
      email: 0,
      recording: 0,
      note: 0,
    };

    results.forEach((row) => {
      counts[row.type] = row.count;
    });

    return counts;
  }

  /**
   * Decrypt content field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or null
   */
  private decryptContent(storedValue: string | null | undefined): string | null {
    if (!storedValue) {
      return null;
    }

    // If no encryption service, return as-is (backward compatibility)
    if (!this.encryptionService) {
      return storedValue;
    }

    try {
      // Try to parse as encrypted data
      const encryptedData = JSON.parse(storedValue) as EncryptedData;

      // Verify it's actually encrypted data format
      if (this.encryptionService.isEncrypted(encryptedData)) {
        return this.encryptionService.decrypt(encryptedData);
      }

      // If it's not encrypted format, treat as legacy plaintext
      return storedValue;
    } catch (_error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  private requireEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      throw new Error('EncryptionService not configured for EvidenceRepository');
    }
    return this.encryptionService;
  }

  /**
   * Search evidence by query string and filters
   */
  async searchEvidence(userId: number, query: string, filters?: any): Promise<Evidence[]> {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    // Get user's cases first
    const userCases = db.prepare('SELECT id FROM cases WHERE user_id = ?').all(userId) as { id: number }[];
    const caseIds = userCases.map(c => c.id);

    if (caseIds.length === 0) {
      return [];
    }

    // Case filter
    const placeholders = caseIds.map(() => '?').join(',');
    conditions.push(`case_id IN (${placeholders})`);
    params.push(...caseIds);

    // Text search
    if (query) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${query}%`, `%${query}%`);
    }

    // Date range filter
    if (filters?.dateRange) {
      conditions.push('created_at >= ? AND created_at <= ?');
      params.push(filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString());
    }

    // Specific case IDs filter
    if (filters?.caseIds && filters.caseIds.length > 0) {
      const casePlaceholders = filters.caseIds.map(() => '?').join(',');
      conditions.push(`case_id IN (${casePlaceholders})`);
      params.push(...filters.caseIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      ${whereClause}
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(...params) as Evidence[];

    // Decrypt content
    return rows.map(row => {
      row.content = this.decryptContent(row.content);
      return row;
    });
  }

  /**
   * Get all evidence for a user across all their cases
   */
  async getAllForUser(userId: number): Promise<Evidence[]> {
    const db = getDb();

    // Get user's cases
    const userCases = db.prepare('SELECT id FROM cases WHERE user_id = ?').all(userId) as { id: number }[];
    const caseIds = userCases.map(c => c.id);

    if (caseIds.length === 0) {
      return [];
    }

    const placeholders = caseIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        file_path as filePath,
        content,
        evidence_type as evidenceType,
        obtained_date as obtainedDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM evidence
      WHERE case_id IN (${placeholders})
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(...caseIds) as Evidence[];

    // Decrypt content
    return rows.map(row => {
      row.content = this.decryptContent(row.content);
      return row;
    });
  }

  /**
   * Get evidence by ID (async version for consistency)
   */
  async get(id: number): Promise<Evidence | null> {
    return this.findById(id);
  }

}
