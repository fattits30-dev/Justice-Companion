// @ts-expect-error - Legacy code replaced by UnifiedAIService, needs cleanup
import { errorLogger } from '../utils/error-logger.ts';
// TODO: These services have been replaced by UnifiedAIService - clean up this legacy code
// import { IntegratedAIService } from '../features/chat/services/IntegratedAIService.ts';
// import { OpenAIService } from '../features/chat/services/OpenAIService.ts';
// import type { OpenAIConfig } from '../features/chat/services/OpenAIService.ts';
import type { AIChatRequest, AIResponse } from '../types/ai.ts';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { CaseFactsRepository } from '../repositories/CaseFactsRepository.ts';

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
   * Set the case facts repository for the integrated service
   */
  setCaseFactsRepository(repository: CaseFactsRepository): void {
    this.caseFactsRepository = repository;
    // Pass repository to integrated service
    this.integratedService.setCaseFactsRepository(repository);
  }

  /**
   * Configure OpenAI service with API key and model
   */
  configureOpenAI(apiKey: string, model: string): void {
    if (!this.openAIService) {
      this.openAIService = new OpenAIService(apiKey, model);
    } else {
      // Update existing service if needed
      this.openAIService.updateConfig(apiKey, model);
    }
  }

  /**
   * Get current provider status
   */
  getCurrentProvider(): 'openai' | 'integrated' {
    return this.currentProvider;
  }

  /**
   * Get AI service based on current configuration
   */
  getAIService(): IntegratedAIService | OpenAIService {
    if (this.openAIService) {
      return this.openAIService;
    }
    return this.integratedService;
  }

  /**
   * Switch provider to OpenAI if configured
   */
  switchToOpenAI(): boolean {
    if (this.openAIService) {
      this.currentProvider = 'openai';
      return true;
    }
    return false;
  }

  /**
   * Switch provider to integrated service
   */
  switchToIntegrated(): void {
    this.currentProvider = 'integrated';
  }

  /**
   * Check if model exists locally
   */
  isModelAvailable(): boolean {
    try {
      return fs.existsSync(this.modelPath);
    } catch (error) {
      errorLogger.logError('Failed to check model existence', { error });
      return false;
    }
  }

  /**
   * Get model size in bytes
   */
  getModelSize(): number {
    try {
      const stats = fs.statSync(this.modelPath);
      return stats.size;
    } catch (error) {
      errorLogger.logError('Failed to get model size', { error });
      return 0;
    }
  }

  /**
   * Handle chat request using appropriate AI service
   */
  async handleChatRequest(request: AIChatRequest): Promise<AIResponse> {
    try {
      const service = this.getAIService();
      const response = await service.handleChatRequest(request);
      
      // Log successful request
      errorLogger.logError('AI request completed successfully', {
        type: 'info',
        provider: this.currentProvider,
        model: this.currentProvider === 'openai' ? 
          (this.openAIService?.getModel() || 'unknown') : 
          'local-qwen'
      });
      
      return response;
    } catch (error) {
      errorLogger.logError('AI request failed', { 
        error,
        provider: this.currentProvider,
        type: 'error'
      });
      
      throw error;
    }
  }
}