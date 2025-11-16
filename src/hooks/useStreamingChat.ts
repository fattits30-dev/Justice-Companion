/**
 * useStreamingChat - React hook for streaming AI chat responses
 *
 * Provides a clean interface for streaming chat functionality with the FastAPI backend.
 * Handles message streaming, conversation management, and error recovery.
 */

import { useState, useCallback, useRef } from "react";
import { apiClient } from "../lib/apiClient.ts";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: any[];
}

export interface UseStreamingChatOptions {
  conversationId?: number | null;
  caseId?: number | null;
  useRAG?: boolean;
  onConversationCreated?: (conversationId: number) => void;
}

export interface UseStreamingChatReturn {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessage: string;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/**
 * Custom hook for managing streaming chat with AI
 *
 * @example
 * ```tsx
 * const { messages, isStreaming, sendMessage } = useStreamingChat({
 *   conversationId: currentConversation,
 *   caseId: activeCaseId,
 *   onConversationCreated: (id) => setCurrentConversation(id)
 * });
 * ```
 */
export function useStreamingChat(
  options: UseStreamingChatOptions = {},
): UseStreamingChatReturn {
  const {
    conversationId: initialConversationId,
    caseId,
    useRAG = true,
    onConversationCreated,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Use ref to track current conversation ID without causing re-renders
  const conversationIdRef = useRef<number | null>(
    initialConversationId || null,
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isStreaming) {
        return;
      }

      // Add user message immediately
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setCurrentStreamingMessage("");
      setError(null);

      let streamedContent = "";
      let streamedSources: any[] = [];

      try {
        await apiClient.chat.stream(
          message.trim(),
          {
            onToken: (token: string) => {
              streamedContent += token;
              setCurrentStreamingMessage(streamedContent);
            },
            onSources: (sources: any[]) => {
              streamedSources = sources;
            },
            onComplete: (newConversationId: number) => {
              // Update conversation ID
              conversationIdRef.current = newConversationId;

              // Notify parent component
              if (onConversationCreated && !initialConversationId) {
                onConversationCreated(newConversationId);
              }

              // Add assistant message to messages
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: streamedContent,
                timestamp: new Date(),
                sources:
                  streamedSources.length > 0 ? streamedSources : undefined,
              };

              setMessages((prev) => [...prev, assistantMessage]);
              setCurrentStreamingMessage("");
              setIsStreaming(false);
            },
            onError: (errorMessage: string) => {
              console.error(
                "[useStreamingChat] Streaming error:",
                errorMessage,
              );

              // Add error message
              const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease try asking again or rephrase your question.`,
                timestamp: new Date(),
              };

              setMessages((prev) => [...prev, errorMsg]);
              setError(errorMessage);
              setCurrentStreamingMessage("");
              setIsStreaming(false);
            },
          },
          {
            conversationId: conversationIdRef.current,
            caseId,
            useRAG,
          },
        );
      } catch (err) {
        console.error("[useStreamingChat] Send error:", err);

        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";

        // Add error message
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I couldn't process your message: ${errorMessage}\n\nPlease try again.`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMsg]);
        setError(errorMessage);
        setIsStreaming(false);
        setCurrentStreamingMessage("");
      }
    },
    [isStreaming, caseId, useRAG, initialConversationId, onConversationCreated],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage("");
    setError(null);
    conversationIdRef.current = null;
  }, []);

  return {
    messages,
    isStreaming,
    currentStreamingMessage,
    error,
    sendMessage,
    clearMessages,
    setMessages,
  };
}
