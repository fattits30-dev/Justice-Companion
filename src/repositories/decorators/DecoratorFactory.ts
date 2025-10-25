/**
 * Decorator Factory for Repository Pattern
 *
 * Provides a fluent API for composing repository decorators
 * in the correct order and with proper dependency injection.
 */

import { Container } from 'inversify';
import { z } from 'zod';
import { TYPES } from '../../shared/infrastructure/di/types.ts';
import type { ICacheService, IAuditLogger } from '../../shared/infrastructure/di/interfaces.ts';
import { CachingDecorator } from './CachingDecorator.ts';
import { ValidationDecorator, type ValidationSchemas } from './ValidationDecorator.ts';
import { LoggingDecorator, type LoggingOptions } from './LoggingDecorator.ts';
import { ErrorHandlingDecorator, type ErrorHandlingOptions } from './ErrorHandlingDecorator.ts';

/**
 * Configuration for decorator composition
 */
export interface DecoratorConfig {
  // Feature toggles
  enableCaching?: boolean;
  enableValidation?: boolean;
  enableLogging?: boolean;
  enableErrorHandling?: boolean;

  // Configuration for specific decorators
  schemas?: ValidationSchemas;
  loggingOptions?: LoggingOptions;
  errorHandlingOptions?: ErrorHandlingOptions;

  // Performance tuning
  cacheTtlSeconds?: number;
}

/**
 * Factory for creating decorated repositories
 *
 * The decorator order is important:
 * 1. ErrorHandling (innermost) - Catch and convert all errors
 * 2. Logging - Log operations and errors
 * 3. Validation - Validate inputs before processing
 * 4. Caching (outermost) - Cache results after all processing
 *
 * This order ensures:
 * - Errors are properly caught and converted
 * - All operations are logged (including errors)
 * - Invalid inputs are rejected before reaching the database
 * - Only valid results are cached
 */
export class DecoratorFactory {
  /**
   * Wrap a repository with the full decorator chain
   *
   * @param container The DI container for resolving dependencies
   * @param repository The base repository to decorate
   * @param config Configuration for decorators
   * @returns The decorated repository
   */
  static wrapRepository<T>(
    container: Container,
    repository: T,
    config: DecoratorConfig = {}
  ): T {
    let decorated: any = repository;

    // Apply decorators in order (innermost to outermost)

    // 1. Error Handling (innermost) - Always enabled by default
    if (config.enableErrorHandling !== false) {
      decorated = new ErrorHandlingDecorator(
        decorated,
        config.errorHandlingOptions
      );
    }

    // 2. Logging - Requires AuditLogger from container
    if (config.enableLogging !== false) {
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger);
      decorated = new LoggingDecorator(
        decorated,
        auditLogger,
        config.loggingOptions
      );
    }

    // 3. Validation - Only if schemas are provided
    if (config.enableValidation && config.schemas) {
      decorated = new ValidationDecorator(
        decorated,
        config.schemas
      );
    }

    // 4. Caching (outermost) - Requires CacheService from container
    if (config.enableCaching !== false) {
      const cacheService = container.get<ICacheService>(TYPES.CacheService);
      decorated = new CachingDecorator(
        decorated,
        cacheService
      );
    }

    return decorated as T;
  }

  /**
   * Create a builder for fluent decorator configuration
   *
   * @param container The DI container
   * @param repository The base repository
   * @returns A decorator builder
   */
  static builder<T>(container: Container, repository: T): DecoratorBuilder<T> {
    return new DecoratorBuilder(container, repository);
  }
}

/**
 * Fluent builder for repository decorators
 */
export class DecoratorBuilder<T> {
  private config: DecoratorConfig = {};

  constructor(
    private container: Container,
    private repository: T
  ) {}

  /**
   * Enable caching with optional TTL
   */
  withCaching(ttlSeconds?: number): this {
    this.config.enableCaching = true;
    if (ttlSeconds) {
      this.config.cacheTtlSeconds = ttlSeconds;
    }
    return this;
  }

