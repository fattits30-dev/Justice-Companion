import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createTemplatesApi(client: ApiClient) {
  return {
    list: async (
      category?: string
    ): Promise<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      const params: Record<string, string> = {};
      if (category) {
        params.category = category;
      }
      return client.get<
        ApiResponse<
          Array<{
            id: number;
            name: string;
            description: string | null;
            category: string;
            isSystemTemplate: boolean;
            userId: number | null;
            templateFields: Record<string, unknown>;
            suggestedEvidenceTypes: string[];
            timelineMilestones: Array<Record<string, unknown>>;
            checklistItems: Array<Record<string, unknown>>;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >("/templates", params);
    },

    get: async (
      templateId: number
    ): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.get<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/templates/${templateId}`);
    },

    create: async (params: {
      name: string;
      description?: string;
      category: string;
      templateFields: Record<string, unknown>;
      suggestedEvidenceTypes?: string[];
      timelineMilestones?: Array<Record<string, unknown>>;
      checklistItems?: Array<Record<string, unknown>>;
    }): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >("/templates", params);
    },

    update: async (
      templateId: number,
      params: {
        name?: string;
        description?: string;
        category?: string;
        templateFields?: Record<string, unknown>;
        suggestedEvidenceTypes?: string[];
        timelineMilestones?: Array<Record<string, unknown>>;
        checklistItems?: Array<Record<string, unknown>>;
      }
    ): Promise<
      ApiResponse<{
        id: number;
        name: string;
        description: string | null;
        category: string;
        isSystemTemplate: boolean;
        userId: number | null;
        templateFields: Record<string, unknown>;
        suggestedEvidenceTypes: string[];
        timelineMilestones: Array<Record<string, unknown>>;
        checklistItems: Array<Record<string, unknown>>;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.put<
        ApiResponse<{
          id: number;
          name: string;
          description: string | null;
          category: string;
          isSystemTemplate: boolean;
          userId: number | null;
          templateFields: Record<string, unknown>;
          suggestedEvidenceTypes: string[];
          timelineMilestones: Array<Record<string, unknown>>;
          checklistItems: Array<Record<string, unknown>>;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/templates/${templateId}`, params);
    },

    delete: async (
      templateId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/templates/${templateId}`
      );
    },

    apply: async (
      templateId: number,
      variables: Record<string, string>
    ): Promise<
      ApiResponse<{
        case: {
          id: number;
          title: string;
          description: string | null;
          caseType: string;
          status: string;
        };
        appliedMilestones: Array<{
          id: number;
          title: string;
          dueDate: string;
        }>;
        appliedChecklistItems: Array<Record<string, unknown>>;
        templateId: number;
        templateName: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          case: {
            id: number;
            title: string;
            description: string | null;
            caseType: string;
            status: string;
          };
          appliedMilestones: Array<{
            id: number;
            title: string;
            dueDate: string;
          }>;
          appliedChecklistItems: Array<Record<string, unknown>>;
          templateId: number;
          templateName: string;
        }>
      >(`/templates/${templateId}/apply`, { variables });
    },

    seed: async (): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        stats: {
          seeded: number;
          skipped: number;
          failed: number;
        };
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          message: string;
          stats: {
            seeded: number;
            skipped: number;
            failed: number;
          };
        }>
      >("/templates/seed", {});
    },
  };
}
