/**
 * Local Settings API
 *
 * Manages app settings stored in IndexedDB including AI provider configuration.
 */

import type { ApiResponse } from "../types";
import { getSettingsRepository } from "../../storage/repositories/SettingsRepository";
import { openDatabase } from "../../storage/db";
import { encrypt, decrypt, isEncryptionInitialized } from "../../storage/crypto";

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  provider: "openai" | "anthropic";
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
}

/**
 * Theme options
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Create local settings API
 */
export function createLocalSettingsApi() {
  const settingsRepo = getSettingsRepository();

  return {
    /**
     * Get theme preference
     */
    async getTheme(): Promise<ApiResponse<ThemeMode>> {
      try {
        const theme = await settingsRepo.getTheme();
        return {
          success: true,
          data: theme,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get theme",
          },
        };
      }
    },

    /**
     * Set theme preference
     */
    async setTheme(theme: ThemeMode): Promise<ApiResponse<void>> {
      try {
        await settingsRepo.setTheme(theme);
        return {
          success: true,
          data: undefined,
          message: "Theme updated",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to set theme",
          },
        };
      }
    },

    /**
     * Get AI configuration
     */
    async getAIConfig(): Promise<
      ApiResponse<{
        openai: AIProviderConfig;
        anthropic: AIProviderConfig;
        activeProvider: "openai" | "anthropic" | null;
      }>
    > {
      try {
        const db = await openDatabase();
        const openaiConfig = await db.get("aiConfig", "openai");
        const anthropicConfig = await db.get("aiConfig", "anthropic");

        return {
          success: true,
          data: {
            openai: {
              provider: "openai",
              model: openaiConfig?.model || "gpt-4o-mini",
              enabled: openaiConfig?.enabled || false,
              hasApiKey: !!openaiConfig?.encryptedApiKey,
            },
            anthropic: {
              provider: "anthropic",
              model: anthropicConfig?.model || "claude-sonnet-4-20250514",
              enabled: anthropicConfig?.enabled || false,
              hasApiKey: !!anthropicConfig?.encryptedApiKey,
            },
            activeProvider: openaiConfig?.enabled
              ? "openai"
              : anthropicConfig?.enabled
                ? "anthropic"
                : null,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get AI config",
          },
        };
      }
    },

    /**
     * Set AI configuration
     */
    async setAIConfig(config: {
      provider: string;
      apiKey?: string;
      model?: string;
      enabled?: boolean;
    }): Promise<ApiResponse<void>> {
      try {
        const db = await openDatabase();
        const provider = config.provider as "openai" | "anthropic";

        // Get existing config
        const existing = await db.get("aiConfig", provider);

        // Prepare new config
        const newConfig: {
          provider: string;
          encryptedApiKey?: string;
          model: string;
          enabled: boolean;
          updatedAt: string;
        } = {
          provider,
          model:
            config.model ||
            existing?.model ||
            (provider === "openai" ? "gpt-4o-mini" : "claude-sonnet-4-20250514"),
          enabled: config.enabled ?? existing?.enabled ?? false,
          updatedAt: new Date().toISOString(),
        };

        // Handle API key (encrypt if provided)
        if (config.apiKey) {
          if (isEncryptionInitialized()) {
            const encrypted = await encrypt(config.apiKey);
            newConfig.encryptedApiKey = JSON.stringify(encrypted);
          } else {
            // Store unencrypted if no PIN set (not recommended)
            newConfig.encryptedApiKey = config.apiKey;
          }
        } else if (existing?.encryptedApiKey) {
          // Keep existing key
          newConfig.encryptedApiKey = existing.encryptedApiKey;
        }

        // If enabling this provider, disable the other
        if (config.enabled) {
          const otherProvider = provider === "openai" ? "anthropic" : "openai";
          const otherConfig = await db.get("aiConfig", otherProvider);
          if (otherConfig) {
            await db.put("aiConfig", {
              ...otherConfig,
              enabled: false,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        await db.put("aiConfig", newConfig);

        return {
          success: true,
          data: undefined,
          message: "AI configuration updated",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to set AI config",
          },
        };
      }
    },

    /**
     * Get decrypted API key (for making API calls)
     */
    async getDecryptedApiKey(
      provider: "openai" | "anthropic"
    ): Promise<string | null> {
      try {
        const db = await openDatabase();
        const config = await db.get("aiConfig", provider);

        if (!config?.encryptedApiKey) {
          return null;
        }

        // Try to decrypt
        if (isEncryptionInitialized()) {
          try {
            const encrypted = JSON.parse(config.encryptedApiKey);
            if (encrypted.ciphertext) {
              return await decrypt(encrypted);
            }
          } catch {
            // If it's not valid encrypted JSON, it might be plain text
          }
        }

        // Return as-is if not encrypted
        return config.encryptedApiKey;
      } catch {
        return null;
      }
    },

    /**
     * Remove API key
     */
    async removeApiKey(
      provider: "openai" | "anthropic"
    ): Promise<ApiResponse<void>> {
      try {
        const db = await openDatabase();
        const existing = await db.get("aiConfig", provider);

        if (existing) {
          await db.put("aiConfig", {
            ...existing,
            encryptedApiKey: undefined,
            enabled: false,
            updatedAt: new Date().toISOString(),
          });
        }

        return {
          success: true,
          data: undefined,
          message: "API key removed",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to remove API key",
          },
        };
      }
    },

    /**
     * Test AI provider connection
     */
    async testConnection(
      provider: "openai" | "anthropic"
    ): Promise<ApiResponse<{ connected: boolean; error?: string }>> {
      try {
        const apiKey = await this.getDecryptedApiKey(provider);

        if (!apiKey) {
          return {
            success: true,
            data: {
              connected: false,
              error: "No API key configured",
            },
          };
        }

        if (provider === "openai") {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (response.ok) {
            return {
              success: true,
              data: { connected: true },
            };
          } else {
            const error = await response.json();
            return {
              success: true,
              data: {
                connected: false,
                error: error.error?.message || "Connection failed",
              },
            };
          }
        } else {
          // Anthropic doesn't have a simple test endpoint
          // We'll just verify the key format
          if (apiKey.startsWith("sk-ant-")) {
            return {
              success: true,
              data: { connected: true },
            };
          } else {
            return {
              success: true,
              data: {
                connected: false,
                error: "Invalid Anthropic API key format",
              },
            };
          }
        }
      } catch (error) {
        return {
          success: true,
          data: {
            connected: false,
            error: error instanceof Error ? error.message : "Connection test failed",
          },
        };
      }
    },

    /**
     * Get all settings
     */
    async getAll(): Promise<ApiResponse<Record<string, string>>> {
      try {
        const settings = await settingsRepo.getAll();
        return {
          success: true,
          data: settings,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message: error instanceof Error ? error.message : "Failed to get settings",
          },
        };
      }
    },
  };
}
