import type { Electron } from 'electron';
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { AIProviderConfigService } from '../../src/services/AIProviderConfigService.ts';
import type { AIProviderType } from '../../src/types/ai-providers.ts';
import { logger } from '../../src/utils/logger';

// AI configuration service singleton
let aiConfigService: AIProviderConfigService | null = null;

function getAIConfigService(): AIProviderConfigService {
  if (!aiConfigService) {
    aiConfigService = new AIProviderConfigService();
    logger.warn("[IPC] AIProviderConfigService initialized");
  }
  return aiConfigService;
}

/**
 * ===== AI CONFIGURATION HANDLERS =====
 * Channels: ai:configure, ai:get-config, ai:test-connection
 * Total: 3 channels
 */
export function setupAIConfigHandlers(): void {
  // Configure AI Provider
  ipcMain.handle(
    "ai:configure",
    async (
      _event: IpcMainInvokeEvent,
      request: {
        provider: AIProviderType;
        apiKey: string;
        model: string;
        endpoint?: string;
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        sessionId: string;
      }
    ): Promise<IPCResponse> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          logger.warn("[IPC] ai:configure called by user:", userId, {
            provider: request.provider,
            model: request.model,
          });

          // Validate request
          if (!request.provider) {
            return {
              success: false,
              error: "Provider is required",
            };
          }

          if (!request.apiKey || request.apiKey.trim().length === 0) {
            return {
              success: false,
              error: "API key is required",
            };
          }

          if (!request.model || request.model.trim().length === 0) {
            return {
              success: false,
              error: "Model is required",
            };
          }

          const configService = getAIConfigService();

          // Set provider configuration
          await configService.setProviderConfig(
            request.provider,
            request.apiKey,
            {
              model: request.model,
              endpoint: request.endpoint,
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              topP: request.topP,
            }
          );

          logger.warn(
            "[IPC] AI provider configured successfully:",
            request.provider
          );

          return {
            success: true,
            data: {
              provider: request.provider,
              message: "AI provider configured successfully",
            },
          };
        } catch (error) {
          logger.error("[IPC] Error configuring AI provider:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to configure AI provider",
          };
        }
      });
    }
  );

  // Get current AI configuration
  ipcMain.handle(
    "ai:get-config",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] ai:get-config called by user:", userId);
          const configService = getAIConfigService();
          const activeProvider = configService.getActiveProvider();

          if (!activeProvider) {
            return {
              success: true,
              data: null,
            };
          }

          const config = await configService.getActiveProviderConfig();

          if (!config) {
            return {
              success: true,
              data: null,
            };
          }

          // Don't send the API key back to the renderer
          return {
            success: true,
            data: {
              provider: config.provider,
              model: config.model,
              endpoint: config.endpoint,
              temperature: config.temperature,
              maxTokens: config.maxTokens,
              topP: config.topP,
            },
          };
        } catch (error) {
          logger.error("[IPC] Error getting AI config:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to get AI configuration",
          };
        }
      });
    }
  );

  // Test AI provider connection
  ipcMain.handle(
    "ai:test-connection",
    async (
      _event: IpcMainInvokeEvent,
      request: { provider: AIProviderType; sessionId: string }
    ): Promise<IPCResponse> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] ai:test-connection called by user:",
            userId,
            "for provider:",
            request.provider
          );

          const configService = getAIConfigService();
          const result = await configService.testProvider(request.provider);

          return {
            success: result.success,
            data: result.success
              ? { message: "Connection successful" }
              : undefined,
            error: result.error,
          };
        } catch (error) {
          logger.error("[IPC] Error testing AI connection:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to test connection",
          };
        }
      });
    }
  );

  logger.warn("[IPC] AI configuration handlers registered (3 channels)");
}
