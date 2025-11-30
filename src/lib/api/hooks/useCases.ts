/**
 * React Query hooks for Cases API.
 *
 * @module api/hooks/useCases
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "../index";
import type {
  ApiResponse,
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  PaginatedResponse,
} from "../types";
import type { CaseListOptions, CaseStats } from "../cases";

// ====================
// Query Keys
// ====================

export const caseKeys = {
  all: ["cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (options?: CaseListOptions) => [...caseKeys.lists(), options] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: number) => [...caseKeys.details(), id] as const,
  stats: () => [...caseKeys.all, "stats"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch list of cases with optional filters
 */
export function useCases(
  options?: CaseListOptions,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<PaginatedResponse<Case>>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: caseKeys.list(options),
    queryFn: () => apiClient.cases.list(options),
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single case by ID
 */
export function useCase(
  caseId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Case>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: caseKeys.detail(caseId),
    queryFn: () => apiClient.cases.get(caseId),
    enabled: caseId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch case statistics
 */
export function useCaseStats(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<CaseStats>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: caseKeys.stats(),
    queryFn: () => apiClient.cases.stats(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to create a new case
 */
export function useCreateCase(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Case>,
    Error,
    CreateCaseInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCaseInput) => apiClient.cases.create(input),
    onSuccess: () => {
      // Invalidate all case lists and stats
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caseKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update an existing case
 */
export function useUpdateCase(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Case>,
    Error,
    { caseId: number; input: UpdateCaseInput }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, input }) => apiClient.cases.update(caseId, input),
    onSuccess: (_, variables) => {
      // Invalidate specific case and all lists
      queryClient.invalidateQueries({
        queryKey: caseKeys.detail(variables.caseId),
      });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caseKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a case
 */
export function useDeleteCase(
  mutationOptions?: UseMutationOptions<ApiResponse<void>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: number) => apiClient.cases.delete(caseId),
    onSuccess: (_, caseId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: caseKeys.detail(caseId) });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caseKeys.stats() });
    },
    ...mutationOptions,
  });
}
