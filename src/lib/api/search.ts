import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createSearchApi(client: ApiClient) {
  return {
    query: async (params: {
      query: string;
      filters?: {
        caseStatus?: string[];
        dateRange?: { from: string; to: string };
        entityTypes?: string[];
        tags?: string[];
        caseIds?: number[];
      };
      sortBy?: "relevance" | "date" | "title";
      sortOrder?: "asc" | "desc";
      limit?: number;
      offset?: number;
    }): Promise<
      ApiResponse<{
        results: Array<{
          id: number;
          type: string;
          title: string;
          excerpt: string;
          relevanceScore: number;
          caseId?: number;
          caseTitle?: string;
          createdAt: string;
          metadata: Record<string, unknown>;
        }>;
        total: number;
        hasMore: boolean;
        executionTime: number;
      }>
    > => {
      return client.post<
        ApiResponse<{
          results: Array<{
            id: number;
            type: string;
            title: string;
            excerpt: string;
            relevanceScore: number;
            caseId?: number;
            caseTitle?: string;
            createdAt: string;
            metadata: Record<string, unknown>;
          }>;
          total: number;
          hasMore: boolean;
          executionTime: number;
        }>
      >("/search", params);
    },

    rebuildIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return client.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/rebuild-index",
        {}
      );
    },

    saveSearch: async (params: {
      name: string;
      query: {
        query: string;
        filters?: {
          caseStatus?: string[];
          dateRange?: { from: string; to: string };
          entityTypes?: string[];
          tags?: string[];
          caseIds?: number[];
        };
        sortBy?: "relevance" | "date" | "title";
        sortOrder?: "asc" | "desc";
        limit?: number;
        offset?: number;
      };
    }): Promise<
      ApiResponse<{
        id: number;
        name: string;
        queryJson: string;
        createdAt: string;
        lastUsedAt: string | null;
        useCount: number;
      }>
    > => {
      return client.post<
        ApiResponse<{
          id: number;
          name: string;
          queryJson: string;
          createdAt: string;
          lastUsedAt: string | null;
          useCount: number;
        }>
      >("/search/save", params);
    },

    getSavedSearches: async (): Promise<
      ApiResponse<
        Array<{
          id: number;
          name: string;
          queryJson: string;
          createdAt: string;
          lastUsedAt: string | null;
          useCount: number;
        }>
      >
    > => {
      return client.get<
        ApiResponse<
          Array<{
            id: number;
            name: string;
            queryJson: string;
            createdAt: string;
            lastUsedAt: string | null;
            useCount: number;
          }>
        >
      >("/search/saved");
    },

    deleteSavedSearch: async (searchId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/search/saved/${searchId}`);
    },

    executeSavedSearch: async (
      searchId: number
    ): Promise<
      ApiResponse<{
        results: Array<{
          id: number;
          type: string;
          title: string;
          excerpt: string;
          relevanceScore: number;
          caseId?: number;
          caseTitle?: string;
          createdAt: string;
          metadata: Record<string, unknown>;
        }>;
        total: number;
        hasMore: boolean;
        executionTime: number;
      }>
    > => {
      return client.post<
        ApiResponse<{
          results: Array<{
            id: number;
            type: string;
            title: string;
            excerpt: string;
            relevanceScore: number;
            caseId?: number;
            caseTitle?: string;
            createdAt: string;
            metadata: Record<string, unknown>;
          }>;
          total: number;
          hasMore: boolean;
          executionTime: number;
        }>
      >(`/search/saved/${searchId}/execute`, {});
    },

    getSuggestions: async (
      prefix: string,
      limit: number = 5
    ): Promise<ApiResponse<string[]>> => {
      return client.get<ApiResponse<string[]>>("/search/suggestions", {
        prefix,
        limit,
      });
    },

    getIndexStats: async (): Promise<
      ApiResponse<{
        totalDocuments: number;
        documentsByType: Record<string, number>;
        lastUpdated: string | null;
      }>
    > => {
      return client.get<
        ApiResponse<{
          totalDocuments: number;
          documentsByType: Record<string, number>;
          lastUpdated: string | null;
        }>
      >("/search/index/stats");
    },

    optimizeIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return client.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/index/optimize",
        {}
      );
    },
  };
}
