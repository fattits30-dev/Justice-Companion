/**
 * AI Analysis Type Definitions
 *
 * Types for advanced AI features:
 * - Case Analysis (structured legal analysis)
 * - Evidence Analysis (gap identification)
 * - Document Drafting (letters, statements, forms)
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * UK Legal Jurisdictions
 */
export enum UKJurisdiction {
  ENGLAND_WALES = "england_wales",
  SCOTLAND = "scotland",
  NORTHERN_IRELAND = "northern_ireland",
}

/**
 * Legal Case Types supported by the application
 */
export enum LegalCaseType {
  EMPLOYMENT = "employment",
  HOUSING = "housing",
  BENEFITS = "benefits",
  CONSUMER = "consumer",
  CIVIL_RIGHTS = "civil_rights",
  SMALL_CLAIMS = "small_claims",
  FAMILY = "family",
  OTHER = "other",
}

/**
 * Document types for AI-assisted drafting
 */
export enum DocumentType {
  LETTER = "letter",
  WITNESS_STATEMENT = "witness_statement",
  TRIBUNAL_SUBMISSION = "tribunal_submission",
  COURT_FORM = "court_form",
  APPEAL = "appeal",
  GRIEVANCE = "grievance",
}

/**
 * Priority levels for recommended actions
 */
export enum ActionPriority {
  URGENT = "urgent",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Severity levels for legal issues
 */
export enum IssueSeverity {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Importance levels for evidence gaps
 */
export enum EvidenceImportance {
  CRITICAL = "critical",
  IMPORTANT = "important",
  HELPFUL = "helpful",
}

/**
 * Overall evidence strength assessment
 */
export enum EvidenceStrength {
  STRONG = "strong",
  MODERATE = "moderate",
  WEAK = "weak",
}

/**
 * Legal source types
 */
export enum LegalSourceType {
  STATUTE = "statute",
  CASE_LAW = "case_law",
  REGULATION = "regulation",
  GUIDANCE = "guidance",
}

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

/**
 * Request for comprehensive case analysis
 */
export interface CaseAnalysisRequest {
  /** Case identifier */
  caseId: string;
  /** Type of legal case */
  caseType: LegalCaseType;
  /** UK jurisdiction */
  jurisdiction: UKJurisdiction;
  /** Detailed case description */
  description: string;
  /** Evidence summaries */
  evidence: EvidenceSummary[];
  /** Timeline of events */
  timeline: TimelineEvent[];
  /** Additional context */
  context?: string;
}

/**
 * Request for evidence analysis
 */
export interface EvidenceAnalysisRequest {
  /** Case identifier */
  caseId: string;
  /** Type of legal case */
  caseType: LegalCaseType;
  /** UK jurisdiction */
  jurisdiction: UKJurisdiction;
  /** List of existing evidence */
  existingEvidence: string[];
  /** Legal claims being pursued */
  claims: string[];
  /** Additional context */
  context?: string;
}

/**
 * Request for document drafting
 */
export interface DocumentDraftRequest {
  /** Type of document to draft */
  documentType: DocumentType;
  /** Case context */
  context: DocumentContext;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Comprehensive case analysis response
 */
export interface CaseAnalysisResponse {
  /** Identified legal issues */
  legalIssues: LegalIssue[];
  /** Applicable UK laws */
  applicableLaw: ApplicableLaw[];
  /** Recommended actions */
  recommendedActions: ActionItem[];
  /** Evidence gaps identified */
  evidenceGaps: EvidenceGap[];
  /** Case complexity assessment */
  estimatedComplexity: ComplexityScore;
  /** AI reasoning explanation */
  reasoning: string;
  /** Legal disclaimer */
  disclaimer: string;
  /** Information sources */
  sources?: LegalSource[];
}

/**
 * Evidence analysis response
 */
export interface EvidenceAnalysisResponse {
  /** Identified gaps in evidence */
  gaps: EvidenceGap[];
  /** Suggestions for additional documentation */
  suggestions: string[];
  /** Overall evidence strength assessment */
  strength: EvidenceStrength;
  /** Detailed explanation */
  explanation: string;
  /** Legal disclaimer */
  disclaimer: string;
}

/**
 * Document draft response
 */
export interface DocumentDraftResponse {
  /** Generated document content */
  content: string;
  /** Document metadata */
  metadata: DocumentMetadata;
  /** Legal disclaimer */
  disclaimer: string;
}

// ============================================================================
// DOMAIN MODEL INTERFACES
// ============================================================================

/**
 * Legal issue identification
 */
export interface LegalIssue {
  /** Description of the legal issue */
  issue: string;
  /** Severity level */
  severity: IssueSeverity;
  /** Relevant legal statutes/regulations */
  relevantLaw: string[];
  /** Potential legal claims */
  potentialClaims: string[];
  /** Possible defenses */
  defenses: string[];
}

/**
 * Applicable law reference
 */
export interface ApplicableLaw {
  /** Statute name */
  statute: string;
  /** Section/article reference */
  section: string;
  /** Plain English summary */
  summary: string;
  /** How it applies to this case */
  application: string;
  /** Which jurisdiction */
  jurisdiction: UKJurisdiction;
}

/**
 * Recommended action item
 */
export interface ActionItem {
  /** Action description */
  action: string;
  /** Deadline (if applicable) */
  deadline?: string;
  /** Priority level */
  priority: ActionPriority;
  /** Rationale for this action */
  rationale: string;
}

/**
 * Evidence gap identification
 */
export interface EvidenceGap {
  /** Description of missing evidence */
  description: string;
  /** Importance level */
  importance: EvidenceImportance;
  /** Suggested sources for obtaining evidence */
  suggestedSources: string[];
}

/**
 * Case complexity scoring
 */
export interface ComplexityScore {
  /** Numeric score (1-10) */
  score: number;
  /** Factors contributing to complexity */
  factors: string[];
  /** Explanation of score */
  explanation: string;
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  /** Event date */
  date: string;
  /** Event description */
  event: string;
  /** Legal significance */
  significance?: string;
}

/**
 * Evidence summary
 */
export interface EvidenceSummary {
  /** Evidence type */
  type: string;
  /** Evidence description */
  description: string;
  /** Date of evidence */
  date?: string;
}

/**
 * Legal source reference
 */
export interface LegalSource {
  /** Source type */
  type: LegalSourceType;
  /** Source title */
  title: string;
  /** Citation or reference */
  citation: string;
  /** URL (if available) */
  url?: string;
}

/**
 * Document context for drafting
 */
export interface DocumentContext {
  /** Case identifier */
  caseId: string;
  /** Case type */
  caseType: LegalCaseType;
  /** Jurisdiction */
  jurisdiction: UKJurisdiction;
  /** Key facts */
  facts: string;
  /** Objectives of document */
  objectives: string;
  /** Available evidence */
  evidence?: string[];
  /** Recipient information */
  recipient?: string;
  /** Additional context */
  additionalContext?: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /** Document type */
  type: DocumentType;
  /** Creation date */
  createdAt: string;
  /** Word count */
  wordCount?: number;
  /** AI model used */
  modelUsed: string;
  /** Case identifier */
  caseId: string;
}

// ============================================================================
// DOCUMENT EXTRACTION (AI-Assisted Case Creation)
// ============================================================================

/**
 * Field extraction source metadata
 * Shows where in the document the data came from
 */
export interface ExtractionSource {
  /** Location in document (e.g., "page 1, line 3", "header", "footer") */
  source: string;
  /** Exact text extracted */
  text: string;
}

/**
 * Confidence scores for extracted fields
 * Scale: 0.0 (no confidence) to 1.0 (very confident)
 */
export interface FieldConfidence {
  /** Confidence in case title extraction */
  title: number;
  /** Confidence in case type classification */
  caseType: number;
  /** Confidence in opposing party identification */
  opposingParty: number;
  /** Confidence in case number extraction */
  caseNumber: number;
  /** Confidence in court name extraction */
  courtName: number;
  /** Confidence in deadline extraction */
  filingDeadline: number;
}

/**
 * Suggested case data extracted from document
 * Used for AI-assisted case creation with user confirmation
 */
export interface SuggestedCaseData {
  /** WARNING: Document belongs to someone else (name mismatch) */
  documentOwnershipMismatch?: boolean;

