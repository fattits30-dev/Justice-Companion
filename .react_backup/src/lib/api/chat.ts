/**
 * Chat Streaming API
 */

import { ApiError, type ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createChatApi(client: ApiClient) {
  return {
    /**
     * Stream chat response with Server-Sent Events (SSE)
     */
    async stream(
      message: string,
      callbacks: {
        onToken: (token: string) => void;
        onThinking?: (thinking: string) => void;
        onComplete: (conversationId: number) => void;
        onError: (error: string) => void;
        onSources?: (sources: any[]) => void;
      },
      options: {
        conversationId?: number | null;
        caseId?: number | null;
        useRAG?: boolean;
      } = {}
    ): Promise<void> {
      const { conversationId, caseId, useRAG = true } = options;

      try {
        const url = `${client.getBaseURL()}/chat/stream`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const sessionId = client.getSessionId();
        if (sessionId) {
          headers["X-Session-ID"] = sessionId;
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
          signal: AbortSignal.timeout(300000),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new ApiError(
            response.status,
            errorData.detail || errorData.message || "Failed to start stream",
            "STREAM_ERROR",
            errorData
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
            if (!line.startsWith("data: ")) {
              continue;
            }

            try {
              const jsonData = line.substring(6);
              const event = JSON.parse(jsonData);

              switch (event.type) {
                case "token":
                  if (typeof event.data === "string") {
                    callbacks.onToken(event.data);
                  }
                  break;
                case "thinking":
                  if (callbacks.onThinking && typeof event.data === "string") {
                    callbacks.onThinking(event.data);
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
      } catch (error) {
        if (error instanceof ApiError) {
          callbacks.onError(error.message);
        } else {
          callbacks.onError(
            error instanceof Error ? error.message : "Streaming failed"
          );
        }
      }
    },

    /**
     * Get recent conversations
     */
    async getConversations(
      caseId?: number | null,
      limit: number = 10
    ): Promise<ApiResponse<any[]>> {
      const params: Record<string, string | number> = { limit };
      if (caseId !== null && caseId !== undefined) {
        params.case_id = caseId;
      }
      return client.get<ApiResponse<any[]>>("/chat/conversations", params);
    },

    /**
     * Get a specific conversation with messages
     */
    getConversation(conversationId: number): Promise<ApiResponse<any>> {
      return client.get<ApiResponse<any>>(
        `/chat/conversations/${conversationId}`
      );
    },

    /**
     * Delete a conversation
     */
    deleteConversation(conversationId: number): Promise<ApiResponse<any>> {
      return client.delete<ApiResponse<any>>(
        `/chat/conversations/${conversationId}`
      );
    },

    /**
     * Upload a document for analysis
     */
    async uploadDocument(
      file: File,
      userQuestion?: string
    ): Promise<ApiResponse<{ filePath: string }>> {
      const formData = new FormData();
      formData.append("file", file);
      if (userQuestion) {
        formData.append("userQuestion", userQuestion);
      }

      const url = new URL(`${client.getBaseURL()}/chat/upload-document`);
      const headers: Record<string, string> = {};

      const sessionId = client.getSessionId();
      if (sessionId) {
        headers["Authorization"] = `Bearer ${sessionId}`;
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
          errorData
        );
      }

      return await response.json();
    },

    /**
     * Analyze a document that has been uploaded
     */
    analyzeDocument(
      filePath: string,
      userQuestion?: string
    ): Promise<ApiResponse<any>> {
      return client.post<ApiResponse<any>>("/chat/analyze-document", {
        filePath,
        userQuestion,
      });
    },
  };
}
