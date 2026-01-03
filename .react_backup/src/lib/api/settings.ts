import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createSettingsApi(client: ApiClient) {
  return {
    get: async (): Promise<ApiResponse<any>> => {
      return client.get<ApiResponse<any>>("/settings");
    },

    update: async (params: {
      theme?: string;
      fontSize?: string;
      language?: string;
      dateFormat?: string;
      timeFormat?: string;
      notificationsEnabled?: boolean;
      autoBackupEnabled?: boolean;
      backupFrequency?: string;
    }): Promise<ApiResponse<any>> => {
      return client.put<ApiResponse<any>>("/settings", params);
    },
  };
}
