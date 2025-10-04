import { errorLogger } from '../utils/error-logger';
import { AIService } from './AIService';
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
 * AIServiceFactory - Intelligent fallback between Integrated and External AI
 *
 * Priority:
 * 1. IntegratedAIService (Qwen 3 8B with AMD GPU) - Sovereign AI
 * 2. AIService (HTTP to LMStudio/Ollama) - Fallback if model not available
 *
 * This provides seamless transition as users download models.
 */
export class AIServiceFactory {
  private static instance: AIServiceFactory | null = null;
  private integratedService: IntegratedAIService;
  private externalService: AIService;
  private activeService: 'integrated' | 'external' = 'external';
  private modelPath: string;

  private constructor() {
    this.integratedService = new IntegratedAIService();
    this.externalService = new AIService();

    // Check model availability
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(
      userDataPath,
      'models',
      'Qwen3-8B-Q4_K_M.gguf'
    );

    errorLogger.logError('AIServiceFactory initialized', {
      type: 'info',
      modelPath: this.modelPath,
    });

    // Auto-detect which service to use
    this.detectActiveService();
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
   * Detect which AI service should be active
   */
  private detectActiveService(): void {
    // Check if Qwen 3 model exists
    if (fs.existsSync(this.modelPath)) {
      this.activeService = 'integrated';
      errorLogger.logError('Using Integrated AI (Qwen 3 8B found)', {
        type: 'info',
        modelPath: this.modelPath,
      });
    } else {
      this.activeService = 'external';
      errorLogger.logError(
        'Using External AI (Qwen 3 model not found, falling back to HTTP)',
        {
          type: 'info',
          modelPath: this.modelPath,
        }
      );
    }
  }

  /**
   * Force switch to integrated AI (after model download)
   */
  async switchToIntegrated(): Promise<boolean> {
    try {
      // Verify model exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error('Qwen 3 model file not found');
      }

      // Try to initialize
      await this.integratedService.initialize();

      this.activeService = 'integrated';

      errorLogger.logError('Switched to Integrated AI', { type: 'info' });

      return true;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.switchToIntegrated',
      });

      return false;
    }
  }

  /**
   * Force switch to external AI (HTTP)
   */
  switchToExternal(): void {
    this.activeService = 'external';
    errorLogger.logError('Switched to External AI (HTTP)', { type: 'info' });
  }

  /**
   * Get current active service type
   */
  getActiveServiceType(): 'integrated' | 'external' {
    return this.activeService;
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
   * Check AI connection (tries active service, falls back if needed)
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      if (this.activeService === 'integrated') {
        // Try integrated first
        const status = await this.integratedService.checkConnection();

        if (status.connected) {
          return status;
        }

        // Integrated failed, try external fallback
        errorLogger.logError('Integrated AI check failed, trying external', {
          type: 'info',
          error: status.error,
        });

        const externalStatus = await this.externalService.checkConnection();

        if (externalStatus.connected) {
          // Auto-switch to external
          this.activeService = 'external';
          return externalStatus;
        }

        // Both failed
        return {
          connected: false,
          endpoint: 'All AI services unavailable',
          error: `Integrated: ${status.error}, External: ${externalStatus.error}`,
        };
      } else {
        // Try external
        const status = await this.externalService.checkConnection();

        if (status.connected) {
          return status;
        }

        // External failed, try integrated fallback (if model exists)
        if (this.isModelAvailable()) {
          errorLogger.logError('External AI check failed, trying integrated', {
            type: 'info',
            error: status.error,
          });

          const integratedStatus =
            await this.integratedService.checkConnection();

          if (integratedStatus.connected) {
            // Auto-switch to integrated
            this.activeService = 'integrated';
            return integratedStatus;
          }
        }

        // External failed and no integrated fallback
        return status;
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'AIServiceFactory.checkConnection',
      });

      return {
        connected: false,
        endpoint: 'Error checking AI services',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Non-streaming chat (uses active service)
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    if (this.activeService === 'integrated') {
      return this.integratedService.chat(request);
    } else {
      return this.externalService.chat(request);
    }
  }

  /**
   * Streaming chat (uses active service)
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void
  ): Promise<void> {
    if (this.activeService === 'integrated') {
      return this.integratedService.streamChat(
        request,
        onToken,
        onComplete,
        onError,
        onThinkToken,
        onSources
      );
    } else {
      return this.externalService.streamChat(
        request,
        onToken,
        onComplete,
        onError,
        onThinkToken,
        onSources
      );
    }
  }

  /**
   * Update configuration (applies to both services)
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.integratedService.updateConfig(config);
    this.externalService.updateConfig(config);

    errorLogger.logError('AI configuration updated (both services)', {
      type: 'info',
      config,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    if (this.activeService === 'integrated') {
      return this.integratedService.getConfig();
    } else {
      return this.externalService.getConfig();
    }
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
