import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";

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
  private writeQueue: Promise<void>;

  constructor(
    logDir: string = "logs",
    fileName: string = "errors.log",
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
    this.writeQueue = Promise.resolve();
  }

  /**
   * Log an error with automatic file rotation
   */
  logError(error: Error | string, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };

    const logLine = this.formatLogEntry(entry);
    this.enqueueWrite(async () => {
      // Ensure directory exists before writing (for parallel test execution)
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      await this.rotateIfNeeded();
      await fsPromises.appendFile(this.logFilePath, `${logLine}\n`, "utf8");
    });
  }

  /**
   * Format log entry as readable text
   */
  private formatLogEntry(entry: ErrorLogEntry): string {
    const lines = [`[${entry.timestamp}] ${entry.type}: ${entry.message}`];

    if (entry.stack) {
      lines.push(`Stack: ${entry.stack}`);
    }

    if (entry.context) {
      lines.push(`Context: ${JSON.stringify(entry.context)}`);
    }

    lines.push("---");
    return lines.join("\n");
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fsPromises.stat(this.logFilePath);
      const fileSizeKB = stats.size / 1024;

      if (fileSizeKB >= this.maxFileSizeKB) {
        await this.rotateFiles();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  /**
   * Rotate log files (errors.log -> errors.log.1 -> errors.log.2, etc.)
   */
  private async rotateFiles(): Promise<void> {
    // Delete oldest backup if at limit
    const oldestBackup = `${this.logFilePath}.${this.maxBackups}`;
    await fsPromises.rm(oldestBackup, { force: true });

    // Rotate existing backups
    for (let i = this.maxBackups - 1; i >= 1; i--) {
      const oldFile = `${this.logFilePath}.${i}`;
      const newFile = `${this.logFilePath}.${i + 1}`;

      try {
        await fsPromises.rename(oldFile, newFile);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }

    // Rotate current log to .1
    try {
      await fsPromises.rename(this.logFilePath, `${this.logFilePath}.1`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * Get log file size in KB
   */
  async getLogSizeKB(): Promise<number> {
    try {
      const stats = await fsPromises.stat(this.logFilePath);
      return stats.size / 1024;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Clear all log files
   */
  async clearLogs(): Promise<void> {
    const deletions = [
      fsPromises.rm(this.logFilePath, { force: true }),
      ...Array.from({ length: this.maxBackups }, (_, index) => {
        const backupFile = `${this.logFilePath}.${index + 1}`;
        return fsPromises.rm(backupFile, { force: true });
      }),
    ];

    await Promise.allSettled(deletions);
  }

  /**
   * Wait for all pending writes to complete
   */
  async waitForFlush(): Promise<void> {
    await this.writeQueue;
  }

  /**
   * Enqueue a write operation to preserve order
   */
  private enqueueWrite(task: () => Promise<void>): void {
    this.writeQueue = this.writeQueue.then(task).catch((error) => {
      console.error("ErrorLogger write failed", error);
    });
  }

  /**
   * Read recent errors from log file
   */
  async readRecentErrors(lines: number = 50): Promise<string[]> {
    try {
      const content = await fsPromises.readFile(this.logFilePath, "utf8");
      const allLines = content.split("\n").filter((line) => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

// Singleton instance for app-wide use
export const errorLogger = new ErrorLogger("logs", "errors.log", 500, 3);

// Global error handlers for uncaught errors
export function setupGlobalErrorHandlers(): void {
  // Uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    errorLogger.logError(error, { type: "uncaughtException" });
  });

  // Unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown) => {
    console.error("Unhandled Rejection:", reason);
    const error = reason instanceof Error ? reason : new Error(String(reason));
    errorLogger.logError(error, { type: "unhandledRejection" });
  });
}
