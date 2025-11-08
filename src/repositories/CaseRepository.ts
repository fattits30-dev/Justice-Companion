import { getDb } from "../db/database.ts";
import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from "../domains/cases/entities/Case.ts";
import {
  EncryptionService,
  type EncryptedData,
} from "../services/EncryptionService.ts";
import type { AuditLogger } from "../services/AuditLogger.ts";

export class CaseRepository {
  private encryptionService: EncryptionService;
  private auditLogger?: AuditLogger;

  constructor(encryptionService: EncryptionService, auditLogger?: AuditLogger) {
    this.encryptionService = encryptionService;
    this.auditLogger = auditLogger;
  }
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
        descriptionToStore = encryptedDescription
          ? JSON.stringify(encryptedDescription)
          : null;
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
        eventType: "case.create",
        resourceType: "case",
        resourceId: createdCase.id.toString(),
        action: "create",
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
        eventType: "case.create",
        resourceType: "case",
        resourceId: "unknown",
        action: "create",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
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
        user_id as userId,
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
          eventType: "case.pii_access",
          resourceType: "case",
          resourceId: id.toString(),
          action: "read",
          details: { field: "description", encrypted: true },
          success: true,
        });
      }
    }

    return row ?? null;
  }

  /**
   * Find all cases belonging to a specific user
   */
  findByUserId(userId: number): Case[] {
    const db = getDb();

    const query = `
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        user_id as userId,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
      WHERE user_id = ?
    `;

    const rows = db.prepare(query).all(userId) as Case[];

    // Decrypt descriptions if encryption service is available
    return rows.map((row) => {
      let description: string | null = row.description;

      if (description && this.encryptionService) {
        try {
          const encryptedData = JSON.parse(description) as EncryptedData;
          if (this.encryptionService.isEncrypted(encryptedData)) {
            description = this.encryptionService.decrypt(encryptedData);
          }
        } catch {
          // Legacy plaintext or decryption failure - keep as-is
        }
      }

      return {
        ...row,
        description,
      };
    });
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
        user_id as userId,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
    `;

    let rows: Case[];

    if (status) {
      query += " WHERE status = ?";
      rows = db.prepare(query).all(status) as Case[];
    } else {
      rows = db.prepare(query).all() as Case[];
    }

    // Use batch decryption if enabled and encryption service is available
    const useBatchEncryption = process.env.ENABLE_BATCH_ENCRYPTION !== "false";

    if (useBatchEncryption && this.encryptionService && rows.length > 0) {
      const encryptionService = this.encryptionService;
      // Collect all encrypted descriptions for batch decryption
      const encryptedDescriptions = rows.map((row) => {
        if (!row.description) {
          return null;
        }

        try {
          const encryptedData = JSON.parse(row.description) as EncryptedData;
          return encryptionService.isEncrypted(encryptedData)
            ? encryptedData
            : null;
        } catch {
          return null; // Legacy plaintext
        }
      });

      try {
        // Batch decrypt all encrypted descriptions
        const decryptedDescriptions = encryptionService.batchDecrypt(
          encryptedDescriptions
        );

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
      } catch (error) {
        // Graceful fallback for legacy or corrupted entries
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.auditLogger?.log({
          eventType: "encryption.decrypt",
          resourceType: "case",
          resourceId: "batch",
          action: "decrypt",
          details: {
            count: rows.length,
            reason: "batch_decrypt_failed",
            strategy: "batch_fallback",
          },
          success: false,
          errorMessage,
        });

        return rows.map((row) => ({
          ...row,
          description: this.decryptDescription(row.description),
        }));
      }
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
        updates.push("title = @title");
        params.title = input.title;
      }
      if (input.description !== undefined) {
        updates.push("description = @description");
        // Encrypt description before UPDATE
        if (input.description) {
          const encryptedDescription = encryption.encrypt(input.description);
          params.description = encryptedDescription
            ? JSON.stringify(encryptedDescription)
            : null;
        } else {
          params.description = null;
        }
      }
      if (input.caseType !== undefined) {
        updates.push("case_type = @caseType");
        params.caseType = input.caseType;
      }
      if (input.status !== undefined) {
        updates.push("status = @status");
        params.status = input.status;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE cases
        SET ${updates.join(", ")}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedCase = this.findById(id);

      // Audit: Case updated
      this.auditLogger?.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: id.toString(),
        action: "update",
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedCase;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: "case.update",
        resourceType: "case",
        resourceId: id.toString(),
        action: "update",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
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
      const stmt = db.prepare("DELETE FROM cases WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Case deleted
      this.auditLogger?.log({
        eventType: "case.delete",
        resourceType: "case",
        resourceId: id.toString(),
        action: "delete",
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: "case.delete",
        resourceType: "case",
        resourceId: id.toString(),
        action: "delete",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Close a case
   */
  close(id: number): Case | null {
    return this.update(id, { status: "closed" });
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
  getStatistics(): {
    totalCases: number;
    statusCounts: Record<CaseStatus, number>;
  } {
    const statusCounts = this.countByStatus();
    const totalCases =
      statusCounts.active + statusCounts.closed + statusCounts.pending;

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
  private decryptDescription(
    storedValue: string | null | undefined
  ): string | null {
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
      throw new Error("EncryptionService not configured for CaseRepository");
    }
    return this.encryptionService;
  }

  /**
   * Search cases by query string and filters
   */
  async searchCases(
    userId: number,
    query: string,
    filters?: any
  ): Promise<Case[]> {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    // User filter
    conditions.push("user_id = ?");
    params.push(userId);

    // Text search
    if (query) {
      conditions.push("(title LIKE ? OR description LIKE ?)");
      params.push(`%${query}%`, `%${query}%`);
    }

    // Status filter
    if (filters?.caseStatus && filters.caseStatus.length > 0) {
      const placeholders = filters.caseStatus.map(() => "?").join(",");
      conditions.push(`status IN (${placeholders})`);
      params.push(...filters.caseStatus);
    }

    // Date range filter
    if (filters?.dateRange) {
      conditions.push("created_at >= ? AND created_at <= ?");
      params.push(
        filters.dateRange.from.toISOString(),
        filters.dateRange.to.toISOString()
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const stmt = db.prepare(`
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        user_id as userId,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
      ${whereClause}
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(...params) as Case[];

    // Decrypt descriptions
    return rows.map((row) => {
      row.description = this.decryptDescription(row.description);
      return row;
    });
  }

  /**
   * Get cases by user ID
   */
  async getByUserId(userId: number): Promise<Case[]> {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        user_id as userId,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as Case[];

    // Decrypt descriptions
    return rows.map((row) => {
      row.description = this.decryptDescription(row.description);
      return row;
    });
  }

  /**
   * Get case by ID (async version for consistency)
   */
  async get(id: number): Promise<Case | null> {
    return this.findById(id);
  }
}
