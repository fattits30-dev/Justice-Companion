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
    const foundNotification = this.findById(notificationId);
    if (!foundNotification) {
      throw new Error(`Failed to create notification with ID: ${notificationId}`);
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

    const row = stmt.get(id);
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
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapToNotification(row));
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
        is_read = COALESCE(?, is_read),
        is_dismissed = COALESCE(?, is_dismissed)
      WHERE id = ?
    `);

    stmt.run(
      input.type ?? null,
      input.severity ?? null,
      input.title ?? null,
      input.message ?? null,
      input.actionUrl ?? null,
      input.actionLabel ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.expiresAt?.toISOString() ?? null,
      input.isRead ?? null,
      input.isDismissed ?? null,
      id
    );

    return this.findById(id);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
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
   * Get notification statistics for a user
   */
  getStats(userId: number): NotificationStats {
    const unreadCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0
    `);
    
    const unreadCount = unreadCountStmt.get(userId).count as number;
    
    const unexpiredCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    
    const unexpiredCount = unexpiredCountStmt.get(userId).count as number;
    
    return {
      unread: unreadCount,
      unexpired: unexpiredCount
    };
  }

  /**
   * Map a database row to a Notification object
   */
  private mapToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      severity: row.severity,
      title: row.title,
      message: row.message,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
      isRead: !!row.is_read,
      isDismissed: !!row.is_dismissed,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null
    };
  }
}