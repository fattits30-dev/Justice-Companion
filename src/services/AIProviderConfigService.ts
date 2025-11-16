/**
 * AIProviderConfigService - Manages AI Provider Configurations
 *
 * Features:
 * - Secure storage of API keys using KeyManager
 * - Provider configuration persistence
 * - Active provider selection
 * - Configuration validation
 */

import type {
  AIProviderConfig,
  AIProviderType,
} from "../types/ai-providers.ts";
import { AI_PROVIDER_METADATA } from "../types/ai-providers.ts";
import { KeyManager } from "./KeyManager.ts";
import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

export interface StoredProviderConfig {
  provider: AIProviderType;
  model: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export class AIProviderConfigService {
  private keyManager: KeyManager;
  private configPath: string;
  private configs: Map<AIProviderType, StoredProviderConfig> = new Map();
  private activeProvider: AIProviderType | null = null;

  constructor() {
    this.keyManager = new KeyManager(safeStorage, app.getPath("userData"));
    this.configPath = path.join(app.getPath("userData"), "ai-providers.json");
    this.loadConfigurations();
  }

  /**
   * Load stored configurations from disk
   */
  private loadConfigurations(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        const stored = JSON.parse(data);

        if (stored.activeProvider) {
          this.activeProvider = stored.activeProvider;
        }

        if (stored.configs && Array.isArray(stored.configs)) {
          for (const config of stored.configs) {
            this.configs.set(config.provider, config);
          }
        }
      }
    } catch (error) {
      logger.error(
        "[AIProviderConfigService] Failed to load configurations:",
        error,
      );
    }
  }

  /**
   * Save configurations to disk
   */
  private saveConfigurations(): void {
    try {
      const data = {
        activeProvider: this.activeProvider,
        configs: Array.from(this.configs.values()),
      };

      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      logger.error(
        "[AIProviderConfigService] Failed to save configurations:",
        error,
      );
      throw error;
    }
  }

  /**
   * Set configuration for a provider
   */
  async setProviderConfig(
    provider: AIProviderType,
    apiKey: string,
    config: Omit<StoredProviderConfig, "provider">,
  ): Promise<void> {
    // Store API key securely
    await this.keyManager.storeKey(`ai-provider-${provider}`, apiKey);

    // Store configuration (without API key)
    this.configs.set(provider, {
      provider,
      ...config,
    });

    // If this is the first provider, make it active
    if (!this.activeProvider) {
      this.activeProvider = provider;
    }

    this.saveConfigurations();
  }

  /**
   * Get configuration for a provider (including API key)
   */
  async getProviderConfig(
    provider: AIProviderType,
  ): Promise<AIProviderConfig | null> {
    const config = this.configs.get(provider);
    if (!config) {
      return null;
    }

    try {
      const apiKey = await this.keyManager.retrieveKey(
        `ai-provider-${provider}`,
      );
      if (!apiKey) {
        return null;
      }

      return {
        ...config,
        apiKey,
      };
    } catch (error) {
      logger.error(
        `[AIProviderConfigService] Failed to get API key for ${provider}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get active provider configuration
   */
  async getActiveProviderConfig(): Promise<AIProviderConfig | null> {
    if (!this.activeProvider) {
      return null;
    }

    return this.getProviderConfig(this.activeProvider);
  }

  /**
   * Set active provider
   */
  setActiveProvider(provider: AIProviderType): void {
    if (!this.configs.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    this.activeProvider = provider;
    this.saveConfigurations();
  }

  /**
   * Get active provider type
   */
  getActiveProvider(): AIProviderType | null {
    return this.activeProvider;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: AIProviderType): boolean {
    return this.configs.has(provider);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): AIProviderType[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Remove provider configuration
   */
  async removeProviderConfig(provider: AIProviderType): Promise<void> {
    // Remove API key from secure storage
    await this.keyManager.deleteKey(`ai-provider-${provider}`);

    // Remove configuration
    this.configs.delete(provider);

    // If this was the active provider, clear it
    if (this.activeProvider === provider) {
      this.activeProvider = null;

      // Try to set another provider as active
      const remaining = this.getConfiguredProviders();
      if (remaining.length > 0) {
        this.activeProvider = remaining[0];
      }
    }

    this.saveConfigurations();
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(provider: AIProviderType) {
    return AI_PROVIDER_METADATA[provider];
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: AIProviderConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      errors.push("API key is required");
    }

    if (!config.model || config.model.trim().length === 0) {
      errors.push("Model is required");
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push("Temperature must be between 0 and 2");
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 100000) {
        errors.push("Max tokens must be between 1 and 100,000");
      }
    }

    if (config.topP !== undefined) {
      if (config.topP < 0 || config.topP > 1) {
        errors.push("Top P must be between 0 and 1");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test provider connection
   */
  async testProvider(
    provider: AIProviderType,
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getProviderConfig(provider);
    if (!config) {
      return { success: false, error: "Provider not configured" };
    }

    try {
      const { UnifiedAIService } = await import("./UnifiedAIService.ts");
      const service = new UnifiedAIService(config);

      // Test with a simple message
      const response = await service.chat([
        {
          role: "user",
          content: 'Hello! Please respond with "OK" if you can hear me.',
        },
      ]);

      return { success: response.length > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
