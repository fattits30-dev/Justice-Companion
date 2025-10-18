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
  const [isLoading, setIsLoading] = useState(true);

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

        const result = await window.justiceAPI.getCurrentUser();
        if (result.success && result.data) {
          setUser(result.data);
        }
      } catch (error) {
        logger.error('AuthContext', 'Failed to check auth status:', { error: error });
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth(); // Async call in useEffect - errors handled internally
  }, []);

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

        setUser(result.data.user);

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
      await window.justiceAPI.logoutUser();
      setUser(null);
    } catch (error) {
      logger.error('App', 'Logout failed:', { error: error });
      // Clear user state anyway on logout failure
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const result = await window.justiceAPI.getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      logger.error('App', 'Failed to refresh user:', { error: error });
      setUser(null);
    }
  }, []);

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
