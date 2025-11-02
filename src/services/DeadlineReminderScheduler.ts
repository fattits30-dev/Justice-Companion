import { logger } from "../utils/logger.ts";
import { NotificationService } from "./NotificationService.ts";
import { DeadlineRepository } from "../repositories/DeadlineRepository.ts";
import { NotificationPreferencesRepository } from "../repositories/NotificationPreferencesRepository.ts";

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

      // Process each user with reminders enabled
      for (const user of usersWithReminders) {
        // Get upcoming deadlines for this user
        const deadlines = await this.deadlineRepo.getUpcomingDeadlinesForUser(user.id);
        
        for (const deadline of deadlines) {
          // Check if we've already sent a reminder for this deadline
          const reminderKey = `${user.id}-${deadline.id}`;
          const lastSent = this.sentReminders.get(reminderKey);
          
          // Send reminder if not already sent
          if (!lastSent) {
            await this.notificationService.sendDeadlineReminder(
              user,
              deadline
            );
            
            // Mark as sent
            this.sentReminders.set(reminderKey, new Date());
          }
        }
      }
      
      logger.info("Completed deadline check");
    } catch (error) {
      logger.error("Error checking deadlines", { error });
    }
  }
}