/**
 * SecureStorageService - Electron safeStorage wrapper for secure API key storage
 *
 * Uses OS-native encryption:
 * - Windows: DPAPI (Data Protection API)
 * - macOS: Keychain
 * - Linux: libsecret (requires gnome-keyring or similar)
 *
 * Based on industry best practices from Mattermost Desktop implementation
 *
 * @see https://www.electronjs.org/docs/latest/api/safe-storage
 */
export class SecureStorageService {
  private static instance: SecureStorageService;
  private encryptionAvailable: boolean = false;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Initialize the secure storage service
   * Checks if encryption is available on the current platform
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.encryptionAvailable = await window.justiceAPI.secureStorage.isEncryptionAvailable();

      if (!this.encryptionAvailable) {
        console.warn(
          '[SecureStorage] Encryption not available on this system. ' +
          'On Linux, please install gnome-keyring or kwallet. ' +
          'API keys will be stored without encryption as fallback.',
        );
      }

      this.initialized = true;
    } catch (error) {
      console.error('[SecureStorage] Failed to initialize:', error);
      throw new Error('Failed to initialize secure storage');
    }
  }

  /**
   * Check if encryption is available on the current platform
   */
  public isEncryptionAvailable(): boolean {
    return this.encryptionAvailable;
  }

  /**
   * Securely store an API key
   *
   * @param key - Storage key identifier (e.g., 'openai_api_key')
   * @param value - API key value to encrypt and store
   * @throws Error if storage fails
   */
  public async setApiKey(key: string, value: string): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    if (!key || !value) {
      throw new Error('Key and value are required');
    }

    try {
      await window.justiceAPI.secureStorage.set(key, value);
    } catch (error) {
      console.error(`[SecureStorage] Failed to set key "${key}":`, error);
      throw new Error(`Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a securely stored API key
   *
   * @param key - Storage key identifier
   * @returns Decrypted API key value, or null if not found
   * @throws Error if retrieval fails
   */
  public async getApiKey(key: string): Promise<string | null> {
    if (!this.initialized) {
      await this.init();
    }

    if (!key) {
      throw new Error('Key is required');
    }

    try {
      const value = await window.justiceAPI.secureStorage.get(key);
      return value || null;
    } catch (error) {
      console.error(`[SecureStorage] Failed to get key "${key}":`, error);
      throw new Error(`Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a securely stored API key
   *
   * @param key - Storage key identifier
   * @throws Error if deletion fails
   */
  public async deleteApiKey(key: string): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    if (!key) {
      throw new Error('Key is required');
    }

    try {
      await window.justiceAPI.secureStorage.delete(key);
    } catch (error) {
      console.error(`[SecureStorage] Failed to delete key "${key}":`, error);
      throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a key exists in secure storage
   *
   * @param key - Storage key identifier
   * @returns True if key exists, false otherwise
   */
  public async hasApiKey(key: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    if (!key) {
      return false;
    }

    try {
      const value = await this.getApiKey(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear all stored API keys
   * WARNING: This will delete all securely stored credentials
   */
  public async clearAll(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await window.justiceAPI.secureStorage.clearAll();
    } catch (error) {
      console.error('[SecureStorage] Failed to clear all keys:', error);
      throw new Error('Failed to clear all API keys');
    }
  }
}

// Export singleton instance
export const secureStorage = SecureStorageService.getInstance();
