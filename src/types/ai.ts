/**
 * AI-related Types
 * 
 * Types for AI interactions and legal context.
 * NOTE: AI features are deferred to v2.0 - this file provides type stubs.
 */

/**
 * Legal context information for AI analysis
 * Used when analyzing documents or providing legal information
 */
export interface LegalContext {
  caseType?: string;
  jurisdiction?: string;
  relevantLaws?: string[];
  keyDates?: Array<{
    date: string;
    description: string;
  }>;
  parties?: Array<{
    name: string;
    role: string;
  }>;
}

/**
 * AI analysis result for document processing
 */
export interface DocumentAnalysisResult {
  success: boolean;
  summary?: string;
  legalContext?: LegalContext;
  suggestedCaseData?: {
    title?: string;
    caseType?: string;
    description?: string;
    opposingParty?: string;
    confidence?: number;
  };
  error?: string;
}

/**
 * AI chat message structure
 */
export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

// Alias for backward compatibility
export type ChatMessage = AIChatMessage;

/**
 * Legislation search result from legal APIs
 */
export interface LegislationResult {
  id: string;
  title: string;
  type: string;
  year?: number;
  url?: string;
  snippet?: string;
}

/**
 * Case law search result
 */
export interface CaseResult {
  id: string;
  caseName: string;
  citation: string;
  court?: string;
  date?: string;
  url?: string;
  snippet?: string;
}

/**
 * Knowledge base entry for RAG
 */
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source?: string;
  category?: string;
  relevanceScore?: number;
}
