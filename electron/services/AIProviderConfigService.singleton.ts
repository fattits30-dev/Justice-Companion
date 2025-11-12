/**
 * Shared AIProviderConfigService singleton
 *
 * This ensures all IPC handlers use the SAME instance of AIProviderConfigService,
 * preventing configuration sync issues between ai-config.ts and chat.ts
 */

import { AIProviderConfigService } from '../../src/services/AIProviderConfigService';
import { logger } from '../../src/utils/logger';

let aiConfigService: AIProviderConfigService | null = null;

export function getAIConfigService(): AIProviderConfigService {
  if (!aiConfigService) {
    aiConfigService = new AIProviderConfigService();
    logger.warn('[Singleton] AIProviderConfigService initialized');
  }
  return aiConfigService;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAIConfigService(): void {
  aiConfigService = null;
}
