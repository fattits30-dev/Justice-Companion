/**
 * Settings API module.
 *
 * @module api/settings
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Settings Types
// ====================

export interface AppSettings {
  theme?: string;
  fontSize?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  notificationsEnabled?: boolean;
  autoBackupEnabled?: boolean;
  backupFrequency?: string;
}

// ====================
// Settings API Factory
// ====================

export function createSettingsApi(client: BaseApiClient) {
  return {
    get: async (): Promise<ApiResponse<AppSettings>> => {
      return client.get<ApiResponse<AppSettings>>("/settings");
    },

    update: async (params: AppSettings): Promise<ApiResponse<AppSettings>> => {
      return client.put<ApiResponse<AppSettings>>("/settings", params);
    },
  };
}

export type SettingsApi = ReturnType<typeof createSettingsApi>;
