/**
 * React Query hooks for Settings API.
 *
 * @module api/hooks/useSettings
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
import type { AppSettings } from "../settings";

// ====================
// Query Keys
// ====================

export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch app settings
 */
export function useSettings(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<AppSettings>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: () => apiClient.settings.get(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to update app settings
 */
export function useUpdateSettings(
  mutationOptions?: UseMutationOptions<
    ApiResponse<AppSettings>,
    Error,
    AppSettings
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: AppSettings) => apiClient.settings.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
    },
    ...mutationOptions,
  });
}
