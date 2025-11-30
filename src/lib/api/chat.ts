/**
 * Chat Streaming API module.
 *
 * @module api/chat
 */

import { BaseApiClient } from "./client";
import { ApiResponse, ApiError } from "./types";

// ====================
// Chat Types
// ====================

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete: (conversationId: number) => void;
  onError: (error: string) => void;
  onSources?: (sources: unknown[]) => void;
}

export interface StreamOptions {
  conversationId?: number | null;
  caseId?: number | null;
  useRAG?: boolean;
}

// ====================
// Chat API Factory
// ====================

export function createChatApi(client: BaseApiClient) {
  return {
    stream: async (
      message: string,
      callbacks: StreamCallbacks,
      options: StreamOptions = {},
    ): Promise<void> => {
      const { conversationId, caseId, useRAG = true } = options;

      try {
        const url = `${client.getBaseURL()}/chat/stream`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const sessionId = client.getSessionId();
        if (sessionId) {
          headers["X-Session-Id"] = sessionId;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            conversationId,
            caseId,
            useRAG,
          }),
          signal: AbortSignal.timeout(300000), // 5 minutes for streaming
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new ApiError(
            response.status,
            errorData.detail || errorData.message || "Failed to start stream",
            "STREAM_ERROR",
            errorData,
          );
        }

        if (!response.body) {
          throw new ApiError(0, "No response body", "NO_BODY");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonData = line.substring(6);
                const event = JSON.parse(jsonData);

                switch (event.type) {
                  case "token":
                    if (typeof event.data === "string") {
                      callbacks.onToken(event.data);
                    }
                    break;

                  case "sources":
                    if (callbacks.onSources && Array.isArray(event.data)) {
                      callbacks.onSources(event.data);
                    }
                    break;

                  case "complete":
                    if (event.conversationId) {
                      callbacks.onComplete(event.conversationId);
                    }
                    break;

                  case "error":
                    callbacks.onError(event.error || "Unknown error");
                    return;
                }
              } catch (e) {
                console.error("[ApiClient] Failed to parse SSE event:", e);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof ApiError) {
          callbacks.onError(error.message);
        } else {
          callbacks.onError(
            error instanceof Error ? error.message : "Streaming failed",
          );
        }
      }
    },

    getConversations: async (
      caseId?: number | null,
      limit: number = 10,
    ): Promise<ApiResponse<unknown[]>> => {
      const params: Record<string, string | number> = { limit };
      if (caseId !== null && caseId !== undefined) {
        params.case_id = caseId;
      }
      return client.get<ApiResponse<unknown[]>>("/chat/conversations", params);
    },

    getConversation: async (
      conversationId: number,
    ): Promise<ApiResponse<unknown>> => {
      return client.get<ApiResponse<unknown>>(
        `/chat/conversations/${conversationId}`,
      );
    },

    deleteConversation: async (
      conversationId: number,
    ): Promise<ApiResponse<unknown>> => {
      return client.delete<ApiResponse<unknown>>(
        `/chat/conversations/${conversationId}`,
      );
    },

    uploadDocument: async (
      file: File,
      userQuestion?: string,
    ): Promise<ApiResponse<{ filePath: string }>> => {
      const formData = new FormData();
      formData.append("file", file);
      if (userQuestion) {
        formData.append("userQuestion", userQuestion);
      }

      const url = new URL(`${client.getBaseURL()}/chat/upload-document`);
      const headers: Record<string, string> = {};

      const sessionId = client.getSessionId();
      if (sessionId) {
        headers["X-Session-Id"] = sessionId;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Upload failed",
          "UPLOAD_ERROR",
          errorData,
        );
      }

      return await response.json();
    },

    analyzeDocument: async (
      filePath: string,
      userQuestion?: string,
    ): Promise<ApiResponse<unknown>> => {
      return client.post<ApiResponse<unknown>>("/chat/analyze-document", {
        filePath,
        userQuestion,
      });
    },
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
