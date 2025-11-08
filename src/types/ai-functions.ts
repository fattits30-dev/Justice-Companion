/**
 * Type definitions for AI function calls
 * These types provide type safety for node-llama-cpp function definitions
 */

import type { CaseStatus, CaseType } from "../domains/cases/entities/Case.ts";
import type { EvidenceType } from "../domains/evidence/entities/Evidence.ts";

// Export type aliases for CaseFact enums
export type FactCategory =
  | "timeline"
  | "evidence"
  | "witness"
  | "location"
  | "communication"
  | "other";
export type FactImportance = "low" | "medium" | "high" | "critical";

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Case Function Parameter Types
// ============================================================================

export interface CreateCaseParams {
  title: string;
  caseType: string;
  description: string;
}

export interface GetCaseParams {
  caseId: number;
}

export interface ListCasesParams {
  filterStatus?: string;
}

export interface UpdateCaseParams {
  caseId: number;
  title?: string;
  caseType?: string;
  description?: string;
  status?: string;
}

// ============================================================================
// Case Function Return Types
// ============================================================================

export interface CreateCaseResult {
  success: boolean;
  caseId: number;
  title: string;
  status: CaseStatus;
  createdAt: string;
  message: string;
}

export interface GetCaseResult {
  success: boolean;
  case?: {
    id: number;
    title: string;
    caseType: CaseType;
    description?: string;
    status: CaseStatus;
    createdAt: string;
    updatedAt?: string;
  };
  message: string;
}

export interface ListCasesResult {
  success: boolean;
  totalCases: number;
  cases: Array<{
    id: number;
    title: string;
    caseType: CaseType;
    status: CaseStatus;
    createdAt: string;
  }>;
  message: string;
}

export interface UpdateCaseResult {
  success: boolean;
  case?: {
    id: number;
    title: string;
    caseType: CaseType;
    description?: string;
    status: CaseStatus;
    updatedAt: string;
  };
  message: string;
}

// ============================================================================
// Evidence Function Parameter Types
// ============================================================================

export interface CreateEvidenceParams {
  caseId: number;
  title: string;
  evidenceType: EvidenceType;
  content?: string;
  filePath?: string;
  obtainedDate?: string;
}

export interface ListEvidenceParams {
  caseId: number;
}

// ============================================================================
// Evidence Function Return Types
// ============================================================================

export interface CreateEvidenceResult {
  success: boolean;
  evidenceId: number;
  title: string;
  evidenceType: EvidenceType;
  caseId: number;
  createdAt: string;
  message: string;
}

export interface ListEvidenceResult {
  success: boolean;
  totalEvidence: number;
  evidence: Array<{
    id: number;
    title: string;
    evidenceType: EvidenceType;
    obtainedDate?: string;
    hasFile: boolean;
    hasContent: boolean;
    createdAt: string;
  }>;
  message: string;
}

// ============================================================================
// Case Fact Function Parameter Types
// ============================================================================

export interface StoreCaseFactParams {
  caseId: number;
  factContent: string;
  factCategory: string;
  importance?: string;
}

export interface GetCaseFactsParams {
  caseId: number;
  factCategory?: string;
}

// ============================================================================
// Case Fact Function Return Types
// ============================================================================

export interface StoreCaseFactResult {
  success: boolean;
  factId: number;
  message: string;
}

export interface CaseFact {
  id: number;
  caseId: number;
  factContent: string;
  factCategory: FactCategory;
  importance: FactImportance;
  createdAt: string;
}

export interface GetCaseFactsResult {
  success: boolean;
  facts: CaseFact[];
  message: string;
}

// ============================================================================
// Legal Research Function Parameter Types
// ============================================================================

export interface SearchLegislationParams {
  query: string;
}

export interface SearchCaseLawParams {
  query: string;
  category?: string;
}

export interface ClassifyQuestionParams {
  question: string;
}

// ============================================================================
// Legal Research Function Return Types
// ============================================================================

/**
 * Legislation result from LegalAPIService
 * Matches the format returned by searchLegislation()
 */
export interface LegislationResult {
  title: string;
  section?: string;
  content: string;
  url: string;
  relevance?: number;
}

export interface SearchLegislationResult {
  success: boolean;
  results: LegislationResult[];
  message: string;
}

/**
 * Case law result from LegalAPIService
 * Matches the format returned by searchCaseLaw()
 */
export interface CaseLawResult {
  citation: string;
  court: string;
  date: string;
  summary: string;
  outcome?: string;
  url: string;
  relevance?: number;
}

export interface SearchCaseLawResult {
  success: boolean;
  results: CaseLawResult[];
  category: string;
  message: string;
}

export interface ClassifyQuestionResult {
  success: boolean;
  category: string;
  confidence: number;
  message: string;
}

// ============================================================================
// node-llama-cpp Function Definition Types
// ============================================================================

/**
 * Function handler type for node-llama-cpp chat session functions
 * @template TParams - Input parameter type
 * @template TResult - Return value type
 */
export type ChatFunctionHandler<TParams, TResult> = (
  params: TParams
) => Promise<TResult>;

/**
 * JSON Schema property definition for function parameters
 */
export interface JSONSchemaProperty {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  enum?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
}

/**
 * JSON Schema object for function parameters
 */
export interface JSONSchemaObject {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required: string[];
}

/**
 * Chat session function definition for node-llama-cpp
 * @template TParams - Input parameter type
 * @template TResult - Return value type
 */
export interface ChatSessionFunctionDefinition<TParams, TResult> {
  description: string;
  params: JSONSchemaObject;
  handler: ChatFunctionHandler<TParams, TResult>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper to get sessionId from localStorage
 * Throws if not authenticated
 */
export function getSessionId(): string {
  const sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    throw new Error("Not authenticated. Session ID not found in localStorage.");
  }
  return sessionId;
}

/**
 * Type guard to check if response is an error
 */
export function isAPIError<T>(
  response: APIResponse<T>
): response is APIResponse<T> & { error: string } {
  return !response.success && response.error !== undefined;
}
