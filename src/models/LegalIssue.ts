export interface LegalIssue {
  id: number;
  caseId: number;
  title: string;
  description: string | null;
  relevantLaw: string | null;
  guidance: string | null;
  createdAt: string;
}

export interface CreateLegalIssueInput {
  caseId: number;
  title: string;
  description?: string;
  relevantLaw?: string;
  guidance?: string;
}

export interface UpdateLegalIssueInput {
  title?: string;
  description?: string;
  relevantLaw?: string;
  guidance?: string;
}
