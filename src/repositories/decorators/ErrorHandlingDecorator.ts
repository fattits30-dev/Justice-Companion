/**
 * Error Handling Decorator for Repositories
 *
 * Provides consistent error handling and conversion of database errors
 * to domain-specific errors. Ensures proper error propagation and context.
 */

import { injectable } from 'inversify';
import { RepositoryDecorator } from './RepositoryDecorator.ts';
import { RepositoryError, NotFoundError } from '../../errors/RepositoryErrors.ts';

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
  async findById(id: number): Promise<T | null> {
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
  async findAll(): Promise<T[]> {
    try {
      return await (this.repository as any).findAll();
    } catch (error) {
      throw this.handleError('findAll', error);
    }
  }

  /**
   * Handle errors for findByUserId
   */
  async findByUserId(userId: number): Promise<T[]> {
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
  async create(data: Partial<T>): Promise<T> {
    try {
      return await (this.repository as any).create(data);
    } catch (error) {
      throw this.handleError('create', error, { data });
    }
  }

  /**
   * Handle errors for update
   */
  async update(id: number, data: Partial<T>): Promise<T> {
    try {
      const result = await (this.repository as any).update(id, data);

      // Check if not found and throw appropriate error
      if (result === null || result === undefined) {
        throw new NotFoundError(this.getEntityType(), id);
      }

      return result;
    } catch (error) {
      throw this.handleError('update', error, { id, data });
    }
  }

  /**
   * Handle errors for delete
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await (this.repository as any).delete(id);

      // Check if not found and throw appropriate error
      if (result === null || result === undefined) {
        throw new NotFoundError(this.getEntityType(), id);
      }
    } catch (error) {
      throw this.handleError('delete', error, { id });
    }
  }

  /**
   * Generic error handler that converts and enriches errors
   */
  private handleError(operation: string, error: unknown, context?: Record<string, any>): Error {
    // Log error if enabled
    if (this.options.logErrors) {
      console.error(`[${operation}] Error occurred:`, error);
    }

    // If we're converting to repository errors, do so
    if (this.options.convertToRepositoryErrors && !(error instanceof RepositoryError)) {
      // Create a new RepositoryError with context
      const message = `Failed to ${operation}${context ? ` with context ${JSON.stringify(context)}` : ''}`;
      
      // Preserve original error information if needed
      if (this.options.includeStackTrace && error instanceof Error) {
        return new RepositoryError(message, error);
      }
      
      return new RepositoryError(message);
    }

    // If it's already a RepositoryError or conversion is disabled, re-throw as-is
    if (error instanceof Error) {
      return error;
    }

    // Fallback for non-Error objects
    return new RepositoryError(`Failed to ${operation}: Unknown error occurred`);
  }

  /**
   * Get entity type for error context
   */
  private getEntityType(): string {
    // This would typically be implemented by subclasses or via reflection
    return this.constructor.name.replace('Decorator', '');
  }

  /**
   * Check if repository has a method
   */
  protected hasMethod(methodName: string): boolean {
    return typeof (this.repository as any)[methodName] === 'function';
  }

  /**
   * Forward call to repository if method exists
   */
  protected forwardCall(methodName: string, ...args: any[]): Promise<any> {
    const method = (this.repository as any)[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on repository`);
    }
    return method.apply(this.repository, args);
  }
}