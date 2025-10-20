import { errorLogger } from '../utils/error-logger.ts';
import { IntegratedAIService } from '../features/chat/services/IntegratedAIService.ts';
import { OpenAIService } from '../features/chat/services/OpenAIService.ts';
import type { OpenAIConfig } from '../features/chat/services/OpenAIService.ts';
import type { AIConfig, AIStatus, AIChatRequest, AIResponse } from '../types/ai.ts';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { CaseFactsRepository } from '../repositories/CaseFactsRepository.js';

/**
 * AIServiceFactory - Multi-Provider AI Service Manager
 *
 * Supports two AI providers:
 * - OpenAI (cloud-based GPT-4o/GPT-3.5-turbo) - User provides API key
 * - IntegratedAIService (local Qwen 3 8B with node-llama-cpp) - Fallback
 *
 * Provider Selection Logic:
 * - If OpenAI is configured (API key set) → Use OpenAI
 * - If OpenAI not configured or fails → Use IntegratedAIService (local)
 *
 * This provides flexibility: users can choose cloud (better quality, pay-per-use)
 * or local (privacy, no internet required, no costs).
 */
export class AIServiceFactory {
  private static instance: AIServiceFactory | null = null;
  private integratedService: IntegratedAIService;
  private openAIService: OpenAIService | null = null;
  private modelPath: string;
  private currentProvider: 'openai' | 'integrated' = 'integrated';
  private caseFactsRepository: CaseFactsRepository | null = null;

  private constructor() {
    // IntegratedService created without repository initially
    // Will be set via setCaseFactsRepository() after main.ts initializes
    this.integratedService = new IntegratedAIService();

    // OpenAI service will be created when user configures it
    this.openAIService = null;

    // Check model availability
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(userDataPath, 'models', 'Qwen_Qwen3-8B-Q4_K_M.gguf');

    errorLogger.logError('AIServiceFactory initialized with multi-provider support', {
      type: 'info',
      modelPath: this.modelPath,
      defaultProvider: 'integrated',
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
    // Store repository reference for future service creation
    this.caseFactsRepository = repository;

    // Recreate IntegratedAIService with repository
    this.integratedService = new IntegratedAIService(undefined, repository);

    // Recreate OpenAI service with repository (preserving config if it exists)
    if (this.openAIService) {
      const existingConfig = this.openAIService.getOpenAIConfig();
      this.openAIService = new OpenAIService(undefined, repository);

      // Restore OpenAI configuration if it existed
      if (existingConfig) {
        this.openAIService.configure(existingConfig);
      }
    }

    errorLogger.logError('CaseFactRepository injected into AIServiceFactory', { type: 'info' });
  }

  /**
   * Configure OpenAI provider with API credentials
   * Called from Settings UI when user provides API key
   *
   * @param config - OpenAI configuration with API key and model selection
   */
  async configureOpenAI(config: OpenAIConfig): Promise<void> {
    try {
      // Create new OpenAI service if it doesn't exist (inject repository if available)
      if (!this.openAIService) {
        this.openAIService = new OpenAIService(undefined, this.caseFactsRepository || undefined);
      }

      // Configure with API key
      this.openAIService.configure(config);

      // Switch to OpenAI as current provider
      this.currentProvider = 'openai';

      errorLogger.logError('OpenAI provider configured and activated', {
        type: 'info',
        model: config.model,
        provider: 'openai',
      });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.configureOpenAI',
      });
      throw error;
    }
  }

  /**
   * Test OpenAI connection without changing current provider
   * Used by Settings UI to validate API key before saving
   *
   * @param config - OpenAI configuration to test
   * @returns Connection status
   */
  async testOpenAIConnection(config: OpenAIConfig): Promise<AIStatus> {
    try {
      // Create temporary service for testing
      const testService = new OpenAIService();
      testService.configure(config);
      const status = await testService.checkConnection();

      errorLogger.logError('OpenAI connection test completed', {
        type: 'info',
        connected: status.connected,
        model: config.model,
      });

      return status;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.testOpenAIConnection',
      });

      return {
        connected: false,
        endpoint: 'OpenAI API',
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get currently active AI service based on configuration
   * Priority: OpenAI (if configured) → IntegratedAI (fallback)
   *
   * @returns Active AI service (OpenAI or Integrated)
   */
  private getActiveService(): OpenAIService | IntegratedAIService {
    // If OpenAI is configured, use it
    if (this.currentProvider === 'openai' && this.openAIService) {
      return this.openAIService;
    }

    // Fallback to integrated service
    return this.integratedService;
  }

  /**
   * Get current provider name
   */
  getCurrentProvider(): 'openai' | 'integrated' {
    return this.currentProvider;
  }

  /**
   * Switch to Integrated AI provider (disable OpenAI)
   * Used when user wants to use local model instead
   */
  switchToIntegratedAI(): void {
    this.currentProvider = 'integrated';
    errorLogger.logError('Switched to Integrated AI provider', {
      type: 'info',
      provider: 'integrated',
    });
  }

  /**
   * Check if OpenAI is configured
   */
  isOpenAIConfigured(): boolean {
    return this.openAIService !== null && this.currentProvider === 'openai';
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
   * Check AI connection status for active provider
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      const service = this.getActiveService();
      const status = await service.checkConnection();

      if (!status.connected) {
        errorLogger.logError('AI connection check failed', {
          type: 'info',
          provider: this.currentProvider,
          error: status.error,
        });
      }

      return status;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.checkConnection',
        provider: this.currentProvider,
      });

      return {
        connected: false,
        endpoint: `Error checking ${this.currentProvider} service`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Non-streaming chat (delegates to active provider)
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    const service = this.getActiveService();
    return service.chat(request);
  }

  /**
   * Streaming chat (delegates to active provider)
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void,
  ): Promise<void> {
    const service = this.getActiveService();
    await service.streamChat(request, onToken, onComplete, onError, onThinkToken, onSources);
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
    const service = this.getActiveService();
    await service.streamChatWithFunctions(request, caseId, onToken, onComplete, onError);
  }

  /**
   * Update configuration (applies to active provider)
   */
  updateConfig(config: Partial<AIConfig>): void {
    const service = this.getActiveService();
    service.updateConfig(config);

    errorLogger.logError('AI configuration updated', {
      type: 'info',
      provider: this.currentProvider,
      config,
    });
  }

  /**
   * Get current configuration (from active provider)
   */
  getConfig(): AIConfig {
    const service = this.getActiveService();
    return service.getConfig();
  }

  /**
   * Cleanup resources (disposes both services)
   */
  async dispose(): Promise<void> {
    try {
      await this.integratedService.dispose();

      if (this.openAIService) {
        this.openAIService.dispose();
      }

      errorLogger.logError('AIServiceFactory disposed (all providers)', { type: 'info' });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.dispose',
      });
    }
  }
}

// Singleton instance for app-wide use
export const aiServiceFactory = AIServiceFactory.getInstance();
