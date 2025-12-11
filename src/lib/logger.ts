/**
 * Lightweight Browser Logger for Justice Companion PWA
 *
 * SECURITY: Prevents sensitive data leakage in production logs
 * PERFORMANCE: Minimal overhead, no heavy dependencies
 * COMPLIANCE: GDPR-compliant, automatic PII redaction
 *
 * Replaces Winston (saves 313 KB from bundle!)
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

/**
 * Sanitize sensitive data from logs (PII protection).
 * Redacts credit cards, emails, phone numbers, SSNs.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED:CARD]")
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        "[REDACTED:EMAIL]"
      )
      .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[REDACTED:PHONE]")
      .replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, "[REDACTED:SSN]");
  }
  return value;
}

/**
 * Sanitize entire objects, redacting sensitive fields.
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip known sensitive fields
    if (
      [
        "password",
        "token",
        "secret",
        "key",
        "auth",
        "session",
        "apiKey",
        "authorization",
      ].includes(key.toLowerCase())
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }

  return sanitized;
}

/**
 * Format timestamp for logs (ISO 8601).
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Lightweight browser logger with PII protection.
 *
 * Features:
 * - Automatic PII redaction
 * - Structured logging with context
 * - Environment-aware (dev vs prod)
 * - Zero dependencies
 * - Tiny bundle size (~2KB)
 */
export class BrowserLogger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env?.DEV ?? true;
  }

  /**
   * Log error message (always shown, even in production).
   */
  error(message: string, context?: any): void {
    const timestamp = formatTimestamp();
    const ctx = this.processContext(context);

    // Always log errors in production
    if (ctx.error) {
      console.error(
        `[${timestamp}] [ERROR] ${message}`,
        ctx.error,
        ctx.sanitized
      );
    } else {
      console.error(`[${timestamp}] [ERROR] ${message}`, ctx.sanitized);
    }

    // TODO: Send to error tracking service (Sentry, etc.) in production
    if (!this.isDevelopment && typeof window !== "undefined") {
      this.sendToErrorTracker(message, ctx);
    }
  }

  /**
   * Log warning message.
   */
  warn(message: string, context?: any): void {
    const timestamp = formatTimestamp();
    const ctx = this.processContext(context);
    console.warn(`[${timestamp}] [WARN] ${message}`, ctx.sanitized);
  }

  /**
   * Log info message (dev only by default).
   */
  info(message: string, context?: any): void {
    if (!this.isDevelopment) { return; }

    const timestamp = formatTimestamp();
    const ctx = this.processContext(context);
    console.info(`[${timestamp}] [INFO] ${message}`, ctx.sanitized);
  }

  /**
   * Log debug message (dev only).
   */
  debug(message: string, context?: any): void {
    if (!this.isDevelopment) { return; }

    const timestamp = formatTimestamp();
    const ctx = this.processContext(context);
    console.debug(`[${timestamp}] [DEBUG] ${message}`, ctx.sanitized);
  }

  /**
   * Generic log method with custom level.
   */
  log(level: string, message: string, context?: any): void {
    if (!this.isDevelopment && level === LogLevel.DEBUG) { return; }

    const timestamp = formatTimestamp();
    const ctx = this.processContext(context);
    console.log(
      `[${timestamp}] [${level.toUpperCase()}] ${message}`,
      ctx.sanitized
    );
  }

  /**
   * Process and sanitize context object.
   */
  private processContext(context?: any): {
    sanitized: Record<string, unknown>;
    error?: Error;
  } {
    if (!context) {
      return { sanitized: {} };
    }

    // Handle string context (for backward compatibility)
    if (typeof context === "string") {
      return {
        sanitized: { message: sanitizeValue(context) },
      };
    }

    // Handle Error objects
    if (context instanceof Error) {
      return {
        error: context,
        sanitized: {
          name: context.name,
          message: sanitizeValue(context.message),
          stack: this.isDevelopment ? context.stack : "[REDACTED]",
        },
      };
    }

    // Handle objects (including LogContext)
    if (typeof context === "object" && context !== null) {
      const ctx = context as any;
      const error = ctx.error;
      const sanitized = sanitizeObject(context as Record<string, unknown>);
      return { sanitized, error };
    }

    // Fallback for other types
    return {
      sanitized: { value: String(context) },
    };
  }

  /**
   * Send error to tracking service using Sentry.
   */
  private sendToErrorTracker(message: string, ctx: any): void {
    // Import dynamically to avoid circular dependencies and only load when needed
    import("./sentry.ts")
      .then(({ captureError, addBreadcrumb }) => {
        // Add breadcrumb for context
        addBreadcrumb("logger", message, ctx.sanitized);

        // Capture the error
        const error =
          ctx.error instanceof Error ? ctx.error : new Error(message);
        captureError(error, ctx.sanitized);
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      });
  }
}

// Global logger instance
const loggerInstance = new BrowserLogger();

// ===== CONVENIENCE FUNCTIONS =====

export function logError(message: string, context?: any): void {
  loggerInstance.error(message, context);
}

export function logWarn(message: string, context?: any): void {
  loggerInstance.warn(message, context);
}

export function logInfo(message: string, context?: any): void {
  loggerInstance.info(message, context);
}

export function logDebug(message: string, context?: any): void {
  loggerInstance.debug(message, context);
}

/**
 * Log performance metrics.
 * Automatically escalates to warn/error for slow operations.
 */
export function logPerformance(
  operation: string,
  duration: number,
  context?: Omit<LogContext, "operation" | "duration">
): void {
  const level =
    duration > 5000
      ? LogLevel.ERROR
      : duration > 1000
        ? LogLevel.WARN
        : LogLevel.INFO;
  const emoji = duration > 5000 ? "🐌" : duration > 1000 ? "⚠️" : "✓";

  loggerInstance.log(
    level,
    `${emoji} ${operation} completed in ${duration}ms`,
    {
      ...context,
      operation,
      duration,
      performance: true,
    }
  );
}

/**
 * Log security events (always logged, even in production).
 */
export function logSecurity(event: string, context?: any): void {
  loggerInstance.warn(`🔒 SECURITY: ${event}`, { ...context, security: true });
}

/**
 * Log audit events for compliance (GDPR, etc.).
 */
export function logAudit(action: string, context?: any): void {
  loggerInstance.info(`📋 AUDIT: ${action}`, { ...context, audit: true });
}

/**
 * Legacy console.log replacement for gradual migration.
 * @deprecated Use structured logging (logInfo, logError, etc.) instead
 */
export function legacyLog(message: string, ...args: unknown[]): void {
  if (import.meta.env?.DEV) {
    console.log(`[LEGACY] ${message}`, ...args);
  }

  loggerInstance.info(`LEGACY: ${message}`, {
    legacy: true,
    args: args.map(sanitizeValue),
  });
}

// Export singleton logger instance
export const logger = loggerInstance;
export default logger;

/**
 * Create a namespaced logger for a specific service/module.
 *
 * @example
 * const caseLogger = createLogger('CaseService');
 * caseLogger.info('Case created', { caseId: 123 });
 */
export function createLogger(service: string) {
  return {
    error: (message: string, context?: any) =>
      logError(message, { ...context, service }),
    warn: (message: string, context?: any) =>
      logWarn(message, { ...context, service }),
    info: (message: string, context?: any) =>
      logInfo(message, { ...context, service }),
    debug: (message: string, context?: any) =>
      logDebug(message, { ...context, service }),
    performance: (operation: string, duration: number, context?: any) =>
      logPerformance(operation, duration, { ...context, service }),
  };
}
