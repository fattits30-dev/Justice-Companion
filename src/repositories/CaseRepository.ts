import { getDb } from '../db/database';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case';

export class CaseRepository {
  /**
   * Create a new case
   */
  create(input: CreateCaseInput): Case {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO cases (title, description, case_type, status)
      VALUES (@title, @description, @caseType, 'active')
    `);

    const result = stmt.run({
      title: input.title,
      description: input.description ?? null,
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

    return stmt.get(id) as Case | null;
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

    if (status) {
      query += ' WHERE status = ?';
      return db.prepare(query).all(status) as Case[];
    }

    return db.prepare(query).all() as Case[];
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
      params.description = input.description;
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
}

export const caseRepository = new CaseRepository();
