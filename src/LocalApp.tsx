/**
 * LocalApp - Local-First Application Entry Point
 *
 * This is the main entry point for local-first mode where:
 * - All data is stored locally in IndexedDB
 * - PIN-based encryption protects user data
 * - AI calls go directly to OpenAI/Anthropic APIs
 * - No backend server required
 *
 * Routes:
 * - /pin - PIN setup or unlock screen
 * - /dashboard - Main dashboard (requires unlock)
 * - /cases - Cases list (requires unlock)
 * - /chat - AI chat (requires unlock)
 * - /settings - Settings including AI config (requires unlock)
 */

import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PinScreen } from "./components/auth/PinScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { /* MainLayout */ } from "./components/layouts/MainLayout";
import { ChatLayout } from "./components/layouts/ChatLayout";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { ToastProvider } from "./components/ui/index";
import { SkeletonCard } from "./components/ui/Skeleton";
import {
  LocalAuthProvider,
  useLocalAuth,
} from "./contexts/LocalAuthContext";
import { queryClient } from "./lib/queryClient";
import { routerFutureFlags } from "./router/futureFlags";

// Lazy load views for code splitting
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const CasesView = lazy(() =>
  import("./views/CasesView").then((m) => ({ default: m.CasesView }))
);
const DocumentsView = lazy(() =>
  import("./views/DocumentsView").then((m) => ({
    default: m.DocumentsView,
  }))
);
const ChatView = lazy(() =>
  import("./views/ChatView").then((m) => ({ default: m.ChatView }))
);
const LocalSettingsView = lazy(() =>
  import("./views/LocalSettingsView").then((m) => ({
    default: m.LocalSettingsView,
  }))
);
const TimelineView = lazy(() =>
  import("./views/timeline/TimelineView").then((m) => ({
    default: m.TimelineView,
  }))
);
const CaseFileTreeView = lazy(() =>
  import("./views/cases/CaseFileTreeView").then((m) => ({
    default: m.CaseFileTreeView,
  }))
);
const CaseFileView = lazy(() =>
  import("./views/cases/CaseFileView").then((m) => ({
    default: m.CaseFileView,
  }))
);

/**
 * PageLoader - Loading fallback for lazy-loaded pages
 */
function PageLoader() {
  return (
    <div className="min-h-screen bg-primary-900 p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}

/**
 * ProtectedRoute - Redirects to PIN screen if not unlocked
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, authState } = useLocalAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // Redirect to appropriate screen based on state
    if (authState === "needs_setup") {
      return <Navigate to="/pin?mode=setup" replace />;
    }
    return <Navigate to="/pin" replace />;
  }

  return <>{children}</>;
}

/**
 * PinRoute - Shows PIN screen for setup or unlock
 */
function PinRoute() {
  const { authState, isLoading, error, setupPin, unlock } = useLocalAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <PageLoader />;
  }

  // If already unlocked, redirect to chat
  if (authState === "unlocked") {
    return <Navigate to="/chat" replace />;
  }

  const mode = authState === "needs_setup" ? "setup" : "unlock";

  return (
    <PinScreen
      mode={mode}
      onSuccess={() => navigate("/chat")}
      onSetupPin={setupPin}
      onUnlock={unlock}
      error={error}
      isLoading={isLoading}
    />
  );
}

/**
 * LocalDashboardWrapper - Dashboard for local mode
 */
function LocalDashboardWrapper() {
  const { user } = useLocalAuth();
  const navigate = useNavigate();

  // In local mode, we fetch stats from IndexedDB
  // For now, show empty stats until we wire up local API
  return (
    <Dashboard
      username={user?.username || "User"}
      stats={{
        totalCases: 0,
        activeCases: 0,
        totalEvidence: 0,
        recentActivity: 0,
      }}
      recentCases={[]}
      isLoading={false}
      onNewCase={() => navigate("/cases")}
      onUploadEvidence={() => navigate("/documents")}
      onStartChat={() => navigate("/chat")}
      onCaseClick={(caseId) => navigate(`/cases/${caseId}`)}
    />
  );
}

/**
 * LocalAppRoutes - All application routes for local mode
 */
function LocalAppRoutes() {
  const { user, authState } = useLocalAuth();

  return (
    <Routes>
      {/* PIN screen (setup or unlock) */}
      <Route path="/pin" element={<PinRoute />} />

      {/* All main routes use ChatLayout for consistent navigation */}
      <Route
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/chat"
          element={
            <Suspense fallback={<PageLoader />}>
              <ChatView />
            </Suspense>
          }
        />
        <Route
          path="/cases"
          element={
            <Suspense fallback={<PageLoader />}>
              <CasesView />
            </Suspense>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <Suspense fallback={<PageLoader />}>
              <CaseFileTreeView />
            </Suspense>
          }
        />
        <Route
          path="/cases/:caseId/file"
          element={
            <Suspense fallback={<PageLoader />}>
              <CaseFileView />
            </Suspense>
          }
        />
        <Route
          path="/documents"
          element={
            <Suspense fallback={<PageLoader />}>
              <DocumentsView />
            </Suspense>
          }
        />
        <Route
          path="/timeline"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimelineView />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <LocalSettingsView />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <LocalDashboardWrapper />
            </Suspense>
          }
        />
      </Route>

      {/* Root route - redirect based on auth state */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              authState === "unlocked"
                ? "/chat"  // Chat-first experience
                : authState === "needs_setup"
                  ? "/pin?mode=setup"
                  : "/pin"
            }
            replace
          />
        }
      />

      {/* Catch-all route */}
      <Route
        path="*"
        element={
          <Navigate
            to={authState === "unlocked" ? "/chat" : "/pin"}
            replace
          />
        }
      />
    </Routes>
  );
}

/**
 * LocalApp - Root component for local-first mode
 */
function LocalApp() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={routerFutureFlags}>
          <LocalAuthProvider>
            <ToastProvider />
            <InstallPrompt />
            <LocalAppRoutes />
          </LocalAuthProvider>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default LocalApp;
