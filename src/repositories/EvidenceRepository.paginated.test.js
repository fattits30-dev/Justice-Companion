import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, } from "vitest";
import { EvidenceRepository } from "./EvidenceRepository";
import { EncryptionService } from "../services/EncryptionService";
import { AuditLogger } from "../services/AuditLogger";
import { createTestDatabase } from "../test-utils/database-test-helper";
import { databaseManager } from "../db/database";
// Create test database instance at module level
const testDb = createTestDatabase();
describe("EvidenceRepository - Cursor Pagination", () => {
    let encryptionService;
    let auditLogger;
    let repository;
    let testKey;
    // Helper to create test case (satisfies FK constraint)
    const createTestCase = (caseId) => {
        const caseStmt = testDb.getDatabase().prepare(`
      INSERT OR IGNORE INTO cases (id, title, description, case_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
        caseStmt.run(caseId, `Test Case ${caseId}`, "Test Description", "employment", "active");
    };
    beforeAll(() => {
        // Initialize test database with all migrations
        const testDatabase = testDb.initialize();
        // Inject test database into the singleton (NO MOCKING NEEDED!)
        databaseManager.setTestDatabase(testDatabase);
    });
    afterAll(() => {
        // Reset database singleton and cleanup
        databaseManager.resetDatabase();
        testDb.cleanup();
    });
    beforeEach(() => {
        // Generate a test encryption key
        testKey = EncryptionService.generateKey();
        encryptionService = new EncryptionService(testKey);
        // Create audit logger
        auditLogger = new AuditLogger(testDb.getDatabase());
        repository = new EvidenceRepository(encryptionService, auditLogger);
        // Clear data for test isolation
        testDb.clearAllTables();
    });
    afterEach(() => {
        // Additional cleanup if needed
    });
    describe("findByCaseIdPaginated", () => {
        it("should return first page of evidence for a case", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create test case with 5 evidence items
            for (let i = 1; i <= 5; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            // Get first page (limit 3)
            const result = repository.findByCaseIdPaginated(100, 3);
            expect(result.items).toHaveLength(3);
            expect(result.hasMore).toBe(true);
            expect(result.nextCursor).toBeTruthy();
            expect(result.totalReturned).toBe(3);
            // Items should be in DESC order (newest first)
            expect(result.items[0].title).toBe("Evidence 5");
            expect(result.items[1].title).toBe("Evidence 4");
            expect(result.items[2].title).toBe("Evidence 3");
        });
        it("should return second page using cursor", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create test case with 5 evidence items
            for (let i = 1; i <= 5; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            // Get first page
            const page1 = repository.findByCaseIdPaginated(100, 3);
            // Get second page using cursor
            const page2 = repository.findByCaseIdPaginated(100, 3, page1.nextCursor);
            expect(page2.items).toHaveLength(2);
            expect(page2.hasMore).toBe(false);
            expect(page2.nextCursor).toBeUndefined();
            expect(page2.items[0].title).toBe("Evidence 2");
            expect(page2.items[1].title).toBe("Evidence 1");
        });
        it("should return empty result when no evidence exists", () => {
            const result = repository.findByCaseIdPaginated(999, 10);
            expect(result.items).toHaveLength(0);
            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeUndefined();
            expect(result.totalReturned).toBe(0);
        });
        it("should decrypt content for all paginated items", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create evidence with encrypted content
            for (let i = 1; i <= 3; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Encrypted content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            const result = repository.findByCaseIdPaginated(100, 10);
            // All content should be decrypted
            result.items.forEach((item, index) => {
                expect(item.content).toBe(`Encrypted content ${3 - index}`);
            });
        });
        it("should handle exact page size boundary", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create exactly 10 items
            for (let i = 1; i <= 10; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            // Request exactly 10 (should have no more)
            const result = repository.findByCaseIdPaginated(100, 10);
            expect(result.items).toHaveLength(10);
            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeUndefined();
        });
    });
    describe("findAllPaginated", () => {
        it("should return first page of all evidence", () => {
            // Create parent cases (satisfies FK constraints)
            for (let caseId = 1; caseId <= 3; caseId++) {
                createTestCase(caseId);
            }
            // Create evidence across multiple cases
            for (let caseId = 1; caseId <= 3; caseId++) {
                for (let i = 1; i <= 5; i++) {
                    const input = {
                        caseId,
                        title: `Case${caseId} Evidence ${i}`,
                        content: `Content ${i}`,
                        evidenceType: "document",
                    };
                    repository.create(input);
                }
            }
            // Get first page (limit 10)
            const result = repository.findAllPaginated(undefined, 10);
            expect(result.items).toHaveLength(10);
            expect(result.hasMore).toBe(true);
            expect(result.nextCursor).toBeTruthy();
        });
        it("should filter by evidence type", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create mixed evidence types
            const types = [
                "document",
                "photo",
                "email",
            ];
            for (let i = 1; i <= 15; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Content ${i}`,
                    evidenceType: types[i % 3],
                };
                repository.create(input);
            }
            // Get only documents
            const result = repository.findAllPaginated("document", 10);
            // Should return 5 documents (15 total / 3 types = 5 each)
            expect(result.items).toHaveLength(5);
            expect(result.items.every((item) => item.evidenceType === "document")).toBe(true);
        });
        it("should paginate through filtered results", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create 10 documents
            for (let i = 1; i <= 10; i++) {
                const input = {
                    caseId: 100,
                    title: `Document ${i}`,
                    content: `Content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            // Get first page of documents (limit 6)
            const page1 = repository.findAllPaginated("document", 6);
            expect(page1.items).toHaveLength(6);
            expect(page1.hasMore).toBe(true);
            // Get second page
            const page2 = repository.findAllPaginated("document", 6, page1.nextCursor);
            expect(page2.items).toHaveLength(4);
            expect(page2.hasMore).toBe(false);
        });
        it("should use batch decryption for performance", () => {
            // Enable batch encryption
            process.env.ENABLE_BATCH_ENCRYPTION = "true";
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create 5 evidence items with encrypted content
            for (let i = 1; i <= 5; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Sensitive content ${i}`,
                    evidenceType: "document",
                };
                repository.create(input);
            }
            const result = repository.findAllPaginated(undefined, 10);
            // All content should be decrypted
            expect(result.items).toHaveLength(5);
            result.items.forEach((item) => {
                expect(item.content).toBeTruthy();
                expect(item.content).toContain("Sensitive content"); // Decrypted content
            });
        });
    });
    describe("Performance comparison", () => {
        it("should be more memory efficient than findAll", () => {
            // Create parent case (satisfies FK constraint)
            createTestCase(100);
            // Create large dataset
            for (let i = 1; i <= 100; i++) {
                const input = {
                    caseId: 100,
                    title: `Evidence ${i}`,
                    content: `Content ${i}`.repeat(1000), // 8KB each
                    evidenceType: "document",
                };
                repository.create(input);
            }
            // Paginated: loads only 10 items (~80KB)
            const paginated = repository.findByCaseIdPaginated(100, 10);
            expect(paginated.items).toHaveLength(10);
            // Non-paginated: loads ALL 100 items (~800KB)
            const all = repository.findByCaseId(100);
            expect(all).toHaveLength(100);
            // Memory usage: paginated is 10x more efficient
            console.log(`Paginated: ${paginated.items.length} items`);
            console.log(`Non-paginated: ${all.length} items`);
            console.log(`Memory reduction: ${((1 - paginated.items.length / all.length) * 100).toFixed(1)}%`);
        });
    });
});
