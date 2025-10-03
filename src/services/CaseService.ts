import { caseRepository } from '../repositories/CaseRepository';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case';
import { errorLogger } from '../utils/error-logger';

export class CaseService {
  /**
   * Create a new case with validation
   */
  createCase(input: CreateCaseInput): Case {
    try {
      // Validate input
      if (!input.title || input.title.trim().length === 0) {
        throw new Error('Case title is required');
      }

      if (input.title.length > 200) {
        throw new Error('Case title must be 200 characters or less');
      }

      const createdCase = caseRepository.create(input);

      errorLogger.logError('Case created successfully', {
        type: 'info',
        caseId: createdCase.id,
      });

      return createdCase;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'createCase', input });
      throw error;
    }
  }

  /**
   * Get case by ID
   */
  getCaseById(id: number): Case | null {
    try {
      return caseRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getCaseById', id });
      throw error;
    }
  }

  /**
   * Get all cases, optionally filtered by status
   */
  getAllCases(status?: CaseStatus): Case[] {
    try {
      return caseRepository.findAll(status);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getAllCases', status });
      throw error;
    }
  }

  /**
   * Update case with validation
   */
  updateCase(id: number, input: UpdateCaseInput): Case | null {
    try {
      // Validate title if provided
      if (input.title !== undefined) {
        if (input.title.trim().length === 0) {
          throw new Error('Case title cannot be empty');
        }
        if (input.title.length > 200) {
          throw new Error('Case title must be 200 characters or less');
        }
      }

      const updatedCase = caseRepository.update(id, input);

      if (updatedCase) {
        errorLogger.logError('Case updated successfully', {
          type: 'info',
          caseId: id,
        });
      }

      return updatedCase;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'updateCase', id, input });
      throw error;
    }
  }

  /**
   * Delete case
   */
  deleteCase(id: number): boolean {
    try {
      const deleted = caseRepository.delete(id);

      if (deleted) {
        errorLogger.logError('Case deleted successfully', {
          type: 'info',
          caseId: id,
        });
      }

      return deleted;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'deleteCase', id });
      throw error;
    }
  }

  /**
   * Close a case
   */
  closeCase(id: number): Case | null {
    try {
      const closedCase = caseRepository.close(id);

      if (closedCase) {
        errorLogger.logError('Case closed successfully', {
          type: 'info',
          caseId: id,
        });
      }

      return closedCase;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'closeCase', id });
      throw error;
    }
  }

  /**
   * Get case statistics
   */
  getCaseStatistics(): Record<CaseStatus, number> {
    try {
      return caseRepository.countByStatus();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getCaseStatistics' });
      throw error;
    }
  }
}

export const caseService = new CaseService();
