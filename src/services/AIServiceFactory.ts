import { errorLogger } from '../utils/error-logger';
import { IntegratedAIService } from '../features/chat/services/IntegratedAIService';
import type {
  AIConfig,
  AIStatus,
  AIChatRequest,
  AIResponse,
} from '../types/ai';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { CaseFactsRepository } from '../repositories/CaseFactsRepository.js';

/**
 * AIServiceFactory - Integrated AI Service Manager
 *
 * Uses IntegratedAIService (Qwen 3 8B with node-llama-cpp) as the sole AI provider.
 * No external dependencies or fallbacks.
 */
export class AIServiceFactory {
  private static instance: AIServiceFactory | null = null;
  private integratedService: IntegratedAIService;
  private modelPath: string;

  private constructor() {
    // IntegratedService created without repository initially
    // Will be set via setCaseFactsRepository() after main.ts initializes
    this.integratedService = new IntegratedAIService();

    // Check model availability
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(
      userDataPath,
      'models',
      'Qwen_Qwen3-8B-Q4_K_M.gguf',
    );

    errorLogger.logError('AIServiceFactory initialized', {
      type: 'info',
      modelPath: this.modelPath,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory();
    }
    return AIServiceFactory.instance;
  }

  /**
   * Set CaseFactsRepository dependency (called from main.ts after repository initialization)
   */
  setCaseFactsRepository(repository: CaseFactsRepository): void {
    // Recreate IntegratedAIService with repository
    this.integratedService = new IntegratedAIService(undefined, repository);
    errorLogger.logError('CaseFactRepository injected into AIServiceFactory', { type: 'info' });
  }

  /**
   * Initialize integrated AI service (after model download)
   */
  async initialize(): Promise<boolean> {
    try {
      // Verify model exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error('Qwen 3 model file not found');
      }

      // Try to initialize
      await this.integratedService.initialize();

      errorLogger.logError('Integrated AI initialized successfully', { type: 'info' });

      return true;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.initialize',
      });

      return false;
    }
  }

  /**
   * Check if Qwen 3 model is available
   */
  isModelAvailable(): boolean {
    return fs.existsSync(this.modelPath);
  }

  /**
   * Get model file path
   */
  getModelPath(): string {
    return this.modelPath;
  }

  /**
   * Check AI connection status
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      const status = await this.integratedService.checkConnection();

      if (!status.connected) {
        errorLogger.logError('Integrated AI connection check failed', {
          type: 'info',
          error: status.error,
        });
      }

      return status;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.checkConnection',
      });

      return {
        connected: false,
        endpoint: 'Error checking AI service',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Non-streaming chat
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    return this.integratedService.chat(request);
  }

  /**
   * Streaming chat
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void,
  ): Promise<void> {
    await this.integratedService.streamChat(
      request,
      onToken,
      onComplete,
      onError,
      onThinkToken,
      onSources,
    );
  }

  /**
   * Streaming chat with function calling (for fact-gathering)
   *
   * Enables AI to call store_case_fact and get_case_facts functions.
   * Functions are automatically executed when AI uses [[call: function()]] syntax.
   * Used when working on specific cases that require persistent memory.
   *
   * @param request - Chat request with messages and context
   * @param caseId - Case ID for fact loading/storing
   * @param onToken - Callback for each token generated
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   */
  async streamChatWithFunctions(
    request: AIChatRequest,
    caseId: number | undefined,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
  ): Promise<void> {
    await this.integratedService.streamChatWithFunctions(
      request,
      caseId,
      onToken,
      onComplete,
      onError,
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.integratedService.updateConfig(config);

    errorLogger.logError('AI configuration updated', {
      type: 'info',
      config,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return this.integratedService.getConfig();
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    try {
      await this.integratedService.dispose();
      errorLogger.logError('AIServiceFactory disposed', { type: 'info' });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.dispose',
      });
    }
  }
}

// Singleton instance for app-wide use
export const aiServiceFactory = AIServiceFactory.getInstance();
