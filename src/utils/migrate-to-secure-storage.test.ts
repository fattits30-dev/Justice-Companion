/**
 * Tests for the migrate-to-secure-storage utility
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { migrateToSecureStorage, isMigrationNeeded, cleanupLocalStorage } from './migrate-to-secure-storage';
import { secureStorage } from '@/services/SecureStorageService';

// Mock the SecureStorageService
vi.mock('@/services/SecureStorageService', () => ({
  secureStorage: {
    init: vi.fn().mockResolvedValue(undefined),
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    getApiKey: vi.fn(),
    setApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
  },
}));

describe('migrate-to-secure-storage', () => {
  // Store original localStorage for restoration
  const originalLocalStorage = global.localStorage;

  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    // Replace localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Reset mock implementations
    (secureStorage.init as MockedFunction<typeof secureStorage.init>).mockResolvedValue(undefined);
    (secureStorage.isEncryptionAvailable as MockedFunction<typeof secureStorage.isEncryptionAvailable>).mockReturnValue(true);
    (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockResolvedValue(null);
    (secureStorage.setApiKey as MockedFunction<typeof secureStorage.setApiKey>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('migrateToSecureStorage', () => {
    it('should migrate API keys from localStorage to secure storage', async () => {
      // Setup: API keys in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'openai_api_key':
            return 'sk-test-api-key-123';
          case 'openai_model':
            return 'gpt-4o';
          case 'openai_organization':
            return 'org-test-123';
          default:
            return null;
        }
      });

      // Mock secure storage to return null (not already migrated)
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockResolvedValue(null);

      // Mock setApiKey to verify values after migration
      const setApiKeyCalls: Array<{ key: string; value: string }> = [];
      (secureStorage.setApiKey as MockedFunction<typeof secureStorage.setApiKey>).mockImplementation(
        async (key: string, value: string) => {
          setApiKeyCalls.push({ key, value });
        }
      );

      // Mock getApiKey to return the value after it's set (for verification)
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockImplementation(
        async (key: string) => {
          const call = setApiKeyCalls.find(c => c.key === key);
          return call ? call.value : null;
        }
      );

      // Run migration
      const result = await migrateToSecureStorage();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.migratedKeys).toBe(3);
      expect(result.failedKeys).toBe(0);
      expect(result.totalKeys).toBe(3);

      // Verify secure storage was initialized
      expect(secureStorage.init).toHaveBeenCalledTimes(1);

      // Verify all keys were migrated
      expect(setApiKeyCalls).toContainEqual({ key: 'openai_api_key', value: 'sk-test-api-key-123' });
      expect(setApiKeyCalls).toContainEqual({ key: 'openai_model', value: 'gpt-4o' });
      expect(setApiKeyCalls).toContainEqual({ key: 'openai_organization', value: 'org-test-123' });

      // Verify keys were removed from localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_model');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_organization');
    });

    it('should not migrate keys that already exist in secure storage', async () => {
      // Setup: API key in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Mock secure storage to return existing value
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockResolvedValue('sk-existing-key');

      // Run migration
      const result = await migrateToSecureStorage();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.migratedKeys).toBe(0); // Not counted as migrated
      expect(result.failedKeys).toBe(0);

      // Verify setApiKey was not called
      expect(secureStorage.setApiKey).not.toHaveBeenCalled();

      // Verify key was still removed from localStorage (cleanup)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
    });

    it('should handle missing keys gracefully', async () => {
      // Setup: No keys in localStorage
      mockLocalStorage.getItem.mockReturnValue(null);

      // Run migration
      const result = await migrateToSecureStorage();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.migratedKeys).toBe(0);
      expect(result.failedKeys).toBe(0);

      // Verify setApiKey was not called
      expect(secureStorage.setApiKey).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Setup: API key in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Mock secure storage to throw error
      (secureStorage.setApiKey as MockedFunction<typeof secureStorage.setApiKey>).mockRejectedValue(
        new Error('Storage error')
      );

      // Run migration
      const result = await migrateToSecureStorage();

      // Verify results
      expect(result.success).toBe(false);
      expect(result.migratedKeys).toBe(0);
      expect(result.failedKeys).toBe(1);
      expect(result.results[0].error).toBe('Storage error');
    });

    it('should warn when encryption is not available', async () => {
      // Mock console.warn
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock encryption not available
      (secureStorage.isEncryptionAvailable as MockedFunction<typeof secureStorage.isEncryptionAvailable>).mockReturnValue(false);

      // Setup: API key in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Run migration
      await migrateToSecureStorage();

      // Verify warning was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OS-native encryption not available')
      );

      consoleSpy.mockRestore();
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // First run: migrate keys
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Mock getApiKey to return value after it's been set
      let storedValue: string | null = null;
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockImplementation(
        async () => storedValue
      );
      (secureStorage.setApiKey as MockedFunction<typeof secureStorage.setApiKey>).mockImplementation(
        async (key: string, value: string) => {
          if (key === 'openai_api_key') {
            storedValue = value;
          }
        }
      );

      const result1 = await migrateToSecureStorage();
      expect(result1.migratedKeys).toBe(1);

      // Second run: no keys to migrate
      mockLocalStorage.getItem.mockReturnValue(null);

      const result2 = await migrateToSecureStorage();
      expect(result2.migratedKeys).toBe(0);
      expect(result2.success).toBe(true);
    });
  });

  describe('isMigrationNeeded', () => {
    it('should return true when keys exist in localStorage but not in secure storage', async () => {
      // Setup: Key in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Mock secure storage to return null
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockResolvedValue(null);

      const needed = await isMigrationNeeded();
      expect(needed).toBe(true);
    });

    it('should return false when keys already exist in secure storage', async () => {
      // Setup: Key in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'openai_api_key') {return 'sk-test-api-key-123';}
        return null;
      });

      // Mock secure storage to return existing value
      (secureStorage.getApiKey as MockedFunction<typeof secureStorage.getApiKey>).mockResolvedValue('sk-existing-key');

      const needed = await isMigrationNeeded();
      expect(needed).toBe(false);
    });

    it('should return false when no keys exist', async () => {
      // No keys in localStorage
      mockLocalStorage.getItem.mockReturnValue(null);

      const needed = await isMigrationNeeded();
      expect(needed).toBe(false);
    });
  });

  describe('cleanupLocalStorage', () => {
    it('should remove all migration keys from localStorage', () => {
      cleanupLocalStorage();

      // Verify all keys were attempted to be removed
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_model');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_organization');
    });

    it('should handle errors gracefully', () => {
      // Mock removeItem to throw error
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });

      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => cleanupLocalStorage()).not.toThrow();

      // Verify errors were logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('non-browser environment', () => {
    it('should handle non-browser environment gracefully', async () => {
      // Remove localStorage completely
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await migrateToSecureStorage();
      expect(result.success).toBe(true);
      expect(result.migratedKeys).toBe(0);

      const needed = await isMigrationNeeded();
      expect(needed).toBe(false);

      // Should not throw
      expect(() => cleanupLocalStorage()).not.toThrow();
    });
  });
});