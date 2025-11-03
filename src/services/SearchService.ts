import type { Database } from '../db/database.ts';
import type { CaseRepository } from '../repositories/CaseRepository.ts';
import type { EvidenceRepository } from '../repositories/EvidenceRepository.ts';
import type { ChatConversationRepository } from '../repositories/ChatConversationRepository.ts';
import type { NotesRepository } from '../repositories/NotesRepository.ts';
import type { CaseStatus } from '../domains/cases/entities/Case.ts';
import type { EncryptionService } from './EncryptionService.ts';
import type { AuditLogger } from './AuditLogger.ts';
import { errorLogger } from '../utils/error-logger.ts';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  caseStatus?: CaseStatus[];
  dateRange?: { from: Date; to: Date };
  entityTypes?: ('case' | 'evidence' | 'document' | 'conversation' | 'note')[];
  tags?: string[];
  caseIds?: number[];
}

export interface SearchResult {
  id: number;
  type: 'case' | 'evidence' | 'document' | 'conversation' | 'note';
  title: string;
  excerpt: string;
  relevanceScore: number;
  caseId?: number;
  caseTitle?: string;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  query: SearchQuery;
  executionTime: number;
}

export interface SavedSearch {
  id: number;
  userId: number;
  name: string;
  queryJson: string;
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
}

export interface CreateSavedSearchInput {
  name: string;
  query: SearchQuery;
}

export class SearchService {
  constructor(
    private db: Database,
    private caseRepo: CaseRepository,
    private evidenceRepo: EvidenceRepository,
    private chatRepo: ChatConversationRepository,
    private notesRepo: NotesRepository,
    private encryptionService: EncryptionService,
    private auditLogger: AuditLogger,
  ) {}

