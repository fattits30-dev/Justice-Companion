/**
 * Dashboard API module.
 *
 * @module api/dashboard
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Dashboard Types
// ====================

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalEvidence: number;
  totalDeadlines: number;
  overdueDeadlines: number;
  unreadNotifications: number;
}

export interface RecentCase {
  id: number;
  title: string;
  status: string;
  priority?: string | null;
  lastUpdated: string;
}

export interface DashboardNotification {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string | null;
}

export interface UpcomingDeadline {
  id: number;
  title: string;
  deadlineDate: string;
  priority: string;
  daysUntil: number;
  isOverdue: boolean;
  caseId?: number | null;
  caseTitle?: string | null;
}

export interface Activity {
  id: number;
  type: string;
  action: string;
  title: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

export interface DashboardOverview {
  stats: DashboardStats;
  recentCases: {
    cases: RecentCase[];
    total: number;
  };
  notifications: {
    unreadCount: number;
    recentNotifications: DashboardNotification[];
  };
  deadlines: {
    upcomingDeadlines: UpcomingDeadline[];
    totalDeadlines: number;
    overdueCount: number;
  };
  activity: {
    activities: Activity[];
    total: number;
  };
}

// ====================
// Dashboard API Factory
// ====================

export function createDashboardApi(client: BaseApiClient) {
  return {
    getOverview: async (): Promise<ApiResponse<DashboardOverview>> => {
      return client.get<ApiResponse<DashboardOverview>>("/dashboard");
    },

    getStats: async (): Promise<ApiResponse<DashboardStats>> => {
      return client.get<ApiResponse<DashboardStats>>("/dashboard/stats");
    },

    getRecentCases: async (
      limit: number = 5,
    ): Promise<ApiResponse<{ cases: RecentCase[]; total: number }>> => {
      return client.get<ApiResponse<{ cases: RecentCase[]; total: number }>>(
        "/dashboard/recent-cases",
        { limit },
      );
    },

    getUpcomingDeadlines: async (
      limit: number = 10,
    ): Promise<
      ApiResponse<{
        upcomingDeadlines: UpcomingDeadline[];
        totalDeadlines: number;
        overdueCount: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          upcomingDeadlines: UpcomingDeadline[];
          totalDeadlines: number;
          overdueCount: number;
        }>
      >("/dashboard/deadlines", { limit });
    },

    getNotifications: async (
      limit: number = 5,
    ): Promise<
      ApiResponse<{
        unreadCount: number;
        recentNotifications: DashboardNotification[];
      }>
    > => {
      return client.get<
        ApiResponse<{
          unreadCount: number;
          recentNotifications: DashboardNotification[];
        }>
      >("/dashboard/notifications", { limit });
    },

    getActivity: async (
      limit: number = 10,
    ): Promise<ApiResponse<{ activities: Activity[]; total: number }>> => {
      return client.get<ApiResponse<{ activities: Activity[]; total: number }>>(
        "/dashboard/activity",
        { limit },
      );
    },
  };
}

export type DashboardApi = ReturnType<typeof createDashboardApi>;
