import type Database from 'better-sqlite3';
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
  DeadlineWithCase,
} from '../domains/timeline/entities/Deadline.ts';
import type {
  DeadlineDependency,
  CreateDeadlineDependencyInput,
  UpdateDeadlineDependencyInput,
  DeadlineWithDependencies,
} from '../domains/timeline/entities/DeadlineDependency.ts';
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

  // ============================================
  // Dependency Management (Wave 6 Task 3: Gantt Chart)
  // ============================================

  /**
   * Create a dependency between two deadlines
   */
  createDependency(input: CreateDeadlineDependencyInput): DeadlineDependency {
    const stmt = this.db.prepare(`
      INSERT INTO deadline_dependencies (
        source_deadline_id,
        target_deadline_id,
        dependency_type,
        lag_days,
        created_by
      ) VALUES (@sourceDeadlineId, @targetDeadlineId, @dependencyType, @lagDays, @createdBy)
    `);

    const result = stmt.run({
      sourceDeadlineId: input.sourceDeadlineId,
      targetDeadlineId: input.targetDeadlineId,
      dependencyType: input.dependencyType,
      lagDays: input.lagDays || 0,
      createdBy: input.createdBy || null,
    });

    const id = result.lastInsertRowid as number;

    if (this.auditLogger) {
      this.auditLogger.log({
        userId: input.createdBy?.toString() || 'system',
        eventType: 'deadline_dependency.create',
        resourceType: 'deadline_dependency',
        resourceId: id.toString(),
        action: 'create',
        details: {
          sourceDeadlineId: input.sourceDeadlineId,
          targetDeadlineId: input.targetDeadlineId,
          dependencyType: input.dependencyType,
        },
      });
    }

    return this.findDependencyById(id)!;
  }

  /**
   * Find dependency by ID
   */
  findDependencyById(id: number): DeadlineDependency | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        source_deadline_id as sourceDeadlineId,
        target_deadline_id as targetDeadlineId,
        dependency_type as dependencyType,
        lag_days as lagDays,
        created_at as createdAt,
        created_by as createdBy
      FROM deadline_dependencies
      WHERE id = ?
    `);

    const result = stmt.get(id) as DeadlineDependency | undefined;
    return result || null;
  }

  /**
   * Get all dependencies for a deadline (outgoing dependencies)
   */
  findDependenciesByDeadlineId(deadlineId: number): DeadlineDependency[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        source_deadline_id as sourceDeadlineId,
        target_deadline_id as targetDeadlineId,
        dependency_type as dependencyType,
        lag_days as lagDays,
        created_at as createdAt,
        created_by as createdBy
      FROM deadline_dependencies
      WHERE source_deadline_id = ?
    `);

    return stmt.all(deadlineId) as DeadlineDependency[];
  }

  /**
   * Get all dependents for a deadline (incoming dependencies)
   */
  findDependentsByDeadlineId(deadlineId: number): DeadlineDependency[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        source_deadline_id as sourceDeadlineId,
        target_deadline_id as targetDeadlineId,
        dependency_type as dependencyType,
        lag_days as lagDays,
        created_at as createdAt,
        created_by as createdBy
      FROM deadline_dependencies
      WHERE target_deadline_id = ?
    `);

    return stmt.all(deadlineId) as DeadlineDependency[];
  }

  /**
   * Get deadline with all its dependencies and dependents
   */
  findByIdWithDependencies(id: number): DeadlineWithDependencies | null {
    const deadline = this.findById(id);
    if (!deadline) {
      return null;
    }

    const dependencies = this.findDependenciesByDeadlineId(id);
    const dependents = this.findDependentsByDeadlineId(id);

    return {
      ...deadline,
      dependencies,
      dependents,
      dependenciesCount: dependencies.length,
      dependentsCount: dependents.length,
    };
  }

  /**
   * Get all deadlines for a user with dependencies (for Gantt chart)
   */
  findByUserIdWithDependencies(userId: number): DeadlineWithDependencies[] {
    const deadlines = this.findByUserId(userId);

    return deadlines.map((deadline) => {
      const dependencies = this.findDependenciesByDeadlineId(deadline.id);
      const dependents = this.findDependentsByDeadlineId(deadline.id);

      return {
        ...deadline,
        caseTitle: deadline.caseTitle,
        caseStatus: deadline.caseStatus,
        dependencies,
        dependents,
        dependenciesCount: dependencies.length,
        dependentsCount: dependents.length,
      };
    });
  }

  /**
   * Get all deadlines for a case with dependencies (for Gantt chart)
   */
  findByCaseIdWithDependencies(caseId: number, userId: number): DeadlineWithDependencies[] {
    const deadlines = this.findByCaseId(caseId, userId);

    return deadlines.map((deadline) => {
      const dependencies = this.findDependenciesByDeadlineId(deadline.id);
      const dependents = this.findDependentsByDeadlineId(deadline.id);

      return {
        ...deadline,
        dependencies,
        dependents,
        dependenciesCount: dependencies.length,
        dependentsCount: dependents.length,
      };
    });
  }

  /**
   * Update a dependency
   */
  updateDependency(
    id: number,
    input: UpdateDeadlineDependencyInput,
  ): DeadlineDependency | null {
    const current = this.findDependencyById(id);
    if (!current) {
      return null;
    }

    const updates: string[] = [];
    const params: Record<string, unknown> = { id };

    if (input.dependencyType !== undefined) {
      updates.push('dependency_type = @dependencyType');
      params.dependencyType = input.dependencyType;
    }
    if (input.lagDays !== undefined) {
      updates.push('lag_days = @lagDays');
      params.lagDays = input.lagDays;
    }

    if (updates.length === 0) {
      return current;
    }

    const stmt = this.db.prepare(`
      UPDATE deadline_dependencies
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    stmt.run(params);

    if (this.auditLogger) {
      this.auditLogger.log({
        userId: 'system',
        eventType: 'deadline_dependency.update',
        resourceType: 'deadline_dependency',
        resourceId: id.toString(),
        action: 'update',
        details: { fieldsUpdated: Object.keys(input) },
      });
    }

    return this.findDependencyById(id);
  }

  /**
   * Delete a dependency
   */
  deleteDependency(id: number): boolean {
    const current = this.findDependencyById(id);
    if (!current) {
      return false;
    }

    const stmt = this.db.prepare('DELETE FROM deadline_dependencies WHERE id = ?');
    const result = stmt.run(id);

    if (this.auditLogger && result.changes > 0) {
      this.auditLogger.log({
        userId: 'system',
        eventType: 'deadline_dependency.delete',
        resourceType: 'deadline_dependency',
        resourceId: id.toString(),
        action: 'delete',
        details: {
          sourceDeadlineId: current.sourceDeadlineId,
          targetDeadlineId: current.targetDeadlineId,
        },
      });
    }

    return result.changes > 0;
  }

  /**
   * Check for circular dependencies (prevents infinite loops in Gantt chart)
   * Returns true if adding this dependency would create a cycle
   */
  wouldCreateCircularDependency(
    sourceDeadlineId: number,
    targetDeadlineId: number,
  ): boolean {
    // Use a recursive CTE to check if there's already a path from target to source
    const stmt = this.db.prepare(`
      WITH RECURSIVE dependency_chain AS (
        -- Start from the target deadline
        SELECT target_deadline_id as deadline_id
        FROM deadline_dependencies
        WHERE source_deadline_id = ?

        UNION ALL

        -- Recursively follow dependencies
        SELECT dd.target_deadline_id
        FROM deadline_dependencies dd
        INNER JOIN dependency_chain dc ON dd.source_deadline_id = dc.deadline_id
      )
      SELECT COUNT(*) as count
      FROM dependency_chain
      WHERE deadline_id = ?
    `);

    const result = stmt.get(targetDeadlineId, sourceDeadlineId) as { count: number };
    return result.count > 0;
  }
}
