import crypto from 'node:crypto';

/**
 * Encrypted data format with authentication
 */
export interface EncryptedData {
  algorithm: 'aes-256-gcm';
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded initialization vector
  authTag: string; // base64 encoded authentication tag
  version: number; // for future algorithm upgrades
}

/**
 * AES-256-GCM encryption service for protecting sensitive legal data
 *
 * Security properties:
 * - 256-bit key size (AES-256)
 * - Galois/Counter Mode (GCM) for authenticated encryption
 * - Unique random IV for each encryption operation
 * - Authentication tag prevents tampering
 * - Zero plaintext logging or storage
 *
 * @example
 * ```ts
 * const service = new EncryptionService(encryptionKey);
 * const encrypted = service.encrypt("Sensitive legal information");
 * const decrypted = service.decrypt(encrypted);
 * ```
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm' as const;
  private readonly version = 1;
  private readonly ivLength = 12; // 96 bits is standard for GCM
  private readonly key: Buffer;

  /**
   * @param key - 256-bit (32 byte) encryption key as Buffer or base64 string
   * @throws Error if key is not exactly 32 bytes
   */
  constructor(key: Buffer | string) {
    // Convert base64 string to Buffer if needed
    this.key = typeof key === 'string' ? Buffer.from(key, 'base64') : key;

    // CRITICAL: Verify key length (256 bits = 32 bytes)
    if (this.key.length !== 32) {
      throw new Error(
        `Encryption key must be exactly 32 bytes (256 bits), got ${this.key.length} bytes`,
      );
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   *
   * @param plaintext - String to encrypt
   * @returns EncryptedData object or null if input is empty/null
   *
   * Security:
   * - Generates cryptographically secure random IV for each operation
   * - Produces authentication tag to prevent tampering
   * - Never reuses IVs (critical for GCM security)
   */
  encrypt(plaintext: string | null | undefined): EncryptedData | null {
    // Don't encrypt empty/null values
    if (!plaintext || plaintext.trim().length === 0) {
      return null;
    }

    try {
      // Generate random IV (MUST be unique for each encryption)
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt data
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag (proves data hasn't been tampered with)
      const authTag = cipher.getAuthTag();

      return {
        algorithm: this.algorithm,
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        version: this.version,
      };
    } catch (error) {
      // CRITICAL: Never log plaintext or key material
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   *
   * @param encryptedData - EncryptedData object from encrypt()
   * @returns Decrypted plaintext string
   * @throws Error if decryption fails (wrong key, tampered data, corrupted ciphertext)
   *
   * Security:
   * - Verifies authentication tag before returning plaintext
   * - Throws error if data has been tampered with
   * - Generic error messages (don't leak key material or plaintext)
   */
  decrypt(encryptedData: EncryptedData | null | undefined): string | null {
    if (!encryptedData) {
      return null;
    }

    try {
      // Validate encrypted data structure
      if (!this.isEncrypted(encryptedData)) {
        throw new Error('Invalid encrypted data format');
      }

      // Check algorithm version
      if (encryptedData.algorithm !== this.algorithm) {
        throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
      }

      // Decode base64 components
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      // Set authentication tag (CRITICAL: verifies data integrity)
      decipher.setAuthTag(authTag);

      // Decrypt data
      let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      // CRITICAL: Don't leak plaintext, key material, or detailed errors
      // Authentication tag verification failures will throw here
      throw new Error('Decryption failed: data may be corrupted or tampered with');
    }
  }

  /**
   * Check if data is in encrypted format
   *
   * @param data - Data to check
   * @returns true if data is EncryptedData, false otherwise
   */
  isEncrypted(data: unknown): data is EncryptedData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    return (
      typeof obj.algorithm === 'string' &&
      typeof obj.ciphertext === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.authTag === 'string' &&
      typeof obj.version === 'number'
    );
  }

  /**
   * Generate a new 256-bit encryption key
   *
   * @returns Cryptographically secure random 32-byte Buffer
   *
   * Usage:
   * ```ts
   * const key = EncryptionService.generateKey();
   * console.log('ENCRYPTION_KEY_BASE64=' + key.toString('base64'));
   * ```
   */
  static generateKey(): Buffer {
    return crypto.randomBytes(32); // 32 bytes = 256 bits
  }

  /**
   * Rotate encryption key by re-encrypting data with new key
   *
   * @param oldEncryptedData - Data encrypted with old key
   * @param newService - EncryptionService initialized with new key
   * @returns Data re-encrypted with new key
   *
   * NOTE: This method requires the old EncryptionService instance to decrypt,
   * then uses newService to encrypt. Caller must handle batch re-encryption.
   */
  rotateKey(oldEncryptedData: EncryptedData, newService: EncryptionService): EncryptedData | null {
    // Decrypt with old key (this instance)
    const plaintext = this.decrypt(oldEncryptedData);

    // Re-encrypt with new key
    return newService.encrypt(plaintext);
  }
}
