/**
 * Repository-specific errors for Justice Companion
 *
 * These errors are used in the decorator pattern implementation
 * to provide consistent error handling across all repositories.
 */

import { DomainError } from './DomainErrors.ts';

/**
 * Generic repository operation error
 */
export class RepositoryError extends DomainError {
  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(code, message, statusCode, context);
  }
}

/**
 * Generic resource not found error
 */
export class NotFoundError extends DomainError {
  constructor(
    resourceType: string,
    identifier: string | number
  ) {
    super(
      'NOT_FOUND',
      `${resourceType} with identifier ${identifier} not found`,
      404,
      { resourceType, identifier }
    );
  }
}