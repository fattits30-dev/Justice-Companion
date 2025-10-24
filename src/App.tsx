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

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegistrationScreen } from './components/auth/RegistrationScreen';
import { MainLayout } from './components/layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
import { CasesView } from './views/CasesView';
import { DocumentsView } from './views/DocumentsView';
import { ChatView } from './views/ChatView';
import { SettingsView } from './views/SettingsView';

/**
 * ProtectedRoute - Redirects to login if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
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
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get sessionId from localStorage
        const sessionId = localStorage.getItem('sessionId');
        console.log('[DashboardWrapper] sessionId from localStorage:', sessionId);

        if (!sessionId) {
          console.error('[DashboardWrapper] No sessionId found in localStorage!');
          setError('No active session');
          return;
        }

        // Fetch dashboard stats from backend
        console.log('[DashboardWrapper] Fetching stats for sessionId:', sessionId);
        const response = await window.justiceAPI.getDashboardStats(sessionId);
        console.log('[DashboardWrapper] Stats response:', response);

        if (response.success && response.data) {
          setDashboardStats(response.data);
        } else {
          const errorMsg = typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to load dashboard stats';
          setError(errorMsg);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
      username={user?.username || 'User'}
      stats={dashboardStats || {
        totalCases: 0,
        activeCases: 0,
        totalEvidence: 0,
        recentActivity: 0
      }}
      recentCases={dashboardStats?.recentCases || []}
      onNewCase={() => navigate('/cases')}
      onUploadEvidence={() => navigate('/documents')}
      onStartChat={() => navigate('/chat')}
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
                window.location.href = '/register';
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
                window.location.href = '/login';
              }}
              onLoginClick={() => {
                window.location.href = '/login';
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
        <Route path="/dashboard" element={<DashboardWrapper />} />
        <Route path="/cases" element={<CasesView />} />
        <Route path="/documents" element={<DocumentsView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Route>

      {/* Root route - redirect based on auth state */}
      <Route
        path="/"
        element={
          <Navigate
            to={user ? '/dashboard' : '/login'}
            replace
          />
        }
      />

      {/* Catch-all route - redirect to dashboard or login */}
      <Route
        path="*"
        element={
          <Navigate
            to={user ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}

/**
 * App - Root component
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
