import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/ai';
import type { IPCResponse, AICheckStatusResponse, AIStreamStartResponse } from '../types/ipc';

/**
 * Loading states for AI chat operations
 */
export type AILoadingState = 'idle' | 'connecting' | 'thinking' | 'streaming';

/**
 * Return type for useAI hook
 */
export interface UseAIReturn {
  // State
  messages: ChatMessage[];
  loadingState: AILoadingState;
  error: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  // Refs for auto-scroll
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

/**
 * React hook for AI chat with streaming support
 *
 * Features:
 * - Message history management
 * - Streaming token handling (real-time display)
 * - Loading states (connecting, thinking, streaming)
 * - Error states (offline, timeout, LM Studio not running)
 * - Auto-scroll to latest message
 * - Event listener cleanup (no memory leaks)
 *
 * @returns {UseAIReturn} AI chat state and actions
 */
export function useAI(): UseAIReturn {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingState, setLoadingState] = useState<AILoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');

  // Refs for cleanup and avoiding closure issues
  const isMountedRef = useRef<boolean>(true);
  const streamingContentRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync streamingContent to ref for event handlers
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  // Check AI status on mount
  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const response: IPCResponse<AICheckStatusResponse> =
          await window.justiceAPI.checkAIStatus();

        if (!response.success) {
          setError('Failed to check AI status');
          return;
        }

        if (!response.connected) {
          setError(
            'LM Studio is not running. Please start LM Studio at http://localhost:1234 and load a model.'
          );
        }
      } catch (err) {
        setError(
          'Cannot connect to LM Studio. Please install and run LM Studio from https://lmstudio.ai'
        );
      }
    };

    checkStatus();
  }, []);

  // Set up streaming event listeners
  useEffect(() => {
    console.log('[useAI] Setting up event listeners');

    /**
     * Handle incoming token from AI stream
     */
    const handleToken = (token: string): void => {
      console.log('[useAI] handleToken called, token:', token, 'isMounted:', isMountedRef.current);
      if (!isMountedRef.current) {
        console.error('[useAI] Component unmounted, ignoring token');
        return;
      }

      console.log('[useAI] Setting loadingState to streaming');
      setLoadingState('streaming');
      setStreamingContent((prev) => {
        const newContent = prev + token;
        console.log('[useAI] Updated streamingContent length:', newContent.length);
        return newContent;
      });
    };

    /**
     * Handle stream completion
     */
    const handleComplete = (): void => {
      console.log('[useAI] handleComplete called, content length:', streamingContentRef.current.length);
      if (!isMountedRef.current) return;

      // Add complete assistant message to history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: streamingContentRef.current,
        timestamp: new Date().toISOString(),
      };

      console.log('[useAI] Adding message to history');
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
      setLoadingState('idle');
      setIsStreaming(false);
      setError(null);
    };

    /**
     * Handle stream error
     */
    const handleError = (errorMsg: string): void => {
      console.error('[useAI] Stream error:', errorMsg);
      if (!isMountedRef.current) return;

      setError(`AI Error: ${errorMsg}`);
      setStreamingContent('');
      setLoadingState('idle');
      setIsStreaming(false);
    };

    // Register event listeners and get cleanup functions
    const removeTokenListener = window.justiceAPI.onAIStreamToken(handleToken);
    const removeCompleteListener = window.justiceAPI.onAIStreamComplete(handleComplete);
    const removeErrorListener = window.justiceAPI.onAIStreamError(handleError);

    console.log('[useAI] Event listeners registered');

    // Cleanup on unmount
    return (): void => {
      console.log('[useAI] Cleaning up event listeners');
      isMountedRef.current = false;
      removeTokenListener();
      removeCompleteListener();
      removeErrorListener();
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent]);

  /**
   * Send a message to AI and start streaming response
   */
  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      // Validation
      if (!content.trim()) {
        setError('Message cannot be empty');
        return;
      }

      if (isStreaming) {
        setError('Please wait for the current response to complete');
        return;
      }

      // Clear previous error
      setError(null);

      // Optimistic update - add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Start streaming
      setLoadingState('connecting');
      setIsStreaming(true);
      setStreamingContent('');

      try {
        const response: IPCResponse<AIStreamStartResponse> =
          await window.justiceAPI.aiStreamStart({
            messages: [...messages, userMessage],
          });

        if (!response.success) {
          setError(response.error);
          setLoadingState('idle');
          setIsStreaming(false);
          return;
        }

        // Successfully started stream, now waiting for tokens
        setLoadingState('thinking');
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Failed to connect to LM Studio. Is it running?';
        setError(errorMsg);
        setLoadingState('idle');
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  /**
   * Clear all messages from chat history
   */
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setStreamingContent('');
    setError(null);
    setLoadingState('idle');
    setIsStreaming(false);
  }, []);

  return {
    // State
    messages,
    loadingState,
    error,
    isStreaming,
    streamingContent,

    // Actions
    sendMessage,
    clearMessages,

    // Refs
    messagesEndRef,
  };
}
