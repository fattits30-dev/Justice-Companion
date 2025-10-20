export declare class ErrorLogger {
    private logFilePath;
    private maxFileSizeKB;
    private maxBackups;
    private writeQueue;
    constructor(logDir?: string, fileName?: string, maxFileSizeKB?: number, // 500KB max per file
    maxBackups?: number);
    /**
     * Log an error with automatic file rotation
     */
    logError(error: Error | string, context?: Record<string, unknown>): void;
    /**
     * Format log entry as readable text
     */
    private formatLogEntry;
    /**
     * Rotate log file if it exceeds max size
     */
    private rotateIfNeeded;
    /**
     * Rotate log files (errors.log -> errors.log.1 -> errors.log.2, etc.)
     */
    private rotateFiles;
    /**
     * Get log file size in KB
     */
    getLogSizeKB(): Promise<number>;
    /**
     * Clear all log files
     */
    clearLogs(): Promise<void>;
    /**
     * Wait for all pending writes to complete
     */
    waitForFlush(): Promise<void>;
    /**
     * Enqueue a write operation to preserve order
     */
    private enqueueWrite;
    /**
     * Read recent errors from log file
     */
    readRecentErrors(lines?: number): Promise<string[]>;
}
export declare const errorLogger: ErrorLogger;
export declare function setupGlobalErrorHandlers(): void;
