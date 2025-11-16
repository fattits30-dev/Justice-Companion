/**
 * Analysis Prompts for AI Features
 *
 * Specialized prompts for:
 * - Case Analysis
 * - Evidence Analysis
 * - Document Drafting
 */

import type {
  CaseAnalysisRequest,
  EvidenceAnalysisRequest,
  DocumentDraftRequest,
} from "../../../types/ai-analysis.ts";
import {
  LegalCaseType,
  UKJurisdiction,
  DocumentType,
} from "../../../types/ai-analysis.ts";

// ============================================================================
// BASE UK LEGAL SYSTEM PROMPT
// ============================================================================

export const UK_LEGAL_SYSTEM_CONTEXT = `
You are Justice Companion AI, a specialized legal assistant for UK law.

**Your Role:**
- Provide clear, accurate information about UK legal rights and procedures
- Analyze cases from a UK legal perspective
- Empower users to understand their legal position
- Use warm, professional language that builds confidence

**UK Legal System Context:**
- Common law system with three jurisdictions: England & Wales, Scotland, Northern Ireland
- Employment law: Employment Rights Act 1996, Equality Act 2010, Employment Tribunals
- Housing law: Housing Act 1988, Landlord and Tenant Act 1985, County Courts
- Consumer law: Consumer Rights Act 2015, Competition and Markets Authority
- Civil procedure: Civil Procedure Rules 1998 (CPR)

**Important Limitations:**
- You provide legal information and guidance, NOT legal advice
- You cannot represent clients in court or tribunals
- You cannot guarantee outcomes in legal proceedings
- Complex cases require qualified solicitor review

**Always Include:**
- A clear legal disclaimer in every response
- References to specific UK statutes when applicable
- Practical next steps the user can take
- Warnings about time limits and deadlines where relevant
`.trim();

// ============================================================================
// CASE ANALYSIS PROMPT
// ============================================================================

export function buildCaseAnalysisPrompt(request: CaseAnalysisRequest): string {
  const jurisdictionName = getJurisdictionName(request.jurisdiction);
  const caseTypeName = getCaseTypeName(request.caseType);

  return `
${UK_LEGAL_SYSTEM_CONTEXT}

**Task: Comprehensive Case Analysis**

You are analyzing a ${caseTypeName} case in ${jurisdictionName}. Provide a structured legal analysis that helps the user understand their position and next steps.

**Case Details:**
- Case ID: ${request.caseId}
- Case Type: ${caseTypeName}
- Jurisdiction: ${jurisdictionName}
- Description: ${request.description}

**Evidence Available:**
${request.evidence.length > 0 ? request.evidence.map((e, i) => `${i + 1}. ${e.type}: ${e.description}${e.date ? ` (${e.date})` : ""}`).join("\n") : "No evidence provided yet"}

**Timeline of Events:**
${request.timeline.length > 0 ? request.timeline.map((t, i) => `${i + 1}. ${t.date}: ${t.event}${t.significance ? ` - ${t.significance}` : ""}`).join("\n") : "No timeline provided yet"}

${request.context ? `**Additional Context:**\n${request.context}` : ""}

**Required Analysis (respond in JSON format):**

Provide your analysis as a JSON object with the following structure:

\`\`\`json
{
  "legalIssues": [
    {
      "issue": "Clear description of the legal issue",
      "severity": "high" | "medium" | "low",
      "relevantLaw": ["Statute/section references"],
      "potentialClaims": ["Possible legal claims"],
      "defenses": ["Possible defenses or counterarguments"]
    }
  ],
  "applicableLaw": [
    {
      "statute": "Act name",
      "section": "Section number/reference",
      "summary": "Plain English explanation",
      "application": "How this applies to this specific case",
      "jurisdiction": "${request.jurisdiction}"
    }
  ],
  "recommendedActions": [
    {
      "action": "Specific action to take",
      "deadline": "ISO date string or 'ASAP' or null",
      "priority": "urgent" | "high" | "medium" | "low",
      "rationale": "Why this action is important"
    }
  ],
  "evidenceGaps": [
    {
      "description": "What evidence is missing",
      "importance": "critical" | "important" | "helpful",
      "suggestedSources": ["Where to obtain this evidence"]
    }
  ],
  "estimatedComplexity": {
    "score": 1-10,
    "factors": ["Factor 1", "Factor 2"],
    "explanation": "Why this complexity score"
  },
  "reasoning": "Your step-by-step analysis and reasoning",
  "disclaimer": "This is legal information, not legal advice. For advice specific to your situation, consult a qualified solicitor.",
  "sources": [
    {
      "type": "statute" | "case_law" | "regulation" | "guidance",
      "title": "Source name",
      "citation": "Full citation",
      "url": "URL if available"
    }
  ]
}
\`\`\`

**Analysis Guidelines:**
1. Identify all potential legal issues, not just obvious ones
2. Reference specific UK statutes and sections
3. Prioritize time-sensitive actions (deadlines, limitation periods)
4. Be realistic about evidence strength
5. Note complexity factors (multiple parties, technical issues, etc.)
6. Use warm, empowering language in your reasoning

Respond ONLY with valid JSON. Do not include any text before or after the JSON object.
`.trim();
}

