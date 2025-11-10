import { ipcMain, type IpcMainInvokeEvent } from "electron";
import {
  SearchService,
  type SearchQuery,
} from "../../src/services/SearchService";
import { SearchIndexBuilder } from "../../src/services/SearchIndexBuilder";
import { databaseManager } from "../../src/db/database";
import { getRepositories } from "../../src/repositories";
import {
  getEncryptionService,
  getAuditLogger,
} from "../../src/services/ServiceContainer";
import { withAuthorization } from "../utils/authorization-wrapper";
import type { IPCResponse } from "../utils/ipc-response";
import { DatabaseError, ValidationError } from "../../src/errors/DomainErrors";
import { AuditLogger } from "../../src/services/AuditLogger";
import { EncryptionService } from "../../src/services/EncryptionService";

// Lazy initialization of services
let searchService: SearchService | null = null;
let searchIndexBuilder: SearchIndexBuilder | null = null;

function _getSearchService(): SearchService {
  if (!searchService) {
    const repos = getRepositories();

    searchService = new SearchService(
      databaseManager.getDatabase(),
      repos.caseRepository,
      repos.evidenceRepository,
      repos.chatConversationRepository,
      repos.notesRepository,
      getEncryptionService(),
      getAuditLogger()
    );
  }
  return searchService;
}

function _getSearchIndexBuilder(): SearchIndexBuilder {
  if (!searchIndexBuilder) {
    const repos = getRepositories();

    searchIndexBuilder = new SearchIndexBuilder(
      databaseManager.getDatabase(),
      repos.caseRepository,
      repos.evidenceRepository,
      repos.chatConversationRepository,
      repos.notesRepository,
      getEncryptionService()
    );
  }
  return searchIndexBuilder;
}

/**
 * Register all search IPC handlers
 *
 * SECURITY: All handlers require session validation via withAuthorization
 * All search results are filtered by userId to prevent data leakage
 * Updated: 2025-11-03 - Fixed missing authentication
 */
export function registerSearchHandlers(): void {
  ipcMain.handle(
    "search",
    async (
      _event: IpcMainInvokeEvent,
      query: SearchQuery,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] search called by user:", userId, "query:", query);

          const searchService = _getSearchService();

          // SECURITY: Pass userId to filter search results
          // SearchService.search(userId, query) filters all results by user_id
          const results = await searchService.search(userId, query);

          return { success: true, data: results };
        } catch (error) {
          console.error("[IPC] Search error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("search", error.message);
            }

            if (message.includes("invalid") || message.includes("query")) {
              throw new ValidationError(
                `Invalid search query: ${error.message}`
              );
            }
          }

          throw error;
        }
      });
    }
  );

  ipcMain.handle(
    "rebuild-search-index",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] rebuild-search-index called by user:", userId);

          const searchIndexBuilder = _getSearchIndexBuilder();

          // SECURITY: Only rebuild index for authenticated user's data
          // rebuildIndexForUser() only clears and rebuilds this user's index entries
          await searchIndexBuilder.rebuildIndexForUser(userId);

          return {
            success: true,
            data: { message: `Search index rebuilt for user ${userId}` },
          };
        } catch (error) {
          console.error("[IPC] Search index rebuild error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("rebuild search index", error.message);
            }
          }

          throw error;
        }
      });
    }
  );
}
