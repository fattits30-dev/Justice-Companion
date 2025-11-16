import type Database from "better-sqlite3";
import type { CaseRepository } from "../repositories/CaseRepository.ts";
import type { EvidenceRepository } from "../repositories/EvidenceRepository.ts";
import type { ChatConversationRepository } from "../repositories/ChatConversationRepository.ts";
import type { NotesRepository } from "../repositories/NotesRepository.ts";
import type { CaseStatus } from "../domains/cases/entities/Case.ts";
import type { EncryptionService, EncryptedData } from "./EncryptionService.ts";
import type { AuditLogger } from "./AuditLogger.ts";
import { errorLogger } from "../utils/error-logger.ts";

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sortBy?: "relevance" | "date" | "title";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  caseStatus?: CaseStatus[];
  dateRange?: { from: Date; to: Date };
  entityTypes?: SearchEntityType[];
  tags?: string[];
  caseIds?: number[];
}

export interface SearchResult {
  id: number;
  type: "case" | "evidence" | "document" | "conversation" | "note";
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
  query: SearchQuery;
  executionTime: number;
}

export type SearchEntityType = SearchResult["type"];

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

interface SearchIndexRow {
  entity_id: number;
  entity_type: SearchEntityType;
  title: string;
  content: string | null;
  content_encrypted?: 0 | 1 | null;
  case_id: number | null;
  status?: string | null;
  case_type?: string | null;
  evidence_type?: string | null;
  file_path?: string | null;
  message_count?: number | null;
  is_pinned?: number | null;
  created_at: string;
  rank?: number | null;
}

export class SearchService {
  constructor(
    private readonly db: Database.Database,
    private readonly caseRepo: CaseRepository,
    private readonly evidenceRepo: EvidenceRepository,
    private readonly chatRepo: ChatConversationRepository,
    private readonly notesRepo: NotesRepository,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogger: AuditLogger,
  ) {}

