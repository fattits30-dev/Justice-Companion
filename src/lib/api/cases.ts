/**
 * Cases API module.
 *
 * Provides case management endpoints:
 * - list: Get all cases with filters
 * - get: Get single case by ID
 * - create: Create new case
 * - update: Update existing case
 * - delete: Delete case
 * - stats: Get case statistics
 *
 * @module api/cases
 */

import { BaseApiClient } from "./client";
import {
  ApiResponse,
  PaginatedResponse,
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from "./types";

// ====================
// Cases Types
// ====================

export interface CaseListOptions {
  status?: CaseStatus;
  limit?: number;
  offset?: number;
}

export interface CaseStats {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  pendingCases: number;
}

// ====================
// Cases API Factory
// ====================

/**
 * Creates cases API methods bound to a client instance.
 */
export function createCasesApi(client: BaseApiClient) {
  return {
    /**
     * Get all cases with optional filters and pagination
     */
    list: async (
      options?: CaseListOptions,
    ): Promise<ApiResponse<PaginatedResponse<Case>>> => {
      return client.get<ApiResponse<PaginatedResponse<Case>>>(
        "/cases",
        options as Record<string, string | number | boolean> | undefined,
      );
    },

    /**
     * Get single case by ID
     */
    get: async (caseId: number): Promise<ApiResponse<Case>> => {
      return client.get<ApiResponse<Case>>(`/cases/${caseId}`);
    },

    /**
     * Create new case
     */
    create: async (input: CreateCaseInput): Promise<ApiResponse<Case>> => {
      return client.post<ApiResponse<Case>>("/cases", input);
    },

    /**
     * Update existing case
     */
    update: async (
      caseId: number,
      input: UpdateCaseInput,
    ): Promise<ApiResponse<Case>> => {
      return client.put<ApiResponse<Case>>(`/cases/${caseId}`, input);
    },

    /**
     * Delete case
     */
    delete: async (caseId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/cases/${caseId}`);
    },

    /**
     * Get case statistics
     */
    stats: async (): Promise<ApiResponse<CaseStats>> => {
      return client.get<ApiResponse<CaseStats>>("/cases/stats");
    },
  };
}

export type CasesApi = ReturnType<typeof createCasesApi>;
