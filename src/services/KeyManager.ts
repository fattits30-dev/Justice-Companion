/**
 * Secure Key Management using Electron safeStorage
 *
 * SECURITY: Replaces plaintext .env key storage with OS-level encryption
 * - Windows: DPAPI (Data Protection API)
 * - macOS: Keychain
 * - Linux: Secret Service API (libsecret)
 *
 * Fixes CVSS 9.1 vulnerability: Encryption key in plaintext .env file
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { logger } from "../utils/logger.ts";

/**
 * Minimal interface for safeStorage-compatible implementations.
 * Electron's safeStorage API conforms to this shape, but this
 * interface avoids a hard dependency on the electron module.
 */
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

/**
 * KeyManager handles secure storage and retrieval of encryption keys
 * using Electron's safeStorage API for OS-level encryption
 */
export class KeyManager {
  private readonly safeStorage: SafeStorageLike;
  private readonly keyFilePath: string;
  private cachedKey: Buffer | null = null;

  /**
   * @param safeStorage - Implementation of SafeStorageLike
   * @param userDataPath - Base directory for storing key material
   */
  constructor(safeStorage: SafeStorageLike, userDataPath: string) {
    this.safeStorage = safeStorage;
    // Store encrypted key in userData directory
    this.keyFilePath = path.join(userDataPath, ".encryption-key");
  }

