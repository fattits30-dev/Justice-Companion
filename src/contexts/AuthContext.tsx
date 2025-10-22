import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import type { User } from '@/models/User.ts';
import { logger } from '../utils/logger.ts';

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
  sessionId: string | null;
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
   * Load session from localStorage and check auth on mount
   * FIX: Combined effects to prevent race condition (Issue #2)
   */
  useEffect(() => {
    const loadSession = async () => {
      try {
        // FIX: Add IPC validation guard (Issue #5)
        if (typeof window === 'undefined' || !window.justiceAPI) {
          logger.error('AuthContext', 'IPC API not available');
          setIsLoading(false);
          return;
        }

        const storedSessionId = localStorage.getItem('sessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          // Check auth immediately to avoid login screen flash
          const result = await window.justiceAPI.getCurrentUser(storedSessionId);
          if (result.success && result.data) {
            // getCurrentUser returns a full User object
            setUser(result.data);
          } else {
            // Session invalid - clear it
            localStorage.removeItem('sessionId');
            setSessionId(null);
          }
        }
      } catch (error) {
        logger.error('AuthContext', 'Session load failed:', { error });
        localStorage.removeItem('sessionId');
        setSessionId(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, []); // Run once on mount

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

        if (!result.data) {
          logger.error('AuthContext', 'Login response missing data');
          throw new Error('Login failed: no data returned');
        }

        const { user: authenticatedUser, session } = result.data;
        if (!authenticatedUser || !session?.id) {
          logger.error('AuthContext', 'Login response missing user or session data');
          throw new Error('Login failed: invalid response');
        }

        setUser(authenticatedUser);
        setSessionId(session.id);

        // Persist sessionId to localStorage
        localStorage.setItem('sessionId', session.id);

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
        // getCurrentUser returns a full User object
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
      sessionId,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      register,
      refreshUser,
    }),
    [user, sessionId, isLoading, login, logout, register, refreshUser],
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
