/**
 * AI Function Types
 * 
 * Types used for AI-assisted fact categorization and analysis.
 * NOTE: AI features are deferred to v2.0 - this file provides type stubs.
 */

/**
 * Categories for case facts
 */
export type FactCategory = 
  | "timeline"
  | "evidence"
  | "witness"
  | "document"
  | "communication"
  | "financial"
  | "legal"
  | "procedural"
  | "other";

/**
 * Importance levels for facts
 */
export type FactImportance = 
  | "critical"
  | "high"
  | "medium"
  | "low";

/**
 * AI function definition for structured outputs
 */
export interface AIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}
