/**
 * React Query hooks for Notifications API.
 *
 * @module api/hooks/useNotifications
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "../index";
import type { ApiResponse } from "../types";
import type {
  NotificationPreferences,
  NotificationStats,
} from "../notifications";

// ====================
// Query Keys
// ====================

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: {
    unreadOnly?: boolean;
    type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }) => [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
  stats: () => [...notificationKeys.all, "stats"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch notifications with optional filters
 */
export function useNotifications(
  params?: {
    unreadOnly?: boolean;
    type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
    includeExpired?: boolean;
    includeDismissed?: boolean;
  },
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => apiClient.notifications.list(params),
    ...queryOptions,
  });
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<{ count: number }>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => apiClient.notifications.getUnreadCount(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch notification statistics
 */
export function useNotificationStats(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<NotificationStats>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: () => apiClient.notifications.getStats(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<NotificationPreferences>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => apiClient.notifications.getPreferences(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationAsRead(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ success: boolean; message: string }>,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      apiClient.notifications.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ count: number }>,
    Error,
    void
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ deleted: boolean; id: number }>,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      apiClient.notifications.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences(
  mutationOptions?: UseMutationOptions<
    ApiResponse<NotificationPreferences>,
    Error,
    NotificationPreferences
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      apiClient.notifications.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
    ...mutationOptions,
  });
}
