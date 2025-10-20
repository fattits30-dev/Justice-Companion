/**
 * Centralized Logger Utility
 *
 * Provides consistent logging patterns across the entire application.
 * Integrates with ErrorLogger for persistent storage.
 * Can be used standalone or via DebugContext.
 *
 * Features:
 * - Structured logging with timestamps
 * - Component/module tagging
 * - Log level filtering
 * - Performance timing
 * - Error aggregation
 *
 * Usage:
 * import { logger } from '../utils/logger';
 * logger.info('MyComponent', 'Something happened', { data });
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
}

class Logger {
  private isProduction: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000;

  constructor() {
    // Vite provides import.meta.env.PROD in browser/renderer (bundled code)
    // Node.js/tsx uses process.env.NODE_ENV (main process)
    // Use optional chaining and fallback for cross-environment compatibility
    this.isProduction = import.meta.env?.PROD ?? (process.env.NODE_ENV === 'production');

    // Logger initialized - console allowed for initialization diagnostics
    /* eslint-disable no-console */
    console.warn('[LOGGER INIT]', {
      'import.meta.env?.PROD': import.meta.env?.PROD,
      'import.meta.env?.DEV': import.meta.env?.DEV,
      'import.meta.env?.MODE': import.meta.env?.MODE,
      'process.env.NODE_ENV': process.env.NODE_ENV,
      isProduction: this.isProduction,
    });
    /* eslint-enable no-console */
  }

  /**
   * Format log message with timestamp and component
   */
  private formatMessage(
    level: LogLevel,
    component: string,
    message: string,
    data?: unknown,
  ): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}][${level.toUpperCase()}][${component}] ${message}${dataStr}`;
  }

  /**
   * Add entry to log buffer for analysis
   */
  private bufferLog(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Log error message
   */
  error(component: string, message: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('error', component, message, data);
    console.error(formattedMessage);

    // Buffer for analysis
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      component,
      message,
      data,
    };
    this.bufferLog(entry);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, data?: unknown): void {
    const formattedMessage = this.formatMessage('warn', component, message, data);
    console.warn(formattedMessage);

    // Buffer for analysis
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      component,
      message,
      data,
    };
    this.bufferLog(entry);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, data?: unknown): void {
    // Skip in production
    if (this.isProduction) {
      return;
    }

    const formattedMessage = this.formatMessage('info', component, message, data);
    /* eslint-disable-next-line no-console */
    console.info(formattedMessage);

    // Buffer for analysis
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      component,
      message,
      data,
    };
    this.bufferLog(entry);
  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, data?: unknown): void {
    // Skip in production
    if (this.isProduction) {
      return;
    }

    const formattedMessage = this.formatMessage('debug', component, message, data);
    /* eslint-disable-next-line no-console */
    console.debug(formattedMessage);

    // Buffer for analysis
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      component,
      message,
      data,
    };
    this.bufferLog(entry);
  }

  /**
   * Performance timing utilities
   */
  private timers = new Map<string, number>();

  startTimer(label: string): void {
    if (this.isProduction) {
      return;
    }
    this.timers.set(label, performance.now());
    this.debug('Performance', `Timer started: ${label}`);
  }

  endTimer(label: string): void {
    if (this.isProduction) {
      return;
    }

    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      this.warn('Performance', `Timer not found: ${label}`);
      return;
    }

    const elapsed = performance.now() - startTime;
    this.timers.delete(label);
    this.debug('Performance', `Timer ended: ${label}`, {
      duration: `${elapsed.toFixed(2)}ms`,
    });
  }

  /**
   * Get recent log entries for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logBuffer.filter((entry) => entry.component === component);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logBuffer.filter((entry) => entry.level === level);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
    this.debug('Logger', 'Log buffer cleared');
  }

  /**
   * Export logs as JSON for analysis
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Expose logger to window for DevTools access
 * Usage in browser console:
 * - window.logger.getRecentLogs()
 * - window.logger.getLogsByComponent('StreamingIndicator')
 * - window.logger.exportLogs()
 */
declare global {
  interface Window {
    logger: Logger;
  }
}

if (typeof window !== 'undefined') {
  window.logger = logger;
}
