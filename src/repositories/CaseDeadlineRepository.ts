import { getDb } from '../db/database.ts';
import type { AuditLogger } from '../services/AuditLogger.ts';
import type {
  Deadline,
  CreateDeadlineInput,
  UpdateDeadlineInput,
  ACASConciliation,
  CreateACASTrackingInput,
  UpdateACASTrackingInput,
  DeadlineWarningShown,
  ACASStatus,
  WarningLevel,
} from '../types/deadline.ts';

/**
 * CaseDeadlineRepository - Data Access Layer for Employment Tribunal Deadline Tracking
 *
 * Handles database operations for:
 * - Case deadlines (tribunal filing, ACAS conciliation, appeals)
 * - ACAS early conciliation tracking
 * - Deadline warning audit trail
 *
 * CRITICAL: UK Employment Tribunal deadline is 3 months minus 1 day from dismissal.
 * Missing this deadline means the user loses all legal rights to challenge unfair dismissal.
 *
 * This repository works with the "case_deadlines" table (migration 025),
 * which is separate from the generic "deadlines" table.
 */
export class CaseDeadlineRepository {
  private auditLogger?: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  // ============================================================================
  // CASE DEADLINES (case_deadlines table)
  // ============================================================================

  /**
   * Create a new deadline for a case
   */
  create(input: CreateDeadlineInput): Deadline {
    try {
      const db = getDb();

      const stmt = db.prepare(`
        INSERT INTO case_deadlines (
          case_id,
          deadline_type,
          deadline_date,
          description,
          is_mandatory
        )
        VALUES (@caseId, @deadlineType, @deadlineDate, @description, @isMandatory)
      `);

      const result = stmt.run({
        caseId: input.caseId,
        deadlineType: input.deadlineType,
        deadlineDate: input.deadlineDate,
        description: input.description,
        isMandatory: input.isMandatory ?? 0,
      });

      const createdDeadline = this.findById(result.lastInsertRowid as number)!;

      // Audit: Deadline created
      this.auditLogger?.log({
        eventType: 'case_deadline.create',
        resourceType: 'case_deadline',
        resourceId: createdDeadline.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          deadlineType: input.deadlineType,
          deadlineDate: input.deadlineDate,
          isMandatory: input.isMandatory,
        },
        success: true,
      });

      return createdDeadline;
    } catch (error) {
      // Audit: Failed deadline creation
      this.auditLogger?.log({
        eventType: 'case_deadline.create',
        resourceType: 'case_deadline',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find deadline by ID
   */
  findById(id: number): Deadline | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        deadline_type as deadlineType,
        deadline_date as deadlineDate,
        description,
        is_mandatory as isMandatory,
        was_dismissed_by_user as wasDismissedByUser,
        dismissed_at as dismissedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_deadlines
      WHERE id = ?
    `);

    const row = stmt.get(id) as Deadline | null;

    return row ? this.mapRowToDeadline(row) : null;
  }

  /**
   * Find all deadlines for a specific case
   */
  findByCaseId(caseId: number): Deadline[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        deadline_type as deadlineType,
        deadline_date as deadlineDate,
        description,
        is_mandatory as isMandatory,
        was_dismissed_by_user as wasDismissedByUser,
        dismissed_at as dismissedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_deadlines
      WHERE case_id = ?
      ORDER BY deadline_date ASC
    `);

    const rows = stmt.all(caseId) as Deadline[];

    return rows.map(row => this.mapRowToDeadline(row));
  }

  /**
   * Find all active (not dismissed) deadlines for a case
   */
  findActiveByCaseId(caseId: number): Deadline[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        deadline_type as deadlineType,
        deadline_date as deadlineDate,
        description,
        is_mandatory as isMandatory,
        was_dismissed_by_user as wasDismissedByUser,
        dismissed_at as dismissedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_deadlines
      WHERE case_id = ?
        AND was_dismissed_by_user = 0
      ORDER BY deadline_date ASC
    `);

    const rows = stmt.all(caseId) as Deadline[];

    return rows.map(row => this.mapRowToDeadline(row));
  }

  /**
   * Find all mandatory deadlines across all cases
   * (Critical for dashboard warning display)
   */
  findAllMandatory(): Deadline[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        deadline_type as deadlineType,
        deadline_date as deadlineDate,
        description,
        is_mandatory as isMandatory,
        was_dismissed_by_user as wasDismissedByUser,
        dismissed_at as dismissedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM case_deadlines
      WHERE is_mandatory = 1
        AND was_dismissed_by_user = 0
      ORDER BY deadline_date ASC
    `);

    const rows = stmt.all() as Deadline[];

    return rows.map(row => this.mapRowToDeadline(row));
  }

