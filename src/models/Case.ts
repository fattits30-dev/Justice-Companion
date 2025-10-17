export type CaseType = 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
export type CaseStatus = 'active' | 'closed' | 'pending';

export interface Case {
  id: number;
  title: string;
  description: string | null;
  caseType: CaseType;
  status: CaseStatus;
  userId: number | null;  // Owner of the case (added in migration 011)
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseInput {
  title: string;
  description?: string;
  caseType: CaseType;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string;
  caseType?: CaseType;
  status?: CaseStatus;
}
