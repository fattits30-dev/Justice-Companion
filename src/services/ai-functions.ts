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

import type { CreateCaseFactInput } from "../domains/cases/entities/CaseFact.ts";

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
    type: "object" as const,
    properties: {
      caseId: {
        type: "number" as const,
        description: "The case ID to store the fact for",
      },
      factType: {
        type: "string" as const,
        description:
          "Category of fact (timeline, evidence, witness, location, communication, other)",
      },
      factKey: {
        type: "string" as const,
        description:
          "Unique identifier for this fact (e.g., 'employer_name', 'dismissal_date')",
      },
      factValue: {
        type: "string" as const,
        description: "The actual fact value",
      },
      confidence: {
        type: "number" as const,
        description: "Confidence score 0.0-1.0 (default: 1.0, maps to",
      },
    },
    required: ["caseId", "factType", "factKey", "factValue"],
  },

  /**
   * Implementation would be provided by the handler function
   * This is just the definition for node-llama-cpp
   */
  execute: async (_args: CreateCaseFactInput) => {
    // Implementation would go here
    throw new Error("Not implemented");
  },
};
