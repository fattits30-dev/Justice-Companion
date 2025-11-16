/**
 * Decorator Factory for Repository Pattern
 *
 * Provides a fluent API for composing repository decorators
 * in the correct order and with proper dependency injection.
 */

import { Container } from "inversify";
import { TYPES } from "../../shared/infrastructure/di/types.ts";
import type {
  ICacheService,
  IAuditLogger,
} from "../../shared/infrastructure/di/interfaces.ts";
import { CachingDecorator } from "./CachingDecorator.ts";
import {
  ValidationDecorator,
  type ValidationSchemas,
} from "./ValidationDecorator.ts";
import { LoggingDecorator, type LoggingOptions } from "./LoggingDecorator.ts";
import {
  ErrorHandlingDecorator,
  type ErrorHandlingOptions,
} from "./ErrorHandlingDecorator.ts";

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
    config: DecoratorConfig = {},
  ): T {
    let decorated: any = repository;

    // Apply decorators in order (innermost to outermost)

    // 1. Error Handling (innermost) - Always enabled by default
    if (config.enableErrorHandling !== false) {
      decorated = new ErrorHandlingDecorator(
        decorated,
        config.errorHandlingOptions,
      );
    }

    // 2. Logging - Requires AuditLogger from container
    if (config.enableLogging !== false) {
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger);
      decorated = new LoggingDecorator(
        decorated,
        auditLogger,
        config.loggingOptions,
      );
    }

    // 3. Validation - Requires validation schemas
    if (config.enableValidation !== false && config.schemas) {
      decorated = new ValidationDecorator(decorated, config.schemas);
    }

    // 4. Caching - Requires CacheService from container
    if (config.enableCaching !== false) {
      const cacheService = container.get<ICacheService>(TYPES.CacheService);
      decorated = new CachingDecorator(
        decorated,
        cacheService,
        config.cacheTtlSeconds,
      );
    }

    return decorated;
  }
}
