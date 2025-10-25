import { logger } from "../utils/logger.ts";
import { NotificationRepository } from "../repositories/NotificationRepository.ts";
import { NotificationPreferencesRepository } from "../repositories/NotificationPreferencesRepository.ts";
import { AuditLogger } from "./AuditLogger.ts";
import type {
  Notification,
  CreateNotificationInput,
  NotificationFilters,
  NotificationStats,
  NotificationType,
  NotificationSeverity,
} from "../models/Notification.ts";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from "../models/NotificationPreferences.ts";

/**
 * Notification error class
 */
export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

/**
 * Interface for notification event handlers
 */
export interface NotificationEventHandler {
  onNotificationCreated(notification: Notification): Promise<void>;
  onNotificationRead(notificationId: number): Promise<void>;
  onNotificationDismissed(notificationId: number): Promise<void>;
}

/**
 * Notification Service
 *
 * Handles notification creation, delivery, and management
 * Features:
 * - Notification CRUD operations
 * - User preference management
 * - Automatic deadline reminders
 * - Notification expiration
 * - Quiet hours support
 * - Real-time event emission
 */
export class NotificationService {
  private eventHandlers: NotificationEventHandler[] = [];

  constructor(
    private notificationRepo: NotificationRepository,
    private preferencesRepo: NotificationPreferencesRepository,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Register an event handler for notification events
   */
  registerEventHandler(handler: NotificationEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Create a new notification
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    try {
      // Check if user has this notification type enabled
      const prefs = await this.getPreferences(input.userId);

      if (!this.shouldSendNotification(input.type, prefs)) {
        logger.info(`Notification type ${input.type} is disabled for user ${input.userId}`);
        throw new NotificationError(`Notification type ${input.type} is disabled`);
      }

      // Check if we're in quiet hours
      if (this.isInQuietHours(prefs)) {
        logger.info(`Skipping notification during quiet hours for user ${input.userId}`);
        throw new NotificationError("Notification blocked during quiet hours");
      }

      // Create the notification
      const notification = await this.notificationRepo.create(input);

      // Audit log
      await this.auditLogger.log("notification:created", {
        notificationId: notification.id,
        userId: input.userId,
        type: input.type,
        severity: input.severity,
      });

      // Emit events
      await this.emitNotificationCreated(notification);

      logger.info(`Created notification ${notification.id} for user ${input.userId}`);
      return notification;
    } catch (error) {
      logger.error("Failed to create notification", error);
      throw error instanceof NotificationError ? error : new NotificationError("Failed to create notification");
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: number, filters?: NotificationFilters): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepo.findByUser(userId, filters);
      return notifications;
    } catch (error) {
      logger.error(`Failed to get notifications for user ${userId}`, error);
      throw new NotificationError("Failed to retrieve notifications");
    }
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(notificationId: number): Promise<Notification | null> {
    try {
      return await this.notificationRepo.findById(notificationId);
    } catch (error) {
      logger.error(`Failed to get notification ${notificationId}`, error);
      throw new NotificationError("Failed to retrieve notification");
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    try {
      await this.notificationRepo.markAsRead(notificationId);

      await this.auditLogger.log("notification:read", {
        notificationId,
      });

      await this.emitNotificationRead(notificationId);

      logger.info(`Marked notification ${notificationId} as read`);
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read`, error);
      throw new NotificationError("Failed to mark notification as read");
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<number> {
    try {
      const count = await this.notificationRepo.markAllAsRead(userId);

      await this.auditLogger.log("notification:read_all", {
        userId,
        count,
      });

      logger.info(`Marked ${count} notifications as read for user ${userId}`);
      return count;
    } catch (error) {
      logger.error(`Failed to mark all notifications as read for user ${userId}`, error);
      throw new NotificationError("Failed to mark all notifications as read");
    }
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId: number): Promise<void> {
    try {
      await this.notificationRepo.dismiss(notificationId);

      await this.auditLogger.log("notification:dismissed", {
        notificationId,
      });

      await this.emitNotificationDismissed(notificationId);

      logger.info(`Dismissed notification ${notificationId}`);
    } catch (error) {
      logger.error(`Failed to dismiss notification ${notificationId}`, error);
      throw new NotificationError("Failed to dismiss notification");
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.notificationRepo.getUnreadCount(userId);
    } catch (error) {
      logger.error(`Failed to get unread count for user ${userId}`, error);
      throw new NotificationError("Failed to get unread count");
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getStats(userId: number): Promise<NotificationStats> {
    try {
      return await this.notificationRepo.getStats(userId);
    } catch (error) {
      logger.error(`Failed to get notification stats for user ${userId}`, error);
      throw new NotificationError("Failed to get notification statistics");
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: number): Promise<NotificationPreferences> {
    try {
      let prefs = await this.preferencesRepo.findByUser(userId);

      // Create default preferences if none exist
      if (!prefs) {
        prefs = await this.preferencesRepo.createDefaults(userId);
        logger.info(`Created default notification preferences for user ${userId}`);
      }

      return prefs;
    } catch (error) {
      logger.error(`Failed to get notification preferences for user ${userId}`, error);
      throw new NotificationError("Failed to get notification preferences");
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: number,
    preferences: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    try {
      const updated = await this.preferencesRepo.update(userId, preferences);

      await this.auditLogger.log("notification:preferences_updated", {
        userId,
        changes: Object.keys(preferences),
      });

      logger.info(`Updated notification preferences for user ${userId}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update notification preferences for user ${userId}`, error);
      throw new NotificationError("Failed to update notification preferences");
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired(): Promise<number> {
    try {
      const count = await this.notificationRepo.deleteExpired();

      if (count > 0) {
        await this.auditLogger.log("notification:cleanup", {
          deletedCount: count,
        });
        logger.info(`Cleaned up ${count} expired notifications`);
      }

      return count;
    } catch (error) {
      logger.error("Failed to cleanup expired notifications", error);
      throw new NotificationError("Failed to cleanup expired notifications");
    }
  }

  /**
   * Create system notification
   */
  async createSystemNotification(
    userId: number,
    severity: NotificationSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const typeMap: Record<NotificationSeverity, NotificationType> = {
      urgent: "system_alert",
      high: "system_alert",
      medium: "system_warning",
      low: "system_info",
    };

    return this.createNotification({
      userId,
      type: typeMap[severity],
      severity,
      title,
      message,
      metadata,
    });
  }

  // Private helper methods

  /**
   * Check if a notification type should be sent based on preferences
   */
  private shouldSendNotification(
    type: NotificationType,
    prefs: NotificationPreferences
  ): boolean {
    switch (type) {
      case "deadline_reminder":
        return prefs.deadlineRemindersEnabled;
      case "case_status_change":
        return prefs.caseUpdatesEnabled;
      case "evidence_uploaded":
      case "document_updated":
        return prefs.evidenceUpdatesEnabled;
      case "system_alert":
      case "system_warning":
      case "system_info":
        return prefs.systemAlertsEnabled;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

    const [startHour, startMin] = prefs.quietHoursStart.split(":").map(Number);
    const [endHour, endMin] = prefs.quietHoursEnd.split(":").map(Number);

    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Emit notification created event to all handlers
   */
  private async emitNotificationCreated(notification: Notification): Promise<void> {
    await Promise.all(
      this.eventHandlers.map(handler =>
        handler.onNotificationCreated(notification).catch(error =>
          logger.error("Notification event handler error", error)
        )
      )
    );
  }

  /**
   * Emit notification read event to all handlers
   */
  private async emitNotificationRead(notificationId: number): Promise<void> {
    await Promise.all(
      this.eventHandlers.map(handler =>
        handler.onNotificationRead(notificationId).catch(error =>
          logger.error("Notification event handler error", error)
        )
      )
    );
  }

  /**
   * Emit notification dismissed event to all handlers
   */
  private async emitNotificationDismissed(notificationId: number): Promise<void> {
    await Promise.all(
      this.eventHandlers.map(handler =>
        handler.onNotificationDismissed(notificationId).catch(error =>
          logger.error("Notification event handler error", error)
        )
      )
    );
  }
}