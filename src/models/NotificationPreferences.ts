/**
 * NotificationPreferences Model
 * Represents user preferences for notifications
 */

export interface NotificationPreferences {
  id: number;
  userId: number;

  // Notification type toggles
  deadlineRemindersEnabled: boolean;
  deadlineReminderDays: number; // Days before deadline to remind
  caseUpdatesEnabled: boolean;
  evidenceUpdatesEnabled: boolean;
  systemAlertsEnabled: boolean;

  // Delivery preferences
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format

  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationPreferencesInput {
  userId: number;
  deadlineRemindersEnabled?: boolean;
  deadlineReminderDays?: number;
  caseUpdatesEnabled?: boolean;
  evidenceUpdatesEnabled?: boolean;
  systemAlertsEnabled?: boolean;
  soundEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface UpdateNotificationPreferencesInput {
  deadlineRemindersEnabled?: boolean;
  deadlineReminderDays?: number;
  caseUpdatesEnabled?: boolean;
  evidenceUpdatesEnabled?: boolean;
  systemAlertsEnabled?: boolean;
  soundEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationPreferencesSummary {
  allEnabled: boolean;
  someEnabled: boolean;
  enabledTypes: string[];
  disabledTypes: string[];
  quietHoursActive: boolean;
}