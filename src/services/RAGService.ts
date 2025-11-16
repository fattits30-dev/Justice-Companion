import { errorLogger } from "../utils/error-logger.ts";
import { legalAPIService } from "./LegalAPIService.ts";
import { aiServiceFactory } from "./AIServiceFactory.ts";
import type {
  LegalContext,
  LegislationResult,
  CaseResult,
  KnowledgeEntry,
  AIResponse,
  AIChatRequest,
} from "../types/ai.ts";

/**
 * RAGService - Retrieval Augmented Generation for Legal Information
 *
 * Orchestrates the complete flow:
 * 1. Question analysis and keyword extraction
 * 2. Parallel API queries (legislation + case law + knowledge base)
 * 3. Context assembly with relevance ranking
 * 4. AI response generation with strict safety rules
 * 5. Source citation tracking
 * 6. "Information not advice" enforcement
 */
export class RAGService {
  /**
   * Process user question and return legal information response
   *
   * @param question - User's legal question
   * @param caseId - Optional case ID for context
   * @returns AI response with sources and citations
   */
  async processQuestion(
    question: string,
    caseId?: number,
  ): Promise<AIResponse> {
    try {
      errorLogger.logError("RAGService.processQuestion started", {
        type: "info",
        question,
        caseId,
      });

      // PHASE 1: Question Analysis
      const keywords = await this.extractAndAnalyzeQuestion(question);
      const category = legalAPIService.classifyQuestion(question);

      errorLogger.logError("Question analyzed", {
        type: "info",
        keywords,
        category,
      });

      // PHASE 2: Parallel API Queries
      const context = await this.fetchLegalContext(keywords, category);

      // PHASE 3: Validate Context
      if (!this.hasValidContext(context)) {
        errorLogger.logError("No legal context found for question", {
          type: "warn",
          question,
          keywords,
        });

        return {
          success: false,
          error:
            "I don't have information on that specific topic. Please try rephrasing your question or consult a qualified solicitor.",
          code: "NO_CONTEXT",
        };
      }

      errorLogger.logError("Legal context assembled", {
        type: "info",
        legislationCount: context.legislation.length,
        caseLawCount: context.caseLaw.length,
        knowledgeBaseCount: context.knowledgeBase.length,
      });

      // PHASE 4: AI Response Generation
      const aiRequest: AIChatRequest = {
        messages: [
          {
            role: "user",
            content: question,
          },
        ],
        context,
        caseId,
      };

      const aiResponse = await aiServiceFactory.chat(aiRequest);

      // PHASE 5: Safety Validation
      if (aiResponse.success) {
        const validationResult = this.validateResponse(
          aiResponse.message.content,
        );

        if (!validationResult.valid) {
          errorLogger.logError("AI response failed safety validation", {
            type: "error",
            violations: validationResult.violations,
            response: aiResponse.message.content,
          });

          // Return safe fallback response
          return {
            success: false,
            error: "Response validation failed. Please rephrase your question.",
            code: "SAFETY_VIOLATION",
          };
        }

        // Ensure disclaimer is present
        aiResponse.message.content = this.enforceDisclaimer(
          aiResponse.message.content,
        );
      }

      errorLogger.logError("RAGService.processQuestion completed", {
        type: "info",
        success: aiResponse.success,
        sourcesCount: aiResponse.success ? aiResponse.sources.length : 0,
      });

      return aiResponse;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "RAGService.processQuestion",
        question,
      });

