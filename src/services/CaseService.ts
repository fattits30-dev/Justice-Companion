import { getDb } from '../db/database.ts';
import { getRepositories } from '../repositories.ts';
import type { Case, CreateCaseInput, UpdateCaseInput } from '../models/Case.ts';

interface CreateCaseWithUser extends CreateCaseInput {
  userId: number;
}

class CaseService {
  private get caseRepository() {
    return getRepositories().caseRepository;
  }

  private get db() {
    return getDb();
  }

  createCase(input: CreateCaseWithUser): Case {
    const { userId, ...caseInput } = input;
    const createdCase = this.caseRepository.create(caseInput);

    this.db
      .prepare('UPDATE cases SET user_id = ? WHERE id = ?')
      .run(userId, createdCase.id);

    const persistedCase = this.caseRepository.findById(createdCase.id);
    if (!persistedCase) {
      throw new Error(`Failed to load case ${createdCase.id} after creation`);
    }

    return { ...persistedCase, userId };
  }

  getAllCases(): Case[] {
    return this.caseRepository.findAll();
  }

  getCaseById(id: number): Case | null {
    return this.caseRepository.findById(id);
  }

  updateCase(id: number, input: UpdateCaseInput): Case | null {
    return this.caseRepository.update(id, input);
  }

  closeCase(id: number): Case | null {
    return this.caseRepository.update(id, { status: 'closed' });
  }

  deleteCase(id: number): boolean {
    return this.caseRepository.delete(id);
  }
}

export const caseService = new CaseService();
