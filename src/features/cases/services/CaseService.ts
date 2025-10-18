import { getRepositories } from '../../../repositories';
import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../../../models/Case';
import { errorLogger } from '../../../utils/error-logger';

export class CaseService {
  private get caseRepository() {
    return getRepositories().caseRepository;
  }

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

      return this.caseRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createCase',
        caseType: input.caseType,
      });
      throw error;
    }
  }

  /**
   * Get case by ID
   */
  getCaseById(id: number): Case | null {
    try {
      return this.caseRepository.findById(id);
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
      return this.caseRepository.findAll(status);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'getAllCases',
        status,
      });
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

      return this.caseRepository.update(id, input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateCase',
        id,
        fields: Object.keys(input ?? {}),
      });
      throw error;
    }
  }

  /**
   * Delete case
   */
  deleteCase(id: number): boolean {
    try {
      return this.caseRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteCase',
        id,
      });
      throw error;
    }
  }

  /**
   * Close a case
   */
  closeCase(id: number): Case | null {
    try {
      return this.caseRepository.close(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'closeCase',
        id,
      });
      throw error;
    }
  }

  /**
   * Get case statistics
   */
  getCaseStatistics(): Record<CaseStatus, number> {
    try {
      return this.caseRepository.countByStatus();
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getCaseStatistics' });
      throw error;
    }
  }
}

export const caseService = new CaseService();
