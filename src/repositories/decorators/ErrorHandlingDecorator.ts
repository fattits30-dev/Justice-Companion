/**
 * Error Handling Decorator for Repositories
 *
 * Provides consistent error handling and conversion of database errors
 * to domain-specific errors. Ensures proper error propagation and context.
 */

import { injectable } from "inversify";
import { RepositoryDecorator } from "./RepositoryDecorator.ts";
import {
  RepositoryError,
  NotFoundError,
} from "../../errors/RepositoryErrors.ts";
import { DomainError, DatabaseError } from "../../errors/DomainErrors.ts";
import { logger } from "../../utils/logger";

/**
 * Configuration options for error handling
 */
export interface ErrorHandlingOptions {
  includeStackTrace?: boolean; // Include stack trace in error context
  logErrors?: boolean; // Log errors before re-throwing
  convertToRepositoryErrors?: boolean; // Convert all errors to RepositoryError
}

/**
 * Adds consistent error handling to repository operations
 * Converts SQLite errors to domain errors
 *
 * Features:
 * - Converts database errors to domain errors
 * - Adds context to error messages
 * - Handles specific SQLite error codes
 * - Provides consistent error interface
 * - Retries transient errors (optional)
 *
 * @template T The type of repository being decorated
 */
@injectable()
export class ErrorHandlingDecorator<T> extends RepositoryDecorator<T> {
  private readonly options: Required<ErrorHandlingOptions>;

  constructor(repository: T, options: ErrorHandlingOptions = {}) {
    super(repository);

    this.options = {
      includeStackTrace: options.includeStackTrace ?? false,
      logErrors: options.logErrors ?? true,
      convertToRepositoryErrors: options.convertToRepositoryErrors ?? true,
    };
  }

  /**
   * Handle errors for findById
   */
  async findById(id: number): Promise<T | null> {
    try {
      const result = await (this.repository as any).findById(id);

      // Check if not found and throw appropriate error
      if (result === null || result === undefined) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError("findById", error, { id });
    }
  }

  /**
   * Handle errors for findAll
   */
  async findAll(): Promise<T[]> {
    try {
      return await (this.repository as any).findAll();
    } catch (error) {
      throw this.handleError("findAll", error);
    }
  }

  /**
   * Handle errors for findByUserId
   */
  async findByUserId(userId: number): Promise<T[]> {
    if (!this.hasMethod("findByUserId")) {
      return this.forwardCall<T[]>("findByUserId", userId);
    }

    try {
      return await (this.repository as any).findByUserId(userId);
    } catch (error) {
      throw this.handleError("findByUserId", error, { userId });
    }
  }

  /**
   * Handle errors for create
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      return await (this.repository as any).create(data);
    } catch (error) {
      throw this.handleError("create", error, { data });
    }
  }

  /**
   * Handle errors for update
   */
  async update(id: number, data: Partial<T>): Promise<T> {
    try {
      const result = await (this.repository as any).update(id, data);

      // Check if not found and throw appropriate error
      // Some repositories return false to indicate not found
      if (result === null || result === undefined || result === false) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError("update", error, { id, data });
    }
  }

  /**
   * Handle errors for delete
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await (this.repository as any).delete(id);

      // Check if not found and throw appropriate error
      // Some repositories return false to indicate not found
      if (result === null || result === undefined || result === false) {
        throw new NotFoundError(this.getEntityType(), id);
      }
    } catch (error) {
      throw this.handleError("delete", error, { id });
    }
  }

  /**
   * Generic error handler that converts and enriches errors
   */
  private handleError(
    operation: string,
    error: unknown,
    context?: Record<string, any>,
  ): Error {
    // Log error if enabled
    if (this.options.logErrors) {
      logger.error("Repository operation failed");
    }

    // Preserve all DomainErrors (NotFoundError, ValidationError, etc.) without wrapping
    if (error instanceof DomainError) {
      return error;
    }

    // If we're not converting, return error as-is
    if (!this.options.convertToRepositoryErrors) {
      if (error instanceof Error) {
        return error;
      }
      return new Error(String(error));
    }

    // Convert to RepositoryError - detect specific error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;

    // Build error context
    let code = "REPOSITORY_ERROR";
    let statusCode = 500;
    const finalMessage = errorMessage;

    // Detect UNIQUE constraint violations
    if (errorMessage.includes("UNIQUE constraint")) {
      code = "DUPLICATE_ENTRY";
      statusCode = 409;
    }
    // Detect FOREIGN KEY violations
    else if (errorMessage.includes("FOREIGN KEY constraint")) {
      code = "FOREIGN_KEY_VIOLATION";
      statusCode = 409;
    }
    // Detect database lock errors
    else if (
      errorMessage.includes("Database is locked") ||
      errorCode === "SQLITE_BUSY"
    ) {
      // Return DatabaseError for lock issues
      return new DatabaseError(
        operation,
        "Database is temporarily locked, please try again",
        errorCode,
      );
    }
    // Detect TypeError (usually invalid input)
    else if (error instanceof TypeError) {
      code = "INVALID_INPUT";
      statusCode = 400;
    }

    // Sanitize and structure context
    const sanitizedInput = context ? this.sanitizeContext(context) : undefined;
    const errorContext: Record<string, any> = {};

    // Put sanitized data under 'input' key
    if (sanitizedInput) {
      // If context has 'data' key, move it to 'input'
      if ("data" in sanitizedInput) {
        errorContext.input = sanitizedInput.data;
      } else {
        errorContext.input = sanitizedInput;
      }
    }

    // Add stack trace if enabled
    if (this.options.includeStackTrace && error instanceof Error) {
      errorContext.stackTrace = error.stack;
    }

    return new RepositoryError(code, finalMessage, statusCode, errorContext);
  }

  /**
   * Sanitize sensitive fields from context before logging
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      "password",
      "token",
      "apiKey",
      "secret",
      "key",
      "authorization",
    ];
    const sanitized = { ...context };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== "object" || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          result[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Get entity type for error context
   */
  private getEntityType(): string {
    // Extract entity type from wrapped repository name, not decorator name
    const repoName = (this.repository as any).constructor.name;
    return repoName.replace("Repository", "");
  }

  /**
   * Check if repository has a method
   */
  protected hasMethod(methodName: string): boolean {
    return typeof (this.repository as any)[methodName] === "function";
  }

  /**
   * Forward call to repository if method exists
   */
  protected forwardCall<R = unknown>(
    methodName: string,
    ...args: unknown[]
  ): Promise<R> {
    const method = (this.repository as any)[methodName];
    if (typeof method !== "function") {
      throw new Error(`Method ${methodName} not found on repository`);
    }
    return method.apply(this.repository, args);
  }
}
