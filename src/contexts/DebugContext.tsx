/**
 * DebugContext - Structured logging and debug mode management
 *
 * Provides systematic debugging infrastructure across the entire app.
 * Features:
 * - Toggleable debug mode (dev vs production)
 * - Structured logging with levels (error, warn, info, debug)
 * - Component-specific logging
 * - Persistent logs via ErrorLogger
 * - Performance tracking
 *
 * Usage:
 * const { log, isDebugMode } = useDebug();
 * log('info', 'MyComponent', 'Something happened', { data });
 */

import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { logger } from '../utils/logger';
// errorLogger removed - uses fs which doesn't work in renderer process

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface DebugContextValue {
  isDebugMode: boolean;
  enableDebug: () => void;
  disableDebug: () => void;
  log: (level: LogLevel, component: string, message: string, data?: unknown) => void;
  startTimer: (label: string) => void;
  endTimer: (label: string) => void;
}

const DebugContext = createContext<DebugContextValue | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps): JSX.Element {
  // Enable debug mode by default in development
  const [isDebugMode, setIsDebugMode] = useState<boolean>(process.env.NODE_ENV === 'development');

  // Performance timers
  const timers = new Map<string, number>();

  const enableDebug = useCallback(() => {
    setIsDebugMode(true);
  }, []);

  const disableDebug = useCallback(() => {
    setIsDebugMode(false);
  }, []);

  const log = useCallback(
    (level: LogLevel, component: string, message: string, data?: unknown) => {
      // Always log errors, even if debug mode is off
      if (!isDebugMode && level !== 'error') {
        return;
      }

      const timestamp = new Date().toISOString();
      const logPrefix = `[${level.toUpperCase()}][${component}]`;

      // Safely stringify data - handle circular references and errors
      let dataString = '';
      if (data !== undefined) {
        try {
          dataString = ` ${JSON.stringify(data, null, 2)}`;
        } catch {
          // Fallback for circular references or non-serializable objects
          dataString = ' [Unserializable data]';
        }
      }

      const logMessage = `${logPrefix} ${message}${dataString}`;

      // Console output with appropriate styling
      switch (level) {
        case 'error':
          logger.error('App', '${timestamp} ${logMessage}');
          break;
        case 'warn':
          logger.warn('App', '${timestamp} ${logMessage}');
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(`${timestamp} ${logMessage}`);
          break;
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(`${timestamp} ${logMessage}`);
          break;
      }
    },
    [isDebugMode],
  );

  const startTimer = useCallback(
    (label: string) => {
      if (!isDebugMode) {
        return;
      }
      timers.set(label, performance.now());
      log('debug', 'Performance', `Timer started: ${label}`);
    },
    [isDebugMode, log],
  );

  const endTimer = useCallback(
    (label: string) => {
      if (!isDebugMode) {
        return;
      }
      const startTime = timers.get(label);
      if (startTime === undefined) {
        log('warn', 'Performance', `Timer not found: ${label}`);
        return;
      }

      const elapsed = performance.now() - startTime;
      timers.delete(label);
      log('debug', 'Performance', `Timer ended: ${label}`, {
        duration: `${elapsed.toFixed(2)}ms`,
      });
    },
    [isDebugMode, log],
  );

  const value: DebugContextValue = {
    isDebugMode,
    enableDebug,
    disableDebug,
    log,
    startTimer,
    endTimer,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

/**
 * Hook to access debug context
 * Must be used within DebugProvider
 */
export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

/**
 * Expose debug controls to window for DevTools access
 * Usage in browser console:
 * - window.debug.enable()
 * - window.debug.disable()
 */
if (typeof window !== 'undefined') {
  interface WindowWithDebug extends Window {
    debug?: {
      enable: () => void;
      disable: () => void;
    };
  }

  (window as WindowWithDebug).debug = {
    enable: () => {
      // Enable debug mode
    },
    disable: () => {
      // Disable debug mode
    },
  };
}
