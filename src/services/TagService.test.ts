/// <reference types="vitest/globals" />
/**
 * TagService Tests
 * Comprehensive test suite for tag management functionality
 */
import Database from "better-sqlite3";
import { TagService } from "./TagService";
import type { CreateTagInput } from "../lib/types/api.ts";

// Mock dependencies
let db: Database.Database;
let tagService: TagService;
const testUserId = 1;

// Helper to create test database
function createTestDatabase(): Database.Database {
  const testDb = new Database(":memory:");

  // Create users table
  testDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    )
  `);

  // Create tags table
  testDb.exec(`
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6B7280',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // Create evidence table (simplified)
  testDb.exec(`
    CREATE TABLE evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      case_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create evidence_tags junction table
  testDb.exec(`
    CREATE TABLE evidence_tags (
      evidence_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (evidence_id, tag_id),
      FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create audit_logs table (simplified for audit logger)
  testDb.exec(`
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      hash TEXT
    )
  `);

  // Insert test user
  testDb
    .prepare(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
    )
    .run(testUserId, "testuser", "test@example.com", "hashed_password");

  return testDb;
}

// Mock getDb to return test database
beforeEach(() => {
  db = createTestDatabase();
  tagService = new TagService();
  // Override db getter
  Object.defineProperty(tagService, "db", {
    get: () => db,
  });
});

afterEach(() => {
  db.close();
});

describe("TagService", () => {
  describe("createTag", () => {
    it("should create a new tag", () => {
      const input: CreateTagInput = {
        name: "Important",
        color: "#EF4444",
        description: "High priority items",
      };

      const tag = tagService.createTag(testUserId, input);

      expect(tag).toBeDefined();
      expect(tag.id).toBeGreaterThan(0);
      expect(tag.name).toBe("Important");
      expect(tag.color).toBe("#EF4444");
      expect(tag.description).toBe("High priority items");
      expect(tag.userId).toBe(testUserId);
      expect(tag.usageCount).toBe(0);
    });

    it("should create tag without description", () => {
      const input: CreateTagInput = {
        name: "Urgent",
        color: "#F59E0B",
      };

      const tag = tagService.createTag(testUserId, input);

      expect(tag.name).toBe("Urgent");
      expect(tag.description).toBeUndefined();
    });

    it("should prevent duplicate tag names for same user", () => {
      const input: CreateTagInput = {
        name: "Duplicate",
        color: "#3B82F6",
      };

      tagService.createTag(testUserId, input);

      expect(() => {
        tagService.createTag(testUserId, input);
      }).toThrow("A tag with this name already exists");
    });

    it("should allow same tag name for different users", () => {
      // Create second user
      db.prepare(
        "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      ).run(2, "user2", "user2@example.com", "hashed_password");

      const input: CreateTagInput = {
        name: "Same Name",
        color: "#10B981",
      };

      const tag1 = tagService.createTag(testUserId, input);
      const tag2 = tagService.createTag(2, input);

      expect(tag1.name).toBe(tag2.name);
      expect(tag1.userId).not.toBe(tag2.userId);
    });
  });

  describe("getTags", () => {
    it("should return all tags for a user", () => {
      tagService.createTag(testUserId, { name: "Tag1", color: "#EF4444" });
      tagService.createTag(testUserId, { name: "Tag2", color: "#10B981" });
      tagService.createTag(testUserId, { name: "Tag3", color: "#3B82F6" });

      const tags = tagService.getTags(testUserId);

      expect(tags).toHaveLength(3);
      expect(tags.map((t) => t.name)).toEqual(["Tag1", "Tag2", "Tag3"]);
    });

    it("should return tags with usage counts", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Used Tag",
        color: "#EF4444",
      });

      // Create evidence
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      // Tag evidence
      tagService.tagEvidence(1, tag.id, testUserId);

      const tags = tagService.getTags(testUserId);
      expect(tags[0].usageCount).toBe(1);
    });

    it("should return empty array if no tags", () => {
      const tags = tagService.getTags(testUserId);
      expect(tags).toEqual([]);
    });

    it("should only return tags for specified user", () => {
      // Create second user
      db.prepare(
        "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      ).run(2, "user2", "user2@example.com", "hashed_password");

      tagService.createTag(testUserId, { name: "User1Tag", color: "#EF4444" });
      tagService.createTag(2, { name: "User2Tag", color: "#10B981" });

      const tags = tagService.getTags(testUserId);

      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("User1Tag");
    });
  });

  describe("updateTag", () => {
    it("should update tag name", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Old Name",
        color: "#EF4444",
      });

      const updated = tagService.updateTag(tag.id, { name: "New Name" });

      expect(updated.name).toBe("New Name");
      expect(updated.color).toBe("#EF4444"); // Unchanged
    });

    it("should update tag color", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      const updated = tagService.updateTag(tag.id, { color: "#10B981" });

      expect(updated.color).toBe("#10B981");
      expect(updated.name).toBe("Tag"); // Unchanged
    });

    it("should update tag description", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      const updated = tagService.updateTag(tag.id, {
        description: "New description",
      });

      expect(updated.description).toBe("New description");
    });

    it("should clear description when set to undefined", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
        description: "Original",
      });

      const updated = tagService.updateTag(tag.id, { description: "" });

      expect(updated.description).toBeUndefined();
    });

    it("should throw error if tag not found", () => {
      expect(() => {
        tagService.updateTag(999, { name: "Updated" });
      }).toThrow("Tag not found");
    });
  });

  describe("deleteTag", () => {
    it("should delete tag", () => {
      const tag = tagService.createTag(testUserId, {
        name: "ToDelete",
        color: "#EF4444",
      });

      tagService.deleteTag(tag.id);

      const tags = tagService.getTags(testUserId);
      expect(tags).toHaveLength(0);
    });

    it("should remove tag from all evidence when deleted", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      // Create and tag evidence
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");
      tagService.tagEvidence(1, tag.id, testUserId);

      // Verify tag is applied
      let evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(1);

      // Delete tag
      tagService.deleteTag(tag.id);

      // Verify tag removed from evidence
      evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(0);
    });

    it("should throw error if tag not found", () => {
      expect(() => {
        tagService.deleteTag(999);
      }).toThrow("Tag not found");
    });
  });

  describe("tagEvidence", () => {
    it("should apply tag to evidence", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      tagService.tagEvidence(1, tag.id, testUserId);

      const evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(1);
      expect(evidenceTags[0].id).toBe(tag.id);
    });

    it("should not duplicate tags on same evidence", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      tagService.tagEvidence(1, tag.id, testUserId);
      tagService.tagEvidence(1, tag.id, testUserId); // Apply again

      const evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(1); // Still only 1
    });

    it("should allow multiple tags on same evidence", () => {
      const tag1 = tagService.createTag(testUserId, {
        name: "Tag1",
        color: "#EF4444",
      });
      const tag2 = tagService.createTag(testUserId, {
        name: "Tag2",
        color: "#10B981",
      });

      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      tagService.tagEvidence(1, tag1.id, testUserId);
      tagService.tagEvidence(1, tag2.id, testUserId);

      const evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(2);
    });
  });

  describe("untagEvidence", () => {
    it("should remove tag from evidence", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      tagService.tagEvidence(1, tag.id, testUserId);
      tagService.untagEvidence(1, tag.id, testUserId);

      const evidenceTags = tagService.getEvidenceTags(1);
      expect(evidenceTags).toHaveLength(0);
    });

    it("should be idempotent (no error if tag not applied)", () => {
      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      expect(() => {
        tagService.untagEvidence(1, tag.id, testUserId);
      }).not.toThrow();
    });
  });

  describe("searchByTags", () => {
    it("should find evidence with specified tags (AND logic)", () => {
      const tag1 = tagService.createTag(testUserId, {
        name: "Tag1",
        color: "#EF4444",
      });
      const tag2 = tagService.createTag(testUserId, {
        name: "Tag2",
        color: "#10B981",
      });

      // Create evidence
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(2, testUserId, 1, "Evidence 2");

      // Evidence 1 has both tags
      tagService.tagEvidence(1, tag1.id, testUserId);
      tagService.tagEvidence(1, tag2.id, testUserId);

      // Evidence 2 has only tag1
      tagService.tagEvidence(2, tag1.id, testUserId);

      // Search for both tags (AND)
      const results = tagService.searchByTags(testUserId, [tag1.id, tag2.id]);

      expect(results).toEqual([1]); // Only Evidence 1 has both tags
    });

    it("should return empty array if no tags specified", () => {
      const results = tagService.searchByTags(testUserId, []);
      expect(results).toEqual([]);
    });

    it("should only return evidence owned by user", () => {
      // Create second user
      db.prepare(
        "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      ).run(2, "user2", "user2@example.com", "hashed_password");

      const tag = tagService.createTag(testUserId, {
        name: "Tag",
        color: "#EF4444",
      });

      // Evidence for user 1
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");

      // Evidence for user 2
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(2, 2, 1, "Evidence 2");

      tagService.tagEvidence(1, tag.id, testUserId);
      tagService.tagEvidence(2, tag.id, 2);

      const results = tagService.searchByTags(testUserId, [tag.id]);

      expect(results).toEqual([1]); // Only user 1's evidence
    });
  });

  describe("getTagStatistics", () => {
    it("should return correct statistics", () => {
      const tag1 = tagService.createTag(testUserId, {
        name: "Tag1",
        color: "#EF4444",
      });
      const tag2 = tagService.createTag(testUserId, {
        name: "Tag2",
        color: "#10B981",
      });
      tagService.createTag(testUserId, { name: "Unused", color: "#3B82F6" });

      // Create evidence
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(1, testUserId, 1, "Evidence 1");
      db.prepare(
        "INSERT INTO evidence (id, user_id, case_id, title) VALUES (?, ?, ?, ?)",
      ).run(2, testUserId, 1, "Evidence 2");

      // Tag evidence
      tagService.tagEvidence(1, tag1.id, testUserId);
      tagService.tagEvidence(1, tag2.id, testUserId);
      tagService.tagEvidence(2, tag1.id, testUserId);

      const stats = tagService.getTagStatistics(testUserId);

      expect(stats.totalTags).toBe(3);
      expect(stats.totalTaggedEvidence).toBe(2);
      expect(stats.mostUsedTag?.name).toBe("Tag1"); // Used 2 times
      expect(stats.unusedTags).toBe(1); // Tag3
    });

    it("should handle user with no tags", () => {
      const stats = tagService.getTagStatistics(testUserId);

      expect(stats.totalTags).toBe(0);
      expect(stats.totalTaggedEvidence).toBe(0);
      expect(stats.mostUsedTag).toBeNull();
      expect(stats.unusedTags).toBe(0);
    });
  });
});
