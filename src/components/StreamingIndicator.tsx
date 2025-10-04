/**
 * StreamingIndicator Component
 *
 * Displays a collapsible typing animation when AI is generating a response.
 * Shows different states: connecting, thinking, streaming.
 * Can be expanded to show detailed status information.
 * Auto-collapses when state changes.
 */

import { useState, useEffect } from 'react';
import { AILoadingState } from '../hooks/useAI';
import { logger } from '../utils/logger';

interface StreamingIndicatorProps {
  loadingState: AILoadingState;
  thinkingContent?: string; // NEW: AI reasoning content (Phase 3 will implement display)
}

export function StreamingIndicator({ loadingState, thinkingContent }: StreamingIndicatorProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Debug: Log when loadingState changes
  useEffect(() => {
    logger.info('StreamingIndicator', 'loadingState changed', { state: loadingState });
    setIsExpanded(false);
  }, [loadingState]);

  if (loadingState === 'idle') {
    logger.debug('StreamingIndicator', 'Returning null (idle state)');
    return null;
  }

  logger.debug('StreamingIndicator', 'Rendering', { state: loadingState });

  const getMessage = (): string => {
    switch (loadingState) {
      case 'connecting':
        return 'Connecting to AI...';
      case 'thinking':
        return 'Thinking...';
      case 'streaming':
        return 'Writing response...';
      default:
        return '';
    }
  };

  const getIcon = (): string => {
    return isExpanded ? '▼' : '▶';
  };

  return (
    <div className="border-b border-gray-200 bg-blue-50">
      {/* Compact status bar - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-blue-100 transition-colors focus:outline-none"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse status' : 'Expand status'}
      >
        <span className="text-gray-400 text-xs">{getIcon()}</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        <span className="font-medium">{getMessage()}</span>
      </button>

      {/* Expanded details - collapsible */}
      {isExpanded && (
        <div className="px-4 py-3 text-xs text-gray-600 bg-white border-t border-gray-200">
          <div className="mx-auto max-w-4xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Status:</span>
              <span className="capitalize">{loadingState}</span>
            </div>
            <div className="text-gray-500">
              {loadingState === 'connecting' && '⏳ Establishing connection to LM Studio...'}
              {loadingState === 'thinking' && '🧠 AI is processing your question...'}
              {loadingState === 'streaming' && '✍️ AI is generating response in real-time...'}
            </div>
          </div>
        </div>
      )}

      {/* AI Reasoning Section - NEW: Shows <think> content */}
      {thinkingContent && thinkingContent.length > 0 && (
        <div className="border-t border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <button
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            aria-label={isReasoningExpanded ? 'Collapse AI reasoning process' : 'Expand AI reasoning process'}
            aria-expanded={isReasoningExpanded}
          >
            <span className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <span className="text-lg">🧠</span>
              AI Reasoning Process
            </span>
            <span className="text-blue-600 transition-transform duration-200" style={{ transform: isReasoningExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          {isReasoningExpanded && (
            <div className="px-4 py-3 bg-slate-100 max-h-64 overflow-y-auto border-t border-blue-100 animate-fade-in">
              <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {thinkingContent}
              </pre>
              <div className="mt-2 pt-2 border-t border-slate-300 text-xs text-gray-600">
                <span className="italic">💡 This shows the AI's internal reasoning process before generating the response</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
