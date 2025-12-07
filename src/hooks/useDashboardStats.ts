/**
 * useDashboardStats - React Query hook for dashboard statistics
 *
 * Fetches dashboard stats with automatic caching and refetching
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  overdueDeadlines: number;
  unreadNotifications: number;
}

/**
 * Query key factory for dashboard
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

/**
 * Fetch dashboard stats
 */
async function fetchDashboardStats(): Promise<DashboardStats> {
  // Get sessionId from localStorage
  const sessionId = localStorage.getItem('sessionId');

  if (!sessionId) {
    // Return empty stats if no session
    return {
      totalCases: 0,
      activeCases: 0,
      totalEvidence: 0,
      overdueDeadlines: 0,
      unreadNotifications: 0,
    };
  }

  apiClient.setSessionId(sessionId);
  const response = await apiClient.dashboard.getStats();

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 1,
    meta: {
      errorMessage: 'Failed to fetch dashboard stats',
    },
  });
}
