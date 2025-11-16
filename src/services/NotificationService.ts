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
  private readonly eventHandlers: NotificationEventHandler[] = [];

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly preferencesRepo: NotificationPreferencesRepository,
    private readonly auditLogger: AuditLogger,
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
  async createNotification(
    input: CreateNotificationInput,
  ): Promise<Notification> {
    try {
      // Check if user has this notification type enabled
      const prefs = await this.getPreferences(input.userId);

      if (!this.shouldSendNotification(input.type, prefs)) {
        logger.info("NotificationService", "Notification type disabled", {
          type: input.type,
          userId: input.userId,
        });
        throw new NotificationError(
          `Notification type ${input.type} is disabled`,
        );
      }

      // Check if we're in quiet hours
      if (this.isInQuietHours(prefs)) {
        logger.info(
          "NotificationService",
          "Blocking notification during quiet hours",
          {
            userId: input.userId,
          },
        );
        throw new NotificationError("Notification blocked during quiet hours");
      }

      // Create the notification
      const notification = this.notificationRepo.create(input);

      // Log the creation
      this.auditLogger.log({
        eventType: "notification.create",
        userId: String(input.userId),
        resourceType: "notification",
        resourceId: String(notification.id),
        action: "create",
        details: {
          type: input.type,
          severity: input.severity,
        },
      });

      // Emit event
      await Promise.all(
        this.eventHandlers.map((handler) =>
          handler.onNotificationCreated(notification),
        ),
      );

      // Return the created notification by ID to ensure it's fetched
      return notification;
    } catch (error) {
      if (error instanceof NotificationError) {
        throw error;
      }
      const errorData =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { error };
      logger.error(
        "NotificationService",
        "Failed to create notification",
        errorData,
      );
      throw new NotificationError("Failed to create notification");
    }
  }

  /**
   * Get notifications for a user with optional filters
   */
  async getNotifications(
    userId: number,
    filters?: NotificationFilters,
  ): Promise<Notification[]> {
    return this.notificationRepo.findByUser(userId, filters);
  }

  /**
   * Get a notification by ID
   */
  async getNotificationById(
    notificationId: number,
  ): Promise<Notification | null> {
    return this.notificationRepo.findById(notificationId);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    this.notificationRepo.markAsRead(notificationId);
    this.auditLogger.log({
      eventType: "notification.read",
      resourceType: "notification",
      resourceId: String(notificationId),
      action: "read",
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<number> {
    const count = this.notificationRepo.markAllAsRead(userId);
    this.auditLogger.log({
      eventType: "notification.read_all",
      resourceType: "notification",
      resourceId: String(userId),
      action: "update",
      userId: String(userId),
      details: { count },
    });
    return count;
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId: number): Promise<void> {
    this.notificationRepo.dismiss(notificationId);
    this.auditLogger.log({
      eventType: "notification.dismiss",
      resourceType: "notification",
      resourceId: String(notificationId),
      action: "update",
    });
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Get notification statistics for a user
   */
  async getStats(userId: number): Promise<NotificationStats> {
    return this.notificationRepo.getStats(userId);
  }

  /**
   * Get user notification preferences (public)
   */
  async getPreferences(userId: number): Promise<NotificationPreferences> {
    const existing = this.preferencesRepo.findByUser(userId);
    if (existing) {
      return existing;
    }
    return this.preferencesRepo.createDefaults(userId);
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: number,
    updates: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const updated = this.preferencesRepo.update(userId, updates);

    // Log which fields were changed
    const changes = Object.keys(updates);
    this.auditLogger.log({
      eventType: "notification.preferences_update",
      resourceType: "notification_preferences",
      resourceId: String(userId),
      action: "update",
      userId: String(userId),
      details: { changes },
    });

    return updated;
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpired(): Promise<number> {
    const deletedCount = this.notificationRepo.deleteExpired();

    // Only log if we actually deleted something
    if (deletedCount > 0) {
      this.auditLogger.log({
        eventType: "notification.cleanup",
        resourceType: "notification",
        resourceId: "bulk",
        action: "delete",
        details: { deletedCount },
      });
    }

    return deletedCount;
  }

  /**
   * Create a system notification
   */
  async createSystemNotification(
    userId: number,
    severity: NotificationSeverity,
    title: string,
    message: string,
  ): Promise<Notification> {
    // Determine notification type based on severity
    let type: NotificationType;
    switch (severity) {
      case "urgent":
        type = "system_alert";
        break;
      case "high":
      case "medium":
        type = "system_warning";
        break;
      case "low":
      default:
        type = "system_info";
        break;
    }

    return this.createNotification({
      userId,
      type,
      severity,
      title,
      message,
    });
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    type: NotificationType,
    prefs: NotificationPreferences,
  ): boolean {
    switch (type) {
      case "deadline_reminder":
        return prefs.deadlineRemindersEnabled;
      case "case_status_change":
      case "document_updated":
        return prefs.caseUpdatesEnabled;
      case "evidence_uploaded":
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
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Parse quiet hours times
    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle case where quiet hours span midnight
    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }
}
