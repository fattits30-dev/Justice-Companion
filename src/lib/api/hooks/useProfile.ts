/**
 * React Query hooks for Profile API.
 *
 * @module api/hooks/useProfile
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
import type { ProfileUpdateInput, ProfileCompleteness } from "../profile";

// ====================
// Query Keys
// ====================

export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
  completeness: () => [...profileKeys.all, "completeness"] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch user profile
 */
export function useProfile(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: () => apiClient.profile.get(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch profile completeness
 */
export function useProfileCompleteness(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<ProfileCompleteness>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: profileKeys.completeness(),
    queryFn: () => apiClient.profile.getCompleteness(),
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to update user profile
 */
export function useUpdateProfile(
  mutationOptions?: UseMutationOptions<
    ApiResponse<unknown>,
    Error,
    ProfileUpdateInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => apiClient.profile.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      queryClient.invalidateQueries({ queryKey: profileKeys.completeness() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to change password
 */
export function useChangePassword(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ success: boolean; message: string }>,
    Error,
    { currentPassword: string; newPassword: string }
  >,
) {
  return useMutation({
    mutationFn: (params: { currentPassword: string; newPassword: string }) =>
      apiClient.profile.changePassword(params),
    ...mutationOptions,
  });
}
