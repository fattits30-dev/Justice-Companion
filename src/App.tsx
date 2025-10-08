import { useState, useEffect } from 'react';
import { ChatWindow } from '@/features/chat';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CasesView } from './components/views/CasesView';
import { CaseDetailView } from './components/views/CaseDetailView';
import { DocumentsView } from './components/views/DocumentsView';
import { SettingsView } from './components/views/SettingsView';
import { DebugProvider } from './contexts/DebugContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<number | null>(null);

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

  // Render the appropriate view wrapped in ViewErrorBoundary
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <ViewErrorBoundary viewName="Dashboard" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <DashboardView onViewChange={setActiveView} />
          </ViewErrorBoundary>
        );
      case 'chat':
        return (
          <ViewErrorBoundary viewName="Chat" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <ChatWindow sidebarExpanded={sidebarExpanded} caseId={activeCaseId} />
          </ViewErrorBoundary>
        );
      case 'cases':
        return (
          <ViewErrorBoundary viewName="Cases" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <CasesView
              onCaseSelect={(caseId) => {
                setSelectedCaseForDetail(caseId);
                setActiveView('case-detail');
              }}
            />
          </ViewErrorBoundary>
        );
      case 'case-detail':
        return selectedCaseForDetail ? (
          <ViewErrorBoundary viewName="Case Detail" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <CaseDetailView
              caseId={selectedCaseForDetail}
              onBack={() => {
                setActiveView('cases');
                setSelectedCaseForDetail(null);
              }}
            />
          </ViewErrorBoundary>
        ) : (
          <ViewErrorBoundary viewName="Cases" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <CasesView
              onCaseSelect={(caseId) => {
                setSelectedCaseForDetail(caseId);
                setActiveView('case-detail');
              }}
            />
          </ViewErrorBoundary>
        );
      case 'documents':
        return (
          <ViewErrorBoundary viewName="Documents" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <DocumentsView />
          </ViewErrorBoundary>
        );
      case 'settings':
        return (
          <ViewErrorBoundary viewName="Settings" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <SettingsView />
          </ViewErrorBoundary>
        );
      default:
        return (
          <ViewErrorBoundary viewName="Dashboard" onNavigateToDashboard={() => setActiveView('dashboard')}>
            <DashboardView onViewChange={setActiveView} />
          </ViewErrorBoundary>
        );
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
              activeCaseId={activeCaseId}
              onActiveCaseIdChange={setActiveCaseId}
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
