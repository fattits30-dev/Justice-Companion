/**
 * AI Function Definitions for node-llama-cpp
 *
 * This module defines functions that the AI can call to interact with
 * the Justice Companion API (cases and evidence management).
 *
 * Each function uses node-llama-cpp's defineChatSessionFunction to create
 * a structured tool that the LLM can invoke during conversations.
 *
 * Type Safety: All functions are fully typed with proper TypeScript interfaces.
 * Session Management: sessionId is retrieved from localStorage for authentication.
 */

// @ts-expect-error - node-llama-cpp is an optional dependency with no type declarations
import { defineChatSessionFunction } from "node-llama-cpp";
import type { CaseStatus } from "../domains/cases/entities/Case.ts";
import type {
  CreateCaseInput,
  UpdateCaseInput,
} from "../domains/cases/entities/Case.ts";
import type {
  CreateEvidenceInput,
  EvidenceType,
} from "../domains/evidence/entities/Evidence.ts";
import type {
  CreateCaseParams,
  CreateCaseResult,
  GetCaseParams,
  GetCaseResult,
  ListCasesParams,
  ListCasesResult,
  UpdateCaseParams,
  UpdateCaseResult,
  CreateEvidenceParams,
  CreateEvidenceResult,
  ListEvidenceParams,
  ListEvidenceResult,
  StoreCaseFactParams,
  StoreCaseFactResult,
  GetCaseFactsParams,
  GetCaseFactsResult,
  SearchLegislationParams,
  SearchLegislationResult,
  SearchCaseLawParams,
  SearchCaseLawResult,
  ClassifyQuestionParams,
  ClassifyQuestionResult,
  FactCategory,
  FactImportance,
  LegislationResult,
  CaseLawResult,
} from "../types/ai-functions.ts";
import { getSessionId } from "../types/ai-functions.ts";

// ============================================================================
// CASE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Function: create_case
 * Creates a new legal case in the database
 */
const createCaseFunction = defineChatSessionFunction({
  description:
    "Create a new legal case. Use when user wants to track a new legal matter or issue.",
  params: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          'Brief, descriptive case title (e.g., "Unfair Dismissal - ABC Company Ltd", "Housing Disrepair - 123 Main St")',
      },
      caseType: {
        type: "string",
        enum: ["employment", "housing", "consumer", "family", "debt", "other"],
        description:
          "Type of legal case. Choose the most appropriate category.",
      },
      description: {
        type: "string",
        description:
          "Detailed description of the case, including key facts, dates, and parties involved",
      },
    },
    required: ["title", "caseType", "description"],
  },
  handler: async (params: CreateCaseParams): Promise<CreateCaseResult> => {
    const sessionId = getSessionId();

    const input: CreateCaseInput = {
      title: params.title,
      caseType:
        (params.caseType as
          | "employment"
          | "housing"
          | "consumer"
          | "family"
          | "debt"
          | "other"
          | undefined) ?? "other",
      description: params.description,
    };

    const response = await window.justiceAPI.createCase(input, sessionId);

    if (response.success && response.data) {
      return {
        success: true,
        caseId: response.data.id,
        title: response.data.title,
        status: response.data.status,
        createdAt: response.data.createdAt,
        message: `Case created successfully with ID ${response.data.id}`,
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to create case",
      );
    }
  },
});

/**
 * Function: get_case
 * Retrieves a specific case by ID
 */
const getCaseFunction = defineChatSessionFunction({
  description:
    "Get details of a specific case by ID. Use when user references a case number or asks about a specific case.",
  params: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "The unique ID of the case to retrieve",
      },
    },
    required: ["caseId"],
  },
  handler: async (params: GetCaseParams): Promise<GetCaseResult> => {
    const sessionId = getSessionId();

    const response = await window.justiceAPI.getCaseById(
      params.caseId.toString(),
      sessionId,
    );

    if (response.success) {
      if (response.data === null || response.data === undefined) {
        return {
          success: false,
          message: `Case with ID ${params.caseId} not found`,
        };
      }

      return {
        success: true,
        case: {
          id: response.data.id,
          title: response.data.title,
          caseType: response.data.caseType,
          description: response.data.description ?? undefined,
          status: response.data.status,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        },
        message: `Retrieved case: ${response.data.title}`,
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to retrieve case",
      );
    }
  },
});

