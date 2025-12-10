import { Database } from "better-sqlite3";
import type {
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationFilters,
  NotificationStats,
  NotificationType,
  NotificationSeverity,
} from "../lib/types/api.ts";

type NotificationRow = {
  id: number;
  user_id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata_json?: string | null;
  is_read: number;
  is_dismissed: number;
  created_at?: string | Date | null;
  read_at?: string | Date | null;
  expires_at?: string | Date | null;
};

/**
 * NotificationRepository
 *
 * Handles database operations for notifications
 */
export class NotificationRepository {
  constructor(private readonly db: Database) {}

  /**
   * Create a new notification
   */
  create(input: CreateNotificationInput): Notification {
    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, severity, title, message,
        action_url, action_label, metadata_json, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.userId,
      input.type,
      input.severity,
      input.title,
      input.message,
      input.actionUrl || null,
      input.actionLabel || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.expiresAt?.toISOString() || null,
    );

    const notificationId = result.lastInsertRowid as number;
    const foundNotification = this.findById(notificationId);
    if (!foundNotification) {
      throw new Error(
        `Failed to create notification with ID: ${notificationId}`,
      );
    }
    return foundNotification;
  }

  /**
   * Find a notification by ID
   */
  findById(id: number): Notification | null {
    const stmt = this.db.prepare(`
      SELECT * FROM notifications WHERE id = ?
    `);

    const row = stmt.get(id) as NotificationRow | undefined;
    return row ? this.mapToNotification(row) : null;
  }

  /**
   * Find all notifications for a user with optional filters
   */
  findByUser(userId: number, filters?: NotificationFilters): Notification[] {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = ?
    `;
    const params: unknown[] = [userId];

    // Apply filters
    if (!filters?.includeDismissed) {
      query += " AND is_dismissed = 0";
    }

    if (!filters?.includeExpired) {
      query += " AND (expires_at IS NULL OR expires_at > datetime('now'))";
    }

    if (filters?.unreadOnly) {
      query += " AND is_read = 0";
    }

    if (filters?.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    if (filters?.severity) {
      query += " AND severity = ?";
      params.push(filters.severity);
    }

    query += " ORDER BY created_at DESC";

    if (filters?.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);

      if (filters?.offset) {
        query += " OFFSET ?";
        params.push(filters.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as NotificationRow[];

    return rows.map((row) => this.mapToNotification(row));
  }

  /**
   * Update a notification
   */
  update(id: number, input: UpdateNotificationInput): Notification | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE notifications
      SET
        type = COALESCE(?, type),
        severity = COALESCE(?, severity),
        title = COALESCE(?, title),
        message = COALESCE(?, message),
        action_url = COALESCE(?, action_url),
        action_label = COALESCE(?, action_label),
        metadata_json = COALESCE(?, metadata_json),
        expires_at = COALESCE(?, expires_at),
        read_at = COALESCE(?, read_at),
        is_read = COALESCE(?, is_read),
        is_dismissed = COALESCE(?, is_dismissed)
      WHERE id = ?
    `);

    stmt.run(
      input.title ?? null,
      input.message ?? null,
      input.actionUrl ?? null,
      input.actionLabel ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      this.normalizeDateInput(input.expiresAt),
      input.isRead ?? null,
      input.isDismissed ?? null,
      id,
    );

    return this.findById(id);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: number): number {
    const stmt = this.db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE user_id = ? AND is_read = 0
    `);

    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Mark a notification as dismissed
   */
  dismiss(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications SET is_dismissed = 1 WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get count of unread notifications for a user
   */
  getUnreadCount(userId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0
    `);

    const row = stmt.get(userId) as { count: number };
    return row.count;
  }

  /**
   * Delete expired notifications
   */
  deleteExpired(): number {
    const stmt = this.db.prepare(`
      DELETE FROM notifications
      WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get notification statistics for a user
   */
  getStats(userId: number): NotificationStats {
    const totalStmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`,
    );
    const totalRow = totalStmt.get(userId) as { count: number } | undefined;
    const total = totalRow?.count ?? 0;

    const unread = this.getUnreadCount(userId);

    const severityCountsStmt = this.db.prepare(
      `SELECT severity, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY severity`,
    );
    const severityCounts: Record<NotificationSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const row of severityCountsStmt.all(userId) as Array<{
      severity: string;
      count: number;
    }>) {
      const severity = row.severity as NotificationSeverity;
      if (severity in severityCounts) {
        severityCounts[severity] = row.count;
      }
    }

    const typeCountsStmt = this.db.prepare(
      `SELECT type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY type`,
    );
    const typeCounts: Record<NotificationType, number> = {
      deadline_reminder: 0,
      case_status_change: 0,
      evidence_uploaded: 0,
      document_updated: 0,
      system_alert: 0,
      system_warning: 0,
      system_info: 0,
    };
    for (const row of typeCountsStmt.all(userId) as Array<{
      type: string;
      count: number;
    }>) {
      const type = row.type as NotificationType;
      if (type in typeCounts) {
        typeCounts[type] = row.count;
      }
    }

    return {
      total,
      unread,
      urgent: severityCounts.urgent,
      high: severityCounts.high,
      medium: severityCounts.medium,
      low: severityCounts.low,
      byType: typeCounts,
    };
  }

  /**
   * Map a database row to a Notification object
   */
  private mapToNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      severity: row.severity as NotificationSeverity,
      title: row.title,
      message: row.message,
      actionUrl: row.action_url ?? undefined,
      actionLabel: row.action_label ?? undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      isRead: row.is_read === 1,
      isDismissed: row.is_dismissed === 1,
      createdAt: this.toIsoString(row.created_at) ?? new Date().toISOString(),
      readAt: this.toIsoString(row.read_at),
      expiresAt: this.toIsoString(row.expires_at),
    };
  }

  private normalizeDateInput(
    value: Date | string | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "string") {
      return value;
    }

    return null;
  }

  private toIsoString(
    value: string | Date | null | undefined,
  ): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return undefined;
    }

    return dateValue.toISOString();
  }
}
