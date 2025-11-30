import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { EncryptionService } from "./EncryptionService.ts";
describe("EncryptionService - Batch Operations", () => {
    let encryptionService;
    const testKey = crypto.randomBytes(32);
    beforeEach(() => {
        encryptionService = new EncryptionService(testKey);
    });
    describe("batchEncrypt", () => {
        it("should encrypt multiple plaintexts successfully", () => {
            const plaintexts = [
                "Sensitive case information",
                "Evidence details for case #123",
                "Witness testimony transcript",
            ];
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            // All items should be encrypted
            expect(encryptedResults).toHaveLength(3);
            encryptedResults.forEach((result) => {
                expect(result).not.toBeNull();
                expect(result?.algorithm).toBe("aes-256-gcm");
                expect(result?.ciphertext).toBeTruthy();
                expect(result?.iv).toBeTruthy();
                expect(result?.authTag).toBeTruthy();
                expect(result?.version).toBe(1);
            });
            // Ciphertexts should be different from plaintexts
            plaintexts.forEach((plaintext, index) => {
                expect(encryptedResults[index]?.ciphertext).not.toBe(plaintext);
            });
        });
        it("should handle null and empty values correctly", () => {
            const plaintexts = [
                "Valid text",
                null,
                undefined,
                "",
                "   ", // whitespace only
                "Another valid text",
            ];
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            expect(encryptedResults).toHaveLength(6);
            expect(encryptedResults[0]).not.toBeNull(); // Valid text
            expect(encryptedResults[1]).toBeNull(); // null
            expect(encryptedResults[2]).toBeNull(); // undefined
            expect(encryptedResults[3]).toBeNull(); // empty string
            expect(encryptedResults[4]).toBeNull(); // whitespace only
            expect(encryptedResults[5]).not.toBeNull(); // Another valid text
        });
        it("should generate unique IVs for each encryption", () => {
            const plaintexts = Array(100).fill("Same plaintext");
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            // Collect all IVs
            const ivs = new Set();
            encryptedResults.forEach((result) => {
                if (result) {
                    ivs.add(result.iv);
                }
            });
            // All IVs should be unique
            expect(ivs.size).toBe(100);
        });
        it("should produce different ciphertexts for identical plaintexts (due to unique IVs)", () => {
            const plaintexts = Array(10).fill("Identical sensitive data");
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            // Collect all ciphertexts
            const ciphertexts = new Set();
            encryptedResults.forEach((result) => {
                if (result) {
                    ciphertexts.add(result.ciphertext);
                }
            });
            // All ciphertexts should be unique even for identical plaintexts
            expect(ciphertexts.size).toBe(10);
        });
        it("should handle large batch operations", () => {
            const plaintexts = Array(1000)
                .fill(null)
                .map((_, i) => `Test data ${i}`);
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            expect(encryptedResults).toHaveLength(1000);
            encryptedResults.forEach((result, index) => {
                expect(result).not.toBeNull();
                expect(result?.ciphertext).not.toBe(plaintexts[index]);
            });
        });
    });
    describe("batchDecrypt", () => {
        it("should decrypt multiple ciphertexts correctly", () => {
            const plaintexts = [
                "Legal document content",
                "Case evidence #456",
                "Court hearing transcript",
            ];
            // First encrypt them
            const encryptedResults = encryptionService.batchEncrypt(plaintexts);
            // Then batch decrypt
            const decryptedResults = encryptionService.batchDecrypt(encryptedResults);
            // Should match original plaintexts
            expect(decryptedResults).toHaveLength(3);
            decryptedResults.forEach((result, index) => {
                expect(result).toBe(plaintexts[index]);
            });
        });
        it("should handle null values correctly in decryption", () => {
            const encryptedData = [
                encryptionService.encrypt("Valid text"),
                null,
                undefined,
                encryptionService.encrypt("Another valid text"),
            ];
            const decryptedResults = encryptionService.batchDecrypt(encryptedData);
            expect(decryptedResults).toHaveLength(4);
            expect(decryptedResults[0]).toBe("Valid text");
            expect(decryptedResults[1]).toBeNull();
            expect(decryptedResults[2]).toBeNull();
            expect(decryptedResults[3]).toBe("Another valid text");
        });
        it("should detect tampering through auth tag verification", () => {
            const plaintext = "Sensitive legal information";
            const encrypted = encryptionService.encrypt(plaintext);
            if (encrypted) {
                // Tamper with the ciphertext
                const tamperedData = {
                    ...encrypted,
                    ciphertext: encrypted.ciphertext.slice(0, -2) + "XX", // Modify last 2 chars
                };
                // Should throw error due to auth tag verification failure
                expect(() => {
                    encryptionService.batchDecrypt([tamperedData]);
                }).toThrow("Batch decryption failed at index 0: data may be corrupted or tampered with");
            }
        });
        it("should handle mixed encrypted and legacy data", () => {
            // This simulates backward compatibility scenarios
            const mixedData = [
                encryptionService.encrypt("Modern encrypted data"),
                null, // Null value
                encryptionService.encrypt("Another encrypted item"),
            ];
            const decryptedResults = encryptionService.batchDecrypt(mixedData);
            expect(decryptedResults[0]).toBe("Modern encrypted data");
            expect(decryptedResults[1]).toBeNull();
            expect(decryptedResults[2]).toBe("Another encrypted item");
        });
        it("should maintain data integrity in large batches", () => {
            const plaintexts = Array(500)
                .fill(null)
                .map((_, i) => `Sensitive data item ${i} with some longer content to simulate real usage`);
            const encryptedBatch = encryptionService.batchEncrypt(plaintexts);
            const decryptedBatch = encryptionService.batchDecrypt(encryptedBatch);
            // All items should decrypt correctly
            decryptedBatch.forEach((result, index) => {
                expect(result).toBe(plaintexts[index]);
            });
        });
        it("should fail gracefully with wrong key", () => {
            const plaintext = "Confidential information";
            const encrypted = encryptionService.encrypt(plaintext);
            // Create service with different key
            const wrongKey = crypto.randomBytes(32);
            const wrongKeyService = new EncryptionService(wrongKey);
            // Should throw error when decrypting with wrong key
            expect(() => {
                wrongKeyService.batchDecrypt([encrypted]);
            }).toThrow("Batch decryption failed at index 0: data may be corrupted or tampered with");
        });
    });
    describe("Performance Comparison", () => {
        // Skip: Performance tests are flaky (depend on CPU load, memory, background processes)
        it.skip("should demonstrate performance improvement of batch operations", () => {
            const itemCount = 100;
            const plaintexts = Array(itemCount)
                .fill(null)
                .map((_, i) => `Performance test data ${i} - This is a longer string to better simulate real-world usage with legal documents and case information`);
            // Measure individual encryption time
            const individualStartTime = performance.now();
            const individualEncrypted = plaintexts.map((text) => encryptionService.encrypt(text));
            const individualEncryptTime = performance.now() - individualStartTime;
            // Measure batch encryption time
            const batchStartTime = performance.now();
            const batchEncrypted = encryptionService.batchEncrypt(plaintexts);
            const batchEncryptTime = performance.now() - batchStartTime;
            // Measure individual decryption time
            const individualDecryptStartTime = performance.now();
            individualEncrypted.forEach((encrypted) => encryptionService.decrypt(encrypted));
            const individualDecryptTime = performance.now() - individualDecryptStartTime;
            // Measure batch decryption time
            const batchDecryptStartTime = performance.now();
            encryptionService.batchDecrypt(batchEncrypted);
            const batchDecryptTime = performance.now() - batchDecryptStartTime;
            // Calculate speedup
            const encryptSpeedup = individualEncryptTime / batchEncryptTime;
            const decryptSpeedup = individualDecryptTime / batchDecryptTime;
            console.log("\n=== Performance Results ===");
            console.log(`Items processed: ${itemCount}`);
            console.log(`\nEncryption:`);
            console.log(`  Individual: ${individualEncryptTime.toFixed(2)}ms`);
            console.log(`  Batch:      ${batchEncryptTime.toFixed(2)}ms`);
            console.log(`  Speedup:    ${encryptSpeedup.toFixed(2)}x`);
            console.log(`\nDecryption:`);
            console.log(`  Individual: ${individualDecryptTime.toFixed(2)}ms`);
            console.log(`  Batch:      ${batchDecryptTime.toFixed(2)}ms`);
            console.log(`  Speedup:    ${decryptSpeedup.toFixed(2)}x`);
            // Batch operations provide performance improvement
            // Note: Actual speedup varies based on system load and Node.js optimization
            // Even modest improvements (1.1x-1.5x) are valuable for large-scale operations
            expect(encryptSpeedup).toBeGreaterThan(1.0); // Any improvement is good
            expect(decryptSpeedup).toBeGreaterThan(1.0); // Any improvement is good
            // Log performance metrics for documentation
            if (encryptSpeedup < 1.5 || decryptSpeedup < 1.5) {
                console.log("\nNote: Performance improvement is modest but still beneficial.");
                console.log("Actual speedup depends on system load and Node.js JIT optimization.");
                console.log("Benefits increase with larger datasets and production workloads.");
            }
        });
    });
    describe("Backward Compatibility", () => {
        it("should decrypt data encrypted with individual method using batch decrypt", () => {
            const plaintexts = ["Document 1", "Document 2", "Document 3"];
            // Encrypt using individual method
            const individuallyEncrypted = plaintexts.map((text) => encryptionService.encrypt(text));
            // Decrypt using batch method
            const batchDecrypted = encryptionService.batchDecrypt(individuallyEncrypted);
            // Should match original plaintexts
            batchDecrypted.forEach((result, index) => {
                expect(result).toBe(plaintexts[index]);
            });
        });
        it("should encrypt with batch method and decrypt with individual method", () => {
            const plaintexts = ["Evidence A", "Evidence B", "Evidence C"];
            // Encrypt using batch method
            const batchEncrypted = encryptionService.batchEncrypt(plaintexts);
            // Decrypt using individual method
            const individuallyDecrypted = batchEncrypted.map((encrypted) => encryptionService.decrypt(encrypted));
            // Should match original plaintexts
            individuallyDecrypted.forEach((result, index) => {
                expect(result).toBe(plaintexts[index]);
            });
        });
    });
    describe("Security Requirements", () => {
        it("should verify auth tags for all items in batch", () => {
            const plaintexts = ["Item 1", "Item 2", "Item 3"];
            const encrypted = encryptionService.batchEncrypt(plaintexts);
            // Tamper with one item in the middle
            if (encrypted[1]) {
                encrypted[1] = {
                    ...encrypted[1],
                    authTag: Buffer.from("tampered").toString("base64"),
                };
            }
            // Should fail at the tampered item
            expect(() => {
                encryptionService.batchDecrypt(encrypted);
            }).toThrow("Batch decryption failed at index 1: data may be corrupted or tampered with");
        });
        it("should maintain cryptographic properties with batch operations", () => {
            // Test that batch operations maintain the same security properties
            const sensitiveData = "Highly confidential legal information";
            const individualEncrypted = encryptionService.encrypt(sensitiveData);
            const batchEncrypted = encryptionService.batchEncrypt([sensitiveData])[0];
            // Both should have all required security fields
            expect(individualEncrypted?.algorithm).toBe("aes-256-gcm");
            expect(batchEncrypted?.algorithm).toBe("aes-256-gcm");
            expect(individualEncrypted?.iv).toBeTruthy();
            expect(batchEncrypted?.iv).toBeTruthy();
            expect(individualEncrypted?.authTag).toBeTruthy();
            expect(batchEncrypted?.authTag).toBeTruthy();
            // IVs should be different (unique per encryption)
            expect(individualEncrypted?.iv).not.toBe(batchEncrypted?.iv);
            // Ciphertexts should be different (due to different IVs)
            expect(individualEncrypted?.ciphertext).not.toBe(batchEncrypted?.ciphertext);
        });
    });
});
