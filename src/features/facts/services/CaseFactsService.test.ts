import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CaseFactsService } from './CaseFactsService';
import { caseFactsRepository } from '../../../repositories/CaseFactsRepository';
import { errorLogger } from '../../../utils/error-logger';
import type { CaseFact } from '../../../models/CaseFact';

// Mock dependencies
vi.mock('../../../repositories/CaseFactsRepository', () => ({
  caseFactsRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByCaseId: vi.fn(),
    findByCategory: vi.fn(),
    findByImportance: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('CaseFactsService', () => {
  let caseFactsService: CaseFactsService;

  beforeEach(() => {
    caseFactsService = new CaseFactsService();
    vi.clearAllMocks();
  });

  describe('createCaseFact', () => {
    it('should create a case fact with valid input', () => {
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'timeline',
        importance: 'high',
        factContent: 'Incident occurred on January 15, 2025',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'timeline',
        importance: 'high',
        factContent: 'Incident occurred on January 15, 2025',
      });

      expect(result).toEqual(mockCaseFact);
      expect(caseFactsRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        factCategory: 'timeline',
        importance: 'high',
        factContent: 'Incident occurred on January 15, 2025',
      });
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Case fact created successfully',
        expect.objectContaining({
          type: 'info',
          caseFactId: 1,
          caseId: 100,
          factCategory: 'timeline',
          importance: 'high',
        }),
      );
    });

    it('should create case facts with different categories', () => {
      const categories = ['timeline', 'evidence', 'witness', 'location', 'communication', 'other'];

      categories.forEach((category, index) => {
        const mockCaseFact: CaseFact = {
          id: index + 1,
          caseId: 100,
          factCategory: category,
          importance: 'medium',
          factContent: `Test fact for ${category}`,
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        };

        vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

        const result = caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: category,
          importance: 'medium',
          factContent: `Test fact for ${category}`,
        });

        expect(result.factCategory).toBe(category);
      });
    });

    it('should create case facts with different importance levels', () => {
      const importanceLevels = ['low', 'medium', 'high', 'critical'];

      importanceLevels.forEach((importance, index) => {
        const mockCaseFact: CaseFact = {
          id: index + 1,
          caseId: 100,
          factCategory: 'evidence',
          importance,
          factContent: `Test fact with ${importance} importance`,
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        };

        vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

        const result = caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: 'evidence',
          importance,
          factContent: `Test fact with ${importance} importance`,
        });

        expect(result.importance).toBe(importance);
      });
    });

    it('should throw error if factContent is empty', () => {
      expect(() =>
        caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: 'timeline',
          importance: 'medium',
          factContent: '',
        }),
      ).toThrow('Case fact content is required');

      expect(() =>
        caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: 'timeline',
          importance: 'medium',
          factContent: '   ',
        }),
      ).toThrow('Case fact content is required');

      expect(caseFactsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if factContent exceeds 5000 characters', () => {
      const longContent = 'a'.repeat(5001);

      expect(() =>
        caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: 'timeline',
          importance: 'medium',
          factContent: longContent,
        }),
      ).toThrow('Case fact content must be 5000 characters or less');

      expect(caseFactsRepository.create).not.toHaveBeenCalled();
    });

    it('should accept factContent exactly 5000 characters', () => {
      const maxContent = 'a'.repeat(5000);
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'evidence',
        importance: 'high',
        factContent: maxContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'evidence',
        importance: 'high',
        factContent: maxContent,
      });

      expect(result).toEqual(mockCaseFact);
      expect(caseFactsRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        caseFactsService.createCaseFact({
          caseId: 100,
          factCategory: 'timeline',
          importance: 'medium',
          factContent: 'Test content',
        }),
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'createCaseFact',
          input: {
            caseId: 100,
            factCategory: 'timeline',
            importance: 'medium',
            factContent: 'Test content',
          },
        }),
      );
    });
  });

  describe('getCaseFactById', () => {
    it('should return a case fact by id', () => {
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'evidence',
        importance: 'high',
        factContent: 'Test fact',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.findById).mockReturnValue(mockCaseFact);

      const result = caseFactsService.getCaseFactById(1);

      expect(result).toEqual(mockCaseFact);
      expect(caseFactsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if case fact not found', () => {
      vi.mocked(caseFactsRepository.findById).mockReturnValue(null);

      const result = caseFactsService.getCaseFactById(999);

      expect(result).toBeNull();
      expect(caseFactsRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => caseFactsService.getCaseFactById(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getCaseFactById', id: 1 }),
      );
    });
  });

  describe('getCaseFactsByCaseId', () => {
    it('should return all case facts for a case', () => {
      const mockCaseFacts: CaseFact[] = [
        {
          id: 1,
          caseId: 100,
          factCategory: 'timeline',
          importance: 'high',
          factContent: 'Timeline fact 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          factCategory: 'evidence',
          importance: 'critical',
          factContent: 'Evidence fact 1',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(caseFactsRepository.findByCaseId).mockReturnValue(mockCaseFacts);

      const result = caseFactsService.getCaseFactsByCaseId(100);

      expect(result).toEqual(mockCaseFacts);
      expect(caseFactsRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no case facts exist', () => {
      vi.mocked(caseFactsRepository.findByCaseId).mockReturnValue([]);

      const result = caseFactsService.getCaseFactsByCaseId(999);

      expect(result).toEqual([]);
      expect(caseFactsRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => caseFactsService.getCaseFactsByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getCaseFactsByCaseId', caseId: 100 }),
      );
    });
  });

  describe('getCaseFactsByCategory', () => {
    it('should return case facts filtered by category', () => {
      const mockCaseFacts: CaseFact[] = [
        {
          id: 1,
          caseId: 100,
          factCategory: 'evidence',
          importance: 'high',
          factContent: 'Evidence fact 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          factCategory: 'evidence',
          importance: 'critical',
          factContent: 'Evidence fact 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(caseFactsRepository.findByCategory).mockReturnValue(mockCaseFacts);

      const result = caseFactsService.getCaseFactsByCategory(100, 'evidence');

      expect(result).toEqual(mockCaseFacts);
      expect(caseFactsRepository.findByCategory).toHaveBeenCalledWith(100, 'evidence');
    });

    it('should return empty array if no facts match category', () => {
      vi.mocked(caseFactsRepository.findByCategory).mockReturnValue([]);

      const result = caseFactsService.getCaseFactsByCategory(100, 'witness');

      expect(result).toEqual([]);
      expect(caseFactsRepository.findByCategory).toHaveBeenCalledWith(100, 'witness');
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.findByCategory).mockImplementation(() => {
        throw error;
      });

      expect(() => caseFactsService.getCaseFactsByCategory(100, 'evidence')).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'getCaseFactsByCategory',
          caseId: 100,
          factCategory: 'evidence',
        }),
      );
    });
  });

  describe('getCaseFactsByImportance', () => {
    it('should return case facts filtered by importance', () => {
      const mockCaseFacts: CaseFact[] = [
        {
          id: 1,
          caseId: 100,
          factCategory: 'timeline',
          importance: 'critical',
          factContent: 'Critical fact 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          factCategory: 'evidence',
          importance: 'critical',
          factContent: 'Critical fact 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(caseFactsRepository.findByImportance).mockReturnValue(mockCaseFacts);

      const result = caseFactsService.getCaseFactsByImportance(100, 'critical');

      expect(result).toEqual(mockCaseFacts);
      expect(caseFactsRepository.findByImportance).toHaveBeenCalledWith(100, 'critical');
    });

    it('should return empty array if no facts match importance', () => {
      vi.mocked(caseFactsRepository.findByImportance).mockReturnValue([]);

      const result = caseFactsService.getCaseFactsByImportance(100, 'low');

      expect(result).toEqual([]);
      expect(caseFactsRepository.findByImportance).toHaveBeenCalledWith(100, 'low');
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.findByImportance).mockImplementation(() => {
        throw error;
      });

      expect(() => caseFactsService.getCaseFactsByImportance(100, 'high')).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'getCaseFactsByImportance',
          caseId: 100,
          importance: 'high',
        }),
      );
    });
  });

  describe('updateCaseFact', () => {
    it('should update a case fact with valid input', () => {
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'witness',
        importance: 'high',
        factContent: 'Updated witness statement',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(caseFactsRepository.update).mockReturnValue(mockCaseFact);

      const result = caseFactsService.updateCaseFact(1, {
        factCategory: 'witness',
        importance: 'high',
        factContent: 'Updated witness statement',
      });

      expect(result).toEqual(mockCaseFact);
      expect(caseFactsRepository.update).toHaveBeenCalledWith(1, {
        factCategory: 'witness',
        importance: 'high',
        factContent: 'Updated witness statement',
      });
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Case fact updated successfully',
        expect.objectContaining({
          type: 'info',
          caseFactId: 1,
        }),
      );
    });

    it('should update only factContent', () => {
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'evidence',
        importance: 'medium',
        factContent: 'Updated content',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(caseFactsRepository.update).mockReturnValue(mockCaseFact);

      const result = caseFactsService.updateCaseFact(1, {
        factContent: 'Updated content',
      });

      expect(result).toEqual(mockCaseFact);
    });

    it('should update only importance', () => {
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'timeline',
        importance: 'critical',
        factContent: 'Original content',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(caseFactsRepository.update).mockReturnValue(mockCaseFact);

      const result = caseFactsService.updateCaseFact(1, {
        importance: 'critical',
      });

      expect(result).toEqual(mockCaseFact);
    });

    it('should throw error if factContent is empty string', () => {
      expect(() =>
        caseFactsService.updateCaseFact(1, { factContent: '' }),
      ).toThrow('Case fact content cannot be empty');

      expect(() =>
        caseFactsService.updateCaseFact(1, { factContent: '   ' }),
      ).toThrow('Case fact content cannot be empty');

      expect(caseFactsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if factContent exceeds 5000 characters', () => {
      const longContent = 'a'.repeat(5001);

      expect(() =>
        caseFactsService.updateCaseFact(1, { factContent: longContent }),
      ).toThrow('Case fact content must be 5000 characters or less');

      expect(caseFactsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if case fact not found', () => {
      vi.mocked(caseFactsRepository.update).mockReturnValue(null);

      expect(() =>
        caseFactsService.updateCaseFact(999, { factContent: 'Test' }),
      ).toThrow('Case fact not found');

      expect(caseFactsRepository.update).toHaveBeenCalledWith(999, { factContent: 'Test' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        caseFactsService.updateCaseFact(1, { factContent: 'Test' }),
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'updateCaseFact',
          id: 1,
          input: { factContent: 'Test' },
        }),
      );
    });
  });

  describe('deleteCaseFact', () => {
    it('should delete a case fact successfully', () => {
      vi.mocked(caseFactsRepository.delete).mockReturnValue(undefined);

      caseFactsService.deleteCaseFact(1);

      expect(caseFactsRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Case fact deleted successfully',
        expect.objectContaining({
          type: 'info',
          caseFactId: 1,
        }),
      );
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(caseFactsRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => caseFactsService.deleteCaseFact(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteCaseFact', id: 1 }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in factContent', () => {
      const specialContent = 'Location: "Main St. & 5th Ave." <coordinates: 40.7128° N, 74.0060° W>';
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'location',
        importance: 'medium',
        factContent: specialContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'location',
        importance: 'medium',
        factContent: specialContent,
      });

      expect(result.factContent).toBe(specialContent);
    });

    it('should handle unicode characters in factContent', () => {
      const unicodeContent = '证人陈述：在案发地点看到嫌疑人 👁️ (Witness testimony in Chinese)';
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'witness',
        importance: 'high',
        factContent: unicodeContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'witness',
        importance: 'high',
        factContent: unicodeContent,
      });

      expect(result.factContent).toBe(unicodeContent);
    });

    it('should handle formatted content with newlines', () => {
      const formattedContent = 'Evidence List:\n1. Document A (dated 2025-01-15)\n2. Photo B (location: scene)\n3. Video C (timestamp: 14:30)';
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'evidence',
        importance: 'critical',
        factContent: formattedContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'evidence',
        importance: 'critical',
        factContent: formattedContent,
      });

      expect(result.factContent).toBe(formattedContent);
    });

    it('should handle dates and timestamps in factContent', () => {
      const dateContent = 'Timeline: 2025-01-15 08:00 AM - Incident occurred; 2025-01-15 09:30 AM - Police arrived; 2025-01-15 10:15 AM - Witness interviewed';
      const mockCaseFact: CaseFact = {
        id: 1,
        caseId: 100,
        factCategory: 'timeline',
        importance: 'high',
        factContent: dateContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(caseFactsRepository.create).mockReturnValue(mockCaseFact);

      const result = caseFactsService.createCaseFact({
        caseId: 100,
        factCategory: 'timeline',
        importance: 'high',
        factContent: dateContent,
      });

      expect(result.factContent).toBe(dateContent);
    });
  });
});
