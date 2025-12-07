/**
 * Dependency Injection Container
 *
 * Centralized DI container using TSyringe for managing service lifecycles.
 * This provides:
 * - Automatic dependency resolution
 * - Singleton lifecycle management
 * - Testability via easy mocking
 * - Type-safe service resolution
 *
 * Usage:
 *   import { container } from '@/di/container';
 *   const profileService = container.resolve(ProfileService);
 */

import { container } from "tsyringe";
import { ProfileService } from "../services/ProfileService.ts";

/**
 * Initialize and configure the DI container
 *
 * This function registers all services with the container.
 * Services decorated with @singleton() are automatically registered
 * when their module is imported.
 */
export function initializeContainer(): void {
  // ProfileService is auto-registered via @singleton() decorator
  // Add other service registrations here as they are migrated to DI

  // Example of manual registration (if needed):
  // container.registerSingleton<IProfileService>(
  //   "IProfileService",
  //   ProfileService
  // );
}

/**
 * Get the configured container instance
 *
 * Call initializeContainer() before using the container for the first time.
 */
export { container };

/**
 * Helper function to resolve ProfileService
 *
 * Provides a typed helper for resolving ProfileService from the container.
 * This is a convenience wrapper around container.resolve().
 *
 * @returns {ProfileService} Singleton instance of ProfileService
 */
export function getProfileService(): ProfileService {
  return container.resolve(ProfileService);
}
