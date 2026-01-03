/**
 * useAppContext - Unified Mode-Aware Context Hook
 *
 * Provides auth and API client based on the current mode (local vs backend).
 * This allows views to work seamlessly in both modes without knowing which one is active.
 *
 * Usage:
 * const { auth, api, isLocalMode } = useAppContext();
 *
 * The hook is resolved at compile time, so tree-shaking will remove unused code.
 */

import { useLocalAuth } from "../contexts/LocalAuthContext";
import { useAuth as useBackendAuth } from "../contexts/AuthContext";
import { apiClient as backendApiClient } from "../lib/apiClient";
import { getLocalApiClient, type LocalApiClient } from "../lib/api/local";

// Detect local mode - compile-time constant for tree-shaking
const isLocalMode = import.meta.env.VITE_LOCAL_MODE === "true";

// Type definitions for unified auth interface
export interface AppAuthContext {
  user: {
    id: number;
    username: string;
    email: string | null;
    role: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  logout: () => Promise<void>;
}

// Type for the unified API client
export type AppApiClient = typeof backendApiClient | LocalApiClient;

// Select auth hook based on mode - internal use only
const useSelectedAuth = isLocalMode ? useLocalAuth : useBackendAuth;

/**
 * Get the appropriate API client for the current mode
 */
function getApiClient(): AppApiClient {
  if (isLocalMode) {
    return getLocalApiClient();
  }
  return backendApiClient;
}

/**
 * Normalize auth to common interface
 */
function normalizeAuth(auth: ReturnType<typeof useSelectedAuth>): AppAuthContext {
  return {
    user: auth.user
      ? {
          id: typeof auth.user.id === "number" ? auth.user.id : 1,
          username: auth.user.username || "User",
          email: auth.user.email || null,
          role: "role" in auth.user ? auth.user.role : "user",
        }
      : null,
    isAuthenticated: auth.isAuthenticated ?? false,
    isLoading: auth.isLoading ?? false,
    sessionId: auth.sessionId ?? null,
    logout: auth.logout,
  };
}

/**
 * Unified context hook for mode-aware auth and API
 */
export function useAppContext() {
  const auth = useSelectedAuth();
  const api = getApiClient();

  return {
    auth: normalizeAuth(auth),
    api,
    isLocalMode,
  };
}

/**
 * Hook that just returns the mode-aware auth context
 */
export function useAppAuth(): AppAuthContext {
  const auth = useSelectedAuth();
  return normalizeAuth(auth);
}

/**
 * Hook that just returns the mode-aware API client
 */
export function useAppApi(): AppApiClient {
  return getApiClient();
}

export { isLocalMode };
