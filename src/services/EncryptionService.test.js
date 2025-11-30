import { describe, it, expect, beforeEach } from "vitest";
import { EncryptionService } from "./EncryptionService";
describe("EncryptionService", () => {
    let service;
    let testKey;
    beforeEach(() => {
        testKey = EncryptionService.generateKey();
        service = new EncryptionService(testKey);
    });
    describe("Core Functionality", () => {
        it("should encrypt and decrypt data correctly", () => {
            const plaintext = "Sensitive legal information";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it("should produce EncryptedData with all required fields", () => {
            const plaintext = "Test data";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            expect(encrypted).toHaveProperty("algorithm");
            expect(encrypted).toHaveProperty("ciphertext");
            expect(encrypted).toHaveProperty("iv");
            expect(encrypted).toHaveProperty("authTag");
            expect(encrypted).toHaveProperty("version");
        });
        it("should decrypt valid encrypted data successfully", () => {
            const plaintext = "Legal case notes for client XYZ";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(decrypted?.length).toBe(plaintext.length);
        });
        it("should generate 32-byte encryption key", () => {
            const key = EncryptionService.generateKey();
            expect(key).toBeInstanceOf(Buffer);
            expect(key.length).toBe(32); // 256 bits = 32 bytes
        });
        it("should correctly identify encrypted data with isEncrypted()", () => {
            const plaintext = "Test data";
            const encrypted = service.encrypt(plaintext);
            expect(service.isEncrypted(encrypted)).toBe(true);
        });
        it("should return false for non-encrypted data with isEncrypted()", () => {
            const notEncrypted = { foo: "bar" };
            expect(service.isEncrypted(notEncrypted)).toBe(false);
            const partialData = { algorithm: "aes-256-gcm", ciphertext: "test" };
            expect(service.isEncrypted(partialData)).toBe(false);
        });
    });
    describe("Security Properties", () => {
        it("should generate unique IVs for same plaintext encrypted twice", () => {
            const text = "Same plaintext for both encryptions";
            const encrypted1 = service.encrypt(text);
            const encrypted2 = service.encrypt(text);
            expect(encrypted1).not.toBeNull();
            expect(encrypted2).not.toBeNull();
            // IVs must be different (critical for GCM security)
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
            // Different IVs should produce different ciphertext
            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
            // But both should decrypt to same plaintext
            expect(service.decrypt(encrypted1)).toBe(text);
            expect(service.decrypt(encrypted2)).toBe(text);
        });
        it("should include non-empty authentication tag", () => {
            const plaintext = "Test data";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            expect(encrypted.authTag).toBeTruthy();
            expect(encrypted.authTag.length).toBeGreaterThan(0);
            // Auth tag should be base64 encoded
            const authTagBuffer = Buffer.from(encrypted.authTag, "base64");
            expect(authTagBuffer.length).toBeGreaterThan(0);
        });
        it("should detect tampered ciphertext via authentication tag", () => {
            const plaintext = "Important legal document";
            const encrypted = service.encrypt(plaintext);
            // Tamper with ciphertext
            const tamperedData = { ...encrypted };
            tamperedData.ciphertext = Buffer.from("TAMPERED_CIPHERTEXT").toString("base64");
            // Decryption should fail due to auth tag mismatch
            expect(() => service.decrypt(tamperedData)).toThrow();
            expect(() => service.decrypt(tamperedData)).toThrow(/failed/i);
        });
        it("should detect tampered authentication tag", () => {
            const plaintext = "Confidential case notes";
            const encrypted = service.encrypt(plaintext);
            // Tamper with auth tag
            const tamperedData = { ...encrypted };
            tamperedData.authTag = Buffer.from("TAMPERED_AUTH_TAG_12").toString("base64");
            // Decryption should fail
            expect(() => service.decrypt(tamperedData)).toThrow();
            expect(() => service.decrypt(tamperedData)).toThrow(/failed/i);
        });
        it("should reject 31-byte key (too short)", () => {
            const shortKey = Buffer.alloc(31); // 31 bytes instead of 32
            expect(() => new EncryptionService(shortKey)).toThrow();
            expect(() => new EncryptionService(shortKey)).toThrow(/32 bytes/i);
        });
        it("should reject 33-byte key (too long)", () => {
            const longKey = Buffer.alloc(33); // 33 bytes instead of 32
            expect(() => new EncryptionService(longKey)).toThrow();
            expect(() => new EncryptionService(longKey)).toThrow(/32 bytes/i);
        });
    });
    describe("Edge Cases", () => {
        it("should return null for empty string", () => {
            const encrypted = service.encrypt("");
            expect(encrypted).toBeNull();
        });
        it("should return null for null input to encrypt()", () => {
            const encrypted = service.encrypt(null);
            expect(encrypted).toBeNull();
        });
        it("should return null for undefined input to encrypt()", () => {
            const encrypted = service.encrypt(undefined);
            expect(encrypted).toBeNull();
        });
        it("should return null for whitespace-only string", () => {
            const encrypted = service.encrypt("   \t\n  ");
            expect(encrypted).toBeNull();
        });
        it("should return null when decrypting null", () => {
            const decrypted = service.decrypt(null);
            expect(decrypted).toBeNull();
        });
        it("should return null when decrypting undefined", () => {
            const decrypted = service.decrypt(undefined);
            expect(decrypted).toBeNull();
        });
    });
    describe("Error Handling", () => {
        it("should throw error for corrupted ciphertext", () => {
            const plaintext = "Valid data";
            const encrypted = service.encrypt(plaintext);
            // Corrupt the ciphertext with invalid base64 that decodes but fails auth
            const corruptedData = { ...encrypted };
            corruptedData.ciphertext = "AAAABBBBCCCCDDDD"; // Valid base64 but wrong data
            expect(() => service.decrypt(corruptedData)).toThrow();
        });
        it("should throw error for invalid base64 in IV", () => {
            const plaintext = "Test data";
            const encrypted = service.encrypt(plaintext);
            const invalidData = { ...encrypted };
            invalidData.iv = "not-valid-base64!!!"; // Invalid base64
            expect(() => service.decrypt(invalidData)).toThrow();
        });
        it("should throw error for invalid base64 in ciphertext", () => {
            const plaintext = "Test data";
            const encrypted = service.encrypt(plaintext);
            const invalidData = { ...encrypted };
            invalidData.ciphertext = "invalid!!!base64!!!"; // Invalid base64
            expect(() => service.decrypt(invalidData)).toThrow();
        });
        it("should throw error for missing algorithm field", () => {
            const invalidData = {
                ciphertext: "test",
                iv: "test",
                authTag: "test",
                version: 1,
            };
            expect(() => service.decrypt(invalidData)).toThrow();
            expect(() => service.decrypt(invalidData)).toThrow(/failed/i);
        });
        it("should fail gracefully when decrypting with wrong key", () => {
            const plaintext = "Secret message";
            const encrypted = service.encrypt(plaintext);
            // Create service with different key
            const wrongKey = EncryptionService.generateKey();
            const wrongService = new EncryptionService(wrongKey);
            // Should throw error
            expect(() => wrongService.decrypt(encrypted)).toThrow();
            expect(() => wrongService.decrypt(encrypted)).toThrow(/failed/i);
        });
        it("should throw error for malformed EncryptedData object", () => {
            const malformedData = {
                algorithm: "aes-256-gcm",
                ciphertext: "test",
                // missing iv, authTag, version
            };
            expect(() => service.decrypt(malformedData)).toThrow();
        });
    });
    describe("Key Rotation", () => {
        it("should successfully re-encrypt data with new key using rotateKey()", () => {
            const plaintext = "Legal document requiring key rotation";
            const encrypted = service.encrypt(plaintext);
            // Create new service with new key
            const newKey = EncryptionService.generateKey();
            const newService = new EncryptionService(newKey);
            // Rotate key
            const reEncrypted = service.rotateKey(encrypted, newService);
            expect(reEncrypted).not.toBeNull();
            expect(reEncrypted.iv).not.toBe(encrypted.iv); // New IV
            expect(reEncrypted.ciphertext).not.toBe(encrypted.ciphertext); // New ciphertext
            // New service should be able to decrypt
            const decrypted = newService.decrypt(reEncrypted);
            expect(decrypted).toBe(plaintext);
        });
        it("should prevent old service from decrypting data encrypted with new key", () => {
            const plaintext = "Data to rotate";
            const encrypted = service.encrypt(plaintext);
            // Create new service with new key
            const newKey = EncryptionService.generateKey();
            const newService = new EncryptionService(newKey);
            // Rotate key
            const reEncrypted = service.rotateKey(encrypted, newService);
            // Old service should NOT be able to decrypt new encrypted data
            expect(() => service.decrypt(reEncrypted)).toThrow();
        });
    });
    describe("Data Format Validation", () => {
        it("should have correct algorithm value in EncryptedData", () => {
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted.algorithm).toBe("aes-256-gcm");
        });
        it("should have correct version number in EncryptedData", () => {
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted.version).toBe(1);
            expect(typeof encrypted.version).toBe("number");
        });
        it("should produce base64 encoded ciphertext", () => {
            const plaintext = "Test data for base64 validation";
            const encrypted = service.encrypt(plaintext);
            // Should be valid base64
            expect(() => Buffer.from(encrypted.ciphertext, "base64")).not.toThrow();
            // Should decode to non-empty buffer
            const decoded = Buffer.from(encrypted.ciphertext, "base64");
            expect(decoded.length).toBeGreaterThan(0);
        });
        it("should produce base64 encoded IV", () => {
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            // Should be valid base64
            expect(() => Buffer.from(encrypted.iv, "base64")).not.toThrow();
            // IV should be exactly 12 bytes (96 bits) when decoded
            const ivBuffer = Buffer.from(encrypted.iv, "base64");
            expect(ivBuffer.length).toBe(12);
        });
        it("should produce base64 encoded auth tag", () => {
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            // Should be valid base64
            expect(() => Buffer.from(encrypted.authTag, "base64")).not.toThrow();
            // Auth tag should be 16 bytes (128 bits) for GCM
            const authTagBuffer = Buffer.from(encrypted.authTag, "base64");
            expect(authTagBuffer.length).toBe(16);
        });
    });
    describe("Large Data Handling", () => {
        it("should encrypt and decrypt 1KB of text successfully", () => {
            // Create 1KB of text
            const plaintext = "A".repeat(1024);
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(decrypted?.length).toBe(1024);
        });
        it("should encrypt and decrypt 100KB of text successfully", () => {
            // Create 100KB of text
            const plaintext = "B".repeat(100 * 1024);
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(decrypted?.length).toBe(100 * 1024);
        });
        it("should encrypt and decrypt 1MB of text successfully (large legal documents)", () => {
            // Create 1MB of text (simulating large legal document)
            const plaintext = "C".repeat(1024 * 1024);
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(decrypted?.length).toBe(1024 * 1024);
        });
    });
    describe("Constructor Key Handling", () => {
        it("should accept Buffer key in constructor", () => {
            const key = EncryptionService.generateKey();
            expect(() => new EncryptionService(key)).not.toThrow();
            const service = new EncryptionService(key);
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            expect(service.decrypt(encrypted)).toBe(plaintext);
        });
        it("should accept base64 string key in constructor", () => {
            const key = EncryptionService.generateKey();
            const base64Key = key.toString("base64");
            expect(() => new EncryptionService(base64Key)).not.toThrow();
            const service = new EncryptionService(base64Key);
            const plaintext = "Test";
            const encrypted = service.encrypt(plaintext);
            expect(service.decrypt(encrypted)).toBe(plaintext);
        });
        it("should create equivalent services from Buffer and base64 string", () => {
            const key = EncryptionService.generateKey();
            const base64Key = key.toString("base64");
            const service1 = new EncryptionService(key);
            const service2 = new EncryptionService(base64Key);
            const plaintext = "Test cross-compatibility";
            const encrypted = service1.encrypt(plaintext);
            // Service2 should be able to decrypt data encrypted by service1
            expect(service2.decrypt(encrypted)).toBe(plaintext);
        });
    });
    describe("Special Characters and Unicode", () => {
        it("should handle special characters correctly", () => {
            const plaintext = 'Test with special chars: !@#$%^&*()_+-={}[]|:;"<>?,./';
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it("should handle unicode characters correctly", () => {
            const plaintext = "Unicode test: 你好世界 مرحبا العالم Здравствуй мир";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it("should handle emojis correctly", () => {
            const plaintext = "Legal case with emojis: ⚖️ 📄 ✅ ❌ 🏛️";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it("should handle newlines and tabs", () => {
            const plaintext = "Multi-line\ntext\twith\ttabs\nand\nnewlines";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted).not.toBeNull();
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });
    describe("isEncrypted() Type Guard", () => {
        it("should return false for null", () => {
            expect(service.isEncrypted(null)).toBe(false);
        });
        it("should return false for undefined", () => {
            expect(service.isEncrypted(undefined)).toBe(false);
        });
        it("should return false for string", () => {
            expect(service.isEncrypted("test")).toBe(false);
        });
        it("should return false for number", () => {
            expect(service.isEncrypted(123)).toBe(false);
        });
        it("should return false for array", () => {
            expect(service.isEncrypted([])).toBe(false);
        });
        it("should return false for object missing required fields", () => {
            expect(service.isEncrypted({
                algorithm: "aes-256-gcm",
                ciphertext: "test",
            })).toBe(false);
        });
        it("should return false for object with wrong field types", () => {
            expect(service.isEncrypted({
                algorithm: "aes-256-gcm",
                ciphertext: "test",
                iv: "test",
                authTag: 123, // Should be string
                version: 1,
            })).toBe(false);
        });
    });
});
