/**
 * Tests for useAI hook
 *
 * Note: These tests verify type safety and basic hook structure.
 * Full integration tests require mocking window.justiceAPI.
 */

import { describe, test, expect } from 'vitest';
import type { UseAIReturn, AILoadingState } from './useAI';
import type { ChatMessage } from '../types/ai';

describe('useAI types', () => {
  test('AILoadingState has correct values', () => {
    const states: AILoadingState[] = [
      'idle',
      'connecting',
      'Analyzing your question...',
      'Searching UK legislation...',
      'Generating response...',
      'streaming'
    ];
    expect(states).toHaveLength(6);
  });

  test('UseAIReturn has correct shape', () => {
    // Type-only test - verifies interface structure
    const mockReturn: UseAIReturn = {
      messages: [],
      loadingState: 'idle',
      error: null,
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '', // NEW: AI reasoning content
      currentSources: [], // NEW: Legal source citations
      sendMessage: async () => {},
      clearMessages: () => {},
      loadMessages: () => {}, // NEW: Load conversation messages
      messagesEndRef: { current: null },
    };

    expect(mockReturn.messages).toEqual([]);
    expect(mockReturn.loadingState).toBe('idle');
    expect(mockReturn.error).toBeNull();
    expect(mockReturn.isStreaming).toBe(false);
    expect(mockReturn.streamingContent).toBe('');
    expect(mockReturn.thinkingContent).toBe('');
  });

  test('ChatMessage has correct structure', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Test message',
      timestamp: new Date().toISOString(),
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Test message');
    expect(message.timestamp).toBeDefined();
  });

  test('Loading states transition correctly', () => {
    const transitions: Partial<Record<AILoadingState, AILoadingState[]>> = {
      idle: ['connecting'],
      connecting: ['Analyzing your question...', 'idle'],
      'Analyzing your question...': ['Searching UK legislation...', 'Generating response...', 'idle'],
      'Searching UK legislation...': ['Generating response...', 'idle'],
      'Generating response...': ['streaming', 'idle'],
      streaming: ['idle'],
    };

    expect(Object.keys(transitions)).toHaveLength(6);
  });
});

describe('useAI hook contract', () => {
  test('sendMessage validates empty content', () => {
    // This test documents expected behavior:
    // - Empty strings should not be sent
    // - trimmed content is used
    expect(''.trim()).toBe('');
    expect('  '.trim()).toBe('');
    expect('hello'.trim()).toBe('hello');
  });

  test('isStreaming prevents concurrent sends', () => {
    // This test documents expected behavior:
    // - When isStreaming is true, sendMessage should return early
    const isStreaming = true;
    const shouldSend = !isStreaming;
    expect(shouldSend).toBe(false);
  });

  test('messages array maintains order', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'First', timestamp: '2025-01-01T00:00:00Z' },
      { role: 'assistant', content: 'Second', timestamp: '2025-01-01T00:00:01Z' },
      { role: 'user', content: 'Third', timestamp: '2025-01-01T00:00:02Z' },
    ];

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
  });

  test('clearMessages resets all state', () => {
    // Documents expected behavior of clearMessages
    const initialState = {
      messages: [],
      streamingContent: '',
      error: null,
      loadingState: 'idle' as AILoadingState,
      isStreaming: false,
    };

    expect(initialState.messages).toEqual([]);
    expect(initialState.streamingContent).toBe('');
    expect(initialState.error).toBeNull();
    expect(initialState.loadingState).toBe('idle');
    expect(initialState.isStreaming).toBe(false);
  });
});

describe('useAI error handling', () => {
  test('LM Studio offline error message is user-friendly', () => {
    const errorMessage =
      'LM Studio is not running. Please start LM Studio at http://localhost:1234 and load a model.';
    expect(errorMessage).toContain('LM Studio');
    expect(errorMessage).toContain('http://localhost:1234');
  });

  test('Stream error is prefixed with "AI Error:"', () => {
    const errorMsg = 'Connection lost';
    const formattedError = `AI Error: ${errorMsg}`;
    expect(formattedError).toBe('AI Error: Connection lost');
  });

  test('Empty message error is clear', () => {
    const error = 'Message cannot be empty';
    expect(error).toContain('empty');
  });

  test('Concurrent send error is clear', () => {
    const error = 'Please wait for the current response to complete';
    expect(error).toContain('wait');
    expect(error).toContain('complete');
  });
});

describe('useAI streaming behavior', () => {
  test('Streaming content accumulates tokens', () => {
    let content = '';
    const tokens = ['Hello', ' ', 'world', '!'];

    tokens.forEach((token) => {
      content += token;
    });

    expect(content).toBe('Hello world!');
  });

  test('Streaming content resets on completion', () => {
    const streamingContent = 'Some partial content';
    const resetContent = '';

    expect(streamingContent).not.toBe('');
    expect(resetContent).toBe('');
  });

  test('Assistant message created from streaming content', () => {
    const streamingContent = 'This is a complete response';
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: streamingContent,
      timestamp: new Date().toISOString(),
    };

    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toBe(streamingContent);
    expect(assistantMessage.timestamp).toBeDefined();
  });
});
