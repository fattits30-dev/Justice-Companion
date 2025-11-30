/**
 * React Query hooks for Evidence API.
 *
 * @module api/hooks/useEvidence
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
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../types";

// ====================
// Query Keys
// ====================

export const evidenceKeys = {
  all: ["evidence"] as const,
  lists: () => [...evidenceKeys.all, "list"] as const,
  listAll: (options?: { limit?: number; offset?: number }) =>
    [...evidenceKeys.lists(), "all", options] as const,
  listByCase: (caseId: number) =>
    [...evidenceKeys.lists(), "case", caseId] as const,
  details: () => [...evidenceKeys.all, "detail"] as const,
  detail: (id: number) => [...evidenceKeys.details(), id] as const,
  preview: (id: number) => [...evidenceKeys.all, "preview", id] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch all evidence globally
 */
export function useAllEvidence(
  options?: { limit?: number; offset?: number },
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Evidence[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: evidenceKeys.listAll(options),
    queryFn: () => apiClient.evidence.listAll(options),
    ...queryOptions,
  });
}

/**
 * Hook to fetch evidence for a specific case
 */
export function useEvidenceByCase(
  caseId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Evidence[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: evidenceKeys.listByCase(caseId),
    queryFn: () => apiClient.evidence.list(caseId),
    enabled: caseId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single evidence item by ID
 */
export function useEvidence(
  evidenceId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Evidence>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: evidenceKeys.detail(evidenceId),
    queryFn: () => apiClient.evidence.get(evidenceId),
    enabled: evidenceId > 0,
    ...queryOptions,
  });
}

/**
 * Hook to fetch evidence preview
 */
export function useEvidencePreview(
  evidenceId: number,
  queryOptions?: Omit<
    UseQueryOptions<
      ApiResponse<{ url: string; metadata?: Record<string, unknown> }>
    >,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: evidenceKeys.preview(evidenceId),
    queryFn: () => apiClient.evidence.preview(evidenceId),
    enabled: evidenceId > 0,
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to create new evidence
 */
export function useCreateEvidence(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Evidence>,
    Error,
    CreateEvidenceInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEvidenceInput) =>
      apiClient.evidence.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      if (variables.caseId) {
        queryClient.invalidateQueries({
          queryKey: evidenceKeys.listByCase(variables.caseId),
        });
      }
    },
    ...mutationOptions,
  });
}

/**
 * Hook to upload evidence with file
 */
export function useUploadEvidence(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Evidence>,
    Error,
    {
      caseId: number;
      title: string;
      content?: string;
      type: string;
      file?: File;
      fileName?: string;
    }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => apiClient.evidence.upload(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: evidenceKeys.listByCase(variables.caseId),
      });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update existing evidence
 */
export function useUpdateEvidence(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Evidence>,
    Error,
    { evidenceId: number; input: UpdateEvidenceInput }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, input }) =>
      apiClient.evidence.update(evidenceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: evidenceKeys.detail(variables.evidenceId),
      });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete evidence
 */
export function useDeleteEvidence(
  mutationOptions?: UseMutationOptions<ApiResponse<void>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evidenceId: number) => apiClient.evidence.delete(evidenceId),
    onSuccess: (_, evidenceId) => {
      queryClient.removeQueries({ queryKey: evidenceKeys.detail(evidenceId) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to parse evidence content
 */
export function useParseEvidence(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ content: string; metadata?: unknown }>,
    Error,
    number
  >,
) {
  return useMutation({
    mutationFn: (evidenceId: number) => apiClient.evidence.parse(evidenceId),
    ...mutationOptions,
  });
}

/**
 * Hook to run OCR on evidence
 */
export function useRunOCR(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ text: string; confidence?: number }>,
    Error,
    { evidenceId: number; language?: string }
  >,
) {
  return useMutation({
    mutationFn: ({ evidenceId, language }) =>
      apiClient.evidence.runOCR(evidenceId, { language }),
    ...mutationOptions,
  });
}

/**
 * Hook to bulk upload evidence
 */
export function useBulkUploadEvidence(
  mutationOptions?: UseMutationOptions<
    ApiResponse<Evidence[]>,
    Error,
    Array<{ file: File; caseId: number; title?: string; type?: string }>
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files) => apiClient.evidence.bulkUpload(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
    },
    ...mutationOptions,
  });
}