      return {
        success: false,
        error: "An error occurred processing your question. Please try again.",
        code: "EXCEPTION",
      };
    }
  }

  /**
   * Extract keywords and analyze question intent
   */
  private async extractAndAnalyzeQuestion(question: string): Promise<string[]> {
    // Use LegalAPIService for keyword extraction
    const keywords = await legalAPIService.extractKeywords(question);

    // Return all keywords (already filtered by extractKeywords)
    return keywords.all;
  }

  /**
   * PUBLIC: Fetch legal context for a question (for streaming integration)
   */
  async fetchContextForQuestion(question: string): Promise<LegalContext> {
    const keywords = await this.extractAndAnalyzeQuestion(question);
    const category = legalAPIService.classifyQuestion(question);
    return this.fetchLegalContext(keywords, category);
  }

  /**
   * Fetch legal context from all sources in parallel
   */
  private async fetchLegalContext(
    keywords: string[],
    category: string,
  ): Promise<LegalContext> {
    try {
      // Query all APIs in parallel for speed
      const [legislation, caseLaw, knowledgeBase] = await Promise.all([
        legalAPIService.searchLegislation(keywords),
        legalAPIService.searchCaseLaw(keywords),
        legalAPIService.searchKnowledgeBase(keywords),
      ]);

      // Assemble context with limits to prevent token overflow
      const context: LegalContext = {
        legislation: this.limitAndSortLegislation(
          legislation as LegislationResult[],
        ),
        caseLaw: this.limitAndSortCaseLaw(caseLaw as CaseResult[]),
        knowledgeBase: this.limitKnowledgeBase(
          knowledgeBase as KnowledgeEntry[],
        ),
      };

      return context;
    } catch (error) {
      errorLogger.logError("Failed to fetch legal context", {
        error: error instanceof Error ? error.message : "Unknown error",
        keywords,
        category,
      });

      // Return empty context on API failure
      return {
        legislation: [],
        caseLaw: [],
        knowledgeBase: [],
      };
    }
  }

  /**
   * Limit legislation results to top 5 most relevant
   * Sort by relevance score if available
   */
  private limitAndSortLegislation(
    results: LegislationResult[],
  ): LegislationResult[] {
    // Sort by relevance score (descending)
    const sorted = [...results].sort((a, b) => {
      const scoreA = a.relevance ?? 0;
      const scoreB = b.relevance ?? 0;
      return scoreB - scoreA;
    });

    // Limit to top 5 to prevent context overflow
    return sorted.slice(0, 5);
  }

  /**
   * Limit case law results to top 3 most relevant
   * Sort by relevance score if available
   */
  private limitAndSortCaseLaw(results: CaseResult[]): CaseResult[] {
    // Sort by relevance score (descending)
    const sorted = [...results].sort((a, b) => {
      const scoreA = a.relevance ?? 0;
      const scoreB = b.relevance ?? 0;
      return scoreB - scoreA;
    });

    // Limit to top 3 to prevent context overflow
    return sorted.slice(0, 3);
  }

  /**
   * Limit knowledge base results to top 3
   */
  private limitKnowledgeBase(results: KnowledgeEntry[]): KnowledgeEntry[] {
    return results.slice(0, 3);
  }

  /**
   * Check if context has at least some legal information
   */
  private hasValidContext(context: LegalContext): boolean {
    return (
      context.legislation.length > 0 ||
      context.caseLaw.length > 0 ||
      context.knowledgeBase.length > 0
    );
  }

  /**
   * Validate AI response for safety compliance
   * Ensures no advice language, proper citations, etc.
   */
  private validateResponse(response: string): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Check for advice language (CRITICAL - never give advice)
    const advicePatterns = [
      /\byou should\b/i,
      /\bi recommend\b/i,
      /\byou must\b/i,
      /\bi advise\b/i,
      /\byou ought to\b/i,
      /\bmy advice is\b/i,
      /\bi suggest you\b/i,
    ];

    for (const pattern of advicePatterns) {
      if (pattern.test(response)) {
        violations.push(`Contains advice language: ${pattern.source}`);
      }
    }

    // Check for disclaimer presence (should end with disclaimer)
    if (!response.includes("⚠️") && !lowerResponse.includes("disclaimer")) {
      violations.push("Missing required disclaimer");
    }

    // Response too short (likely not informative)
    if (response.length < 50) {
      violations.push("Response too short to be informative");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Ensure response ends with required disclaimer
   * Adds disclaimer if missing
   */
  private enforceDisclaimer(response: string): string {
    const disclaimer =
      "\n\n⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor.";

    // Check if disclaimer already present
    if (
      response.includes("⚠️") ||
      response.toLowerCase().includes("this is general information only")
    ) {
      return response;
    }

    // Add disclaimer
    return response + disclaimer;
  }

  /**
   * Get statistics about last query (for debugging/monitoring)
   */
  getLastQueryStats(): {
    hasStats: boolean;
    message?: string;
  } {
    // Placeholder for future enhancement
    return {
      hasStats: false,
      message: "Statistics tracking not yet implemented",
    };
  }
}

// Singleton instance
export const ragService = new RAGService();
