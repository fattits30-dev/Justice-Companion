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
    private preferencesRepo: NotificationPreferencesRepository,
  ) {}

  /**
   * Start the scheduler
   * Checks for deadlines every hour
   */
  start(): void {
    if (this.isRunning) {
      logger.warn(
        "DeadlineReminderScheduler",
        "DeadlineReminderScheduler is already running",
      );
      return;
    }

    this.isRunning = true;
    logger.info(
      "DeadlineReminderScheduler",
      "Starting DeadlineReminderScheduler",
    );

    // Run immediately on start
    this.checkDeadlines();

    // Then run every hour
    this.intervalId = setInterval(
      () => {
        this.checkDeadlines();
      },
      60 * 60 * 1000, // 1 hour
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
    logger.info(
      "DeadlineReminderScheduler",
      "Stopped DeadlineReminderScheduler",
    );
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
      logger.info(
        "DeadlineReminderScheduler",
        "Checking for upcoming deadlines",
      );

      // Get users with deadline reminders enabled
      const usersWithReminders =
        this.preferencesRepo.getUsersWithDeadlineReminders();

      // Process each user with reminders enabled
      for (const user of usersWithReminders) {
        // Get all deadlines for this user and filter for upcoming ones
        const allDeadlines = this.deadlineRepo.findByUserId(user.userId);
        const now = new Date();
        const reminderThreshold = new Date(
          now.getTime() + user.reminderDays * 24 * 60 * 60 * 1000,
        );

        const upcomingDeadlines = allDeadlines.filter((deadline) => {
          const deadlineDate = new Date(deadline.deadlineDate);
          return (
            deadlineDate > now &&
            deadlineDate <= reminderThreshold &&
            deadline.status !== "completed"
          );
        });

        for (const deadline of upcomingDeadlines) {
          // Check if we've already sent a reminder for this deadline
          const reminderKey = `${user.userId}-${deadline.id}`;
          const lastSent = this.sentReminders.get(reminderKey);

          // Send reminder if not already sent
          if (!lastSent) {
            await this.createDeadlineReminderNotification(
              user.userId,
              deadline,
            );

            // Mark as sent
            this.sentReminders.set(reminderKey, new Date());
          }
        }
      }

      logger.info("DeadlineReminderScheduler", "Completed deadline check");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "DeadlineReminderScheduler",
        `Error checking deadlines: ${errorMessage}`,
        { error },
      );
    }
  }

  /**
   * Create a deadline reminder notification
   */
  private async createDeadlineReminderNotification(
    userId: number,
    deadline: any,
  ): Promise<void> {
    const daysUntil = Math.ceil(
      (new Date(deadline.deadlineDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    await this.notificationService.createNotification({
      userId,
      type: "deadline_reminder",
      severity: daysUntil <= 1 ? "high" : "medium",
      title: `Deadline Reminder: ${deadline.title}`,
      message: `Your deadline "${deadline.title}" is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`,
    });
  }
}
