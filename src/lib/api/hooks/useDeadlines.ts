/**
 * React Query hooks for Deadlines API.
 *
 * @module api/hooks/useDeadlines
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
  Deadline,
  DeadlineListResponse,
  CreateDeadlineInput,
  UpdateDeadlineInput,
} from "../deadlines";

// ====================
// Query Keys
// ====================

export const deadlineKeys = {
  all: ["deadlines"] as const,
  lists: () => [...deadlineKeys.all, "list"] as const,
  list: (params?: {
    caseId?: number;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }) => [...deadlineKeys.lists(), params] as const,
  details: () => [...deadlineKeys.all, "detail"] as const,
  detail: (id: number) => [...deadlineKeys.details(), id] as const,
  upcoming: (days?: number, limit?: number) =>
    [...deadlineKeys.all, "upcoming", days, limit] as const,
  overdue: () => [...deadlineKeys.all, "overdue"] as const,
  byDate: (date: string) => [...deadlineKeys.all, "byDate", date] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch deadlines with optional filters
 */
export function useDeadlines(
  params?: {
    caseId?: number;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  },
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DeadlineListResponse>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: deadlineKeys.list(params),
    queryFn: () => apiClient.deadlines.list(params),
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single deadline by ID
 */
export function useDeadline(
  id: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Deadline>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: deadlineKeys.detail(id),
    queryFn: () => apiClient.deadlines.get(id),
    enabled: id > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch upcoming deadlines
 */
export function useUpcomingDeadlines(
  days: number = 7,
  limit?: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DeadlineListResponse>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: deadlineKeys.upcoming(days, limit),
    queryFn: () => apiClient.deadlines.getUpcoming(days, limit),
    ...queryOptions,
  });
}

/**
 * Hook to fetch overdue deadlines
 */
export function useOverdueDeadlines(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DeadlineListResponse>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: deadlineKeys.overdue(),
    queryFn: () => apiClient.deadlines.getOverdue(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch deadlines for a specific date
 */
export function useDeadlinesByDate(
  date: string,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<DeadlineListResponse>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: deadlineKeys.byDate(date),
    queryFn: () => apiClient.deadlines.getByDate(date),
    enabled: !!date,
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to create a new deadline
 */
export function useCreateDeadline(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Deadline>,
    Error,
    CreateDeadlineInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeadlineInput) =>
      apiClient.deadlines.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deadlineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.overdue() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update an existing deadline
 */
export function useUpdateDeadline(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Deadline>,
    Error,
    { id: number; input: UpdateDeadlineInput }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => apiClient.deadlines.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deadlineKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.overdue() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a deadline
 */
export function useDeleteDeadline(
  mutationOptions?: UseMutationOptions<ApiResponse<void>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deadlines.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: deadlineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.overdue() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to mark a deadline as complete
 */
export function useMarkDeadlineComplete(
  mutationOptions?: UseMutationOptions<ApiResponse<Deadline>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deadlines.markComplete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deadlineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.overdue() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to snooze a deadline
 */
export function useSnoozeDeadline(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Deadline>,
    Error,
    { id: number; hours: number }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, hours }) => apiClient.deadlines.snooze(id, hours),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deadlineKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: deadlineKeys.overdue() });
    },
    ...mutationOptions,
  });
}
