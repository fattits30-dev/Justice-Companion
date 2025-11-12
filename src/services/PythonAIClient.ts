/**
 * Python AI Service HTTP Client
 *
 * Handles communication with the Python AI microservice for document analysis.
 * Supports both document content (parsed text) and image uploads (OCR).
 *
 * Features:
 * - HuggingFace-first AI analysis (privacy-first, £9/month)
 * - Image OCR support (JPG, PNG, BMP, TIFF, PDF, HEIC)
 * - Automatic retries with exponential backoff
 * - Comprehensive error handling
 *
 * Author: Justice Companion Team
 * License: MIT
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { logger } from '../utils/logger';

// Request/Response types matching Python service
export interface ParsedDocument {
  filename: string;
  text: string;
  wordCount: number;
  fileType: string;
}

export interface UserProfile {
  name: string;
  email: string | null;
}

export interface DocumentAnalysisRequest {
  document: ParsedDocument;
  userProfile: UserProfile;
  sessionId: string;
  userQuestion?: string;
}

export interface ExtractionSource {
  source: string;
  text: string;
}

export interface ConfidenceScores {
  title: number;
  caseType: number;
  description: number;
  opposingParty: number;
  caseNumber: number;
  courtName: number;
  filingDeadline: number;
  nextHearingDate: number;
}

export interface SuggestedCaseData {
  documentOwnershipMismatch: boolean;
  documentClaimantName: string | null;
  title: string;
  caseType: 'employment' | 'housing' | 'consumer' | 'family' | 'other';
  description: string;
  claimantName: string;
  opposingParty: string | null;
  caseNumber: string | null;
  courtName: string | null;
  filingDeadline: string | null;
  nextHearingDate: string | null;
  confidence: ConfidenceScores;
  extractedFrom: Record<string, ExtractionSource>;
}

export interface DocumentAnalysisResponse {
  analysis: string;
  suggestedCaseData: SuggestedCaseData;
  metadata?: Record<string, unknown>;
}

export interface PythonAIClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * HTTP client for Python AI service communication.
 */
export class PythonAIClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: PythonAIClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 120000, // 120 seconds default
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Check if Python AI service is available.
   *
   * @returns True if service is healthy
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000, // Quick health check
      });
      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      logger.warn('[PythonAIClient] Service not available', { error });
      return false;
    }
  }

  /**
   * Get Python AI service information.
   *
   * @returns Service info including model provider and availability
   */
  async getInfo(): Promise<{
    api_version: string;
    service: string;
    version: string;
    model_provider: string;
    model_ready: boolean;
    available_agents: string[];
  }> {
    const response = await this.client.get('/api/v1/info');
    return response.data;
  }

  /**
   * Analyze document using Python AI service.
   *
   * @param request - Document analysis request
   * @returns Analysis response with suggested case data
   * @throws Error if analysis fails or service unavailable
   */
  async analyzeDocument(
    request: DocumentAnalysisRequest
  ): Promise<DocumentAnalysisResponse> {
    return this.retry(async () => {
      try {
        logger.info('[PythonAIClient] Analyzing document', {
          filename: request.document.filename,
          wordCount: request.document.wordCount,
        });

        const response = await this.client.post<DocumentAnalysisResponse>(
          '/api/v1/analyze-document',
          request
        );

        logger.info('[PythonAIClient] Document analyzed successfully', {
          analysisLength: response.data.analysis.length,
          caseType: response.data.suggestedCaseData.caseType,
        });

        return response.data;
      } catch (error) {
        this.handleError(error, 'Document analysis failed');
        throw error;
      }
    });
  }

  /**
   * Analyze image using OCR and Python AI service.
   *
   * Supports: JPG, PNG, BMP, TIFF, PDF (scanned), HEIC (iPhone photos)
   *
   * @param imagePath - Absolute path to image file
   * @param userName - User's full name
   * @param sessionId - Session UUID
   * @param userEmail - User's email (optional)
   * @param userQuestion - Optional question about the document
   * @returns Analysis response with suggested case data
   * @throws Error if OCR fails, Tesseract not installed, or analysis fails
   */
  async analyzeImage(
    imagePath: string,
    userName: string,
    sessionId: string,
    userEmail?: string | null,
    userQuestion?: string
  ): Promise<DocumentAnalysisResponse> {
    return this.retry(async () => {
      try {
        // Check if file exists
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }

        logger.info('[PythonAIClient] Analyzing image with OCR', {
          imagePath,
          userName,
        });

        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream(imagePath));
        form.append('userName', userName);
        form.append('sessionId', sessionId);
        if (userEmail) {
          form.append('userEmail', userEmail);
        }
        if (userQuestion) {
          form.append('userQuestion', userQuestion);
        }

        // Send multipart/form-data request
        const response = await this.client.post<DocumentAnalysisResponse>(
          '/api/v1/analyze-image',
          form,
          {
            headers: {
              ...form.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        );

        logger.info('[PythonAIClient] Image analyzed successfully', {
          analysisLength: response.data.analysis.length,
          caseType: response.data.suggestedCaseData.caseType,
          ocrConfidence: (response.data.metadata as any)?.ocr?.ocr_confidence,
        });

        return response.data;
      } catch (error) {
        this.handleError(error, 'Image analysis failed');
        throw error;
      }
    });
  }

  /**
   * Retry logic with exponential backoff.
   *
   * @param fn - Async function to retry
   * @returns Result from function
   * @throws Error after max retries exceeded
   */
  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (400-499) except 429 (rate limit)
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = this.retryDelay * Math.pow(2, attempt);
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[PythonAIClient] Retry attempt ${attempt + 1}/${this.maxRetries} in ${delay}ms`, {
          error: errorMessage,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Handle and log errors from Python AI service.
   *
   * @param error - Error from axios
   * @param context - Error context message
   */
  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error status
        const status = axiosError.response.status;
        const data = axiosError.response.data as { error?: string; detail?: string } | undefined;

        logger.error(`[PythonAIClient] ${context}`, {
          status,
          error: data?.error || data?.detail || 'Unknown error',
          url: axiosError.config?.url,
        });

        if (status === 503) {
          throw new Error(
            'Python AI service unavailable. AI model may not be initialized or Tesseract OCR not installed.'
          );
        } else if (status === 400) {
          throw new Error(
            `Invalid request: ${data?.error || data?.detail || 'Bad request'}`
          );
        } else {
          throw new Error(
            `Python AI service error (${status}): ${data?.error || data?.detail || 'Unknown error'}`
          );
        }
      } else if (axiosError.request) {
        // No response from server
        logger.error(`[PythonAIClient] ${context} - No response from server`, {
          url: axiosError.config?.url,
        });
        throw new Error(
          'Python AI service unreachable. Is the service running on port 5051?'
        );
      } else {
        // Request setup error
        logger.error(`[PythonAIClient] ${context} - Request setup error`, {
          error: axiosError.message,
        });
        throw new Error(`Request error: ${axiosError.message}`);
      }
    } else {
      // Non-axios error
      logger.error(`[PythonAIClient] ${context} - Unexpected error`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Create default Python AI client instance.
 *
 * @param baseURL - Python service base URL (default: http://localhost:5051)
 * @returns Configured Python AI client
 */
export function createPythonAIClient(
  baseURL: string = 'http://localhost:5051'
): PythonAIClient {
  return new PythonAIClient({
    baseURL,
    timeout: 120000, // 120 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  });
}
