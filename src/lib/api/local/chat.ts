/**
 * Local Chat API - Direct AI Provider Integration
 *
 * Provides chat functionality by calling AI providers (OpenAI/Anthropic) directly.
 * Stores conversations and messages locally in IndexedDB.
 */

import type { ApiResponse } from "../types";
import {
  getConversationsRepository,
  getMessagesRepository,
  type LocalConversation,
  type LocalMessage,
} from "../../storage/repositories/ConversationsRepository";
import { openDatabase } from "../../storage/db";

/**
 * AI Provider configuration stored in IndexedDB
 */
interface AIConfig {
  provider: "openai" | "anthropic";
  encryptedApiKey?: string;
  model: string;
  enabled: boolean;
  updatedAt: string;
}

/**
 * Get AI configuration from IndexedDB
 */
async function _getAIConfig(): Promise<AIConfig | null> {
  const db = await openDatabase();
  const openaiConfig = await db.get("aiConfig", "openai");
  const anthropicConfig = await db.get("aiConfig", "anthropic");

  // Return the enabled one, preferring OpenAI
  if (openaiConfig?.enabled) {
    return openaiConfig as AIConfig;
  }
  if (anthropicConfig?.enabled) {
    return anthropicConfig as AIConfig;
  }

  return null;
}

/**
 * Call OpenAI API directly
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onToken(content);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Call Anthropic API directly
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  // Convert messages format for Anthropic
  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const systemMessage = messages.find((m) => m.role === "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        systemMessage?.content ||
        "You are a helpful legal assistant for UK civil law matters.",
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Anthropic API error");
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta") {
            const text = parsed.delta?.text;
            if (text) {
              fullResponse += text;
              onToken(text);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Create local chat API
 */
