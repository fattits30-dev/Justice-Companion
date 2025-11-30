/**
 * Profile API module.
 *
 * @module api/profile
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Profile Types
// ====================

export interface ProfileUpdateInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

// ====================
// Profile API Factory
// ====================

export function createProfileApi(client: BaseApiClient) {
  return {
    get: async (): Promise<ApiResponse<unknown>> => {
      return client.get<ApiResponse<unknown>>("/profile");
    },

    update: async (
      params: ProfileUpdateInput,
    ): Promise<ApiResponse<unknown>> => {
      return client.put<ApiResponse<unknown>>("/profile", params);
    },

    changePassword: async (params: {
      currentPassword: string;
      newPassword: string;
    }): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      return client.put<ApiResponse<{ success: boolean; message: string }>>(
        "/profile/password",
        params,
      );
    },

    getCompleteness: async (): Promise<ApiResponse<ProfileCompleteness>> => {
      return client.get<ApiResponse<ProfileCompleteness>>(
        "/profile/completeness",
      );
    },
  };
}

export type ProfileApi = ReturnType<typeof createProfileApi>;
