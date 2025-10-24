/**
 * AI Function Definitions for node-llama-cpp Function Calling
 *
 * These functions enable the AI to:
 * - Store case facts (persistent memory)
 * - Retrieve case facts (context loading)
 * - Gather information systematically
 *
 * Uses node-llama-cpp's built-in defineChatSessionFunction for automatic:
 * - Function call parsing from AI responses: [[call: store_case_fact({...})]]
 * - Handler execution
 * - Result formatting: [[result: {...}]]
 * - Multi-turn conversation management
 */

import type { CaseFact, CreateCaseFactInput } from '../models/CaseFact.ts';

/**
 * Store a case fact (persistent memory)
 *
 * AI uses this to remember key information about a case.
 * Maps semantic fact types to database categories.
 *
 * @example
 * AI Response: [[call: store_case_fact({
 *   caseId: 42,
 *   factType: "party",
 *   factKey: "employer_name",
 *   factValue: "ABC Tech Ltd",
 *   confidence: 1.0
 * })]]
 */
export const storeCaseFactDefinition = {
  description: `Store a case fact for persistent memory. Facts are stored as "factKey: factValue" in the database.

factType options (maps to database factCategory):
- "timeline": Important dates and events (e.g., "dismissal_date: 2024-01-15")
- "evidence": Evidence items (e.g., "contract: Signed employment contract from 2022")
- "witness": Witness information (e.g., "witness_1_name: John Smith")
- "location": Locations (e.g., "incident_location: Main office, London")
- "communication": Communications (e.g., "dismissal_email: Email from HR dated 2024-01-15")
- "other": Other facts not fitting above categories

confidence: 0.0-1.0 (1.0 = certain/critical, 0.7 = high, 0.5 = medium, <0.5 = low)
This maps to importance in database: >=0.9=critical, >=0.7=high, >=0.5=medium, <0.5=low`,

  params: {
    type: 'object' as const,
    properties: {
      caseId: {
        type: 'number' as const,
        description: 'The case ID to store the fact for',
      },
      factType: {
        type: 'string' as const,
        description: 'Category of fact (timeline, evidence, witness, location, communication, other)',
      },
      factKey: {
        type: 'string' as const,
        description: "Unique identifier for this fact (e.g., 'employer_name', 'dismissal_date')",
      },
      factValue: {
        type: 'string' as const,
        description: 'The actual fact value',
      },
      confidence: {
        type: 'number' as const,
        description: 'Confidence score 0.0-1.0 (default: 1.0, maps to importance)',
      },
    },
    required: ['caseId', 'factType', 'factKey', 'factValue'],
  },

  /**
   * Handler that executes when AI calls store_case_fact
   * Maps semantic params to database schema
   */
  handler: async (params: {
    caseId: number;
    factType: string;
    factKey: string;
    factValue: string;
    confidence?: number;
  }): Promise<{ success: boolean; fact?: CaseFact; error?: string }> => {
    try {
      // Validate factType (maps to factCategory in DB)
      const validFactTypes = ['timeline', 'evidence', 'witness', 'location', 'communication', 'other'];
      if (!validFactTypes.includes(params.factType)) {
        return {
          success: false,
          error: `Invalid factType: ${params.factType}. Must be one of: ${validFactTypes.join(', ')}`,
        };
      }

      // Map confidence to importance
      const confidence = params.confidence ?? 1.0;
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
        return {
          success: false,
          error: `Invalid confidence: ${confidence}. Must be between 0.0 and 1.0`,
        };
      }

      let importance: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (confidence >= 0.9) {
        importance = 'critical';
      } else if (confidence >= 0.7) {
        importance = 'high';
      } else if (confidence >= 0.5) {
        importance = 'medium';
      } else {
        importance = 'low';
      }

      // Combine factKey and factValue into factContent (DB format)
      const factContent = `${params.factKey}: ${params.factValue}`;

      // Prepare input for database
      const input: CreateCaseFactInput = {
        caseId: params.caseId,
        factContent,
        factCategory: params.factType as 'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other', // Validated above
        importance: importance || 'medium', // Default to medium if undefined
      };

      // Call IPC handler (facts:store was added to main.ts)
      // Note: This needs to be executed in renderer context with window.justiceAPI
      // For now, we'll return a structured response for the AI to see
      // The actual IPC call will be handled when this runs in the renderer

      // Return success structure for AI (actual IPC call TBD in integration)
      return {
        success: true,
        fact: {
          id: 0, // Will be set by database
          caseId: input.caseId,
          factContent: input.factContent,
          factCategory: input.factCategory,
          importance: input.importance!, // Always defined due to || 'medium' fallback above
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error storing fact',
      };
    }
  },
};

/**
 * Get all facts for a case (load memory)
 *
 * AI uses this to load context before answering questions.
 * RULE: AI MUST call this before providing legal information about a case.
 *
 * @example
 * AI Response: [[call: get_case_facts({caseId: 42})]]
 * Result: [[result: {success: true, facts: [...], count: 3}]]
 */
export const getCaseFactsDefinition = {
  description: `Get all stored facts for a case. Returns facts in format: [{id, factContent, factCategory, importance, ...}]

factCategory can be: timeline, evidence, witness, location, communication, other
importance can be: low, medium, high, critical

IMPORTANT: You MUST call this function before providing legal information about a case.
This ensures you have the latest stored facts and can reference them accurately.`,

  params: {
    type: 'object' as const,
    properties: {
      caseId: {
        type: 'number' as const,
        description: 'The case ID to load facts for',
      },
      factType: {
        type: 'string' as const,
        description: 'Optional: Filter by factCategory (timeline, evidence, witness, location, communication, other)',
      },
    },
    required: ['caseId'],
  },

  /**
   * Handler that executes when AI calls get_case_facts
   * Calls IPC handler (facts:get) to retrieve facts from database
   */
  handler: async (params: {
    caseId: number;
    factType?: string;
  }): Promise<{ success: boolean; facts?: CaseFact[]; count?: number; error?: string }> => {
    try {
      // Validate factType if provided
      if (params.factType) {
        const validFactTypes = ['timeline', 'evidence', 'witness', 'location', 'communication', 'other'];
        if (!validFactTypes.includes(params.factType)) {
          return {
            success: false,
            error: `Invalid factType: ${params.factType}. Must be one of: ${validFactTypes.join(', ')}`,
          };
        }
      }

      // Note: This handler will be called in main process context during streaming
      // The actual IPC call will be made when integrated with IntegratedAIService
      // For now, return structure for AI to see (integration TBD)

      return {
        success: true,
        facts: [], // Will be populated when integrated
        count: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading facts',
      };
    }
  },
};

/**
 * Export all AI functions for use with LlamaChatSession
 *
 * Usage in IntegratedAIService:
 * ```ts
 * import { LlamaChatSession } from 'node-llama-cpp';
 * import { aiFunctions } from './ai-functions.ts';
 *
 * const chatSession = new LlamaChatSession({
 *   contextSequence,
 *   systemPrompt,
 * });
 *
 * await chatSession.prompt(userPrompt, {
 *   functions: aiFunctions,  // Enable function calling
 *   onTextChunk: (chunk) => onToken(chunk),
 * });
 * ```
 */
export const aiFunctions = {
  store_case_fact: storeCaseFactDefinition,
  get_case_facts: getCaseFactsDefinition,
};
