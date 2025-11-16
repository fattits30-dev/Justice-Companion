// src/services/backup/BackupScheduler.ts
import type Database from "better-sqlite3";
import { createBackup } from "../../db/backup.ts";
import { BackupRetentionPolicy } from "./BackupRetentionPolicy.ts";
import { errorLogger } from "../../utils/error-logger.ts";

/**
 * Backup Settings Interface
 */
export interface BackupSettings {
  id: number;
  user_id: number;
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  backup_time: string; // HH:mm format
  keep_count: number;
  last_backup_at: string | null;
  next_backup_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Backup Scheduler Service
 * Manages automatic database backups on a schedule
 *
 * Features:
 * - Singleton pattern to prevent multiple schedulers
 * - Checks every minute for due backups
 * - Runs missed backups on startup
 * - Applies retention policy after each backup
 */
export class BackupScheduler {
  private static instance: BackupScheduler | null = null;
  private db: Database.Database;
  private retentionPolicy: BackupRetentionPolicy;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute

  private constructor(db: Database.Database) {
    this.db = db;
    this.retentionPolicy = new BackupRetentionPolicy();
  }

  /**
   * Get singleton instance of BackupScheduler
   */
  static getInstance(db: Database.Database): BackupScheduler {
    if (!BackupScheduler.instance) {
      BackupScheduler.instance = new BackupScheduler(db);
    }
    return BackupScheduler.instance;
  }

  /**
   * Start the backup scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      errorLogger.logError("Backup scheduler already running", {
        type: "warning",
      });
      return;
    }

    try {
      errorLogger.logError("Starting backup scheduler...", { type: "info" });

      // Run any missed backups on startup
      await this.checkAndRunBackups();

      // Set up interval to check every minute
      this.intervalId = setInterval(async () => {
        await this.checkAndRunBackups();
      }, this.CHECK_INTERVAL_MS);

      this.isRunning = true;
      errorLogger.logError("Backup scheduler started successfully", {
        type: "info",
      });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "backup-scheduler-start",
      });
      throw error;
    }
  }

  /**
   * Stop the backup scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isRunning = false;
      errorLogger.logError("Backup scheduler stopped", { type: "info" });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "backup-scheduler-stop",
      });
    }
  }

  /**
   * Check for due backups and run them
   */
  private async checkAndRunBackups(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Get all enabled backup settings where next_backup_at <= NOW
      const dueBackups = this.db
        .prepare<unknown[], BackupSettings>(
          `SELECT * FROM backup_settings
           WHERE enabled = 1
           AND (next_backup_at IS NULL OR next_backup_at <= ?)
           ORDER BY next_backup_at ASC`,
        )
        .all(now);

      if (dueBackups.length === 0) {
        return;
      }

      errorLogger.logError(
        `Found ${dueBackups.length} backup(s) due for execution`,
        { type: "info" },
      );

      // Run each due backup
      for (const settings of dueBackups) {
        await this.runScheduledBackup(settings);
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "check-and-run-backups",
      });
    }
  }

  /**
   * Run a scheduled backup for a user
   */
  private async runScheduledBackup(settings: BackupSettings): Promise<void> {
    try {
      errorLogger.logError(
        `Running scheduled backup for user ${settings.user_id} (frequency: ${settings.frequency})`,
        { type: "info" },
      );

      // Create backup with auto-backup prefix
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `auto_backup_user${settings.user_id}_${timestamp}`;
      const backup = createBackup(filename);

      errorLogger.logError(
        `Auto-backup created: ${backup.filename} (${backup.size} bytes)`,
        { type: "info" },
      );

      // Apply retention policy
      const deletedCount = await this.retentionPolicy.applyRetentionPolicy(
        settings.keep_count,
      );
      if (deletedCount > 0) {
        errorLogger.logError(
          `Retention policy deleted ${deletedCount} old backup(s)`,
          { type: "info" },
        );
      }

      // Update last_backup_at and calculate next_backup_at
      const lastBackupAt = new Date().toISOString();
      const nextBackupAt = this.calculateNextBackupTime(
        settings.frequency,
        settings.backup_time,
      );

      this.db
        .prepare(
          `UPDATE backup_settings
           SET last_backup_at = ?, next_backup_at = ?
           WHERE id = ?`,
        )
        .run(lastBackupAt, nextBackupAt.toISOString(), settings.id);

      errorLogger.logError(
        `Next backup for user ${settings.user_id} scheduled for ${nextBackupAt.toLocaleString()}`,
        { type: "info" },
      );
    } catch (error) {
      errorLogger.logError(
        new Error(
          `Failed to run scheduled backup for user ${settings.user_id}: ${(error as Error).message}`,
        ),
        { context: "run-scheduled-backup" },
      );
    }
  }

  /**
   * Calculate next backup time based on frequency and time
   */
  private calculateNextBackupTime(frequency: string, backupTime: string): Date {
    const now = new Date();
    const [hours, minutes] = backupTime.split(":").map(Number);

    // Start with today at the configured time
    const nextBackup = new Date();
    nextBackup.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, add the interval
    if (nextBackup <= now) {
      switch (frequency) {
        case "daily":
          nextBackup.setDate(nextBackup.getDate() + 1);
          break;
        case "weekly":
          nextBackup.setDate(nextBackup.getDate() + 7);
          break;
        case "monthly":
          nextBackup.setMonth(nextBackup.getMonth() + 1);
          break;
      }
    }

    return nextBackup;
  }

  /**
   * Get backup settings for a user
   */
  getBackupSettings(userId: number): BackupSettings | null {
    try {
      const settings = this.db
        .prepare<
          [number],
          BackupSettings
        >("SELECT * FROM backup_settings WHERE user_id = ?")
        .get(userId);

      return settings || null;
    } catch (error) {
      errorLogger.logError(error as Error, { context: "get-backup-settings" });
      return null;
    }
  }

  /**
   * Update or create backup settings for a user
   */
  updateBackupSettings(
    userId: number,
    settings: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
      backup_time: string;
      keep_count: number;
    },
  ): BackupSettings {
    try {
      // Check if settings exist
      const existing = this.getBackupSettings(userId);

      const now = new Date().toISOString();
      const nextBackupAt = settings.enabled
        ? this.calculateNextBackupTime(
            settings.frequency,
            settings.backup_time,
          ).toISOString()
        : null;

      if (existing) {
        // Update existing settings
        this.db
          .prepare(
            `UPDATE backup_settings
             SET enabled = ?, frequency = ?, backup_time = ?, keep_count = ?,
                 next_backup_at = ?, updated_at = ?
             WHERE user_id = ?`,
          )
          .run(
            settings.enabled ? 1 : 0,
            settings.frequency,
            settings.backup_time,
            settings.keep_count,
            nextBackupAt,
            now,
            userId,
          );

        errorLogger.logError(`Updated backup settings for user ${userId}`, {
          type: "info",
        });
      } else {
        // Insert new settings
        this.db
          .prepare(
            `INSERT INTO backup_settings (user_id, enabled, frequency, backup_time, keep_count, next_backup_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            userId,
            settings.enabled ? 1 : 0,
            settings.frequency,
            settings.backup_time,
            settings.keep_count,
            nextBackupAt,
            now,
            now,
          );

        errorLogger.logError(`Created backup settings for user ${userId}`, {
          type: "info",
        });
      }

      // Return updated settings
      return this.getBackupSettings(userId)!;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "update-backup-settings",
      });
      throw error;
    }
  }
}
