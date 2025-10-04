import { errorLogger } from '../utils/error-logger';
import { IntegratedAIService } from './IntegratedAIService';
import type {
  AIConfig,
  AIStatus,
  AIChatRequest,
  AIResponse,
} from '../types/ai';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

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
    this.integratedService = new IntegratedAIService();

    // Check model availability
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(
      userDataPath,
      'models',
      'Qwen_Qwen3-8B-Q4_K_M.gguf'
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
    onSources?: (sources: string[]) => void
  ): Promise<void> {
    console.log('[AIServiceFactory] streamChat() called');
    console.log('[AIServiceFactory] Model available:', this.isModelAvailable());

    await this.integratedService.streamChat(
      request,
      onToken,
      onComplete,
      onError,
      onThinkToken,
      onSources
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
