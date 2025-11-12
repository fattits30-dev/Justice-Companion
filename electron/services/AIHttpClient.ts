/**
 * AIHttpClient
 *
 * HTTP client for communicating with the Python AI service.
 * Provides retry logic, error handling, and type-safe API calls.
 *
 * @module AIHttpClient
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { PythonProcessManager } from './PythonProcessManager';
import { logger } from '../../src/utils/logger';

export interface AIRequestOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface DocumentAnalysisRequest {
  document: {
    text: string;
    fileName?: string;
    fileType?: string;
  };
  userProfile: {
    name: string;
    email?: string;
  };
  sessionId: string;
  userQuestion?: string;
}

export interface DocumentAnalysisResponse {
  analysis: string;
  suggestedCaseData?: {
    title: string;
    caseType: string;
    description: string;
    opposingParty?: string;
  };
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  metadata?: {
    tokensUsed: number;
    latencyMs: number;
    promptVersion: string;
  };
}

export interface CaseSuggestionRequest {
  caseContext: {
    title: string;
    description: string;
    facts: string[];
  };
  sessionId: string;
}

export interface CaseSuggestionResponse {
  suggestions: Array<{
    category: string;
    suggestion: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
  metadata?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: number;
  caseContext?: {
    id: number;
    title: string;
    description: string;
  };
  sessionId: string;
  userProfile?: {
    name: string;
    email?: string;
  };
}

export interface ChatResponse {
  message: string;
  conversationId: number;
  thinking?: string;
  citations?: Array<{
    source: string;
    title: string;
    url: string;
  }>;
  metadata?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

export class AIHttpClient {
  private axiosInstance: AxiosInstance;
  private pythonManager: PythonProcessManager;
  private readonly defaultTimeout: number = 30000; // 30 seconds
  private readonly defaultMaxRetries: number = 3;
  private readonly defaultRetryDelay: number = 1000; // 1 second

  constructor(pythonManager: PythonProcessManager) {
    this.pythonManager = pythonManager;

    this.axiosInstance = axios.create({
      baseURL: `${pythonManager.baseURL}/api/v1`,
      timeout: this.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.info(`[AI Client] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('[AI Client] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info(`[AI Client] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('[AI Client] Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a request with automatic retry logic
   */
  private async requestWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    const retryDelay = options.retryDelay ?? this.defaultRetryDelay;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Check if it's an Axios error
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;

          // Connection refused - Python service is down
          if (axiosError.code === 'ECONNREFUSED') {
            logger.error('[AI Client] Python service unavailable, attempting restart...');
            try {
              await this.pythonManager.restart();
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue; // Retry after restart
            } catch (restartError) {
              logger.error('[AI Client] Failed to restart Python service:', restartError);
              throw new Error('AI service is unavailable and could not be restarted');
            }
          }

          // Rate limiting (429) - exponential backoff
          if (axiosError.response?.status === 429) {
            const waitTime = retryDelay * Math.pow(2, attempt - 1);
            logger.warn(`[AI Client] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          // Timeout - retry with same delay
          if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
            logger.warn(`[AI Client] Request timeout, retry ${attempt}/${maxRetries}...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }

          // Server error (5xx) - retry
          if (axiosError.response?.status && axiosError.response.status >= 500) {
            logger.warn(`[AI Client] Server error ${axiosError.response.status}, retry ${attempt}/${maxRetries}...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }

          // Client error (4xx) - don't retry
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            const errorData = axiosError.response.data as unknown;
            throw new Error(
              `AI service returned error: ${errorData?.error || axiosError.response.statusText}`
            );
          }
        }

        // Unknown error - retry
        if (attempt < maxRetries) {
          logger.warn(`[AI Client] Unknown error, retry ${attempt}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
      }
    }

    // All retries failed
    throw new Error(
      `AI service request failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Analyze a document
   */
  async analyzeDocument(
    request: DocumentAnalysisRequest,
    options?: AIRequestOptions
  ): Promise<DocumentAnalysisResponse> {
    return this.requestWithRetry<DocumentAnalysisResponse>(
      () => this.axiosInstance.post('/analyze-document', request, {
        timeout: options?.timeout ?? this.defaultTimeout,
      }),
      options
    );
  }

  /**
   * Get case suggestions
   */
  async suggestCase(
    request: CaseSuggestionRequest,
    options?: AIRequestOptions
  ): Promise<CaseSuggestionResponse> {
    return this.requestWithRetry<CaseSuggestionResponse>(
      () => this.axiosInstance.post('/suggest-case', request, {
        timeout: options?.timeout ?? this.defaultTimeout,
      }),
      options
    );
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(
    request: ChatRequest,
    options?: AIRequestOptions
  ): Promise<ChatResponse> {
    return this.requestWithRetry<ChatResponse>(
      () => this.axiosInstance.post('/chat', request, {
        timeout: options?.timeout ?? 60000, // Longer timeout for chat
      }),
      options
    );
  }

  /**
   * Stream chat messages (Server-Sent Events)
   * Returns an async generator that yields tokens as they arrive
   */
  async *streamChat(
    request: ChatRequest,
    options?: AIRequestOptions
  ): AsyncGenerator<{ token?: string; thinking?: string; done: boolean }, void, undefined> {
    try {
      const response = await this.axiosInstance.post('/chat/stream', request, {
        timeout: options?.timeout ?? 120000, // 2 minutes for streaming
        responseType: 'stream',
      });

      // Parse Server-Sent Events
      let buffer = '';
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield { token: parsed.token, thinking: parsed.thinking, done: false };
            } catch (error) {
              logger.error('[AI Client] Failed to parse SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('[AI Client] Stream error:', error);
      throw error;
    }
  }

  /**
   * Check if the AI service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.pythonManager.baseURL}/health`, {
        timeout: 3000,
      });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}
