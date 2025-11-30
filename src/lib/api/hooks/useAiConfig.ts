/**
 * React Query hooks for AI Configuration API.
 *
 * @module api/hooks/useAiConfig
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { ProviderMetadata } from "ai";
import { apiClient } from "../index";
import type { ApiResponse } from "../types";
import type {
  AIProviderConfig,
  ConfigureResponse,
  ValidationResult,
  TestResult,
} from "../aiConfig";

// ====================
// Query Keys
// ====================

export const aiConfigKeys = {
  all: ["aiConfig"] as const,
  lists: () => [...aiConfigKeys.all, "list"] as const,
  active: () => [...aiConfigKeys.all, "active"] as const,
  detail: (provider: string) =>
    [...aiConfigKeys.all, "detail", provider] as const,
  providers: () => [...aiConfigKeys.all, "providers"] as const,
  providerMetadata: (provider: string) =>
    [...aiConfigKeys.all, "providerMetadata", provider] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch all AI configurations
 */
export function useAiConfigs(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: aiConfigKeys.lists(),
    queryFn: () => apiClient.aiConfig.list(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch active AI configuration
 */
export function useActiveAiConfig(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: aiConfigKeys.active(),
    queryFn: () => apiClient.aiConfig.getActive(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch AI configuration for a specific provider
 */
export function useAiConfig(
  provider: string,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: aiConfigKeys.detail(provider),
    queryFn: () => apiClient.aiConfig.get(provider),
    enabled: !!provider,
    ...queryOptions,
  });
}

/**
 * Hook to fetch list of available AI providers
 */
export function useAiProviders(
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<Record<string, ProviderMetadata>>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: aiConfigKeys.providers(),
    queryFn: () => apiClient.aiConfig.listProviders(),
    ...queryOptions,
  });
}

/**
 * Hook to fetch metadata for a specific AI provider
 */
export function useAiProviderMetadata(
  provider: string,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<ProviderMetadata>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: aiConfigKeys.providerMetadata(provider),
    queryFn: () => apiClient.aiConfig.getProviderMetadata(provider),
    enabled: !!provider,
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to configure an AI provider
 */
export function useConfigureAiProvider(
  mutationOptions?: UseMutationOptions<
    ApiResponse<ConfigureResponse>,
    Error,
    { provider: string; config: AIProviderConfig }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, config }) =>
      apiClient.aiConfig.configure(provider, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: aiConfigKeys.detail(variables.provider),
      });
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.active() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to delete an AI provider configuration
 */
export function useDeleteAiConfig(
  mutationOptions?: UseMutationOptions<ApiResponse<unknown>, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiClient.aiConfig.delete(provider),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.lists() });
      queryClient.removeQueries({ queryKey: aiConfigKeys.detail(provider) });
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.active() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to activate an AI provider
 */
export function useActivateAiProvider(
  mutationOptions?: UseMutationOptions<ApiResponse<unknown>, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiClient.aiConfig.activate(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: aiConfigKeys.active() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to update API key for a provider
 */
export function useUpdateAiApiKey(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ message: string }>,
    Error,
    { provider: string; apiKey: string }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, apiKey }) =>
      apiClient.aiConfig.updateApiKey(provider, apiKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: aiConfigKeys.detail(variables.provider),
      });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to validate AI provider configuration
 */
export function useValidateAiConfig(
  mutationOptions?: UseMutationOptions<
    ApiResponse<ValidationResult>,
    Error,
    { provider: string; config: AIProviderConfig }
  >,
) {
  return useMutation({
    mutationFn: ({ provider, config }) =>
      apiClient.aiConfig.validate(provider, config),
    ...mutationOptions,
  });
}

/**
 * Hook to test AI provider connection
 */
export function useTestAiProvider(
  mutationOptions?: UseMutationOptions<ApiResponse<TestResult>, Error, string>,
) {
  return useMutation({
    mutationFn: (provider: string) => apiClient.aiConfig.test(provider),
    ...mutationOptions,
  });
}
