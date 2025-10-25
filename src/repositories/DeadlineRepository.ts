import type Database from 'better-sqlite3';
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
  DeadlineWithCase,
} from '../domains/timeline/entities/Deadline.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';

/**
 * DeadlineRepository - Data access layer for deadlines
 *
 * Handles CRUD operations for legal deadlines/milestones
 * Supports soft deletes, status management, and timeline queries
 */
export class DeadlineRepository {
  private db: Database.Database;
  private auditLogger?: AuditLogger;

  constructor(db: Database.Database, auditLogger?: AuditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
  }

  /**
   * Create a new deadline
   */
  create(input: CreateDeadlineInput): Deadline {
    const stmt = this.db.prepare(`
      INSERT INTO deadlines (case_id, user_id, title, description, deadline_date, priority)
      VALUES (@caseId, @userId, @title, @description, @deadlineDate, @priority)
    `);

    const result = stmt.run({
      caseId: input.caseId,
      userId: input.userId,
      title: input.title,
      description: input.description || null,
      deadlineDate: input.deadlineDate,
      priority: input.priority || 'medium',
    });

    const id = result.lastInsertRowid as number;

    if (this.auditLogger) {
      this.auditLogger.log({
        userId: input.userId.toString(),
        eventType: 'timeline_event.create',
        resourceType: 'deadline',
        resourceId: id.toString(),
        action: 'create',
        details: { title: input.title },
      });
    }

    return this.findById(id)!;
  }

  /**
   * Find deadline by ID
   */
  findById(id: number): Deadline | null {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, user_id as userId,
        title, description, deadline_date as deadlineDate,
        priority, status, completed_at as completedAt,
        created_at as createdAt, updated_at as updatedAt,
        deleted_at as deletedAt
      FROM deadlines
      WHERE id = ? AND deleted_at IS NULL
    `);

    return stmt.get(id) as Deadline | null;
  }

  /**
   * Find all deadlines for a specific case
   */
  findByCaseId(caseId: number, userId: number): Deadline[] {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, user_id as userId,
        title, description, deadline_date as deadlineDate,
        priority, status, completed_at as completedAt,
        created_at as createdAt, updated_at as updatedAt,
        deleted_at as deletedAt
      FROM deadlines
      WHERE case_id = ? AND user_id = ? AND deleted_at IS NULL
      ORDER BY deadline_date ASC, priority DESC
    `);

