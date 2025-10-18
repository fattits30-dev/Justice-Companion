import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegalIssuesService } from './LegalIssuesService';
import { errorLogger } from '../../../utils/error-logger';
import type { LegalIssue } from '../../../models/LegalIssue';

// Mock centralized repository initialization
const mockLegalIssuesRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByCaseId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../repositories', () => ({
  getRepositories: vi.fn(() => ({
    legalIssuesRepository: mockLegalIssuesRepository,
  })),
  resetRepositories: vi.fn(),
}));

vi.mock('../../../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('LegalIssuesService', () => {
  let legalIssuesService: LegalIssuesService;

  beforeEach(() => {
    legalIssuesService = new LegalIssuesService();
    vi.clearAllMocks();
  });

  describe('createLegalIssue', () => {
    it('should create a legal issue with valid input', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Wrongful Termination',
        description: 'Employee was terminated without cause',
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Wrongful Termination',
        description: 'Employee was terminated without cause',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        title: 'Wrongful Termination',
        description: 'Employee was terminated without cause',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should create a legal issue without description', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Discrimination Claim',
        description: null,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Discrimination Claim',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should throw error if title is empty', () => {
      expect(() => legalIssuesService.createLegalIssue({ caseId: 100, title: '' })).toThrow(
        'Legal issue title is required'
      );

      expect(() => legalIssuesService.createLegalIssue({ caseId: 100, title: '   ' })).toThrow(
        'Legal issue title is required'
      );

      expect(mockLegalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() => legalIssuesService.createLegalIssue({ caseId: 100, title: longTitle })).toThrow(
        'Legal issue title must be 200 characters or less'
      );

      expect(mockLegalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should accept title exactly 200 characters', () => {
      const maxTitle = 'a'.repeat(200);
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: maxTitle,
        description: null,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: maxTitle,
      });

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        legalIssuesService.createLegalIssue({
          caseId: 100,
          title: 'Test Title',
          description: longDescription,
        })
      ).toThrow('Legal issue description must be 10000 characters or less');

      expect(mockLegalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should accept description exactly 10000 characters', () => {
      const maxDescription = 'a'.repeat(10000);
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Test Title',
        description: maxDescription,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Test Title',
        description: maxDescription,
      });

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockLegalIssuesRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        legalIssuesService.createLegalIssue({
          caseId: 100,
          title: 'Test Title',
        })
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'createLegalIssue',
          caseId: 100,
          fields: ['title'],
        })
      );
    });
  });

  describe('getLegalIssueById', () => {
    it('should return a legal issue by id', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Test Issue',
        description: 'Test description',
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.findById).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.getLegalIssueById(1);

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if legal issue not found', () => {
      vi.mocked(mockLegalIssuesRepository.findById).mockReturnValue(null);

      const result = legalIssuesService.getLegalIssueById(999);

      expect(result).toBeNull();
      expect(mockLegalIssuesRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockLegalIssuesRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.getLegalIssueById(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getLegalIssueById', id: 1 })
      );
    });
  });

  describe('getLegalIssuesByCaseId', () => {
    it('should return all legal issues for a case', () => {
      const mockLegalIssues: LegalIssue[] = [
        {
          id: 1,
          caseId: 100,
          title: 'Issue 1',
          description: 'Description 1',
          relevantLaw: null,
          guidance: null,
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          title: 'Issue 2',
          description: 'Description 2',
          relevantLaw: null,
          guidance: null,
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(mockLegalIssuesRepository.findByCaseId).mockReturnValue(mockLegalIssues);

      const result = legalIssuesService.getLegalIssuesByCaseId(100);

      expect(result).toEqual(mockLegalIssues);
      expect(mockLegalIssuesRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no legal issues exist', () => {
      vi.mocked(mockLegalIssuesRepository.findByCaseId).mockReturnValue([]);

      const result = legalIssuesService.getLegalIssuesByCaseId(999);

      expect(result).toEqual([]);
      expect(mockLegalIssuesRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockLegalIssuesRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.getLegalIssuesByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getLegalIssuesByCaseId', caseId: 100 })
      );
    });
  });

  describe('updateLegalIssue', () => {
    it('should update a legal issue with valid input', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Updated Title',
        description: 'Updated description',
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.update).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.updateLegalIssue(1, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(mockLegalIssuesRepository.update).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
        description: 'Updated description',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should update only title', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Updated Title',
        description: 'Original description',
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.update).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.updateLegalIssue(1, {
        title: 'Updated Title',
      });

      expect(result).toEqual(mockLegalIssue);
    });

    it('should throw error if title is empty string', () => {
      expect(() => legalIssuesService.updateLegalIssue(1, { title: '' })).toThrow(
        'Legal issue title cannot be empty'
      );

      expect(() => legalIssuesService.updateLegalIssue(1, { title: '   ' })).toThrow(
        'Legal issue title cannot be empty'
      );

      expect(mockLegalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() => legalIssuesService.updateLegalIssue(1, { title: longTitle })).toThrow(
        'Legal issue title must be 200 characters or less'
      );

      expect(mockLegalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        legalIssuesService.updateLegalIssue(1, { description: longDescription })
      ).toThrow('Legal issue description must be 10000 characters or less');

      expect(mockLegalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if legal issue not found', () => {
      vi.mocked(mockLegalIssuesRepository.update).mockReturnValue(null);

      expect(() => legalIssuesService.updateLegalIssue(999, { title: 'Test' })).toThrow(
        'Legal issue not found'
      );

      expect(mockLegalIssuesRepository.update).toHaveBeenCalledWith(999, { title: 'Test' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockLegalIssuesRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.updateLegalIssue(1, { title: 'Test' })).toThrow(
        'Database error'
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'updateLegalIssue',
          id: 1,
          fields: ['title'],
        })
      );
    });
  });

  describe('deleteLegalIssue', () => {
    it('should delete a legal issue successfully', () => {
      vi.mocked(mockLegalIssuesRepository.delete).mockReturnValue(undefined);

      legalIssuesService.deleteLegalIssue(1);

      expect(mockLegalIssuesRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockLegalIssuesRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.deleteLegalIssue(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteLegalIssue', id: 1 })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in title', () => {
      const specialTitle = 'Test with "quotes", \'apostrophes\', & ampersands, <tags>';
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: specialTitle,
        description: null,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: specialTitle,
      });

      expect(result.title).toBe(specialTitle);
    });

    it('should handle unicode characters in title and description', () => {
      const unicodeTitle = '法律問題 Legal Issue 🏛️';
      const unicodeDescription = '测试 unicode 描述 with emoji 📝';
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: unicodeTitle,
        description: unicodeDescription,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: unicodeTitle,
        description: unicodeDescription,
      });

      expect(result.title).toBe(unicodeTitle);
      expect(result.description).toBe(unicodeDescription);
    });

    it('should handle newlines in description', () => {
      const descriptionWithNewlines = 'Line 1\nLine 2\nLine 3';
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Test',
        description: descriptionWithNewlines,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockLegalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Test',
        description: descriptionWithNewlines,
      });

      expect(result.description).toBe(descriptionWithNewlines);
    });
  });
});
