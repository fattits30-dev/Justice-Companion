import { describe, it, expect, beforeEach } from 'vitest';
import { LegalAPIService } from './LegalAPIService.js';

describe('LegalAPIService', () => {
  let service: LegalAPIService;

  beforeEach(() => {
    service = new LegalAPIService();
    service.clearCache();
  });

  describe('extractKeywords', () => {
    it('should extract keywords from "Can I be fired for being pregnant?"', async () => {
      const question = 'Can I be fired for being pregnant?';
      const keywords = await service.extractKeywords(question);

      // Should extract legal terms related to employment and pregnancy
      expect(keywords.all.length).toBeGreaterThan(0);
      expect(keywords.legal.length).toBeGreaterThan(0);

      // Should contain key terms
      const allKeywordsStr = keywords.all.join(' ');
      expect(
        allKeywordsStr.includes('fired') ||
          allKeywordsStr.includes('dismissed') ||
          allKeywordsStr.includes('employment'),
      ).toBe(true);

      expect(
        allKeywordsStr.includes('pregnant') ||
          allKeywordsStr.includes('pregnancy') ||
          allKeywordsStr.includes('maternity'),
      ).toBe(true);

      // Should filter out stop words
      expect(keywords.all).not.toContain('can');
      expect(keywords.all).not.toContain('i');
      expect(keywords.all).not.toContain('be');
      expect(keywords.all).not.toContain('for');
    });

    it('should handle housing-related questions', async () => {
      const question = 'My landlord wants to evict me, what are my rights?';
      const keywords = await service.extractKeywords(question);

      const allKeywordsStr = keywords.all.join(' ');
      expect(
        allKeywordsStr.includes('landlord') ||
          allKeywordsStr.includes('eviction') ||
          allKeywordsStr.includes('tenant'),
      ).toBe(true);
    });

    it('should return general keywords when no legal terms found', async () => {
      const question = 'What happens next in this situation?';
      const keywords = await service.extractKeywords(question);

      expect(keywords.all.length).toBeGreaterThan(0);
      expect(keywords.general.length).toBeGreaterThan(0);
    });
  });

  describe('classifyQuestion', () => {
    it('should classify pregnancy discrimination as employment', () => {
      const question = 'Can I be fired for being pregnant?';
      const category = service.classifyQuestion(question);
      expect(category).toBe('employment');
    });

    it('should classify eviction as housing', () => {
      const question = 'My landlord wants to evict me';
      const category = service.classifyQuestion(question);
      expect(category).toBe('housing');
    });

    it('should classify consumer refund as consumer', () => {
      const question = 'Can I get a refund for faulty product?';
      const category = service.classifyQuestion(question);
      expect(category).toBe('consumer');
    });

    it('should default to civil for unknown questions', () => {
      const question = 'What are my general rights?';
      const category = service.classifyQuestion(question);
      expect(category).toBe('civil');
    });
  });

  describe('searchLegalInfo', () => {
    it('should return LegalSearchResults structure', async () => {
      const question = 'Can I be fired for being pregnant?';
      const results = await service.searchLegalInfo(question);

      expect(results).toHaveProperty('legislation');
      expect(results).toHaveProperty('cases');
      expect(results).toHaveProperty('knowledgeBase');
      expect(results).toHaveProperty('cached');
      expect(results).toHaveProperty('timestamp');

      expect(Array.isArray(results.legislation)).toBe(true);
      expect(Array.isArray(results.cases)).toBe(true);
      expect(Array.isArray(results.knowledgeBase)).toBe(true);
      expect(typeof results.cached).toBe('boolean');
      expect(typeof results.timestamp).toBe('number');
    });

    it('should cache results on subsequent calls', async () => {
      const question = 'Can I be fired for being pregnant?';

      // First call
      const results1 = await service.searchLegalInfo(question);
      expect(results1.cached).toBe(false);

      // Second call should be cached
      const results2 = await service.searchLegalInfo(question);
      expect(results2.cached).toBe(true);
      expect(results2.timestamp).toBe(results1.timestamp);
    });

    it('should handle errors gracefully and return empty results', async () => {
      // This will likely fail due to network/API issues, but should not throw
      const question = 'Test question';
      const results = await service.searchLegalInfo(question);

      // Should not throw, should return empty arrays
      expect(Array.isArray(results.legislation)).toBe(true);
      expect(Array.isArray(results.cases)).toBe(true);
      expect(Array.isArray(results.knowledgeBase)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const question = 'Can I be fired for being pregnant?';

      // Create cached entry
      await service.searchLegalInfo(question);
      const results1 = await service.searchLegalInfo(question);
      expect(results1.cached).toBe(true);

      // Clear cache
      service.clearCache();

      // Should not be cached anymore
      const results2 = await service.searchLegalInfo(question);
      expect(results2.cached).toBe(false);
    });
  });
});
