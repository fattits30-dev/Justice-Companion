import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import type { PaginationParams, PaginatedResult } from '../types/pagination';
import type { Case, CaseStatus } from '../models/Case';

interface UsePaginatedCasesParams {
  userId?: number;
  status?: CaseStatus;
  pageSize?: number;
  direction?: 'asc' | 'desc';
  enabled?: boolean;
}

/**
 * React Query hook for paginated cases with infinite scroll support
 *
 * Features:
 * - Infinite scroll pagination
 * - Automatic caching (5-minute stale time)
 * - Loading and error states
 * - Optimistic updates support
 * - Cache invalidation on mutations
 *
 * @example
 * ```typescript
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaginatedCases({
 *   userId: 1,
 *   pageSize: 20,
 * });
 *
 * // Infinite scroll trigger
 * useEffect(() => {
 *   if (inView && hasNextPage && !isFetchingNextPage) {
 *     fetchNextPage();
 *   }
 * }, [inView]);
 * ```
 */
export function usePaginatedCases({
  userId,
  status,
  pageSize = 20,
  direction = 'desc',
  enabled = true,
}: UsePaginatedCasesParams): UseInfiniteQueryResult<InfiniteData<PaginatedResult<Case>, string | undefined>, Error> {
  return useInfiniteQuery({
    queryKey: ['cases', 'paginated', userId, status, pageSize, direction],

    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<PaginatedResult<Case>> => {
      const params: PaginationParams = {
        limit: pageSize,
        cursor: pageParam,
        direction,
      };

      // Call Electron IPC to get paginated cases
      if (!window.justiceAPI) {
        throw new Error('Justice API not available');
      }

      // Use appropriate API method based on filters
      let result;
      if (status) {
        result = await window.justiceAPI.getCasesByStatusPaginated(status, params);
      } else if (userId) {
        result = await window.justiceAPI.getCasesByUserPaginated(userId, params);
      } else {
        result = await window.justiceAPI.getAllCasesPaginated(params);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch cases');
      }

      return result.data as PaginatedResult<Case>;
    },

    initialPageParam: undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor,

    getPreviousPageParam: (firstPage) => firstPage.prevCursor,

    // Stale time: 5 minutes (data remains fresh)
    staleTime: 1000 * 60 * 5,

    // Cache time: 10 minutes (keeps data in memory)
    gcTime: 1000 * 60 * 10,

    // Enable/disable query
    enabled,
  });
}

/**
 * Extract all items from paginated query result
 *
 * @param data - Paginated query result from usePaginatedCases
 * @returns Flattened array of all cases across all pages
 */
export function flattenPaginatedCases(
  data: InfiniteData<PaginatedResult<Case>, string | undefined> | undefined,
): Case[] {
  if (!data) {return [];}

  return data.pages.flatMap((page) => page.items);
}

/**
 * Get total number of items loaded across all pages
 *
 * @param data - Paginated query result
 * @returns Total count of loaded items
 */
export function getPaginatedCasesCount(
  data: InfiniteData<PaginatedResult<Case>, string | undefined> | undefined,
): number {
  if (!data) {return 0;}

  return data.pages.reduce((total, page) => total + page.items.length, 0);
}
