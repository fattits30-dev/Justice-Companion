import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createNotificationsApi(client: ApiClient) {
  return {
    list: async (options?: {
      unreadOnly?: boolean;
      type?: string;
      severity?: string;
      limit?: number;
      offset?: number;
      includeExpired?: boolean;
      includeDismissed?: boolean;
    }): Promise<ApiResponse<any[]>> => {
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

      return client.get<ApiResponse<any[]>>("/notifications", params);
    },

    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
      return client.get<ApiResponse<{ count: number }>>(
        "/notifications/unread/count"
      );
    },

    getStats: async (): Promise<
      ApiResponse<{
        total: number;
        unread: number;
        urgent: number;
        high: number;
        medium: number;
        low: number;
        byType: Record<string, number>;
      }>
    > => {
      return client.get<
        ApiResponse<{
          total: number;
          unread: number;
          urgent: number;
          high: number;
          medium: number;
          low: number;
          byType: Record<string, number>;
        }>
      >("/notifications/stats");
    },

    markAsRead: async (
      notificationId: number
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return client.put<ApiResponse<{ success: boolean; message: string }>>(
        `/notifications/${notificationId}/read`,
        {}
      );
    },

    markAllAsRead: async (): Promise<ApiResponse<{ count: number }>> => {
      return client.put<ApiResponse<{ count: number }>>(
        "/notifications/mark-all-read",
        {}
      );
    },

    delete: async (
      notificationId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/notifications/${notificationId}`
      );
    },

    getPreferences: async (): Promise<ApiResponse<any>> => {
      return client.get<ApiResponse<any>>("/notifications/preferences");
    },

    updatePreferences: async (preferences: {
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
    }): Promise<ApiResponse<any>> => {
      return client.put<ApiResponse<any>>(
        "/notifications/preferences",
        preferences
      );
    },
  };
}
