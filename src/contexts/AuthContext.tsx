/**
 * AuthContext - Authentication State Management
 *
 * Built with TDD - All tests written FIRST
 *
 * Features:
 * - Global authentication state
 * - Login/logout actions
 * - Session restoration on mount
 * - Loading states
 * - Error handling
 * - Type-safe context hook
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider - Wraps app with authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  /**
   * Restore session on mount
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Attempting session restore...');

        // Get sessionId from localStorage
        const sessionId = localStorage.getItem('sessionId');
        console.log('[AuthContext] SessionId from localStorage:', sessionId);

        if (!sessionId) {
          console.log('[AuthContext] No session to restore');
          return; // No session to restore
        }

        console.log('[AuthContext] Calling getSession IPC...');
        const response = await window.justiceAPI.getSession(sessionId);
        console.log('[AuthContext] getSession response:', response);

        if (response.success && response.data) {
          console.log('[AuthContext] Session restored successfully:', response.data);
          setUser({
            id: String(response.data.userId),
            username: response.data.username,
            email: response.data.email
          });
        } else {
          console.warn('[AuthContext] Session invalid - clearing');
          // Session invalid - clear it
          localStorage.removeItem('sessionId');
        }
      } catch (err) {
        // Silently fail - no session to restore
        console.error('[AuthContext] Failed to restore session:', err);
        localStorage.removeItem('sessionId');
      }
    };

    restoreSession();
  }, []);

  /**
   * Login action
   */
  const login = async (username: string, password: string, rememberMe: boolean) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await window.justiceAPI.login(username, password, rememberMe);

      console.log('[AuthContext] Login response:', response);

      if (response.success && response.data) {
        console.log('[AuthContext] Response data:', response.data);
        console.log('[AuthContext] Session object:', response.data.session);

        // Store sessionId in localStorage for session restoration
        // FIXED: Session object has 'id' property, not 'sessionId'
        if (response.data.session?.id) {
          console.log('[AuthContext] Storing sessionId:', response.data.session.id);
          localStorage.setItem('sessionId', response.data.session.id);
        } else {
          console.error('[AuthContext] No sessionId in response!');
        }

        // Set user in state (convert id to string for frontend consistency)
        setUser({
          id: String(response.data.user.id),
          username: response.data.user.username,
          email: response.data.user.email
        });
      } else {
        // Show error message - extract message if error is an object
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'Login failed';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout action
   */
  const logout = async () => {
    setIsLoading(true);

    try {
      // Get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');

      // Call logout API
      await window.justiceAPI.logout(sessionId || '');

      // Clear local state and storage
      localStorage.removeItem('sessionId');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      // Still clear local state even if API call fails
      localStorage.removeItem('sessionId');
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook - Access authentication state
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
