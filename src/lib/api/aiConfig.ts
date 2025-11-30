/**
 * AI Configuration API module.
 *
 * @module api/aiConfig
 */

import { ProviderMetadata } from "ai";
import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// AI Config Types
// ====================

export interface AIProviderConfig {
  api_key: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  enabled?: boolean;
}

export interface ConfigureResponse {
  provider: string;
  message: string;
  config_id: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ====================
// AI Config API Factory
// ====================

export function createAiConfigApi(client: BaseApiClient) {
  return {
    list: async (): Promise<ApiResponse<unknown[]>> => {
      return client.get<ApiResponse<unknown[]>>("/ai/config");
    },

    getActive: async (): Promise<ApiResponse<unknown>> => {
      return client.get<ApiResponse<unknown>>("/ai/config/active");
    },

    get: async (provider: string): Promise<ApiResponse<unknown>> => {
      return client.get<ApiResponse<unknown>>(`/ai/config/${provider}`);
    },

    configure: async (
      provider: string,
      params: AIProviderConfig,
    ): Promise<ApiResponse<ConfigureResponse>> => {
      return client.post<ApiResponse<ConfigureResponse>>(
        `/ai/config/${provider}`,
        params,
      );
    },

    delete: async (provider: string): Promise<ApiResponse<unknown>> => {
      return client.delete<ApiResponse<unknown>>(`/ai/config/${provider}`);
    },

    activate: async (provider: string): Promise<ApiResponse<unknown>> => {
      return client.put<ApiResponse<unknown>>(
        `/ai/config/${provider}/activate`,
        {},
      );
    },

    updateApiKey: async (
      provider: string,
      apiKey: string,
    ): Promise<ApiResponse<{ message: string }>> => {
      return client.put<ApiResponse<{ message: string }>>(
        `/ai/config/${provider}/api-key`,
        { api_key: apiKey },
      );
    },

    validate: async (
      provider: string,
      params: AIProviderConfig,
    ): Promise<ApiResponse<ValidationResult>> => {
      return client.post<ApiResponse<ValidationResult>>(
        `/ai/config/${provider}/validate`,
        params,
      );
    },

    test: async (provider: string): Promise<ApiResponse<TestResult>> => {
      return client.post<ApiResponse<TestResult>>(
        `/ai/config/${provider}/test`,
        {},
      );
    },

    listProviders: async (): Promise<
      ApiResponse<Record<string, ProviderMetadata>>
    > => {
      return client.get<ApiResponse<Record<string, ProviderMetadata>>>(
        "/ai/providers",
      );
    },

    getProviderMetadata: async (
      provider: string,
    ): Promise<ApiResponse<ProviderMetadata>> => {
      return client.get<ApiResponse<ProviderMetadata>>(
        `/ai/providers/${provider}`,
      );
    },
  };
}

export type AiConfigApi = ReturnType<typeof createAiConfigApi>;
