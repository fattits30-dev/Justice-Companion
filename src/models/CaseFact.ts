/**
 * CaseFact Model
 *
 * Represents a case-related fact stored in the database.
 * Matches the database schema from migration 005_user_and_case_facts.sql
 *
 * @example
 * {
 *   id: 1,
 *   caseId: 42,
 *   factContent: 'Meeting occurred on 2024-01-15 at plaintiff\'s office',
 *   factCategory: 'timeline',
 *   importance: 'high',
 *   createdAt: '2024-01-15T10:30:00Z',
 *   updatedAt: '2024-01-15T10:30:00Z'
 * }
 */

export interface CaseFact {
  id: number;
  caseId: number;
  factContent: string;
  factCategory:
    | "timeline"
    | "evidence"
    | "witness"
    | "location"
    | "communication"
    | "other";
  importance: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseFactInput {
  caseId: number;
  factContent: string;
  factCategory:
    | "timeline"
    | "evidence"
    | "witness"
    | "location"
    | "communication"
    | "other";
  importance?: "low" | "medium" | "high" | "critical";
}

export interface UpdateCaseFactInput {
  factContent?: string;
  factCategory?:
    | "timeline"
    | "evidence"
    | "witness"
    | "location"
    | "communication"
    | "other";
  importance?: "low" | "medium" | "high" | "critical";
}