  /**
   * Update a deadline
   */
  update(id: number, input: UpdateDeadlineInput): Deadline | null {
    try {
      const db = getDb();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.deadlineDate !== undefined) {
        updates.push('deadline_date = @deadlineDate');
        params.deadlineDate = input.deadlineDate;
      }
      if (input.description !== undefined) {
        updates.push('description = @description');
        params.description = input.description;
      }
      if (input.wasDismissedByUser !== undefined) {
        updates.push('was_dismissed_by_user = @wasDismissedByUser');
        params.wasDismissedByUser = input.wasDismissedByUser ? 1 : 0;

        if (input.wasDismissedByUser) {
          updates.push('dismissed_at = @dismissedAt');
          params.dismissedAt = new Date().toISOString();
        }
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      // Always update updated_at timestamp
      updates.push('updated_at = datetime(\'now\')');

      const stmt = db.prepare(`
        UPDATE case_deadlines
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedDeadline = this.findById(id);

      // Audit: Deadline updated
      this.auditLogger?.log({
        eventType: 'case_deadline.update',
        resourceType: 'case_deadline',
        resourceId: id.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedDeadline;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'case_deadline.update',
        resourceType: 'case_deadline',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete a deadline
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM case_deadlines WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: Deadline deleted
      this.auditLogger?.log({
        eventType: 'case_deadline.delete',
        resourceType: 'case_deadline',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'case_deadline.delete',
        resourceType: 'case_deadline',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // ACAS CONCILIATION TRACKING (acas_conciliation_tracking table)
  // ============================================================================

  /**
   * Create ACAS conciliation tracking for a case
   */
  createACASTracking(input: CreateACASTrackingInput): ACASConciliation {
    try {
      const db = getDb();

      const stmt = db.prepare(`
        INSERT INTO acas_conciliation_tracking (
          case_id,
          dismissal_date,
          status,
          notes
        )
        VALUES (@caseId, @dismissalDate, 'not_started', @notes)
      `);

      stmt.run({
        caseId: input.caseId,
        dismissalDate: input.dismissalDate,
        notes: input.notes ?? null,
      });

      const created = this.findACASByCaseId(input.caseId)!;

      // Audit: ACAS tracking created
      this.auditLogger?.log({
        eventType: 'acas_tracking.create',
        resourceType: 'acas_tracking',
        resourceId: created.id.toString(),
        action: 'create',
        details: {
          caseId: input.caseId,
          dismissalDate: input.dismissalDate,
        },
        success: true,
      });

      return created;
    } catch (error) {
      // Audit: Failed ACAS tracking creation
      this.auditLogger?.log({
        eventType: 'acas_tracking.create',
        resourceType: 'acas_tracking',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find ACAS tracking by case ID
   */
  findACASByCaseId(caseId: number): ACASConciliation | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        case_id as caseId,
        dismissal_date as dismissalDate,
        acas_notification_date as acasNotificationDate,
        acas_certificate_date as acasCertificateDate,
        acas_certificate_number as acasCertificateNumber,
        status,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM acas_conciliation_tracking
      WHERE case_id = ?
    `);

    const row = stmt.get(caseId) as ACASConciliation | null;

    return row ? this.mapRowToACAS(row) : null;
  }

  /**
   * Update ACAS tracking
   */
  updateACASTracking(caseId: number, input: UpdateACASTrackingInput): ACASConciliation | null {
    try {
      const db = getDb();

      const updates: string[] = [];
      const params: Record<string, unknown> = { caseId };

      if (input.acasNotificationDate !== undefined) {
        updates.push('acas_notification_date = @acasNotificationDate');
        params.acasNotificationDate = input.acasNotificationDate;
      }
      if (input.acasCertificateDate !== undefined) {
        updates.push('acas_certificate_date = @acasCertificateDate');
        params.acasCertificateDate = input.acasCertificateDate;
      }
      if (input.acasCertificateNumber !== undefined) {
        updates.push('acas_certificate_number = @acasCertificateNumber');
        params.acasCertificateNumber = input.acasCertificateNumber;
      }
      if (input.status !== undefined) {
        updates.push('status = @status');
        params.status = input.status;
      }
      if (input.notes !== undefined) {
        updates.push('notes = @notes');
        params.notes = input.notes;
      }

      if (updates.length === 0) {
        return this.findACASByCaseId(caseId);
      }

      // Always update updated_at timestamp
      updates.push('updated_at = datetime(\'now\')');

      const stmt = db.prepare(`
        UPDATE acas_conciliation_tracking
        SET ${updates.join(', ')}
        WHERE case_id = @caseId
      `);

      stmt.run(params);

      const updated = this.findACASByCaseId(caseId);

      // Audit: ACAS tracking updated
      this.auditLogger?.log({
        eventType: 'acas_tracking.update',
        resourceType: 'acas_tracking',
        resourceId: caseId.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updated;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'acas_tracking.update',
        resourceType: 'acas_tracking',
        resourceId: caseId.toString(),
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // DEADLINE WARNING AUDIT TRAIL (deadline_warnings_shown table)
  // ============================================================================

  /**
   * Record that a warning was shown to the user
   * (Prevents showing the same warning repeatedly within 24 hours)
   */
  recordWarningShown(deadlineId: number, warningLevel: WarningLevel): DeadlineWarningShown {
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO deadline_warnings_shown (deadline_id, warning_level)
      VALUES (@deadlineId, @warningLevel)
    `);

    const result = stmt.run({
      deadlineId,
      warningLevel,
    });

    return {
      id: result.lastInsertRowid as number,
      deadlineId,
      warningLevel,
      shownAt: new Date().toISOString(),
    };
  }

  /**
   * Get the most recent warning shown for a deadline
   */
  getLastWarningShown(deadlineId: number): DeadlineWarningShown | null {
    const db = getDb();

    const stmt = db.prepare(`
      SELECT
        id,
        deadline_id as deadlineId,
        warning_level as warningLevel,
        shown_at as shownAt
      FROM deadline_warnings_shown
      WHERE deadline_id = ?
      ORDER BY shown_at DESC
      LIMIT 1
    `);

    const row = stmt.get(deadlineId) as DeadlineWarningShown | null;

    return row;
  }

  /**
   * Check if a warning has been shown recently (within last 24 hours by default)
   * (Prevents annoying users with repeated warnings)
   */
  wasWarningShownRecently(deadlineId: number, warningLevel: WarningLevel, hoursAgo: number = 24): boolean {
    const db = getDb();

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM deadline_warnings_shown
      WHERE deadline_id = ?
        AND warning_level = ?
        AND shown_at >= ?
    `);

    const result = stmt.get(deadlineId, warningLevel, cutoffTime.toISOString()) as { count: number };

    return result.count > 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map database row to Deadline entity (convert SQLite integers to booleans)
   */
  private mapRowToDeadline(row: any): Deadline {
    return {
      ...row,
      isMandatory: Boolean(row.isMandatory),
      wasDismissedByUser: Boolean(row.wasDismissedByUser),
    };
  }

  /**
   * Map database row to ACASConciliation entity
   */
  private mapRowToACAS(row: any): ACASConciliation {
    return {
      ...row,
      status: row.status as ACASStatus,
    };
  }
}
