/**
 * Migration utility to move API keys from localStorage to SecureStorageService
 *
 * This script safely migrates any existing API keys stored in localStorage
 * to the new secure storage system using OS-native encryption.
 *
 * @module migrate-to-secure-storage
 */

import { secureStorage } from '@/services/SecureStorageService';

/**
 * Storage keys that need migration
 */
const MIGRATION_KEYS = {
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  ORGANIZATION: 'openai_organization',
} as const;

/**
 * Migration result for a single key
 */
interface MigrationResult {
  key: string;
  migrated: boolean;
  error?: string;
}

/**
 * Overall migration summary
 */
interface MigrationSummary {
  totalKeys: number;
  migratedKeys: number;
  failedKeys: number;
  results: MigrationResult[];
  success: boolean;
}

/**
 * Check if we're running in a browser environment
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Safely get value from localStorage
 */
function getFromLocalStorage(key: string): string | null {
  try {
    if (!isBrowserEnvironment()) {
      return null;
    }
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`[MigrateToSecureStorage] Failed to read from localStorage for key "${key}":`, error);
    return null;
  }
}

/**
 * Safely remove value from localStorage
 */
function removeFromLocalStorage(key: string): boolean {
  try {
    if (!isBrowserEnvironment()) {
      return false;
    }
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[MigrateToSecureStorage] Failed to remove from localStorage for key "${key}":`, error);
    return false;
  }
}

/**
 * Migrate a single key from localStorage to secure storage
 */
async function migrateKey(key: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    key,
    migrated: false,
  };

  try {
    // Check if key exists in localStorage
    const value = getFromLocalStorage(key);

    if (!value) {
      // No value to migrate
      result.migrated = false;
      return result;
    }

    // Check if already exists in secure storage
    const existingValue = await secureStorage.getApiKey(key);
    if (existingValue) {
      // Clean up localStorage since it's already in secure storage
      removeFromLocalStorage(key);
      result.migrated = false; // Not counted as migrated since it was already there
      return result;
    }

    // Migrate to secure storage
    await secureStorage.setApiKey(key, value);

    // Verify migration
    const verifiedValue = await secureStorage.getApiKey(key);
    if (verifiedValue !== value) {
      throw new Error('Value verification failed after migration');
    }

    // Remove from localStorage after successful migration
    const removed = removeFromLocalStorage(key);
    if (!removed) {
      console.warn(`[MigrateToSecureStorage] Key "${key}" migrated but could not be removed from localStorage`);
    }

    result.migrated = true;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MigrateToSecureStorage] Failed to migrate key "${key}":`, errorMessage);
    result.error = errorMessage;
    return result;
  }
}

/**
 * Main migration function
 *
 * This function:
 * - Checks for API keys in localStorage
 * - Migrates them to secure storage if found
 * - Removes them from localStorage after successful migration
 * - Is idempotent (safe to run multiple times)
 * - Handles errors gracefully without crashing
 *
 * @returns Promise<MigrationSummary> Summary of the migration results
 */
export async function migrateToSecureStorage(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    totalKeys: Object.keys(MIGRATION_KEYS).length,
    migratedKeys: 0,
    failedKeys: 0,
    results: [],
    success: true,
  };

  // Check if we're in a browser environment
  if (!isBrowserEnvironment()) {
    return summary;
  }

  try {
    // Initialize secure storage
    await secureStorage.init();

    // Check if encryption is available
    const encryptionAvailable = secureStorage.isEncryptionAvailable();
    if (!encryptionAvailable) {
      console.warn(
        '[MigrateToSecureStorage] OS-native encryption not available. ' +
        'API keys will be stored without encryption. ' +
        'Consider installing gnome-keyring or kwallet on Linux.',
      );
    }

    // Migrate each key
    const migrationPromises = Object.values(MIGRATION_KEYS).map(key => migrateKey(key));
    const results = await Promise.all(migrationPromises);

    // Process results
    for (const result of results) {
      summary.results.push(result);
      if (result.migrated) {
        summary.migratedKeys++;
      }
      if (result.error) {
        summary.failedKeys++;
        summary.success = false;
      }
    }

    // Log summary
    if (summary.failedKeys > 0) {
      console.error(
        `[MigrateToSecureStorage] Migration completed with errors: ${summary.failedKeys} key(s) failed`,
      );
    }

    return summary;
  } catch (error) {
    console.error('[MigrateToSecureStorage] Migration failed with critical error:', error);
    summary.success = false;
    return summary;
  }
}

/**
 * Check if migration is needed
 *
 * @returns Promise<boolean> True if any keys exist in localStorage that need migration
 */
export async function isMigrationNeeded(): Promise<boolean> {
  if (!isBrowserEnvironment()) {
    return false;
  }

  try {
    // Check if any migration keys exist in localStorage
    for (const key of Object.values(MIGRATION_KEYS)) {
      const value = getFromLocalStorage(key);
      if (value) {
        // Check if it's already in secure storage
        await secureStorage.init();
        const secureValue = await secureStorage.getApiKey(key);
        if (!secureValue) {
          // Found a key that needs migration
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('[MigrateToSecureStorage] Error checking migration status:', error);
    return false;
  }
}

/**
 * Clean up any remaining localStorage entries
 * This is useful after successful migration to ensure no sensitive data remains
 */
export function cleanupLocalStorage(): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  for (const key of Object.values(MIGRATION_KEYS)) {
    try {
      removeFromLocalStorage(key);
    } catch (error) {
      console.error(`[MigrateToSecureStorage] Failed to cleanup key "${key}":`, error);
    }
  }
}
