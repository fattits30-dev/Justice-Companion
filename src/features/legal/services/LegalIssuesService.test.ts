import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegalIssuesService } from './LegalIssuesService';
import { legalIssuesRepository } from '../../../repositories/LegalIssuesRepository';
import { errorLogger } from '../../../utils/error-logger';
import type { LegalIssue } from '../../../models/LegalIssue';

// Mock dependencies
vi.mock('../../../repositories/LegalIssuesRepository', () => ({
  legalIssuesRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByCaseId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Wrongful Termination',
        description: 'Employee was terminated without cause',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        title: 'Wrongful Termination',
        description: 'Employee was terminated without cause',
      });
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Legal issue created successfully',
        expect.objectContaining({
          type: 'info',
          legalIssueId: 1,
          caseId: 100,
        }),
      );
    });

    it('should create a legal issue without description', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Discrimination Claim',
        description: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Discrimination Claim',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should throw error if title is empty', () => {
      expect(() =>
        legalIssuesService.createLegalIssue({ caseId: 100, title: '' }),
      ).toThrow('Legal issue title is required');

      expect(() =>
        legalIssuesService.createLegalIssue({ caseId: 100, title: '   ' }),
      ).toThrow('Legal issue title is required');

      expect(legalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() =>
        legalIssuesService.createLegalIssue({ caseId: 100, title: longTitle }),
      ).toThrow('Legal issue title must be 200 characters or less');

      expect(legalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should accept title exactly 200 characters', () => {
      const maxTitle = 'a'.repeat(200);
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: maxTitle,
        description: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: maxTitle,
      });

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        legalIssuesService.createLegalIssue({
          caseId: 100,
          title: 'Test Title',
          description: longDescription,
        }),
      ).toThrow('Legal issue description must be 10000 characters or less');

      expect(legalIssuesRepository.create).not.toHaveBeenCalled();
    });

    it('should accept description exactly 10000 characters', () => {
      const maxDescription = 'a'.repeat(10000);
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Test Title',
        description: maxDescription,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Test Title',
        description: maxDescription,
      });

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(legalIssuesRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        legalIssuesService.createLegalIssue({
          caseId: 100,
          title: 'Test Title',
        }),
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'createLegalIssue',
          input: { caseId: 100, title: 'Test Title' },
        }),
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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.findById).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.getLegalIssueById(1);

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if legal issue not found', () => {
      vi.mocked(legalIssuesRepository.findById).mockReturnValue(null);

      const result = legalIssuesService.getLegalIssueById(999);

      expect(result).toBeNull();
      expect(legalIssuesRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(legalIssuesRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.getLegalIssueById(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getLegalIssueById', id: 1 }),
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
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          title: 'Issue 2',
          description: 'Description 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(legalIssuesRepository.findByCaseId).mockReturnValue(mockLegalIssues);

      const result = legalIssuesService.getLegalIssuesByCaseId(100);

      expect(result).toEqual(mockLegalIssues);
      expect(legalIssuesRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no legal issues exist', () => {
      vi.mocked(legalIssuesRepository.findByCaseId).mockReturnValue([]);

      const result = legalIssuesService.getLegalIssuesByCaseId(999);

      expect(result).toEqual([]);
      expect(legalIssuesRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(legalIssuesRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.getLegalIssuesByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getLegalIssuesByCaseId', caseId: 100 }),
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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(legalIssuesRepository.update).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.updateLegalIssue(1, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(result).toEqual(mockLegalIssue);
      expect(legalIssuesRepository.update).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
        description: 'Updated description',
      });
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Legal issue updated successfully',
        expect.objectContaining({
          type: 'info',
          legalIssueId: 1,
        }),
      );
    });

    it('should update only title', () => {
      const mockLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Updated Title',
        description: 'Original description',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(legalIssuesRepository.update).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.updateLegalIssue(1, {
        title: 'Updated Title',
      });

      expect(result).toEqual(mockLegalIssue);
    });

    it('should throw error if title is empty string', () => {
      expect(() =>
        legalIssuesService.updateLegalIssue(1, { title: '' }),
      ).toThrow('Legal issue title cannot be empty');

      expect(() =>
        legalIssuesService.updateLegalIssue(1, { title: '   ' }),
      ).toThrow('Legal issue title cannot be empty');

      expect(legalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() =>
        legalIssuesService.updateLegalIssue(1, { title: longTitle }),
      ).toThrow('Legal issue title must be 200 characters or less');

      expect(legalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        legalIssuesService.updateLegalIssue(1, { description: longDescription }),
      ).toThrow('Legal issue description must be 10000 characters or less');

      expect(legalIssuesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if legal issue not found', () => {
      vi.mocked(legalIssuesRepository.update).mockReturnValue(null);

      expect(() =>
        legalIssuesService.updateLegalIssue(999, { title: 'Test' }),
      ).toThrow('Legal issue not found');

      expect(legalIssuesRepository.update).toHaveBeenCalledWith(999, { title: 'Test' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(legalIssuesRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        legalIssuesService.updateLegalIssue(1, { title: 'Test' }),
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'updateLegalIssue',
          id: 1,
          input: { title: 'Test' },
        }),
      );
    });
  });

  describe('deleteLegalIssue', () => {
    it('should delete a legal issue successfully', () => {
      vi.mocked(legalIssuesRepository.delete).mockReturnValue(undefined);

      legalIssuesService.deleteLegalIssue(1);

      expect(legalIssuesRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).toHaveBeenCalledWith(
        'Legal issue deleted successfully',
        expect.objectContaining({
          type: 'info',
          legalIssueId: 1,
        }),
      );
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(legalIssuesRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => legalIssuesService.deleteLegalIssue(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteLegalIssue', id: 1 }),
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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

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
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

      const result = legalIssuesService.createLegalIssue({
        caseId: 100,
        title: 'Test',
        description: descriptionWithNewlines,
      });

      expect(result.description).toBe(descriptionWithNewlines);
    });
  });
});
