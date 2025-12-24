/**
 * Local Cases API - IndexedDB Implementation
 *
 * Provides the same interface as the backend cases API but operates entirely locally.
 */

import type {
  Case,
  CaseStatus,
  CreateCaseInput,
  UpdateCaseInput,
} from "../../../domains/cases/entities/Case";
import type { ApiResponse, PaginatedResponse } from "../types";
import {
  getCasesRepository,
  type LocalCase,
} from "../../storage/repositories/CasesRepository";
import { getNotesRepository } from "../../storage/repositories/NotesRepository";
import { getConversationsRepository } from "../../storage/repositories/ConversationsRepository";

/**
 * Convert LocalCase to Case entity format
 */
function toCase(localCase: LocalCase): Case {
  return {
    id: localCase.id,
    title: localCase.title,
    description: localCase.description,
    caseType: localCase.caseType as Case["caseType"],
    status: localCase.status as Case["status"],
    userId: null, // No user in local-first mode
    createdAt: localCase.createdAt,
    updatedAt: localCase.updatedAt,
  };
}

/**
 * Create local cases API
 */
export function createLocalCasesApi() {
  const casesRepo = getCasesRepository();

  return {
    list: async (options?: {
      status?: CaseStatus;
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<PaginatedResponse<Case>>> => {
      try {
        let cases: LocalCase[];

        if (options?.status) {
          cases = await casesRepo.findByStatus(options.status);
        } else {
          cases = await casesRepo.findAll();
        }

        // Sort by updatedAt descending
        cases.sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });

        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 20;
        const paginatedCases = cases.slice(offset, offset + limit);

        return {
          success: true,
          data: {
            items: paginatedCases.map(toCase),
            total: cases.length,
            limit,
            offset,
            hasMore: offset + limit < cases.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to list cases",
          },
        };
      }
    },

    get: async (caseId: number): Promise<ApiResponse<Case>> => {
      try {
        const localCase = await casesRepo.findById(caseId);

        if (!localCase) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Case ${caseId} not found`,
            },
          };
        }

        return {
          success: true,
          data: toCase(localCase),
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get case",
          },
        };
      }
    },

    create: async (input: CreateCaseInput): Promise<ApiResponse<Case>> => {
      try {
        const localCase = await casesRepo.create({
          title: input.title,
          description: input.description ?? null,
          caseType: input.caseType,
          status: "active",
        });

        return {
          success: true,
          data: toCase(localCase),
          message: "Case created successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to create case",
          },
        };
      }
    },

    update: async (
      caseId: number,
      input: UpdateCaseInput
    ): Promise<ApiResponse<Case>> => {
      try {
        const localCase = await casesRepo.update(caseId, input);

        if (!localCase) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Case ${caseId} not found`,
            },
          };
        }

        return {
          success: true,
          data: toCase(localCase),
          message: "Case updated successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to update case",
          },
        };
      }
    },

    delete: async (caseId: number): Promise<ApiResponse<void>> => {
      try {
        const deleted = await casesRepo.delete(caseId);

        if (!deleted) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Case ${caseId} not found`,
            },
          };
        }

        return {
          success: true,
          data: undefined,
          message: "Case deleted successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to delete case",
          },
        };
      }
    },

    stats: async (): Promise<
      ApiResponse<{
        totalCases: number;
        activeCases: number;
        closedCases: number;
        pendingCases: number;
      }>
    > => {
      try {
        const stats = await casesRepo.getStats();

        return {
          success: true,
          data: {
            totalCases: stats.total,
            activeCases: stats.byStatus.active,
            closedCases: stats.byStatus.closed,
            pendingCases: stats.byStatus.pending,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get stats",
          },
        };
      }
    },

    getFolder: async (
      caseId: number,
      _options?: { includeLegal?: boolean }
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
          children?: Array<Record<string, unknown>>;
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
      try {
        const localCase = await casesRepo.findById(caseId);

        if (!localCase) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Case ${caseId} not found`,
            },
          };
        }

        // Get related counts
        const notesRepo = getNotesRepository();
        const conversationsRepo = getConversationsRepository();

        const notesCount = await notesRepo.countByCaseId(caseId);
        const conversations = await conversationsRepo.findByCaseId(caseId);

        return {
          success: true,
          data: {
            caseId: localCase.id,
            caseTitle: localCase.title,
            caseType: localCase.caseType,
            status: localCase.status,
            createdAt: localCase.createdAt,
            folders: [
              {
                id: "notes",
                name: "Notes",
                type: "folder",
                icon: "file-text",
                count: notesCount,
              },
              {
                id: "evidence",
                name: "Evidence",
                type: "folder",
                icon: "folder",
                count: 0, // TODO: Add evidence repository
              },
              {
                id: "conversations",
                name: "AI Conversations",
                type: "folder",
                icon: "message-circle",
                count: conversations.length,
              },
            ],
            stats: {
              evidence_count: 0,
              deadline_count: 0,
              conversation_count: conversations.length,
              legislation_count: 0,
              case_law_count: 0,
            },
            legalResearchLoaded: false,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get case folder",
          },
        };
      }
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
      try {
        const localCase = await casesRepo.findById(caseId);

        if (!localCase) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Case ${caseId} not found`,
            },
          };
        }

        // In local mode, we don't have legislation database
        // This could be enhanced to fetch from legislation.gov.uk API
        return {
          success: true,
          data: {
            caseId: localCase.id,
            caseType: localCase.caseType,
            legislation: [],
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message:
              error instanceof Error ? error.message : "Failed to get legislation",
          },
        };
      }
    },
  };
}
