/**
 * SearchQuery Entity
 * Represents a legal research search query
 */
export interface SearchQuery {
  id: string; // UUID
  caseId: number;
  userId: number;
  query: string;
  searchType: 'legislation' | 'caselaw' | 'combined';
  filters?: {
    jurisdiction?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    courtLevel?: string[];
    legislationType?: string[];
  };
  results?: {
    count: number;
    relevantCitations: string[];
    executionTime: number;
  };
  createdAt: string;
}

export interface CreateSearchQueryInput {
  caseId: number;
  userId: number;
  query: string;
  searchType: 'legislation' | 'caselaw' | 'combined';
  filters?: {
    jurisdiction?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    courtLevel?: string[];
    legislationType?: string[];
  };
}

export interface UpdateSearchQueryInput {
  results?: {
    count: number;
    relevantCitations: string[];
    executionTime: number;
  };
}