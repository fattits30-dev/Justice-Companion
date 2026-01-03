/**
 * Legal Information API
 */

import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createLegalApi(client: ApiClient) {
  return {
    /**
     * Search for legal information (legislation and case law)
     * Uses the backend LegalAPIService which integrates with:
     * - legislation.gov.uk for UK statutes
     * - caselaw.nationalarchives.gov.uk for tribunal/court decisions
     */
    search: async (
      query: string
    ): Promise<
      ApiResponse<{
        legislation: Array<{
          title: string;
          content: string;
          url: string;
          section?: string;
          relevance: number;
        }>;
        cases: Array<{
          citation: string;
          court: string;
          date: string;
          summary: string;
          url: string;
          outcome?: string;
          relevance: number;
        }>;
        knowledge_base: Array<{
          topic: string;
          category: string;
          content: string;
          sources: string[];
        }>;
        cached: boolean;
        timestamp: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          legislation: Array<{
            title: string;
            content: string;
            url: string;
            section?: string;
            relevance: number;
          }>;
          cases: Array<{
            citation: string;
            court: string;
            date: string;
            summary: string;
            url: string;
            outcome?: string;
            relevance: number;
          }>;
          knowledge_base: Array<{
            topic: string;
            category: string;
            content: string;
            sources: string[];
          }>;
          cached: boolean;
          timestamp: number;
        }>
      >("/legal/search", { query });
    },

    /**
     * Search legislation only
     */
    searchLegislation: async (
      query: string
    ): Promise<
      ApiResponse<
        Array<{
          title: string;
          content: string;
          url: string;
          section?: string;
          relevance: number;
        }>
      >
    > => {
      return client.get<
        ApiResponse<
          Array<{
            title: string;
            content: string;
            url: string;
            section?: string;
            relevance: number;
          }>
        >
      >("/legal/legislation", { query });
    },

    /**
     * Search case law only
     */
    searchCaseLaw: async (
      query: string,
      category?: string
    ): Promise<
      ApiResponse<
        Array<{
          citation: string;
          court: string;
          date: string;
          summary: string;
          url: string;
          outcome?: string;
          relevance: number;
        }>
      >
    > => {
      return client.get<
        ApiResponse<
          Array<{
            citation: string;
            court: string;
            date: string;
            summary: string;
            url: string;
            outcome?: string;
            relevance: number;
          }>
        >
      >("/legal/cases", category ? { query, category } : { query });
    },
  };
}
