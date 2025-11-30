/**
 * React Query hooks for Tags API.
 *
 * @module api/hooks/useTags
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "../index";
import type { ApiResponse, Case } from "../types";
import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagStatistics,
} from "../tags";

// ====================
// Query Keys
// ====================

export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: () => [...tagKeys.lists()] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: number) => [...tagKeys.details(), id] as const,
  statistics: () => [...tagKeys.all, "statistics"] as const,
  caseTags: (caseId: number) => [...tagKeys.all, "case", caseId] as const,
  tagCases: (tagId: number) => [...tagKeys.all, "tagCases", tagId] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch all tags
 */
export function useTags(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Tag[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: () => apiClient.tags.list(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single tag by ID
 */
export function useTag(
  tagId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Tag>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: tagKeys.detail(tagId),
    queryFn: () => apiClient.tags.get(tagId),
    enabled: tagId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch tags for a specific case
 */
export function useTagsForCase(
  caseId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Tag[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: tagKeys.caseTags(caseId),
    queryFn: () => apiClient.tags.getTagsForCase(caseId),
    enabled: caseId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch cases with a specific tag
 */
export function useCasesWithTag(
  tagId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Case[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: tagKeys.tagCases(tagId),
    queryFn: () => apiClient.tags.getCasesWithTag(tagId),
    enabled: tagId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch tag statistics
 */
export function useTagStatistics(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<TagStatistics>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: tagKeys.statistics(),
    queryFn: () => apiClient.tags.getStatistics(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to create a new tag
 */
export function useCreateTag(
  mutationOptions?: UseMutationOptions<ApiResponse<Tag>, Error, CreateTagInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTagInput) => apiClient.tags.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagKeys.statistics() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update an existing tag
 */
export function useUpdateTag(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Tag>,
    Error,
    { tagId: number; input: UpdateTagInput }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, input }) => apiClient.tags.update(tagId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.detail(variables.tagId),
      });
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ deleted: boolean; id: number }>,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: number) => apiClient.tags.delete(tagId),
    onSuccess: (_, tagId) => {
      queryClient.removeQueries({ queryKey: tagKeys.detail(tagId) });
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagKeys.statistics() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to attach a tag to a case
 */
export function useAttachTagToCase(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{
      success: boolean;
      message: string;
      caseId: number;
      tagId: number;
      wasAttached: boolean;
    }>,
    Error,
    { tagId: number; caseId: number }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, caseId }) =>
      apiClient.tags.attachToCase(tagId, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.caseTags(variables.caseId),
      });
      queryClient.invalidateQueries({
        queryKey: tagKeys.tagCases(variables.tagId),
      });
      queryClient.invalidateQueries({ queryKey: tagKeys.statistics() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to remove a tag from a case
 */
export function useRemoveTagFromCase(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{
      success: boolean;
      message: string;
      caseId: number;
      tagId: number;
      removed: boolean;
    }>,
    Error,
    { tagId: number; caseId: number }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, caseId }) =>
      apiClient.tags.removeFromCase(tagId, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.caseTags(variables.caseId),
      });
      queryClient.invalidateQueries({
        queryKey: tagKeys.tagCases(variables.tagId),
      });
      queryClient.invalidateQueries({ queryKey: tagKeys.statistics() });
    },
    ...mutationOptions,
  });
}
