/**
 * App - Main application component with routing
 *
 * Routes:
 * - /login - Login screen
 * - /register - Registration screen
 * - / - Redirects to /dashboard if authenticated, /login if not
 * - /dashboard - Main dashboard (requires auth)
 * - /cases - Cases list (requires auth)
 * - /documents - Documents list (requires auth)
 * - /chat - AI chat (requires auth)
 * - /settings - Settings (requires auth)
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
import { LoginScreen } from "./components/auth/LoginScreen.tsx";
import { RegistrationScreen } from "./components/auth/RegistrationScreen.tsx";
import { ForgotPasswordScreen } from "./components/auth/ForgotPasswordScreen.tsx";
import { ResetPasswordScreen } from "./components/auth/ResetPasswordScreen.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { MainLayout } from "./components/layouts/MainLayout.tsx";
import { InstallPrompt } from "./components/pwa/InstallPrompt.tsx";
import { ToastProvider } from "./components/ui/index.ts";
import { SkeletonCard } from "./components/ui/Skeleton.tsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { queryClient } from "./lib/queryClient.ts";
import { useDashboardStats } from "./hooks/useDashboardStats.ts";
import { routerFutureFlags } from "./router/futureFlags.ts";


// Lazy load views for code splitting
const Dashboard = lazy(() =>
  import("./components/Dashboard.tsx").then((m) => ({ default: m.Dashboard })),
);
const CasesView = lazy(() =>
  import("./views/CasesView.tsx").then((m) => ({ default: m.CasesView })),
);
const DocumentsView = lazy(() =>
  import("./views/DocumentsView.tsx").then((m) => ({
    default: m.DocumentsView,
  })),
);
const ChatView = lazy(() =>
  import("./views/ChatView.tsx").then((m) => ({ default: m.ChatView })),
);
const SettingsView = lazy(() =>
  import("./views/SettingsView.tsx").then((m) => ({ default: m.SettingsView })),
);
const TimelineView = lazy(() =>
  import("./views/timeline/TimelineView.tsx").then((m) => ({
    default: m.TimelineView,
  })),
);
const CaseFileTreeView = lazy(() =>
  import("./views/cases/CaseFileTreeView.tsx").then((m) => ({
    default: m.CaseFileTreeView,
  })),
);
const CaseFileView = lazy(() =>
  import("./views/cases/CaseFileView.tsx").then((m) => ({
    default: m.CaseFileView,
  })),
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
 * ProtectedRoute - Redirects to login if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * AuthRoute - Redirects to dashboard if already authenticated
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * DashboardWrapper - Fetches real dashboard stats and wires up navigation
 */
function DashboardWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-900 p-8">
        <div className="text-center">
          <div className="p-4 text-red-300 bg-red-900/50 rounded-md border border-red-700">
            {error instanceof Error ? error.message : 'Failed to load dashboard'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      username={user?.username || "User"}
      stats={{
        totalCases: stats?.totalCases || 0,
        activeCases: stats?.activeCases || 0,
        totalEvidence: stats?.totalEvidence || 0,
        recentActivity: (stats?.overdueDeadlines || 0) + (stats?.unreadNotifications || 0),
      }}
      recentCases={[]} // Will be fetched separately if needed
      isLoading={isLoading}
      onNewCase={() => navigate("/cases")}
      onUploadEvidence={() => navigate("/documents")}
      onStartChat={() => navigate("/chat")}
      onCaseClick={(caseId) => navigate(`/cases/${caseId}`)}
    />
  );
}

/**
 * AppRoutes - All application routes
 */
function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Public routes (redirect to dashboard if authenticated) */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginScreen
              onSuccess={() => {
                // Navigation handled by AuthRoute
              }}
              onRegisterClick={() => {
                navigate("/register");
              }}
              onForgotPasswordClick={() => {
                navigate("/forgot-password");
              }}
            />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <RegistrationScreen
              onSuccess={() => {
                navigate("/login");
              }}
              onLoginClick={() => {
                navigate("/login");
              }}
            />
          </AuthRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthRoute>
            <ForgotPasswordScreen
              onBackToLogin={() => {
                navigate("/login");
              }}
              onResetTokenReceived={(token) => {
                // In dev mode, navigate to reset page with token
                navigate(`/reset-password?token=${token}`);
              }}
            />
          </AuthRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthRoute>
            <ResetPasswordScreen
              onSuccess={() => {
                navigate("/login");
              }}
              onBackToLogin={() => {
                navigate("/login");
              }}
            />
          </AuthRoute>
        }
      />

      {/* Protected routes (require authentication) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardWrapper />
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
          path="/chat"
          element={
            <Suspense fallback={<PageLoader />}>
              <ChatView />
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
              <SettingsView />
            </Suspense>
          }
        />
      </Route>

      {/* Root route - redirect based on auth state */}
      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />

      {/* Catch-all route - redirect to dashboard or login */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

/**
 * App - Root component
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={routerFutureFlags}>
          <AuthProvider>
            <ToastProvider />
            <InstallPrompt />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
        {/* React Query Devtools (only in development) */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
