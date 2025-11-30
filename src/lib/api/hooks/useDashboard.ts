/**
 * React Query hooks for Dashboard API.
 *
 * @module api/hooks/useDashboard
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "../index";
import type { ApiResponse } from "../types";
import type {
  DashboardOverview,
  DashboardStats,
  RecentCase,
  UpcomingDeadline,
  DashboardNotification,
  Activity,
} from "../dashboard";

// ====================
// Query Keys
// ====================

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  recentCases: (limit?: number) =>
    [...dashboardKeys.all, "recentCases", limit] as const,
  upcomingDeadlines: (limit?: number) =>
    [...dashboardKeys.all, "upcomingDeadlines", limit] as const,
  notifications: (limit?: number) =>
    [...dashboardKeys.all, "notifications", limit] as const,
  activity: (limit?: number) =>
    [...dashboardKeys.all, "activity", limit] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch dashboard overview (all data in one call)
 */
export function useDashboardOverview(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DashboardOverview>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: () => apiClient.dashboard.getOverview(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DashboardStats>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiClient.dashboard.getStats(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch recent cases for dashboard
 */
export function useDashboardRecentCases(
  limit: number = 5,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<{ cases: RecentCase[]; total: number }>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.recentCases(limit),
    queryFn: () => apiClient.dashboard.getRecentCases(limit),
    ...queryOptions,
  });
}

/**
 * Hook to fetch upcoming deadlines for dashboard
 */
export function useDashboardUpcomingDeadlines(
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<
      ApiResponse<{
        upcomingDeadlines: UpcomingDeadline[];
        totalDeadlines: number;
        overdueCount: number;
      }>
    >,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.upcomingDeadlines(limit),
    queryFn: () => apiClient.dashboard.getUpcomingDeadlines(limit),
    ...queryOptions,
  });
}

/**
 * Hook to fetch notifications for dashboard
 */
export function useDashboardNotifications(
  limit: number = 5,
  queryOptions?: Omit<
    UseQueryOptions<
      ApiResponse<{
        unreadCount: number;
        recentNotifications: DashboardNotification[];
      }>
    >,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.notifications(limit),
    queryFn: () => apiClient.dashboard.getNotifications(limit),
    ...queryOptions,
  });
}

/**
 * Hook to fetch recent activity for dashboard
 */
export function useDashboardActivity(
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<{ activities: Activity[]; total: number }>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: dashboardKeys.activity(limit),
    queryFn: () => apiClient.dashboard.getActivity(limit),
    ...queryOptions,
  });
}
