"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.ErrorLogger = void 0;
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
/* eslint-disable no-undef */
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const path_1 = __importDefault(require("path"));
class ErrorLogger {
    logFilePath;
    maxFileSizeKB;
    maxBackups;
    writeQueue;
    constructor(logDir = 'logs', fileName = 'errors.log', maxFileSizeKB = 500, // 500KB max per file
    maxBackups = 3) {
        // Ensure logs directory exists
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        this.logFilePath = path_1.default.join(logDir, fileName);
        this.maxFileSizeKB = maxFileSizeKB;
        this.maxBackups = maxBackups;
        this.writeQueue = Promise.resolve();
    }
    /**
     * Log an error with automatic file rotation
     */
    logError(error, context) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: error instanceof Error ? error.name : 'Error',
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            context,
        };
        const logLine = this.formatLogEntry(entry);
        this.enqueueWrite(async () => {
            await this.rotateIfNeeded();
            await fs_2.promises.appendFile(this.logFilePath, `${logLine}\n`, 'utf8');
        });
    }
    /**
     * Format log entry as readable text
     */
    formatLogEntry(entry) {
        const lines = [`[${entry.timestamp}] ${entry.type}: ${entry.message}`];
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
    async rotateIfNeeded() {
        try {
            const stats = await fs_2.promises.stat(this.logFilePath);
            const fileSizeKB = stats.size / 1024;
            if (fileSizeKB >= this.maxFileSizeKB) {
                await this.rotateFiles();
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return;
            }
            throw error;
        }
    }
    /**
     * Rotate log files (errors.log -> errors.log.1 -> errors.log.2, etc.)
     */
    async rotateFiles() {
        // Delete oldest backup if at limit
        const oldestBackup = `${this.logFilePath}.${this.maxBackups}`;
        await fs_2.promises.rm(oldestBackup, { force: true });
        // Rotate existing backups
        for (let i = this.maxBackups - 1; i >= 1; i--) {
            const oldFile = `${this.logFilePath}.${i}`;
            const newFile = `${this.logFilePath}.${i + 1}`;
            try {
                await fs_2.promises.rename(oldFile, newFile);
            }
            catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }
        // Rotate current log to .1
        try {
            await fs_2.promises.rename(this.logFilePath, `${this.logFilePath}.1`);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    /**
     * Get log file size in KB
     */
    async getLogSizeKB() {
        try {
            const stats = await fs_2.promises.stat(this.logFilePath);
            return stats.size / 1024;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return 0;
            }
            throw error;
        }
    }
    /**
     * Clear all log files
     */
    async clearLogs() {
        const deletions = [
            fs_2.promises.rm(this.logFilePath, { force: true }),
            ...Array.from({ length: this.maxBackups }, (_, index) => {
                const backupFile = `${this.logFilePath}.${index + 1}`;
                return fs_2.promises.rm(backupFile, { force: true });
            }),
        ];
        await Promise.allSettled(deletions);
    }
    /**
     * Wait for all pending writes to complete
     */
    async waitForFlush() {
        await this.writeQueue;
    }
    /**
     * Enqueue a write operation to preserve order
     */
    enqueueWrite(task) {
        this.writeQueue = this.writeQueue.then(task).catch((error) => {
            console.error('ErrorLogger write failed', error);
        });
    }
    /**
     * Read recent errors from log file
     */
    async readRecentErrors(lines = 50) {
        try {
            const content = await fs_2.promises.readFile(this.logFilePath, 'utf8');
            const allLines = content.split('\n').filter((line) => line.trim());
            return allLines.slice(-lines);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}
exports.ErrorLogger = ErrorLogger;
// Singleton instance for app-wide use
exports.errorLogger = new ErrorLogger('logs', 'errors.log', 500, 3);
// Global error handlers for uncaught errors
function setupGlobalErrorHandlers() {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        exports.errorLogger.logError(error, { type: 'uncaughtException' });
    });
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
        const error = reason instanceof Error ? reason : new Error(String(reason));
        exports.errorLogger.logError(error, { type: 'unhandledRejection' });
    });
}
