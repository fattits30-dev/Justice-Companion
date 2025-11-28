/**
 * AI API Client
 *
 * Client for interacting with the Justice Companion AI service.
 * Handles document analysis, OCR, and chat completions.
 *
 * @module aiApiClient
 */

import type { AIDocumentAnalysis } from '../types/ai.ts';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

/**
 * AI API Error class
 */
export class AIApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AIApiError';
  }
}

/**
 * AI API Client for document analysis and chat
 */
export class AIApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze a document with AI
   * 
   * @param file - File to analyze
   * @param caseContext - Optional context about the case
   * @returns Document analysis with extracted facts, dates, parties
   */
  async analyzeDocument(
    file: File,
    caseContext?: string
  ): Promise<AIDocumentAnalysis> {
    const formData = new FormData();
    formData.append('file', file);

    const url = new URL('/vision/analyze/document', this.baseUrl);
    if (caseContext) {
      url.searchParams.set('case_context', caseContext);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIApiError(
        response.status,
        `Document analysis failed: ${error}`,
        'ANALYSIS_ERROR'
      );
    }

    return response.json();
  }

  /**
   * Check if AI service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Default AI API client instance
 */
export const aiApi = new AIApiClient();
