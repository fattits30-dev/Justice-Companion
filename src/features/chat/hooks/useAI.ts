import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ChatMessage } from '../../../types/ai';
import type { IPCResponse, AICheckStatusResponse, AIStreamStartResponse } from '../../../types/ipc';
import { logger } from '../../../utils/logger';

/**
 * Loading states for AI chat operations
 * Action-oriented status updates with emojis for modern UX
 */
export type AILoadingState =
  | 'idle'
  | 'connecting'
  | '🤔 Thinking...'
  | '🔍 Researching...'
  | '✍️ Writing...'
  | 'streaming';

/**
 * Progress stage for tracking AI pipeline execution
 * Builds a cumulative timeline of what the AI is doing
 */
export interface ProgressStage {
  stage: string; // Human-readable stage name (e.g., "Analyzing your question...")
  timestamp: string; // ISO timestamp when stage started
  completed: boolean; // Whether this stage is finished
}

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
  thinkingContent: string; // AI reasoning content from <think> tags
  currentSources: string[]; // Legal source citations for current AI response
  progressStages: ProgressStage[]; // NEW: Cumulative timeline of AI pipeline stages

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  loadMessages: (messages: ChatMessage[]) => void;

  // Refs for auto-scroll
  messagesEndRef: RefObject<HTMLDivElement>;
}

/**
 * React hook for AI chat with streaming support
 *
 * Features:
 * - Message history management
 * - Streaming token handling (real-time display)
 * - Loading states (connecting, thinking, streaming)
 * - Error states (offline, timeout, AI service errors)
 * - Auto-scroll to latest message
 * - Event listener cleanup (no memory leaks)
 * - Case-specific memory (function calling for fact-gathering)
 *
 * @param caseId - Optional case ID for function calling (enables fact-gathering)
 * @param initialMessages - Optional array of messages to pre-populate chat history
 * @returns {UseAIReturn} AI chat state and actions
 */
