import { useState, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CasesView } from './components/views/CasesView';
import { DocumentsView } from './components/views/DocumentsView';
import { SettingsView } from './components/views/SettingsView';
import { DebugProvider } from './contexts/DebugContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

type ViewType = 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Dummy conversation load handler (ChatWindow will handle its own state)
  const handleConversationLoad = async (_conversationId: number): Promise<void> => {
    // Switch to chat view when loading a conversation
    setActiveView('chat');
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Toggle sidebar with Ctrl+B
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarExpanded(prev => !prev);
      }
      // Escape to minimize sidebar
      if (e.key === 'Escape' && sidebarExpanded) {
        e.preventDefault();
        setSidebarExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarExpanded]);

  // Render the appropriate view
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onViewChange={setActiveView} />;
      case 'chat':
        return <ChatWindow sidebarExpanded={sidebarExpanded} />;
      case 'cases':
        return <CasesView />;
      case 'documents':
        return <DocumentsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onViewChange={setActiveView} />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ErrorBoundary>
        <DebugProvider>
          <div className="flex h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
            {/* Sidebar */}
            <Sidebar
              isExpanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
              onConversationLoad={handleConversationLoad}
              activeView={activeView}
              onViewChange={(view) => {
                setActiveView(view);
                setSidebarExpanded(false); // Minimize sidebar after navigation
              }}
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarExpanded ? 'ml-80' : 'ml-16'}`}>
              {/* Top bar - no menu button, just title */}
              <div className="h-14 bg-slate-900/50 border-b border-blue-800/30 flex items-center px-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-300 font-medium capitalize">{activeView}</span>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-hidden">
                {renderView()}
              </div>
            </div>
          </div>
          {/* Global Toast Notifications */}
          <Toaster />
        </DebugProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
