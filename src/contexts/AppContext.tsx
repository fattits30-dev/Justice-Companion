/**
 * AppContext - Global Application State Management
 *
 * Provides centralized state management for the entire application.
 * Uses React Context API with proper TypeScript typing and performance optimization.
 *
 * Features:
 * - Mode-aware (local vs backend)
 * - Centralized error handling
 * - Loading states
 * - Theme management
 * - Settings persistence
 * - Network status detection
 *
 * Usage:
 * <AppProvider>
 *   <App />
 * </AppProvider>
 *
 * const { mode, theme, settings, error, setError } = useAppState();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AppMode = 'local' | 'backend';
export type AppTheme = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: AppTheme;
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  offlineMode: boolean;
  autoSave: boolean;
  language: string;
}

export interface NetworkStatus {
  online: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
}

export interface AppError {
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
}

export interface AppState {
  // Mode
  mode: AppMode;
  isLocalMode: boolean;

  // Theme
  theme: AppTheme;
  effectiveTheme: 'light' | 'dark';

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Network
  network: NetworkStatus;

  // Error handling
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;

  // Loading states
  isInitializing: boolean;
  isOnline: boolean;

  // Feature flags
  features: {
    chat: boolean;
    documents: boolean;
    cases: boolean;
    offline: boolean;
  };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  notifications: true,
  offlineMode: false,
  autoSave: true,
  language: 'en-GB',
};

const DEFAULT_NETWORK: NetworkStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  type: 'unknown',
  effectiveType: 'unknown',
};

// ============================================================================
// CONTEXT
// ============================================================================

const AppContext = createContext<AppState | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
  initialMode?: AppMode;
}

export function AppProvider({ children, initialMode }: AppProviderProps) {
  // Detect mode
  const [mode] = useState<AppMode>(
    initialMode || (import.meta.env.VITE_LOCAL_MODE === 'true' ? 'local' : 'backend')
  );

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') {return DEFAULT_SETTINGS;}

    const stored = localStorage.getItem('app-settings');
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Network state
  const [network, setNetwork] = useState<NetworkStatus>(DEFAULT_NETWORK);

  // Error state
  const [error, setError] = useState<AppError | null>(null);

  // Initialization state
  const [isInitializing, setIsInitializing] = useState(true);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isLocalMode = mode === 'local';
  const isOnline = network.online;

  // Effective theme (resolve 'system' to 'light' or 'dark')
  const effectiveTheme: 'light' | 'dark' = (() => {
    if (settings.theme !== 'system') {return settings.theme;}

    // Detect system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  })();

  // Feature flags based on mode and network
  const features = {
    chat: true,
    documents: true,
    cases: true,
    offline: isLocalMode || settings.offlineMode,
  };

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('app-settings', JSON.stringify(newSettings));
        } catch (e) {
          console.error('Failed to save settings:', e);
        }
      }

      return newSettings;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Perform any initialization tasks
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsInitializing(false);
      } catch (e) {
        console.error('App initialization failed:', e);
        setError({
          message: 'Failed to initialize application',
          timestamp: new Date(),
        });
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  // Monitor network status
  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      setNetwork({
        online: navigator.onLine,
        type: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
      });
    };

    // Initial update
    updateNetworkStatus();

    // Listen for changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);

      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Monitor system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || settings.theme !== 'system') {return;}

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Trigger re-render to update effectiveTheme
      setSettings((prev) => ({ ...prev }));
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings.theme]);

  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') {return;}

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);

    // Also set data attribute for Tailwind
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: AppState = {
    mode,
    isLocalMode,
    theme: settings.theme,
    effectiveTheme,
    settings,
    updateSettings,
    network,
    error,
    setError,
    clearError,
    isInitializing,
    isOnline,
    features,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAppState(): AppState {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppState must be used within AppProvider');
  }

  return context;
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for theme management
 */
export function useTheme() {
  const { theme, effectiveTheme, updateSettings } = useAppState();

  const setTheme = useCallback(
    (newTheme: AppTheme) => {
      updateSettings({ theme: newTheme });
    },
    [updateSettings]
  );

  return { theme, effectiveTheme, setTheme };
}

/**
 * Hook for network status
 */
export function useNetwork() {
  const { network, isOnline } = useAppState();
  return { ...network, isOnline };
}

/**
 * Hook for error handling
 */
export function useErrorHandler() {
  const { error, setError, clearError } = useAppState();
  return { error, setError, clearError };
}

/**
 * Hook for feature flags
 */
export function useFeatures() {
  const { features } = useAppState();
  return features;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AppContext };
