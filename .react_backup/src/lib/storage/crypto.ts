/**
 * Encryption Service for Local-First Storage
 *
 * Uses Web Crypto API for:
 * - PIN-based key derivation (PBKDF2)
 * - AES-256-GCM encryption for data at rest
 *
 * Security Notes:
 * - Encryption key is derived from user's PIN using PBKDF2
 * - Key is held in memory only while app is unlocked
 * - Salt is stored with encrypted data
 * - Each encryption operation uses a unique IV
 */

/**
 * Encryption algorithm constants
 */
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000; // Recommended minimum for 2024

/**
 * Encrypted data envelope
 */
export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded salt used for key derivation */
  salt: string;
  /** Algorithm identifier for future compatibility */
  algorithm: "aes-256-gcm";
  /** Version for migration support */
  version: 1;
}

/**
 * Encryption service state
 */
let encryptionKey: CryptoKey | null = null;
let currentSalt: Uint8Array | null = null;

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert Uint8Array to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an encryption key from a PIN using PBKDF2
 *
 * @param pin - User's PIN or passphrase
 * @param salt - Salt for key derivation (generates new if not provided)
 * @returns Derived CryptoKey and salt used
 */
async function deriveKey(
  pin: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const useSalt = salt || generateRandomBytes(SALT_LENGTH);

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive AES key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: useSalt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Not extractable for security
    ["encrypt", "decrypt"]
  );

  return { key, salt: useSalt };
}

/**
 * Initialize encryption with a PIN
 * Must be called before any encrypt/decrypt operations
 *
 * @param pin - User's PIN or passphrase
 * @param existingSalt - Optional existing salt (for unlocking existing data)
 */
export async function initializeEncryption(
  pin: string,
  existingSalt?: string
): Promise<void> {
  const salt = existingSalt ? base64ToArrayBuffer(existingSalt) : undefined;
  const result = await deriveKey(pin, salt);
  encryptionKey = result.key;
  currentSalt = result.salt;
}

/**
 * Check if encryption is initialized
 */
export function isEncryptionInitialized(): boolean {
  return encryptionKey !== null;
}

/**
 * Get the current salt (needed for storing/verifying PIN)
 */
export function getCurrentSalt(): string | null {
  return currentSalt ? arrayBufferToBase64(currentSalt) : null;
}

/**
 * Clear encryption key from memory (lock the app)
 */
export function clearEncryptionKey(): void {
  encryptionKey = null;
  // Note: currentSalt is kept for re-initialization
}

/**
 * Encrypt plaintext data
 *
 * @param plaintext - Data to encrypt
 * @returns Encrypted data envelope
 * @throws Error if encryption not initialized
 */
export async function encrypt(plaintext: string): Promise<EncryptedData> {
  if (!encryptionKey || !currentSalt) {
    throw new Error("Encryption not initialized. Call initializeEncryption first.");
  }

  const iv = generateRandomBytes(IV_LENGTH);
  const encodedData = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    encryptionKey,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(currentSalt),
    algorithm: "aes-256-gcm",
    version: 1,
  };
}

/**
 * Decrypt encrypted data
 *
 * @param encryptedData - Encrypted data envelope
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or not initialized
 */
export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  if (!encryptionKey) {
    throw new Error("Encryption not initialized. Call initializeEncryption first.");
  }

  const iv = base64ToArrayBuffer(encryptedData.iv);
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    encryptionKey,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt an object as JSON
 */
export async function encryptObject<T>(obj: T): Promise<EncryptedData> {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object
 */
export async function decryptObject<T>(encryptedData: EncryptedData): Promise<T> {
  const json = await decrypt(encryptedData);
  return JSON.parse(json) as T;
}

/**
 * Create a hash of the PIN for verification
 * This is stored to verify PIN on unlock without storing the PIN itself
 */
export async function createPinVerificationHash(
  pin: string,
  salt: Uint8Array
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive bits for verification (separate from encryption key)
  const verificationBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return arrayBufferToBase64(verificationBits);
}

/**
 * Verify a PIN against stored verification hash
 */
export async function verifyPin(
  pin: string,
  storedHash: string,
  saltBase64: string
): Promise<boolean> {
  const salt = base64ToArrayBuffer(saltBase64);
  const computedHash = await createPinVerificationHash(pin, salt);
  return computedHash === storedHash;
}

/**
 * Setup a new PIN (generates salt and verification hash)
 */
export async function setupPin(
  pin: string
): Promise<{ salt: string; verificationHash: string }> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const verificationHash = await createPinVerificationHash(pin, salt);
  const saltBase64 = arrayBufferToBase64(salt);

  // Initialize encryption with the new PIN
  await initializeEncryption(pin, saltBase64);

  return {
    salt: saltBase64,
    verificationHash,
  };
}

/**
 * Unlock with existing PIN (verifies and initializes encryption)
 */
export async function unlockWithPin(
  pin: string,
  storedHash: string,
  saltBase64: string
): Promise<boolean> {
  const isValid = await verifyPin(pin, storedHash, saltBase64);

  if (isValid) {
    await initializeEncryption(pin, saltBase64);
    return true;
  }

  return false;
}

/**
 * Check if this is a valid encrypted data envelope
 */
export function isEncryptedData(data: unknown): data is EncryptedData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.ciphertext === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.salt === "string" &&
    obj.algorithm === "aes-256-gcm" &&
    obj.version === 1
  );
}

/**
 * Try to decrypt data, returns original if not encrypted
 * Useful for backward compatibility with unencrypted data
 */
export async function decryptIfEncrypted(data: string): Promise<string> {
  try {
    const parsed = JSON.parse(data);
    if (isEncryptedData(parsed)) {
      return await decrypt(parsed);
    }
  } catch {
    // Not JSON or not encrypted, return as-is
  }
  return data;
}
