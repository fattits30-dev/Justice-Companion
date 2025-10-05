import { getDb } from '../db/database';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';

export class CaseRepository {
  constructor(private encryptionService?: EncryptionService) {}
  /**
   * Create a new case
   */
  create(input: CreateCaseInput): Case {
    const db = getDb();

    // Encrypt description before INSERT
    const encryptedDescription = input.description
      ? this.encryptionService?.encrypt(input.description)
      : null;

    const descriptionToStore = encryptedDescription
      ? JSON.stringify(encryptedDescription)
      : null;

    const stmt = db.prepare(`
      INSERT INTO cases (title, description, case_type, status)
      VALUES (@title, @description, @caseType, 'active')
    `);

    const result = stmt.run({
      title: input.title,
      description: descriptionToStore,
      caseType: input.caseType,
    });

    return this.findById(result.lastInsertRowid as number)!;
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
      row.description = this.decryptDescription(row.description);
    }

    return row;
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

    // Decrypt all descriptions
    return rows.map((row) => ({
      ...row,
      description: this.decryptDescription(row.description),
    }));
  }

  /**
   * Update case
   */
  update(id: number, input: UpdateCaseInput): Case | null {
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
    return this.findById(id);
  }

  /**
   * Delete case (cascades to related records via foreign keys)
   */
  delete(id: number): boolean {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
}

export const caseRepository = new CaseRepository();
