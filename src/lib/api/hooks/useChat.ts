/**
 * React Query hooks for Chat Streaming API.
 *
 * @module api/hooks/useChat
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { apiClient } from "../index";
import type { ApiResponse } from "../types";
import type { StreamCallbacks, StreamOptions } from "../chat";

// ====================
// Query Keys
// ====================

export const chatKeys = {
  all: ["chat"] as const,
  conversations: (caseId?: number | null) =>
    [...chatKeys.all, "conversations", caseId] as const,
  conversation: (id: number) => [...chatKeys.all, "conversation", id] as const,
};

// ====================
// Query Hooks
// ====================

/**
 * Hook to fetch conversations
 */
export function useConversations(
  caseId?: number | null,
  limit: number = 10,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: chatKeys.conversations(caseId),
    queryFn: () => apiClient.chat.getConversations(caseId, limit),
    ...queryOptions,
  });
}

/**
 * Hook to fetch a specific conversation
 */
export function useConversation(
  conversationId: number,
  queryOptions?: Omit<
    UseQueryOptions<ApiResponse<unknown>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => apiClient.chat.getConversation(conversationId),
    enabled: conversationId > 0,
    ...queryOptions,
  });
}

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to delete a conversation
 */
export function useDeleteConversation(
  mutationOptions?: UseMutationOptions<ApiResponse<unknown>, Error, number>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: number) =>
      apiClient.chat.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.removeQueries({
        queryKey: chatKeys.conversation(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook to upload a document for chat analysis
 */
export function useUploadChatDocument(
  mutationOptions?: UseMutationOptions<
    ApiResponse<{ filePath: string }>,
    Error,
    { file: File; userQuestion?: string }
  >,
) {
  return useMutation({
    mutationFn: ({ file, userQuestion }) =>
      apiClient.chat.uploadDocument(file, userQuestion),
    ...mutationOptions,
  });
}

/**
 * Hook to analyze an uploaded document
 */
export function useAnalyzeChatDocument(
  mutationOptions?: UseMutationOptions<
    ApiResponse<unknown>,
    Error,
    { filePath: string; userQuestion?: string }
  >,
) {
  return useMutation({
    mutationFn: ({ filePath, userQuestion }) =>
      apiClient.chat.analyzeDocument(filePath, userQuestion),
    ...mutationOptions,
  });
}

// ====================
// Streaming Hook
// ====================

interface UseChatStreamState {
  isStreaming: boolean;
  response: string;
  thinking: string;
  error: string | null;
  conversationId: number | null;
  sources: unknown[];
}

interface UseChatStreamReturn extends UseChatStreamState {
  sendMessage: (message: string, options?: StreamOptions) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for streaming chat responses
 * Uses SSE (Server-Sent Events) for real-time token streaming
 */
export function useChatStream(): UseChatStreamReturn {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UseChatStreamState>({
    isStreaming: false,
    response: "",
    thinking: "",
    error: null,
    conversationId: null,
    sources: [],
  });

  const responseRef = useRef("");
  const thinkingRef = useRef("");

  const reset = useCallback(() => {
    responseRef.current = "";
    thinkingRef.current = "";
    setState({
      isStreaming: false,
      response: "",
      thinking: "",
      error: null,
      conversationId: null,
      sources: [],
    });
  }, []);

  const sendMessage = useCallback(
    async (message: string, options: StreamOptions = {}) => {
      reset();
      setState((prev) => ({ ...prev, isStreaming: true }));

      const callbacks: StreamCallbacks = {
        onToken: (token: string) => {
          responseRef.current += token;
          setState((prev) => ({ ...prev, response: responseRef.current }));
        },
        onThinking: (thinking: string) => {
          thinkingRef.current += thinking;
          setState((prev) => ({ ...prev, thinking: thinkingRef.current }));
        },
        onComplete: (conversationId: number) => {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            conversationId,
          }));
          // Invalidate conversations to include the new one
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        },
        onError: (error: string) => {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error,
          }));
        },
        onSources: (sources: unknown[]) => {
          setState((prev) => ({ ...prev, sources }));
        },
      };

      await apiClient.chat.stream(message, callbacks, options);
    },
    [reset, queryClient],
  );

  return {
    ...state,
    sendMessage,
    reset,
  };
}
