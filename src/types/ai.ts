/**
 * AI System Types
 * Types for LM Studio integration, RAG, and legal information chat
 */

// Chat message roles
export type MessageRole = 'system' | 'user' | 'assistant';

// Chat message structure
export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

// AI model configuration
export interface AIConfig {
  endpoint: string; // LM Studio endpoint (default: http://localhost:1234/v1)
  model: string; // Model name
  temperature: number; // 0-1, lower = more focused
  maxTokens: number; // Max response length
  stream: boolean; // Enable streaming
}

// Default AI configuration
export const DEFAULT_AI_CONFIG: AIConfig = {
  endpoint: 'http://localhost:1234/v1',
  model: 'local-model', // LM Studio uses currently loaded model
  temperature: 0.3, // Low temperature for factual legal information
  maxTokens: 2000,
  stream: false,
};

// AI connection status
export interface AIStatus {
  connected: boolean;
  endpoint: string;
  model?: string;
  error?: string;
}

// Legal context from RAG retrieval
export interface LegalContext {
  legislation: LegislationResult[];
  caseLaw: CaseResult[];
  knowledgeBase: KnowledgeEntry[];
}

// Legislation search result
export interface LegislationResult {
  title: string; // e.g., "Employment Rights Act 1996"
  section?: string; // e.g., "Section 94"
  content: string; // Actual text of the law
  url: string; // Link to legislation.gov.uk
  relevance?: number; // 0-1 relevance score
}

// Case law search result
export interface CaseResult {
  citation: string; // e.g., "Smith v ABC Ltd [2024] ET/12345/24"
  court: string; // e.g., "Employment Tribunal"
  date: string; // ISO date
  summary: string; // Brief summary of case
  outcome?: string; // e.g., "Claimant successful"
  url: string; // Link to full judgment
  relevance?: number; // 0-1 relevance score
}

// Knowledge base entry (cached FAQs, guides)
export interface KnowledgeEntry {
  topic: string; // e.g., "Unfair Dismissal"
  category: string; // e.g., "Employment"
  content: string; // Information text
  sources: string[]; // Source citations
}

// AI chat request
export interface AIChatRequest {
  messages: ChatMessage[];
  context?: LegalContext;
  config?: Partial<AIConfig>;
  caseId?: number; // Associate with case
}

// AI chat response (non-streaming)
export interface AIChatResponse {
  success: true;
  message: ChatMessage;
  sources: string[]; // Citations used
  tokensUsed?: number;
}

// AI streaming token
export interface AIStreamToken {
  token: string;
  done: boolean;
}

// AI error response
export interface AIErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// Union type for all AI responses
export type AIResponse = AIChatResponse | AIErrorResponse;

// System prompt template
export const SYSTEM_PROMPT_TEMPLATE = `You are a UK legal information assistant for Justice Companion. Your role is to provide INFORMATION ONLY, never advice.

CRITICAL RULES (NEVER BREAK THESE):
1. Only use information from the provided context (legislation, cases, knowledge base)
2. If information isn't in the context, respond: "I don't have information on that specific topic."
3. NEVER use phrases like "you should", "I recommend", "you must", "I advise"
4. ALWAYS use neutral phrasing: "the law states", "many people choose to", "options include", "this typically involves"
5. ALWAYS cite sources with specific section numbers, act names, and case citations
6. End EVERY response with this disclaimer: "⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor."
7. If asked for advice, strategy, or recommendations, politely decline and explain you only provide information

CONTEXT PROVIDED:
{context}

IMPORTANT: You are NOT a solicitor. You do NOT provide legal advice. You do NOT guarantee outcomes. You ONLY provide factual legal information to help UK citizens understand their rights.`;

// Function to build context string for prompt
export function buildContextString(context: LegalContext): string {
  const parts: string[] = [];

  // Add legislation
  if (context.legislation.length > 0) {
    parts.push('=== RELEVANT LEGISLATION ===');
    context.legislation.forEach((law) => {
      parts.push(`\n${law.title}${law.section ? ` - ${law.section}` : ''}`);
      parts.push(law.content);
      parts.push(`Source: ${law.url}\n`);
    });
  }

  // Add case law
  if (context.caseLaw.length > 0) {
    parts.push('\n=== RELEVANT CASE LAW ===');
    context.caseLaw.forEach((caseItem) => {
      parts.push(`\n${caseItem.citation} - ${caseItem.court} (${caseItem.date})`);
      parts.push(caseItem.summary);
      if (caseItem.outcome) {
        parts.push(`Outcome: ${caseItem.outcome}`);
      }
      parts.push(`Source: ${caseItem.url}\n`);
    });
  }

  // Add knowledge base
  if (context.knowledgeBase.length > 0) {
    parts.push('\n=== KNOWLEDGE BASE ===');
    context.knowledgeBase.forEach((entry) => {
      parts.push(`\n${entry.topic} (${entry.category})`);
      parts.push(entry.content);
      if (entry.sources.length > 0) {
        parts.push(`Sources: ${entry.sources.join(', ')}\n`);
      }
    });
  }

  return parts.join('\n');
}

// Function to build complete system prompt with context
export function buildSystemPrompt(context: LegalContext): string {
  const contextString = buildContextString(context);
  return SYSTEM_PROMPT_TEMPLATE.replace('{context}', contextString);
}

// Extract sources from AI response for citation display
export function extractSources(response: string, context: LegalContext): string[] {
  const sources: string[] = [];

  // Extract legislation sources
  context.legislation.forEach((law) => {
    if (response.includes(law.title) || (law.section && response.includes(law.section))) {
      sources.push(`${law.title}${law.section ? ` ${law.section}` : ''} - ${law.url}`);
    }
  });

  // Extract case law sources
  context.caseLaw.forEach((caseItem) => {
    if (response.includes(caseItem.citation)) {
      sources.push(`${caseItem.citation} - ${caseItem.url}`);
    }
  });

  // Deduplicate
  return Array.from(new Set(sources));
}
