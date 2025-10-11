import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { DebugProvider } from './contexts/DebugContext';

// Lazy-loaded view components for code splitting
const ChatWindow = lazy(() => import('@/features/chat').then((m) => ({ default: m.ChatWindow })));
const CasesView = lazy(() => import('@/features/cases').then((m) => ({ default: m.CasesView })));
const CaseDetailView = lazy(() =>
  import('@/features/cases').then((m) => ({ default: m.CaseDetailView }))
);
const DocumentsView = lazy(() =>
  import('@/features/documents').then((m) => ({ default: m.DocumentsView }))
);
const DashboardView = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardView }))
);
const SettingsView = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsView }))
);
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthFlow } from './components/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';

/**
 * Loading fallback for lazy-loaded views
 */
function ViewLoadingFallback(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-sm text-blue-300">Loading view...</p>
      </div>
    </div>
  );
}

/**
 * Main application component (requires authentication)
 */
function AuthenticatedApp(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<number | null>(null);

  // Dummy conversation load handler (ChatWindow will handle its own state)
  const handleConversationLoad = (_conversationId: number): Promise<void> => {
    // Switch to chat view when loading a conversation
    setActiveView('chat');
    return Promise.resolve();
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Toggle sidebar with Ctrl+B
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarExpanded((prev) => !prev);
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
  const renderView = (): JSX.Element => {
    switch (activeView) {
      case 'dashboard':
        return (
          <ViewErrorBoundary
            viewName="Dashboard"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
            <DashboardView onViewChange={setActiveView} />
          </ViewErrorBoundary>
        );
      case 'chat':
        return (
          <ViewErrorBoundary
            viewName="Chat"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
            <ChatWindow sidebarExpanded={sidebarExpanded} caseId={activeCaseId} />
          </ViewErrorBoundary>
        );
      case 'cases':
        return (
          <ViewErrorBoundary
            viewName="Cases"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
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
          <ViewErrorBoundary
            viewName="Case Detail"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
            <CaseDetailView
              caseId={selectedCaseForDetail}
              onBack={() => {
                setActiveView('cases');
                setSelectedCaseForDetail(null);
              }}
            />
          </ViewErrorBoundary>
        ) : (
          <ViewErrorBoundary
            viewName="Cases"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
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
          <ViewErrorBoundary
            viewName="Documents"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
            <DocumentsView />
          </ViewErrorBoundary>
        );
      case 'settings':
        return (
          <ViewErrorBoundary
            viewName="Settings"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
            <SettingsView />
          </ViewErrorBoundary>
        );
      default:
        return (
          <ViewErrorBoundary
            viewName="Dashboard"
            onNavigateToDashboard={() => setActiveView('dashboard')}
          >
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
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<ViewLoadingFallback />}>{renderView()}</Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * Root App component with providers
 */
function App(): JSX.Element {
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
