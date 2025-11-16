// src/interfaces/IDocumentRepository.ts
import type { Document } from "../models/Document.ts";

export interface IDocumentRepository {
  findById(id: number): Document | null;
  findByCaseId(caseId: number): Document[];
  create(data: Partial<Document>): Document;
  update(id: number, data: Partial<Document>): Document | null;
  delete(id: number): boolean;
}
