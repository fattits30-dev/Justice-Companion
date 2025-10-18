import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserFactsService } from './UserFactsService';
import { errorLogger } from '../../../utils/error-logger';
import type { UserFact } from '../../../models/UserFact';

// Mock centralized repository initialization
const mockUserFactsRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByCaseId: vi.fn(),
  findByType: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../repositories', () => ({
  getRepositories: vi.fn(() => ({
    userFactsRepository: mockUserFactsRepository,
  })),
  resetRepositories: vi.fn(),
}));

vi.mock('../../../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('UserFactsService', () => {
  let userFactsService: UserFactsService;

  beforeEach(() => {
    userFactsService = new UserFactsService();
    vi.clearAllMocks();
  });

  describe('createUserFact', () => {
    it('should create a user fact with valid input', () => {
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: 'John Doe, age 35, software engineer',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'personal',
        factContent: 'John Doe, age 35, software engineer',
      });

      expect(result).toEqual(mockUserFact);
      expect(mockUserFactsRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        factType: 'personal',
        factContent: 'John Doe, age 35, software engineer',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should create a user fact with different fact types', () => {
      const factTypes: UserFact['factType'][] = ['personal', 'employment', 'financial', 'contact', 'medical', 'other'];

      factTypes.forEach((factType, index) => {
        const mockUserFact: UserFact = {
          id: index + 1,
          caseId: 100,
          factType,
          factContent: `Test fact for ${factType}`,
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        };

        vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

        const result = userFactsService.createUserFact({
          caseId: 100,
          factType,
          factContent: `Test fact for ${factType}`,
        });

        expect(result.factType).toBe(factType);
      });
    });

    it('should throw error if factContent is empty', () => {
      expect(() =>
        userFactsService.createUserFact({
          caseId: 100,
          factType: 'personal',
          factContent: '',
        })
      ).toThrow('User fact content is required');

      expect(() =>
        userFactsService.createUserFact({
          caseId: 100,
          factType: 'personal',
          factContent: '   ',
        })
      ).toThrow('User fact content is required');

      expect(mockUserFactsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if factContent exceeds 5000 characters', () => {
      const longContent = 'a'.repeat(5001);

      expect(() =>
        userFactsService.createUserFact({
          caseId: 100,
          factType: 'personal',
          factContent: longContent,
        })
      ).toThrow('User fact content must be 5000 characters or less');

      expect(mockUserFactsRepository.create).not.toHaveBeenCalled();
    });

    it('should accept factContent exactly 5000 characters', () => {
      const maxContent = 'a'.repeat(5000);
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: maxContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'personal',
        factContent: maxContent,
      });

      expect(result).toEqual(mockUserFact);
      expect(mockUserFactsRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        userFactsService.createUserFact({
          caseId: 100,
          factType: 'personal',
          factContent: 'Test content',
        })
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'createUserFact',
          caseId: 100,
          factType: 'personal',
        })
      );
    });
  });

  describe('getUserFactById', () => {
    it('should return a user fact by id', () => {
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: 'Test fact',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.findById).mockReturnValue(mockUserFact);

      const result = userFactsService.getUserFactById(1);

      expect(result).toEqual(mockUserFact);
      expect(mockUserFactsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if user fact not found', () => {
      vi.mocked(mockUserFactsRepository.findById).mockReturnValue(null);

      const result = userFactsService.getUserFactById(999);

      expect(result).toBeNull();
      expect(mockUserFactsRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => userFactsService.getUserFactById(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getUserFactById', id: 1 })
      );
    });
  });

  describe('getUserFactsByCaseId', () => {
    it('should return all user facts for a case', () => {
      const mockUserFacts: UserFact[] = [
        {
          id: 1,
          caseId: 100,
          factType: 'personal',
          factContent: 'Personal fact 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          factType: 'employment',
          factContent: 'Employment fact 1',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(mockUserFactsRepository.findByCaseId).mockReturnValue(mockUserFacts);

      const result = userFactsService.getUserFactsByCaseId(100);

      expect(result).toEqual(mockUserFacts);
      expect(mockUserFactsRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no user facts exist', () => {
      vi.mocked(mockUserFactsRepository.findByCaseId).mockReturnValue([]);

      const result = userFactsService.getUserFactsByCaseId(999);

      expect(result).toEqual([]);
      expect(mockUserFactsRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => userFactsService.getUserFactsByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getUserFactsByCaseId', caseId: 100 })
      );
    });
  });

  describe('getUserFactsByType', () => {
    it('should return user facts filtered by type', () => {
      const mockUserFacts: UserFact[] = [
        {
          id: 1,
          caseId: 100,
          factType: 'personal',
          factContent: 'Personal fact 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          factType: 'personal',
          factContent: 'Personal fact 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(mockUserFactsRepository.findByType).mockReturnValue(mockUserFacts);

      const result = userFactsService.getUserFactsByType(100, 'personal');

      expect(result).toEqual(mockUserFacts);
      expect(mockUserFactsRepository.findByType).toHaveBeenCalledWith(100, 'personal');
    });

    it('should return empty array if no facts match type', () => {
      vi.mocked(mockUserFactsRepository.findByType).mockReturnValue([]);

      const result = userFactsService.getUserFactsByType(100, 'medical');

      expect(result).toEqual([]);
      expect(mockUserFactsRepository.findByType).toHaveBeenCalledWith(100, 'medical');
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.findByType).mockImplementation(() => {
        throw error;
      });

      expect(() => userFactsService.getUserFactsByType(100, 'personal')).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'getUserFactsByType',
          caseId: 100,
          factType: 'personal',
        })
      );
    });
  });

  describe('updateUserFact', () => {
    it('should update a user fact with valid input', () => {
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'employment',
        factContent: 'Updated employment information',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.update).mockReturnValue(mockUserFact);

      const result = userFactsService.updateUserFact(1, {
        factType: 'employment',
        factContent: 'Updated employment information',
      });

      expect(result).toEqual(mockUserFact);
      expect(mockUserFactsRepository.update).toHaveBeenCalledWith(1, {
        factType: 'employment',
        factContent: 'Updated employment information',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should update only factContent', () => {
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: 'Updated content',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.update).mockReturnValue(mockUserFact);

      const result = userFactsService.updateUserFact(1, {
        factContent: 'Updated content',
      });

      expect(result).toEqual(mockUserFact);
    });

    it('should throw error if factContent is empty string', () => {
      expect(() => userFactsService.updateUserFact(1, { factContent: '' })).toThrow(
        'User fact content cannot be empty'
      );

      expect(() => userFactsService.updateUserFact(1, { factContent: '   ' })).toThrow(
        'User fact content cannot be empty'
      );

      expect(mockUserFactsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if factContent exceeds 5000 characters', () => {
      const longContent = 'a'.repeat(5001);

      expect(() => userFactsService.updateUserFact(1, { factContent: longContent })).toThrow(
        'User fact content must be 5000 characters or less'
      );

      expect(mockUserFactsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if user fact not found', () => {
      vi.mocked(mockUserFactsRepository.update).mockReturnValue(null);

      expect(() => userFactsService.updateUserFact(999, { factContent: 'Test' })).toThrow(
        'User fact not found'
      );

      expect(mockUserFactsRepository.update).toHaveBeenCalledWith(999, { factContent: 'Test' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() => userFactsService.updateUserFact(1, { factContent: 'Test' })).toThrow(
        'Database error'
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'updateUserFact',
          id: 1,
          fields: ['factContent'],
        })
      );
    });
  });

  describe('deleteUserFact', () => {
    it('should delete a user fact successfully', () => {
      vi.mocked(mockUserFactsRepository.delete).mockReturnValue(undefined);

      userFactsService.deleteUserFact(1);

      expect(mockUserFactsRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockUserFactsRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => userFactsService.deleteUserFact(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteUserFact', id: 1 })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in factContent', () => {
      const specialContent = 'Name: "John O\'Reilly" <john@test.com>, Salary: $85,000 & benefits';
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'employment',
        factContent: specialContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'employment',
        factContent: specialContent,
      });

      expect(result.factContent).toBe(specialContent);
    });

    it('should handle unicode characters in factContent', () => {
      const unicodeContent = '姓名：李明 (Lǐ Míng), 职位：工程师 👨‍💻';
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: unicodeContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'personal',
        factContent: unicodeContent,
      });

      expect(result.factContent).toBe(unicodeContent);
    });

    it('should handle newlines and formatting in factContent', () => {
      const formattedContent =
        'Personal Info:\n- Name: John Doe\n- Age: 35\n- Occupation: Engineer';
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'personal',
        factContent: formattedContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'personal',
        factContent: formattedContent,
      });

      expect(result.factContent).toBe(formattedContent);
    });

    it('should handle PII data in factContent', () => {
      const piiContent =
        'SSN: 123-45-6789, DOB: 1990-05-15, Email: john.doe@email.com, Phone: (555) 123-4567';
      const mockUserFact: UserFact = {
        id: 1,
        caseId: 100,
        factType: 'contact',
        factContent: piiContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockUserFactsRepository.create).mockReturnValue(mockUserFact);

      const result = userFactsService.createUserFact({
        caseId: 100,
        factType: 'contact',
        factContent: piiContent,
      });

      expect(result.factContent).toBe(piiContent);
    });
  });
});
