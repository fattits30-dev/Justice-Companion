import type { ProviderMetadata } from "ai";
import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createAiConfigApi(client: ApiClient) {
  return {
    list: async (): Promise<ApiResponse<any[]>> => {
      return client.get<ApiResponse<any[]>>("/ai/config");
    },

    getActive: async (): Promise<ApiResponse<any>> => {
      return client.get<ApiResponse<any>>("/ai/config/active");
    },

    get: async (provider: string): Promise<ApiResponse<any>> => {
      return client.get<ApiResponse<any>>(`/ai/config/${provider}`);
    },

    configure: async (
      provider: string,
      params: {
        api_key: string;
        model: string;
        endpoint?: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        enabled?: boolean;
      }
    ): Promise<
      ApiResponse<{ provider: string; message: string; config_id: number }>
    > => {
      return client.post<
        ApiResponse<{ provider: string; message: string; config_id: number }>
      >(`/ai/config/${provider}`, params);
    },

    delete: async (provider: string): Promise<ApiResponse<any>> => {
      return client.delete<ApiResponse<any>>(`/ai/config/${provider}`);
    },

    activate: async (provider: string): Promise<ApiResponse<any>> => {
      return client.put<ApiResponse<any>>(
        `/ai/config/${provider}/activate`,
        {}
      );
    },

    updateApiKey: async (
      provider: string,
      apiKey: string
    ): Promise<ApiResponse<{ message: string }>> => {
      return client.put<ApiResponse<{ message: string }>>(
        `/ai/config/${provider}/api-key`,
        { api_key: apiKey }
      );
    },

    validate: async (
      provider: string,
      params: {
        api_key: string;
        model: string;
        endpoint?: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        enabled?: boolean;
      }
    ): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> => {
      return client.post<ApiResponse<{ valid: boolean; errors: string[] }>>(
        `/ai/config/${provider}/validate`,
        params
      );
    },

    test: async (
      provider: string
    ): Promise<
      ApiResponse<{
        success: boolean;
        message?: string;
        error?: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          message?: string;
          error?: string;
        }>
      >(`/ai/config/${provider}/test`, {});
    },

    listProviders: async (): Promise<
      ApiResponse<Record<string, ProviderMetadata>>
    > => {
      return client.get<ApiResponse<Record<string, ProviderMetadata>>>(
        "/ai/providers"
      );
    },

    getProviderMetadata: async (
      provider: string
    ): Promise<ApiResponse<ProviderMetadata>> => {
      return client.get<ApiResponse<ProviderMetadata>>(
        `/ai/providers/${provider}`
      );
    },
  };
}
