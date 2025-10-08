import { getDb } from '../db/database';
import type { TimelineEvent, CreateTimelineEventInput, UpdateTimelineEventInput } from '../models/TimelineEvent';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';

/**
 * Repository for managing timeline events with encryption
 *
 * Security:
 * - description field encrypted using AES-256-GCM (P1 priority)
 * - Audit logging for all CRUD operations
 * - Backward compatibility with legacy plaintext descriptions
 */
export class TimelineRepository {
  constructor(
    private encryptionService?: EncryptionService,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Create a new timeline event
   */
  create(input: CreateTimelineEventInput): TimelineEvent {
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
        INSERT INTO timeline_events (case_id, event_date, title, description)
        VALUES (@caseId, @eventDate, @title, @description)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        eventDate: input.eventDate,
        title: input.title,
        description: descriptionToStore,
      });

      const createdEvent = this.findById(result.lastInsertRowid as number)!;

      // Audit: Timeline event created
      this.auditLogger?.log({
        eventType: 'timeline_event.create',
        resourceType: 'timeline_event',
        resourceId: createdEvent.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          title: input.title,
          eventDate: input.eventDate,
        },
        success: true,
      });

      return createdEvent;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'timeline_event.create',
        resourceType: 'timeline_event',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Find timeline event by ID
   */
  findById(id: number): TimelineEvent | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        event_date as eventDate,
        title,
        description,
        created_at as createdAt
      FROM timeline_events
      WHERE id = ?
    `);

    const row = stmt.get(id) as TimelineEvent | null;

    if (row) {
      // Decrypt description after SELECT
      row.description = this.decryptField(row.description);
    }

    return row ?? null;
  }

  /**
   * Find all timeline events for a case
   */
  findByCaseId(caseId: number): TimelineEvent[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        event_date as eventDate,
        title,
        description,
        created_at as createdAt
      FROM timeline_events
      WHERE case_id = ?
      ORDER BY event_date DESC, created_at DESC
    `);

    const rows = stmt.all(caseId) as TimelineEvent[];

    // Decrypt all description fields
    return rows.map((row) => ({
      ...row,
      description: this.decryptField(row.description),
    }));
  }

  /**
   * Update timeline event
   */
  update(id: number, input: UpdateTimelineEventInput): TimelineEvent | null {
    try {
      const db = getDb();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.eventDate !== undefined) {
        updates.push('event_date = @eventDate');
        params.eventDate = input.eventDate;
      }

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

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE timeline_events
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedEvent = this.findById(id);

      // Audit: Timeline event updated
      this.auditLogger?.log({
        eventType: 'timeline_event.update',
        resourceType: 'timeline_event',
        resourceId: id.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedEvent;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'timeline_event.update',
        resourceType: 'timeline_event',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Delete timeline event
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM timeline_events WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Timeline event deleted
      this.auditLogger?.log({
        eventType: 'timeline_event.delete',
        resourceType: 'timeline_event',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'timeline_event.delete',
        resourceType: 'timeline_event',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: this.getErrorMessage(error),
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
    } catch (_error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  /**
   * Normalize unknown error values into a message for logging
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return 'Unknown error';
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

export const timelineRepository = new TimelineRepository();