    return stmt.all(caseId, userId) as Deadline[];
  }

  /**
   * Find all deadlines for a user (timeline view)
   */
  findByUserId(userId: number): DeadlineWithCase[] {
    const stmt = this.db.prepare(`
      SELECT
        d.id, d.case_id as caseId, d.user_id as userId,
        d.title, d.description, d.deadline_date as deadlineDate,
        d.priority, d.status, d.completed_at as completedAt,
        d.created_at as createdAt, d.updated_at as updatedAt,
        d.deleted_at as deletedAt,
        c.title as caseTitle,
        c.status as caseStatus
      FROM deadlines d
      JOIN cases c ON c.id = d.case_id
      WHERE d.user_id = ? AND d.deleted_at IS NULL
      ORDER BY d.deadline_date ASC, d.priority DESC
    `);

    return stmt.all(userId) as DeadlineWithCase[];
  }

  /**
   * Find upcoming deadlines (not overdue, not completed)
   */
  findUpcoming(userId: number, limit: number = 10): DeadlineWithCase[] {
    const stmt = this.db.prepare(`
      SELECT
        d.id, d.case_id as caseId, d.user_id as userId,
        d.title, d.description, d.deadline_date as deadlineDate,
        d.priority, d.status, d.completed_at as completedAt,
        d.created_at as createdAt, d.updated_at as updatedAt,
        d.deleted_at as deletedAt,
        c.title as caseTitle,
        c.status as caseStatus
      FROM deadlines d
      JOIN cases c ON c.id = d.case_id
      WHERE d.user_id = ?
        AND d.status = 'upcoming'
        AND d.deleted_at IS NULL
      ORDER BY d.deadline_date ASC, d.priority DESC
      LIMIT ?
    `);

    return stmt.all(userId, limit) as DeadlineWithCase[];
  }

  /**
   * Find overdue deadlines
   */
  findOverdue(userId: number): DeadlineWithCase[] {
    const stmt = this.db.prepare(`
      SELECT
        d.id, d.case_id as caseId, d.user_id as userId,
        d.title, d.description, d.deadline_date as deadlineDate,
        d.priority, d.status, d.completed_at as completedAt,
        d.created_at as createdAt, d.updated_at as updatedAt,
        d.deleted_at as deletedAt,
        c.title as caseTitle,
        c.status as caseStatus
      FROM deadlines d
      JOIN cases c ON c.id = d.case_id
      WHERE d.user_id = ?
        AND d.status = 'overdue'
        AND d.deleted_at IS NULL
      ORDER BY d.deadline_date ASC, d.priority DESC
    `);

    return stmt.all(userId) as DeadlineWithCase[];
  }

  /**
   * Update deadline
   */
  update(id: number, userId: number, input: UpdateDeadlineInput): Deadline | null {
    const current = this.findById(id);
    if (!current || current.userId !== userId) {
      return null;
    }

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
    if (input.deadlineDate !== undefined) {
      updates.push('deadline_date = @deadlineDate');
      params.deadlineDate = input.deadlineDate;
    }
    if (input.priority !== undefined) {
      updates.push('priority = @priority');
      params.priority = input.priority;
    }
    if (input.status !== undefined) {
      updates.push('status = @status');
      params.status = input.status;

      if (input.status === 'completed') {
        updates.push('completed_at = datetime("now")');
      } else {
        updates.push('completed_at = NULL');
      }
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push('updated_at = datetime("now")');

    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET ${updates.join(', ')}
      WHERE id = @id AND deleted_at IS NULL
    `);

    stmt.run(params);

    if (this.auditLogger) {
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: 'timeline_event.update',
        resourceType: 'deadline',
        resourceId: id.toString(),
        action: 'update',
        details: { title: current.title },
      });
    }

    return this.findById(id);
  }

  /**
   * Mark deadline as completed
   */
  markCompleted(id: number, userId: number): Deadline | null {
    return this.update(id, userId, { status: 'completed' });
  }

  /**
   * Mark deadline as upcoming (undo completion)
   */
  markUpcoming(id: number, userId: number): Deadline | null {
    return this.update(id, userId, { status: 'upcoming' });
  }

  /**
   * Soft delete deadline
   */
  delete(id: number, userId: number): boolean {
    const current = this.findById(id);
    if (!current || current.userId !== userId) {
      return false;
    }

    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET deleted_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(id);

    if (this.auditLogger && result.changes > 0) {
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: 'timeline_event.delete',
        resourceType: 'deadline',
        resourceId: id.toString(),
        action: 'delete',
        details: { title: current.title },
      });
    }

    return result.changes > 0;
  }

  /**
   * Check and update overdue deadlines
   * Returns number of deadlines marked as overdue
   */
  checkAndUpdateOverdue(): number {
    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET status = 'overdue',
          updated_at = datetime('now')
      WHERE deadline_date < date('now')
        AND status = 'upcoming'
        AND deleted_at IS NULL
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get deadline statistics for user
   */
  getStats(userId: number): {
    total: number;
    upcoming: number;
    overdue: number;
    completed: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) as upcoming,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM deadlines
      WHERE user_id = ? AND deleted_at IS NULL
    `);

    const result = stmt.get(userId) as {
      total: number;
      upcoming: number;
      overdue: number;
      completed: number;
    };

    return {
      total: result.total || 0,
      upcoming: result.upcoming || 0,
      overdue: result.overdue || 0,
      completed: result.completed || 0,
    };
  }

  /**
   * Get upcoming deadlines for a specific user within a certain number of days
   * Used by the notification scheduler
   */
  getUpcomingForUser(userId: number, daysAhead: number): any[] {
    const stmt = this.db.prepare(`
      SELECT
        d.*,
        c.title as case_title,
        c.case_number
      FROM deadlines d
      LEFT JOIN cases c ON d.case_id = c.id
      WHERE d.user_id = ?
        AND d.deleted_at IS NULL
        AND d.status != 'completed'
        AND date(d.deadline) <= date('now', '+' || ? || ' days')
        AND date(d.deadline) >= date('now')
      ORDER BY d.deadline ASC
    `);

    const rows = stmt.all(userId, daysAhead) as any[];
    return rows.map(this.mapToDeadline.bind(this));
  }

  /**
   * Get all upcoming deadlines within a certain number of days
   * Used by the system-wide notification scheduler
   */
  getUpcoming(daysAhead: number): any[] {
    const stmt = this.db.prepare(`
      SELECT
        d.*,
        c.title as case_title,
        c.case_number
      FROM deadlines d
      LEFT JOIN cases c ON d.case_id = c.id
      WHERE d.deleted_at IS NULL
        AND d.status != 'completed'
        AND date(d.deadline) <= date('now', '+' || ? || ' days')
        AND date(d.deadline) >= date('now')
      ORDER BY d.deadline ASC
    `);

    const rows = stmt.all(daysAhead) as any[];
    return rows.map(this.mapToDeadline.bind(this));
  }
}
