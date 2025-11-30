/**
 * React Query hooks for GDPR Compliance API.
 *
 * @module api/hooks/useGdpr
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
import type { ExportDataResult, DeleteDataResult, Consent } from "../gdpr";

// ====================
// Query Keys
// ====================

export const gdprKeys = {
  all: ["gdpr"] as const,
  consents: () => [...gdprKeys.all, "consents"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch GDPR consents
 */
export function useGdprConsents(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<{ consents: Consent[] }>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: gdprKeys.consents(),
    queryFn: () => apiClient.gdpr.getConsents(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to export all user data (GDPR data portability)
 */
export function useExportGdprData(
  mutationOptions?: UseMutationOptions<
    ApiResponse<ExportDataResult>,
    Error,
    { format?: "json" | "csv" }
  >,
) {
  return useMutation({
    mutationFn: (params: { format?: "json" | "csv" }) =>
      apiClient.gdpr.exportData(params),
    ...mutationOptions,
  });
}

/**
 * Hook to delete all user data (GDPR right to be forgotten)
 */
export function useDeleteGdprData(
  mutationOptions?: UseMutationOptions<
    ApiResponse<DeleteDataResult>,
    Error,
    { confirmed: boolean; exportBeforeDelete?: boolean; reason?: string }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      confirmed: boolean;
      exportBeforeDelete?: boolean;
      reason?: string;
    }) => apiClient.gdpr.deleteData(params),
    onSuccess: () => {
      // Clear all cached data since user data was deleted
      queryClient.clear();
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update GDPR consent
 */
export function useUpdateGdprConsent(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ success: boolean; consentType: string; granted: boolean }>,
    Error,
    { consentType: string; granted: boolean }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { consentType: string; granted: boolean }) =>
      apiClient.gdpr.updateConsent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gdprKeys.consents() });
    },
    ...mutationOptions,
  });
}
