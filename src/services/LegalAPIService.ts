import { errorLogger } from '../utils/error-logger.js';
import { XMLParser } from 'fast-xml-parser';
import type {
  LegislationResult,
  CaseResult,
  KnowledgeEntry,
} from '../types/ai.js';

// ============================================================================
// ADDITIONAL TYPE DEFINITIONS
// ============================================================================

/**
 * Combined search results from all APIs
 */
export interface LegalSearchResults {
  legislation: LegislationResult[];
  cases: CaseResult[];
  knowledgeBase: KnowledgeEntry[];
  cached: boolean;
  timestamp: number;
}

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Extracted keywords from natural language question
 */
export interface ExtractedKeywords {
  all: string[];
  legal: string[];
  general: string[];
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const API_CONFIG = {
  LEGISLATION_BASE_URL: 'https://www.legislation.gov.uk',
  CASELAW_BASE_URL: 'https://caselaw.nationalarchives.gov.uk',
  TIMEOUT_MS: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_HOURS: 24,
  EMPTY_CACHE_TTL_HOURS: 1,
  MAX_CACHE_SIZE: 100,
} as const;

/**
 * Legal terms dictionary for keyword extraction
 */
const LEGAL_TERMS_DICTIONARY = {
  employment: [
    'fired',
    'dismissed',
    'redundancy',
    'employment',
    'unfair dismissal',
    'constructive dismissal',
    'contract',
    'wages',
    'salary',
    'notice period',
    'disciplinary',
    'grievance',
    'maternity',
    'paternity',
    'pregnant',
    'pregnancy',
  ],
  discrimination: [
    'discrimination',
    'protected characteristic',
    'harassment',
    'victimisation',
    'equality',
    'race',
    'gender',
    'disability',
    'age',
    'religion',
    'sexual orientation',
  ],
  housing: [
    'eviction',
    'tenant',
    'landlord',
    'rent',
    'housing',
    'tenancy',
    'deposit',
    'repairs',
    'notice',
    'possession',
    'section 21',
    'section 8',
  ],
  family: [
    'custody',
    'divorce',
    'child',
    'maintenance',
    'contact',
    'residence',
    'separation',
    'matrimonial',
    'parental responsibility',
  ],
  consumer: [
    'refund',
    'warranty',
    'guarantee',
    'faulty',
    'consumer rights',
    'sale of goods',
    'services',
    'complaint',
    'product',
  ],
  criminal: [
    'arrest',
    'charge',
    'bail',
    'police',
    'prosecution',
    'defence',
    'sentence',
    'conviction',
    'caution',
  ],
} as const;

type AtomLink = {
  '@_rel'?: string;
  '@_href'?: string;
};

type AtomEntry = {
  title?: unknown;
  summary?: unknown;
  content?: unknown;
  updated?: unknown;
  published?: unknown;
  link?: unknown;
};

/**
 * Map legal categories to relevant court/tribunal codes for better case law filtering
 * Based on Find Case Law API court codes
 */
const CATEGORY_TO_COURT_MAP: Record<string, string[]> = {
  employment: [
    'eat', // Employment Appeal Tribunal
    'ukeat', // UK Employment Appeal Tribunal (alternative code)
  ],
  discrimination: [
    'eat', // Employment Appeal Tribunal (handles many discrimination cases)
    'uksc', // Supreme Court (landmark discrimination cases)
    'ewca', // Court of Appeal
  ],
  housing: [
    'ukut', // Upper Tribunal (housing cases)
    'ewca', // Court of Appeal
  ],
  family: [
    'ewfc', // Family Court
    'ewca', // Court of Appeal (Family Division)
    'uksc', // Supreme Court (landmark family law)
  ],
  consumer: [
    'ewca', // Court of Appeal
    'ewhc', // High Court
  ],
  criminal: [
    'uksc', // Supreme Court
    'ewca', // Court of Appeal (Criminal Division)
    'ewhc', // High Court
  ],
  civil: [
    'ewca', // Court of Appeal (Civil Division)
    'ewhc', // High Court
    'uksc', // Supreme Court
  ],
};

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'can',
  'for',
  'from',
  'has',
  'he',
  'she',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'i',
  'my',
  'me',
  'am',
  'being',
  'been',
  'do',
  'does',
  'did',
  'would',
  'could',
  'should',
  'may',
  'might',
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if error is network-related
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.name === 'AbortError' ||
      error.name === 'TypeError'
    );
  }
  return false;
}

/**
 * Determine if request should be retried
 */
