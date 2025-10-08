import { getDb } from '../db/database';
import type { UserFact, CreateUserFactInput, UpdateUserFactInput } from '../models/UserFact';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

/**
 * Repository for managing user facts with encryption
 *
 * Security:
 * - fact_content field encrypted using AES-256-GCM (P0 priority - direct PII)
 * - Audit logging for all CRUD operations
 * - PII access tracking for content decryption
 * - Backward compatibility with legacy plaintext facts
 */
export class UserFactsRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new user fact
   */
  create(input: CreateUserFactInput): UserFact {
    try {
      const db = getDb();

      // Encrypt fact_content before INSERT (P0 priority field - direct PII)
      const encryptedContent = this.encryptionService?.encrypt(input.factContent);

      if (!encryptedContent) {
        throw new Error('EncryptionService is required to create user facts');
      }

      const contentToStore = JSON.stringify(encryptedContent);

      const stmt = db.prepare(`
        INSERT INTO user_facts (case_id, fact_content, fact_type)
        VALUES (@caseId, @factContent, @factType)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        factContent: contentToStore,
        factType: input.factType,
      });

      const createdFact = this.findById(result.lastInsertRowid as number)!;

      // Audit: User fact created
      this.auditLogger?.log({
        eventType: 'user_fact.create',
        resourceType: 'user_fact',
        resourceId: createdFact.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          factType: input.factType,
          contentLength: input.factContent.length,
        },
        success: true,
      });

      return createdFact;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'user_fact.create',
        resourceType: 'user_fact',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user fact by ID
   */
  findById(id: number): UserFact | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_type as factType,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_facts
      WHERE id = ?
    `);

    const row = stmt.get(id) as UserFact | null;

    if (row) {
      // Decrypt fact_content after SELECT
      const originalContent = row.factContent;
      row.factContent = this.decryptField(row.factContent);

      // Audit: PII accessed (encrypted fact_content field)
      if (originalContent && row.factContent !== originalContent) {
        this.auditLogger?.log({
          eventType: 'user_fact.content_access',
          resourceType: 'user_fact',
          resourceId: id.toString(),
          action: 'read',
          details: { field: 'fact_content', encrypted: true },
          success: true,
        });
      }
    }

    return row;
  }

  /**
   * Find all user facts for a case
   */
  findByCaseId(caseId: number): UserFact[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_type as factType,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_facts
      WHERE case_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId) as UserFact[];

    // Decrypt all fact_content fields
    const decryptedRows = rows.map((row) => ({
      ...row,
      factContent: this.decryptField(row.factContent),
    }));

    // Audit: Bulk content access
    if (decryptedRows.length > 0) {
      this.auditLogger?.log({
        eventType: 'user_fact.content_access',
        resourceType: 'user_fact',
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
   * Find user facts by type for a case
   */
  findByType(caseId: number, factType: string): UserFact[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        fact_content as factContent,
        fact_type as factType,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_facts
      WHERE case_id = ? AND fact_type = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId, factType) as UserFact[];

    // Decrypt all fact_content fields
    const decryptedRows = rows.map((row) => ({
      ...row,
      factContent: this.decryptField(row.factContent),
    }));

    // Audit: Filtered content access
    if (decryptedRows.length > 0) {
      this.auditLogger?.log({
        eventType: 'user_fact.content_access',
        resourceType: 'user_fact',
        resourceId: `case_${caseId}_type_${factType}`,
        action: 'read',
        details: {
          field: 'fact_content',
          encrypted: true,
          factType,
          count: decryptedRows.length,
        },
        success: true,
      });
    }

    return decryptedRows;
  }

  /**
   * Update user fact
   */
  update(id: number, input: UpdateUserFactInput): UserFact | null {
    try {
      const db = getDb();
      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      // Encrypt new fact_content if provided
      if (input.factContent !== undefined) {
        const encryptedContent = this.encryptionService?.encrypt(input.factContent);

        if (!encryptedContent) {
          throw new Error('EncryptionService is required to update user facts');
        }

        updates.push('fact_content = @factContent');
        params.factContent = JSON.stringify(encryptedContent);
      }

      if (input.factType !== undefined) {
        updates.push('fact_type = @factType');
        params.factType = input.factType;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE user_facts
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedFact = this.findById(id);

      // Audit: User fact updated
      this.auditLogger?.log({
        eventType: 'user_fact.update',
        resourceType: 'user_fact',
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
        eventType: 'user_fact.update',
        resourceType: 'user_fact',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete user fact
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM user_facts WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: User fact deleted
      this.auditLogger?.log({
        eventType: 'user_fact.delete',
        resourceType: 'user_fact',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'user_fact.delete',
        resourceType: 'user_fact',
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
    } catch (_error) {
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

export const userFactsRepository = new UserFactsRepository();
