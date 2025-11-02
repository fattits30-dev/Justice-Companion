/**
 * Migration utility to move API keys from localStorage to SecureStorageService
 *
 * This script safely migrates any existing API keys stored in localStorage
 * to the new secure storage system using OS-native encryption.
 *
 * @module migrate-to-secure-storage
 */

import { secureStorage } from '@/services/SecureStorageService';
import { logger } from '@/utils/logger';

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
    logger.error('MigrateToSecureStorage', `Failed to read from localStorage for key "${key}"`, { error });
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
    logger.error('MigrateToSecureStorage', `Failed to remove from localStorage for key "${key}"`, { error });
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
      result.migrated = false; // Not counted
      return result;
    }

    // Migrate to secure storage
    await secureStorage.setApiKey(key, value);
    
    // Remove from localStorage after successful migration
    removeFromLocalStorage(key);
    
    result.migrated = true;
    return result;
  } catch (error) {
    logger.error('MigrateToSecureStorage', `Failed to migrate key "${key}"`, { error });
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Migrate all keys from localStorage to secure storage
 */
export async function migrateAllKeys(): Promise<MigrationSummary> {
  const results: MigrationResult[] = [];
  let migratedKeys = 0;
  let failedKeys = 0;

  for (const key of Object.values(MIGRATION_KEYS)) {
    const result = await migrateKey(key);
    results.push(result);
    
    if (result.migrated) {
      migratedKeys++;
    } else if (result.error) {
      failedKeys++;
    }
  }

  const summary: MigrationSummary = {
    totalKeys: Object.keys(MIGRATION_KEYS).length,
    migratedKeys,
    failedKeys,
    results,
    success: failedKeys === 0,
  };

  return summary;
}