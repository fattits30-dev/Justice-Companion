/**
 * GDPR Compliance API
 */

import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createGdprApi(client: ApiClient) {
  return {
    /**
     * Export all user data (GDPR Article 20 - Data Portability)
     */
    exportData: async (params: {
      format?: "json" | "csv";
    }): Promise<
      ApiResponse<{
        success: boolean;
        filePath: string;
        totalRecords: number;
        exportDate: string;
        format: string;
        auditLogId?: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          filePath: string;
          totalRecords: number;
          exportDate: string;
          format: string;
          auditLogId?: string;
        }>
      >("/gdpr/export", {
        format: params.format || "json",
      });
    },

    /**
     * Delete user account (GDPR Article 17 - Right to Erasure)
     */
    deleteData: async (params: {
      confirmed: boolean;
      exportBeforeDelete?: boolean;
      reason?: string;
    }): Promise<
      ApiResponse<{
        success: boolean;
        deletionDate: string;
        deletedCounts: Record<string, number>;
        preservedAuditLogs: number;
        preservedConsents: number;
        exportPath?: string;
        auditLogId?: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          deletionDate: string;
          deletedCounts: Record<string, number>;
          preservedAuditLogs: number;
          preservedConsents: number;
          exportPath?: string;
          auditLogId?: string;
        }>
      >("/gdpr/delete", params);
    },

    /**
     * Get user's consent records
     */
    getConsents: async (): Promise<
      ApiResponse<{
        consents: Array<{
          id: number;
          consentType: string;
          granted: boolean;
          grantedAt: string | null;
          revokedAt: string | null;
          createdAt: string;
        }>;
      }>
    > => {
      return client.get<
        ApiResponse<{
          consents: Array<{
            id: number;
            consentType: string;
            granted: boolean;
            grantedAt: string | null;
            revokedAt: string | null;
            createdAt: string;
          }>;
        }>
      >("/gdpr/consents");
    },

    /**
     * Update user consent
     */
    updateConsent: async (params: {
      consentType: string;
      granted: boolean;
    }): Promise<
      ApiResponse<{
        success: boolean;
        consentType: string;
        granted: boolean;
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          consentType: string;
          granted: boolean;
        }>
      >("/gdpr/consents", params);
    },
  };
}
