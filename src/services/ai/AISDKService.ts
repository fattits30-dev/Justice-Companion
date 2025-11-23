/**
 * AISDKService - AI SDK Service for Chat with Tool Calling
 *
 * Provides a simplified interface for AI chat with automatic tool calling support.
 * Wraps UnifiedAIService to provide SDK-like functionality for IPC handlers.
 */

import type {
  AIProviderConfig,
  AIProviderType,
} from "../../types/ai-providers.ts";
import { UnifiedAIService } from "../UnifiedAIService.ts";
import { logger } from "../../utils/logger.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  onFunctionCall?: (name: string, args: any, result: any) => void;
}

/**
 * AISDKService - Simplified AI Service Interface
 *
 * Provides chat functionality with tool calling support for IPC handlers.
 * Uses UnifiedAIService internally but exposes a simpler SDK-like interface.
 */
export class AISDKService {
  private unifiedService: UnifiedAIService;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.unifiedService = new UnifiedAIService(config);
  }

  /**
   * Get the current AI provider type
   */
  getProvider(): AIProviderType {
    return this.config.provider;
  }

  /**
   * Get the current model name
   */
  getModelName(): string {
    return this.config.model;
  }

  /**
   * Update service configuration
   */
  updateConfig(config: AIProviderConfig): void {
    this.config = config;
    this.unifiedService.updateConfig(config);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.unifiedService.isConfigured();
  }

  /**
   * Chat with tool calling support (non-streaming)
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      // Convert messages to the format expected by UnifiedAIService
      const aiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // For now, use non-streaming chat
      // TODO: Implement tool calling in non-streaming mode
      const response = await this.unifiedService.chat(aiMessages);

      return response;
    } catch (error) {
      logger.error("[AISDKService] Chat error", { error: error as Error });
      throw error;
    }
  }

  /**
   * Stream chat with tool calling support
   */
  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      // Convert messages to the format expected by UnifiedAIService
      const aiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Stream with UnifiedAIService
      await this.unifiedService.streamChat(aiMessages, {
        onToken: callbacks.onToken || (() => {}),
        onComplete: callbacks.onComplete || (() => {}),
        onError: callbacks.onError || (() => {}),
        // TODO: Implement function call handling
        onFunctionCall: callbacks.onFunctionCall,
      });
    } catch (error) {
      logger.error("[AISDKService] Stream chat error", {
        error: error as Error,
      });
      if (callbacks.onError) {
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities() {
    return this.unifiedService.getProviderCapabilities();
  }
}
