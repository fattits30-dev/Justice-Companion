import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthFlow } from './components/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DebugProvider } from './contexts/DebugContext';
import { migrateToSecureStorage } from './utils/migrate-to-secure-storage';

// Lazy-loaded view components for code splitting
const ChatWindow = lazy(() => import('@/features/chat').then((m) => ({ default: m.ChatWindow })));
const CasesView = lazy(() => import('@/features/cases').then((m) => ({ default: m.CasesView })));
const CaseDetailView = lazy(() =>
  import('@/features/cases').then((m) => ({ default: m.CaseDetailView })),
);
const DocumentsView = lazy(() =>
  import('@/features/documents').then((m) => ({ default: m.DocumentsView })),
);
const DashboardView = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardView })),
);
const SettingsView = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsView })),
);

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

  // Run API key migration once after authentication
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Run migration in the background, don't block the UI
      migrateToSecureStorage()
        .then((summary) => {
          if (summary.failedKeys > 0) {
            console.error(`[App] Failed to migrate ${summary.failedKeys} API key(s)`);
          }
        })
        .catch((error) => {
          console.error('[App] API key migration failed:', error);
        });
    }
  }, [isAuthenticated, isLoading]);

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

      {/* Main Content Area - Positioned to account for fixed sidebar */}
      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarExpanded ? '256px' : '48px',
        }}
        role="main"
      >
        {/* Top bar - no menu button, just title */}
        <header className="flex h-14 items-center gap-3 border-b border-blue-800/30 bg-slate-900/50 px-4">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize text-blue-300">{activeView}</span>
          </div>
        </header>

        {/* View Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
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