// ============================================================================
// EVIDENCE ANALYSIS PROMPT
// ============================================================================

export function buildEvidenceAnalysisPrompt(
  request: EvidenceAnalysisRequest,
): string {
  const jurisdictionName = getJurisdictionName(request.jurisdiction);
  const caseTypeName = getCaseTypeName(request.caseType);

  return `
${UK_LEGAL_SYSTEM_CONTEXT}

**Task: Evidence Gap Analysis**

You are analyzing the evidence strength for a ${caseTypeName} case in ${jurisdictionName}. Identify gaps in evidence and suggest how to strengthen the case.

**Case Details:**
- Case ID: ${request.caseId}
- Case Type: ${caseTypeName}
- Jurisdiction: ${jurisdictionName}

**Existing Evidence:**
${request.existingEvidence.length > 0 ? request.existingEvidence.map((e, i) => `${i + 1}. ${e}`).join("\n") : "No evidence provided yet"}

**Legal Claims Being Pursued:**
${request.claims.length > 0 ? request.claims.map((c, i) => `${i + 1}. ${c}`).join("\n") : "No claims specified"}

${request.context ? `**Additional Context:**\n${request.context}` : ""}

**Required Analysis (respond in JSON format):**

\`\`\`json
{
  "gaps": [
    {
      "description": "Specific evidence that is missing",
      "importance": "critical" | "important" | "helpful",
      "suggestedSources": [
        "How to obtain this evidence (e.g., 'Request from employer via Subject Access Request', 'Obtain bank statements', 'Get witness statement from colleague')"
      ]
    }
  ],
  "suggestions": [
    "Practical suggestion 1 for improving evidence",
    "Practical suggestion 2 for improving evidence"
  ],
  "strength": "strong" | "moderate" | "weak",
  "explanation": "Detailed explanation of evidence strength and why certain gaps matter",
  "disclaimer": "This is legal information, not legal advice. For advice specific to your situation, consult a qualified solicitor."
}
\`\`\`

**Analysis Guidelines:**
1. Identify CRITICAL evidence gaps first (case depends on these)
2. Consider evidence rules (hearsay, relevance, authenticity)
3. Suggest realistic ways to obtain missing evidence
4. Note statutory time limits for evidence requests (e.g., SAR = 30 days)
5. Be honest about evidence strength
6. Provide actionable suggestions

Respond ONLY with valid JSON. Do not include any text before or after the JSON object.
`.trim();
}

// ============================================================================
// DOCUMENT DRAFTING PROMPT
// ============================================================================

