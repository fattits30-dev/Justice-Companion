import { Database } from "better-sqlite3";
import type {
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationFilters,
  NotificationStats,
  NotificationType,
} from "../models/Notification.ts";

/**
 * NotificationRepository
 *
 * Handles database operations for notifications
 */
export class NotificationRepository {
  constructor(private db: Database) {}

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
      input.expiresAt?.toISOString() || null
    );

    const notificationId = result.lastInsertRowid as number;
    return this.findById(notificationId)!;
  }

  /**
   * Find a notification by ID
   */
  findById(id: number): Notification | null {
    const stmt = this.db.prepare(`
      SELECT * FROM notifications WHERE id = ?
    `);

    const row = stmt.get(id) as any;
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
    const params: any[] = [userId];

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
    const rows = stmt.all(...params) as any[];

    return rows.map(this.mapToNotification);
  }

  /**
   * Update a notification
   */
  update(id: number, input: UpdateNotificationInput): void {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.isRead !== undefined) {
      updates.push("is_read = ?");
      params.push(input.isRead ? 1 : 0);

      if (input.isRead) {
        updates.push("read_at = datetime('now')");
      }
    }

    if (input.isDismissed !== undefined) {
      updates.push("is_dismissed = ?");
      params.push(input.isDismissed ? 1 : 0);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE notifications
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: number): void {
    this.update(id, { isRead: true });
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
   * Dismiss a notification
   */
  dismiss(id: number): void {
    this.update(id, { isDismissed: true });
  }

  /**
   * Get unread notification count for a user
   */
  getUnreadCount(userId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ?
        AND is_read = 0
        AND is_dismissed = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);

    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  /**
   * Get notification statistics for a user
   */
  getStats(userId: number): NotificationStats {
    // Get total and unread count
    const countStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM notifications
      WHERE user_id = ?
        AND is_dismissed = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);

    const counts = countStmt.get(userId) as { total: number; unread: number };

    // Get severity counts
    const severityStmt = this.db.prepare(`
      SELECT
        severity,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ?
        AND is_dismissed = 0
        AND is_read = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      GROUP BY severity
    `);

    const severityCounts = severityStmt.all(userId) as Array<{
      severity: string;
      count: number;
    }>;

    const severityMap = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    severityCounts.forEach(row => {
      severityMap[row.severity as keyof typeof severityMap] = row.count;
    });

    // Get type counts
    const typeStmt = this.db.prepare(`
      SELECT
        type,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ?
        AND is_dismissed = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      GROUP BY type
    `);

    const typeCounts = typeStmt.all(userId) as Array<{
      type: NotificationType;
      count: number;
    }>;

    const byType: Record<NotificationType, number> = {} as any;
    typeCounts.forEach(row => {
      byType[row.type] = row.count;
    });

    return {
      total: counts.total || 0,
      unread: counts.unread || 0,
      urgent: severityMap.urgent,
      high: severityMap.high,
      medium: severityMap.medium,
      low: severityMap.low,
      byType,
    };
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
   * Delete all notifications for a user
   */
  deleteByUser(userId: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM notifications WHERE user_id = ?
    `);

    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Get notifications that need to be delivered
   * (for future real-time delivery implementation)
   */
  getPendingDelivery(): Notification[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE is_read = 0
        AND is_dismissed = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND created_at > datetime('now', '-1 minute')
      ORDER BY severity DESC, created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(this.mapToNotification);
  }

  // Helper method to map database row to Notification object
  private mapToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      severity: row.severity,
      title: row.title,
      message: row.message,
      actionUrl: row.action_url || undefined,
      actionLabel: row.action_label || undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      isRead: Boolean(row.is_read),
      isDismissed: Boolean(row.is_dismissed),
      createdAt: row.created_at,
      readAt: row.read_at || undefined,
      expiresAt: row.expires_at || undefined,
    };
  }
}