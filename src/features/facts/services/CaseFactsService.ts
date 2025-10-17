import { caseFactsRepository } from '../../../repositories/CaseFactsRepository';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../../../models/CaseFact';
import { errorLogger } from '../../../utils/error-logger';

export class CaseFactsService {
  /**
   * Create a new case fact for a case
   */
  createCaseFact(input: CreateCaseFactInput): CaseFact {
    try {
      // Validate input
      if (!input.factContent || input.factContent.trim().length === 0) {
        throw new Error('Case fact content is required');
      }

      if (input.factContent.length > 5000) {
        throw new Error('Case fact content must be 5000 characters or less');
      }

      return caseFactsRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createCaseFact',
        caseId: input.caseId,
        factCategory: input.factCategory,
      });
      throw error;
    }
  }

  /**
   * Get case fact by ID
   */
  getCaseFactById(id: number): CaseFact | null {
    try {
      return caseFactsRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getCaseFactById', id });
      throw error;
    }
  }

  /**
   * Get all case facts for a case
   */
  getCaseFactsByCaseId(caseId: number): CaseFact[] {
    try {
      return caseFactsRepository.findByCaseId(caseId);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getCaseFactsByCaseId', caseId });
      throw error;
    }
  }

  /**
   * Get case facts filtered by category
   */
  getCaseFactsByCategory(caseId: number, factCategory: string): CaseFact[] {
    try {
      return caseFactsRepository.findByCategory(caseId, factCategory);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'getCaseFactsByCategory',
        caseId,
        factCategory,
      });
      throw error;
    }
  }

  /**
   * Get case facts filtered by importance
   */
  getCaseFactsByImportance(caseId: number, importance: string): CaseFact[] {
    try {
      return caseFactsRepository.findByImportance(caseId, importance);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'getCaseFactsByImportance',
        caseId,
        importance,
      });
      throw error;
    }
  }

  /**
   * Update a case fact
   */
  updateCaseFact(id: number, input: UpdateCaseFactInput): CaseFact {
    try {
      // Validate input
      if (input.factContent !== undefined && input.factContent.trim().length === 0) {
        throw new Error('Case fact content cannot be empty');
      }

      if (input.factContent && input.factContent.length > 5000) {
        throw new Error('Case fact content must be 5000 characters or less');
      }

      const caseFact = caseFactsRepository.update(id, input);

      if (!caseFact) {
        throw new Error('Case fact not found');
      }

      return caseFact;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateCaseFact',
        id,
        fields: Object.keys(input ?? {}),
      });
      throw error;
    }
  }

  /**
   * Delete a case fact
   */
  deleteCaseFact(id: number): void {
    try {
      caseFactsRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteCaseFact',
        id,
      });
      throw error;
    }
  }
}

export const caseFactsService = new CaseFactsService();
