import type { RefObject } from 'react';
import type { ChatMessage } from '../types/ai';
import { MessageBubble } from './MessageBubble';

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
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
  messagesEndRef,
}: MessageListProps): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
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

        {/* Streaming assistant response */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date().toISOString(),
            }}
            isStreaming={true}
          />
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
