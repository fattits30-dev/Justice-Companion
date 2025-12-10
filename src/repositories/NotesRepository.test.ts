/// <reference types="vitest/globals" />

import Database from "better-sqlite3-multiple-ciphers";
import { NotesRepository } from "./NotesRepository";
import { AuditLogger } from "../services/AuditLogger";
import { TestDatabaseHelper } from "../test-utils/database-test-helper";
import { databaseManager } from "../db/database";
import { resetRepositories, initializeTestRepositories } from "../repositories";

describe("NotesRepository", () => {
  let db: Database.Database;
  let repository: NotesRepository;
  let auditLogger: AuditLogger;
  let testDb: TestDatabaseHelper;

  beforeEach(() => {
    // Initialize test database with all migrations
    testDb = new TestDatabaseHelper();
    db = testDb.initialize();

    // Inject test database into the singleton for proper test isolation
    databaseManager.setTestDatabase(db);

    // Reset repository singletons to force re-initialization with test dependencies
    resetRepositories();

    // Initialize audit logger
    auditLogger = new AuditLogger(db);

    // Initialize repositories with test dependencies
    const encryptionService = testDb.getEncryptionService();
    const repos = initializeTestRepositories(encryptionService, auditLogger);

    // Extract NotesRepository from container
    repository = repos.notesRepository;

    // Create test case (needed for notes foreign key constraint)
    db.prepare(
      `
      INSERT INTO cases (title, case_type)
      VALUES ('Test Case', 'employment')
    `,
    ).run();
  });

  afterEach(() => {
    testDb.clearAllTables(); // Clear data between tests (must happen before cleanup)
    testDb.cleanup(); // Close database connection
    databaseManager.resetDatabase(); // Reset singleton to clean state
  });

  describe("create", () => {
    it("should create a note with encrypted content", () => {
      const note = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      expect(note.id).toBe(1);
      expect(note.caseId).toBe(1);
      expect(note.content).toBe(
        "This is a sensitive private note about the case.",
      );

      // Verify content is encrypted in database
      const storedNote = db
        .prepare("SELECT content FROM notes WHERE id = ?")
        .get(1) as {
        content: string;
      };
      const parsedContent = JSON.parse(storedNote.content);

      expect(parsedContent).toHaveProperty("algorithm");
      expect(parsedContent).toHaveProperty("ciphertext");
      expect(parsedContent).toHaveProperty("iv");
      expect(parsedContent).toHaveProperty("authTag");
      expect(parsedContent.algorithm).toBe("aes-256-gcm");
    });

    it("should audit note creation", () => {
      repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      const auditLog = db
        .prepare(
          `
        SELECT * FROM audit_logs WHERE event_type = 'note.create'
      `,
        )
        .get() as any;

      expect(auditLog).toBeDefined();
      expect(auditLog.resource_type).toBe("note");
      expect(auditLog.action).toBe("create");
      expect(auditLog.success).toBe(1);
    });

    it("should not log plaintext content in audit logs", () => {
      const sensitiveContent = "SENSITIVE_SECRET_DATA";
      repository.create({ caseId: 1, userId: 1, title: "Test Note", content: sensitiveContent });

      const auditLog = db
        .prepare(
          `
        SELECT details FROM audit_logs WHERE event_type = 'note.create'
      `,
        )
        .get() as { details: string };

      expect(auditLog.details).not.toContain(sensitiveContent);
      expect(auditLog.details).toContain("contentLength");
    });
  });

  describe("findById", () => {
    it("should decrypt content when retrieving note", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      const retrieved = repository.findById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.content).toBe("Encrypted note content");
    });

    it("should audit PII access when decrypting content", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      repository.findById(created.id);

      const piiAccessLog = db
        .prepare(
          `
        SELECT * FROM audit_logs WHERE event_type = 'note.content_access'
      `,
        )
        .get() as any;

      expect(piiAccessLog).toBeDefined();
      expect(piiAccessLog.action).toBe("read");
      expect(piiAccessLog.resource_id).toBe(created.id.toString());
    });

    it("should return null for non-existent note", () => {
      const note = repository.findById(999);
      expect(note).toBeNull();
    });
  });

  describe("findByCaseId", () => {
    it("should decrypt all notes for a case", () => {
      repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });
      repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      const notes = repository.findByCaseId(1);

      expect(notes).toHaveLength(2);
      expect(notes[0].content).toBe("Second note"); // DESC order
      expect(notes[1].content).toBe("First note");
    });

    it("should return empty array for case with no notes", () => {
      const notes = repository.findByCaseId(1);
      expect(notes).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update note content with new encryption", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      const updated = repository.update(created.id, {
        content: "Updated content",
      });

      expect(updated).toBeDefined();
      expect(updated!.content).toBe("Updated content");

      // Verify new ciphertext in database
      const storedNote = db
        .prepare("SELECT content FROM notes WHERE id = ?")
        .get(created.id) as {
        content: string;
      };
      const parsedContent = JSON.parse(storedNote.content);

      expect(parsedContent.algorithm).toBe("aes-256-gcm");
    });

    it("should audit note update", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      repository.update(created.id, { content: "Updated content" });

      const updateLog = db
        .prepare(
          `
        SELECT * FROM audit_logs WHERE event_type = 'note.update' AND resource_id = ?
      `,
        )
        .get(created.id.toString()) as any;

      expect(updateLog).toBeDefined();
      expect(updateLog.success).toBe(1);
    });
  });

  describe("delete", () => {
    it("should delete note and return true", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      const result = repository.delete(created.id);

      expect(result).toBe(true);

      const note = repository.findById(created.id);
      expect(note).toBeNull();
    });

    it("should return false when deleting non-existent note", () => {
      const result = repository.delete(999);
      expect(result).toBe(false);
    });

    it("should audit note deletion", () => {
      const created = repository.create({
        caseId: 1,
        userId: 1,
        title: "Test Note",
        content: "This is a sensitive private note about the case.",
      });

      repository.delete(created.id);

      const deleteLog = db
        .prepare(
          `
        SELECT * FROM audit_logs WHERE event_type = 'note.delete' AND resource_id = ?
      `,
        )
        .get(created.id.toString()) as any;

      expect(deleteLog).toBeDefined();
      expect(deleteLog.success).toBe(1);
    });
  });

  describe("backward compatibility", () => {
    it("should handle legacy plaintext notes", () => {
      // Insert plaintext note directly
      db.prepare(
        `
        INSERT INTO notes (case_id, content)
        VALUES (?, ?)
      `,
      ).run(1, "Legacy plaintext note");

      const note = repository.findById(1);

      expect(note).toBeDefined();
      expect(note!.content).toBe("Legacy plaintext note");
    });

    it("should handle empty content", () => {
      db.prepare(
        `
        INSERT INTO notes (case_id, content)
        VALUES (?, ?)
      `,
      ).run(1, "");

      const note = repository.findById(1);

      expect(note).toBeDefined();
      expect(note!.content).toBe("");
    });
  });

  describe("GDPR compliance", () => {
    it("should never log decrypted content in audit logs", () => {
      const sensitiveData = "EXTREMELY_SENSITIVE_PERSONAL_DATA";

      repository.create({ caseId: 1, userId: 1, title: "Test Note", content: sensitiveData });
      repository.findById(1);

      const allAuditLogs = db
        .prepare("SELECT details, error_message FROM audit_logs")
        .all() as any[];

      allAuditLogs.forEach((log) => {
        if (log.details) {
          expect(log.details).not.toContain(sensitiveData);
        }
        if (log.error_message) {
          expect(log.error_message).not.toContain(sensitiveData);
        }
      });
    });
  });
});
