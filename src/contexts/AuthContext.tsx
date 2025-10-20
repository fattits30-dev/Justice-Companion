import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import type { User } from '@/models/User';
import { logger } from '../utils/logger';

/**
 * Authentication Context for managing user authentication state globally.
 *
 * Provides:
 * - Current user state
 * - Login/logout/register functions
 * - Loading states
 * - Error handling
 *
 * Usage:
 * ```tsx
 * const { user, login, logout, isLoading } = useAuth();
 * ```
 */

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load session from localStorage on mount
   */
  useEffect(() => {
    try {
      const storedSessionId = localStorage.getItem('sessionId');
      if (storedSessionId) {
        setSessionId(storedSessionId);
      }
    } catch (error) {
      logger.error('AuthContext', 'Failed to load sessionId from localStorage:', { error });
    }
  }, []);

  /**
   * Check if user is already logged in on app start
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait for justiceAPI to be available
        if (typeof window === 'undefined' || !window.justiceAPI) {
          setIsLoading(false);
          return;
        }

        // No sessionId = not logged in
        if (!sessionId) {
          setIsLoading(false);
          return;
        }

        const result = await window.justiceAPI.getCurrentUser(sessionId);
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          // Session invalid - clear it
          setSessionId(null);
          localStorage.removeItem('sessionId');
          setUser(null);
        }
      } catch (error) {
        logger.error('AuthContext', 'Failed to check auth status:', { error: error });
        // Clear invalid session
        setSessionId(null);
        localStorage.removeItem('sessionId');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth(); // Async call in useEffect - errors handled internally
  }, [sessionId]);

  /**
   * Login user with username and password
   * @param rememberMe - If true, session will last 30 days instead of 24 hours
   */
  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean = false): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await window.justiceAPI.loginUser(username, password, rememberMe);

        if (!result.success) {
          logger.error('AuthContext', 'Login failed with error:', { error: result.error });
          throw new Error(result.error || 'Login failed');
        }

        // Store BOTH user and sessionId
        setUser(result.data.user);
        setSessionId(result.data.sessionId);

        // Persist sessionId to localStorage
        localStorage.setItem('sessionId', result.data.sessionId);

        // Force a small delay to ensure state update propagates
        await new Promise((resolve) => setTimeout(resolve, 0));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Logout current user
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (sessionId) {
        await window.justiceAPI.logoutUser(sessionId);
      }
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('sessionId');
    } catch (error) {
      logger.error('App', 'Logout failed:', { error: error });
      // Clear user state anyway on logout failure
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('sessionId');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Register new user
   */
  const register = useCallback(
    async (username: string, password: string, email: string): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await window.justiceAPI.registerUser(username, password, email);

        if (!result.success) {
          throw new Error(result.error || 'Registration failed');
        }

        // After registration, automatically log in
        await login(username, password);
      } finally {
        setIsLoading(false);
      }
    },
    [login],
  );

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      if (!sessionId) {
        setUser(null);
        return;
      }

      const result = await window.justiceAPI.getCurrentUser(sessionId);
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        // Session invalid - clear everything
        setUser(null);
        setSessionId(null);
        localStorage.removeItem('sessionId');
      }
    } catch (error) {
      logger.error('App', 'Failed to refresh user:', { error: error });
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  // Memoize context value to ensure new reference on state changes
  // This is critical for triggering re-renders in consuming components
  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      register,
      refreshUser,
    }),
    [user, isLoading, login, logout, register, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 *
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