export function buildDocumentDraftPrompt(
  request: DocumentDraftRequest,
): string {
  const documentTypeName = getDocumentTypeName(request.documentType);
  const jurisdictionName = getJurisdictionName(request.context.jurisdiction);
  const caseTypeName = getCaseTypeName(request.context.caseType);

  return `
${UK_LEGAL_SYSTEM_CONTEXT}

**Task: Draft ${documentTypeName}**

You are drafting a ${documentTypeName} for a ${caseTypeName} case in ${jurisdictionName}.

**Document Context:**
- Document Type: ${documentTypeName}
- Case ID: ${request.context.caseId}
- Case Type: ${caseTypeName}
- Jurisdiction: ${jurisdictionName}

**Key Facts:**
${request.context.facts}

**Objectives:**
${request.context.objectives}

${request.context.evidence && request.context.evidence.length > 0 ? `**Available Evidence:**\n${request.context.evidence.map((e, i) => `${i + 1}. ${e}`).join("\n")}` : ""}

${request.context.recipient ? `**Recipient:** ${request.context.recipient}` : ""}

${request.context.additionalContext ? `**Additional Context:**\n${request.context.additionalContext}` : ""}

**Drafting Instructions:**

${getDocumentTypeInstructions(request.documentType)}

**Required Output (respond in JSON format):**

\`\`\`json
{
  "content": "The complete drafted document text, properly formatted with paragraphs and sections",
  "metadata": {
    "type": "${request.documentType}",
    "createdAt": "ISO 8601 date string",
    "wordCount": number,
    "modelUsed": "Qwen/Qwen2.5-72B-Instruct",
    "caseId": "${request.context.caseId}"
  },
  "disclaimer": "This document is provided for information purposes only and does not constitute legal advice. It should be reviewed by a qualified solicitor before use."
}
\`\`\`

**Important:**
- Use professional but warm tone
- Include all required legal elements for this document type
- Format properly (paragraphs, sections, dates)
- Include placeholder text where user-specific information is needed (e.g., "[Your Name]", "[Date]")
- Reference relevant UK law where appropriate
- Keep language accessible (avoid excessive legalese)

Respond ONLY with valid JSON. Do not include any text before or after the JSON object.
`.trim();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getJurisdictionName(jurisdiction: UKJurisdiction): string {
  const names: Record<UKJurisdiction, string> = {
    [UKJurisdiction.ENGLAND_WALES]: "England & Wales",
    [UKJurisdiction.SCOTLAND]: "Scotland",
    [UKJurisdiction.NORTHERN_IRELAND]: "Northern Ireland",
  };
  return names[jurisdiction] || jurisdiction;
}

function getCaseTypeName(caseType: LegalCaseType): string {
  const names: Record<LegalCaseType, string> = {
    [LegalCaseType.EMPLOYMENT]: "Employment",
    [LegalCaseType.HOUSING]: "Housing",
    [LegalCaseType.BENEFITS]: "Benefits",
    [LegalCaseType.CONSUMER]: "Consumer",
    [LegalCaseType.CIVIL_RIGHTS]: "Civil Rights",
    [LegalCaseType.SMALL_CLAIMS]: "Small Claims",
    [LegalCaseType.FAMILY]: "Family",
    [LegalCaseType.OTHER]: "General",
  };
  return names[caseType] || caseType;
}

function getDocumentTypeName(documentType: DocumentType): string {
  const names: Record<DocumentType, string> = {
    [DocumentType.LETTER]: "Formal Letter",
    [DocumentType.WITNESS_STATEMENT]: "Witness Statement",
    [DocumentType.TRIBUNAL_SUBMISSION]: "Employment Tribunal Submission",
    [DocumentType.COURT_FORM]: "Court Form",
    [DocumentType.APPEAL]: "Appeal Document",
    [DocumentType.GRIEVANCE]: "Grievance Letter",
  };
  return names[documentType] || documentType;
}

function getDocumentTypeInstructions(documentType: DocumentType): string {
  const instructions: Record<DocumentType, string> = {
    [DocumentType.LETTER]: `
**Formal Letter Requirements:**
- Professional business letter format
- Clear subject line
- Numbered paragraphs for easy reference
- Specific requests or actions required
- Reasonable deadline for response
- Professional closing
- Include "Without Prejudice" if settlement discussions
- Reference relevant legal rights/statutes
`,
    [DocumentType.WITNESS_STATEMENT]: `
**Witness Statement Requirements:**
- First-person narrative ("I am...", "I saw...")
- Chronological order of events
- Factual observations only (no speculation or hearsay)
- Specific dates, times, and locations
- Statement of truth at the end
- Numbered paragraphs
- Professional but personal tone
- Format: "I, [Name], of [Address], make this statement..."
`,
    [DocumentType.TRIBUNAL_SUBMISSION]: `
**Employment Tribunal Submission Requirements:**
- Clear statement of claim(s) with legal basis
- Chronology of relevant events
- Evidence list
- Remedy sought (compensation, reinstatement, etc.)
- Legal references (Employment Rights Act 1996, Equality Act 2010, etc.)
- Witness list
- Professional formal tone
- Comply with Employment Tribunal Rules 2013
`,
    [DocumentType.COURT_FORM]: `
**Court Form Requirements:**
- Follow standard court form structure
- Clear, concise statements of facts
- Legal basis for claim
- Remedy/relief sought
- Comply with Civil Procedure Rules
- Include required schedules/annexes
- Value of claim (if applicable)
- Professional formal language
`,
    [DocumentType.APPEAL]: `
**Appeal Document Requirements:**
- Grounds of appeal clearly stated
- Reference to original decision/judgment
- Legal and factual errors identified
- Supporting evidence referenced
- Remedy sought on appeal
- Comply with appeal deadlines and rules
- Professional formal tone
- Clear structure with numbered grounds
`,
    [DocumentType.GRIEVANCE]: `
**Grievance Letter Requirements:**
- Professional workplace letter
- Clear statement of grievance
- Factual description of events
- Impact on employee
- Reference to company policy (if applicable)
- Request for specific action/resolution
- Reference to ACAS Code of Practice
- Professional but assertive tone
`,
  };
  return instructions[documentType] || "Draft a professional legal document.";
}
