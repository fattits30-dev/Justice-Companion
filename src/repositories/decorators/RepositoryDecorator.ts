/**
 * Base Repository Decorator
 *
 * Abstract base class for repository decorators that add cross-cutting concerns
 * like caching, logging, validation, and error handling.
 *
 * Usage:
 * Extend this class and override specific repository methods to add behavior
 * before/after delegating to the wrapped repository.
 */

/**
 * Base decorator class for repositories
 * Provides proxy-like behavior to forward calls to the wrapped repository
 *
 * @template T The type of repository being decorated
 */
export abstract class RepositoryDecorator<T> {
  /**
   * The wrapped repository instance
   */
  protected repository: T;

  constructor(repository: T) {
    this.repository = repository;

    // Create a Proxy to forward all method calls to the wrapped repository by default
    // Subclasses can override specific methods to add their own behavior
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the decorator has its own implementation, use it
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Otherwise, forward to the wrapped repository
        const value = (target.repository as any)[prop];
        if (typeof value === "function") {
          return function (this: any, ...args: unknown[]) {
            return value.apply(target.repository, args);
          };
        }
        return value;
      },
    }) as any;
  }

  /**
   * Forward a method call to the wrapped repository
   * Useful when you need to explicitly delegate within overridden methods
   *
   * @param methodName - Name of the method to call
   * @param args - Arguments to pass to the method
   * @returns Result of the method call
   */
  protected async forwardCall<R = unknown>(
    methodName: string,
    ...args: unknown[]
  ): Promise<R> {
    const method = (this.repository as any)[methodName];
    if (typeof method !== "function") {
      throw new Error(`Method ${methodName} does not exist on repository`);
    }
    return method.apply(this.repository, args) as Promise<R>;
  }

  /**
   * Check if the wrapped repository has a specific method
   *
   * @param methodName - Name of the method to check
   * @returns True if the method exists and is a function
   */
  protected hasMethod(methodName: string): boolean {
    return typeof (this.repository as any)[methodName] === "function";
  }
}
