import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/ai';
import { SourceCitation } from './SourceCitation';

/**
 * Props for MessageBubble component
 */
export interface MessageBubbleProps {
  message: ChatMessage;
  sources?: string[];
  isStreaming?: boolean;
}

/**
 * MessageBubble - Display individual chat message
 *
 * Features:
 * - Different styling for user vs assistant messages
 * - Streaming indicator for in-progress responses
 * - Timestamp display
 * - Markdown rendering with react-markdown + remark-gfm
 * - Source citations for assistant messages
 * - AI Reasoning dropdown for assistant messages (when available)
 * - Per-message disclaimer for assistant messages
 *
 * @param props - MessageBubbleProps
 * @returns React component
 */
export function MessageBubble({ message, sources = [], isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'ml-12' : 'mr-12'}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-200'
          }`}
        >
          {/* Message content - Markdown for assistant, plain text for user */}
          {isAssistant ? (
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-900 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-gray-900 prose-em:text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-gray-400" />}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm">
              {message.content}
              {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-white" />}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && !isStreaming && (
          <div
            className={`mt-1 text-xs ${
              isUser ? 'text-right text-gray-500' : 'text-left text-gray-500'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Sources (only for assistant messages) */}
        {isAssistant && sources.length > 0 && (
          <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <SourceCitation sources={sources} />
          </div>
        )}

        {/* AI Reasoning Dropdown (only for assistant messages with thinking content) */}
        {isAssistant && message.thinkingContent && message.thinkingContent.length > 0 && (
          <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 overflow-hidden">
            <button
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              aria-label={isReasoningExpanded ? 'Collapse AI reasoning process' : 'Expand AI reasoning process'}
              aria-expanded={isReasoningExpanded}
            >
              <span className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <span className="text-lg">🧠</span>
                AI Reasoning Process
              </span>
              <span
                className="text-blue-600 transition-transform duration-200"
                style={{ transform: isReasoningExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
            </button>
            {isReasoningExpanded && (
              <div className="px-4 py-3 bg-slate-50 border-t border-blue-100">
                <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {message.thinkingContent}
                </pre>
                <div className="mt-2 pt-2 border-t border-slate-300 text-xs text-gray-600">
                  <span className="italic">💡 This shows the AI's internal reasoning process before generating the response</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Per-message disclaimer (only for assistant messages) */}
        {isAssistant && !isStreaming && (
          <div className="mt-2 text-xs text-gray-500 italic">
            ⚖️ General information only - consult a solicitor for legal advice
          </div>
        )}
      </div>
    </div>
  );
}
