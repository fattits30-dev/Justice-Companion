/**
 * React Query hooks for Templates API.
 *
 * @module api/hooks/useTemplates
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
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateResult,
  SeedResult,
} from "../templates";
import { caseKeys } from "./useCases";

// ====================
// Query Keys
// ====================

export const templateKeys = {
  all: ["templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (category?: string) => [...templateKeys.lists(), category] as const,
  details: () => [...templateKeys.all, "detail"] as const,
  detail: (id: number) => [...templateKeys.details(), id] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch templates with optional category filter
 */
export function useTemplates(
  category?: string,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Template[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: templateKeys.list(category),
    queryFn: () => apiClient.templates.list(category),
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single template by ID
 */
export function useTemplate(
  templateId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Template>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: templateKeys.detail(templateId),
    queryFn: () => apiClient.templates.get(templateId),
    enabled: templateId > 0,
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to create a new template
 */
export function useCreateTemplate(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Template>,
    Error,
    CreateTemplateInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      apiClient.templates.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update an existing template
 */
export function useUpdateTemplate(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Template>,
    Error,
    { templateId: number; input: UpdateTemplateInput }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, input }) =>
      apiClient.templates.update(templateId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.detail(variables.templateId),
      });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ deleted: boolean; id: number }>,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: number) => apiClient.templates.delete(templateId),
    onSuccess: (_, templateId) => {
      queryClient.removeQueries({ queryKey: templateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to apply a template to create a new case
 */
export function useApplyTemplate(
  mutationOptions?: UseMutationOptions<
    ApiResponse<ApplyTemplateResult>,
    Error,
    { templateId: number; variables: Record<string, string> }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, variables }) =>
      apiClient.templates.apply(templateId, variables),
    onSuccess: () => {
      // Invalidate cases lists since a new case was created
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caseKeys.stats() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to seed system templates
 */
export function useSeedTemplates(
  mutationOptions?: UseMutationOptions<ApiResponse<SeedResult>, Error, void>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.templates.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
    ...mutationOptions,
  });
}
