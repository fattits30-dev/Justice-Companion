// src/models/Document.ts
export interface Document {
  id: number;
  caseId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
}