/**
 * Function: list_cases
 * Lists all cases, optionally filtered by status
 */
const listCasesFunction = defineChatSessionFunction({
  description:
    "List all cases. Use when user asks to see all cases, active cases, or closed cases.",
  params: {
    type: "object",
    properties: {
      filterStatus: {
        type: "string",
        enum: ["all", "active", "closed", "pending"],
        description:
          'Filter cases by status. Use "all" to retrieve all cases, or specify a status to filter.',
      },
    },
    required: [],
  },
  handler: async (params: ListCasesParams): Promise<ListCasesResult> => {
    const sessionId = getSessionId();

    const response = await window.justiceAPI.getAllCases(sessionId);

    if (response.success && response.data) {
      let cases = response.data;

      // Apply status filter if specified
      if (params.filterStatus && params.filterStatus !== "all") {
        cases = cases.filter((c) => c.status === params.filterStatus);
      }

      return {
        success: true,
        totalCases: cases.length,
        cases: cases.map((c) => ({
          id: c.id,
          title: c.title,
          caseType: c.caseType,
          status: c.status,
          createdAt: c.createdAt,
        })),
        message: `Found ${cases.length} case(s)`,
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to list cases",
      );
    }
  },
});

/**
 * Function: update_case
 * Updates an existing case
 */
const updateCaseFunction = defineChatSessionFunction({
  description:
    "Update an existing case. Use when user wants to modify case details, change status, or add information.",
  params: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "The unique ID of the case to update",
      },
      title: {
        type: "string",
        description: "New case title (optional)",
      },
      caseType: {
        type: "string",
        enum: ["employment", "housing", "consumer", "family", "debt", "other"],
        description: "New case type (optional)",
      },
      description: {
        type: "string",
        description: "New case description (optional)",
      },
      status: {
        type: "string",
        enum: ["active", "closed", "pending"],
        description: "New case status (optional)",
      },
    },
    required: ["caseId"],
  },
  handler: async (params: UpdateCaseParams): Promise<UpdateCaseResult> => {
    const sessionId = getSessionId();

    const input: UpdateCaseInput = {};

    if (params.title !== undefined) {
      input.title = params.title;
    }
    if (params.caseType !== undefined) {
      input.caseType = params.caseType as
        | "employment"
        | "housing"
        | "consumer"
        | "family"
        | "debt"
        | "other";
    }
    if (params.description !== undefined) {
      input.description = params.description;
    }
    if (params.status !== undefined) {
      input.status = params.status as CaseStatus;
    }

    const response = await window.justiceAPI.updateCase(
      params.caseId.toString(),
      input,
      sessionId,
    );

    if (response.success) {
      if (response.data === null || response.data === undefined) {
        return {
          success: false,
          message: `Case with ID ${params.caseId} not found`,
        };
      }

      return {
        success: true,
        case: {
          id: response.data.id,
          title: response.data.title,
          caseType: response.data.caseType,
          description: response.data.description ?? undefined,
          status: response.data.status,
          updatedAt: response.data.updatedAt ?? new Date().toISOString(),
        },
        message: `Case ${params.caseId} updated successfully`,
      };
    } else {
      throw new Error(response.error?.message || "Unknown error");
    }
  },
});

// ============================================================================
// EVIDENCE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Function: create_evidence
 * Creates a new evidence item for a case
 */
