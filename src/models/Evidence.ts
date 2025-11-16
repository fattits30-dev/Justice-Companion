export type EvidenceType =
  | "document"
  | "photo"
  | "email"
  | "recording"
  | "note"
  | "witness";

export interface Evidence {
  id: number;
  caseId: number;
  title: string;
  filePath: string | null;
  content: string | null;
  evidenceType: EvidenceType;
  obtainedDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateEvidenceInput {
  caseId: number;
  title: string;
  filePath?: string;
  content?: string;
  evidenceType: EvidenceType;
  obtainedDate?: string;
  updatedAt?: string;
}

export interface UpdateEvidenceInput {
  title?: string;
  filePath?: string;
  content?: string;
  evidenceType?: EvidenceType;
  obtainedDate?: string;
  updatedAt?: string;
}
