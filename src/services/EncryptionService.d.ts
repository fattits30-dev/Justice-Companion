/**
 * Encrypted data format with authentication
 */
export interface EncryptedData {
    algorithm: 'aes-256-gcm';
    ciphertext: string;
    iv: string;
    authTag: string;
    version: number;
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
export declare class EncryptionService {
    private readonly algorithm;
    private readonly version;
    private readonly ivLength;
    private readonly key;
    /**
     * @param key - 256-bit (32 byte) encryption key as Buffer or base64 string
     * @throws Error if key is not exactly 32 bytes
     */
    constructor(key: Buffer | string);
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
    encrypt(plaintext: string | null | undefined): EncryptedData | null;
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
    decrypt(encryptedData: EncryptedData | null | undefined): string | null;
    /**
     * Check if data is in encrypted format
     *
     * @param data - Data to check
     * @returns true if data is EncryptedData, false otherwise
     */
    isEncrypted(data: unknown): data is EncryptedData;
    /**
     * Generate a new 256-bit encryption key
     *
     * @returns Cryptographically secure random 32-byte Buffer
     *
     * Usage:
     * ```ts
     * const key = EncryptionService.generateKey();
     * const keyBase64 = key.toString('base64');
     * // Store securely in .env file: ENCRYPTION_KEY_BASE64=<keyBase64>
     * ```
     */
    static generateKey(): Buffer;
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
    rotateKey(oldEncryptedData: EncryptedData, newService: EncryptionService): EncryptedData | null;
}
//# sourceMappingURL=EncryptionService.d.ts.map