  /**
   * Disable caching
   */
  withoutCaching(): this {
    this.config.enableCaching = false;
    return this;
  }

  /**
   * Enable validation with schemas
   */
  withValidation(schemas: ValidationSchemas): this {
    this.config.enableValidation = true;
    this.config.schemas = schemas;
    return this;
  }

  /**
   * Add a single validation schema
   */
  withSchema(method: string, schema: z.ZodSchema): this {
    if (!this.config.schemas) {
      this.config.schemas = {};
    }
    this.config.schemas[method] = schema;
    this.config.enableValidation = true;
    return this;
  }

  /**
   * Enable logging with options
   */
  withLogging(options?: LoggingOptions): this {
    this.config.enableLogging = true;
    if (options) {
      this.config.loggingOptions = options;
    }
    return this;
  }

  /**
   * Disable logging
   */
  withoutLogging(): this {
    this.config.enableLogging = false;
    return this;
  }

  /**
   * Enable error handling with options
   */
  withErrorHandling(options?: ErrorHandlingOptions): this {
    this.config.enableErrorHandling = true;
    if (options) {
      this.config.errorHandlingOptions = options;
    }
    return this;
  }

  /**
   * Disable error handling (not recommended)
   */
  withoutErrorHandling(): this {
    this.config.enableErrorHandling = false;
    return this;
  }

  /**
   * Build the decorated repository
   */
  build(): T {
    return DecoratorFactory.wrapRepository(
      this.container,
      this.repository,
      this.config
    );
  }
}

/**
 * Pre-configured decorator presets for common use cases
 */
export class DecoratorPresets {
  /**
   * Full-featured repository with all decorators
   */
  static fullStack<T>(
    container: Container,
    repository: T,
    schemas?: ValidationSchemas
  ): T {
    return DecoratorFactory.wrapRepository(container, repository, {
      enableCaching: true,
      enableValidation: !!schemas,
      enableLogging: true,
      enableErrorHandling: true,
      schemas
    });
  }

  /**
   * Read-optimized repository (caching, minimal logging)
   */
  static readOptimized<T>(
    container: Container,
    repository: T
  ): T {
    return DecoratorFactory.wrapRepository(container, repository, {
      enableCaching: true,
      enableValidation: false,
      enableLogging: true,
      enableErrorHandling: true,
      loggingOptions: {
        logReads: false,
        logWrites: true,
        logErrors: true,
        logPerformance: false
      }
    });
  }

  /**
   * Write-heavy repository (no caching, full logging)
   */
  static writeOptimized<T>(
    container: Container,
    repository: T,
    schemas?: ValidationSchemas
  ): T {
    return DecoratorFactory.wrapRepository(container, repository, {
      enableCaching: false,
      enableValidation: !!schemas,
      enableLogging: true,
      enableErrorHandling: true,
      schemas
    });
  }

  /**
   * Development mode (all features, verbose logging)
   */
  static development<T>(
    container: Container,
    repository: T,
    schemas?: ValidationSchemas
  ): T {
    return DecoratorFactory.wrapRepository(container, repository, {
      enableCaching: true,
      enableValidation: !!schemas,
      enableLogging: true,
      enableErrorHandling: true,
      schemas,
      loggingOptions: {
        logReads: true,
        logWrites: true,
        logErrors: true,
        logPerformance: true
      },
      errorHandlingOptions: {
        includeStackTrace: true,
        logErrors: true,
        convertToRepositoryErrors: true
      }
    });
  }

  /**
   * Production mode (optimized for performance)
   */
  static production<T>(
    container: Container,
    repository: T,
    schemas?: ValidationSchemas
  ): T {
    return DecoratorFactory.wrapRepository(container, repository, {
      enableCaching: true,
      enableValidation: !!schemas,
      enableLogging: true,
      enableErrorHandling: true,
      schemas,
      loggingOptions: {
        logReads: false,
        logWrites: true,
        logErrors: true,
        logPerformance: false
      },
      errorHandlingOptions: {
        includeStackTrace: false,
        logErrors: true,
        convertToRepositoryErrors: true
      }
    });
  }
}