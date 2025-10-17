import { legalIssuesRepository } from '@/repositories/LegalIssuesRepository';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '@/models/LegalIssue';
import { errorLogger } from '@/utils/error-logger';

export class LegalIssuesService {
  /**
   * Create a new legal issue for a case
   */
  createLegalIssue(input: CreateLegalIssueInput): LegalIssue {
    try {
      // Validate input
      if (!input.title || input.title.trim().length === 0) {
        throw new Error('Legal issue title is required');
      }

      if (input.title.length > 200) {
        throw new Error('Legal issue title must be 200 characters or less');
      }

      if (input.description && input.description.length > 10000) {
        throw new Error('Legal issue description must be 10000 characters or less');
      }

      return legalIssuesRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createLegalIssue',
        caseId: input.caseId,
        fields: ['title', 'description', 'relevantLaw', 'guidance'].filter(
          (field) => field in input,
        ),
      });
      throw error;
    }
  }

  /**
   * Get legal issue by ID
   */
  getLegalIssueById(id: number): LegalIssue | null {
    try {
      return legalIssuesRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getLegalIssueById', id });
      throw error;
    }
  }

  /**
   * Get all legal issues for a case
   */
  getLegalIssuesByCaseId(caseId: number): LegalIssue[] {
    try {
      return legalIssuesRepository.findByCaseId(caseId);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getLegalIssuesByCaseId', caseId });
      throw error;
    }
  }

  /**
   * Update a legal issue
   */
  updateLegalIssue(id: number, input: UpdateLegalIssueInput): LegalIssue {
    try {
      // Validate input
      if (input.title !== undefined && input.title.trim().length === 0) {
        throw new Error('Legal issue title cannot be empty');
      }

      if (input.title && input.title.length > 200) {
        throw new Error('Legal issue title must be 200 characters or less');
      }

      if (input.description && input.description.length > 10000) {
        throw new Error('Legal issue description must be 10000 characters or less');
      }

      const legalIssue = legalIssuesRepository.update(id, input);

      if (!legalIssue) {
        throw new Error('Legal issue not found');
      }

      return legalIssue;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateLegalIssue',
        id,
        fields: Object.keys(input ?? {}),
      });
      throw error;
    }
  }

  /**
   * Delete a legal issue
   */
  deleteLegalIssue(id: number): void {
    try {
      legalIssuesRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteLegalIssue',
        id,
      });
      throw error;
    }
  }
}

export const legalIssuesService = new LegalIssuesService();
