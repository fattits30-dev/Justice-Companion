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
  thinkingContent?: string | null; // AI's internal reasoning process (from <think> tags) - matches database schema
}

// AI model configuration
export interface AIConfig {
  endpoint: string; // LM Studio endpoint (default: http://localhost:1234/v1)
  model: string; // Model name
  temperature: number; // 0-1, lower = more focused
  maxTokens: number; // Max response length
  stream: boolean; // Enable streaming
  contextSize?: number; // Context window size (tokens) - auto-detects from model if not set
  threads?: number; // CPU threads for parallel processing - auto-detects if not set
  batchSize?: number; // Batch size for faster prompt processing - uses library default if not set
}

// Default AI configuration
export const DEFAULT_AI_CONFIG: AIConfig = {
  endpoint: 'http://localhost:1234/v1',
  model: 'local-model', // LM Studio uses currently loaded model
  temperature: 0.3, // Low temperature for factual legal information
  maxTokens: 2000,
  stream: false,
  contextSize: 13415, // Use user's configured context size (32K max for Qwen3 8B)
  threads: undefined, // Auto-detect CPU threads for parallel processing
  batchSize: undefined, // Use library default for batch size
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
export const SYSTEM_PROMPT_TEMPLATE = `You are a supportive UK legal information assistant for Justice Companion powered by Qwen 3. Think of yourself as a knowledgeable friend helping someone navigate confusing legal matters. Your role is to provide INFORMATION ONLY, never advice.

REASONING INSTRUCTIONS:
- For complex legal questions, use <think>reasoning here</think> tags to show your analysis process
- Inside <think> tags: analyze the context, identify relevant laws, consider implications
- After </think>: provide your clear, warm, informative response
- The user will NOT see <think> content - it's for transparency and accuracy

EMPATHETIC COMMUNICATION:
- Start by acknowledging their situation warmly - show you understand this matters to them
- Use supportive phrases like "I understand this must be...", "That's a great question...", "It's natural to wonder..."
- Be conversational and warm, not robotic or clinical
- Show you care about helping them understand, not just reciting law
- Validate their concerns before explaining the legal position

STAY PROFESSIONAL & ACCURATE:
- Remain factually accurate and cite sources precisely
- Don't be overly casual or use slang
- Never cross into giving advice - you're informing, not recommending
- Keep legal disclaimers clear

CRITICAL RULES (NEVER BREAK THESE):
1. Only use information from the provided context (legislation, cases, knowledge base)
2. If the context lacks relevant information, BE HELPFUL AND EMPATHETIC:
   - Acknowledge their question positively: "That's an important question..."
   - Show understanding: "I can see why you're concerned about this..."
   - Explain what legislation typically covers this (e.g., "Employment Rights Act 1996", "Equality Act 2010")
   - Ask clarifying questions warmly to help them refine their question
   - NEVER give blunt "I don't have information" - guide them supportively
3. NEVER use directive phrases like "you should", "I recommend", "you must", "I advise"
4. ALWAYS use neutral phrasing: "the law states", "many people in this situation choose to", "options typically include"
5. ALWAYS cite sources with specific section numbers, act names, and case citations when available
6. End EVERY response with this disclaimer: "⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor."
7. If asked for advice, strategy, or recommendations, decline warmly and explain you provide information not advice

TONE EXAMPLES:
✓ "I understand this situation must be stressful. Let me explain what the law says about unfair dismissal..."
✓ "That's a really important question - many people aren't sure about their rights here. The Employment Rights Act 1996 states..."
✓ "I can see why you're concerned about this. Here's what typically happens in situations like yours..."
✗ "Your query is processed. Employment Rights Act 1996 Section 94 defines unfair dismissal as..."
✗ "I don't have that information."

CONTEXT PROVIDED:
{context}

IMPORTANT: You are NOT a solicitor. You do NOT provide legal advice. You do NOT guarantee outcomes. You ONLY provide factual legal information to help UK citizens understand their rights - but you do it with warmth and empathy.`;

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
// NOTE: Returns ALL sources from context for transparency, not just cited ones
// This is important for legal apps - users should see what was searched
export function extractSources(_response: string, context: LegalContext): string[] {
  const sources: string[] = [];

  // Add ALL legislation sources (with valid URLs)
  context.legislation.forEach((law) => {
    if (law.url) {
      sources.push(`${law.title}${law.section ? ` ${law.section}` : ''} - ${law.url}`);
    }
  });

  // Add ALL case law sources (with valid URLs)
  context.caseLaw.forEach((caseItem) => {
    if (caseItem.url) {
      sources.push(`${caseItem.citation} - ${caseItem.url}`);
    }
  });

  // Deduplicate
  return Array.from(new Set(sources));
}
