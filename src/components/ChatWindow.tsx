import { useState } from 'react';
import { useAI } from '../hooks/useAI';
import { MessageList } from './MessageList';
import { FloatingChatInput } from './FloatingChatInput';
import { ErrorDisplay } from './ErrorDisplay';
import { Sidebar } from './Sidebar';
import { ConfirmDialog } from './ConfirmDialog';
import { DashboardView } from './views/DashboardView';
import { CasesView } from './views/CasesView';
import { DocumentsView } from './views/DocumentsView';
import { SettingsView } from './views/SettingsView';
import { exportChatToPDF } from '../utils/exportToPDF';
import { BiDownload } from 'react-icons/bi';
import { Trash2 } from 'lucide-react';

type ViewType = 'dashboard' | 'cases' | 'documents' | 'settings' | 'chat';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('chat');

  const {
    messages,
    loadingState,
    error,
    isStreaming,
    streamingContent,
    thinkingContent, // NEW: AI reasoning content
    currentSources, // NEW: Legal source citations
    messagesEndRef,
    sendMessage,
    loadMessages,
    clearMessages,
  } = useAI();

  const handleExportPDF = (): void => {
    exportChatToPDF(messages, []);
  };

  /**
   * Handle conversation selection from Sidebar
   * Loads the full conversation with messages from database
   */
  const handleConversationLoad = async (conversationId: number): Promise<void> => {
    try {
      const result = await window.justiceAPI.loadConversationWithMessages(conversationId);

      if (!result.success) {
        console.error('Failed to load conversation:', result.error);
        return;
      }

      if (result.data) {
        loadMessages(result.data.messages);
      } else {
        console.error('Conversation data is null');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleViewChange = (view: 'dashboard' | 'cases' | 'documents' | 'settings') => {
    setActiveView(view);
    setIsSidebarOpen(false); // Auto-close sidebar on desktop
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onConversationLoad={handleConversationLoad}
        activeView={activeView === 'chat' ? 'dashboard' : activeView}
        onViewChange={handleViewChange}
      />

      {/* Main Content - shifts when sidebar opens */}
      <div className={`flex flex-col flex-1 h-screen transition-all duration-300 ${
        isSidebarOpen ? 'ml-80' : 'ml-0'
      }`}>
        {/* Conditional Rendering: Chat View vs Other Views */}
        {activeView !== 'chat' ? (
          /* Other Views (Dashboard, Cases, Documents, Settings) */
          <>
            {/* Header for views */}
            <header className="border-b border-blue-800/30 bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-4 shadow-lg backdrop-blur-sm">
              <div className="mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Hamburger Menu */}
                  {!isSidebarOpen && (
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 hover:bg-blue-800/50 rounded-lg transition-colors"
                      aria-label="Open menu"
                    >
                      <svg className="w-6 h-6 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Justice Companion</h1>
                    <p className="mt-1 text-sm text-blue-200">
                      Your UK Legal Information Assistant • Free • Confidential
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('chat')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Back to Chat
                </button>
              </div>
            </header>

            {/* View Content */}
            <div className="flex-1 overflow-hidden">
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'cases' && <CasesView />}
              {activeView === 'documents' && <DocumentsView />}
              {activeView === 'settings' && <SettingsView />}
            </div>
          </>
        ) : (
          /* Chat View (Original) */
          <>
        {/* Header - Professional UK Legal theme */}
        <header className="border-b border-blue-800/30 bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-4 shadow-lg backdrop-blur-sm">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu - hidden when sidebar is open */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-blue-800/50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Justice Companion</h1>
              <p className="mt-1 text-sm text-blue-200">
                Your UK Legal Information Assistant • Free • Confidential
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setClearChatConfirmOpen(true)}
                disabled={isStreaming}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                aria-label="Clear chat"
                title="Clear current chat messages"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Clear</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isStreaming}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Export to PDF"
              >
                <BiDownload className="w-5 h-5" />
                <span className="text-sm font-medium">Export PDF</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Message List - StreamingIndicator now renders inline */}
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        loadingState={loadingState}
        thinkingContent={thinkingContent}
        currentSources={currentSources}
        messagesEndRef={messagesEndRef}
      />

        {/* Floating Chat Input - positioned absolutely */}
        <FloatingChatInput onSend={sendMessage} disabled={isStreaming} isSidebarOpen={isSidebarOpen} />

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
        </>
      )}
      </div>
    </div>
  );
}
