import { useState, useEffect } from 'react';
import { ChatWindow } from '@/features/chat';
import { CasesView, CaseDetailView } from '@/features/cases';
import { DocumentsView } from '@/features/documents';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from '@/features/dashboard';
import { SettingsView } from '@/features/settings';
import { DebugProvider } from './contexts/DebugContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthFlow } from './components/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';

/**
 * Main application component (requires authentication)
 */
function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
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

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth flow if not authenticated
  if (!isAuthenticated) {
    return <AuthFlow />;
  }

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

  // Authenticated - show main app
  return (
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
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarExpanded ? 'ml-80' : 'ml-16'}`}
      >
        {/* Top bar - no menu button, just title */}
        <div className="h-14 bg-slate-900/50 border-b border-blue-800/30 flex items-center px-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-300 font-medium capitalize">{activeView}</span>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">{renderView()}</div>
      </div>
    </div>
  );
}

/**
 * Root App component with providers
 */
function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <DebugProvider>
            <AuthenticatedApp />
            {/* Global Toast Notifications */}
            <Toaster />
          </DebugProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
