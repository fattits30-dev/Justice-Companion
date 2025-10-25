// src/interfaces/IEvidenceRepository.ts
import type { Evidence } from '../domains/evidence/entities/Evidence.ts';

export interface IEvidenceRepository {
  findById(id: number): Evidence | null;
  findByCaseId(caseId: number): Evidence[];
  create(data: Partial<Evidence>): Evidence;
  update(id: number, data: Partial<Evidence>): Evidence | null;
  delete(id: number): boolean;
}