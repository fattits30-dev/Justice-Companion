import { getDb } from '../db/database';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../models/Note';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

/**
 * Repository for managing case notes with encryption
 *
 * Security:
 * - content field encrypted using AES-256-GCM
 * - Audit logging for all CRUD operations
 * - PII access tracking for content decryption
 * - Backward compatibility with legacy plaintext notes
 */
export class NotesRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new note
   */
  create(input: CreateNoteInput): Note {
    try {
      const db = getDb();

      // Encrypt content before INSERT (P0 priority field)
      let contentToStore: string;
      if (this.encryptionService) {
        const encryptedContent = this.encryptionService.encrypt(input.content);
        contentToStore = JSON.stringify(encryptedContent);
      } else {
        // No encryption service - store as plaintext (backward compatibility)
        contentToStore = input.content;
      }

      const stmt = db.prepare(`
        INSERT INTO notes (case_id, content)
        VALUES (@caseId, @content)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        content: contentToStore,
      });

      const createdNote = this.findById(result.lastInsertRowid as number)!;

      // Audit: Note created
      this.auditLogger?.log({
        eventType: 'note.create',
        resourceType: 'note',
        resourceId: createdNote.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          contentLength: input.content.length,
        },
        success: true,
      });

      return createdNote;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'note.create',
        resourceType: 'note',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find note by ID
   */
  findById(id: number): Note | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        content,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notes
      WHERE id = ?
    `);

    const row = stmt.get(id) as Note | null;

    if (row) {
      // Decrypt content after SELECT
      const originalContent = row.content;
      row.content = this.decryptContent(row.content);

      // Audit: PII accessed (encrypted content field)
      if (originalContent && row.content !== originalContent) {
        this.auditLogger?.log({
          eventType: 'note.content_access',
          resourceType: 'note',
          resourceId: id.toString(),
          action: 'read',
          details: { field: 'content', encrypted: true },
          success: true,
        });
      }
    }

    return row ?? null;
  }

  /**
   * Find all notes for a case
   */
  findByCaseId(caseId: number): Note[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        content,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notes
      WHERE case_id = ?
      ORDER BY created_at DESC, id DESC
    `);

    const rows = stmt.all(caseId) as Note[];

    // Decrypt all content fields
    return rows.map((row) => ({
      ...row,
      content: this.decryptContent(row.content),
    }));
  }

  /**
   * Update note content
   */
  update(id: number, input: UpdateNoteInput): Note | null {
    try {
      const db = getDb();

      // Encrypt new content before UPDATE
      let contentToStore: string;
      if (this.encryptionService) {
        const encryptedContent = this.encryptionService.encrypt(input.content);
        contentToStore = JSON.stringify(encryptedContent);
      } else {
        // No encryption service - store as plaintext (backward compatibility)
        contentToStore = input.content;
      }

      const stmt = db.prepare(`
        UPDATE notes
        SET content = @content
        WHERE id = @id
      `);

      stmt.run({
        id,
        content: contentToStore,
      });

      const updatedNote = this.findById(id);

      // Audit: Note updated
      this.auditLogger?.log({
        eventType: 'note.update',
        resourceType: 'note',
        resourceId: id.toString(),
        action: 'update',
        details: {
          contentLength: input.content.length,
        },
        success: true,
      });

      return updatedNote;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'note.update',
        resourceType: 'note',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete note
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Note deleted
      this.auditLogger?.log({
        eventType: 'note.delete',
        resourceType: 'note',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'note.delete',
        resourceType: 'note',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt content field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or original value
   */
  private decryptContent(storedValue: string | null | undefined): string {
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

export const notesRepository = new NotesRepository();
