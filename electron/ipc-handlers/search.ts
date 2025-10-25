import { ipcMain } from 'electron';
import { SearchService, type SearchQuery } from '../../src/services/SearchService.ts';
import { SearchIndexBuilder } from '../../src/services/SearchIndexBuilder.ts';
import { getDb } from '../../src/db/database.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../src/repositories/EvidenceRepository.ts';
import { ChatConversationRepository } from '../../src/repositories/ChatConversationRepository.ts';
import { NotesRepository } from '../../src/repositories/NotesRepository.ts';
import { EncryptionService } from '../../src/services/EncryptionService.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import { SessionManager } from '../session-manager.ts';
import { errorLogger } from '../../src/utils/error-logger.ts';
import { getKeyManager } from '../main.ts';

const sessionManager = new SessionManager();

// Lazy initialization of services
let searchService: SearchService | null = null;
let searchIndexBuilder: SearchIndexBuilder | null = null;

function getSearchService(): SearchService {
  if (!searchService) {
    const keyManager = getKeyManager();
    const encryptionService = new EncryptionService(keyManager.getKey());
    const auditLogger = new AuditLogger(getDb(), encryptionService);

    const caseRepo = new CaseRepository(encryptionService, auditLogger);
    const evidenceRepo = new EvidenceRepository(encryptionService, auditLogger);
    const chatRepo = new ChatConversationRepository(encryptionService, auditLogger);
    const notesRepo = new NotesRepository(encryptionService, auditLogger);

    searchService = new SearchService(
      getDb(),
      caseRepo,
      evidenceRepo,
      chatRepo,
      notesRepo,
      encryptionService,
      auditLogger
    );
  }
  return searchService;
}

function getSearchIndexBuilder(): SearchIndexBuilder {
  if (!searchIndexBuilder) {
    const keyManager = getKeyManager();
    const encryptionService = new EncryptionService(keyManager.getKey());
    const auditLogger = new AuditLogger(getDb(), encryptionService);

    const caseRepo = new CaseRepository(encryptionService, auditLogger);
    const evidenceRepo = new EvidenceRepository(encryptionService, auditLogger);
    const chatRepo = new ChatConversationRepository(encryptionService, auditLogger);
    const notesRepo = new NotesRepository(encryptionService, auditLogger);

    searchIndexBuilder = new SearchIndexBuilder(
      getDb(),
      caseRepo,
      evidenceRepo,
      chatRepo,
      notesRepo,
      encryptionService
    );
  }
  return searchIndexBuilder;
}

/**
 * Search IPC handlers for advanced search and filter system
 */
export function registerSearchHandlers(): void {
  // Perform a search query
  ipcMain.handle('search:query', async (_event, query: SearchQuery) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      const response = await searchService.search(session.userId, query);

      return { success: true, data: response };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:query',
        query,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform search',
      };
    }
  });

  // Save a search query for later reuse
  ipcMain.handle('search:save', async (_event, name: string, query: SearchQuery) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      const savedSearch = await searchService.saveSearch(session.userId, name, query);

      return { success: true, data: savedSearch };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:save',
        name,
        query,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save search',
      };
    }
  });

  // Get all saved searches for the current user
  ipcMain.handle('search:list-saved', async (_event) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      const savedSearches = await searchService.getSavedSearches(session.userId);

      return { success: true, data: savedSearches };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:list-saved',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get saved searches',
      };
    }
  });

  // Delete a saved search
  ipcMain.handle('search:delete-saved', async (_event, searchId: number) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      await searchService.deleteSavedSearch(session.userId, searchId);

      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:delete-saved',
        searchId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete saved search',
      };
    }
  });

  // Execute a saved search
  ipcMain.handle('search:execute-saved', async (_event, searchId: number) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      const response = await searchService.executeSavedSearch(session.userId, searchId);

      return { success: true, data: response };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:execute-saved',
        searchId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute saved search',
      };
    }
  });

  // Get search suggestions based on prefix
  ipcMain.handle('search:suggestions', async (_event, prefix: string, limit: number = 5) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchService = getSearchService();
      const suggestions = await searchService.getSearchSuggestions(session.userId, prefix, limit);

      return { success: true, data: suggestions };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:suggestions',
        prefix,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get search suggestions',
      };
    }
  });

  // Rebuild the search index (admin operation)
  ipcMain.handle('search:rebuild-index', async (_event) => {
    try {
      const session = sessionManager.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      const searchIndexBuilder = getSearchIndexBuilder();
      await searchIndexBuilder.rebuildIndex();

      return { success: true, message: 'Search index rebuilt successfully' };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:rebuild-index',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rebuild search index',
      };
    }
  });

  // Get search index statistics
  ipcMain.handle('search:index-stats', async (_event) => {
    try {
      const searchIndexBuilder = getSearchIndexBuilder();
      const stats = await searchIndexBuilder.getIndexStats();

      return { success: true, data: stats };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:index-stats',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get index statistics',
      };
    }
  });

  // Update search index for a specific entity
  ipcMain.handle('search:update-index', async (_event, entityType: string, entityId: number) => {
    try {
      const searchIndexBuilder = getSearchIndexBuilder();
      await searchIndexBuilder.updateInIndex(entityType, entityId);

      return { success: true };
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'search:update-index',
        entityType,
        entityId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update search index',
      };
    }
  });

  console.log('Search IPC handlers registered');
}