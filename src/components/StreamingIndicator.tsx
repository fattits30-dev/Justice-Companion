/**
 * StreamingIndicator Component
 *
 * Displays a typing animation when AI is generating a response.
 * Shows different states: connecting, thinking, streaming.
 */

import { AILoadingState } from '../hooks/useAI';

interface StreamingIndicatorProps {
  loadingState: AILoadingState;
}

export function StreamingIndicator({ loadingState }: StreamingIndicatorProps): JSX.Element | null {
  if (loadingState === 'idle') {
    return null;
  }

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

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
      <span>{getMessage()}</span>
    </div>
  );
}
