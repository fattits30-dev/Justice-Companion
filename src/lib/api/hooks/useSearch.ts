/**
 * React Query hooks for Search API.
 *
 * @module api/hooks/useSearch
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
  SearchParams,
  SearchResponse,
  SavedSearch,
  IndexStats,
} from "../search";

// ====================
// Query Keys
// ====================

export const searchKeys = {
  all: ["search"] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, "results", params] as const,
  savedSearches: () => [...searchKeys.all, "saved"] as const,
  suggestions: (prefix: string) =>
    [...searchKeys.all, "suggestions", prefix] as const,
  indexStats: () => [...searchKeys.all, "indexStats"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch search results
 */
export function useSearchResults(
  params: SearchParams,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<SearchResponse>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: searchKeys.results(params),
    queryFn: () => apiClient.search.query(params),
    enabled: !!params.query && params.query.length > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch saved searches
 */
export function useSavedSearches(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<SavedSearch[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: searchKeys.savedSearches(),
    queryFn: () => apiClient.search.getSavedSearches(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch search suggestions
 */
export function useSearchSuggestions(
  prefix: string,
  limit: number = 5,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<string[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: searchKeys.suggestions(prefix),
    queryFn: () => apiClient.search.getSuggestions(prefix, limit),
    enabled: prefix.length >= 2,
    ...queryOptions,
  });
}

/**
 * Hook to fetch search index statistics
 */
export function useSearchIndexStats(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<IndexStats>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: searchKeys.indexStats(),
    queryFn: () => apiClient.search.getIndexStats(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to perform a search query (mutation for manual triggering)
 */
export function useSearch(
  mutationOptions?: UseMutationOptions<
    ApiResponse<SearchResponse>,
    Error,
    SearchParams
  >,
) {
  return useMutation({
    mutationFn: (params: SearchParams) => apiClient.search.query(params),
    ...mutationOptions,
  });
}

/**
 * Hook to save a search
 */
export function useSaveSearch(
  mutationOptions?: UseMutationOptions<
    ApiResponse<SavedSearch>,
    Error,
    { name: string; query: SearchParams }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; query: SearchParams }) =>
      apiClient.search.saveSearch(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.savedSearches() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a saved search
 */
export function useDeleteSavedSearch(
  mutationOptions?: UseMutationOptions<ApiResponse<void>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (searchId: number) =>
      apiClient.search.deleteSavedSearch(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.savedSearches() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to execute a saved search
 */
export function useExecuteSavedSearch(
  mutationOptions?: UseMutationOptions<
    ApiResponse<SearchResponse>,
    Error,
    number
  >,
) {
  return useMutation({
    mutationFn: (searchId: number) =>
      apiClient.search.executeSavedSearch(searchId),
    ...mutationOptions,
  });
}

/**
 * Hook to rebuild search index
 */
export function useRebuildSearchIndex(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ success: boolean; message: string }>,
    Error,
    void
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.search.rebuildIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.indexStats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to optimize search index
 */
export function useOptimizeSearchIndex(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ success: boolean; message: string }>,
    Error,
    void
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.search.optimizeIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.indexStats() });
    },
    ...mutationOptions,
  });
}
