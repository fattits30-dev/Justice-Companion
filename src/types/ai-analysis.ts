/**
 * AI Analysis Types (Stubs)
 * 
 * NOTE: AI features deferred to v2.0
 * These are placeholder types to maintain type safety.
 * Full implementation will come in v2.0.
 */

/**
 * Legal issue identified in case analysis
 */
export interface LegalIssue {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  relevantLaws?: string[];
}

/**
 * Applicable law reference
 */
export interface ApplicableLaw {
  id: string;
  title: string;
  citation: string;
  url?: string;
  relevance: string;
  section?: string;
}

/**
 * Recommended action item
 */
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  deadline?: string;
  category: string;
}

/**
 * Identified evidence gap
 */
export interface EvidenceGap {
  id: string;
  description: string;
  importance: "critical" | "important" | "helpful";
  suggestedEvidence: string[];
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
 * Complete case analysis response
 */
export interface CaseAnalysisResponse {
  success: boolean;
  summary: string;
  legalIssues: LegalIssue[];
  applicableLaws: ApplicableLaw[];
  actionItems: ActionItem[];
  evidenceGaps: EvidenceGap[];
  sources: AnalysisSource[];
  confidence: number;
  timestamp: string;
  error?: string;
}

/**
 * Evidence analysis response
 */
export interface EvidenceAnalysisResponse {
  success: boolean;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  gaps: EvidenceGap[];
  recommendations: string[];
  confidence: number;
  timestamp: string;
  error?: string;
}
