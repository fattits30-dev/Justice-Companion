export type EvidenceType = 'document' | 'photo' | 'email' | 'recording' | 'note';

export interface Evidence {
  id: number;
  caseId: number;
  title: string;
  filePath: string | null;
  content: string | null;
  evidenceType: EvidenceType;
  obtainedDate: string | null;
  createdAt: string;
}

export interface CreateEvidenceInput {
  caseId: number;
  title: string;
  filePath?: string;
  content?: string;
  evidenceType: EvidenceType;
  obtainedDate?: string;
}

export interface UpdateEvidenceInput {
  title?: string;
  filePath?: string;
  content?: string;
  evidenceType?: EvidenceType;
  obtainedDate?: string;
}
