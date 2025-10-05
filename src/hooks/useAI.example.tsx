/**
 * Example usage of useAI hook
 *
 * This file demonstrates how to integrate the useAI hook into a React component.
 * Delete this file after reviewing the integration pattern.
 */

import React, { useState } from 'react';
import { useAI } from './useAI';

export function AIChatExample(): JSX.Element {
  const {
    messages,
    loadingState,
    error,
    isStreaming,
    streamingContent,
    sendMessage,
    clearMessages,
    messagesEndRef,
  } = useAI();

  const [inputValue, setInputValue] = useState('');

  const handleSend = async (): Promise<void> => {
    if (!inputValue.trim() || isStreaming) {
      return;
    }

    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI Legal Assistant</h1>
        <button
          onClick={clearMessages}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            No messages yet. Start a conversation!
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300'
              }`}
            >
              <div className="text-xs font-semibold mb-1">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.timestamp && (
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming Content */}
        {isStreaming && streamingContent && (
          <div className="mb-4 text-left">
            <div className="inline-block max-w-[80%] px-4 py-2 rounded-lg bg-white border border-gray-300">
              <div className="text-xs font-semibold mb-1">AI Assistant</div>
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <div className="text-xs opacity-70 mt-1">Typing...</div>
            </div>
          </div>
        )}

        {/* Loading State Indicator */}
        {loadingState === 'connecting' && (
          <div className="text-gray-500 text-center">
            Connecting to AI...
          </div>
        )}
        {loadingState === '🤔 Thinking...' && (
          <div className="text-gray-500 text-center">🤔 Thinking...</div>
        )}
        {loadingState === '🔍 Researching...' && (
          <div className="text-gray-500 text-center">🔍 Researching...</div>
        )}
        {loadingState === '✍️ Writing...' && (
          <div className="text-gray-500 text-center">✍️ Writing...</div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a legal question..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !inputValue.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Loading State Footer */}
      <div className="mt-2 text-sm text-gray-500 text-center h-6">
        {loadingState === 'streaming' && 'Receiving response...'}
        {isStreaming && messages.length > 0 && (
          <span className="text-xs">
            (Messages: {messages.length})
          </span>
        )}
      </div>
    </div>
  );
}
