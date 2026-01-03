import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createProfileApi(client: ApiClient) {
  return {
    get: async (): Promise<ApiResponse<any>> => {
      return client.get<ApiResponse<any>>("/profile");
    },

    update: async (params: {
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      avatarUrl?: string;
    }): Promise<ApiResponse<any>> => {
      return client.put<ApiResponse<any>>("/profile", params);
    },

    changePassword: async (params: {
      currentPassword: string;
      newPassword: string;
    }): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return client.put<ApiResponse<{ success: boolean; message: string }>>(
        "/profile/password",
        params
      );
    },

    getCompleteness: async (): Promise<
      ApiResponse<{
        percentage: number;
        missingFields: string[];
        completedFields: string[];
      }>
    > => {
      return client.get<
        ApiResponse<{
          percentage: number;
          missingFields: string[];
          completedFields: string[];
        }>
      >("/profile/completeness");
    },
  };
}
