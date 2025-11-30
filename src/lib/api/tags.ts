/**
 * Tags API module.
 *
 * Provides tag management endpoints:
 * - list: List all tags
 * - get: Get single tag
 * - create: Create new tag
 * - update: Update tag
 * - delete: Delete tag
 * - attachToCase: Attach tag to case
 * - removeFromCase: Remove tag from case
 * - getCasesWithTag: Get cases with tag
 * - getTagsForCase: Get tags for case
 * - searchCasesByTags: Search by tags (AND/OR)
 * - getStatistics: Get tag statistics
 *
 * @module api/tags
 */

import { BaseApiClient } from "./client";
import { ApiResponse, Case } from "./types";

// ====================
// Tag Types
// ====================

export interface Tag {
  id: number;
  userId: number;
  name: string;
  color: string;
  description?: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface TagStatistics {
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
}

// ====================
// Tags API Factory
// ====================

/**
 * Creates tags API methods bound to a client instance.
 */
export function createTagsApi(client: BaseApiClient) {
  return {
    /**
     * List all tags for the authenticated user
     */
    list: async (): Promise<ApiResponse<Tag[]>> => {
      return client.get<ApiResponse<Tag[]>>("/tags");
    },

    /**
     * Get single tag by ID
     */
    get: async (tagId: number): Promise<ApiResponse<Tag>> => {
      return client.get<ApiResponse<Tag>>(`/tags/${tagId}`);
    },

    /**
     * Create new tag
     */
    create: async (params: CreateTagInput): Promise<ApiResponse<Tag>> => {
      return client.post<ApiResponse<Tag>>("/tags", params);
    },

    /**
     * Update existing tag
     */
    update: async (
      tagId: number,
      params: UpdateTagInput,
    ): Promise<ApiResponse<Tag>> => {
      return client.put<ApiResponse<Tag>>(`/tags/${tagId}`, params);
    },

    /**
     * Delete tag
     */
    delete: async (
      tagId: number,
    ): Promise<ApiResponse<{ deleted: boolean; id: number }>> => {
      return client.delete<ApiResponse<{ deleted: boolean; id: number }>>(
        `/tags/${tagId}`,
      );
    },

    /**
     * Attach tag to case
     */
    attachToCase: async (
      tagId: number,
      caseId: number,
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

    /**
     * Remove tag from case
     */
    removeFromCase: async (
      tagId: number,
      caseId: number,
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

    /**
     * Get all cases with a specific tag
     */
    getCasesWithTag: async (tagId: number): Promise<ApiResponse<Case[]>> => {
      return client.get<ApiResponse<Case[]>>(`/tags/${tagId}/cases`);
    },

    /**
     * Get all tags for a case
     */
    getTagsForCase: async (caseId: number): Promise<ApiResponse<Tag[]>> => {
      return client.get<ApiResponse<Tag[]>>(`/tags/cases/${caseId}/tags`);
    },

    /**
     * Search cases by tags with AND/OR logic
     */
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

    /**
     * Get tag usage statistics
     */
    getStatistics: async (): Promise<ApiResponse<TagStatistics>> => {
      return client.get<ApiResponse<TagStatistics>>("/tags/statistics");
    },
  };
}

export type TagsApi = ReturnType<typeof createTagsApi>;
