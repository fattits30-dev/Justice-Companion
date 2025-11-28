/**
 * AI Analysis Types (Stubs)
 *
 * NOTE: AI features deferred to v2.0
 * These are placeholder types to maintain type safety.
 * Full implementation will come in v2.0.
 */

/**
 * Evidence importance level
 */
export type EvidenceImportance = "critical" | "important" | "helpful";

/**
 * Legal issue identified in case analysis
 */
export interface LegalIssue {
  id: string;
  title: string;
  issue: string; // Display name for the issue
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  relevantLaws?: string[];
  relevantLaw?: string[]; // Alternative property name
  potentialClaims?: string[];
  defenses?: string[];
}

/**
 * Applicable law reference
 */
export interface ApplicableLaw {
  id: string;
  title: string;
  statute: string; // Name of the statute
  citation: string;
  url?: string;
  relevance: string;
  section?: string;
  summary?: string;
  application?: string; // How it applies to the case
  jurisdiction?: string;
}

/**
 * Recommended action item
 */
export interface ActionItem {
  id: string;
  title: string;
  action: string; // Display name for the action
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  deadline?: string;
  category: string;
  rationale?: string;
}

/**
 * Identified evidence gap
 */
export interface EvidenceGap {
  id: string;
  description: string;
  importance: EvidenceImportance;
  suggestedEvidence: string[];
  suggestedSources?: string[]; // Alternative property name
}

/**
 * Source reference for analysis
 */
export interface AnalysisSource {
  type: "legislation" | "case_law" | "guidance" | "other";
  title: string;
  citation?: string;
  url?: string;
}

/**
 * Complexity assessment
 */
export interface ComplexityAssessment {
  score: number;
  explanation: string;
  factors?: string[];
}

/**
 * Complete case analysis response
 */
export interface CaseAnalysisResponse {
  success: boolean;
  summary: string;
  legalIssues: LegalIssue[];
  applicableLaws: ApplicableLaw[];
  applicableLaw?: ApplicableLaw[]; // Alternative property name
  actionItems: ActionItem[];
  recommendedActions?: ActionItem[]; // Alternative property name
  evidenceGaps: EvidenceGap[];
  sources: AnalysisSource[];
  confidence: number;
  timestamp: string;
  error?: string;
  estimatedComplexity?: ComplexityAssessment;
  reasoning?: string;
  disclaimer?: string;
}

/**
 * Evidence analysis response
 */
export interface EvidenceAnalysisResponse {
  success: boolean;
  summary: string;
  strength?: string; // Overall strength assessment
  strengths: string[];
  weaknesses: string[];
  gaps: EvidenceGap[];
  recommendations: string[];
  suggestions?: string[]; // Alternative property name
  confidence: number;
  timestamp: string;
  error?: string;
  explanation?: string;
  disclaimer?: string;
}
