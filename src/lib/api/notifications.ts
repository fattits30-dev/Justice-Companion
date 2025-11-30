/**
 * Notifications API module.
 *
 * @module api/notifications
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Notifications Types
// ====================

export interface NotificationPreferences {
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

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
}

// ====================
// Notifications API Factory
// ====================

export function createNotificationsApi(client: BaseApiClient) {
  return {
    list: async (options?: {
      unreadOnly?: boolean;
      type?: string;
      severity?: string;
      limit?: number;
      offset?: number;
      includeExpired?: boolean;
      includeDismissed?: boolean;
    }): Promise<ApiResponse<unknown[]>> => {
      const params: Record<string, string | number | boolean> = {};
      if (options?.unreadOnly !== undefined) {
        params.unreadOnly = options.unreadOnly;
      }
      if (options?.type) {
        params.type = options.type;
      }
      if (options?.severity) {
        params.severity = options.severity;
      }
      if (options?.limit !== undefined) {
        params.limit = options.limit;
      }
      if (options?.offset !== undefined) {
        params.offset = options.offset;
      }
      if (options?.includeExpired !== undefined) {
        params.includeExpired = options.includeExpired;
      }
      if (options?.includeDismissed !== undefined) {
        params.includeDismissed = options.includeDismissed;
      }

      return client.get<ApiResponse<unknown[]>>("/notifications", params);
    },

    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
      return client.get<ApiResponse<{ count: number }>>(
        "/notifications/unread/count",
      );
    },

    getStats: async (): Promise<ApiResponse<NotificationStats>> => {
      return client.get<ApiResponse<NotificationStats>>("/notifications/stats");
    },

    markAsRead: async (
      notificationId: number,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return client.put<ApiResponse<{ success: boolean; message: string }>>(
        `/notifications/${notificationId}/read`,
        {},
      );
    },

    markAllAsRead: async (): Promise<ApiResponse<{ count: number }>> => {
      return client.put<ApiResponse<{ count: number }>>(
        "/notifications/mark-all-read",
        {},
      );
    },

    delete: async (
      notificationId: number,
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/notifications/${notificationId}`,
      );
    },

    getPreferences: async (): Promise<ApiResponse<NotificationPreferences>> => {
      return client.get<ApiResponse<NotificationPreferences>>(
        "/notifications/preferences",
      );
    },

    updatePreferences: async (
      preferences: NotificationPreferences,
    ): Promise<ApiResponse<NotificationPreferences>> => {
      return client.put<ApiResponse<NotificationPreferences>>(
        "/notifications/preferences",
        preferences,
      );
    },
  };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
