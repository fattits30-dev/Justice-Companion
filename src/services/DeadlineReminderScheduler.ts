import { logger } from "../utils/logger.ts";
import { NotificationService } from "./NotificationService.ts";
import { DeadlineRepository } from "../repositories/DeadlineRepository.ts";
import { NotificationPreferencesRepository } from "../repositories/NotificationPreferencesRepository.ts";
import type { NotificationSeverity } from "../models/Notification.ts";

/**
 * DeadlineReminderScheduler
 *
 * Background service that checks for upcoming deadlines and sends notifications
 * Features:
 * - Runs hourly checks for deadlines
 * - Respects user notification preferences
 * - Sends reminders based on configured days before deadline
 * - Prevents duplicate notifications for the same deadline
 */
export class DeadlineReminderScheduler {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private lastCheckTimestamp?: Date;
  private sentReminders = new Map<string, Date>(); // Track sent reminders to prevent duplicates

  constructor(
    private notificationService: NotificationService,
    private deadlineRepo: DeadlineRepository,
    private preferencesRepo: NotificationPreferencesRepository
  ) {}

  /**
   * Start the scheduler
   * Checks for deadlines every hour
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("DeadlineReminderScheduler is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting DeadlineReminderScheduler");

    // Run immediately on start
    this.checkDeadlines();

    // Then run every hour
    this.intervalId = setInterval(
      () => {
        this.checkDeadlines();
      },
      60 * 60 * 1000 // 1 hour
    );
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    logger.info("Stopped DeadlineReminderScheduler");
  }

  /**
   * Manually trigger a deadline check
   * Useful for testing or on-demand checks
   */
  async checkNow(): Promise<void> {
    await this.checkDeadlines();
  }

  /**
   * Check for upcoming deadlines and send notifications
   */
  private async checkDeadlines(): Promise<void> {
    try {
      logger.info("Checking for upcoming deadlines");
      this.lastCheckTimestamp = new Date();

      // Get users with deadline reminders enabled
      const usersWithReminders = this.preferencesRepo.getUsersWithDeadlineReminders();

      if (usersWithReminders.length === 0) {
        logger.info("No users have deadline reminders enabled");
        return;
      }

      // Check deadlines for each user
      for (const { userId, reminderDays } of usersWithReminders) {
        await this.checkUserDeadlines(userId, reminderDays);
      }

      // Clean up old sent reminder tracking (older than 30 days)
      this.cleanupOldReminders();

      logger.info("Completed deadline check");
    } catch (error) {
      logger.error("Error checking deadlines", error);
    }
  }

  /**
   * Check deadlines for a specific user
   */
  private async checkUserDeadlines(userId: number, reminderDays: number): Promise<void> {
    try {
      // Get upcoming deadlines for this user within their reminder window
      const upcomingDeadlines = await this.deadlineRepo.getUpcomingForUser(
        userId,
        reminderDays
      );

      if (upcomingDeadlines.length === 0) {
        return;
      }

      logger.info(`Found ${upcomingDeadlines.length} upcoming deadlines for user ${userId}`);

      for (const deadline of upcomingDeadlines) {
        const reminderKey = `${userId}-${deadline.id}`;
        const daysUntil = this.getDaysUntilDeadline(deadline.deadline);

        // Check if we've already sent a reminder for this deadline today
        if (this.hasRecentReminder(reminderKey)) {
          continue;
        }

        // Only send reminder if within the configured window
        if (daysUntil <= reminderDays && daysUntil >= 0) {
          await this.sendDeadlineReminder(userId, deadline, daysUntil);
          this.sentReminders.set(reminderKey, new Date());
        }
      }
    } catch (error) {
      logger.error(`Error checking deadlines for user ${userId}`, error);
    }
  }

  /**
   * Send a deadline reminder notification
   */
  private async sendDeadlineReminder(
    userId: number,
    deadline: any,
    daysUntil: number
  ): Promise<void> {
    try {
      const severity = this.getSeverityForDeadline(daysUntil);
      const urgencyText = this.getUrgencyText(daysUntil);

      await this.notificationService.createNotification({
        userId,
        type: "deadline_reminder",
        severity,
        title: `${urgencyText}: ${deadline.title}`,
        message: this.formatDeadlineMessage(deadline, daysUntil),
        actionUrl: `/timeline?deadlineId=${deadline.id}`,
        actionLabel: "View Timeline",
        metadata: {
          deadlineId: deadline.id,
          caseId: deadline.caseId,
          daysUntil,
          deadlineDate: deadline.deadline,
        },
        // Set expiration to the deadline date
        expiresAt: new Date(deadline.deadline),
      });

      logger.info(
        `Sent deadline reminder for deadline ${deadline.id} to user ${userId} (${daysUntil} days remaining)`
      );
    } catch (error) {
      // Log but don't throw - continue processing other deadlines
      logger.error(`Failed to send deadline reminder for deadline ${deadline.id}`, error);
    }
  }

  /**
   * Format the deadline reminder message
   */
  private formatDeadlineMessage(deadline: any, daysUntil: number): string {
    const deadlineDate = new Date(deadline.deadline);
    const dateStr = deadlineDate.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (daysUntil === 0) {
      return `The deadline "${deadline.title}" is due today (${dateStr}). ${
        deadline.description || "Please ensure all required actions are completed."
      }`;
    } else if (daysUntil === 1) {
      return `The deadline "${deadline.title}" is due tomorrow (${dateStr}). ${
        deadline.description || "Please prepare for this upcoming deadline."
      }`;
    } else {
      return `The deadline "${deadline.title}" is due in ${daysUntil} days on ${dateStr}. ${
        deadline.description || "Plan accordingly to meet this deadline."
      }`;
    }
  }

  /**
   * Get urgency text based on days until deadline
   */
  private getUrgencyText(daysUntil: number): string {
    if (daysUntil === 0) {
      return "🚨 URGENT - Due Today";
    } else if (daysUntil === 1) {
      return "⚠️ Due Tomorrow";
    } else if (daysUntil <= 3) {
      return "⏰ Upcoming Deadline";
    } else {
      return "📅 Deadline Reminder";
    }
  }

  /**
   * Calculate days until deadline
   */
  private getDaysUntilDeadline(deadlineDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0); // Start of deadline day

    const diffTime = deadline.getTime() - now.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine severity based on days until deadline
   */
  private getSeverityForDeadline(daysUntil: number): NotificationSeverity {
    if (daysUntil === 0) {
      return "urgent";
    } else if (daysUntil <= 1) {
      return "high";
    } else if (daysUntil <= 3) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * Check if we've sent a reminder for this deadline recently (within 24 hours)
   */
  private hasRecentReminder(reminderKey: string): boolean {
    const lastSent = this.sentReminders.get(reminderKey);
    if (!lastSent) {
      return false;
    }

    const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSent < 24;
  }

  /**
   * Clean up old reminder tracking entries
   */
  private cleanupOldReminders(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const [key, date] of this.sentReminders.entries()) {
      if (date.getTime() < thirtyDaysAgo) {
        this.sentReminders.delete(key);
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    lastCheck?: Date;
    pendingReminders: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheckTimestamp,
      pendingReminders: this.sentReminders.size,
    };
  }
}