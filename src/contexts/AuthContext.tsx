import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/models/User';

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
  login: (username: string, password: string) => Promise<void>;
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
          console.error('[AuthContext] window.justiceAPI is not available!');
          console.error('[AuthContext] window object keys:', typeof window !== 'undefined' ? Object.keys(window) : 'window is undefined');
          setIsLoading(false);
          return;
        }

        console.log('[AuthContext] justiceAPI is available, checking current user...');
        const result = await window.justiceAPI.getCurrentUser();
        if (result.success && result.data) {
          setUser(result.data);
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth(); // Async call in useEffect - errors handled internally
  }, []);

  /**
   * Login user with username and password
   */
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('[AuthContext] Attempting login for user:', username);
      const result = await window.justiceAPI.loginUser(username, password);
      console.log('[AuthContext] Login result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      setUser(result.data.user);
      console.log('[AuthContext] Login successful, user set:', result.data.user.username);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await window.justiceAPI.logoutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear user state anyway on logout failure
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (
    username: string,
    password: string,
    email: string,
  ): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('[AuthContext] Attempting registration for user:', username, 'email:', email);
      const result = await window.justiceAPI.registerUser(username, password, email);
      console.log('[AuthContext] Registration result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      console.log('[AuthContext] Registration successful, auto-logging in...');
      // After registration, automatically log in
      await login(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const result = await window.justiceAPI.getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    register,
    refreshUser,
  };

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
