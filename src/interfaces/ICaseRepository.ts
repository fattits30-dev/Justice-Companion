// src/interfaces/ICaseRepository.ts
import type { Case, CreateCaseInput, UpdateCaseInput } from '../domains/cases/entities/Case.ts';

export interface ICaseRepository {
  findById(id: number): Case | null;
  findByUserId(userId: number): Case[];
  create(input: CreateCaseInput): Case;
  update(id: number, input: UpdateCaseInput): Case | null;
  delete(id: number): boolean;
}