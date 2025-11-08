/**
 * Input Validation Middleware for Justice Companion
 *
 * Provides comprehensive input validation for all IPC channels using Zod schemas.
 * Implements defense-in-depth security with sanitization and injection prevention.
 */

import { z } from "zod";
import { logger } from "../utils/logger.ts";
import type { AuditLogger } from "../services/AuditLogger.ts";
import { ipcSchemas } from "./schemas.ts";
import {
  preventSqlInjection,
  sanitizeForLogging,
  sanitizeHtml,
} from "./utils/sanitizers.ts";

/**
 * Custom validation error with detailed field information
 */
export class ValidationError extends Error {
  public readonly fields: Record<string, string[]>;
  public readonly code: string;

  constructor(
    message: string,
    fields: Record<string, string[]> = {},
    code = "VALIDATION_ERROR"
  ) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
    this.code = code;
  }
}

/**
 * Performance metrics for monitoring
 */
interface ValidationMetrics {
  totalValidations: number;
  totalDuration: number;
  channelMetrics: Map<
    string,
    { count: number; totalMs: number; avgMs: number }
  >;
  slowValidations: Array<{
    channel: string;
    duration: number;
    timestamp: Date;
  }>;
}

/**
 * Input validation middleware for IPC handlers
 *
 * Features:
 * - Zod schema validation for type safety
 * - HTML/SQL injection prevention
 * - Path traversal protection
 * - Array/string length limits for DoS prevention
 * - Comprehensive audit logging
 * - Performance monitoring
 *
 * Security:
 * - All validation failures are audited
 * - Sensitive data is never logged
 * - User-friendly error messages returned
 * - Defense-in-depth approach
 */
export class ValidationMiddleware {
  private schemas: Map<string, z.ZodSchema>;
  private metrics: ValidationMetrics;

  // Configurable limits
  private readonly maxStringLength = 10000;
  private readonly maxArrayLength = 1000;
  private readonly slowValidationThreshold = 10; // ms

  // Explicit property declaration (TSX strip-only mode compatibility)
  private auditLogger?: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    // Explicit property assignment (TSX strip-only mode compatibility)
    this.auditLogger = auditLogger;

    this.schemas = new Map();
    this.metrics = {
      totalValidations: 0,
      totalDuration: 0,
      channelMetrics: new Map(),
      slowValidations: [],
    };