  /**
   * Get encryption key (loads and decrypts on first call, then caches)
   *
   * @returns 32-byte encryption key as Buffer
   * @throws Error if key doesn't exist or safeStorage unavailable
   */
  getKey(): Buffer {
    // Return cached key if available
    if (this.cachedKey) {
      return this.cachedKey;
    }

    // Check if safeStorage is available
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "safeStorage encryption is not available on this system. " +
          "Key cannot be securely loaded."
      );
    }

    // Load encrypted key from disk
    if (!fs.existsSync(this.keyFilePath)) {
      throw new Error(
        "Encryption key not found. Run migration script to move key from .env to safeStorage."
      );
    }

    const encryptedKey = fs.readFileSync(this.keyFilePath);

    // Decrypt using OS keychain
    const decryptedKeyBase64 = this.safeStorage.decryptString(encryptedKey);
    this.cachedKey = Buffer.from(decryptedKeyBase64, "base64");

    // Verify key length
    if (this.cachedKey.length !== 32) {
      const actualLength = this.cachedKey.length;
      this.cachedKey = null; // Clear invalid key
      throw new Error(
        `Invalid encryption key: expected 32 bytes, got ${actualLength} bytes`
      );
    }

    return this.cachedKey;
  }

  /**
   * Check if encryption key exists in safeStorage
   */
  hasKey(): boolean {
    return fs.existsSync(this.keyFilePath);
  }

  /**
   * Migrate key from .env to safeStorage
   *
   * @param envKey - ENCRYPTION_KEY_BASE64 from .env file
   * @throws Error if safeStorage unavailable or key invalid
   */
  migrateFromEnv(envKey: string): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "safeStorage encryption is not available. Cannot migrate key."
      );
    }

    // Validate key format
    const keyBuffer = Buffer.from(envKey, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error(
        `Invalid key length: expected 32 bytes, got ${keyBuffer.length} bytes`
      );
    }

    // Encrypt key using OS keychain
    const encryptedKey = this.safeStorage.encryptString(envKey);

    // Write encrypted key to disk
    fs.writeFileSync(this.keyFilePath, encryptedKey, { mode: 0o600 });

    logger.warn("[KeyManager] Key migrated from .env to safeStorage");
    logger.warn(
      "[KeyManager] IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file"
    );
  }

  /**
   * Generate and store a new encryption key
   *
   * WARNING: This will replace existing key. Ensure all data is backed up.
   *
   * @returns The generated key as base64 string
   */
  generateNewKey(): string {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "safeStorage encryption is not available. Cannot generate key."
      );
    }

    // Generate cryptographically secure 32-byte key
    const newKey = crypto.randomBytes(32);
    const newKeyBase64 = newKey.toString("base64");

    // Encrypt and store
    const encryptedKey = this.safeStorage.encryptString(newKeyBase64);
    fs.writeFileSync(this.keyFilePath, encryptedKey, { mode: 0o600 });

    // Update cache
    this.cachedKey = newKey;

    logger.warn("[KeyManager] New encryption key generated and stored");
    return newKeyBase64;
  }

  /**
   * Rotate encryption key (for security best practices)
   *
   * NOTE: Caller must re-encrypt all data with new key
   *
   * @returns New key as base64 string
   */
  rotateKey(): string {
    // Backup old encrypted key
    if (fs.existsSync(this.keyFilePath)) {
      const backupPath = `${this.keyFilePath}.backup.${Date.now()}`;
      fs.copyFileSync(this.keyFilePath, backupPath);
      logger.warn(`[KeyManager] Old key backed up to: ${backupPath}`);
    }

    // Generate new key
    return this.generateNewKey();
  }

  /**
   * Clear cached key from memory (for security)
   */
  clearCache(): void {
    if (this.cachedKey) {
      // Overwrite memory before clearing
      this.cachedKey.fill(0);
      this.cachedKey = null;
    }
  }

  /**
   * Check if key file exists and is readable
   */
  validateKeyFile(): { valid: boolean; error?: string } {
    if (!fs.existsSync(this.keyFilePath)) {
      return { valid: false, error: "Key file does not exist" };
    }

    try {
      fs.accessSync(this.keyFilePath, fs.constants.R_OK);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Key file is not readable: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Store an arbitrary key-value pair securely
   * (For API keys, tokens, etc.)
   *
   * @param keyName - Identifier for the key (e.g., 'ai-provider-openai')
   * @param value - The secret value to store
   */
  async storeKey(keyName: string, value: string): Promise<void> {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "safeStorage encryption is not available. Cannot store key."
      );
    }

    // Encrypt the value
    const encryptedValue = this.safeStorage.encryptString(value);

    // Create keys directory if it doesn't exist
    const keysDir = path.join(path.dirname(this.keyFilePath), ".keys");
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { mode: 0o700, recursive: true });
    }

    // Write encrypted key to file
    const keyFile = path.join(keysDir, `${keyName}.key`);
    fs.writeFileSync(keyFile, encryptedValue, { mode: 0o600 });
  }

  /**
   * Retrieve a stored key
   *
   * @param keyName - Identifier for the key
   * @returns The decrypted value, or null if not found
   */
  async retrieveKey(keyName: string): Promise<string | null> {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "safeStorage encryption is not available. Cannot retrieve key."
      );
    }

    const keysDir = path.join(path.dirname(this.keyFilePath), ".keys");
    const keyFile = path.join(keysDir, `${keyName}.key`);

    if (!fs.existsSync(keyFile)) {
      return null;
    }

    try {
      const encryptedValue = fs.readFileSync(keyFile);
      const decryptedValue = this.safeStorage.decryptString(encryptedValue);
      return decryptedValue;
    } catch (error) {
      logger.error(`[KeyManager] Failed to decrypt key ${keyName}:`, error);
      return null;
    }
  }

  /**
   * Delete a stored key
   *
   * @param keyName - Identifier for the key to delete
   */
  async deleteKey(keyName: string): Promise<void> {
    const keysDir = path.join(path.dirname(this.keyFilePath), ".keys");
    const keyFile = path.join(keysDir, `${keyName}.key`);

    if (fs.existsSync(keyFile)) {
      fs.unlinkSync(keyFile);
    }
  }

  /**
   * Check if a key exists
   *
   * @param keyName - Identifier for the key
   */
  hasStoredKey(keyName: string): boolean {
    const keysDir = path.join(path.dirname(this.keyFilePath), ".keys");
    const keyFile = path.join(keysDir, `${keyName}.key`);
    return fs.existsSync(keyFile);
  }
}
