/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { userProfileService } from "./UserProfileService.ts";
import { AuditLogger } from "./AuditLogger.ts";
import { TestDatabaseHelper } from "../test-utils/database-test-helper.ts";
import { databaseManager } from "../db/database.ts";
import { resetRepositories, initializeTestRepositories } from "../repositories.ts";

import type { UpdateUserProfileInput } from "../domains/settings/entities/UserProfile";

describe("UserProfileService", () => {
  let auditLogger: AuditLogger;
  let testDb: TestDatabaseHelper;

  beforeEach(() => {
    testDb = new TestDatabaseHelper();
    const db = testDb.initialize();

    // Inject test database into singleton
    databaseManager.setTestDatabase(db);

    // Reset singleton to force re-initialization with test key
    resetRepositories();

    // Initialize audit logger with test helper method
    auditLogger = new AuditLogger(db);
    (auditLogger as any).getAllLogs = () => {
      return db.prepare("SELECT * FROM audit_logs ORDER by created_at").all();
    };

    // Initialize repositories with test encryption service and audit logger
    // Use encryption service from TestDatabaseHelper (automatically initialized)
    const encryptionService = testDb.getEncryptionService();
    initializeTestRepositories(encryptionService, auditLogger);
  });

  afterEach(() => {
    testDb.clearAllTables();
    testDb.cleanup();
    databaseManager.resetDatabase();
  });

  describe("getProfile()", () => {
    it("should get default profile after initialization", () => {
      const profile = userProfileService.getProfile();

      expect(profile).toBeDefined();
      expect(profile.id).toBe(1);
      expect(profile.name).toBe("Legal User");
      expect(profile.email).toBeNull();
      expect(profile.avatarUrl).toBeNull();
    });

    it("should decrypt encrypted name and email fields", () => {
      // Update profile with encrypted data
      userProfileService.updateProfile({
        name: "John Doe",
        email: "john@example.com",
      });

      const profile = userProfileService.getProfile();

      expect(profile.name).toBe("John Doe");
      expect(profile.email).toBe("john@example.com");
    });

    it("should log PII access when reading encrypted fields", () => {
      // Set encrypted data
      userProfileService.updateProfile({
        name: "Jane Smith",
        email: "jane@example.com",
      });

      // Clear audit logs
      testDb.getDatabase().prepare("DELETE FROM audit_logs").run();

      // Get profile (should log PII access)
      userProfileService.getProfile();

      const logs = (auditLogger as any).getAllLogs();
      const accessLog = logs.find(
        (log: any) => log.event_type === "profile.pii_access",
      );

      expect(accessLog).toBeDefined();
      expect(accessLog.success).toBe(1);
      expect(JSON.parse(accessLog.details).encrypted).toBe(true);
      expect(JSON.parse(accessLog.details).fieldsAccessed).toContain("name");
      expect(JSON.parse(accessLog.details).fieldsAccessed).toContain("email");
    });

    it("should have timestamps set", () => {
      const profile = userProfileService.getProfile();

      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();

      // Verify they are valid ISO timestamps
      expect(new Date(profile.createdAt).toISOString()).toBeTruthy();
      expect(new Date(profile.updatedAt).toISOString()).toBeTruthy();
    });
  });

  describe("updateProfile()", () => {
    it("should update name successfully", () => {
      const input: UpdateUserProfileInput = {
        name: "Updated Name",
      };

      const updated = userProfileService.updateProfile(input);

      expect(updated.name).toBe("Updated Name");
    });

    it("should update email successfully", () => {
      const input: UpdateUserProfileInput = {
        email: "updated@example.com",
      };

      const updated = userProfileService.updateProfile(input);

      expect(updated.email).toBe("updated@example.com");
    });

    it("should update avatar URL successfully", () => {
      const input: UpdateUserProfileInput = {
        avatarUrl: "https://example.com/avatar.png",
      };

      const updated = userProfileService.updateProfile(input);

      expect(updated.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should update multiple fields at once", () => {
      const input: UpdateUserProfileInput = {
        name: "Full Update",
        email: "full@example.com",
        avatarUrl: "https://example.com/full.png",
      };

      const updated = userProfileService.updateProfile(input);

      expect(updated.name).toBe("Full Update");
      expect(updated.email).toBe("full@example.com");
      expect(updated.avatarUrl).toBe("https://example.com/full.png");
    });

    it("should encrypt name before storing", () => {
      const originalName = "Encrypted Name";
      userProfileService.updateProfile({ name: originalName });

      // Query database directly to verify encryption
      const db = testDb.getDatabase();
      const storedProfile = db
        .prepare("SELECT name FROM user_profile WHERE id = 1")
        .get() as any;

      // Stored name should be encrypted JSON, not plaintext
      expect(storedProfile.name).not.toBe(originalName);
      expect(storedProfile.name).toContain('"iv":');
      expect(storedProfile.name).toContain('"ciphertext":');
      expect(storedProfile.name).toContain('"algorithm":"aes-256-gcm"');
    });

    it("should encrypt email before storing", () => {
      const originalEmail = "secure@example.com";
      userProfileService.updateProfile({ email: originalEmail });

      // Query database directly to verify encryption
      const db = testDb.getDatabase();
      const storedProfile = db
        .prepare("SELECT email FROM user_profile WHERE id = 1")
        .get() as any;

      // Stored email should be encrypted JSON, not plaintext
      expect(storedProfile.email).not.toBe(originalEmail);
      expect(storedProfile.email).toContain('"iv":');
      expect(storedProfile.email).toContain('"ciphertext":');
      expect(storedProfile.email).toContain('"algorithm":"aes-256-gcm"');
    });

    it("should log profile update event", () => {
      userProfileService.updateProfile({
        name: "Test Update",
        email: "test@example.com",
      });

      const logs = (auditLogger as any).getAllLogs();
      const updateLog = logs.find(
        (log: any) => log.event_type === "profile.update",
      );

      expect(updateLog).toBeDefined();
      expect(updateLog.success).toBe(1);
      const details = JSON.parse(updateLog.details);
      expect(details.fieldsUpdated).toContain("name");
      expect(details.fieldsUpdated).toContain("email");
    });

    it("should update updated_at timestamp", async () => {
      const beforeUpdate = userProfileService.getProfile();
      const beforeTime = new Date(beforeUpdate.updatedAt).getTime();

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      userProfileService.updateProfile({ name: "New Name" });
      const afterUpdate = userProfileService.getProfile();
      const afterTime = new Date(afterUpdate.updatedAt).getTime();

      expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
    });

    it("should allow clearing email to null", () => {
      // Set email first
      userProfileService.updateProfile({ email: "test@example.com" });

      // Clear email
      const updated = userProfileService.updateProfile({ email: null });

      expect(updated.email).toBeNull();
    });
  });

  describe("Input Validation", () => {
    it("should reject empty name", () => {
      expect(() => {
        userProfileService.updateProfile({ name: "" });
      }).toThrow("Name cannot be empty");
    });

    it("should reject whitespace-only name", () => {
      expect(() => {
        userProfileService.updateProfile({ name: "   " });
      }).toThrow("Name cannot be empty");
    });

    it("should reject invalid email format", () => {
      expect(() => {
        userProfileService.updateProfile({ email: "invalid-email" });
      }).toThrow("Invalid email format");
    });

    it("should reject email without @ symbol", () => {
      expect(() => {
        userProfileService.updateProfile({ email: "nodomain.com" });
      }).toThrow("Invalid email format");
    });

    it("should reject email without domain", () => {
      expect(() => {
        userProfileService.updateProfile({ email: "user@" });
      }).toThrow("Invalid email format");
    });

    it("should reject email without TLD", () => {
      expect(() => {
        userProfileService.updateProfile({ email: "user@domain" });
      }).toThrow("Invalid email format");
    });

    it("should accept valid email formats", () => {
      const validEmails = [
        "simple@example.com",
        "user.name@example.co.uk",
        "user+tag@example.org",
        "test123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        expect(() => {
          userProfileService.updateProfile({ email });
        }).not.toThrow();
      });
    });

    it("should allow null email explicitly", () => {
      expect(() => {
        userProfileService.updateProfile({ email: null });
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should throw error on validation failure", () => {
      expect(() => {
        userProfileService.updateProfile({ name: "" }); // Invalid
      }).toThrow("Name cannot be empty");
    });

    it("should preserve profile data on failed update", () => {
      const original = userProfileService.getProfile();

      try {
        userProfileService.updateProfile({ email: "invalid" });
      } catch (_error) {
        // Expected to throw
      }

      const current = userProfileService.getProfile();
      expect(current.email).toBe(original.email);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty update object gracefully", () => {
      const before = userProfileService.getProfile();
      const after = userProfileService.updateProfile({});

      expect(after.name).toBe(before.name);
      expect(after.email).toBe(before.email);
      expect(after.avatarUrl).toBe(before.avatarUrl);
    });

    it("should handle multiple sequential updates", () => {
      userProfileService.updateProfile({ name: "First" });
      userProfileService.updateProfile({ name: "Second" });
      userProfileService.updateProfile({ name: "Third" });

      const profile = userProfileService.getProfile();
      expect(profile.name).toBe("Third");
    });

    it("should handle very long names", () => {
      const longName = "A".repeat(500);
      const updated = userProfileService.updateProfile({ name: longName });

      expect(updated.name).toBe(longName);
      expect(updated.name.length).toBe(500);
    });

    it("should handle special characters in name", () => {
      const specialName = "O'Brien-Smith (Jr.) & Associates";
      const updated = userProfileService.updateProfile({ name: specialName });

      expect(updated.name).toBe(specialName);
    });

    it("should handle Unicode characters in name", () => {
      const unicodeName = "张伟 (Zhang Wei)";
      const updated = userProfileService.updateProfile({ name: unicodeName });

      expect(updated.name).toBe(unicodeName);
    });
  });

  describe("GDPR Compliance", () => {
    it("should encrypt PII fields (name and email) at rest", () => {
      userProfileService.updateProfile({
        name: "GDPR User",
        email: "gdpr@example.com",
      });

      // Verify encryption in database
      const db = testDb.getDatabase();
      const raw = db
        .prepare("SELECT name, email FROM user_profile WHERE id = 1")
        .get() as any;

      // Both should be encrypted JSON strings
      expect(raw.name).toContain('"iv":');
      expect(raw.email).toContain('"iv":');
    });

    it("should maintain audit trail of profile changes", () => {
      userProfileService.updateProfile({ name: "First Name" });
      userProfileService.updateProfile({ email: "first@example.com" });
      userProfileService.updateProfile({ name: "Second Name" });

      const logs = (auditLogger as any).getAllLogs();
      const updateLogs = logs.filter(
        (log: any) => log.event_type === "profile.update",
      );

      expect(updateLogs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