const createEvidenceFunction = defineChatSessionFunction({
  description:
    "Create a new evidence item for a case. Use when user wants to add documents, photos, emails, recordings, or notes to a case.",
  params: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "The ID of the case this evidence belongs to",
      },
      title: {
        type: "string",
        description:
          'Brief title describing the evidence (e.g., "Employment Contract", "Email from Manager", "Photo of Defect")',
      },
      evidenceType: {
        type: "string",
        enum: ["document", "photo", "email", "recording", "note"],
        description: "Type of evidence being added",
      },
      content: {
        type: "string",
        description:
          "Text content of the evidence (e.g., email body, notes, transcripts). Optional for files.",
      },
      filePath: {
        type: "string",
        description:
          "Path to the evidence file (for documents, photos, recordings). Optional for text notes.",
      },
      obtainedDate: {
        type: "string",
        description:
          "Date the evidence was obtained (ISO 8601 format: YYYY-MM-DD). Optional.",
      },
    },
    required: ["caseId", "title", "evidenceType"],
  },
  handler: async (
    params: CreateEvidenceParams,
  ): Promise<CreateEvidenceResult> => {
    // Note: sessionId would be needed here once createEvidence IPC is implemented
    // const sessionId = getSessionId();

    // Validate required evidenceType
    if (!params.evidenceType) {
      throw new Error("evidenceType is required");
    }

    const input: CreateEvidenceInput = {
      caseId: params.caseId,
      title: params.title,
      evidenceType: params.evidenceType as EvidenceType,
    };

    if (params.content !== undefined) {
      input.content = params.content;
    }
    if (params.filePath !== undefined) {
      input.filePath = params.filePath;
    }
    if (params.obtainedDate !== undefined) {
      input.obtainedDate = params.obtainedDate;
    }

    // Note: createEvidence IPC method needs to be implemented
    // For now, we'll use a workaround or throw a descriptive error
    throw new Error(
      "createEvidence IPC method not yet implemented. Use uploadFile instead.",
    );
  },
});

/**
 * Function: list_evidence
 * Lists all evidence for a specific case
 */
const listEvidenceFunction = defineChatSessionFunction({
  description:
    "List all evidence items for a specific case. Use when user asks to see evidence, documents, or attachments for a case.",
  params: {
    type: "object",
    properties: {
      caseId: {
        type: "number",
        description: "The ID of the case to list evidence for",
      },
    },
    required: ["caseId"],
  },
  handler: async (params: ListEvidenceParams): Promise<ListEvidenceResult> => {
    const sessionId = getSessionId();

    const response = await window.justiceAPI.getEvidenceByCaseId(
      params.caseId.toString(),
      sessionId,
    );

    if (response.success && response.data) {
      return {
        success: true,
        totalEvidence: response.data.length,
        evidence: response.data.map((e) => ({
          id: e.id,
          title: e.title,
          evidenceType: e.evidenceType,
          obtainedDate: e.obtainedDate ?? undefined,
          hasFile: !!e.filePath,
          hasContent: !!e.content,
          createdAt: e.createdAt,
        })),
        message: `Found ${response.data.length} evidence item(s) for case ${params.caseId}`,
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to list evidence",
      );
    }
  },
});

// ============================================================================
// FACT MEMORY FUNCTIONS (CRITICAL) - AI Memory System
// ============================================================================

/**
 * Store case fact - CRITICAL MEMORY FUNCTION
 * AI calls this to remember user-provided information
 */
const storeCaseFactFunction = defineChatSessionFunction({
  description:
    "Store a fact about a case for memory. Use IMMEDIATELY when user provides names, dates, events, evidence.",
  params: {
    type: "object",
    properties: {
      caseId: { type: "number", description: "Case ID" },
      factContent: { type: "string", description: "The fact content" },
      factCategory: {
        type: "string",
        enum: [
          "timeline",
          "evidence",
          "witness",
          "location",
          "communication",
          "other",
        ],
        description: "Fact category",
      },
      importance: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description: "Importance (default: medium)",
      },
    },
    required: ["caseId", "factContent", "factCategory"],
  },
  handler: async (
    params: StoreCaseFactParams,
  ): Promise<StoreCaseFactResult> => {
    const sessionId = getSessionId();

    const response = await window.justiceAPI.createCaseFact(
      {
        caseId: params.caseId,
        factContent: params.factContent,
        factCategory:
          (params.factCategory as FactCategory | undefined) ?? "other",
        importance:
          (params.importance as FactImportance | undefined) ?? "medium",
      },
      sessionId,
    );

    if (response.success && response.data) {
      return {
        success: true,
        factId: response.data.id,
        message: "Fact stored successfully",
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to store fact",
      );
    }
  },
});

/**
 * Get case facts - MEMORY RECALL FUNCTION
 * AI calls this to recall previously stored information
 */
