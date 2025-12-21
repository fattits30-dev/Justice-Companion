/// <reference types="vitest/globals" />

import Database from "better-sqlite3-multiple-ciphers";
import { UserFactsRepository } from "./UserFactsRepository";
import { AuditLogger } from "../services/AuditLogger";
import { TestDatabaseHelper } from "../test-utils/database-test-helper";
import { databaseManager } from "../db/database";
import { resetRepositories, initializeTestRepositories } from "../repositories";

describe("UserFactsRepository", () => {
  let db: Database.Database;
  let repository: UserFactsRepository;
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

    // Extract UserFactsRepository from container
    repository = repos.userFactsRepository;

    // Create test case (needed for user_facts foreign key constraint)
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
    it("should create a user fact with encrypted content", () => {
      const fact = repository.create({
        caseId: 1,
        factContent: "SSN: 123-45-6789",
        factCategory: "personal",  // Valid fact_type value
      });

      expect(fact.id).toBe(1);
      expect(fact.caseId).toBe(1);
      expect(fact.factContent).toBe("SSN: 123-45-6789");
      expect(fact.factCategory).toBe("personal");

      // Verify content is encrypted in database
      const storedFact = db!
        .prepare("SELECT fact_content FROM user_facts WHERE id = ?")
        .get(1) as { fact_content: string };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty("algorithm");
      expect(parsedContent).toHaveProperty("ciphertext");
      expect(parsedContent).toHaveProperty("iv");
      expect(parsedContent).toHaveProperty("authTag");
      expect(parsedContent.algorithm).toBe("aes-256-gcm");
    });

    it("should create user facts with different types", () => {
      // Valid fact_type values per the CHECK constraint
      const factCategorys: Array<
        | "personal"
        | "employment"
        | "financial"
        | "contact"
        | "medical"
      > = [
        "personal",
        "employment",
        "financial",
        "contact",
        "medical",
      ];

      factCategorys.forEach((factCategory, index) => {
        const fact = repository.create({
          caseId: 1,
          factContent: `Test ${factCategory} fact`,
          factCategory,
        });

        expect(fact.id).toBe(index + 1);
        expect(fact.factCategory).toBe(factCategory);
      });
    });

    it("should audit user fact creation", () => {
      repository.create({
        caseId: 1,
        factContent: "Phone: 555-1234",
        factCategory: "contact",  // Valid fact_type value
      });

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.create");
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as {
        resource_type: string;
        action: string;
        success: number;
        details: string;
      };

      expect(log.resource_type).toBe("user_fact");
      expect(log.action).toBe("create");
      expect(log.success).toBe(1);

      const details = JSON.parse(log.details);
      expect(details.caseId).toBe(1);
      expect(details.factCategory).toBe("contact");
      expect(details.contentLength).toBe(15);
    });
  });

  describe("findById", () => {
    it("should find user fact by ID and decrypt content", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Date of birth: 1990-01-01",
        factCategory: "personal",
      });

      const found = repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.factContent).toBe("Date of birth: 1990-01-01");
      expect(found!.factCategory).toBe("personal");
    });

    it("should return null for non-existent ID", () => {
      const found = repository.findById(999);
      expect(found).toBeNull();
    });

    it("should audit content access when decrypting", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Salary: $50,000",
        factCategory: "employment",
      });

      // Clear previous audit logs
      db!
        .prepare("DELETE FROM audit_logs WHERE event_type = ?")
        .run("user_fact.content_access");

      repository.findById(created.id);

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.content_access");
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as {
        resource_type: string;
        action: string;
        details: string;
      };

      expect(log.resource_type).toBe("user_fact");
      expect(log.action).toBe("read");

      const details = JSON.parse(log.details);
      expect(details.field).toBe("fact_content");
      expect(details.encrypted).toBe(true);
    });
  });

  describe("findByCaseId", () => {
    it("should find all user facts for a case", () => {
      repository.create({
        caseId: 1,
        factContent: "Fact 1",
        factCategory: "personal",
      });

      repository.create({
        caseId: 1,
        factContent: "Fact 2",
        factCategory: "financial",
      });

      repository.create({
        caseId: 1,
        factContent: "Fact 3",
        factCategory: "employment",
      });

      const facts = repository.findByCaseId(1);

      expect(facts).toHaveLength(3);
      expect(facts.map((f) => f.factContent)).toContain("Fact 1");
      expect(facts.map((f) => f.factContent)).toContain("Fact 2");
      expect(facts.map((f) => f.factContent)).toContain("Fact 3");
    });

    it("should return empty array for case with no facts", () => {
      const facts = repository.findByCaseId(1);
      expect(facts).toEqual([]);
    });

    it("should audit bulk content access", () => {
      repository.create({
        caseId: 1,
        factContent: "Fact 1",
        factCategory: "personal",
      });

      repository.create({
        caseId: 1,
        factContent: "Fact 2",
        factCategory: "financial",
      });

      // Clear previous audit logs
      db!
        .prepare("DELETE FROM audit_logs WHERE event_type = ?")
        .run("user_fact.content_access");

      repository.findByCaseId(1);

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.content_access");
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.count).toBe(2);
    });
  });

  describe("findByType", () => {
    it("should find user facts by type", () => {
      repository.create({
        caseId: 1,
        factContent: "Personal fact 1",
        factCategory: "personal",
      });

      repository.create({
        caseId: 1,
        factContent: "Financial fact",
        factCategory: "financial",
      });

      repository.create({
        caseId: 1,
        factContent: "Personal fact 2",
        factCategory: "personal",
      });

      const personalFacts = repository.findByType(1, "personal");
      const financialFacts = repository.findByType(1, "financial");

      expect(personalFacts).toHaveLength(2);
      expect(financialFacts).toHaveLength(1);
      expect(personalFacts.every((f) => f.factCategory === "personal")).toBe(true);
      expect(financialFacts.every((f) => f.factCategory === "financial")).toBe(
        true,
      );
    });

    it("should return empty array for type with no facts", () => {
      const medicalFacts = repository.findByType(1, "medical");
      expect(medicalFacts).toEqual([]);
    });

    it("should audit filtered content access", () => {
      repository.create({
        caseId: 1,
        factContent: "Financial fact",
        factCategory: "financial",  // Create with the type we'll search for
      });

      // Clear previous audit logs
      db!
        .prepare("DELETE FROM audit_logs WHERE event_type = ?")
        .run("user_fact.content_access");

      repository.findByType(1, "financial");

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.content_access");
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factCategory).toBe("financial");
    });
  });

  describe("update", () => {
    it("should update fact content with re-encryption", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Old content",
        factCategory: "personal",
      });

      const updated = repository.update(created.id, {
        factContent: "New content",
      });

      expect(updated).not.toBeNull();
      expect(updated!.factContent).toBe("New content");

      // Verify new content is encrypted in database
      const storedFact = db!
        .prepare("SELECT fact_content FROM user_facts WHERE id = ?")
        .get(created.id) as { fact_content: string };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty("ciphertext");
      expect(parsedContent.algorithm).toBe("aes-256-gcm");
    });

    it("should update fact type", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Test fact",
        factCategory: "personal",
      });

      const updated = repository.update(created.id, {
        factCategory: "financial",
      });

      expect(updated).not.toBeNull();
      expect(updated!.factCategory).toBe("financial");  // Should match what we updated to
      expect(updated!.factContent).toBe("Test fact"); // Content unchanged
    });

    it("should update both content and type", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Old fact",
        factCategory: "personal",
      });

      const updated = repository.update(created.id, {
        factContent: "New fact",
        factCategory: "employment",
      });

      expect(updated).not.toBeNull();
      expect(updated!.factContent).toBe("New fact");
      expect(updated!.factCategory).toBe("employment");  // Should match what we updated to
    });

    it("should audit update operation", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Test fact",
        factCategory: "personal",
      });

      repository.update(created.id, {
        factContent: "Updated fact",
      });

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.update");
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[auditLogs.length - 1] as {
        resource_type: string;
        action: string;
        success: number;
        details: string;
      };

      expect(log.resource_type).toBe("user_fact");
      expect(log.action).toBe("update");
      expect(log.success).toBe(1);

      const details = JSON.parse(log.details);
      expect(details.updatedFields).toContain("factContent");
    });
  });

  describe("delete", () => {
    it("should delete user fact", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "To be deleted",
        factCategory: "personal",
      });

      const success = repository.delete(created.id);
      expect(success).toBe(true);

      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it("should return false for non-existent fact", () => {
      const success = repository.delete(999);
      expect(success).toBe(false);
    });

    it("should audit delete operation", () => {
      const created = repository.create({
        caseId: 1,
        factContent: "Test fact",
        factCategory: "personal",
      });

      repository.delete(created.id);

      const auditLogs = db!
        .prepare("SELECT * FROM audit_logs WHERE event_type = ?")
        .all("user_fact.delete");
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[auditLogs.length - 1] as {
        resource_type: string;
        action: string;
        success: number;
      };

      expect(log.resource_type).toBe("user_fact");
      expect(log.action).toBe("delete");
      expect(log.success).toBe(1);
    });
  });

  describe("backward compatibility", () => {
    it("should handle legacy plaintext data", () => {
      // Insert plaintext fact directly
      db!
        .prepare(
          `
        INSERT INTO user_facts (case_id, fact_content, fact_type)
        VALUES (?, ?, ?)
      `,
        )
        .run(1, "Plaintext fact", "personal");

      const found = repository.findById(1);

      expect(found).not.toBeNull();
      expect(found!.factContent).toBe("Plaintext fact");
    });
  });

  describe("CASCADE DELETE", () => {
    it("should delete user facts when case is deleted", () => {
      repository.create({
        caseId: 1,
        factContent: "Fact 1",
        factCategory: "personal",
      });

      repository.create({
        caseId: 1,
        factContent: "Fact 2",
        factCategory: "financial",
      });

      // Delete the case
      db!.prepare("DELETE FROM cases WHERE id = ?").run(1);

      // Facts should be deleted
      const facts = db!
        .prepare("SELECT * FROM user_facts WHERE case_id = ?")
        .all(1);
      expect(facts).toHaveLength(0);
    });
  });
});