  /**
   * Perform a comprehensive search across all entities
   */
  async search(userId: number, query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    // Log the search for audit purposes
    this.auditLogger.log({
      eventType: "query.paginated",
      resourceType: "search",
      resourceId: "global",
      action: "read",
      userId: userId.toString(),
      details: {
        query: query.query,
        filters: query.filters,
      },
      success: true,
    });

    // Default values
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const entityTypes: SearchEntityType[] = query.filters?.entityTypes ?? [
      "case",
      "evidence",
      "conversation",
      "note",
    ];

    const results: SearchResult[] = [];
    let totalResults = 0;

    try {
      // Build the FTS5 query
      const ftsQuery = this.buildFTSQuery(query.query);

      // Search using FTS5 index
      if (
        entityTypes.includes("case") ||
        entityTypes.includes("evidence") ||
        entityTypes.includes("conversation") ||
        entityTypes.includes("note")
      ) {
        const searchResults = await this.searchWithFTS5(
          userId,
          query.query,
          ftsQuery,
          query.filters,
          entityTypes,
          limit,
          offset,
        );

        results.push(...searchResults.results);
        totalResults = searchResults.total;
      }

      // Sort results
      const sortedResults = this.sortResults(
        results,
        query.sortBy || "relevance",
        query.sortOrder || "desc",
      );

      const executionTime = Date.now() - startTime;

      return {
        results: sortedResults.slice(0, limit),
        total: totalResults,
        hasMore: totalResults > offset + limit,
        query,
        executionTime,
      };
    } catch (error) {
      this.auditLogger.log({
        eventType: "query.paginated",
        resourceType: "search",
        resourceId: "global",
        action: "read",
        userId: userId.toString(),
        details: {
          query: query.query,
          filters: query.filters,
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Search using SQLite FTS5 full-text search
   */
  private async searchWithFTS5(
    userId: number,
    originalQuery: string,
    ftsQuery: string,
    filters: SearchFilters | undefined,
    entityTypes: SearchEntityType[],
    limit: number,
    offset: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const results: SearchResult[] = [];

    const whereConditions: string[] = ["user_id = ?"];
    const params: Array<string | number> = [userId];

    if (entityTypes.length > 0) {
      const placeholders = entityTypes.map(() => "?").join(", ");
      whereConditions.push(`entity_type IN (${placeholders})`);
      params.push(...entityTypes);
    }

    if (filters?.caseIds?.length) {
      const placeholders = filters.caseIds.map(() => "?").join(", ");
      whereConditions.push(`case_id IN (${placeholders})`);
      params.push(...filters.caseIds);
    }

    if (filters?.dateRange) {
      whereConditions.push("created_at >= ? AND created_at <= ?");
      params.push(
        filters.dateRange.from.toISOString(),
        filters.dateRange.to.toISOString(),
      );
    }

    const whereClause =
      whereConditions.length > 0 ? whereConditions.join(" AND ") : "1=1";

    const searchQuery = `
      SELECT
        si.*,
        bm25(search_index) AS rank
      FROM search_index si
      WHERE search_index MATCH ?
        AND ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM search_index
      WHERE search_index MATCH ?
        AND ${whereClause}
    `;

    try {
      const totalResult = this.db
        .prepare(countQuery)
        .get(ftsQuery, ...params) as { total: number };
      const total = totalResult.total;

      const rows = this.db
        .prepare(searchQuery)
        .all(ftsQuery, ...params, limit, offset) as SearchIndexRow[];

      for (const row of rows) {
        const rank = Math.abs(row.rank ?? 0);
        const result = await this.transformSearchResult(
          row,
          rank,
          originalQuery,
        );
        if (result) {
          results.push(result);
        }
      }

      return { results, total };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "SearchService",
          operation: "searchWithFTS5",
          userId,
          ftsQuery,
        },
      );

      return this.fallbackSearch(
        userId,
        originalQuery,
        filters,
        entityTypes,
        limit,
        offset,
      );
    }
  }

  /**
   * Fallback search using LIKE queries when FTS5 is not available
   */
  private async fallbackSearch(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
    entityTypes: SearchEntityType[],
    limit: number,
    offset: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    const results: SearchResult[] = [];
    let total = 0;

    if (entityTypes.includes("case")) {
      const { results: caseResults, count } = await this.collectCaseResults(
        userId,
        query,
        filters,
      );
      results.push(...caseResults);
      total += count;
    }

    if (entityTypes.includes("evidence")) {
      const { results: evidenceResults, count } =
        await this.collectEvidenceResults(userId, query, filters);
      results.push(...evidenceResults);
      total += count;
    }

    if (entityTypes.includes("conversation")) {
      const { results: conversationResults, count } =
        await this.collectConversationResults(userId, query, filters);
      results.push(...conversationResults);
      total += count;
    }

    if (entityTypes.includes("note")) {
      const { results: noteResults, count } = await this.collectNoteResults(
        userId,
        query,
        filters,
      );
      results.push(...noteResults);
      total += count;
    }

    return {
      results: results.slice(offset, offset + limit),
      total,
    };
  }

  private async collectCaseResults(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
  ): Promise<{ results: SearchResult[]; count: number }> {
    const cases = await this.caseRepo.searchCases(userId, query, filters);
    const results = cases.map(
      (caseItem) =>
        ({
          id: caseItem.id,
          type: "case" as const,
          title: caseItem.title,
          excerpt: this.extractExcerpt(caseItem.description ?? "", query),
          relevanceScore: this.calculateRelevance(
            `${caseItem.title} ${caseItem.description ?? ""}`,
            query,
          ),
          createdAt: caseItem.createdAt,
          metadata: {
            status: caseItem.status,
            caseType: caseItem.caseType,
          },
        }) satisfies SearchResult,
    );

    return { results, count: cases.length };
  }

  private async collectEvidenceResults(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
  ): Promise<{ results: SearchResult[]; count: number }> {
    const evidence = await this.evidenceRepo.searchEvidence(
      userId,
      query,
      filters,
    );

    const results: SearchResult[] = [];

    for (const item of evidence) {
      const caseItem = await this.caseRepo.get(item.caseId);
      results.push({
        id: item.id,
        type: "evidence",
        title: item.title,
        excerpt: this.extractExcerpt(item.content ?? "", query),
        relevanceScore: this.calculateRelevance(
          `${item.title} ${item.content ?? ""}`,
          query,
        ),
        caseId: item.caseId,
        caseTitle: caseItem?.title,
        createdAt: item.createdAt,
        metadata: {
          evidenceType: item.evidenceType,
          filePath: item.filePath,
        },
      });
    }

    return { results, count: evidence.length };
  }

  private async collectConversationResults(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
  ): Promise<{ results: SearchResult[]; count: number }> {
    const conversations = await this.chatRepo.searchConversations(
      userId,
      query,
      filters,
    );

    const results: SearchResult[] = [];

    for (const conversation of conversations) {
      const caseItem = conversation.caseId
        ? await this.caseRepo.get(conversation.caseId)
        : null;

      results.push({
        id: conversation.id,
        type: "conversation",
        title: conversation.title,
        excerpt: this.extractExcerpt(conversation.title, query),
        relevanceScore: this.calculateRelevance(conversation.title, query),
        caseId: conversation.caseId ?? undefined,
        caseTitle: caseItem?.title,
        createdAt: conversation.createdAt,
        metadata: {
          messageCount: conversation.messageCount,
        },
      });
    }

    return { results, count: conversations.length };
  }

  private async collectNoteResults(
    userId: number,
    query: string,
    filters: SearchFilters | undefined,
  ): Promise<{ results: SearchResult[]; count: number }> {
    const notes = await this.notesRepo.searchNotes(userId, query, filters);
    const results: SearchResult[] = [];

    for (const note of notes) {
      const caseItem = note.caseId
        ? await this.caseRepo.get(note.caseId)
        : null;

      results.push({
        id: note.id,
        type: "note",
        title: note.title || "Untitled Note",
        excerpt: this.extractExcerpt(note.content, query),
        relevanceScore: this.calculateRelevance(
          `${note.title ?? ""} ${note.content}`,
          query,
        ),
        caseId: note.caseId ?? undefined,
        caseTitle: caseItem?.title,
        createdAt: note.createdAt,
        metadata: {
          isPinned: note.isPinned,
        },
      });
    }

    return { results, count: notes.length };
  }

  /**
   * Transform a search index row to a SearchResult
   */
  private async transformSearchResult(
    row: SearchIndexRow,
    relevanceScore: number,
    searchTerm: string,
  ): Promise<SearchResult | null> {
    try {
      const content = this.resolveContent(row);
      const caseTitle = await this.resolveCaseTitle(row);
      const metadata = this.mapMetadata(row);

      return {
        id: row.entity_id,
        type: row.entity_type,
        title: row.title,
        excerpt: this.extractExcerpt(content, searchTerm),
        relevanceScore,
        caseId: row.case_id ?? undefined,
        caseTitle,
        createdAt: row.created_at,
        metadata,
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "SearchService",
          operation: "transformSearchResult",
          entityType: row?.entity_type,
          entityId: row?.entity_id,
        },
      );
      return null;
    }
  }

  private resolveContent(row: SearchIndexRow): string {
    const rawContent = row.content ?? "";

    if (!row.content_encrypted || typeof row.content !== "string") {
      return rawContent;
    }

    try {
      const encryptedPayload = JSON.parse(row.content) as EncryptedData;
      const decrypted = this.encryptionService.decrypt(encryptedPayload);
      return decrypted ?? rawContent;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "SearchService",
          operation: "transformSearchResult.decrypt",
          entityType: row.entity_type,
          entityId: row.entity_id,
        },
      );
      return rawContent;
    }
  }

