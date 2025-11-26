import { logger } from "../utils/logger.ts";
import { apiClient } from "../lib/apiClient.ts";

/**
 * AuthContext - Authentication State Management
 *
 * Migrated to HTTP REST API - Replaces Electron IPC with FastAPI backend
 *
 * Features:
 * - Global authentication state
 * - Login/logout actions
 * - Session restoration on mount
 * - Loading states
 * - Error handling
 * - Type-safe context hook
 * - Persistent session support
 * - HTTP-based authentication
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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
  login: (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
        const sessionId = localStorage.getItem("sessionId");

        if (!sessionId) {
          setIsLoading(false);
          return; // No session to restore
        }

        const response = await apiClient.auth.getSession(sessionId);

        if (!response.success) {
          // Session invalid - clear it
          localStorage.removeItem("sessionId");
          setIsLoading(false);
          return;
        }

        if (response.data) {
          // Session response has nested user object: { id, user: { id, username, email }, expiresAt }
          const sessionData = response.data;

          // Check for profile overrides in localStorage
          const profileFirstName = localStorage.getItem("userFirstName");
          const profileLastName = localStorage.getItem("userLastName");
          const profileEmail = localStorage.getItem("userEmail");

          // Build username from profile data or use session data
          let username = sessionData.user.username;
          if (profileFirstName || profileLastName) {
            const firstName = profileFirstName || "";
            const lastName = profileLastName || "";
            username =
              `${firstName} ${lastName}`.trim() || sessionData.user.username;
          }

          // Use profile email if available, otherwise session email
          const email = profileEmail || sessionData.user.email;

          setUser({
            id: String(sessionData.user.id),
            username: username,
            email: email,
          });
          setSessionId(sessionId); // Save sessionId to state
        }
      } catch (err) {
        // Silently fail - no session to restore
        logger.error("Error restoring session:", {
          error: err as Error,
          service: "AuthContext",
        });
        // Clear invalid session
        localStorage.removeItem("sessionId");
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Login user with username or email
   */
  const login = async (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.auth.login(
        identifier,
        password,
        rememberMe,
      );

      if (!response.success) {
        throw new Error("Login failed");
      }

      if (response.data) {
        // Check for profile overrides in localStorage
        const profileFirstName = localStorage.getItem("userFirstName");
        const profileLastName = localStorage.getItem("userLastName");
        const profileEmail = localStorage.getItem("userEmail");

        // Build username from profile data or use session data
        let username = response.data.user.username;
        if (profileFirstName || profileLastName) {
          const firstName = profileFirstName || "";
          const lastName = profileLastName || "";
          username =
            `${firstName} ${lastName}`.trim() || response.data.user.username;
        }

        // Use profile email if available, otherwise session email
        const email = profileEmail || response.data.user.email;

        setUser({
          id: String(response.data.user.id),
          username: username,
          email: email,
        });

        // Always save sessionId to localStorage (rememberMe controls session duration on backend)
        const newSessionId = response.data.session.id;
        localStorage.setItem("sessionId", newSessionId);
        setSessionId(newSessionId); // Save sessionId to state
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      throw err; // Re-throw to allow component-level handling
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
      const sessionId = localStorage.getItem("sessionId");

      if (sessionId) {
        await apiClient.auth.logout(sessionId);
        localStorage.removeItem("sessionId");
      }

      setUser(null);
      setSessionId(null); // Clear sessionId from state
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data (useful after profile updates)
   */
  const refreshUser = async (): Promise<void> => {
    const currentSessionId = localStorage.getItem("sessionId");
    if (!currentSessionId) {
      return;
    }

    try {
      const response = await apiClient.auth.getSession(currentSessionId);

      if (response.success && response.data) {
        // Apply the same profile merging logic as in restoreSession and login
        const sessionData = response.data;

        // Check for profile overrides in localStorage
        const profileFirstName = localStorage.getItem("userFirstName");
        const profileLastName = localStorage.getItem("userLastName");
        const profileEmail = localStorage.getItem("userEmail");

        // Build username from profile data or use session data
        let username = sessionData.user.username;
        if (profileFirstName || profileLastName) {
          const firstName = profileFirstName || "";
          const lastName = profileLastName || "";
          username =
            `${firstName} ${lastName}`.trim() || sessionData.user.username;
        }

        // Use profile email if available, otherwise session email
        const email = profileEmail || sessionData.user.email;

        setUser({
          id: String(sessionData.user.id),
          username: username,
          email: email,
        });
        setSessionId(currentSessionId);
      } else {
        // Session is no longer valid; clear auth state
        localStorage.removeItem("sessionId");
        setUser(null);
        setSessionId(null);
      }
    } catch (err) {
      logger.error("Error refreshing user:", {
        error: err as Error,
        service: "AuthContext",
      });
    }
  };

  const value = {
    user,
    sessionId,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
