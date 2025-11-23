import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { createTestDatabase } from "../test-utils/database-test-helper.ts";
import { databaseManager } from "../db/database.ts";
import { CaseRepository } from "./CaseRepository.ts";
import { EncryptionService } from "../services/EncryptionService.ts";
import type { CreateCaseInput } from "../domains/cases/entities/Case";

// Create test database helper at module level
const testDbHelper = createTestDatabase();

describe("CaseRepository with Encryption", () => {
  let repository: CaseRepository;
  let encryptionService: EncryptionService;
  let testKey: Buffer;

  beforeAll(() => {
    // Initialize test database with all migrations
    const testDb = testDbHelper.initialize();

    // Inject test database into the singleton (NO MOCKING NEEDED!)
    databaseManager.setTestDatabase(testDb);
  });

  afterAll(() => {
    // Reset database singleton and cleanup
    databaseManager.resetDatabase();
    testDbHelper.cleanup();
  });

  beforeEach(() => {
    // Generate a test encryption key
    testKey = EncryptionService.generateKey();
    encryptionService = new EncryptionService(testKey);

    // Create repository instance with encryption
    repository = new CaseRepository(encryptionService);

    // Clear data for test isolation
    testDbHelper.clearAllTables();
  });

  afterEach(() => {
    // Additional cleanup if needed
  });

  describe("Encryption on Write Operations", () => {
    it("should store encrypted case description in database", () => {
      const caseInput: CreateCaseInput = {
        title: "Employment Dispute",
        caseType: "employment",
        description:
          "Confidential client details: John Doe was wrongfully terminated.",
      };

      const createdCase = repository.create(caseInput);

      // Query database directly to verify encryption
      const rawRow = testDbHelper
        .getDatabase()
        .prepare("SELECT description FROM cases WHERE id = ?")
        .get(createdCase.id) as {
        description: string | null;
      };

      expect(rawRow.description).toBeTruthy();
      expect(rawRow.description).not.toContain("Confidential");
      expect(rawRow.description).not.toContain("John Doe");
      expect(rawRow.description).not.toContain("wrongfully terminated");

      // Verify it's JSON-encoded encrypted data
      const encryptedData = JSON.parse(rawRow.description!);
      expect(encryptedData).toHaveProperty("algorithm", "aes-256-gcm");
      expect(encryptedData).toHaveProperty("ciphertext");
      expect(encryptedData).toHaveProperty("iv");
      expect(encryptedData).toHaveProperty("authTag");
      expect(encryptedData).toHaveProperty("version", 1);
    });

    it("should store null for empty description", () => {
      const caseInput: CreateCaseInput = {
        title: "Test Case",
        caseType: "consumer",
        description: "",
      };

      const createdCase = repository.create(caseInput);

      const rawRow = testDbHelper
        .getDatabase()
        .prepare("SELECT description FROM cases WHERE id = ?")
        .get(createdCase.id) as {
        description: string | null;
      };

      expect(rawRow.description).toBeNull();
    });

    it("should update and encrypt case description", () => {
      // Create initial case
      const createdCase = repository.create({
        title: "Initial Case",
        caseType: "housing",
        description: "Initial description",
      });

      // Update description
      const updated = repository.update(createdCase.id, {
        description: "Updated sensitive information: SSN 123-45-6789",
      });

      expect(updated).toBeTruthy();

      // Verify encryption in database
      const rawRow = testDbHelper
        .getDatabase()
        .prepare("SELECT description FROM cases WHERE id = ?")
        .get(createdCase.id) as {
        description: string | null;
      };

      expect(rawRow.description).not.toContain("SSN");
      expect(rawRow.description).not.toContain("123-45-6789");

      const encryptedData = JSON.parse(rawRow.description!);
      expect(encryptedData).toHaveProperty("algorithm", "aes-256-gcm");
    });
  });

  describe("Decryption on Read Operations", () => {
    it("should decrypt case description on retrieval", () => {
      const description =
        "Attorney-client privileged communication about discrimination case";

      const createdCase = repository.create({
        title: "Test Case",
        caseType: "employment",
        description,
      });

      const retrievedCase = repository.findById(createdCase.id);

      expect(retrievedCase).toBeTruthy();
      expect(retrievedCase!.description).toBe(description);
    });

    it("should decrypt all case descriptions in findAll", () => {
      const cases = [
        {
          title: "Case 1",
          caseType: "employment" as const,
          description: "Sensitive info 1",
        },
        {
          title: "Case 2",
          caseType: "housing" as const,
          description: "Sensitive info 2",
        },
        {
          title: "Case 3",
          caseType: "consumer" as const,
          description: "Sensitive info 3",
        },
      ];

      const createdIds = cases.map((c) => repository.create(c).id);

      const allCases = repository.findAll();

      expect(allCases.length).toBeGreaterThanOrEqual(3);

      createdIds.forEach((id, index) => {
        const foundCase = allCases.find((c) => c.id === id);
        expect(foundCase).toBeTruthy();
        expect(foundCase!.description).toBe(cases[index].description);
      });
    });

    it("should handle null descriptions correctly", () => {
      const createdCase = repository.create({
        title: "No Description Case",
        caseType: "family",
      });

      const retrieved = repository.findById(createdCase.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.description).toBeNull();
    });
  });

  describe("Backward Compatibility", () => {
    it("should handle legacy plaintext descriptions", () => {
      // Manually insert plaintext description (simulating legacy data)
      const result = testDbHelper
        .getDatabase()
        .prepare(
          `INSERT INTO cases (title, case_type, description, status)
         VALUES (?, ?, ?, ?)`,
        )
        .run(
          "Legacy Case",
          "consumer",
          "This is plaintext from old version",
          "active",
        );

      const caseId = result.lastInsertRowid as number;

      // Retrieve via repository - should return plaintext as-is
      const retrievedCase = repository.findById(caseId);

      expect(retrievedCase).toBeTruthy();
      expect(retrievedCase!.description).toBe(
        "This is plaintext from old version",
      );
    });

    it("should throw when encryption service is not configured", () => {
      const repoWithoutEncryption = new CaseRepository(undefined as any);

      expect(() =>
        repoWithoutEncryption.create({
          title: "Unencrypted Case",
          caseType: "debt",
          description: "This will be stored as plaintext",
        }),
      ).toThrow("EncryptionService not configured for CaseRepository");
    });
  });

  describe("Encryption Security Properties", () => {
    it("should use unique IVs for same description encrypted multiple times", () => {
      const description = "Repeated confidential information";

      const case1 = repository.create({
        title: "Case 1",
        caseType: "employment",
        description,
      });

      const case2 = repository.create({
        title: "Case 2",
        caseType: "employment",
        description,
      });

      const row1 = testDbHelper
        .getDatabase()
        .prepare("SELECT description FROM cases WHERE id = ?")
        .get(case1.id) as {
        description: string;
      };
      const row2 = testDbHelper
        .getDatabase()
        .prepare("SELECT description FROM cases WHERE id = ?")
        .get(case2.id) as {
        description: string;
      };

      const encrypted1 = JSON.parse(row1.description);
      const encrypted2 = JSON.parse(row2.description);

      // Same plaintext should produce different ciphertext and IVs
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it("should fail decryption with wrong key", () => {
      const description = "Highly confidential case details";

      const createdCase = repository.create({
        title: "Encrypted Case",
        caseType: "family",
        description,
      });

      // Create new repository with different key
      const wrongKey = EncryptionService.generateKey();
      const wrongEncryptionService = new EncryptionService(wrongKey);
      const repoWithWrongKey = new CaseRepository(wrongEncryptionService);

      // Attempting to read with wrong key should either:
      // 1. Throw an error during decryption
      // 2. Return the encrypted JSON string as-is (backward compat mode)
      const retrieved = repoWithWrongKey.findById(createdCase.id);

      expect(retrieved).toBeTruthy();
      // Description should NOT match original (decryption failed)
      expect(retrieved!.description).not.toBe(description);
    });
  });

  describe("Round-Trip Testing", () => {
    it("should successfully encrypt and decrypt unicode characters", () => {
      const description =
        "Legal notice in Chinese: 法律通知 📄 ⚖️ Arabic: إشعار قانوني";

      const createdCase = repository.create({
        title: "Unicode Case",
        caseType: "other",
        description,
      });

      const retrieved = repository.findById(createdCase.id);
      expect(retrieved!.description).toBe(description);
    });

    it("should handle large descriptions (10KB+)", () => {
      // Generate 10KB of text
      const largeDescription = "Legal case details: ".repeat(500); // ~10KB

      const createdCase = repository.create({
        title: "Large Case",
        caseType: "employment",
        description: largeDescription,
      });

      const retrieved = repository.findById(createdCase.id);
      expect(retrieved!.description).toBe(largeDescription);
    });

    it("should handle special legal characters", () => {
      const description =
        "§123.45(a)(1) - \"Plaintiff\" vs. 'Defendant' @ 50% liability [cite: 2024 WL 12345]";

      const createdCase = repository.create({
        title: "Special Chars Case",
        caseType: "consumer",
        description,
      });

      const retrieved = repository.findById(createdCase.id);
      expect(retrieved!.description).toBe(description);
    });
  });
});