    this.registerSchemas();
  }

  /**
   * Validate request data against schema for given channel
   * @param channel - IPC channel name
   * @param data - Raw request data
   * @returns Validated and sanitized data
   * @throws ValidationError if validation fails
   */
  public async validate<T>(channel: string, data: unknown): Promise<T> {
    const startTime = performance.now();

    try {
      // Get schema for channel
      const schema = this.schemas.get(channel);
      if (!schema) {
        // For channels without validation requirements
        if (this.isNoValidationChannel(channel)) {
          return data as T;
        }

        throw new ValidationError(
          `No validation schema defined for channel: ${channel}`,
          {},
          "SCHEMA_NOT_FOUND"
        );
      }

      // Parse with Zod
      const result = await schema.safeParseAsync(data);

      if (!result.success) {
        // Format Zod errors into user-friendly format
        const fields = this.formatZodErrors(result.error);

        // Audit log validation failure (with sanitized data)
        // Note: Using 'authorization.denied' as proxy for validation failures
        // since there's no explicit validation event type in AuditEventType
        this.auditLogger?.log({
          eventType: "authorization.denied",
          userId: this.extractUserId(data),
          resourceType: "ipc",
          resourceId: channel,
          action: "read",
          success: false,
          errorMessage: "Validation failed",
          details: {
            channel,
            errorCount: Object.keys(fields).length,
            errors: Object.keys(fields),
            duration: performance.now() - startTime,
            sample: sanitizeForLogging(data),
          },
        });

        throw new ValidationError(
          "Validation failed: Invalid request data",
          fields,
          "VALIDATION_FAILED"
        );
      }

      // Additional sanitization for string fields
      const sanitized = this.sanitizeData(result.data);

      // Validate business rules
      this.validateBusinessRules(channel, sanitized);

      // Log successful validation (debug level)
      const duration = performance.now() - startTime;
      this.updateMetrics(channel, duration);

      if (duration > this.slowValidationThreshold) {
        logger.warn(
          "ValidationMiddleware",
          `Slow validation for ${channel}: ${duration.toFixed(2)}ms`
        );
      }

      return sanitized as T;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // Log unexpected errors
      this.auditLogger?.log({
        eventType: "authorization.denied",
        userId: this.extractUserId(data),
        resourceType: "ipc",
        resourceId: channel,
        action: "read",
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown validation error",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          channel,
          duration: performance.now() - startTime,
        },
      });

      throw new ValidationError(
        "Validation error: Unable to process request",
        {},
        "VALIDATION_ERROR"
      );
    }
  }

  /**
   * Register all Zod schemas for IPC channels
   */
  private registerSchemas(): void {
    // Import schemas from centralized registry
    Object.entries(ipcSchemas).forEach(([channel, schema]) => {
      this.schemas.set(channel, schema as z.ZodSchema);
    });

    if (process.env.NODE_ENV === "development") {
      logger.warn(
        "ValidationMiddleware",
        "Registered ${this.schemas.size} validation schemas"
      );
    }
  }

  /**
   * Check if channel requires no validation
   */
  private isNoValidationChannel(channel: string): boolean {
    const noValidationChannels = [
      "case:getAll",
      "case:getStatistics",
      "model:getAvailable",
      "model:getDownloaded",
      "profile:get",
      "auth:logout",
      "auth:getCurrentUser",
      "gdpr:exportUserData",
      "consent:getUserConsents",
    ];

    return noValidationChannels.includes(channel);
  }

  /**
   * Format Zod errors into user-friendly field messages
   */
  private formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const fields: Record<string, string[]> = {};

    error.issues.forEach((err) => {
      const path = err.path.join(".");
      if (!fields[path]) {
        fields[path] = [];
      }

      // Provide user-friendly messages
      let message = err.message;

      // Enhance common error messages based on Zod v4 issue types
      if (err.code === "too_small") {
        // Check if it's a required field (minimum 1 for strings)
        if ("minimum" in err && err.minimum === 1) {
          message = "This field is required";
        }
      } else if (err.code === "invalid_type") {
        // Type narrowing for invalid_type
        if ("expected" in err && "received" in err) {
          message = `Expected ${String(err.expected)}, received ${String(err.received)}`;
        }
      } else if (err.code === "invalid_enum_value") {
        // Zod enum validation error
        message = "Please select a valid option";
      }

      fields[path].push(message);
    });

    return fields;
  }

  /**
   * Sanitize data to prevent XSS and injection attacks
   * Recursively sanitizes strings in objects and arrays
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      // Check string length
      if (data.length > this.maxStringLength) {
        throw new ValidationError(
          "String exceeds maximum length",
          { field: [`Maximum length is ${this.maxStringLength} characters`] },
          "STRING_TOO_LONG"
        );
      }

      // Sanitize HTML and check for SQL injection
      const sanitized = sanitizeHtml(data);

      // For certain fields, we need stricter validation
      if (!preventSqlInjection(sanitized)) {
        throw new ValidationError(
          "Invalid characters detected",
          { field: ["Input contains potentially dangerous characters"] },
          "INVALID_CHARACTERS"
        );
      }

      return sanitized;
    }

    if (Array.isArray(data)) {
      // Check array length
      if (data.length > this.maxArrayLength) {
        throw new ValidationError(
          "Array exceeds maximum length",
          { field: [`Maximum ${this.maxArrayLength} items allowed`] },
          "ARRAY_TOO_LONG"
        );
      }

      return data.map((item) => this.sanitizeData(item));
    }

    if (data && typeof data === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>
      )) {
        // Skip sanitization for certain field types
        if (this.shouldSkipSanitization(key, value)) {
          sanitized[key] = value;
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Determine if a field should skip sanitization
   */
  private shouldSkipSanitization(key: string, value: unknown): boolean {
    // Don't sanitize numbers, booleans, dates
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value instanceof Date
    ) {
      return true;
    }

    // Don't sanitize specific fields that need raw data
    const skipFields = ["fileContent", "binaryData", "checksum", "hash"];
    return skipFields.includes(key);
  }

  /**
   * Validate business rules that can't be expressed in Zod schemas
   */
  private validateBusinessRules(channel: string, data: unknown): void {
    // Example: Case-specific business rules
    if (channel === "case:create" && data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const input = obj.input as Record<string, unknown> | undefined;

      // Validate dates are logical
      if (
        input?.filingDeadline &&
        input?.nextHearingDate &&
        typeof input.filingDeadline === "string" &&
        typeof input.nextHearingDate === "string"
      ) {
        const filing = new Date(input.filingDeadline);
        const hearing = new Date(input.nextHearingDate);

        if (filing > hearing) {
          throw new ValidationError(
            "Filing deadline cannot be after hearing date",
            {
              "input.filingDeadline": [
                "Filing deadline must be before hearing date",
              ],
            },
            "INVALID_DATE_RANGE"
          );
        }
      }
    }

    // Add more business rules as needed
  }

  /**
   * Extract user ID from request data for audit logging
   */
  private extractUserId(data: unknown): string {
    // Attempt to extract userId from common locations
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      // Try different possible locations
      const input = obj.input as Record<string, unknown> | undefined;
      const user = obj.user as Record<string, unknown> | undefined;
      const session = obj.session as Record<string, unknown> | undefined;

      const userId = obj.userId ?? input?.userId ?? user?.id ?? session?.userId;

      if (
        userId &&
        (typeof userId === "string" || typeof userId === "number")
      ) {
        return String(userId);
      }
    }

    return "anonymous";
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(channel: string, duration: number): void {
    this.metrics.totalValidations++;
    this.metrics.totalDuration += duration;

    // Update channel-specific metrics
    const channelMetric = this.metrics.channelMetrics.get(channel) ?? {
      count: 0,
      totalMs: 0,
      avgMs: 0,
    };

    channelMetric.count++;
    channelMetric.totalMs += duration;
    channelMetric.avgMs = channelMetric.totalMs / channelMetric.count;

    this.metrics.channelMetrics.set(channel, channelMetric);

    // Track slow validations
    if (duration > this.slowValidationThreshold) {
      this.metrics.slowValidations.push({
        channel,
        duration,
        timestamp: new Date(),
      });

      // Keep only last 100 slow validations
      if (this.metrics.slowValidations.length > 100) {
        this.metrics.slowValidations.shift();
      }
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  public getMetrics(): ValidationMetrics & { averageDuration: number } {
    return {
      ...this.metrics,
      averageDuration:
        this.metrics.totalValidations > 0
          ? this.metrics.totalDuration / this.metrics.totalValidations
          : 0,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      totalDuration: 0,
      channelMetrics: new Map(),
      slowValidations: [],
    };
  }

  /**
   * Get validation schema for a channel (useful for testing)
   */
  public getSchema(channel: string): z.ZodSchema | undefined {
    return this.schemas.get(channel);
  }
}

// Export singleton instance
let instance: ValidationMiddleware | null = null;

export function getValidationMiddleware(
  auditLogger?: AuditLogger
): ValidationMiddleware {
  instance ??= new ValidationMiddleware(auditLogger);
  return instance;
}

export function resetValidationMiddleware(): void {
  instance = null;
}
