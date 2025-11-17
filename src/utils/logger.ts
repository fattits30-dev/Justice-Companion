/**
 * Structured Logging System for Justice Companion
 *
 * SECURITY: Prevents sensitive data leakage in production logs
 * PERFORMANCE: Efficient logging with proper formatting
 * COMPLIANCE: GDPR-compliant, no PII in logs
 *
 * RENDERER-SAFE: Uses console in browser, winston in main process
 */

// Log levels
export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

// Log context for structured logging
export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
  legacy?: boolean;
  args?: unknown[];
  security?: boolean;
  audit?: boolean;
  performance?: boolean;
}

// Sanitize sensitive data from logs
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Remove potential PII patterns
    return value
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED:CARD]") // Credit cards
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        "[REDACTED:EMAIL]",
      ) // Emails
      .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[REDACTED:PHONE]") // Phone numbers
      .replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, "[REDACTED:SSN]"); // SSN-like
  }
  return value;
}

// Sanitize entire objects
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip known sensitive fields
    if (
      ["password", "token", "secret", "key", "auth", "session"].includes(
        key.toLowerCase(),
      )
    ) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }

  return sanitized;
}

// Simple logger interface
interface Logger {
  error(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void;
  warn(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void;
  info(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void;
  debug(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void;
  log(
    level: string,
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void;
}

// Browser-safe console logger for renderer process
class ConsoleLogger implements Logger {
  private isDevelopment = import.meta.env?.DEV ?? true;

  error(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void {
    console.error(
      message,
      context ? sanitizeObject(context as Record<string, unknown>) : "",
    );
  }

  warn(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void {
    console.warn(
      message,
      context ? sanitizeObject(context as Record<string, unknown>) : "",
    );
  }

  info(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void {
    if (this.isDevelopment) {
      console.info(
        message,
        context ? sanitizeObject(context as Record<string, unknown>) : "",
      );
    }
  }

  debug(
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void {
    if (this.isDevelopment) {
      console.debug(
        message,
        context ? sanitizeObject(context as Record<string, unknown>) : "",
      );
    }
  }

  log(
    level: string,
    message: string,
    context?: LogContext | Record<string, unknown> | unknown,
  ): void {
    if (this.isDevelopment) {
      console.log(
        `[${level.toUpperCase()}] ${message}`,
        context ? sanitizeObject(context as Record<string, unknown>) : "",
      );
    }
  }
}

// Winston logger for main process (lazy loaded)
let winstonLoggerInstance: Logger | null = null;

async function createWinstonLogger(): Promise<Logger> {
  // Dynamically import winston and dependencies (Node.js only)
  const winston = await import("winston");
  const path = await import("path");

  let app: any;
  try {
    const electron = await import("electron");
    app = electron.app;
  } catch {
    app = undefined;
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  const isTest = process.env.NODE_ENV === "test";

  const secureFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json({
      replacer: (_key: string, value: unknown) => {
        if (typeof value === "object" && value !== null) {
          return sanitizeObject(value as Record<string, unknown>);
        }
        return sanitizeValue(value);
      },
    }),
  );

  const transports: any[] = [];

  // File transport ONLY in main process
  if (!isTest && app) {
    const logDir = app.getPath("logs");

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: secureFormat,
      }),

      new winston.transports.File({
        filename: path.join(logDir, "combined.log"),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: secureFormat,
      }),
    );
  }

  // Console transport for development
  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || "info",
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(
            ({ level, message, service, operation, ...meta }: any) => {
              const prefix = service ? `[${service}]` : "";
              const op = operation ? ` ${operation}:` : "";
              const metaStr =
                Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
              return `${level}${prefix}${op} ${message}${metaStr}`;
            },
          ),
        ),
      }),
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    transports,
    exitOnError: false,
  });
}

// Detect if we're in renderer process
const isRenderer =
  typeof window !== "undefined" && typeof window.document !== "undefined";

// Get or create logger instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    if (isRenderer) {
      // Browser environment - use console logger
      loggerInstance = new ConsoleLogger();
    } else {
      // Main process - use winston (but we can't await here)
      // Return console logger as fallback until winston loads
      loggerInstance = new ConsoleLogger();

      // Load winston async in background
      createWinstonLogger()
        .then((winstonLogger) => {
          winstonLoggerInstance = winstonLogger;
          loggerInstance = winstonLogger;
        })
        .catch((err) => {
          console.error("Failed to load winston logger:", err);
        });
    }
  }

  // Return winston if loaded, otherwise console logger
  return winstonLoggerInstance || loggerInstance;
}

// Convenience logging functions
export function logError(message: string, context?: LogContext): void {
  const logger = getLogger();
  logger.error(message, context);
}

export function logWarn(message: string, context?: LogContext): void {
  const logger = getLogger();
  logger.warn(message, context);
}

export function logInfo(message: string, context?: LogContext): void {
  const logger = getLogger();
  logger.info(message, context);
}

export function logDebug(message: string, context?: LogContext): void {
  const logger = getLogger();
  logger.debug(message, context);
}

// Performance logging
export function logPerformance(
  operation: string,
  duration: number,
  context?: Omit<LogContext, "operation" | "duration">,
): void {
  const level = duration > 5000 ? "warn" : duration > 1000 ? "info" : "debug";
  const logger = getLogger();

  logger.log(level, `Performance: ${operation} completed in ${duration}ms`, {
    ...context,
    operation,
    duration,
    performance: true,
  });
}

// Security event logging
export function logSecurity(event: string, context?: LogContext): void {
  const logger = getLogger();
  logger.warn(`SECURITY: ${event}`, { ...context, security: true });
}

// Audit logging (for compliance)
export function logAudit(action: string, context?: LogContext): void {
  const logger = getLogger();
  logger.info(`AUDIT: ${action}`, { ...context, audit: true });
}

// Legacy console.log replacement (for gradual migration)
export function legacyLog(message: string, ...args: unknown[]): void {
  if (isRenderer || process.env.NODE_ENV === "development") {
    // In development or renderer, show console for debugging
    console.log(`[LEGACY] ${message}`, ...args);
  }

  // Always log to structured logger
  logInfo(`LEGACY: ${message}`, {
    legacy: true,
    args: args.map(sanitizeValue),
  });
}

// Export default logger instance
export const logger = getLogger();
export default logger;
