/**
 * Error Handling Decorator for Repositories
 *
 * Provides consistent error handling and conversion of database errors
 * to domain-specific errors. Ensures proper error propagation and context.
 */

import { injectable } from 'inversify';
import { RepositoryDecorator } from './RepositoryDecorator.ts';
import { RepositoryError, NotFoundError } from '../../errors/RepositoryErrors.ts';
import { DatabaseError } from '../../errors/DomainErrors.ts';

/**
 * Configuration options for error handling
 */
export interface ErrorHandlingOptions {
  includeStackTrace?: boolean;  // Include stack trace in error context
  logErrors?: boolean;          // Log errors before re-throwing
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

  constructor(
    repository: T,
    options: ErrorHandlingOptions = {}
  ) {
    super(repository);

    this.options = {
      includeStackTrace: options.includeStackTrace ?? false,
      logErrors: options.logErrors ?? true,
      convertToRepositoryErrors: options.convertToRepositoryErrors ?? true
    };
  }

  /**
   * Handle errors for findById
   */
  async findById(id: number): Promise<any> {
    try {
      const result = await (this.repository as any).findById(id);

      // Check if not found and throw appropriate error
      if (result === null || result === undefined) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError('findById', error, { id });
    }
  }

  /**
   * Handle errors for findAll
   */
  async findAll(): Promise<any[]> {
    try {
      return await (this.repository as any).findAll();
    } catch (error) {
      throw this.handleError('findAll', error);
    }
  }

  /**
   * Handle errors for findByUserId
   */
  async findByUserId(userId: number): Promise<any[]> {
    if (!this.hasMethod('findByUserId')) {
      return this.forwardCall('findByUserId', userId);
    }

    try {
      return await (this.repository as any).findByUserId(userId);
    } catch (error) {
      throw this.handleError('findByUserId', error, { userId });
    }
  }

  /**
   * Handle errors for create
   */
  async create(input: any): Promise<any> {
    try {
      return await (this.repository as any).create(input);
    } catch (error) {
      throw this.handleError('create', error, { input: this.sanitizeInput(input) });
    }
  }

  /**
   * Handle errors for update
   */
  async update(id: number, input: any): Promise<any> {
    try {
      const result = await (this.repository as any).update(id, input);

      // Check if update affected any rows
      if (result === false || result === 0) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError('update', error, { id, input: this.sanitizeInput(input) });
    }
  }

  /**
   * Handle errors for delete
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await (this.repository as any).delete(id);

      // Check if delete affected any rows
      if (result === false) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError('delete', error, { id });
    }
  }

  /**
   * Handle errors for batch create
   */
  async createBatch(items: any[]): Promise<any[]> {
    if (!this.hasMethod('createBatch')) {
      return this.forwardCall('createBatch', items);
    }

    try {
      return await (this.repository as any).createBatch(items);
    } catch (error) {
      throw this.handleError('createBatch', error, { itemCount: items.length });
    }
  }

  /**
   * Handle errors for batch delete
   */
  async deleteBatch(ids: number[]): Promise<number> {
    if (!this.hasMethod('deleteBatch')) {
      return this.forwardCall('deleteBatch', ids);
    }

    try {
      return await (this.repository as any).deleteBatch(ids);
    } catch (error) {
      throw this.handleError('deleteBatch', error, { ids });
    }
  }

  /**
   * Central error handling logic
   *
   * @param operation The operation that failed
   * @param error The original error
   * @param context Additional context about the operation
   * @returns A domain-specific error
   */
  private handleError(operation: string, error: any, context?: any): Error {
    // If already a domain error, just add context
    if (error instanceof NotFoundError || error instanceof RepositoryError) {
      if (context) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }

    // Analyze error message for specific patterns
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // SQLite UNIQUE constraint violation
    if (errorMessage.includes('unique constraint') || errorCode === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new RepositoryError(
        'DUPLICATE_ENTRY',
        `Duplicate entry in ${this.getEntityType()}: A record with this value already exists`,
        409,
        { ...context, originalError: errorMessage }
      );
    }

    // SQLite FOREIGN KEY constraint violation
    if (errorMessage.includes('foreign key constraint') || errorCode === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return new RepositoryError(
        'FOREIGN_KEY_VIOLATION',
        `Foreign key constraint violation in ${this.getEntityType()}: Cannot complete operation due to related records`,
        409,
        { ...context, originalError: errorMessage }
      );
    }

    // SQLite NOT NULL constraint violation
    if (errorMessage.includes('not null constraint') || errorCode === 'SQLITE_CONSTRAINT_NOTNULL') {
      return new RepositoryError(
        'REQUIRED_FIELD_MISSING',
        `Required field missing in ${this.getEntityType()}`,
        400,
        { ...context, originalError: errorMessage }
      );
    }

    // Database connection errors
    if (errorMessage.includes('database is locked') || errorCode === 'SQLITE_BUSY') {
      return new DatabaseError(
        operation,
        'Database is temporarily locked. Please try again.',
        'SQLITE_BUSY'
      );
    }

    if (errorMessage.includes('database disk image is malformed') || errorCode === 'SQLITE_CORRUPT') {
      return new DatabaseError(
        operation,
        'Database corruption detected. Please contact support.',
        'SQLITE_CORRUPT'
      );
    }

    // Permission errors
    if (errorMessage.includes('permission denied') || errorMessage.includes('access denied')) {
      return new RepositoryError(
        'PERMISSION_DENIED',
        `Permission denied for ${operation} on ${this.getEntityType()}`,
        403,
        context
      );
    }

    // Type errors (often from invalid input)
    if (error instanceof TypeError) {
      return new RepositoryError(
        'INVALID_INPUT',
        `Invalid input for ${operation}: ${error.message}`,
        400,
        context
      );
    }

    // Generic repository error
    if (this.options.convertToRepositoryErrors) {
      const errorContext: Record<string, any> = {
        ...context,
        originalError: errorMessage,
        errorName: error.name,
        errorCode: error.code
      };

      if (this.options.includeStackTrace && error.stack) {
        errorContext.stackTrace = error.stack;
      }

      return new RepositoryError(
        'REPOSITORY_ERROR',
        `Repository operation '${operation}' failed on ${this.getEntityType()}: ${error.message}`,
        500,
        errorContext
      );
    }

    // Return original error if not converting
    return error;
  }

  /**
   * Get entity type from repository name
   */
  private getEntityType(): string {
    const repoName = this.getRepositoryName();
    // Remove 'Repository' suffix and convert to lowercase
    return repoName.replace(/Repository$/i, '').toLowerCase();
  }

  /**
   * Sanitize input data for error context
   * Removes sensitive fields to avoid logging passwords, tokens, etc.
   */
  private sanitizeInput(input: any): any {
    if (!input || typeof input !== 'object') {
      return input;
    }

    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key'];
    const sanitized = { ...input };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Check if an error is retryable (transient)
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    return (
      errorMessage.includes('database is locked') ||
      errorMessage.includes('busy') ||
      errorCode === 'SQLITE_BUSY' ||
      errorCode === 'ECONNRESET' ||
      errorCode === 'ETIMEDOUT'
    );
  }
}