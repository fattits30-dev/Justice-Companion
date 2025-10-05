import type { RefObject } from 'react';
import type { ChatMessage } from '../types/ai';
import type { AILoadingState, ProgressStage } from '../hooks/useAI';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';
import { ChatPostItNotes } from './ChatPostItNotes';

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  loadingState: AILoadingState;
  thinkingContent: string;
  currentSources: string[]; // Legal source citations
  progressStages: ProgressStage[]; // NEW: Cumulative progress timeline
  messagesEndRef: RefObject<HTMLDivElement>;
  caseId?: number | null; // Optional case ID for fact display
}

/**
 * Scrollable message list container
 *
 * Displays all chat messages with auto-scroll functionality.
 * Shows streaming assistant response in real-time.
 *
 * Features:
 * - Auto-scroll to latest message (using messagesEndRef)
 * - Empty state when no messages
 * - Streaming indicator for assistant responses
 * - Smooth scrolling with overflow-y-auto
 *
 * @param {MessageListProps} props - Component props
 * @returns {JSX.Element} Scrollable message list
 */
export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  loadingState,
  thinkingContent,
  currentSources,
  progressStages,
  messagesEndRef,
  caseId,
}: MessageListProps): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto space-y-4 pb-32">
        {/* Post-it Notes - Persistent at top */}
        <ChatPostItNotes caseId={caseId} />

        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="text-gray-500">
              <p className="text-lg font-medium">Ask a legal question to get started</p>
              <p className="mt-2 text-sm">
                I can help you understand UK law, employment rights, and legal procedures.
              </p>
            </div>
          </div>
        )}

        {/* Render all messages */}
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${message.timestamp || index}`}
            message={message}
            isStreaming={false}
          />
        ))}

        {/* Inline StreamingIndicator - appears right where AI response will be */}
        {isStreaming && (
          <StreamingIndicator
            loadingState={loadingState}
            progressStages={progressStages}
            thinkingContent={thinkingContent}
          />
        )}

        {/* Streaming assistant response */}
        {isStreaming && streamingContent.length > 0 && (
          <MessageBubble
            message={{
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date().toISOString(),
            }}
            isStreaming={true}
          />
        )}

        {/* Legal Sources - Show after streaming completes */}
        {!isStreaming && currentSources.length > 0 && (
          <div className="ml-12 mt-2 p-4 bg-blue-950/30 border border-blue-800/30 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <span>📚</span>
              Legal Sources Referenced
            </h4>
            <ul className="space-y-1">
              {currentSources.map((source, index) => (
                <li key={index} className="text-xs text-blue-200">
                  {source.includes('http') ? (
                    <a
                      href={source.split(' - ')[1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-100 hover:underline transition-colors"
                    >
                      {source.split(' - ')[0]}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
