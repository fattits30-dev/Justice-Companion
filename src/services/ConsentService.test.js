/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConsentService } from "./ConsentService";
import { ConsentRepository } from "../repositories/ConsentRepository";
import { AuditLogger } from "./AuditLogger";
import { TestDatabaseHelper } from "../test-utils/database-test-helper";
import { databaseManager } from "../db/database";
describe("ConsentService", () => {
    let consentService;
    let consentRepository;
    let auditLogger;
    let testDb;
    const TEST_USER_ID = 1;
    beforeEach(() => {
        testDb = new TestDatabaseHelper();
        const db = testDb.initialize();
        // Inject test database into singleton
        databaseManager.setTestDatabase(db);
        // Create test users (needed for foreign key constraints)
        db.prepare(`
      INSERT INTO users (id, username, email, password_hash, password_salt, role)
      VALUES (1, 'testuser1', 'test1@example.com', 'hash1', 'salt1', 'user'),
             (2, 'testuser2', 'test2@example.com', 'hash2', 'salt2', 'user'),
             (3, 'testuser3', 'test3@example.com', 'hash3', 'salt3', 'user')
    `).run();
        auditLogger = new AuditLogger(db);
        auditLogger.getAllLogs = () => {
            return db.prepare("SELECT * FROM audit_logs ORDER BY created_at").all();
        };
        consentRepository = new ConsentRepository();
        consentService = new ConsentService(consentRepository, auditLogger);
    });
    afterEach(() => {
        testDb.clearAllTables();
        testDb.cleanup();
        databaseManager.resetDatabase();
    });
    describe("grantConsent()", () => {
        it("should grant consent for data_processing", () => {
            const consent = consentService.grantConsent(TEST_USER_ID, "data_processing");
            expect(consent).toBeDefined();
            expect(consent.userId).toBe(TEST_USER_ID);
            expect(consent.consentType).toBe("data_processing");
            expect(consent.granted).toBe(true);
            expect(consent.revokedAt).toBeNull();
            expect(consent.version).toBe("1.0");
        });
        it("should grant consent for all consent types", () => {
            const types = [
                "data_processing",
                "encryption",
                "ai_processing",
                "marketing",
            ];
            types.forEach((type) => {
                const consent = consentService.grantConsent(TEST_USER_ID, type);
                expect(consent.consentType).toBe(type);
                expect(consent.granted).toBe(true);
            });
        });
        it("should log consent granted event", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            const logs = auditLogger.getAllLogs();
            const grantLog = logs.find((log) => log.event_type === "consent.granted");
            expect(grantLog).toBeDefined();
            expect(grantLog.success).toBe(1); // SQLite stores booleans as 1/0
            expect(grantLog.user_id).toBe(TEST_USER_ID.toString());
            expect(JSON.parse(grantLog.details).consentType).toBe("encryption");
        });
        it("should set granted_at timestamp", () => {
            const beforeTime = new Date().getTime();
            const consent = consentService.grantConsent(TEST_USER_ID, "ai_processing");
            const afterTime = new Date().getTime();
            expect(consent.grantedAt).toBeTruthy();
            const grantedTime = new Date(consent.grantedAt).getTime();
            expect(grantedTime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s tolerance
            expect(grantedTime).toBeLessThanOrEqual(afterTime + 1000);
        });
    });
    describe("revokeConsent()", () => {
        beforeEach(() => {
            // Grant consent first so we can revoke it
            consentService.grantConsent(TEST_USER_ID, "marketing");
        });
        it("should revoke active consent", () => {
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const hasConsent = consentService.hasConsent(TEST_USER_ID, "marketing");
            expect(hasConsent).toBe(false);
        });
        it("should log consent revoked event", () => {
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const logs = auditLogger.getAllLogs();
            const revokeLog = logs.find((log) => log.event_type === "consent.revoked");
            expect(revokeLog).toBeDefined();
            expect(revokeLog.success).toBe(1);
            expect(JSON.parse(revokeLog.details).consentType).toBe("marketing");
        });
        it("should handle revoking non-existent consent gracefully", () => {
            // Should not throw error
            expect(() => {
                consentService.revokeConsent(TEST_USER_ID, "ai_processing");
            }).not.toThrow();
        });
        it("should set revoked_at timestamp", () => {
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const consents = consentService.getUserConsents(TEST_USER_ID);
            const revokedConsent = consents.find((c) => c.consentType === "marketing");
            expect(revokedConsent).toBeDefined();
            expect(revokedConsent.revokedAt).not.toBeNull();
            expect(revokedConsent.revokedAt).toBeTruthy();
            // Verify it's a valid ISO timestamp
            const revokedDate = new Date(revokedConsent.revokedAt);
            expect(revokedDate.toISOString()).toBeTruthy();
        });
    });
    describe("hasConsent()", () => {
        it("should return true for granted consent", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            const hasConsent = consentService.hasConsent(TEST_USER_ID, "encryption");
            expect(hasConsent).toBe(true);
        });
        it("should return false for non-existent consent", () => {
            const hasConsent = consentService.hasConsent(TEST_USER_ID, "ai_processing");
            expect(hasConsent).toBe(false);
        });
        it("should return false for revoked consent", () => {
            consentService.grantConsent(TEST_USER_ID, "marketing");
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const hasConsent = consentService.hasConsent(TEST_USER_ID, "marketing");
            expect(hasConsent).toBe(false);
        });
        it("should distinguish between different users", () => {
            consentService.grantConsent(1, "encryption");
            consentService.grantConsent(2, "marketing");
            expect(consentService.hasConsent(1, "encryption")).toBe(true);
            expect(consentService.hasConsent(1, "marketing")).toBe(false);
            expect(consentService.hasConsent(2, "encryption")).toBe(false);
            expect(consentService.hasConsent(2, "marketing")).toBe(true);
        });
    });
    describe("getUserConsents()", () => {
        it("should return all consents for user", () => {
            consentService.grantConsent(TEST_USER_ID, "data_processing");
            consentService.grantConsent(TEST_USER_ID, "encryption");
            const consents = consentService.getUserConsents(TEST_USER_ID);
            expect(consents).toHaveLength(2);
            expect(consents.map((c) => c.consentType)).toContain("data_processing");
            expect(consents.map((c) => c.consentType)).toContain("encryption");
        });
        it("should return empty array for user with no consents", () => {
            const consents = consentService.getUserConsents(TEST_USER_ID);
            expect(consents).toEqual([]);
        });
        it("should include both active and revoked consents", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            consentService.grantConsent(TEST_USER_ID, "marketing");
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const consents = consentService.getUserConsents(TEST_USER_ID);
            expect(consents).toHaveLength(2);
            const encryptionConsent = consents.find((c) => c.consentType === "encryption");
            const marketingConsent = consents.find((c) => c.consentType === "marketing");
            expect(encryptionConsent.revokedAt).toBeNull();
            expect(marketingConsent.revokedAt).not.toBeNull();
        });
    });
    describe("hasRequiredConsents()", () => {
        it("should return true when data_processing consent is granted", () => {
            consentService.grantConsent(TEST_USER_ID, "data_processing");
            const hasRequired = consentService.hasRequiredConsents(TEST_USER_ID);
            expect(hasRequired).toBe(true);
        });
        it("should return false when data_processing consent is not granted", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            consentService.grantConsent(TEST_USER_ID, "marketing");
            const hasRequired = consentService.hasRequiredConsents(TEST_USER_ID);
            expect(hasRequired).toBe(false);
        });
        it("should return false when data_processing consent is revoked", () => {
            consentService.grantConsent(TEST_USER_ID, "data_processing");
            consentService.revokeConsent(TEST_USER_ID, "data_processing");
            const hasRequired = consentService.hasRequiredConsents(TEST_USER_ID);
            expect(hasRequired).toBe(false);
        });
    });
    describe("grantAllConsents()", () => {
        it("should grant all four consent types", () => {
            consentService.grantAllConsents(TEST_USER_ID);
            expect(consentService.hasConsent(TEST_USER_ID, "data_processing")).toBe(true);
            expect(consentService.hasConsent(TEST_USER_ID, "encryption")).toBe(true);
            expect(consentService.hasConsent(TEST_USER_ID, "ai_processing")).toBe(true);
            expect(consentService.hasConsent(TEST_USER_ID, "marketing")).toBe(true);
        });
        it("should not duplicate consents if already granted", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            consentService.grantAllConsents(TEST_USER_ID);
            const consents = consentService.getUserConsents(TEST_USER_ID);
            const encryptionConsents = consents.filter((c) => c.consentType === "encryption");
            expect(encryptionConsents).toHaveLength(1); // Should only have 1 encryption consent
        });
        it("should create exactly 4 consents", () => {
            consentService.grantAllConsents(TEST_USER_ID);
            const consents = consentService.getUserConsents(TEST_USER_ID);
            expect(consents).toHaveLength(4);
        });
        it("should log granted event for each consent type", () => {
            consentService.grantAllConsents(TEST_USER_ID);
            const logs = auditLogger.getAllLogs();
            const grantLogs = logs.filter((log) => log.event_type === "consent.granted");
            expect(grantLogs).toHaveLength(4);
        });
    });
    describe("revokeAllConsents()", () => {
        beforeEach(() => {
            consentService.grantAllConsents(TEST_USER_ID);
        });
        it("should revoke all active consents", () => {
            consentService.revokeAllConsents(TEST_USER_ID);
            expect(consentService.hasConsent(TEST_USER_ID, "data_processing")).toBe(false);
            expect(consentService.hasConsent(TEST_USER_ID, "encryption")).toBe(false);
            expect(consentService.hasConsent(TEST_USER_ID, "ai_processing")).toBe(false);
            expect(consentService.hasConsent(TEST_USER_ID, "marketing")).toBe(false);
        });
        it("should log revoke all event", () => {
            consentService.revokeAllConsents(TEST_USER_ID);
            const logs = auditLogger.getAllLogs();
            const revokeAllLog = logs.find((log) => log.event_type === "consent.revoked" && log.resource_id === "all");
            expect(revokeAllLog).toBeDefined();
            expect(JSON.parse(revokeAllLog.details).reason).toBe("All consents revoked");
        });
        it("should handle revoking when no consents exist", () => {
            testDb.clearAllTables(); // Remove all consents
            // Should not throw error
            expect(() => {
                consentService.revokeAllConsents(TEST_USER_ID);
            }).not.toThrow();
        });
        it("should set revoked_at for all consents", () => {
            consentService.revokeAllConsents(TEST_USER_ID);
            const consents = consentService.getUserConsents(TEST_USER_ID);
            consents.forEach((consent) => {
                expect(consent.revokedAt).not.toBeNull();
            });
        });
    });
    describe("Privacy Policy Version", () => {
        it("should track privacy policy version on consent", () => {
            const consent = consentService.grantConsent(TEST_USER_ID, "data_processing");
            expect(consent.version).toBe("1.0");
        });
        it("should include version in audit log", () => {
            consentService.grantConsent(TEST_USER_ID, "encryption");
            const logs = auditLogger.getAllLogs();
            const grantLog = logs.find((log) => log.event_type === "consent.granted");
            expect(JSON.parse(grantLog.details).version).toBe("1.0");
        });
    });
    describe("GDPR Compliance", () => {
        it("should support Article 7.3 - Right to withdraw consent", () => {
            // Grant consent
            consentService.grantConsent(TEST_USER_ID, "ai_processing");
            expect(consentService.hasConsent(TEST_USER_ID, "ai_processing")).toBe(true);
            // Withdraw consent (Article 7.3)
            consentService.revokeConsent(TEST_USER_ID, "ai_processing");
            expect(consentService.hasConsent(TEST_USER_ID, "ai_processing")).toBe(false);
        });
        it("should maintain audit trail of consent changes", () => {
            consentService.grantConsent(TEST_USER_ID, "marketing");
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            const logs = auditLogger.getAllLogs();
            expect(logs.some((log) => log.event_type === "consent.granted")).toBe(true);
            expect(logs.some((log) => log.event_type === "consent.revoked")).toBe(true);
        });
    });
    describe("Edge Cases", () => {
        it("should handle multiple grant/revoke cycles", () => {
            // Grant -> Revoke -> Grant -> Revoke
            consentService.grantConsent(TEST_USER_ID, "marketing");
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            consentService.grantConsent(TEST_USER_ID, "marketing");
            consentService.revokeConsent(TEST_USER_ID, "marketing");
            expect(consentService.hasConsent(TEST_USER_ID, "marketing")).toBe(false);
        });
        it("should handle concurrent users granting same consent type", () => {
            consentService.grantConsent(1, "encryption");
            consentService.grantConsent(2, "encryption");
            consentService.grantConsent(3, "encryption");
            expect(consentService.hasConsent(1, "encryption")).toBe(true);
            expect(consentService.hasConsent(2, "encryption")).toBe(true);
            expect(consentService.hasConsent(3, "encryption")).toBe(true);
        });
        it("should work without audit logger", () => {
            const serviceWithoutLogger = new ConsentService(consentRepository, null);
            // Should not throw error
            expect(() => {
                serviceWithoutLogger.grantConsent(TEST_USER_ID, "data_processing");
            }).not.toThrow();
            expect(serviceWithoutLogger.hasConsent(TEST_USER_ID, "data_processing")).toBe(true);
        });
    });
});
