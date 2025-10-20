import { getDb } from '../db/database.ts';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case.ts';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

export class CaseRepository {
  constructor(
    private encryptionService: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}
  /**
   * Create a new case
   */
  create(input: CreateCaseInput): Case {
    try {
      const db = getDb();
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
   * Find case by ID
   */
  findById(id: number): Case | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
      WHERE id = ?
    `);

    const row = stmt.get(id) as Case | null;

    if (row) {
      // Decrypt description after SELECT
      const originalDescription = row.description;
      row.description = this.decryptDescription(row.description);

      // Audit: PII accessed (encrypted description field)
      if (originalDescription && row.description !== originalDescription) {
        this.auditLogger?.log({
          eventType: 'case.pii_access',
          resourceType: 'case',
          resourceId: id.toString(),
          action: 'read',
          details: { field: 'description', encrypted: true },
          success: true,
        });
      }
    }

    return row ?? null;
  }

  /**
   * Find all cases with optional status filter
   */
  findAll(status?: CaseStatus): Case[] {
    const db = getDb();

    let query = `
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
    `;

    let rows: Case[];

    if (status) {
      query += ' WHERE status = ?';
      rows = db.prepare(query).all(status) as Case[];
    } else {
      rows = db.prepare(query).all() as Case[];
    }

    // Use batch decryption if enabled and encryption service is available
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== 'false';

    if (useBatchEncryption && this.encryptionService && rows.length > 0) {
      // Collect all encrypted descriptions for batch decryption
      const encryptedDescriptions = rows.map(row => {
        if (!row.description) return null;

        try {
          const encryptedData = JSON.parse(row.description) as EncryptedData;
          return this.encryptionService!.isEncrypted(encryptedData) ? encryptedData : null;
        } catch {
          return null; // Legacy plaintext
        }
      });

      // Batch decrypt all encrypted descriptions
      const decryptedDescriptions = this.encryptionService.batchDecrypt(encryptedDescriptions);

      // Map decrypted descriptions back to rows
      return rows.map((row, index) => {
        let description: string | null = row.description;

        // If we have a decrypted value from batch, use it
        if (encryptedDescriptions[index] !== null) {
          description = decryptedDescriptions[index];
        } else if (row.description && !encryptedDescriptions[index]) {
          // Legacy plaintext or failed parse - keep original
          description = row.description;
        }

        return {
          ...row,
          description,
        };
      });
    }

    // Fallback to individual decryption
    return rows.map((row) => ({
      ...row,
      description: this.decryptDescription(row.description),
    }));
  }

  /**
   * Update case
   */
  update(id: number, input: UpdateCaseInput): Case | null {
    try {
      const db = getDb();
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
   * Delete case (cascades to related records via foreign keys)
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

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
    const db = getDb();
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
   * Decrypt description field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or null
   */
  private decryptDescription(storedValue: string | null | undefined): string | null {
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
      throw new Error('EncryptionService not configured for CaseRepository');
    }
    return this.encryptionService;
  }

}
