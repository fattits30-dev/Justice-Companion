import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createDashboardApi(client: ApiClient) {
  return {
    getOverview: async (): Promise<
      ApiResponse<{
        stats: {
          totalCases: number;
          activeCases: number;
          closedCases: number;
          totalEvidence: number;
          totalDeadlines: number;
          overdueDeadlines: number;
          unreadNotifications: number;
        };
        recentCases: {
          cases: Array<{
            id: number;
            title: string;
            status: string;
            priority?: string | null;
            lastUpdated: string;
          }>;
          total: number;
        };
        notifications: {
          unreadCount: number;
          recentNotifications: Array<{
            id: number;
            type: string;
            severity: string;
            title: string;
            message: string;
            createdAt: string | null;
          }>;
        };
        deadlines: {
          upcomingDeadlines: Array<{
            id: number;
            title: string;
            deadlineDate: string;
            priority: string;
            daysUntil: number;
            isOverdue: boolean;
            caseId?: number | null;
            caseTitle?: string | null;
          }>;
          totalDeadlines: number;
          overdueCount: number;
        };
        activity: {
          activities: Array<{
            id: number;
            type: string;
            action: string;
            title: string;
            timestamp: string;
            metadata?: Record<string, unknown> | null;
          }>;
          total: number;
        };
      }>
    > => {
      return client.get<
        ApiResponse<{
          stats: {
            totalCases: number;
            activeCases: number;
            closedCases: number;
            totalEvidence: number;
            totalDeadlines: number;
            overdueDeadlines: number;
            unreadNotifications: number;
          };
          recentCases: {
            cases: Array<{
              id: number;
              title: string;
              status: string;
              priority?: string | null;
              lastUpdated: string;
            }>;
            total: number;
          };
          notifications: {
            unreadCount: number;
            recentNotifications: Array<{
              id: number;
              type: string;
              severity: string;
              title: string;
              message: string;
              createdAt: string | null;
            }>;
          };
          deadlines: {
            upcomingDeadlines: Array<{
              id: number;
              title: string;
              deadlineDate: string;
              priority: string;
              daysUntil: number;
              isOverdue: boolean;
              caseId?: number | null;
              caseTitle?: string | null;
            }>;
            totalDeadlines: number;
            overdueCount: number;
          };
          activity: {
            activities: Array<{
              id: number;
              type: string;
              action: string;
              title: string;
              timestamp: string;
              metadata?: Record<string, unknown> | null;
            }>;
            total: number;
          };
        }>
      >("/dashboard");
    },

    getStats: async (): Promise<
      ApiResponse<{
        totalCases: number;
        activeCases: number;
        closedCases: number;
        totalEvidence: number;
        totalDeadlines: number;
        overdueDeadlines: number;
        unreadNotifications: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          totalCases: number;
          activeCases: number;
          closedCases: number;
          totalEvidence: number;
          totalDeadlines: number;
          overdueDeadlines: number;
          unreadNotifications: number;
        }>
      >("/dashboard/stats");
    },

    getRecentCases: async (
      limit: number = 5
    ): Promise<
      ApiResponse<{
        cases: Array<{
          id: number;
          title: string;
          status: string;
          priority?: string | null;
          lastUpdated: string;
        }>;
        total: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          cases: Array<{
            id: number;
            title: string;
            status: string;
            priority?: string | null;
            lastUpdated: string;
          }>;
          total: number;
        }>
      >("/dashboard/recent-cases", { limit });
    },

    getUpcomingDeadlines: async (
      limit: number = 10
    ): Promise<
      ApiResponse<{
        upcomingDeadlines: Array<{
          id: number;
          title: string;
          deadlineDate: string;
          priority: string;
          daysUntil: number;
          isOverdue: boolean;
          caseId?: number | null;
          caseTitle?: string | null;
        }>;
        totalDeadlines: number;
        overdueCount: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          upcomingDeadlines: Array<{
            id: number;
            title: string;
            deadlineDate: string;
            priority: string;
            daysUntil: number;
            isOverdue: boolean;
            caseId?: number | null;
            caseTitle?: string | null;
          }>;
          totalDeadlines: number;
          overdueCount: number;
        }>
      >("/dashboard/deadlines", { limit });
    },

    getNotifications: async (
      limit: number = 5
    ): Promise<
      ApiResponse<{
        unreadCount: number;
        recentNotifications: Array<{
          id: number;
          type: string;
          severity: string;
          title: string;
          message: string;
          createdAt: string | null;
        }>;
      }>
    > => {
      return client.get<
        ApiResponse<{
          unreadCount: number;
          recentNotifications: Array<{
            id: number;
            type: string;
            severity: string;
            title: string;
            message: string;
            createdAt: string | null;
          }>;
        }>
      >("/dashboard/notifications", { limit });
    },

    getActivity: async (
      limit: number = 10
    ): Promise<
      ApiResponse<{
        activities: Array<{
          id: number;
          type: string;
          action: string;
          title: string;
          timestamp: string;
          metadata?: Record<string, unknown> | null;
        }>;
        total: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          activities: Array<{
            id: number;
            type: string;
            action: string;
            title: string;
            timestamp: string;
            metadata?: Record<string, unknown> | null;
          }>;
          total: number;
        }>
      >("/dashboard/activity", { limit });
    },
  };
}
