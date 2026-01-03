/**
 * LocalAuthContext - PIN-Based Local Authentication
 *
 * Provides authentication for local-first mode using PIN/passphrase.
 * All data is stored locally in IndexedDB with encryption.
 *
 * Features:
 * - PIN setup and verification
 * - App lock/unlock state
 * - Encryption key management
 * - Compatible interface with AuthContext
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { logger } from "../lib/logger";
import { getLocalApiClient, initializeLocalApi } from "../lib/api/local";
import { getSettingsRepository } from "../lib/storage/repositories/SettingsRepository";
import { isEncryptionInitialized } from "../lib/storage/crypto";

/**
 * Local user type
 */
export interface LocalUser {
  id: number;
  username: string;
  email: string | null;
  role: "user";
  isLocal: true;
}

/**
 * Auth state
 */
type AuthState =
  | "initializing" // Checking if PIN is configured
  | "needs_setup" // First time - needs PIN setup
  | "locked" // PIN configured but locked
  | "unlocked"; // PIN verified, app unlocked

/**
 * Context value interface
 */
interface LocalAuthContextValue {
  // User state
  user: LocalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth state
  authState: AuthState;
  isPinConfigured: boolean;

  // Actions
  setupPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  lock: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
  removePin: (currentPin: string) => Promise<void>;

  // Legacy compatibility
  login: (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionId: string | null;
}

interface LocalAuthProviderProps {
  children: ReactNode;
}

// Create context
const LocalAuthContext = createContext<LocalAuthContextValue | undefined>(
  undefined,
);

/**
 * LocalAuthProvider - Wraps app with local authentication state
 */
export function LocalAuthProvider({ children }: LocalAuthProviderProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>("initializing");
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = authState === "unlocked" && user !== null;

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize local API (opens IndexedDB)
        await initializeLocalApi();

        // Check if PIN is configured
        const settingsRepo = getSettingsRepository();
        const pinConfigured = await settingsRepo.isPinConfigured();
        setIsPinConfigured(pinConfigured);

        if (!pinConfigured) {
          // First time user - needs to set up PIN
          setAuthState("needs_setup");
        } else if (isEncryptionInitialized()) {
          // Already unlocked (shouldn't happen on fresh load)
          setUser({
            id: 1,
            username: "local_user",
            email: null,
            role: "user",
            isLocal: true,
          });
          setAuthState("unlocked");
        } else {
          // PIN configured but locked
          setAuthState("locked");
        }
      } catch (err) {
        logger.error("Error initializing local auth:", {
          error: err as Error,
          service: "LocalAuthContext",
        });
        setError(err instanceof Error ? err.message : "Failed to initialize");
        // Default to needs_setup on error
        setAuthState("needs_setup");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  /**
   * Set up initial PIN
   */
  const setupPin = async (pin: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const localApi = getLocalApiClient();
      const response = await localApi.auth.setupPin(pin);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      setUser({
        id: 1,
        username: "local_user",
        email: null,
        role: "user",
        isLocal: true,
      });
      setIsPinConfigured(true);
      setAuthState("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up PIN");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unlock with PIN
   */
  const unlock = async (pin: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const localApi = getLocalApiClient();
      const response = await localApi.auth.unlock(pin);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      setUser(response.data);
      setAuthState("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Lock the app
   */
  const lock = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const localApi = getLocalApiClient();
      await localApi.auth.lock();

      setUser(null);
      setAuthState("locked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lock");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change PIN
   */
  const changePin = async (
    currentPin: string,
    newPin: string,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const localApi = getLocalApiClient();
      const response = await localApi.auth.changePin(currentPin, newPin);

      if (!response.success) {
        throw new Error(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change PIN");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Remove PIN protection
   */
  const removePin = async (currentPin: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const localApi = getLocalApiClient();
      const response = await localApi.auth.removePin(currentPin);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      setIsPinConfigured(false);
      setAuthState("needs_setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove PIN");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Legacy login - maps to unlock or setup
   */
  const login = async (
    _identifier: string,
    password: string,
    _rememberMe: boolean,
  ): Promise<void> => {
    if (!isPinConfigured) {
      await setupPin(password);
    } else {
      await unlock(password);
    }
  };

  /**
   * Legacy logout - maps to lock
   */
  const logout = async (): Promise<void> => {
    await lock();
  };

  /**
   * Refresh user data (no-op in local mode)
   */
  const refreshUser = async (): Promise<void> => {
    // In local mode, user data doesn't change from external sources
    if (isEncryptionInitialized() && !user) {
      setUser({
        id: 1,
        username: "local_user",
        email: null,
        role: "user",
        isLocal: true,
      });
    }
  };

  const value: LocalAuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    authState,
    isPinConfigured,
    setupPin,
    unlock,
    lock,
    changePin,
    removePin,
    login,
    logout,
    refreshUser,
    sessionId: isAuthenticated ? "local_session" : null,
  };

  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
}

/**
 * Custom hook to use local auth context
 */
export function useLocalAuth() {
  const context = useContext(LocalAuthContext);

  if (context === undefined) {
    throw new Error("useLocalAuth must be used within a LocalAuthProvider");
  }

  return context;
}

/**
 * Hook that works with either auth context
 * Use this in components that need to work in both modes
 */
export function useAuth() {
  // In local-first mode, this is the same as useLocalAuth
  return useLocalAuth();
}
