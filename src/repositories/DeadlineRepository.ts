import type Database from 'better-sqlite3';
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
} from '../domains/timeline/entities/Deadline.ts';
import type {
  DeadlineDependency,
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
      description: input.description ?? null,
      deadlineDate: input.deadlineDate,
      priority: input.priority ?? 'medium',
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

    const createdDeadline = this.findById(id);
    if (!createdDeadline) {
      throw new Error(`Failed to retrieve created deadline with id ${id}`);
    }
    
    return createdDeadline;
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
      ORDER BY deadline_date ASC
    `);

    return stmt.all(caseId, userId) as Deadline[];
  }

  /**
   * Find all deadlines for a specific user (across all cases)
   */
  findByUserId(userId: number): Deadline[] {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, user_id as userId,
        title, description, deadline_date as deadlineDate,
        priority, status, completed_at as completedAt,
        created_at as createdAt, updated_at as updatedAt,
        deleted_at as deletedAt
      FROM deadlines
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY deadline_date ASC
    `);

    return stmt.all(userId) as Deadline[];
  }

  /**
   * Update a deadline
   */
  update(id: number, input: UpdateDeadlineInput): Deadline | null {
    const existingDeadline = this.findById(id);
    if (!existingDeadline) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET 
        title = COALESCE(@title, title),
        description = COALESCE(@description, description),
        deadline_date = COALESCE(@deadlineDate, deadline_date),
        priority = COALESCE(@priority, priority),
        status = COALESCE(@status, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id AND deleted_at IS NULL
    `);

    stmt.run({
      id,
      title: input.title ?? existingDeadline.title,
      description: input.description ?? existingDeadline.description,
      deadlineDate: input.deadlineDate ?? existingDeadline.deadlineDate,
      priority: input.priority ?? existingDeadline.priority,
      status: input.status ?? existingDeadline.status,
    });

    if (this.auditLogger) {
      this.auditLogger.log({
        userId: existingDeadline.userId.toString(),
        eventType: 'timeline_event.update',
        resourceType: 'deadline',
        resourceId: id.toString(),
        action: 'update',
        details: { title: input.title || existingDeadline.title },
      });
    }

    return this.findById(id);
  }

  /**
   * Delete a deadline (soft delete)
   */
  delete(id: number, userId: number): boolean {
    const existingDeadline = this.findById(id);
    if (!existingDeadline) {
      return false;
    }

    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(id, userId);

    if (result.changes > 0 && this.auditLogger) {
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: 'timeline_event.delete',
        resourceType: 'deadline',
        resourceId: id.toString(),
        action: 'delete',
        details: { title: existingDeadline.title },
      });
    }

    return result.changes > 0;
  }

  /**
   * Mark deadline as completed
   */
  complete(id: number, userId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE deadlines
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(id, userId);

    if (result.changes > 0 && this.auditLogger) {
      const deadline = this.findById(id);
      if (deadline) {
        this.auditLogger.log({
          userId: userId.toString(),
          eventType: 'timeline_event.complete',
          resourceType: 'deadline',
          resourceId: id.toString(),
          action: 'complete',
          details: { title: deadline.title },
        });
      }
    }

    return result.changes > 0;
  }

  /**
   * Get deadlines with dependencies
   */
  findWithDependencies(id: number): DeadlineWithDependencies | null {
    const deadline = this.findById(id);
    if (!deadline) {
      return null;
    }

    // Get outgoing dependencies (this deadline depends on...)
    const dependenciesStmt = this.db.prepare(`
      SELECT
        id, deadline_id as deadlineId, dependent_deadline_id as dependentDeadlineId,
        dependency_type as dependencyType, created_at as createdAt
      FROM deadline_dependencies
      WHERE deadline_id = ? AND deleted_at IS NULL
    `);
    const dependencies = dependenciesStmt.all(id) as DeadlineDependency[];

    // Get incoming dependencies (other deadlines depend on this)
    const dependentsStmt = this.db.prepare(`
      SELECT
        id, deadline_id as deadlineId, dependent_deadline_id as dependentDeadlineId,
        dependency_type as dependencyType, created_at as createdAt
      FROM deadline_dependencies
      WHERE dependent_deadline_id = ? AND deleted_at IS NULL
    `);
    const dependents = dependentsStmt.all(id) as DeadlineDependency[];

    return {
      ...deadline,
      dependencies,
      dependents,
      dependenciesCount: dependencies.length,
      dependentsCount: dependents.length,
    };
  }
}