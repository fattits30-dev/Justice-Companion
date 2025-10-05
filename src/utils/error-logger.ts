import fs from 'fs';
import path from 'path';

interface ErrorLogEntry {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export class ErrorLogger {
  private logFilePath: string;
  private maxFileSizeKB: number;
  private maxBackups: number;

  constructor(
    logDir: string = 'logs',
    fileName: string = 'errors.log',
    maxFileSizeKB: number = 500, // 500KB max per file
    maxBackups: number = 3, // Keep 3 backup files
  ) {
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFilePath = path.join(logDir, fileName);
    this.maxFileSizeKB = maxFileSizeKB;
    this.maxBackups = maxBackups;
  }

  /**
   * Log an error with automatic file rotation
   */
  logError(error: Error | string, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };

    const logLine = this.formatLogEntry(entry);

    // Check file size before writing
    this.rotateIfNeeded();

    // Append to log file
    fs.appendFileSync(this.logFilePath, logLine + '\n', 'utf8');
  }

  /**
   * Format log entry as readable text
   */
  private formatLogEntry(entry: ErrorLogEntry): string {
    const lines = [
      `[${entry.timestamp}] ${entry.type}: ${entry.message}`,
    ];

    if (entry.stack) {
      lines.push(`Stack: ${entry.stack}`);
    }

    if (entry.context) {
      lines.push(`Context: ${JSON.stringify(entry.context)}`);
    }

    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.logFilePath)) {
      return;
    }

    const stats = fs.statSync(this.logFilePath);
    const fileSizeKB = stats.size / 1024;

    if (fileSizeKB >= this.maxFileSizeKB) {
      this.rotateFiles();
    }
  }

  /**
   * Rotate log files (errors.log -> errors.log.1 -> errors.log.2, etc.)
   */
  private rotateFiles(): void {
    // Delete oldest backup if at limit
    const oldestBackup = `${this.logFilePath}.${this.maxBackups}`;
    if (fs.existsSync(oldestBackup)) {
      fs.unlinkSync(oldestBackup);
    }

    // Rotate existing backups
    for (let i = this.maxBackups - 1; i >= 1; i--) {
      const oldFile = `${this.logFilePath}.${i}`;
      const newFile = `${this.logFilePath}.${i + 1}`;

      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }

    // Rotate current log to .1
    if (fs.existsSync(this.logFilePath)) {
      fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
    }
  }

  /**
   * Get log file size in KB
   */
  getLogSizeKB(): number {
    if (!fs.existsSync(this.logFilePath)) {
      return 0;
    }
    const stats = fs.statSync(this.logFilePath);
    return stats.size / 1024;
  }

  /**
   * Clear all log files
   */
  clearLogs(): void {
    // Remove main log
    if (fs.existsSync(this.logFilePath)) {
      fs.unlinkSync(this.logFilePath);
    }

    // Remove backups
    for (let i = 1; i <= this.maxBackups; i++) {
      const backupFile = `${this.logFilePath}.${i}`;
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
      }
    }
  }

  /**
   * Read recent errors from log file
   */
  readRecentErrors(lines: number = 50): string[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }

    const content = fs.readFileSync(this.logFilePath, 'utf8');
    const allLines = content.split('\n').filter((line) => line.trim());

    // Return last N lines
    return allLines.slice(-lines);
  }
}

// Singleton instance for app-wide use
export const errorLogger = new ErrorLogger('logs', 'errors.log', 500, 3);

// Global error handlers for uncaught errors
export function setupGlobalErrorHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    errorLogger.logError(error, { type: 'uncaughtException' });
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled Rejection:', reason);
    const error =
      reason instanceof Error ? reason : new Error(String(reason));
    errorLogger.logError(error, { type: 'unhandledRejection' });
  });
}
