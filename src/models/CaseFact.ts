export interface CaseFact {
  id: number;
  caseId: number;
  factContent: string;
  factCategory: 'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other';
  importance: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseFactInput {
  caseId: number;
  factContent: string;
  factCategory: 'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other';
  importance?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateCaseFactInput {
  factContent?: string;
  factCategory?: 'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other';
  importance?: 'low' | 'medium' | 'high' | 'critical';
}
