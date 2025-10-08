/**
 * StreamingIndicator Component
 *
 * Displays cumulative progress timeline when AI is generating a response.
 * Shows all stages as they complete: ✓ (completed) or ⏳ (in-progress)
 * Can be expanded to show detailed timestamps and stage information.
 * Auto-collapses when state changes.
 */

import { useState, useEffect } from 'react';
import { AILoadingState, ProgressStage } from '../features/chat/hooks/useAI';
import { logger } from '../utils/logger';

interface StreamingIndicatorProps {
  loadingState: AILoadingState;
  progressStages: ProgressStage[]; // NEW: Cumulative progress timeline
  thinkingContent?: string; // AI reasoning content (displayed in expanded section)
}

export function StreamingIndicator({ loadingState, progressStages, thinkingContent }: StreamingIndicatorProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Debug: Log when loadingState or stages change
  useEffect(() => {
    logger.info('StreamingIndicator', 'State changed', {
      state: loadingState,
      stagesCount: progressStages.length,
    });
    setIsExpanded(false);
  }, [loadingState, progressStages.length]);

  if (loadingState === 'idle' && progressStages.length === 0) {
    logger.debug('StreamingIndicator', 'Returning null (idle state, no stages)');
    return null;
  }

  logger.debug('StreamingIndicator', 'Rendering', {
    state: loadingState,
    stages: progressStages,
  });

  /**
   * Get icon for stage based on completion status
   */
  const getStageIcon = (stage: ProgressStage): string => {
    return stage.completed ? '✓' : '⏳';
  };

  /**
   * Get color class for stage
   */
  const getStageColor = (stage: ProgressStage): string => {
    return stage.completed ? 'text-green-600' : 'text-blue-600';
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getIcon = (): string => {
    return isExpanded ? '▼' : '▶';
  };

  // Current status message (last stage or default)
  const currentMessage =
    progressStages.length > 0
      ? progressStages[progressStages.length - 1].stage
      : 'Processing...';

  return (
    <div className="border-b border-gray-200 bg-blue-50">
      {/* Compact status bar - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-blue-100 transition-colors focus:outline-none"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse progress timeline' : 'Expand progress timeline'}
      >
        <span className="text-gray-400 text-xs">{getIcon()}</span>
        {loadingState !== 'idle' && (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
        <span className="font-medium">{currentMessage}</span>
        {progressStages.length > 1 && (
          <span className="text-xs text-gray-500 ml-auto">
            ({progressStages.filter((s) => s.completed).length}/{progressStages.length} stages)
          </span>
        )}
      </button>

      {/* Expanded progress timeline - collapsible */}
      {isExpanded && progressStages.length > 0 && (
        <div className="px-4 py-3 text-xs text-gray-600 bg-white border-t border-gray-200">
          <div className="mx-auto max-w-4xl">
            <h3 className="font-semibold mb-2 text-sm">AI Pipeline Progress</h3>
            <div className="space-y-2">
              {progressStages.map((stage, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className={`font-bold text-lg ${getStageColor(stage)}`}>
                    {getStageIcon(stage)}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{stage.stage}</div>
                    <div className="text-gray-500 text-xs">
                      {formatTime(stage.timestamp)}
                    </div>
                  </div>
                  {stage.completed && (
                    <span className="text-green-600 text-xs font-semibold">
                      Complete
                    </span>
                  )}
                  {!stage.completed && (
                    <span className="text-blue-600 text-xs font-semibold animate-pulse">
                      In Progress...
                    </span>
                  )}
                </div>
              ))}
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