  /**
   * Perform a comprehensive search across all entities
   */
  async search(userId: number, query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    // Log the search for audit purposes
    await this.auditLogger.log('search_query', {
      userId,
      query: query.query,
      filters: query.filters,
    });

    // Default values
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const entityTypes = query.filters?.entityTypes || ['case', 'evidence', 'conversation', 'note'];

    const results: SearchResult[] = [];
    let totalResults = 0;

    try {
      // Build the FTS5 query
      const ftsQuery = this.buildFTSQuery(query.query);

      // Search using FTS5 index
      if (entityTypes.includes('case') || entityTypes.includes('evidence') ||
          entityTypes.includes('conversation') || entityTypes.includes('note')) {

        const searchResults = await this.searchWithFTS5(
          userId,
          ftsQuery,
          query.filters,
          entityTypes,
          limit,
          offset
        );

        results.push(...searchResults.results);
        totalResults = searchResults.total;
      }

      // Sort results
      const sortedResults = this.sortResults(results, query.sortBy || 'relevance', query.sortOrder || 'desc');

      const executionTime = Date.now() - startTime;

      return {
        results: sortedResults.slice(0, limit),
        total: totalResults,
        hasMore: totalResults > offset + limit,
        query,
        executionTime,
      };
    } catch (error) {
      await this.auditLogger.log('search_error', {
        userId,
        query: query.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search using SQLite FTS5 full-text search
   */
  private async searchWithFTS5(
    userId: number,
    ftsQuery: string,
    filters: SearchFilters | undefined,
    entityTypes: string[],
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; total: number }> {
    const results: SearchResult[] = [];

    // Build WHERE clause for filters
    const whereConditions: string[] = [`user_id = ${userId}`];
    const params: any[] = [];

    if (entityTypes.length > 0) {
      const placeholders = entityTypes.map(() => '?').join(',');
      whereConditions.push(`entity_type IN (${placeholders})`);
      params.push(...entityTypes);
    }

    if (filters?.caseIds && filters.caseIds.length > 0) {
      const placeholders = filters.caseIds.map(() => '?').join(',');
      whereConditions.push(`case_id IN (${placeholders})`);
      params.push(...filters.caseIds);
    }

    if (filters?.dateRange) {
      whereConditions.push(`created_at >= ? AND created_at <= ?`);
      params.push(filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString());
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query the search index
    const searchQuery = `
      SELECT
        si.*,
        bm25(search_index) as rank
      FROM search_index si
      WHERE search_index MATCH ?
        AND ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM search_index
      WHERE search_index MATCH ?
        AND ${whereClause}
    `;

    try {
      // Get total count
      const countResult = this.db.prepare(countQuery).get(ftsQuery, ...params) as { total: number };
      const total = countResult.total;

      // Get search results
      const searchResults = this.db.prepare(searchQuery).all(ftsQuery, ...params, limit, offset) as any[];

      // Transform results
      for (const row of searchResults) {
        const result = await this.transformSearchResult(row, Math.abs(row.rank));
        if (result) {
          results.push(result);
        }
      }

      return { results, total };
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'SearchService',
        operation: 'searchWithFTS5',
        userId,
        ftsQuery,
      });
      // Fallback to basic search if FTS5 fails
      return this.fallbackSearch(userId, ftsQuery, filters, entityTypes, limit, offset);
    }
  }

  /**
   * Fallback search using LIKE queries when FTS5 is not available
   */
  private async fallbackSearch(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
    entityTypes: string[],
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; total: number }> {
    const results: SearchResult[] = [];
    let total = 0;

    // Search cases
    if (entityTypes.includes('case')) {
      const cases = await this.caseRepo.searchCases(userId, query, filters);
      for (const caseItem of cases) {
        results.push({
          id: caseItem.id,
          type: 'case',
          title: caseItem.title,
          excerpt: this.extractExcerpt(caseItem.description || '', query),
          relevanceScore: this.calculateRelevance(caseItem.title + ' ' + (caseItem.description || ''), query),
          createdAt: caseItem.createdAt,
          metadata: {
            status: caseItem.status,
            caseType: caseItem.caseType,
          },
        });
      }
      total += cases.length;
    }

    // Search evidence
    if (entityTypes.includes('evidence')) {
      const evidence = await this.evidenceRepo.searchEvidence(userId, query, filters);
      for (const item of evidence) {
        const caseItem = await this.caseRepo.get(item.caseId);
        results.push({
          id: item.id,
          type: 'evidence',
          title: item.title,
          excerpt: this.extractExcerpt(item.content || '', query),
          relevanceScore: this.calculateRelevance(item.title + ' ' + (item.content || ''), query),
          caseId: item.caseId,
          caseTitle: caseItem?.title,
          createdAt: item.createdAt,
          metadata: {
            evidenceType: item.evidenceType,
            filePath: item.filePath,
          },
        });
      }
      total += evidence.length;
    }

    // Search conversations
    if (entityTypes.includes('conversation')) {
      const conversations = await this.chatRepo.searchConversations(userId, query, filters);
      for (const conv of conversations) {
        const caseItem = conv.caseId ? await this.caseRepo.get(conv.caseId) : null;
        results.push({
          id: conv.id,
          type: 'conversation',
          title: conv.title,
          excerpt: this.extractExcerpt(conv.title, query),
          relevanceScore: this.calculateRelevance(conv.title, query),
          caseId: conv.caseId || undefined,
          caseTitle: caseItem?.title,
          createdAt: conv.createdAt,
          metadata: {
            messageCount: conv.messageCount,
          },
        });
      }
      total += conversations.length;
    }

    // Search notes
    if (entityTypes.includes('note')) {
      const notes = await this.notesRepo.searchNotes(userId, query, filters);
      for (const note of notes) {
        const caseItem = note.caseId ? await this.caseRepo.get(note.caseId) : null;
        results.push({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled Note',
          excerpt: this.extractExcerpt(note.content, query),
          relevanceScore: this.calculateRelevance((note.title || '') + ' ' + note.content, query),
          caseId: note.caseId || undefined,
          caseTitle: caseItem?.title,
          createdAt: note.createdAt,
          metadata: {
            isPinned: note.isPinned,
          },
        });
      }
      total += notes.length;
    }

    return {
      results: results.slice(offset, offset + limit),
      total,
    };
  }

  /**
   * Transform a search index row to a SearchResult
   */
  private async transformSearchResult(row: any, relevanceScore: number): Promise<SearchResult | null> {
    try {
      let metadata: Record<string, any> = {};
      let caseTitle: string | undefined;

      // Decrypt content if needed
      if (row.content_encrypted) {
        row.content = await this.encryptionService.decrypt(row.content);
      }

      // Get case title if applicable
      if (row.case_id) {
        const caseItem = await this.caseRepo.get(row.case_id);
        caseTitle = caseItem?.title;
      }

      // Build metadata based on entity type
      switch (row.entity_type) {
        case 'case':
          metadata = {
            status: row.status,
            caseType: row.case_type,
          };
          break;
        case 'evidence':
          metadata = {
            evidenceType: row.evidence_type,
            filePath: row.file_path,
          };
          break;
        case 'conversation':
          metadata = {
            messageCount: row.message_count,
          };
          break;
        case 'note':
          metadata = {
            isPinned: row.is_pinned,
          };
          break;
      }

      return {
        id: row.entity_id,
        type: row.entity_type,
        title: row.title,
        excerpt: this.extractExcerpt(row.content || '', row.title),
        relevanceScore,
        caseId: row.case_id,
        caseTitle,
        createdAt: row.created_at,
        metadata,
      };
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'SearchService',
        operation: 'transformSearchResult',
        entityType: row?.entity_type,
        entityId: row?.entity_id,
      });
      return null;
    }
  }

  /**
   * Build FTS5 query from user input
   */
  private buildFTSQuery(query: string): string {
    // Escape special characters
    const escaped = query
      .replace(/"/g, '""')
      .trim();

    // Split into terms
    const terms = escaped.split(/\s+/);

    // Build FTS5 query with prefix matching
    return terms.map(term => `"${term}"*`).join(' OR ');
  }

  /**
   * Extract an excerpt from content around the query terms
   */
  private extractExcerpt(content: string, query: string, maxLength: number = 150): string {
    if (!content) {return '';}

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/);

    // Find the first occurrence of any query term
    let firstIndex = -1;
    for (const term of queryTerms) {
      const index = lowerContent.indexOf(term);
      if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
        firstIndex = index;
      }
    }

    if (firstIndex === -1) {
      // No match found, return beginning of content
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Extract excerpt around the match
    const start = Math.max(0, firstIndex - 50);
    const end = Math.min(content.length, firstIndex + maxLength - 50);

    let excerpt = content.substring(start, end);

    // Add ellipsis if needed
    if (start > 0) {excerpt = '...' + excerpt;}
    if (end < content.length) {excerpt = excerpt + '...';}

    return excerpt;
  }

  /**
   * Calculate relevance score for a text against a query
   */
  private calculateRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/);