  /** Name found in document (if different from registered user) */
  documentClaimantName?: string | null;

  /** Suggested case title */
  title: string;

  /** Suggested case type */
  caseType: "employment" | "housing" | "consumer" | "family" | "other";

  /** Brief description extracted/generated from document */
  description: string;

  /** Claimant name (auto-filled from user profile, not extracted from document) */
  claimantName?: string;

  /** Opposing party name (if identifiable) */
  opposingParty?: string;

  /** Case number (if found in document) */
  caseNumber?: string;

  /** Court/tribunal name (if found) */
  courtName?: string;

  /** Filing deadline (if mentioned) */
  filingDeadline?: string;

  /** Next hearing date (if mentioned) */
  nextHearingDate?: string;

  /** Confidence scores for each field */
  confidence: FieldConfidence;

  /** Source metadata showing where data was extracted from */
  extractedFrom: {
    title?: ExtractionSource;
    description?: ExtractionSource;
    opposingParty?: ExtractionSource;
    caseNumber?: ExtractionSource;
    courtName?: ExtractionSource;
    filingDeadline?: ExtractionSource;
  };
}

/**
 * Document extraction response
 * Contains both conversational analysis AND structured case data
 */
export interface DocumentExtractionResponse {
  /** Conversational AI analysis (user-friendly explanation) */
  analysis: string;

  /** Structured case data for pre-filling form */
  suggestedCaseData: SuggestedCaseData;
}