export function useAI(caseId?: number, initialMessages: ChatMessage[] = []): UseAIReturn {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loadingState, setLoadingState] = useState<AILoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [thinkingContent, setThinkingContent] = useState<string>(''); // NEW: AI reasoning
  const [currentSources, setCurrentSources] = useState<string[]>([]); // NEW: Legal source citations
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([]); // NEW: Cumulative progress timeline

  // Refs for cleanup and avoiding closure issues
  const isMountedRef = useRef<boolean>(true);
  const streamingContentRef = useRef<string>('');
  const thinkingContentRef = useRef<string>(''); // NEW: Ref for thinking content
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync streamingContent and thinkingContent to refs for event handlers
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  useEffect(() => {
    thinkingContentRef.current = thinkingContent;
  }, [thinkingContent]);

  // Check AI status on mount
  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      if (!window.justiceAPI) {
        logger.warn('useAI', 'window.justiceAPI not available during status check');
        return;
      }

      try {
        const response: IPCResponse<AICheckStatusResponse> =
          await window.justiceAPI.checkAIStatus();

        if (!response.success) {
          setError('Failed to check AI status');
          return;
        }

        if (!response.connected) {
          setError(
            'AI initialization failed. Please check model availability.',
          );
        }
      } catch (err) {
        logger.error('useAI', 'AI status check failed', { err });
        setError(
          'AI service initialization error. Please ensure the AI model is properly configured.',
        );
      }
    };

    void checkStatus();
  }, []);

  // Set up streaming event listeners
  useEffect(() => {
    // Safety check: ensure window.justiceAPI is available
    if (!window.justiceAPI) {
      logger.error('useAI', 'window.justiceAPI is not available. Preload script may not have executed.');
      setError('Application initialization error. Please reload the app.');
      return;
    }

    isMountedRef.current = true; // Reset to true on mount (fixes React Strict Mode unmount issue)
    logger.info('useAI', 'Setting up event listeners');

    /**
     * Handle incoming token from AI stream
     */
    const handleToken = (token: string): void => {
      logger.debug('useAI', 'handleToken called', { token, isMounted: isMountedRef.current });
      if (!isMountedRef.current) {
        logger.warn('useAI', 'Component unmounted, ignoring token');
        return;
      }

      logger.info('useAI', 'Setting loadingState to streaming');
      setLoadingState('streaming');
      setStreamingContent((prev) => {
        const newContent = prev + token;
        logger.debug('useAI', 'Updated streamingContent', { length: newContent.length });
        return newContent;
      });
    };

    /**
     * Handle incoming think token from AI stream (reasoning content)
     */
    const handleThinkToken = (token: string): void => {
      logger.debug('useAI', 'handleThinkToken called', { token });
      if (!isMountedRef.current) {
        return;
      }

      setThinkingContent((prev) => {
        const newContent = prev + token;
        logger.debug('useAI', 'Updated thinkingContent', { length: newContent.length });
        return newContent;
      });
    };

    /**
     * Handle incoming legal sources from AI stream
     */
    const handleSources = (sources: string[]): void => {
      logger.debug('useAI', 'handleSources called', { sourcesCount: sources.length });
      if (!isMountedRef.current) {
        return;
      }

      setCurrentSources(sources);
      logger.info('useAI', 'Legal sources received', { sourcesCount: sources.length });
    };

    /**
     * Handle stream completion
     */
    const handleComplete = (): void => {
      logger.info('useAI', 'handleComplete called', {
        contentLength: streamingContentRef.current.length,
        thinkingLength: thinkingContentRef.current.length,
      });
      if (!isMountedRef.current) {
        return;
      }

      // Mark all stages as completed
      setProgressStages((prev) =>
        prev.map((stage) => ({ ...stage, completed: true })),
      );

      // Add complete assistant message to history with thinking content
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: streamingContentRef.current,
        timestamp: new Date().toISOString(),
        thinkingContent: thinkingContentRef.current || undefined, // Store AI reasoning
      };

      logger.info('useAI', 'Adding message to history with thinking content');
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
      setThinkingContent(''); // Clear thinking content for next message
      setLoadingState('idle');
      setIsStreaming(false);
      setError(null);
    };

    /**
     * Handle stream error
     */
    const handleError = (errorMsg: string): void => {
      logger.error('useAI', 'Stream error', { error: errorMsg });
      if (!isMountedRef.current) {
        return;
      }

      setError(`AI Error: ${errorMsg}`);
      setStreamingContent('');
      setLoadingState('idle');
      setIsStreaming(false);
    };

    // Register event listeners and get cleanup functions
    /**
     * Handle status updates from main process (RAG progress)
     * Accumulates stages into a timeline for full visibility
     */
    const handleStatusUpdate = (status: string): void => {
      logger.info('useAI', 'Status update received', { status });
      if (!isMountedRef.current) {
        return;
      }

      // Update loading state (backward compatibility)
      setLoadingState(status as AILoadingState);

      // Mark previous stage as completed and add new stage
      setProgressStages((prev) => {
        // Mark the last stage as completed
        const updatedPrev = prev.map((stage, index) =>
          index === prev.length - 1 ? { ...stage, completed: true } : stage,
        );

        // Add new stage as in-progress
        return [
          ...updatedPrev,
          {
            stage: status,
            timestamp: new Date().toISOString(),
            completed: false,
          },
        ];
      });
    };

    const removeTokenListener = window.justiceAPI.onAIStreamToken(handleToken);
    const removeThinkTokenListener = window.justiceAPI.onAIStreamThinkToken(handleThinkToken);
    const removeSourcesListener = window.justiceAPI.onAIStreamSources(handleSources);
    const removeStatusListener = window.justiceAPI.onAIStatusUpdate(handleStatusUpdate);
    const removeCompleteListener = window.justiceAPI.onAIStreamComplete(handleComplete);
    const removeErrorListener = window.justiceAPI.onAIStreamError(handleError);

    logger.info('useAI', 'Event listeners registered (tokens, thinking, sources, status)');

    // Cleanup on unmount
    return (): void => {
      logger.info('useAI', 'Cleaning up event listeners');
      isMountedRef.current = false;
      removeTokenListener();
      removeThinkTokenListener();
      removeSourcesListener();
      removeStatusListener();
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
      // Safety check
      if (!window.justiceAPI) {
        setError('Application not ready. Please reload the app.');
        return;
      }

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
      setThinkingContent(''); // Clear previous thinking content
      setCurrentSources([]); // Clear previous sources
      setProgressStages([]); // Reset progress timeline for new message

      try {
        const response: IPCResponse<AIStreamStartResponse> =
          await window.justiceAPI.aiStreamStart({
            messages: [...messages, userMessage],
            caseId: caseId,
          });

        if (!response.success) {
          setError(response.error);
          setLoadingState('idle');
          setIsStreaming(false);
          return;
        }

        // Successfully started stream, status updates will come from main process
        // (No need to set 'thinking' - main will emit 'Analyzing your question...')
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'AI inference failed. Please check the AI service status.';
        setError(errorMsg);
        setLoadingState('idle');
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, caseId],
  );

  /**
   * Clear all messages from chat history
   */
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setStreamingContent('');
    setThinkingContent('');
    setCurrentSources([]);
    setProgressStages([]);
    setError(null);
    setLoadingState('idle');
    setIsStreaming(false);
  }, []);

  /**
   * Load messages into chat history (e.g., from a saved conversation)
   */
  const loadMessages = useCallback((newMessages: ChatMessage[]): void => {
    setMessages(newMessages);
    setStreamingContent('');
    setThinkingContent('');
    setCurrentSources([]);
    setProgressStages([]);
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
    thinkingContent, // NEW: Expose thinking content
    currentSources, // NEW: Expose legal sources
    progressStages, // NEW: Expose cumulative progress timeline

    // Actions
    sendMessage,
    clearMessages,
    loadMessages,

    // Refs
    messagesEndRef,
  };
}
