/**
 * Repository Decorator Pattern Exports
 *
 * This module provides decorators for adding cross-cutting concerns
 * to repositories without modifying their implementation.
 */

export { RepositoryDecorator } from "./RepositoryDecorator.ts";
export { CachingDecorator } from "./CachingDecorator.ts";
export {
  ValidationDecorator,
  type ValidationSchemas,
} from "./ValidationDecorator.ts";
export {
  LoggingDecorator,
  type LoggingOptions,
  LogLevel,
} from "./LoggingDecorator.ts";
export {
  ErrorHandlingDecorator,
  type ErrorHandlingOptions,
} from "./ErrorHandlingDecorator.ts";
export { DecoratorFactory, type DecoratorConfig } from "./DecoratorFactory.ts";
