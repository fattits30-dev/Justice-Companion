import { getDb } from '../db/database';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '../models/LegalIssue';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

/**
 * Repository for managing legal issues with encryption
 *
 * Security:
 * - description field encrypted using AES-256-GCM (P1 priority)
 * - Audit logging for all CRUD operations
 * - Backward compatibility with legacy plaintext descriptions
 */
export class LegalIssuesRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new legal issue
   */
  create(input: CreateLegalIssueInput): LegalIssue {
    try {
      const db = getDb();

      // Encrypt description before INSERT (P1 priority field)
      const encryptedDescription = input.description
        ? this.encryptionService?.encrypt(input.description)
        : null;

      const descriptionToStore = encryptedDescription
        ? JSON.stringify(encryptedDescription)
        : null;

      const stmt = db.prepare(`
        INSERT INTO legal_issues (case_id, title, description, relevant_law, guidance)
        VALUES (@caseId, @title, @description, @relevantLaw, @guidance)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        title: input.title,
        description: descriptionToStore,
        relevantLaw: input.relevantLaw ?? null,
        guidance: input.guidance ?? null,
      });

      const createdIssue = this.findById(result.lastInsertRowid as number)!;

      // Audit: Legal issue created
      this.auditLogger?.log({
        eventType: 'legal_issue.create',
        resourceType: 'legal_issue',
        resourceId: createdIssue.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          title: input.title,
        },
        success: true,
      });

      return createdIssue;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'legal_issue.create',
        resourceType: 'legal_issue',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find legal issue by ID
   */
  findById(id: number): LegalIssue | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        description,
        relevant_law as relevantLaw,
        guidance,
        created_at as createdAt
      FROM legal_issues
      WHERE id = ?
    `);

    const row = stmt.get(id) as LegalIssue | null;

    if (row) {
      // Decrypt description after SELECT
      row.description = this.decryptField(row.description);
    }

    return row;
  }

  /**
   * Find all legal issues for a case
   */
  findByCaseId(caseId: number): LegalIssue[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        title,
        description,
        relevant_law as relevantLaw,
        guidance,
        created_at as createdAt
      FROM legal_issues
      WHERE case_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId) as LegalIssue[];

    // Decrypt all description fields
    return rows.map((row) => ({
      ...row,
      description: this.decryptField(row.description),
    }));
  }

  /**
   * Update legal issue
   */
  update(id: number, input: UpdateLegalIssueInput): LegalIssue | null {
    try {
      const db = getDb();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.title !== undefined) {
        updates.push('title = @title');
        params.title = input.title;
      }

      if (input.description !== undefined) {
        updates.push('description = @description');
        // Encrypt description before UPDATE
        const encryptedDescription = input.description
          ? this.encryptionService?.encrypt(input.description)
          : null;

        params.description = encryptedDescription
          ? JSON.stringify(encryptedDescription)
          : null;
      }

      if (input.relevantLaw !== undefined) {
        updates.push('relevant_law = @relevantLaw');
        params.relevantLaw = input.relevantLaw;
      }

      if (input.guidance !== undefined) {
        updates.push('guidance = @guidance');
        params.guidance = input.guidance;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE legal_issues
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedIssue = this.findById(id);

      // Audit: Legal issue updated
      this.auditLogger?.log({
        eventType: 'legal_issue.update',
        resourceType: 'legal_issue',
        resourceId: id.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedIssue;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'legal_issue.update',
        resourceType: 'legal_issue',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete legal issue
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM legal_issues WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Legal issue deleted
      this.auditLogger?.log({
        eventType: 'legal_issue.delete',
        resourceType: 'legal_issue',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'legal_issue.delete',
        resourceType: 'legal_issue',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or null
   */
  private decryptField(storedValue: string | null | undefined): string | null {
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
    } catch (error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  /**
   * Set encryption service (for dependency injection)
   */
  setEncryptionService(service: EncryptionService): void {
    this.encryptionService = service;
  }

  /**
   * Set audit logger (for dependency injection)
   */
  setAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;
  }
}

export const legalIssuesRepository = new LegalIssuesRepository();
