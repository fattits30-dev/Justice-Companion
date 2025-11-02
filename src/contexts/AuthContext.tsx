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
        // Get sessionId from localStorage
        const sessionId = localStorage.getItem('sessionId');

        if (!sessionId) {
          return; // No session to restore
        }

        const response = await window.justiceAPI.getSession(sessionId);

        if (!response.success) {
          // Session invalid - clear it
          localStorage.removeItem('sessionId');
          return;
        }

        if (response.data) {
          setUser({
            id: String(response.data.id),
            username: response.data.username,
            email: response.data.email
          });
        }
      } catch (err) {
        // Silently fail - no session to restore
        console.error('[AuthContext] Error restoring session:', err);
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
          id: String(response.data.id),
          username: response.data.username,
          email: response.data.email
        });

        if (rememberMe) {
          localStorage.setItem('sessionId', response.data.sessionId);
        }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
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