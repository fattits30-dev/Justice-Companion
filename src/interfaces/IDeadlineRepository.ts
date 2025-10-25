// src/interfaces/IDeadlineRepository.ts
import type { Deadline } from '../domains/timeline/entities/Deadline.ts';

export interface IDeadlineRepository {
  findById(id: number): Deadline | null;
  findByCaseId(caseId: number): Deadline[];
  create(data: Partial<Deadline>): Deadline;
  update(id: number, data: Partial<Deadline>): Deadline | null;
  delete(id: number): boolean;
}