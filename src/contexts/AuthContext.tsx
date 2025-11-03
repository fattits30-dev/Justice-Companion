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
 * - Persistent session support
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
  sessionId: string | null;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true to prevent flash
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  /**
   * Restore session on mount
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Get sessionId from localStorage
        const sessionId = localStorage.getItem('sessionId');
        console.log('[AuthContext] Restoring session, sessionId:', sessionId);

        if (!sessionId) {
          console.log('[AuthContext] No sessionId found in localStorage');
          setIsLoading(false);
          return; // No session to restore
        }

        console.log('[AuthContext] Calling getSession with sessionId:', sessionId);
        const response = await window.justiceAPI.getSession(sessionId);
        console.log('[AuthContext] getSession response:', response);

        if (!response.success) {
          // Session invalid - clear it
          console.log('[AuthContext] Session invalid, removing from localStorage');
          localStorage.removeItem('sessionId');
          setIsLoading(false);
          return;
        }

        if (response.data) {
          console.log('[AuthContext] Setting user from session:', response.data);
          // Session response has nested user object: { id, user: { id, username, email }, expiresAt }
          const sessionData = response.data;
          setUser({
            id: String(sessionData.user.id),
            username: sessionData.user.username,
            email: sessionData.user.email
          });
          setSessionId(sessionId); // Save sessionId to state
        }
      } catch (err) {
        // Silently fail - no session to restore
        console.error('[AuthContext] Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Login user
   */
  const login = async (username: string, password: string, rememberMe: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.justiceAPI.login(username, password, rememberMe);

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      if (response.data) {
        setUser({
          id: String(response.data.user.id),
          username: response.data.user.username,
          email: response.data.user.email
        });

        // Always save sessionId to localStorage (rememberMe controls session duration on backend)
        const newSessionId = response.data.session.id;
        localStorage.setItem('sessionId', newSessionId);
        setSessionId(newSessionId); // Save sessionId to state
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = localStorage.getItem('sessionId');
      
      if (sessionId) {
        await window.justiceAPI.logout(sessionId);
        localStorage.removeItem('sessionId');
      }

      setUser(null);
      setSessionId(null); // Clear sessionId from state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    sessionId,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}