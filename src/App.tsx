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

import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { LoginScreen } from "./components/auth/LoginScreen.tsx";
import { RegistrationScreen } from "./components/auth/RegistrationScreen.tsx";
import { MainLayout } from "./components/layouts/MainLayout.tsx";
import { ToastProvider } from "./components/ui/index.ts";
import { SkeletonCard } from "./components/ui/Skeleton.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

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
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  recentActivity: number;
  recentCases?: Array<{
    id: string;
    title: string;
    status: "active" | "closed" | "pending";
    lastUpdated: string;
  }>;
}

function DashboardWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get sessionId from localStorage
        const sessionId = localStorage.getItem("sessionId");

        if (!sessionId) {
          // No session - ProtectedRoute will handle redirect to login
          console.log("[DashboardWrapper] No sessionId found - user not authenticated");
          setError("No active session");
          return;
        }

        // Fetch dashboard stats from backend
        const response = await window.justiceAPI.getDashboardStats(sessionId);

        if (!response.success) {
          setError(response.error?.message || "Failed to load dashboard stats");
          return;
        }

        if (response.data) {
          setDashboardStats(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-900 p-8">
        <div className="text-center">
          <div className="p-4 text-red-300 bg-red-900/50 rounded-md border border-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      username={user?.username || "User"}
      stats={
        dashboardStats || {
          totalCases: 0,
          activeCases: 0,
          totalEvidence: 0,
          recentActivity: 0,
        }
      }
      recentCases={dashboardStats?.recentCases || []}
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
                window.location.href = "/register";
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
                window.location.href = "/login";
              }}
              onLoginClick={() => {
                window.location.href = "/login";
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
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
