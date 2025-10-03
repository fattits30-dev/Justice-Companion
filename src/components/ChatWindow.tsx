import { useAI } from '../hooks/useAI';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ErrorDisplay } from './ErrorDisplay';
import { StreamingIndicator } from './StreamingIndicator';
import { exportChatToPDF } from '../utils/exportToPDF';
import { BiDownload } from 'react-icons/bi';

/**
 * Main chat window component
 *
 * Top-level container for the chat interface.
 * Integrates useAI hook for AI streaming and manages chat state.
 *
 * Layout structure:
 * - Header: App title and metadata
 * - MessageList: Scrollable message container (flex-1)
 * - ChatInput: Input area placeholder (Agent Echo will build actual input)
 *
 * Features:
 * - AI streaming integration via useAI hook
 * - Full-screen layout (h-screen)
 * - Calm blue theme
 * - Error display
 * - Loading states
 *
 * @returns {JSX.Element} Chat window component
 */
export function ChatWindow(): JSX.Element {
  const {
    messages,
    loadingState,
    error,
    isStreaming,
    streamingContent,
    messagesEndRef,
    sendMessage,
  } = useAI();

  const handleExportPDF = (): void => {
    exportChatToPDF(messages, []);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Justice Companion</h1>
            <p className="mt-1 text-sm text-gray-600">
              UK Legal Information Assistant - Information Only, Not Advice
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isStreaming}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Export to PDF"
            >
              <BiDownload className="w-5 h-5" />
              <span className="text-sm font-medium">Export PDF</span>
            </button>
          )}
        </div>
      </header>

      {/* Legal Disclaimer Banner */}
      <div className="border-b border-yellow-400 bg-yellow-50 px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2 text-sm text-yellow-800">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">
            This tool provides general legal information only. It is not a substitute for
            professional legal advice. Always consult a qualified solicitor for advice specific
            to your situation.
          </span>
        </div>
      </div>

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Streaming Indicator */}
      <StreamingIndicator loadingState={loadingState} />

      {/* Message List */}
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        messagesEndRef={messagesEndRef}
      />

      {/* Chat Input */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl">
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
