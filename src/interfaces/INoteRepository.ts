// src/interfaces/INoteRepository.ts
import type { Note } from "../lib/types/api.ts";

export interface INoteRepository {
  findById(id: number): Note | null;
  findByCaseId(caseId: number): Note[];
  create(data: Partial<Note>): Note;
  update(id: number, data: Partial<Note>): Note | null;
  delete(id: number): boolean;
}
