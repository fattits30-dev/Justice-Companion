import { Database } from "better-sqlite3";
import type {
  NotificationPreferences,
  CreateNotificationPreferencesInput,
  UpdateNotificationPreferencesInput,
} from "../models/NotificationPreferences.ts";

/**
 * NotificationPreferencesRepository
 *
 * Handles database operations for notification preferences
 */
export class NotificationPreferencesRepository {
  constructor(private db: Database) {}

  /**
   * Create notification preferences for a user
   */
  create(input: CreateNotificationPreferencesInput): NotificationPreferences {
    const stmt = this.db.prepare(`
      INSERT INTO notification_preferences (
        user_id,
        deadline_reminders_enabled,
        deadline_reminder_days,
        case_updates_enabled,
        evidence_updates_enabled,
        system_alerts_enabled,
        sound_enabled,
        desktop_notifications_enabled,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.userId,
      input.deadlineRemindersEnabled !== false ? 1 : 0,
      input.deadlineReminderDays || 7,
      input.caseUpdatesEnabled !== false ? 1 : 0,
      input.evidenceUpdatesEnabled !== false ? 1 : 0,
      input.systemAlertsEnabled !== false ? 1 : 0,
      input.soundEnabled !== false ? 1 : 0,
      input.desktopNotificationsEnabled !== false ? 1 : 0,
      input.quietHoursEnabled ? 1 : 0,
      input.quietHoursStart || "22:00",
      input.quietHoursEnd || "08:00"
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Create default preferences for a user
   */
  createDefaults(userId: number): NotificationPreferences {
    return this.create({ userId });
  }

  /**
   * Find preferences by ID
   */
  findById(id: number): NotificationPreferences | null {
    const stmt = this.db.prepare(`
      SELECT * FROM notification_preferences WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapToPreferences(row) : null;
  }

  /**
   * Find preferences by user ID
   */
  findByUser(userId: number): NotificationPreferences | null {
    const stmt = this.db.prepare(`
      SELECT * FROM notification_preferences WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;
    return row ? this.mapToPreferences(row) : null;
  }

  /**
   * Update notification preferences
   */
  update(
    userId: number,
    input: UpdateNotificationPreferencesInput
  ): NotificationPreferences {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.deadlineRemindersEnabled !== undefined) {
      updates.push("deadline_reminders_enabled = ?");
      params.push(input.deadlineRemindersEnabled ? 1 : 0);
    }

    if (input.deadlineReminderDays !== undefined) {
      updates.push("deadline_reminder_days = ?");
      params.push(input.deadlineReminderDays);
    }

    if (input.caseUpdatesEnabled !== undefined) {
      updates.push("case_updates_enabled = ?");
      params.push(input.caseUpdatesEnabled ? 1 : 0);
    }

    if (input.evidenceUpdatesEnabled !== undefined) {
      updates.push("evidence_updates_enabled = ?");
      params.push(input.evidenceUpdatesEnabled ? 1 : 0);
    }

    if (input.systemAlertsEnabled !== undefined) {
      updates.push("system_alerts_enabled = ?");
      params.push(input.systemAlertsEnabled ? 1 : 0);
    }

    if (input.soundEnabled !== undefined) {
      updates.push("sound_enabled = ?");
      params.push(input.soundEnabled ? 1 : 0);
    }

    if (input.desktopNotificationsEnabled !== undefined) {
      updates.push("desktop_notifications_enabled = ?");
      params.push(input.desktopNotificationsEnabled ? 1 : 0);
    }

    if (input.quietHoursEnabled !== undefined) {
      updates.push("quiet_hours_enabled = ?");
      params.push(input.quietHoursEnabled ? 1 : 0);
    }

    if (input.quietHoursStart !== undefined) {
      updates.push("quiet_hours_start = ?");
      params.push(input.quietHoursStart);
    }

    if (input.quietHoursEnd !== undefined) {
      updates.push("quiet_hours_end = ?");
      params.push(input.quietHoursEnd);
    }

    if (updates.length === 0) {
      return this.findByUser(userId)!;
    }

    // Add updated_at
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(userId);

    const stmt = this.db.prepare(`
      UPDATE notification_preferences
      SET ${updates.join(", ")}
      WHERE user_id = ?
    `);

    stmt.run(...params);

    return this.findByUser(userId)!;
  }

  /**
   * Delete preferences for a user
   */
  deleteByUser(userId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM notification_preferences WHERE user_id = ?
    `);

    const result = stmt.run(userId);
    return result.changes > 0;
  }

  /**
   * Reset preferences to defaults
   */
  resetToDefaults(userId: number): NotificationPreferences {
    return this.update(userId, {
      deadlineRemindersEnabled: true,
      deadlineReminderDays: 7,
      caseUpdatesEnabled: true,
      evidenceUpdatesEnabled: true,
      systemAlertsEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    });
  }

  /**
   * Get all users with deadline reminders enabled
   * (for scheduler to check)
   */
  getUsersWithDeadlineReminders(): Array<{ userId: number; reminderDays: number }> {
    const stmt = this.db.prepare(`
      SELECT user_id, deadline_reminder_days
      FROM notification_preferences
      WHERE deadline_reminders_enabled = 1
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => ({
      userId: row.user_id,
      reminderDays: row.deadline_reminder_days,
    }));
  }

  /**
   * Check if user has any notifications enabled
   */
  hasAnyNotificationsEnabled(userId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT
        deadline_reminders_enabled,
        case_updates_enabled,
        evidence_updates_enabled,
        system_alerts_enabled
      FROM notification_preferences
      WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;
    if (!row) return true; // Default to enabled if no preferences exist

    return (
      row.deadline_reminders_enabled === 1 ||
      row.case_updates_enabled === 1 ||
      row.evidence_updates_enabled === 1 ||
      row.system_alerts_enabled === 1
    );
  }

  // Helper method to map database row to NotificationPreferences object
  private mapToPreferences(row: any): NotificationPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      deadlineRemindersEnabled: Boolean(row.deadline_reminders_enabled),
      deadlineReminderDays: row.deadline_reminder_days,
      caseUpdatesEnabled: Boolean(row.case_updates_enabled),
      evidenceUpdatesEnabled: Boolean(row.evidence_updates_enabled),
      systemAlertsEnabled: Boolean(row.system_alerts_enabled),
      soundEnabled: Boolean(row.sound_enabled),
      desktopNotificationsEnabled: Boolean(row.desktop_notifications_enabled),
      quietHoursEnabled: Boolean(row.quiet_hours_enabled),
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}