/**
 * DI Container Adapter
 *
 * Bridges the existing singleton pattern with the new DI container.
 * This allows gradual migration without breaking existing code.
 */

import { getContainer } from "./container.ts";
import { TYPES } from "./types.ts";
import type { ICaseService } from "./interfaces.ts";

/**
 * Get a service from the DI container
 *
 * This function provides a simple way to get services from the container
 * without having to import the container and TYPES everywhere.
 */
export function getService<T>(serviceType: symbol): T {
  return getContainer().get<T>(serviceType);
}

/**
 * Convenience getters for commonly used services
 * These can be used as drop-in replacements for existing singleton imports
 */

export function getCaseService(): ICaseService {
  return getService<ICaseService>(TYPES.CaseService);
}

// Add more service getters as services are migrated
// export function getAuthenticationService(): IAuthenticationService {
//   return getService<IAuthenticationService>(TYPES.AuthenticationService);
// }

/**
 * Create a singleton wrapper for gradual migration
 *
 * This creates a lazy-loaded singleton that gets the service from the container.
 * Use this pattern to gradually migrate existing singleton exports.
 */
export function createSingletonProxy<T>(serviceType: symbol): T {
  let instance: T | null = null;

  return new Proxy({} as any, {
    get(_target, prop, receiver) {
      if (!instance) {
        instance = getService<T>(serviceType);
      }
      return Reflect.get(instance!, prop, receiver);
    },
  }) as T;
}

/**
 * Export singleton-like proxies for backward compatibility
 * These can be used as drop-in replacements for existing exports
 */
export const caseService = createSingletonProxy<ICaseService>(
  TYPES.CaseService,
);
