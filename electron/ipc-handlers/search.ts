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
import { getKeyManager } from '../main.ts';

// const sessionManager = new SessionManager(); // TODO: SessionManager not implemented

// Lazy initialization of services
let searchService: SearchService | null = null;
let searchIndexBuilder: SearchIndexBuilder | null = null;

function _getSearchService(): SearchService {
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

function _getSearchIndexBuilder(): SearchIndexBuilder {
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
      encryptionService,
      auditLogger
    );
  }
  return searchIndexBuilder;
}

ipcMain.handle('search', async (_event, query: SearchQuery) => {
  try {
    const searchService = _getSearchService();
    const results = await searchService.search(query);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
});

ipcMain.handle('rebuild-search-index', async () => {
  try {
    const searchIndexBuilder = _getSearchIndexBuilder();
    await searchIndexBuilder.buildIndex();
    return { success: true };
  } catch (error) {
    console.error('Search index rebuild error:', error);
    throw error;
  }
});