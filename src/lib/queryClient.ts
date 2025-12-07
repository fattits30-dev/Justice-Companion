/**
 * TanStack Query Configuration
 *
 * Centralized QueryClient configuration with optimized defaults
 * for caching, retries, and error handling.
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';

/**
 * Custom error handler for React Query
 */
function handleQueryError(error: unknown): void {
  logger.error('Query error', { error });
}

/**
 * Shared QueryClient instance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 1 time (API client already retries 3 times)
      retry: 1,

      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus by default (can enable per-query)
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect by default
      refetchOnReconnect: false,

      // Don't refetch on mount by default
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,

      // Handle mutation errors
      onError: handleQueryError,
    },
  },
});
