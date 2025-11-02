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
        throw new NotificationError("Notification skipped during quiet hours");
      }

      // Create the notification
      const notification = await this.notificationRepo.create(input);
      
      // Emit event
      await Promise.all(
        this.eventHandlers.map(handler => handler.onNotificationCreated(notification))
      );
      
      return notification;
    } catch (error) {
      if (error instanceof NotificationError) {
        throw error;
      }
      logger.error("Failed to create notification", error);
      throw new NotificationError("Failed to create notification");
    }
  }

  /**
   * Get user notification preferences
   */
  private async getPreferences(userId: number): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepo.findByUserId(userId);
    if (!prefs) {
      // Create default preferences if they don't exist
      prefs = await this.preferencesRepo.createDefault(userId);
    }
    return prefs;
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(type: NotificationType, prefs: NotificationPreferences): boolean {
    switch (type) {
      case "deadline_reminder":
        return prefs.deadlineRemindersEnabled;
      case "system_update":
        return prefs.systemUpdatesEnabled;
      case "security_alert":
        return prefs.securityAlertsEnabled;
      default:
        return true; // Default to sending if unknown type
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
    const currentHour = now.getHours();
    
    // Check if current hour is within quiet hours range
    return currentHour >= prefs.quietHoursStart && currentHour < prefs.quietHoursEnd;
  }
}