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
declare class Logger {
    private isProduction;
    private logBuffer;
    private maxBufferSize;
    constructor();
    /**
     * Format log message with timestamp and component
     */
    private formatMessage;
    /**
     * Add entry to log buffer for analysis
     */
    private bufferLog;
    /**
     * Log error message
     */
    error(component: string, message: string, data?: unknown): void;
    /**
     * Log warning message
     */
    warn(component: string, message: string, data?: unknown): void;
    /**
     * Log info message
     */
    info(component: string, message: string, data?: unknown): void;
    /**
     * Log debug message
     */
    debug(component: string, message: string, data?: unknown): void;
    /**
     * Performance timing utilities
     */
    private timers;
    startTimer(label: string): void;
    endTimer(label: string): void;
    /**
     * Get recent log entries for debugging
     */
    getRecentLogs(count?: number): LogEntry[];
    /**
     * Get logs filtered by component
     */
    getLogsByComponent(component: string): LogEntry[];
    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[];
    /**
     * Clear log buffer
     */
    clearBuffer(): void;
    /**
     * Export logs as JSON for analysis
     */
    exportLogs(): string;
}
export declare const logger: Logger;
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
export {};
