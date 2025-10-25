/**
 * Repository Decorator Pattern Implementation
 *
 * This base decorator class enables the Decorator pattern for cross-cutting concerns
 * in repositories. It allows composing multiple decorators to add functionality like
 * caching, validation, logging, and error handling without modifying repository code.
 *
 * @example
 * ```typescript
 * const repository = new CaseRepository(db, encryptionService);
 * const decorated = new CachingDecorator(
 *   new ValidationDecorator(
 *     new LoggingDecorator(
 *       new ErrorHandlingDecorator(repository)
 *     )
 *   )
 * );
 * ```
 */

import { injectable } from 'inversify';

/**
 * Base decorator class for repositories
 * Implements the Decorator pattern for cross-cutting concerns
 *
 * @template T The type of repository being decorated
 */
@injectable()
export abstract class RepositoryDecorator<T> {
  /**
   * The wrapped repository instance
   */
  protected readonly repository: T;

  constructor(repository: T) {
    this.repository = repository;
  }

  /**
   * Forward all calls to the decorated repository by default
   * Override specific methods in concrete decorators
   *
   * @param methodName The name of the method to forward
   * @param args Arguments to pass to the method
   * @returns The result from the wrapped repository method
   */
  protected forwardCall<R>(
    methodName: string,
    ...args: any[]
  ): R {
    const method = (this.repository as any)[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on repository`);
    }
    return method.apply(this.repository, args);
  }

  /**
   * Get the name of the repository for logging/caching purposes
   *
   * @returns The constructor name of the innermost repository
   */
  protected getRepositoryName(): string {
    let current: any = this.repository;

    // Traverse to the innermost repository (not a decorator)
    while (current instanceof RepositoryDecorator) {
      current = current.repository;
    }

    return current.constructor.name;
  }

  /**
   * Check if the wrapped repository has a specific method
   *
   * @param methodName The name of the method to check
   * @returns True if the method exists
   */
  protected hasMethod(methodName: string): boolean {
    return typeof (this.repository as any)[methodName] === 'function';
  }
}