function shouldRetry(error: unknown, attempt: number): boolean {
  if (attempt >= API_CONFIG.MAX_RETRIES) {
    return false;
  }

  if (isNetworkError(error)) {
    return true;
  }

  return false;
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// LEGAL API SERVICE CLASS
// ============================================================================

/**
 * Service for interacting with UK Legal APIs
 * Handles legislation.gov.uk and Find Case Law API with caching and error handling
 */
export class LegalAPIService {
  private cache: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.cache = new Map();
    this.loadCacheFromStorage();
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Search for legal information based on natural language question
   * Handles offline gracefully and uses aggressive caching
   */
  async searchLegalInfo(question: string): Promise<LegalSearchResults> {
    try {
      // Extract keywords from question
      const keywords = await this.extractKeywords(question);

      // Classify question to determine relevant courts
      const category = this.classifyQuestion(question);

      errorLogger.logError('Legal API search initiated', {
        question,
        keywords: keywords.all,
        category,
      });

      // Check cache first
      const cacheKey = this.generateCacheKey('search', [
        ...keywords.all,
        category,
      ]);
      const cached = this.getCached<LegalSearchResults>(cacheKey);

      if (cached) {
        errorLogger.logError('Returning cached results', { cacheKey });
        return { ...cached, cached: true };
      }

      // Fetch from APIs in parallel
      const [legislation, cases, knowledgeBase] = await Promise.all([
        this.searchLegislation(keywords.all),
        this.searchCaseLaw(keywords.all, category), // Pass category for court filtering
        this.searchKnowledgeBase(keywords.all),
      ]);

      const results: LegalSearchResults = {
        legislation,
        cases,
        knowledgeBase,
        cached: false,
        timestamp: Date.now(),
      };

      // Cache results
      const ttl =
        legislation.length > 0 || cases.length > 0
          ? API_CONFIG.CACHE_TTL_HOURS
          : API_CONFIG.EMPTY_CACHE_TTL_HOURS;

      this.setCache(cacheKey, results, ttl);

      errorLogger.logError('Legal API search completed', {
        legislationCount: legislation.length,
        casesCount: cases.length,
        knowledgeBaseCount: knowledgeBase.length,
        category,
      });

      return results;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'searchLegalInfo',
        question,
      });

      // Return empty results on error (graceful degradation)
      return {
        legislation: [],
        cases: [],
        knowledgeBase: [],
        cached: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.saveCacheToStorage();
    errorLogger.logError('Legal API cache cleared', {});
  }

  /**
   * Classify question type for targeted API queries
   * Returns category: employment, housing, consumer, civil, etc.
   */
  classifyQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();

    // Check each category
    for (const [category, terms] of Object.entries(LEGAL_TERMS_DICTIONARY)) {
      for (const term of terms) {
        if (lowerQuestion.includes(term)) {
          return category;
        }
      }
    }

    // No legal terms found - this is a general conversation
    return 'general';
  }

  // ==========================================================================
  // KEYWORD EXTRACTION
  // ==========================================================================

  /**
   * Extract keywords from natural language question
   * Uses simple NLP to identify legal terms, acts, and key concepts
   */
  async extractKeywords(question: string): Promise<ExtractedKeywords> {
    const words = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    const legalTerms: string[] = [];
    const allTerms = Object.values(LEGAL_TERMS_DICTIONARY).flat();

    // Match against legal dictionary
    for (const word of words) {
      for (const term of allTerms) {
        if (
          term.includes(word) ||
          word.includes(term) ||
          question.toLowerCase().includes(term)
        ) {
          if (!legalTerms.includes(term)) {
            legalTerms.push(term);
          }
        }
      }
    }

    // Keep original meaningful words as general keywords
    const generalKeywords = words.filter((word) => !legalTerms.includes(word));

    // Combine for search (deduplicated)
    const allKeywords = Array.from(new Set([...legalTerms, ...generalKeywords]));

    errorLogger.logError('Keywords extracted', {
      all: allKeywords,
      legal: legalTerms,
      general: generalKeywords,
    });

    return {
      all: allKeywords,
      legal: legalTerms,
      general: generalKeywords,
    };
  }

  // ==========================================================================
  // API CLIENTS
  // ==========================================================================

  /**
   * Search legislation.gov.uk API
   * Queries UK statutes, regulations, and statutory instruments
   */
  async searchLegislation(keywords: string[]): Promise<LegislationResult[]> {
    try {
      const query = keywords.join(' ');
      // Use Atom feed endpoint for UK Public General Acts
      const url = `${API_CONFIG.LEGISLATION_BASE_URL}/ukpga/data.feed?title=${encodeURIComponent(query)}`;

      errorLogger.logError('Searching legislation.gov.uk', {
        type: 'info',
        url,
        keywords,
      });

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Legislation API returned ${response.status}`);
      }

      const xmlText = await response.text();

      // Parse Atom XML response
      return this.parseAtomFeedToLegislation(xmlText, query);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'searchLegislation',
        keywords,
        isOffline: isNetworkError(error),
      });
      return [];
    }
  }

  /**
   * Search Find Case Law API
   * Queries tribunal decisions, court judgments, and precedents with intelligent court filtering
   */
  async searchCaseLaw(
    keywords: string[],
    category: string = 'general',
  ): Promise<CaseResult[]> {
    try {
      // Build improved query with quoted phrases for multi-word terms
      const queryTerms = keywords.map((term) => {
        // Quote multi-word terms for exact phrase matching
        return term.includes(' ') ? `"${term}"` : term;
      });
      const query = queryTerms.join(' ');

      // Build URL with court filtering if category matches
      let url = `${API_CONFIG.CASELAW_BASE_URL}/atom.xml?query=${encodeURIComponent(query)}`;

      // Add court filtering based on question category
      const relevantCourts = CATEGORY_TO_COURT_MAP[category];
      if (relevantCourts && relevantCourts.length > 0) {
        // API supports multiple court parameters
        const courtParams = relevantCourts
          .map((court) => `court=${court}`)
          .join('&');
        url += `&${courtParams}`;
      }

      errorLogger.logError('Searching Find Case Law', {
        type: 'info',
        url,
        keywords,
        category,
        courts: relevantCourts,
      });

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Case Law API returned ${response.status}`);
      }

      const xmlText = await response.text();

      // Parse Atom XML response
      return this.parseAtomFeedToCaseLaw(xmlText, query);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'searchCaseLaw',
        keywords,
        category,
        isOffline: isNetworkError(error),
      });
      return [];
    }
  }

  /**
   * Search internal knowledge base
   * Queries cached FAQs, guides, and common scenarios
   */
  async searchKnowledgeBase(keywords: string[]): Promise<KnowledgeEntry[]> {
    try {
      errorLogger.logError('Searching knowledge base', {
        keywords,
      });

      // FUTURE ENHANCEMENT: Implement knowledge base integration
      // For now, return empty array
      return [];
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'searchKnowledgeBase',
        keywords,
      });
      return [];
    }
  }

  // ==========================================================================
  // HTTP CLIENT WITH RETRY LOGIC
  // ==========================================================================

  /**
   * Fetch with automatic retry and timeout handling
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    attempt: number = 0,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Justice Companion/1.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (shouldRetry(error, attempt)) {
        const delay = getRetryDelay(attempt);
        errorLogger.logError(`Retrying request (attempt ${attempt + 1})`, {
          url,
          delay,
        });

        await sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  // ==========================================================================
  // RESPONSE PARSERS
  // ==========================================================================

  /**
   * Parse Atom XML feed to legislation results
   * Atom format: <feed><entry><title>, <link>, <summary>, etc.
   */
  private parseAtomFeedToLegislation(xmlText: string, _query: string): LegislationResult[] {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const xmlDoc = parser.parse(xmlText) as unknown;

      const entries = this.normalizeAtomEntries(this.extractFeedEntries(xmlDoc));
      const results: LegislationResult[] = [];

      entries.slice(0, 5).forEach((entry, index) => {
        const title = this.getTextContent(entry.title) || 'Unknown';
        const summary =
          this.getTextContent(entry.summary) ||
          this.getTextContent(entry.content) ||
          'No summary available';

        const link = this.extractLinkHref(entry.link);

        // Extract section from title if present (e.g., "Employment Rights Act 1996 Section 94")
        const sectionMatch = title.match(/Section (\d+[A-Z]?)/i);
        const section = sectionMatch ? sectionMatch[0] : undefined;

        results.push({
          title: title.trim(),
          section,
          content: summary.trim().substring(0, 500), // Limit content length
          url: link,
          relevance: 1.0 - index * 0.1, // Simple relevance scoring
        });
      });

      return results;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'parseAtomFeedToLegislation',
      });
      return [];
    }
  }

  /**
   * Parse Atom XML feed to case law results
   * Atom format: <feed><entry><title>, <link>, <summary>, etc.
   */
  private parseAtomFeedToCaseLaw(xmlText: string, _query: string): CaseResult[] {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const xmlDoc = parser.parse(xmlText) as unknown;

      const entries = this.normalizeAtomEntries(this.extractFeedEntries(xmlDoc));
      const results: CaseResult[] = [];

      entries.slice(0, 5).forEach((entry, index) => {
        const title = this.getTextContent(entry.title) || 'Unknown Case';
        const summary =
          this.getTextContent(entry.summary) ||
          this.getTextContent(entry.content) ||
          'No summary available';
        const dateStr =
          this.getTextContent(entry.updated) ||
          this.getTextContent(entry.published) ||
          new Date().toISOString();

        const link = this.extractLinkHref(entry.link);

        // Extract court from title or use default
        const courtMatch = title.match(/\[(.*?)\]/);
        const court = courtMatch ? courtMatch[1] : 'UK Court';

        results.push({
          citation: title.trim(),
          court,
          date: dateStr.split('T')[0], // ISO date format
          summary: summary.trim().substring(0, 500), // Limit summary length
          outcome: undefined, // Not typically in atom feed
          url: link,
          relevance: 1.0 - index * 0.1, // Simple relevance scoring
        });
      });

      return results;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'parseAtomFeedToCaseLaw',
      });
      return [];
    }
  }

  /**
   * Helper: Extract text content from XML parser result
   * Handles both simple strings and objects with #text property
   */
  private getTextContent(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (this.isTextNode(value)) {
      const textValue = value['#text'];
      if (typeof textValue === 'string') {
        return textValue;
      }
      if (typeof textValue === 'number' || typeof textValue === 'boolean') {
        return textValue.toString();
      }
    }
    return '';
  }

  private normalizeAtomEntries(rawEntries: unknown): AtomEntry[] {
    if (Array.isArray(rawEntries)) {
      return rawEntries
        .filter((entry): entry is Record<string, unknown> => this.isRecord(entry))
        .map((entry) => this.toAtomEntry(entry));
    }

    if (this.isRecord(rawEntries)) {
      return [this.toAtomEntry(rawEntries)];
    }

    return [];
  }

  private toAtomEntry(entry: Record<string, unknown>): AtomEntry {
    return {
      title: entry.title,
      summary: entry.summary,
      content: entry.content,
      updated: entry.updated,
      published: entry.published,
      link: entry.link,
    };
  }

  private extractFeedEntries(xmlDoc: unknown): unknown {
    if (!this.isRecord(xmlDoc)) {
      return [];
    }
    const feed = (xmlDoc).feed;
    if (!this.isRecord(feed)) {
      return [];
    }
    return (feed).entry ?? [];
  }

  private extractLinkHref(linkValue: unknown): string {
    if (Array.isArray(linkValue)) {
      const typedLinks = linkValue.filter((item): item is AtomLink => this.isAtomLink(item));
      if (typedLinks.length === 0) {
        return '';
      }
      const preferred = typedLinks.find((item) => item['@_rel'] === 'alternate');
      const target = preferred ?? typedLinks[0];
      return target['@_href'] ?? '';
    }

    if (this.isAtomLink(linkValue)) {
      return linkValue['@_href'] ?? '';
    }

    return '';
  }

  private isAtomLink(value: unknown): value is AtomLink {
    return this.isRecord(value) && ('@_href' in value || '@_rel' in value);
  }

  private isTextNode(value: unknown): value is { '#text'?: unknown } & Record<string, unknown> {
    return this.isRecord(value) && '#text' in value;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  // ==========================================================================
  // CACHE LAYER
  // ==========================================================================

  /**
   * Generate cache key from prefix and parameters
   */
  private generateCacheKey(prefix: string, params: string[]): string {
    const sortedParams = params.sort().join(',');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data if valid
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveCacheToStorage();
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache with TTL
   */
  private setCache<T>(key: string, data: T, ttlHours: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    };

    this.cache.set(key, entry);

    // Enforce cache size limit
    if (this.cache.size > API_CONFIG.MAX_CACHE_SIZE) {
      this.evictOldestCache();
    }

    this.saveCacheToStorage();
  }

  /**
   * Evict oldest cache entries when limit exceeded
   */
  private evictOldestCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Load cache from localStorage (browser) or file (Electron)
   */
  private loadCacheFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('legalAPICache');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.cache = new Map(Object.entries(parsed));

          errorLogger.logError('Cache loaded from localStorage', {
            entries: this.cache.size,
          });
        }
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'loadCacheFromStorage',
      });
    }
  }

  /**
   * Save cache to localStorage (browser) or file (Electron)
   */
  private saveCacheToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const cacheObject = Object.fromEntries(this.cache);
        localStorage.setItem('legalAPICache', JSON.stringify(cacheObject));
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'saveCacheToStorage',
      });
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance for app-wide use
 */
export const legalAPIService = new LegalAPIService();
