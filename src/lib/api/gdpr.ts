/**
 * GDPR Compliance API module.
 *
 * @module api/gdpr
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// GDPR Types
// ====================

export interface ExportDataResult {
  success: boolean;
  filePath: string;
  totalRecords: number;
  exportDate: string;
  format: string;
  auditLogId?: string;
}

export interface DeleteDataResult {
  success: boolean;
  deletionDate: string;
  deletedCounts: Record<string, number>;
  preservedAuditLogs: number;
  preservedConsents: number;
  exportPath?: string;
  auditLogId?: string;
}

export interface Consent {
  id: number;
  consentType: string;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ====================
// GDPR API Factory
// ====================

export function createGdprApi(client: BaseApiClient) {
  return {
    exportData: async (params: {
      format?: "json" | "csv";
    }): Promise<ApiResponse<ExportDataResult>> => {
      return client.post<ApiResponse<ExportDataResult>>("/gdpr/export", {
        format: params.format || "json",
      });
    },

    deleteData: async (params: {
      confirmed: boolean;
      exportBeforeDelete?: boolean;
      reason?: string;
    }): Promise<ApiResponse<DeleteDataResult>> => {
      return client.post<ApiResponse<DeleteDataResult>>("/gdpr/delete", params);
    },

    getConsents: async (): Promise<ApiResponse<{ consents: Consent[] }>> => {
      return client.get<ApiResponse<{ consents: Consent[] }>>("/gdpr/consents");
    },

    updateConsent: async (params: {
      consentType: string;
      granted: boolean;
    }): Promise<
      ApiResponse<{ success: boolean; consentType: string; granted: boolean }>
    > => {
      return client.post<
        ApiResponse<{ success: boolean; consentType: string; granted: boolean }>
      >("/gdpr/consents", params);
    },
  };
}

export type GdprApi = ReturnType<typeof createGdprApi>;
