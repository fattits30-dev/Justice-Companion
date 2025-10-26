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
// import { SessionManager } from '../session-manager.ts'; // TODO: SessionManager not implemented
import { errorLogger } from '../../src/utils/error-logger.ts';
import { getKeyManager } from '../main.ts';

// const sessionManager = new SessionManager(); // TODO: SessionManager not implemented

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
 *
 * TODO: These handlers are currently disabled pending SessionManager implementation
 */
export function registerSearchHandlers(): void {
  const notImplementedError = {
    success: false,
    error: 'Search feature not yet implemented - requires SessionManager',
  };

  // Perform a search query
  ipcMain.handle('search:query', async () => notImplementedError);

  // Save a search query for later reuse
  ipcMain.handle('search:save', async () => notImplementedError);

  // Get all saved searches for the current user
  ipcMain.handle('search:list-saved', async () => notImplementedError);

  // Delete a saved search
  ipcMain.handle('search:delete-saved', async () => notImplementedError);

  // Execute a saved search
  ipcMain.handle('search:execute-saved', async () => notImplementedError);

  // Get search suggestions based on prefix
  ipcMain.handle('search:suggestions', async () => notImplementedError);

  // Rebuild the search index (admin operation)
  ipcMain.handle('search:rebuild-index', async () => notImplementedError);

  // Get search index statistics (this one doesn't need session, but keep consistent)
  ipcMain.handle('search:index-stats', async () => notImplementedError);

  // Update search index for a specific entity (this one doesn't need session, but keep consistent)
  ipcMain.handle('search:update-index', async () => notImplementedError);

  console.log('Search IPC handlers registered (currently disabled - pending implementation)');
}