const getCaseFactsFunction = defineChatSessionFunction({
  description:
    "Retrieve stored facts for a case to recall previous information.",
  params: {
    type: "object",
    properties: {
      caseId: { type: "number", description: "Case ID" },
      factCategory: {
        type: "string",
        description: "Optional: Filter by category",
      },
    },
    required: ["caseId"],
  },
  handler: async (params: GetCaseFactsParams): Promise<GetCaseFactsResult> => {
    const sessionId = getSessionId();

    const response = await window.justiceAPI.getCaseFacts(
      params.caseId,
      sessionId,
    );

    if (response.success && response.data) {
      // Filter by category if specified
      let facts = response.data;
      if (params.factCategory) {
        facts = facts.filter((f) => f.factCategory === params.factCategory);
      }

      return {
        success: true,
        facts,
        message: `Found ${facts.length} fact(s)`,
      };
    } else {
      throw new Error(
        !response.success
          ? response.error?.message || "Unknown error"
          : "Failed to get facts",
      );
    }
  },
});

// ============================================================================
// LEGAL RESEARCH FUNCTIONS - Dynamic imports to avoid circular dependencies
// ============================================================================

/**
 * Search UK legislation
 */
const searchLegislationFunction = defineChatSessionFunction({
  description:
    "Search UK legislation (Acts, regulations). Use when user asks about laws or rights.",
  params: {
    type: "object",
    properties: { query: { type: "string", description: "Search query" } },
    required: ["query"],
  },
  handler: async (
    params: SearchLegislationParams,
  ): Promise<SearchLegislationResult> => {
    const { legalAPIService } = await import("./LegalAPIService.ts");
    const keywords = await legalAPIService.extractKeywords(params.query);
    const results = await legalAPIService.searchLegislation(keywords.all);
    const typedResults = results as LegislationResult[];
    return {
      success: true,
      results: typedResults,
      message: `Found ${typedResults.length} result(s)`,
    };
  },
});

/**
 * Search UK case law
 */
const searchCaseLawFunction = defineChatSessionFunction({
  description:
    "Search UK case law (judgments, decisions). Use for legal precedents.",
  params: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      category: {
        type: "string",
        enum: [
          "employment",
          "discrimination",
          "housing",
          "family",
          "consumer",
          "criminal",
          "civil",
          "general",
        ],
        description: "Legal category (optional)",
      },
    },
    required: ["query"],
  },
  handler: async (
    params: SearchCaseLawParams,
  ): Promise<SearchCaseLawResult> => {
    const { legalAPIService } = await import("./LegalAPIService.ts");
    const keywords = await legalAPIService.extractKeywords(params.query);
    const category =
      params.category || legalAPIService.classifyQuestion(params.query);
    const results = await legalAPIService.searchCaseLaw(keywords.all, category);
    const typedResults = results as CaseLawResult[];
    return {
      success: true,
      results: typedResults,
      category,
      message: `Found ${typedResults.length} result(s)`,
    };
  },
});

/**
 * Classify legal question
 */
const classifyQuestionFunction = defineChatSessionFunction({
  description:
    "Classify a legal question into a category (employment, housing, etc.).",
  params: {
    type: "object",
    properties: { question: { type: "string", description: "Legal question" } },
    required: ["question"],
  },
  handler: async (
    params: ClassifyQuestionParams,
  ): Promise<ClassifyQuestionResult> => {
    const { legalAPIService } = await import("./LegalAPIService.ts");
    const category = legalAPIService.classifyQuestion(params.question);
    const confidence = category === "general" ? 0.3 : 0.9;
    return {
      success: true,
      category,
      confidence,
      message: `Classified as: ${category}`,
    };
  },
});

// ============================================================================
// EXPORTED AI FUNCTIONS
// ============================================================================

/**
 * Export all AI functions as a single object
 * This can be registered with the LLM chat session
 */
export const aiFunctions = {
  // Case & Evidence Management (6 functions)
  create_case: createCaseFunction,
  get_case: getCaseFunction,
  list_cases: listCasesFunction,
  update_case: updateCaseFunction,
  create_evidence: createEvidenceFunction,
  list_evidence: listEvidenceFunction,

  // Fact Memory (2 CRITICAL functions)
  store_case_fact: storeCaseFactFunction,
  get_case_facts: getCaseFactsFunction,

  // Legal Research (3 functions)
  search_legislation: searchLegislationFunction,
  search_case_law: searchCaseLawFunction,
  classify_question: classifyQuestionFunction,
};
