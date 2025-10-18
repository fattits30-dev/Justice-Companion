import { getRepositories } from '../../../repositories';
import type { UserFact, CreateUserFactInput, UpdateUserFactInput } from '../../../models/UserFact';
import { errorLogger } from '../../../utils/error-logger';

export class UserFactsService {
  private get userFactsRepository() {
    return getRepositories().userFactsRepository;
  }

  /**
   * Create a new user fact for a case
   */
  createUserFact(input: CreateUserFactInput): UserFact {
    try {
      // Validate input
      if (!input.factContent || input.factContent.trim().length === 0) {
        throw new Error('User fact content is required');
      }

      if (input.factContent.length > 5000) {
        throw new Error('User fact content must be 5000 characters or less');
      }

      return this.userFactsRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createUserFact',
        caseId: input.caseId,
        factType: input.factType,
      });
      throw error;
    }
  }

  /**
   * Get user fact by ID
   */
  getUserFactById(id: number): UserFact | null {
    try {
      return this.userFactsRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getUserFactById', id });
      throw error;
    }
  }

  /**
   * Get all user facts for a case
   */
  getUserFactsByCaseId(caseId: number): UserFact[] {
    try {
      return this.userFactsRepository.findByCaseId(caseId);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getUserFactsByCaseId', caseId });
      throw error;
    }
  }

  /**
   * Get user facts filtered by type
   */
  getUserFactsByType(caseId: number, factType: string): UserFact[] {
    try {
      return this.userFactsRepository.findByType(caseId, factType);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getUserFactsByType', caseId, factType });
      throw error;
    }
  }

  /**
   * Update a user fact
   */
  updateUserFact(id: number, input: UpdateUserFactInput): UserFact {
    try {
      // Validate input
      if (input.factContent !== undefined && input.factContent.trim().length === 0) {
        throw new Error('User fact content cannot be empty');
      }

      if (input.factContent && input.factContent.length > 5000) {
        throw new Error('User fact content must be 5000 characters or less');
      }

      const userFact = this.userFactsRepository.update(id, input);

      if (!userFact) {
        throw new Error('User fact not found');
      }

      return userFact;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateUserFact',
        id,
        fields: Object.keys(input ?? {}),
      });
      throw error;
    }
  }

  /**
   * Delete a user fact
   */
  deleteUserFact(id: number): void {
    try {
      this.userFactsRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteUserFact',
        id,
      });
      throw error;
    }
  }
}

export const userFactsService = new UserFactsService();
