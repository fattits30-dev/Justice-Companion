import { useState, useEffect } from 'react';
import { useAI } from '../hooks/useAI';
import { MessageList } from './MessageList';
import { FloatingChatInput } from './FloatingChatInput';
import { ErrorDisplay } from './ErrorDisplay';
import { ConfirmDialog } from './ConfirmDialog';
import { exportChatToPDF } from '../utils/exportToPDF';
import { BiDownload } from 'react-icons/bi';
import { Trash2 } from 'lucide-react';

interface ChatWindowProps {
  sidebarExpanded?: boolean;
  caseId?: number | null;
}

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
export function ChatWindow({ sidebarExpanded = false, caseId }: ChatWindowProps): JSX.Element {
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);

  const {
    messages,
    loadingState,
    error,
    isStreaming,
    streamingContent,
    thinkingContent, // NEW: AI reasoning content
    currentSources, // NEW: Legal source citations
    progressStages, // NEW: Cumulative progress timeline
    messagesEndRef,
    sendMessage,
    clearMessages,
    loadMessages,
  } = useAI(caseId || undefined);

  // First-time user welcome flow
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      if (!window.justiceAPI || welcomeMessageSent || messages.length > 0) {
        return;
      }

      try {
        // Check if user has any conversations
        const conversationsResult = await window.justiceAPI.getAllConversations();
        const hasConversations = conversationsResult.success && conversationsResult.data && conversationsResult.data.length > 0;

        // Check if user profile is empty
        const profileResult = await window.justiceAPI.getUserProfile();
        const hasProfile = profileResult.success && profileResult.data && profileResult.data.name;

        // First-time user: no conversations and no profile
        if (!hasConversations && !hasProfile) {
          // Auto-inject welcome message
          const welcomeMessage = {
            role: 'assistant' as const,
            content: `Welcome to Justice Companion! 👋

I'm here to help you navigate your legal situation with care and precision.

Before we dive into the specifics of your case, I'd like to get to know you a bit better so I can provide the most relevant assistance.

**Let's start with a few quick questions:**

1. **What's your name?**

2. **What's your email address?** (optional, but helpful for records)

3. **In a nutshell, what brings you here today?** (e.g., "I was unfairly dismissed from my job" or "I'm having issues with my landlord")

Take your time - I'm here to listen and help you work through this step by step. 🤝`,
            timestamp: new Date().toISOString(),
          };

          loadMessages([welcomeMessage]);
          setWelcomeMessageSent(true);
        }
      } catch (error) {
        console.error('Failed to check first-time user:', error);
      }
    };

    checkFirstTimeUser();
  }, [messages.length, welcomeMessageSent, loadMessages]);

  const handleExportPDF = (): void => {
    exportChatToPDF(messages, []);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 relative">
      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Action Buttons - Top Right */}
      {messages.length > 0 && (
        <div className="absolute top-4 right-4 z-30 flex gap-2">
          <button
            onClick={() => setClearChatConfirmOpen(true)}
            disabled={isStreaming}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/90 backdrop-blur-sm text-white rounded-lg hover:bg-slate-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 shadow-lg"
            aria-label="Clear chat"
            title="Clear current chat messages"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Clear</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isStreaming}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
            aria-label="Export to PDF"
          >
            <BiDownload className="w-5 h-5" />
            <span className="text-sm font-medium">Export PDF</span>
          </button>
        </div>
      )}

      {/* Message List - StreamingIndicator now renders inline */}
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        loadingState={loadingState}
        thinkingContent={thinkingContent}
        currentSources={currentSources}
        progressStages={progressStages}
        messagesEndRef={messagesEndRef}
        caseId={caseId}
      />

      {/* Floating Chat Input - centered to chat content */}
      <FloatingChatInput onSend={sendMessage} disabled={isStreaming} isSidebarOpen={sidebarExpanded} />

      {/* Clear Chat Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearChatConfirmOpen}
        title="Clear Chat"
        message="Are you sure you want to clear all messages in the current chat? This will only clear the display, not delete saved conversations."
        confirmText="Clear"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          clearMessages();
          setClearChatConfirmOpen(false);
        }}
        onCancel={() => setClearChatConfirmOpen(false)}
      />
    </div>
  );
}
