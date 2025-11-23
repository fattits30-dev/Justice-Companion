import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3-multiple-ciphers";
import { EvidenceRepository } from "./EvidenceRepository.ts";
import { CaseRepository } from "./CaseRepository.ts";
import { EncryptionService } from "../services/EncryptionService.ts";
import { TestDatabaseHelper } from "../test-utils/database-test-helper.ts";
import { databaseManager } from "../db/database.ts";
import {
  resetRepositories,
  initializeTestRepositories,
} from "../repositories.ts";
import type { CreateEvidenceInput } from "../domains/evidence/entities/Evidence";

describe("EvidenceRepository with Encryption", () => {
  let db: Database.Database;
  let evidenceRepo: EvidenceRepository;
  let caseRepo: CaseRepository;
  let testDb: TestDatabaseHelper;
  let testCaseId: number;

  beforeEach(async () => {
    // Initialize test database with all migrations
    testDb = new TestDatabaseHelper();
    db = testDb.initialize();

    // Inject test database into the singleton for proper test isolation
    databaseManager.setTestDatabase(db);

    // Reset repository singletons to force re-initialization with test dependencies
    resetRepositories();

    // Initialize repositories with test dependencies
    const encryptionService = testDb.getEncryptionService();
    const auditLogger = new (
      await import("../services/AuditLogger.ts")
    ).AuditLogger(testDb.getDatabase());
    const repos = initializeTestRepositories(encryptionService, auditLogger);

    // Extract repositories from container
    evidenceRepo = repos.evidenceRepository;
    caseRepo = repos.caseRepository;

    // Create a test case for evidence to belong to
    const testCase = caseRepo.create({
      title: "Test Case for Evidence",
      caseType: "employment",
      description: "Test case",
    });
    testCaseId = testCase.id;
  });

  afterEach(() => {
    testDb.clearAllTables(); // Clear data between tests (must happen before cleanup)
    testDb.cleanup(); // Close database connection
    databaseManager.resetDatabase(); // Reset singleton to clean state
  });

  describe("Encryption on Write Operations", () => {
    it("should store encrypted evidence content in database", () => {
      const evidenceInput: CreateEvidenceInput = {
        caseId: testCaseId,
        title: "Email Evidence",
        evidenceType: "email",
        content:
          "Confidential email content: Subject: Re: Termination, Body: Your employment is terminated...",
      };

      const created = evidenceRepo.create(evidenceInput);

      // Query database directly to verify encryption
      const rawRow = testDb
        .getDatabase()
        .prepare("SELECT content FROM evidence WHERE id = ?")
        .get(created.id) as {
        content: string | null;
      };

      expect(rawRow.content).toBeTruthy();
      expect(rawRow.content).not.toContain("Confidential");
      expect(rawRow.content).not.toContain("Termination");
      expect(rawRow.content).not.toContain("employment is terminated");

      // Verify it's JSON-encoded encrypted data
      const encryptedData = JSON.parse(rawRow.content!);
      expect(encryptedData).toHaveProperty("algorithm", "aes-256-gcm");
      expect(encryptedData).toHaveProperty("ciphertext");
      expect(encryptedData).toHaveProperty("iv");
      expect(encryptedData).toHaveProperty("authTag");
      expect(encryptedData).toHaveProperty("version", 1);
    });

    it("should store file path without encryption", () => {
      const evidenceInput: CreateEvidenceInput = {
        caseId: testCaseId,
        title: "Document Evidence",
        evidenceType: "document",
        filePath: "/path/to/sensitive/document.pdf",
      };

      const created = evidenceRepo.create(evidenceInput);

      const rawRow = testDb
        .getDatabase()
        .prepare("SELECT file_path, content FROM evidence WHERE id = ?")
        .get(created.id) as {
        file_path: string | null;
        content: string | null;
      };

      // File path stored as plaintext (it's just a path, not sensitive content)
      expect(rawRow.file_path).toBe("/path/to/sensitive/document.pdf");
      expect(rawRow.content).toBeNull();
    });

    it("should update and encrypt evidence content", () => {
      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Note Evidence",
        evidenceType: "note",
        content: "Initial note content",
      });

      const updated = evidenceRepo.update(created.id, {
        content:
          "Updated sensitive note: Client disclosed medical condition - diabetes",
      });

      expect(updated).toBeTruthy();

      // Verify encryption in database
      const rawRow = testDb
        .getDatabase()
        .prepare("SELECT content FROM evidence WHERE id = ?")
        .get(created.id) as {
        content: string | null;
      };

      expect(rawRow.content).not.toContain("medical");
      expect(rawRow.content).not.toContain("diabetes");

      const encryptedData = JSON.parse(rawRow.content!);
      expect(encryptedData).toHaveProperty("algorithm", "aes-256-gcm");
    });

    it("should handle null content without encryption", () => {
      const evidenceInput: CreateEvidenceInput = {
        caseId: testCaseId,
        title: "File Reference Only",
        evidenceType: "photo",
        filePath: "/photos/evidence.jpg",
      };

      const created = evidenceRepo.create(evidenceInput);

      const rawRow = testDb
        .getDatabase()
        .prepare("SELECT content FROM evidence WHERE id = ?")
        .get(created.id) as {
        content: string | null;
      };

      expect(rawRow.content).toBeNull();
    });
  });

  describe("Decryption on Read Operations", () => {
    it("should decrypt evidence content on retrieval", () => {
      const content =
        'Recorded conversation transcript: "I will fire you if you don\'t resign"';

      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Recording Transcript",
        evidenceType: "recording",
        content,
      });

      const retrieved = evidenceRepo.findById(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.content).toBe(content);
    });

    it("should decrypt all evidence content in findByCaseId", () => {
      const evidenceItems = [
        {
          title: "Email 1",
          evidenceType: "email" as const,
          content: "Email content 1",
        },
        {
          title: "Note 1",
          evidenceType: "note" as const,
          content: "Note content 1",
        },
        {
          title: "Document 1",
          evidenceType: "document" as const,
          content: "Document content 1",
        },
      ];

      const createdIds = evidenceItems.map(
        (e) =>
          evidenceRepo.create({
            caseId: testCaseId,
            ...e,
          }).id,
      );

      const allEvidence = evidenceRepo.findByCaseId(testCaseId);

      expect(allEvidence.length).toBe(3);

      createdIds.forEach((id, index) => {
        const found = allEvidence.find((e) => e.id === id);
        expect(found).toBeTruthy();
        expect(found!.content).toBe(evidenceItems[index].content);
      });
    });

    it("should decrypt all evidence content in findAll", () => {
      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Test Evidence",
        evidenceType: "email",
        content: "Confidential email",
      });

      const allEvidence = evidenceRepo.findAll();

      expect(allEvidence.length).toBeGreaterThanOrEqual(1);

      const found = allEvidence.find((e) => e.id === created.id);
      expect(found).toBeTruthy();
      expect(found!.content).toBe("Confidential email");
    });

    it("should filter by evidence type and decrypt", () => {
      evidenceRepo.create({
        caseId: testCaseId,
        title: "Email Evidence",
        evidenceType: "email",
        content: "Email content",
      });

      evidenceRepo.create({
        caseId: testCaseId,
        title: "Note Evidence",
        evidenceType: "note",
        content: "Note content",
      });

      const emails = evidenceRepo.findAll("email");

      expect(emails.length).toBeGreaterThanOrEqual(1);
      expect(emails.every((e) => e.evidenceType === "email")).toBe(true);
      expect(emails[0].content).toBe("Email content");
    });
  });

  describe("Backward Compatibility", () => {
    it("should handle legacy plaintext content", () => {
      // Manually insert plaintext content (simulating legacy data)
      const result = testDb
        .getDatabase()
        .prepare(
          `INSERT INTO evidence (case_id, title, evidence_type, content)
         VALUES (?, ?, ?, ?)`,
        )
        .run(
          testCaseId,
          "Legacy Evidence",
          "note",
          "This is plaintext from old version",
        );

      const evidenceId = result.lastInsertRowid as number;

      // Retrieve via repository - should return plaintext as-is
      const retrieved = evidenceRepo.findById(evidenceId);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.content).toBe("This is plaintext from old version");
    });
  });

  describe("Encryption Security Properties", () => {
    it("should use unique IVs for same content encrypted multiple times", () => {
      const content = "Repeated confidential evidence";

      const evidence1 = evidenceRepo.create({
        caseId: testCaseId,
        title: "Evidence 1",
        evidenceType: "note",
        content,
      });

      const evidence2 = evidenceRepo.create({
        caseId: testCaseId,
        title: "Evidence 2",
        evidenceType: "note",
        content,
      });

      const row1 = testDb
        .getDatabase()
        .prepare("SELECT content FROM evidence WHERE id = ?")
        .get(evidence1.id) as {
        content: string;
      };
      const row2 = testDb
        .getDatabase()
        .prepare("SELECT content FROM evidence WHERE id = ?")
        .get(evidence2.id) as {
        content: string;
      };

      const encrypted1 = JSON.parse(row1.content);
      const encrypted2 = JSON.parse(row2.content);

      // Same plaintext should produce different ciphertext and IVs
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it("should fail decryption with wrong key", () => {
      const content = "Highly confidential evidence content";

      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Encrypted Evidence",
        evidenceType: "email",
        content,
      });

      // Create new repository with different key
      const wrongKey = EncryptionService.generateKey();
      const wrongEncryptionService = new EncryptionService(wrongKey);
      const repoWithWrongKey = new EvidenceRepository(wrongEncryptionService);

      const retrieved = repoWithWrongKey.findById(created.id);

      expect(retrieved).toBeTruthy();
      // Content should NOT match original (decryption failed or returned encrypted JSON)
      expect(retrieved!.content).not.toBe(content);
    });
  });

  describe("Round-Trip Testing", () => {
    it("should successfully encrypt and decrypt unicode characters", () => {
      const content =
        "Legal document in multiple languages: 法律文件 📄 ⚖️ مستند قانوني Документ";

      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Unicode Evidence",
        evidenceType: "document",
        content,
      });

      const retrieved = evidenceRepo.findById(created.id);
      expect(retrieved!.content).toBe(content);
    });

    it("should handle large evidence content (100KB+)", () => {
      // Generate 100KB of text (simulating large document)
      const largeContent = "Legal document evidence content: ".repeat(3000); // ~100KB

      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Large Evidence",
        evidenceType: "document",
        content: largeContent,
      });

      const retrieved = evidenceRepo.findById(created.id);
      expect(retrieved!.content).toBe(largeContent);
    });

    it("should handle special characters in evidence", () => {
      const content = `
        Email Subject: RE: Settlement Offer [CONFIDENTIAL]
        From: lawyer@firm.com
        To: client@email.com
        Date: 2024-01-15 @ 10:30 AM

        Dear Client,

        The defendant offers $50,000 (50% of requested damages).
        Per §123.45(a)(1), we have 30 days to respond.

        "Accept" or 'Reject'?

        Best regards,
        Attorney Smith
      `;

      const created = evidenceRepo.create({
        caseId: testCaseId,
        title: "Email with Special Chars",
        evidenceType: "email",
        content,
      });

      const retrieved = evidenceRepo.findById(created.id);
      expect(retrieved!.content).toBe(content);
    });
  });

  describe("Statistics and Counting", () => {
    it("should count evidence by case correctly", () => {
      // Create evidence for test case
      evidenceRepo.create({
        caseId: testCaseId,
        title: "Evidence 1",
        evidenceType: "note",
        content: "Content 1",
      });

      evidenceRepo.create({
        caseId: testCaseId,
        title: "Evidence 2",
        evidenceType: "email",
        content: "Content 2",
      });

      const count = evidenceRepo.countByCase(testCaseId);
      expect(count).toBe(2);
    });

    it("should count evidence by type correctly", () => {
      evidenceRepo.create({
        caseId: testCaseId,
        title: "Email 1",
        evidenceType: "email",
        content: "Email content",
      });

      evidenceRepo.create({
        caseId: testCaseId,
        title: "Email 2",
        evidenceType: "email",
        content: "Email content",
      });

      evidenceRepo.create({
        caseId: testCaseId,
        title: "Note 1",
        evidenceType: "note",
        content: "Note content",
      });

      const counts = evidenceRepo.countByType(testCaseId);

      expect(counts.email).toBe(2);
      expect(counts.note).toBe(1);
      expect(counts.document).toBe(0);
    });
  });
});
