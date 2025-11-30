/**
 * Templates API module.
 *
 * @module api/templates
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Templates Types
// ====================

export interface Template {
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
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  templateFields: Record<string, unknown>;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: Array<Record<string, unknown>>;
  checklistItems?: Array<Record<string, unknown>>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  templateFields?: Record<string, unknown>;
  suggestedEvidenceTypes?: string[];
  timelineMilestones?: Array<Record<string, unknown>>;
  checklistItems?: Array<Record<string, unknown>>;
}

export interface ApplyTemplateResult {
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
}

export interface SeedResult {
  success: boolean;
  message: string;
  stats: {
    seeded: number;
    skipped: number;
    failed: number;
  };
}

// ====================
// Templates API Factory
// ====================

export function createTemplatesApi(client: BaseApiClient) {
  return {
    list: async (category?: string): Promise<ApiResponse<Template[]>> => {
      const params: Record<string, string> = {};
      if (category) {
        params.category = category;
      }
      return client.get<ApiResponse<Template[]>>("/templates", params);
    },

    get: async (templateId: number): Promise<ApiResponse<Template>> => {
      return client.get<ApiResponse<Template>>(`/templates/${templateId}`);
    },

    create: async (
      params: CreateTemplateInput,
    ): Promise<ApiResponse<Template>> => {
      return client.post<ApiResponse<Template>>("/templates", params);
    },

    update: async (
      templateId: number,
      params: UpdateTemplateInput,
    ): Promise<ApiResponse<Template>> => {
      return client.put<ApiResponse<Template>>(
        `/templates/${templateId}`,
        params,
      );
    },

    delete: async (
      templateId: number,
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/templates/${templateId}`,
      );
    },

    apply: async (
      templateId: number,
      variables: Record<string, string>,
    ): Promise<ApiResponse<ApplyTemplateResult>> => {
      return client.post<ApiResponse<ApplyTemplateResult>>(
        `/templates/${templateId}/apply`,
        { variables },
      );
    },

    seed: async (): Promise<ApiResponse<SeedResult>> => {
      return client.post<ApiResponse<SeedResult>>("/templates/seed", {});
    },
  };
}

export type TemplatesApi = ReturnType<typeof createTemplatesApi>;