export function createLocalChatApi() {
  const conversationsRepo = getConversationsRepository();
  const messagesRepo = getMessagesRepository();

  return {
    /**
     * Stream chat response using direct AI provider calls
     */
    async stream(
      message: string,
      callbacks: {
        onToken: (token: string) => void;
        onThinking?: (thinking: string) => void;
        onComplete: (conversationId: number) => void;
        onError: (error: string) => void;
        onSources?: (sources: unknown[]) => void;
      },
      options: {
        conversationId?: number | null;
        caseId?: number | null;
        useRAG?: boolean;
      } = {},
    ): Promise<void> {
      const { conversationId, caseId } = options;

      try {
        // Get AI configuration
        const db = await openDatabase();
        const openaiConfig = await db.get("aiConfig", "openai");
        const anthropicConfig = await db.get("aiConfig", "anthropic");

        let config: AIConfig | undefined;
        let apiKey: string | undefined;

        // Check for enabled provider with API key
        if (openaiConfig?.enabled && openaiConfig.encryptedApiKey) {
          config = openaiConfig as AIConfig;
          // In local mode, the API key is stored encrypted
          // For now, we'll store it unencrypted in the config
          // TODO: Decrypt API key from storage
          apiKey = openaiConfig.encryptedApiKey;
        } else if (
          anthropicConfig?.enabled &&
          anthropicConfig.encryptedApiKey
        ) {
          config = anthropicConfig as AIConfig;
          apiKey = anthropicConfig.encryptedApiKey;
        }

        if (!config || !apiKey) {
          callbacks.onError(
            "No AI provider configured. Please set up your API key in Settings.",
          );
          return;
        }

        // Get or create conversation
        let currentConversationId = conversationId;

        if (!currentConversationId) {
          // Create new conversation
          const conversation = await conversationsRepo.create({
            caseId: caseId ?? null,
            title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
          });
          currentConversationId = conversation.id;
        }

        // Save user message
        await messagesRepo.create({
          conversationId: currentConversationId,
          role: "user",
          content: message,
        });

        // Get conversation history for context
        const history = await messagesRepo.getRecentContext(
          currentConversationId,
          10,
        );

        // Build messages array for AI
        const aiMessages: Array<{ role: string; content: string }> = [
          {
            role: "system",
            content: `You are Justice Companion, a helpful legal assistant specializing in UK civil law.
You help users understand their legal rights and options in matters including:
- Employment disputes (unfair dismissal, discrimination, wrongful termination)
- Housing issues (eviction, repairs, deposits)
- Consumer rights (refunds, faulty goods, services)
- Family matters (divorce, custody, child support)
- Debt issues (debt collection, bankruptcy, IVAs)

Always:
- Be clear about what is legal information vs legal advice
- Recommend seeking professional legal advice for complex matters
- Cite relevant UK legislation when applicable
- Be empathetic and supportive`,
          },
        ];

        // Add conversation history
        for (const msg of history) {
          if (msg.role === "user" || msg.role === "assistant") {
            aiMessages.push({
              role: msg.role,
              content: msg.content,
            });
          }
        }

        // Call the appropriate AI provider
        let fullResponse: string;

        if (config.provider === "openai") {
          fullResponse = await callOpenAI(
            apiKey,
            config.model,
            aiMessages,
            callbacks.onToken,
          );
        } else {
          fullResponse = await callAnthropic(
            apiKey,
            config.model,
            aiMessages,
            callbacks.onToken,
          );
        }

        // Save assistant response
        await messagesRepo.create({
          conversationId: currentConversationId,
          role: "assistant",
          content: fullResponse,
        });

        callbacks.onComplete(currentConversationId);
      } catch (error) {
        callbacks.onError(
          error instanceof Error ? error.message : "Chat failed",
        );
      }
    },

    /**
     * Get recent conversations
     */
    async getConversations(
      caseId?: number | null,
      limit: number = 10,
    ): Promise<ApiResponse<LocalConversation[]>> {
      try {
        let conversations: LocalConversation[];

        if (caseId !== null && caseId !== undefined) {
          conversations = await conversationsRepo.findByCaseId(caseId);
        } else {
          conversations = await conversationsRepo.findRecent(limit);
        }

        return {
          success: true,
          data: conversations.slice(0, limit),
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get conversations",
          },
        };
      }
    },

    /**
     * Get a specific conversation with messages
     */
    async getConversation(conversationId: number): Promise<
      ApiResponse<{
        conversation: LocalConversation;
        messages: LocalMessage[];
      }>
    > {
      try {
        const conversation = await conversationsRepo.findById(conversationId);

        if (!conversation) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Conversation ${conversationId} not found`,
            },
          };
        }

        const messages =
          await messagesRepo.findByConversationId(conversationId);

        return {
          success: true,
          data: {
            conversation,
            messages,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get conversation",
          },
        };
      }
    },

    /**
     * Delete a conversation
     */
    async deleteConversation(
      conversationId: number,
    ): Promise<ApiResponse<void>> {
      try {
        const deleted =
          await conversationsRepo.deleteWithMessages(conversationId);

        if (!deleted) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Conversation ${conversationId} not found`,
            },
          };
        }

        return {
          success: true,
          data: undefined,
          message: "Conversation deleted",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete conversation",
          },
        };
      }
    },

    /**
     * Upload a document for analysis (stores locally)
     */
    async uploadDocument(
      file: File,
      _userQuestion?: string,
    ): Promise<ApiResponse<{ filePath: string }>> {
      try {
        // In local mode, we read the file content directly
        // For now, we'll just return a reference
        // TODO: Store file in IndexedDB for later analysis
        return {
          success: true,
          data: {
            filePath: `local://${file.name}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "LOCAL_ERROR",
            message:
              error instanceof Error ? error.message : "Failed to upload file",
          },
        };
      }
    },

    /**
     * Analyze a document
     */
    async analyzeDocument(
      _filePath: string,
      _userQuestion?: string,
    ): Promise<ApiResponse<{ analysis: string }>> {
      // TODO: Implement document analysis using AI provider
      return {
        success: false,
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Document analysis not yet implemented in local mode",
        },
      };
    },
  };
}
