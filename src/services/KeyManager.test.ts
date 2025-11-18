/**
 * KeyManager Security Tests
 *
 * CRITICAL: Tests for encryption key management system
 * - Validates OS-level key storage (DPAPI/Keychain/libsecret)
 * - Ensures key migration from plaintext .env works correctly
 * - Tests key rotation and security features
 *
 * Security Level: CVSS 9.1 mitigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyManager, type SafeStorageLike } from "./KeyManager";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

describe("KeyManager - Encryption Key Security", () => {
  let keyManager: KeyManager;
  let mockSafeStorage: SafeStorageLike;
  let testKeyPath: string;
  let testUserDataPath: string;

  // Test key (32 bytes = 256 bits)
  const TEST_KEY_BUFFER = crypto.randomBytes(32);
  const TEST_KEY_BASE64 = TEST_KEY_BUFFER.toString("base64");
  const ENCRYPTED_KEY = Buffer.from("mock-encrypted-key");

  beforeEach(() => {
    // Use real temp directory for integration testing
    testUserDataPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "keymanager-test-")
    );
    testKeyPath = path.join(testUserDataPath, ".encryption-key");

    // Mock safeStorage API (this is Electron-specific, can't test real implementation)
    mockSafeStorage = {
      isEncryptionAvailable: vi.fn().mockReturnValue(true),
      encryptString: vi.fn().mockReturnValue(ENCRYPTED_KEY),
      decryptString: vi.fn().mockReturnValue(TEST_KEY_BASE64),
    } as unknown as SafeStorage;

    // Create KeyManager instance
    keyManager = new KeyManager(mockSafeStorage, testUserDataPath);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(testUserDataPath)) {
      fs.rmSync(testUserDataPath, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe("getKey() - Load and Decrypt Key", () => {
    it("should load and decrypt key on first call", () => {
      // Create encrypted key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const key = keyManager.getKey();

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
      expect(key.toString("base64")).toBe(TEST_KEY_BASE64);

      // Verify safeStorage was used
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(mockSafeStorage.decryptString).toHaveBeenCalledWith(ENCRYPTED_KEY);
    });

    it("should cache key after first load", () => {
      // Create encrypted key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const key1 = keyManager.getKey();
      const key2 = keyManager.getKey();

      // Should return same buffer instance (cached)
      expect(key1).toBe(key2);

      // Should only decrypt once (cached)
      expect(mockSafeStorage.decryptString).toHaveBeenCalledTimes(1);
    });

    it("should throw error if safeStorage unavailable", () => {
      vi.mocked(mockSafeStorage.isEncryptionAvailable).mockReturnValue(false);

      expect(() => keyManager.getKey()).toThrow(
        "safeStorage encryption is not available"
      );
    });

    it("should throw error if key file does not exist", () => {
      // Don't create key file
      expect(() => keyManager.getKey()).toThrow("Encryption key not found");
    });

    it("should throw error if key is wrong length", () => {
      const invalidKey = Buffer.from("short-key");
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);
      vi.mocked(mockSafeStorage.decryptString).mockReturnValue(
        invalidKey.toString("base64")
      );

      expect(() => keyManager.getKey()).toThrow("Invalid encryption key");
      expect(() => keyManager.getKey()).toThrow("expected 32 bytes");
    });

    it("should clear invalid key from cache on error", () => {
      const invalidKey = Buffer.from("invalid");
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);
      vi.mocked(mockSafeStorage.decryptString).mockReturnValue(
        invalidKey.toString("base64")
      );

      expect(() => keyManager.getKey()).toThrow();

      // Fix the mock to return valid key
      vi.mocked(mockSafeStorage.decryptString).mockReturnValue(TEST_KEY_BASE64);

      // Should re-read from file (cache was cleared)
      const key = keyManager.getKey();
      expect(key.length).toBe(32);
    });
  });

  describe("hasKey() - Check Key Existence", () => {
    it("should return true if key file exists", () => {
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      expect(keyManager.hasKey()).toBe(true);
    });

    it("should return false if key file does not exist", () => {
      expect(keyManager.hasKey()).toBe(false);
    });
  });

  describe("migrateFromEnv() - Migrate from .env", () => {
    it("should migrate valid key from .env to safeStorage", () => {
      keyManager.migrateFromEnv(TEST_KEY_BASE64);

      // Should encrypt the key
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith(
        TEST_KEY_BASE64
      );

      // Should write encrypted key to disk
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Verify file content is encrypted
      const savedContent = fs.readFileSync(testKeyPath);
      expect(savedContent).toEqual(ENCRYPTED_KEY);
    });

    it("should throw error if safeStorage unavailable", () => {
      vi.mocked(mockSafeStorage.isEncryptionAvailable).mockReturnValue(false);

      expect(() => keyManager.migrateFromEnv(TEST_KEY_BASE64)).toThrow(
        "safeStorage encryption is not available"
      );
    });

    it("should throw error if key is invalid length", () => {
      const shortKey = Buffer.from("short").toString("base64");

      expect(() => keyManager.migrateFromEnv(shortKey)).toThrow(
        "Invalid key length"
      );
    });

    it("should validate key is exactly 32 bytes", () => {
      const key31Bytes = crypto.randomBytes(31).toString("base64");
      const key33Bytes = crypto.randomBytes(33).toString("base64");

      expect(() => keyManager.migrateFromEnv(key31Bytes)).toThrow(
        "expected 32 bytes, got 31"
      );
      expect(() => keyManager.migrateFromEnv(key33Bytes)).toThrow(
        "expected 32 bytes, got 33"
      );
    });

    it("should set file permissions to 0o600 (read/write owner only)", () => {
      keyManager.migrateFromEnv(TEST_KEY_BASE64);

      // Verify file was created
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Check file permissions (Unix-like systems only)
      if (process.platform !== "win32") {
        const stats = fs.statSync(testKeyPath);
        const mode = stats.mode & 0o777; // Extract permission bits
        expect(mode).toBe(0o600); // rw-------
      }
    });
  });

  describe("generateNewKey() - Generate Encryption Key", () => {
    it("should generate 32-byte key", () => {
      const generatedKey = keyManager.generateNewKey();

      // Should return base64 string
      expect(typeof generatedKey).toBe("string");

      // Should decode to 32 bytes
      const keyBuffer = Buffer.from(generatedKey, "base64");
      expect(keyBuffer.length).toBe(32);
    });

    it("should encrypt and store generated key", () => {
      keyManager.generateNewKey();

      // Should encrypt the key
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();

      // Should write encrypted key to disk
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Verify file content is encrypted
      const savedContent = fs.readFileSync(testKeyPath);
      expect(savedContent).toEqual(ENCRYPTED_KEY);
    });

    it("should cache generated key", () => {
      const generatedKeyBase64 = keyManager.generateNewKey();

      // Getting key should return cached key
      const retrievedKey = keyManager.getKey();

      // Should return the same key (from cache)
      expect(retrievedKey.toString("base64")).toBe(generatedKeyBase64);
    });

    it("should throw error if safeStorage unavailable", () => {
      vi.mocked(mockSafeStorage.isEncryptionAvailable).mockReturnValue(false);

      expect(() => keyManager.generateNewKey()).toThrow(
        "safeStorage encryption is not available"
      );
    });

    it("should generate cryptographically random keys", () => {
      const key1 = keyManager.generateNewKey();

      // Create new instance to avoid cache
      const keyManager2 = new KeyManager(mockSafeStorage, testUserDataPath);
      const key2 = keyManager2.generateNewKey();

      // Keys should be different (probability of collision is negligible)
      expect(key1).not.toBe(key2);
    });
  });

  describe("rotateKey() - Key Rotation", () => {
    it("should backup old key before rotation", () => {
      // Create existing key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      keyManager.rotateKey();

      // Should create backup file
      const backupFiles = fs
        .readdirSync(testUserDataPath)
        .filter((f) => f.match(/\.encryption-key\.backup\.\d+/));
      expect(backupFiles.length).toBe(1);
    });

    it("should generate new key after backup", () => {
      // Create existing key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const newKey = keyManager.rotateKey();

      // Should generate and store new key
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Should return new key
      expect(typeof newKey).toBe("string");
      expect(Buffer.from(newKey, "base64").length).toBe(32);
    });

    it("should handle missing old key gracefully", () => {
      // Don't create existing key file

      const newKey = keyManager.rotateKey();

      // Should not create backup if no old key
      const backupFiles = fs
        .readdirSync(testUserDataPath)
        .filter((f) => f.match(/\.encryption-key\.backup\.\d+/));
      expect(backupFiles.length).toBe(0);

      // Should still generate new key
      expect(newKey).toBeTruthy();
    });

    it("should include timestamp in backup filename", () => {
      // Create existing key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      keyManager.rotateKey();

      // Find backup file
      const backupFiles = fs
        .readdirSync(testUserDataPath)
        .filter((f) => f.match(/\.encryption-key\.backup\.\d+/));

      expect(backupFiles.length).toBe(1);
      // Should match pattern: .encryption-key.backup.1234567890
      expect(backupFiles[0]).toMatch(/\.encryption-key\.backup\.\d{13}/);
    });
  });

  describe("clearCache() - Memory Security", () => {
    it("should clear cached key from memory", () => {
      // Create key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      // Load key (caches it)
      const key1 = keyManager.getKey();
      const key1Base64 = key1.toString("base64"); // Save before clearing
      expect(key1).toBeTruthy();

      // Clear cache
      keyManager.clearCache();

      // Next getKey() should work (reads from file again)
      const key2 = keyManager.getKey();
      expect(key2).toBeTruthy();
      expect(key1Base64).toBe(key2.toString("base64"));
    });

    it("should overwrite key buffer before clearing", () => {
      // Create key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const key = keyManager.getKey();
      const fillSpy = vi.spyOn(key, "fill");

      keyManager.clearCache();

      // Should overwrite with zeros
      expect(fillSpy).toHaveBeenCalledWith(0);
    });

    it("should handle clearing when no key is cached", () => {
      // Should not throw error
      expect(() => keyManager.clearCache()).not.toThrow();
    });
  });

  describe("validateKeyFile() - File Validation", () => {
    it("should return valid:true if file exists and is readable", () => {
      // Create key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const result = keyManager.validateKeyFile();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid:false if file does not exist", () => {
      // Don't create key file

      const result = keyManager.validateKeyFile();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Key file does not exist");
    });

    it("should return valid:false if file is not readable", () => {
      // Create key file with no read permissions (Unix only)
      if (process.platform !== "win32") {
        fs.writeFileSync(testKeyPath, ENCRYPTED_KEY, { mode: 0o000 });

        const result = keyManager.validateKeyFile();

        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();

        // Restore permissions for cleanup
        fs.chmodSync(testKeyPath, 0o600);
      } else {
        // Windows doesn't support Unix permissions, skip this test
        expect(true).toBe(true);
      }
    });

    it("should check read permissions", () => {
      // Create key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      const result = keyManager.validateKeyFile();

      // Should succeed if file is readable
      expect(result.valid).toBe(true);
    });
  });

  describe("Security Properties", () => {
    it("should never store key in plaintext on disk", () => {
      keyManager.generateNewKey();

      // Read file content
      const savedContent = fs.readFileSync(testKeyPath);

      // Should be encrypted (equals ENCRYPTED_KEY from mock)
      expect(savedContent).toEqual(ENCRYPTED_KEY);
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();
    });

    it("should use OS-level encryption for all key operations", () => {
      // Generate new key
      keyManager.generateNewKey();

      // Should use safeStorage
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();
    });

    it("should enforce 32-byte key length consistently", () => {
      const testCases = [
        { bytes: 16, shouldFail: true, desc: "16 bytes (too short)" },
        { bytes: 24, shouldFail: true, desc: "24 bytes (too short)" },
        { bytes: 31, shouldFail: true, desc: "31 bytes (almost there)" },
        { bytes: 32, shouldFail: false, desc: "32 bytes (correct)" },
        { bytes: 33, shouldFail: true, desc: "33 bytes (too long)" },
        { bytes: 64, shouldFail: true, desc: "64 bytes (too long)" },
      ];

      testCases.forEach(({ bytes, shouldFail, desc }) => {
        const key = crypto.randomBytes(bytes).toString("base64");

        if (shouldFail) {
          expect(() => keyManager.migrateFromEnv(key), desc).toThrow();
        } else {
          expect(() => keyManager.migrateFromEnv(key), desc).not.toThrow();
        }
      });
    });

    it("should protect key file with restrictive permissions", () => {
      keyManager.generateNewKey();

      // Verify file was created
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Check file permissions (Unix only)
      if (process.platform !== "win32") {
        const stats = fs.statSync(testKeyPath);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600); // rw-------
      }
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete migration workflow", () => {
      // Step 1: Migrate from .env
      keyManager.migrateFromEnv(TEST_KEY_BASE64);

      // Verify file was created
      expect(fs.existsSync(testKeyPath)).toBe(true);

      // Step 2: Load migrated key
      const loadedKey = keyManager.getKey();

      expect(loadedKey.toString("base64")).toBe(TEST_KEY_BASE64);
    });

    it("should handle key rotation workflow", () => {
      // Create existing key
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      // Rotate key
      const newKey = keyManager.rotateKey();

      // Should create backup
      const backupFiles = fs
        .readdirSync(testUserDataPath)
        .filter((f) => f.match(/\.encryption-key\.backup\.\d+/));
      expect(backupFiles.length).toBe(1);

      // Should generate new key
      expect(newKey).toBeTruthy();
      expect(Buffer.from(newKey, "base64").length).toBe(32);

      // Should store new key
      expect(fs.existsSync(testKeyPath)).toBe(true);
    });

    it("should handle key retrieval with caching", () => {
      // Create key file
      fs.writeFileSync(testKeyPath, ENCRYPTED_KEY);

      // Load key (caches)
      const key1 = keyManager.getKey();
      const key1Base64 = key1.toString("base64"); // Save before clearing

      // Clear cache
      keyManager.clearCache();

      // Load again (re-reads from disk)
      const key2 = keyManager.getKey();

      expect(key1Base64).toBe(key2.toString("base64"));
    });
  });
});
