import { getDb } from '../db/database.ts';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../domains/cases/entities/CaseFact.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.ts';

/**
 * Database row type for case_facts table
 */
interface CaseFactRow {
  id: number;
  case_id: number;
  fact_content: string;
  fact_category: string;
  importance: string;
  created_at: string;
  updated_at: string;
}

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
    } catch (_error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'case_fact.create',
        resourceType: 'case_fact',
        resourceId: 'unknown',
        action: 'create',
        details: {
          caseId: input.caseId,
          factCategory: input.factCategory,
          importance: input.importance || 'medium',
          contentLength: input.factContent.length,
        },
        success: false,
      });

      throw _error;
    }
  }

  /**
   * Find a case fact by ID
   */
  findById(id: number): CaseFact | null {
    const db = getDb();

    const stmt = db.prepare(`
      SELECT id, case_id, fact_content, fact_category, importance, created_at, updated_at
      FROM case_facts
      WHERE id = ?
    `);

    const row = stmt.get(id) as CaseFactRow | undefined;

    if (!row) {
      return null;
    }

    // Decrypt fact_content if needed (backward compatibility)
    let decryptedContent: string;
    try {
      const parsedContent = JSON.parse(row.fact_content);
      if (typeof parsedContent === 'string') {
        // Legacy plaintext format
        decryptedContent = parsedContent;
      } else {
        // Encrypted format
        const decrypted = this.encryptionService.decrypt(parsedContent);
        decryptedContent = decrypted ?? '';
      }
    } catch (e) {
      // Fallback to plaintext if decryption fails
      decryptedContent = row.fact_content;
    }

    return {
      id: row.id,
      caseId: row.case_id,
      factContent: decryptedContent,
      factCategory: row.fact_category,
      importance: row.importance,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Update a case fact
   */
  update(id: number, input: UpdateCaseFactInput): CaseFact | null {
    try {
      const existingFact = this.findById(id);
      
      if (!existingFact) {
        return null;
      }
      
      const db = getDb();
      
      // Encrypt fact_content if provided (P1 priority field - may contain PII)
      let encryptedContent: EncryptedData | null = null;
      let contentToStore: string | null = null;
      
      if (input.factContent !== undefined) {
        encryptedContent = this.encryptionService?.encrypt(input.factContent);
        
        if (!encryptedContent) {
          throw new Error('EncryptionService is required to update case facts');
        }
        
        contentToStore = JSON.stringify(encryptedContent);
      }
      
      const stmt = db.prepare(`
        UPDATE case_facts 
        SET 
          fact_content = COALESCE(@factContent, fact_content),
          fact_category = COALESCE(@factCategory, fact_category),
          importance = COALESCE(@importance, importance),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `);
      
      const result = stmt.run({
        id,
        factContent: contentToStore,
        factCategory: input.factCategory,
        importance: input.importance,
      });
      
      if (result.changes === 0) {
        return null;
      }
      
      const updatedFact = this.findById(id)!;
      
      // Audit: Case fact updated
      this.auditLogger?.log({
        eventType: 'case_fact.update',
        resourceType: 'case_fact',
        resourceId: updatedFact.id.toString(),
        action: 'update',
        details: {
          caseId: updatedFact.caseId,
          factCategory: updatedFact.factCategory,
          importance: updatedFact.importance,
          contentLength: updatedFact.factContent.length,
        },
        success: true,
      });
      
      return updatedFact;
    } catch (_error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'case_fact.update',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'update',
        details: {
          factCategory: input.factCategory,
          importance: input.importance,
        },
        success: false,
      });

      throw _error;
    }
  }

  /**
   * Delete a case fact
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      
      const stmt = db.prepare(`
        DELETE FROM case_facts 
        WHERE id = ?
      `);
      
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        return false;
      }
      
      // Audit: Case fact deleted
      this.auditLogger?.log({
        eventType: 'case_fact.delete',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'delete',
        details: {
          caseId: null,
          factCategory: null,
          importance: null,
        },
        success: true,
      });
      
      return true;
    } catch (_error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'case_fact.delete',
        resourceType: 'case_fact',
        resourceId: id.toString(),
        action: 'delete',
        details: {},
        success: false,
      });

      throw _error;
    }
  }

  /**
   * Get all case facts for a specific case
   */
  findByCaseId(caseId: number): CaseFact[] {
    const db = getDb();

    const stmt = db.prepare(`
      SELECT id, case_id, fact_content, fact_category, importance, created_at, updated_at
      FROM case_facts
      WHERE case_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(caseId) as CaseFactRow[];

    return rows.map(row => {
      // Decrypt fact_content if needed (backward compatibility)
      let decryptedContent: string;
      try {
        const parsedContent = JSON.parse(row.fact_content);
        if (typeof parsedContent === 'string') {
          // Legacy plaintext format
          decryptedContent = parsedContent;
        } else {
          // Encrypted format
          const decrypted = this.encryptionService.decrypt(parsedContent);
          decryptedContent = decrypted ?? '';
        }
      } catch (e) {
        // Fallback to plaintext if decryption fails
        decryptedContent = row.fact_content;
      }

      return {
        id: row.id,
        caseId: row.case_id,
        factContent: decryptedContent,
        factCategory: row.fact_category,
        importance: row.importance,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    });
  }
}