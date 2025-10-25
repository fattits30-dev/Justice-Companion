import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService, type SearchQuery, type SearchFilters } from './SearchService.ts';
import type { Database } from '../db/database.ts';
import type { CaseRepository } from '../repositories/CaseRepository.ts';
import type { EvidenceRepository } from '../repositories/EvidenceRepository.ts';
import type { ChatConversationRepository } from '../repositories/ChatConversationRepository.ts';
import type { NotesRepository } from '../repositories/NotesRepository.ts';
import type { EncryptionService } from './EncryptionService.ts';
import type { AuditLogger } from './AuditLogger.ts';

describe('SearchService', () => {
  let searchService: SearchService;
  let mockDb: Database;
  let mockCaseRepo: CaseRepository;
  let mockEvidenceRepo: EvidenceRepository;
  let mockChatRepo: ChatConversationRepository;
  let mockNotesRepo: NotesRepository;
  let mockEncryptionService: EncryptionService;
  let mockAuditLogger: AuditLogger;

  beforeEach(() => {
    // Create mocks
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
        get: vi.fn().mockReturnValue({ total: 0 }),
        all: vi.fn().mockReturnValue([]),
      }),
    } as any;

    mockCaseRepo = {
      searchCases: vi.fn().mockResolvedValue([]),
      getByUserId: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    } as any;

    mockEvidenceRepo = {
      searchEvidence: vi.fn().mockResolvedValue([]),
      getAllForUser: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    } as any;

    mockChatRepo = {
      searchConversations: vi.fn().mockResolvedValue([]),
      getUserConversations: vi.fn().mockResolvedValue([]),
      getConversation: vi.fn().mockResolvedValue(null),
      getConversationMessages: vi.fn().mockResolvedValue([]),
    } as any;

    mockNotesRepo = {
      searchNotes: vi.fn().mockResolvedValue([]),
      getUserNotes: vi.fn().mockResolvedValue([]),
      getNote: vi.fn().mockResolvedValue(null),
    } as any;

    mockEncryptionService = {
      decrypt: vi.fn().mockResolvedValue('decrypted'),
    } as any;

    mockAuditLogger = {
      log: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create service instance
    searchService = new SearchService(
      mockDb,
      mockCaseRepo,
      mockEvidenceRepo,
      mockChatRepo,
      mockNotesRepo,
      mockEncryptionService,
      mockAuditLogger
    );
  });

  describe('search', () => {
    it('should perform a basic search query', async () => {
      const query: SearchQuery = {
        query: 'test search',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.search(1, query);

      expect(result).toBeDefined();
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.query).toEqual(query);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should search with filters', async () => {
      const filters: SearchFilters = {
        caseStatus: ['active'],
        entityTypes: ['case', 'evidence'],
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31'),
        },
      };

      const query: SearchQuery = {
        query: 'legal',
        filters,
        sortBy: 'date',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      };

      // Mock some search results
      vi.mocked(mockCaseRepo.searchCases).mockResolvedValue([
        {
          id: 1,
          title: 'Legal Case 1',
          description: 'Description with legal terms',
          caseType: 'employment',
          status: 'active',
          userId: 1,
          createdAt: '2024-06-01T10:00:00Z',
          updatedAt: '2024-06-01T10:00:00Z',
        },
      ]);

      const result = await searchService.search(1, query);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        id: 1,
        type: 'case',
        title: 'Legal Case 1',
      });
      expect(mockCaseRepo.searchCases).toHaveBeenCalledWith(1, 'legal', filters);
    });

    it('should handle search errors gracefully', async () => {
      const query: SearchQuery = {
        query: 'error test',
      };

      // Mock an error
      vi.mocked(mockCaseRepo.searchCases).mockRejectedValue(new Error('Database error'));

      const result = await searchService.search(1, query);

      // Should return empty results on error (fallback search)
      expect(result.results).toEqual([]);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'search_query',
        expect.objectContaining({
          userId: 1,
          query: 'error test',
        })
      );
    });
  });

  describe('saveSearch', () => {
    it('should save a search query', async () => {
      const query: SearchQuery = {
        query: 'test',
        filters: {
          caseStatus: ['active'],
        },
      };

      const mockPrepare = vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockReturnValue({
          id: 1,
          userId: 1,
          name: 'My Search',
          queryJson: JSON.stringify(query),
          createdAt: '2024-01-01T10:00:00Z',
          lastUsedAt: null,
          useCount: 0,
        }),
      });
      mockDb.prepare = mockPrepare;

      const result = await searchService.saveSearch(1, 'My Search', query);

      expect(result).toMatchObject({
        id: 1,
        name: 'My Search',
        queryJson: JSON.stringify(query),
      });
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'search_saved',
        expect.objectContaining({
          userId: 1,
          searchId: 1,
          name: 'My Search',
        })
      );
    });
  });

  describe('getSavedSearches', () => {
    it('should retrieve saved searches for a user', async () => {
      const mockSearches = [
        {
          id: 1,
          userId: 1,
          name: 'Search 1',
          queryJson: '{"query":"test1"}',
          createdAt: '2024-01-01T10:00:00Z',
          lastUsedAt: '2024-01-02T10:00:00Z',
          useCount: 5,
        },
        {
          id: 2,
          userId: 1,
          name: 'Search 2',
          queryJson: '{"query":"test2"}',
          createdAt: '2024-01-01T11:00:00Z',
          lastUsedAt: null,
          useCount: 0,
        },
      ];

      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue(mockSearches),
      });
      mockDb.prepare = mockPrepare;

      const result = await searchService.getSavedSearches(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Search 1');
      expect(result[1].name).toBe('Search 2');
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const mockPrepare = vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 1 }),
      });
      mockDb.prepare = mockPrepare;

      await searchService.deleteSavedSearch(1, 5);

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'search_deleted',
        expect.objectContaining({
          userId: 1,
          searchId: 5,
        })
      );
    });
  });

  describe('executeSavedSearch', () => {
    it('should execute a saved search', async () => {
      const savedQuery: SearchQuery = {
        query: 'saved test',
        filters: {
          caseStatus: ['active'],
        },
      };

      const mockPrepare = vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({
          id: 1,
          userId: 1,
          name: 'My Search',
          queryJson: JSON.stringify(savedQuery),
          createdAt: '2024-01-01T10:00:00Z',
          lastUsedAt: null,
          useCount: 0,
        }),
        run: vi.fn().mockReturnValue({ changes: 1 }),
        all: vi.fn().mockReturnValue([]),
      });
      mockDb.prepare = mockPrepare;

      const result = await searchService.executeSavedSearch(1, 1);

      expect(result.query).toEqual(savedQuery);
    });

    it('should throw error for non-existent saved search', async () => {
      const mockPrepare = vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      });
      mockDb.prepare = mockPrepare;

      await expect(searchService.executeSavedSearch(1, 999)).rejects.toThrow('Saved search not found');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions based on prefix', async () => {
      const mockSearches = [
        { query_json: '{"query":"legal advice"}' },
        { query_json: '{"query":"legal representation"}' },
        { query_json: '{"query":"legal rights"}' },
      ];

      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue(mockSearches),
      });
      mockDb.prepare = mockPrepare;

      const suggestions = await searchService.getSearchSuggestions(1, 'legal', 5);

      expect(suggestions).toEqual([
        'legal advice',
        'legal representation',
        'legal rights',
      ]);
    });
  });
});