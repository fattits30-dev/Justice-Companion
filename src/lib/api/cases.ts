import type {
  Case,
  CaseStatus,
  CreateCaseInput,
  UpdateCaseInput,
} from "../../domains/cases/entities/Case.ts";
import type { ApiClient } from "./client.ts";
import type { ApiResponse, PaginatedResponse } from "./types.ts";

export function createCasesApi(client: ApiClient) {
  return {
    list: async (options?: {
      status?: CaseStatus;
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<PaginatedResponse<Case>>> => {
      return client.get<ApiResponse<PaginatedResponse<Case>>>(
        "/cases",
        options
      );
    },

    get: async (caseId: number): Promise<ApiResponse<Case>> => {
      return client.get<ApiResponse<Case>>(`/cases/${caseId}`);
    },

    create: async (input: CreateCaseInput): Promise<ApiResponse<Case>> => {
      return client.post<ApiResponse<Case>>("/cases", input);
    },

    update: async (
      caseId: number,
      input: UpdateCaseInput
    ): Promise<ApiResponse<Case>> => {
      return client.put<ApiResponse<Case>>(`/cases/${caseId}`, input);
    },

    delete: async (caseId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/cases/${caseId}`);
    },

    stats: async (): Promise<
      ApiResponse<{
        totalCases: number;
        activeCases: number;
        closedCases: number;
        pendingCases: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          totalCases: number;
          activeCases: number;
          closedCases: number;
          pendingCases: number;
        }>
      >("/cases/stats");
    },

    getFolder: async (
      caseId: number,
      options?: { includeLegal?: boolean }
    ): Promise<
      ApiResponse<{
        caseId: number;
        caseTitle: string;
        caseType: string;
        status: string;
        createdAt: string;
        folders: Array<{
          id: string;
          name: string;
          type: "folder" | "file";
          icon: string;
          count?: number;
          url?: string;
          data?: Record<string, unknown>;
          children?: Array<{
            id: string;
            name: string;
            type: "folder" | "file";
            icon: string;
            count?: number;
            url?: string;
            data?: Record<string, unknown>;
            children?: Array<Record<string, unknown>>;
          }>;
        }>;
        stats: {
          evidence_count: number;
          deadline_count: number;
          conversation_count: number;
          legislation_count: number;
          case_law_count: number;
        };
        legalResearchLoaded: boolean;
      }>
    > => {
      const params: Record<string, string> = {};
      if (options?.includeLegal !== undefined) {
        params.include_legal = options.includeLegal.toString();
      }
      return client.get(`/cases/${caseId}/folder`, params);
    },

    getSuggestedLegislation: async (
      caseId: number
    ): Promise<
      ApiResponse<{
        caseId: number;
        caseType: string;
        legislation: Array<{
          title: string;
          content?: string;
          url: string;
          section?: string;
          relevance?: number;
        }>;
      }>
    > => {
      return client.get(`/cases/${caseId}/suggested-legislation`);
    },
  };
}
