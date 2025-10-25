/**
 * Logging Decorator for Repositories
 *
 * Adds comprehensive audit logging to repository operations for
 * compliance, debugging, and security auditing purposes.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../shared/infrastructure/di/types.ts';
import type { IAuditLogger } from '../../shared/infrastructure/di/interfaces.ts';
import { RepositoryDecorator } from './RepositoryDecorator.ts';

/**
 * Log levels for repository operations
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Configuration options for logging decorator
 */
export interface LoggingOptions {
  logReads?: boolean;      // Log read operations (default: true)
  logWrites?: boolean;     // Log write operations (default: true)
  logErrors?: boolean;     // Log errors (default: true)
  logPerformance?: boolean; // Log operation duration (default: true)
  sensitiveFields?: string[]; // Fields to redact in logs
}

/**
 * Adds audit logging to repository operations
 * Logs all CRUD operations for compliance
 *
 * Features:
 * - Tracks all database operations
 * - Measures operation performance
 * - Logs errors with context
 * - Redacts sensitive data
 * - Integrates with audit trail
 *
 * @template T The type of repository being decorated
 */
@injectable()
export class LoggingDecorator<T> extends RepositoryDecorator<T> {
  private readonly options: Required<LoggingOptions>;

  constructor(
    repository: T,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger,
    options: LoggingOptions = {}
  ) {
    super(repository);

    // Set default options
    this.options = {
      logReads: options.logReads ?? true,
      logWrites: options.logWrites ?? true,
      logErrors: options.logErrors ?? true,
      logPerformance: options.logPerformance ?? true,
      sensitiveFields: options.sensitiveFields ?? ['password', 'token', 'apiKey']
    };
  }

  /**
   * Log and execute findById
   */
  async findById(id: number): Promise<any> {
    if (!this.options.logReads) {
      return await (this.repository as any).findById(id);
    }

    const startTime = Date.now();
    const operation = 'findById';

    try {
      const result = await (this.repository as any).findById(id);

      this.logOperation({
        operation,
        entityId: id.toString(),
        success: true,
        found: result !== null,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { id });
      throw error;
    }
  }

  /**
   * Log and execute findAll
   */
  async findAll(): Promise<any[]> {
    if (!this.options.logReads) {
      return await (this.repository as any).findAll();
    }

    const startTime = Date.now();
    const operation = 'findAll';

    try {
      const result = await (this.repository as any).findAll();

      this.logOperation({
        operation,
        success: true,
        resultCount: result.length,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error);
      throw error;
    }
  }

  /**
   * Log and execute findByUserId
   */
  async findByUserId(userId: number): Promise<any[]> {
    if (!this.hasMethod('findByUserId')) {
      return this.forwardCall('findByUserId', userId);
    }

    if (!this.options.logReads) {
      return await (this.repository as any).findByUserId(userId);
    }

    const startTime = Date.now();
    const operation = 'findByUserId';

    try {
      const result = await (this.repository as any).findByUserId(userId);

      this.logOperation({
        operation,
        userId: userId.toString(),
        success: true,
        resultCount: result.length,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { userId });
      throw error;
    }
  }

  /**
   * Log and execute create
   */
  async create(input: any): Promise<any> {
    if (!this.options.logWrites) {
      return await (this.repository as any).create(input);
    }

    const startTime = Date.now();
    const operation = 'create';
    const sanitizedInput = this.sanitizeData(input);

    try {
      const result = await (this.repository as any).create(input);

      this.logOperation({
        operation,
        entityId: result?.id?.toString(),
        success: true,
        inputSummary: this.summarizeInput(sanitizedInput),
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { input: sanitizedInput });
      throw error;
    }
  }

  /**
   * Log and execute update
   */
  async update(id: number, input: any): Promise<any> {
    if (!this.options.logWrites) {
      return await (this.repository as any).update(id, input);
    }

    const startTime = Date.now();
    const operation = 'update';
    const sanitizedInput = this.sanitizeData(input);

    try {
      const result = await (this.repository as any).update(id, input);

      this.logOperation({
        operation,
        entityId: id.toString(),
        success: true,
        fieldsUpdated: Object.keys(sanitizedInput),
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { id, input: sanitizedInput });
      throw error;
    }
  }

  /**
   * Log and execute delete
   */
  async delete(id: number): Promise<boolean> {
    if (!this.options.logWrites) {
      return await (this.repository as any).delete(id);
    }

    const startTime = Date.now();
    const operation = 'delete';

    try {
      const result = await (this.repository as any).delete(id);

      this.logOperation({
        operation,
        entityId: id.toString(),
        success: result,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { id });
      throw error;
    }
  }

  /**
   * Log and execute batch create
   */
  async createBatch(items: any[]): Promise<any[]> {
    if (!this.hasMethod('createBatch')) {
      return this.forwardCall('createBatch', items);
    }

    if (!this.options.logWrites) {
      return await (this.repository as any).createBatch(items);
    }

    const startTime = Date.now();
    const operation = 'createBatch';

    try {
      const result = await (this.repository as any).createBatch(items);

      this.logOperation({
        operation,
        success: true,
        itemCount: items.length,
        createdCount: result.length,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { itemCount: items.length });
      throw error;
    }
  }

  /**
   * Log and execute batch delete
   */
  async deleteBatch(ids: number[]): Promise<number> {
    if (!this.hasMethod('deleteBatch')) {
      return this.forwardCall('deleteBatch', ids);
    }

    if (!this.options.logWrites) {
      return await (this.repository as any).deleteBatch(ids);
    }

    const startTime = Date.now();
    const operation = 'deleteBatch';

    try {
      const result = await (this.repository as any).deleteBatch(ids);

      this.logOperation({
        operation,
        success: true,
        requestedCount: ids.length,
        deletedCount: result,
        duration: this.options.logPerformance ? Date.now() - startTime : undefined
      });

      return result;
    } catch (error) {
      this.logError(operation, error, { ids });
      throw error;
    }
  }

  /**
   * Log a successful operation
   */
  private logOperation(details: Record<string, any>): void {
    this.auditLogger.log({
      eventType: `repository:${details.operation}`,
      resourceType: this.getRepositoryName(),
      resourceId: details.entityId || 'batch',
      action: details.operation,
      details,
      success: true
    });
  }

  /**
   * Log an error
   */
  private logError(operation: string, error: any, context?: any): void {
    if (!this.options.logErrors) {
      return;
    }

    this.auditLogger.log({
      eventType: `repository:error`,
      resourceType: this.getRepositoryName(),
      resourceId: context?.id?.toString() || 'unknown',
      action: operation,
      details: {
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        context: this.sanitizeData(context)
      },
      success: false,
      errorMessage: error.message
    });
  }

  /**
   * Sanitize data by removing sensitive fields
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    for (const field of this.options.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create a summary of input data for logging
   */
  private summarizeInput(input: any): Record<string, any> {
    if (!input || typeof input !== 'object') {
      return { type: typeof input };
    }

    return {
      fields: Object.keys(input),
      hasPassword: 'password' in input,
      hasToken: 'token' in input || 'apiKey' in input
    };
  }
}