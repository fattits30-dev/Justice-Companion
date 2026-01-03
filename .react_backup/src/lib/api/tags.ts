import type { Case } from "../../domains/cases/entities/Case.ts";
import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createTagsApi(client: ApiClient) {
  return {
    list: async (): Promise<
      ApiResponse<
        Array<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      return client.get<
        ApiResponse<
          Array<{
            id: number;
            userId: number;
            name: string;
            color: string;
            description?: string;
            usageCount?: number;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >("/tags");
    },

    get: async (
      tagId: number
    ): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.get<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/tags/${tagId}`);
    },

    create: async (params: {
      name: string;
      color: string;
      description?: string;
    }): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.post<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >("/tags", params);
    },

    update: async (
      tagId: number,
      params: {
        name?: string;
        color?: string;
        description?: string;
      }
    ): Promise<
      ApiResponse<{
        id: number;
        userId: number;
        name: string;
        color: string;
        description?: string;
        usageCount?: number;
        createdAt: string;
        updatedAt: string;
      }>
    > => {
      return client.put<
        ApiResponse<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >(`/tags/${tagId}`, params);
    },

    delete: async (
      tagId: number
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/tags/${tagId}`
      );
    },

    attachToCase: async (
      tagId: number,
      caseId: number
    ): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        caseId: number;
        tagId: number;
        wasAttached: boolean;
      }>
    > => {
      return client.post<
        ApiResponse<{
          success: boolean;
          message: string;
          caseId: number;
          tagId: number;
          wasAttached: boolean;
        }>
      >(`/tags/${tagId}/cases/${caseId}`, {});
    },

    removeFromCase: async (
      tagId: number,
      caseId: number
    ): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        caseId: number;
        tagId: number;
        removed: boolean;
      }>
    > => {
      return client.delete<
        ApiResponse<{
          success: boolean;
          message: string;
          caseId: number;
          tagId: number;
          removed: boolean;
        }>
      >(`/tags/${tagId}/cases/${caseId}`);
    },

    getCasesWithTag: async (tagId: number): Promise<ApiResponse<Case[]>> => {
      return client.get<ApiResponse<Case[]>>(`/tags/${tagId}/cases`);
    },

    getTagsForCase: async (
      caseId: number
    ): Promise<
      ApiResponse<
        Array<{
          id: number;
          userId: number;
          name: string;
          color: string;
          description?: string;
          usageCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >
    > => {
      return client.get<
        ApiResponse<
          Array<{
            id: number;
            userId: number;
            name: string;
            color: string;
            description?: string;
            usageCount?: number;
            createdAt: string;
            updatedAt: string;
          }>
        >
      >(`/cases/${caseId}/tags`);
    },

    searchCasesByTags: async (params: {
      tagIds: number[];
      matchAll: boolean;
    }): Promise<
      ApiResponse<{
        caseIds: number[];
        matchAll: boolean;
        tagIds: number[];
        resultCount: number;
      }>
    > => {
      const tagIdsStr = params.tagIds.join(",");
      return client.get<
        ApiResponse<{
          caseIds: number[];
          matchAll: boolean;
          tagIds: number[];
          resultCount: number;
        }>
      >("/tags/search", {
        tag_ids: tagIdsStr,
        match_all: params.matchAll,
      });
    },

    getStatistics: async (): Promise<
      ApiResponse<{
        totalTags: number;
        tagsWithCases: number;
        mostUsedTags: Array<{
          id: number;
          name: string;
          color: string;
          usageCount: number;
        }>;
        unusedTags: Array<{
          id: number;
          name: string;
          color: string;
        }>;
      }>
    > => {
      return client.get<
        ApiResponse<{
          totalTags: number;
          tagsWithCases: number;
          mostUsedTags: Array<{
            id: number;
            name: string;
            color: string;
            usageCount: number;
          }>;
          unusedTags: Array<{
            id: number;
            name: string;
            color: string;
          }>;
        }>
      >("/tags/statistics");
    },
  };
}
