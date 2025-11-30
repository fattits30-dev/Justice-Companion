/**
 * Search API module.
 *
 * @module api/search
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Search Types
// ====================

export interface SearchFilters {
  caseStatus?: string[];
  dateRange?: { from: string; to: string };
  entityTypes?: string[];
  tags?: string[];
  caseIds?: number[];
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  sortBy?: "relevance" | "date" | "title";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: number;
  type: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  caseId?: number;
  caseTitle?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  executionTime: number;
}

export interface SavedSearch {
  id: number;
  name: string;
  queryJson: string;
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
}

export interface IndexStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  lastUpdated: string | null;
}

// ====================
// Search API Factory
// ====================

export function createSearchApi(client: BaseApiClient) {
  return {
    query: async (
      params: SearchParams,
    ): Promise<ApiResponse<SearchResponse>> => {
      return client.post<ApiResponse<SearchResponse>>("/search", params);
    },

    rebuildIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return client.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/rebuild-index",
        {},
      );
    },

    saveSearch: async (params: {
      name: string;
      query: SearchParams;
    }): Promise<ApiResponse<SavedSearch>> => {
      return client.post<ApiResponse<SavedSearch>>("/search/save", params);
    },

    getSavedSearches: async (): Promise<ApiResponse<SavedSearch[]>> => {
      return client.get<ApiResponse<SavedSearch[]>>("/search/saved");
    },

    deleteSavedSearch: async (searchId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/search/saved/${searchId}`);
    },

    executeSavedSearch: async (
      searchId: number,
    ): Promise<ApiResponse<SearchResponse>> => {
      return client.post<ApiResponse<SearchResponse>>(
        `/search/saved/${searchId}/execute`,
        {},
      );
    },

    getSuggestions: async (
      prefix: string,
      limit: number = 5,
    ): Promise<ApiResponse<string[]>> => {
      return client.get<ApiResponse<string[]>>("/search/suggestions", {
        prefix,
        limit,
      });
    },

    getIndexStats: async (): Promise<ApiResponse<IndexStats>> => {
      return client.get<ApiResponse<IndexStats>>("/search/index/stats");
    },

    optimizeIndex: async (): Promise<
      ApiResponse<{ success: boolean; message: string }>
    > => {
      return client.post<ApiResponse<{ success: boolean; message: string }>>(
        "/search/index/optimize",
        {},
      );
    },
  };
}

export type SearchApi = ReturnType<typeof createSearchApi>;