    let score = 0;

    // Check for exact match
    if (lowerText.includes(lowerQuery)) {
      score += 10;
    }

    // Check for individual terms
    for (const term of queryTerms) {
      const occurrences = (lowerText.match(new RegExp(term, 'g')) || []).length;
      score += occurrences * 2;
    }

    // Boost for title matches
    if (lowerText.substring(0, 100).includes(lowerQuery)) {
      score += 5;
    }

    return score;
  }

  /**
   * Sort search results
   */
  private sortResults(results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }

  /**
   * Save a search query for later reuse
   */
  async saveSearch(userId: number, name: string, query: SearchQuery): Promise<SavedSearch> {
    const queryJson = JSON.stringify(query);

    const result = this.db.prepare(`
      INSERT INTO saved_searches (user_id, name, query_json, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(userId, name, queryJson);

    await this.auditLogger.log('search_saved', {
      userId,
      searchId: result.lastInsertRowid,
      name,
    });

    return this.db.prepare('SELECT * FROM saved_searches WHERE id = ?')
      .get(result.lastInsertRowid) as SavedSearch;
  }

  /**
   * Get all saved searches for a user
   */
  async getSavedSearches(userId: number): Promise<SavedSearch[]> {
    return this.db.prepare(`
      SELECT * FROM saved_searches
      WHERE user_id = ?
      ORDER BY last_used_at DESC NULLS LAST, created_at DESC
    `).all(userId) as SavedSearch[];
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(userId: number, searchId: number): Promise<void> {
    const result = this.db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?')
      .run(searchId, userId);

    if (result.changes > 0) {
      await this.auditLogger.log('search_deleted', {
        userId,
        searchId,
      });
    }
  }

  /**
   * Execute a saved search
   */
  async executeSavedSearch(userId: number, searchId: number): Promise<SearchResponse> {
    const savedSearch = this.db.prepare('SELECT * FROM saved_searches WHERE id = ? AND user_id = ?')
      .get(searchId, userId) as SavedSearch | undefined;

    if (!savedSearch) {
      throw new Error('Saved search not found');
    }

    // Update last used timestamp and increment use count
    this.db.prepare(`
      UPDATE saved_searches
      SET last_used_at = CURRENT_TIMESTAMP, use_count = use_count + 1
      WHERE id = ?
    `).run(searchId);

    // Execute the saved query
    const query = JSON.parse(savedSearch.queryJson) as SearchQuery;
    return this.search(userId, query);
  }

  /**
   * Get search suggestions based on user's search history
   */
  async getSearchSuggestions(userId: number, prefix: string, limit: number = 5): Promise<string[]> {
    // This could be enhanced with more sophisticated suggestion logic
    const recentSearches = this.db.prepare(`
      SELECT DISTINCT query_json
      FROM saved_searches
      WHERE user_id = ? AND query_json LIKE ?
      ORDER BY last_used_at DESC NULLS LAST
      LIMIT ?
    `).all(userId, `%"query":"${prefix}%`, limit) as { query_json: string }[];

    return recentSearches.map(s => {
      const query = JSON.parse(s.query_json) as SearchQuery;
      return query.query;
    });
  }
}