  private async resolveCaseTitle(
    row: SearchIndexRow,
  ): Promise<string | undefined> {
    if (typeof row.case_id !== "number") {
      return undefined;
    }

    try {
      const caseItem = await this.caseRepo.get(row.case_id);
      return caseItem?.title ?? undefined;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "SearchService",
          operation: "transformSearchResult.caseTitle",
          entityType: row.entity_type,
          entityId: row.entity_id,
          caseId: row.case_id,
        },
      );
      return undefined;
    }
  }

  private mapMetadata(row: SearchIndexRow): Record<string, unknown> {
    switch (row.entity_type) {
      case "case":
        return this.buildCaseMetadata(row);
      case "evidence":
        return this.buildEvidenceMetadata(row);
      case "conversation":
        return this.buildConversationMetadata(row);
      case "note":
        return this.buildNoteMetadata(row);
      default:
        return {};
    }
  }

  private buildCaseMetadata(row: SearchIndexRow): Record<string, unknown> {
    return {
      ...(row.status ? { status: row.status } : {}),
      ...(row.case_type ? { caseType: row.case_type } : {}),
    };
  }

  private buildEvidenceMetadata(row: SearchIndexRow): Record<string, unknown> {
    return {
      ...(row.evidence_type ? { evidenceType: row.evidence_type } : {}),
      ...(row.file_path ? { filePath: row.file_path } : {}),
    };
  }

  private buildConversationMetadata(
    row: SearchIndexRow,
  ): Record<string, unknown> {
    return row.message_count === undefined || row.message_count === null
      ? {}
      : { messageCount: row.message_count };
  }

  private buildNoteMetadata(row: SearchIndexRow): Record<string, unknown> {
    return row.is_pinned === undefined || row.is_pinned === null
      ? {}
      : { isPinned: Boolean(row.is_pinned) };
  }

  /**
   * Build FTS5 query from user input
   */
  private buildFTSQuery(query: string): string {
    // Escape special characters
    const escaped = query.replaceAll('"', '""').trim();

    // Split into terms
    const terms = escaped.split(/\s+/);

    // Build FTS5 query with prefix matching
    return terms.map((term) => `"${term}"*`).join(" OR ");
  }

  /**
   * Extract an excerpt from content around the query terms
   */
  private extractExcerpt(
    content: string,
    query: string,
    maxLength = 150,
  ): string {
    if (!content) {
      return "";
    }

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
      return (
        content.substring(0, maxLength) +
        (content.length > maxLength ? "..." : "")
      );
    }

    // Extract excerpt around the match
    const start = Math.max(0, firstIndex - 50);
    const end = Math.min(content.length, firstIndex + maxLength - 50);

    let excerpt = content.substring(start, end);

    // Add ellipsis if needed
    if (start > 0) {
      excerpt = "..." + excerpt;
    }
    if (end < content.length) {
      excerpt = excerpt + "...";
    }

    return excerpt;
  }

  /**
   * Calculate relevance score for a text against a query
   */
  private calculateRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    let score = 0;

    if (lowerText.includes(lowerQuery)) {
      score += 10;
    }

    for (const term of queryTerms) {
      const escapedTerm = this.escapeRegexTerm(term);
      const regex = new RegExp(escapedTerm, "g");

      while (regex.exec(lowerText) !== null) {
        score += 2;
      }
    }

    if (lowerText.substring(0, 100).includes(lowerQuery)) {
      score += 5;
    }

    return score;
  }

  private escapeRegexTerm(term: string): string {
    const specials = new Set([
      "\\",
      "^",
      "$",
      ".",
      "|",
      "?",
      "*",
      "+",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
    ]);
    let escaped = "";

    for (const char of term) {
      escaped += specials.has(char) ? `\\${char}` : char;
    }

    return escaped;
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[],
    sortBy: string,
    sortOrder: string,
  ): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "relevance":
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case "date":
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });
  }

  /**
   * Save a search query for later reuse
   */
  async saveSearch(
    userId: number,
    name: string,
    query: SearchQuery,
  ): Promise<SavedSearch> {
    const queryJson = JSON.stringify(query);

    const result = this.db
      .prepare(
        `
      INSERT INTO saved_searches (user_id, name, query_json, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
      )
      .run(userId, name, queryJson);

    this.auditLogger.log({
      eventType: "query.paginated",
      resourceType: "search.saved",
      resourceId: String(result.lastInsertRowid),
      action: "create",
      userId: userId.toString(),
      details: {
        name,
        query,
      },
      success: true,
    });

    return this.db
      .prepare("SELECT * FROM saved_searches WHERE id = ?")
      .get(result.lastInsertRowid) as SavedSearch;
  }

  /**
   * Get all saved searches for a user
   */
  async getSavedSearches(userId: number): Promise<SavedSearch[]> {
    return this.db
      .prepare(
        `
      SELECT * FROM saved_searches
      WHERE user_id = ?
      ORDER BY last_used_at DESC NULLS LAST, created_at DESC
    `,
      )
      .all(userId) as SavedSearch[];
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(userId: number, searchId: number): Promise<void> {
    const result = this.db
      .prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?")
      .run(searchId, userId);

    if (result.changes > 0) {
      this.auditLogger.log({
        eventType: "query.paginated",
        resourceType: "search.saved",
        resourceId: searchId.toString(),
        action: "delete",
        userId: userId.toString(),
        success: true,
      });
    }
  }

  /**
   * Execute a saved search
   */
  async executeSavedSearch(
    userId: number,
    searchId: number,
  ): Promise<SearchResponse> {
    const savedSearch = this.db
      .prepare("SELECT * FROM saved_searches WHERE id = ? AND user_id = ?")
      .get(searchId, userId) as SavedSearch | undefined;

    if (!savedSearch) {
      throw new Error("Saved search not found");
    }

    // Update last used timestamp and increment use count
    this.db
      .prepare(
        `
      UPDATE saved_searches
      SET last_used_at = CURRENT_TIMESTAMP, use_count = use_count + 1
      WHERE id = ?
    `,
      )
      .run(searchId);

    // Execute the saved query
    const query = JSON.parse(savedSearch.queryJson) as SearchQuery;
    return this.search(userId, query);
  }

  /**
   * Get search suggestions based on user's search history
   */
  async getSearchSuggestions(
    userId: number,
    prefix: string,
    limit: number = 5,
  ): Promise<string[]> {
    // This could be enhanced with more sophisticated suggestion logic
    const recentSearches = this.db
      .prepare(
        `
      SELECT DISTINCT query_json
      FROM saved_searches
      WHERE user_id = ? AND query_json LIKE ?
      ORDER BY last_used_at DESC NULLS LAST
      LIMIT ?
    `,
      )
      .all(userId, `%"query":"${prefix}%`, limit) as { query_json: string }[];

    return recentSearches.map((s) => {
      const query = JSON.parse(s.query_json) as SearchQuery;
      return query.query;
    });
  }
}
