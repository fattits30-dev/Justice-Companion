import { getDb } from '../db/database';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../models/CaseFact';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

/**
 * Repository for managing case facts with encryption
 *
 * Security:
 * - fact_content field encrypted using AES-256-GCM (P1 priority - may contain PII)
 * - Audit logging for all CRUD operations
 * - PII access tracking for content decryption
 * - Backward compatibility with legacy plaintext facts
 */
export class CaseFactsRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new case fact
   */
  create(input: CreateCaseFactInput): CaseFact {
    try {
      const db = getDb();

      // Encrypt fact_content before INSERT (P1 priority field - may contain PII)
      const encryptedContent = this.encryptionService?.encrypt(input.factContent);

      if (!encryptedContent) {
        throw new Error('EncryptionService is required to create case facts');
      }

      const contentToStore = JSON.stringify(encryptedContent);

      const stmt = db.prepare(`
        INSERT INTO case_facts (case_id, fact_content, fact_category, importance)
        VALUES (@caseId, @factContent, @factCategory, @importance)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        factContent: contentToStore,
        factCategory: input.factCategory,
        importance: input.importance || 'medium',
      });

      const createdFact = this.findById(result.lastInsertRowid as number)!;

      // Audit: Case fact created
      this.auditLogger?.log({
        eventType: 'case_fact.create',
        resourceType: 'case_fact',
        resourceId: createdFact.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          factCategory: input.factCategory,
          importance: input.importance || 'medium',
          contentLength: input.factContent.length,
        },
        success: true,
      });

      return createdFact;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'case_fact.create',
        resourceType: 'case_fact',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find case fact by ID
   */
  findById(id: number): CaseFact | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_category as factCategory,
        importance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_facts
      WHERE id = ?
    `);

    const row = stmt.get(id) as CaseFact | undefined;

    if (!row) {
      return null;
    }

    // Decrypt fact_content after SELECT
    const originalContent = row.factContent;
    row.factContent = this.decryptField(row.factContent);

    // Audit: PII accessed (encrypted fact_content field)
    if (originalContent && row.factContent !== originalContent) {
      this.auditLogger?.log({
        eventType: 'case_fact.content_access',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'read',
        details: { field: 'fact_content', encrypted: true },
        success: true,
      });
    }

    return row;
  }

  /**
   * Find all case facts for a case
   */
  findByCaseId(caseId: number): CaseFact[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_category as factCategory,
        importance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_facts
      WHERE case_id = ?
      ORDER BY
        CASE importance
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END ASC,
        created_at DESC
    `);

    const rows = stmt.all(caseId) as CaseFact[];

    // Decrypt all fact_content fields
    const decryptedRows = rows.map((row) => ({
      ...row,
      factContent: this.decryptField(row.factContent),
    }));

    // Audit: Bulk content access
    if (decryptedRows.length > 0) {
      this.auditLogger?.log({
        eventType: 'case_fact.content_access',
        resourceType: 'case_fact',
        resourceId: `case_${caseId}`,
        action: 'read',
        details: {
          field: 'fact_content',
          encrypted: true,
          count: decryptedRows.length,
        },
        success: true,
      });
    }

    return decryptedRows;
  }

  /**
   * Find case facts by category for a case
   */
  findByCategory(caseId: number, category: string): CaseFact[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_category as factCategory,
        importance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_facts
      WHERE case_id = ? AND fact_category = ?
      ORDER BY
        CASE importance
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END ASC,
        created_at DESC
    `);

    const rows = stmt.all(caseId, category) as CaseFact[];

    // Decrypt all fact_content fields
    const decryptedRows = rows.map((row) => ({
      ...row,
      factContent: this.decryptField(row.factContent),
    }));

    // Audit: Filtered content access
    if (decryptedRows.length > 0) {
      this.auditLogger?.log({
        eventType: 'case_fact.content_access',
        resourceType: 'case_fact',
        resourceId: `case_${caseId}_category_${category}`,
        action: 'read',
        details: {
          field: 'fact_content',
          encrypted: true,
          factCategory: category,
          count: decryptedRows.length,
        },
        success: true,
      });
    }

    return decryptedRows;
  }

  /**
   * Find case facts by importance level for a case
   */
  findByImportance(caseId: number, importance: string): CaseFact[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_category as factCategory,
        importance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_facts
      WHERE case_id = ? AND importance = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId, importance) as CaseFact[];

    // Decrypt all fact_content fields
    const decryptedRows = rows.map((row) => ({
      ...row,
      factContent: this.decryptField(row.factContent),
    }));

    // Audit: Filtered content access
    if (decryptedRows.length > 0) {
      this.auditLogger?.log({
        eventType: 'case_fact.content_access',
        resourceType: 'case_fact',
        resourceId: `case_${caseId}_importance_${importance}`,
        action: 'read',
        details: {
          field: 'fact_content',
          encrypted: true,
          importance,
          count: decryptedRows.length,
        },
        success: true,
      });
    }

    return decryptedRows;
  }

  /**
   * Update case fact
   */
  update(id: number, input: UpdateCaseFactInput): CaseFact | null {
    try {
      const db = getDb();
      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      // Encrypt new fact_content if provided
      if (input.factContent !== undefined) {
        const encryptedContent = this.encryptionService?.encrypt(input.factContent);

        if (!encryptedContent) {
          throw new Error('EncryptionService is required to update case facts');
        }

        updates.push('fact_content = @factContent');
        params.factContent = JSON.stringify(encryptedContent);
      }

      if (input.factCategory !== undefined) {
        updates.push('fact_category = @factCategory');
        params.factCategory = input.factCategory;
      }

      if (input.importance !== undefined) {
        updates.push('importance = @importance');
        params.importance = input.importance;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE case_facts
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedFact = this.findById(id);

      // Audit: Case fact updated
      this.auditLogger?.log({
        eventType: 'case_fact.update',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'update',
        details: {
          updatedFields: Object.keys(input),
          contentLength: input.factContent?.length,
        },
        success: true,
      });

      return updatedFact;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'case_fact.update',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete case fact
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM case_facts WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Case fact deleted
      this.auditLogger?.log({
        eventType: 'case_fact.delete',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'case_fact.delete',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt fact_content field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or original value
   */
  private decryptField(storedValue: string | null | undefined): string {
    if (!storedValue) {
      return '';
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
        return this.encryptionService.decrypt(encryptedData) || '';
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

export const caseFactsRepository = new CaseFactsRepository();
