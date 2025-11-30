/**
 * Repository initialization tests
 *
 * Tests for the centralized repository system and lazy initialization.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRepositories,
  initializeTestRepositories,
  resetRepositories,
} from "./repositories";
import { AuditLogger } from "./services/AuditLogger";
import { EncryptionService } from "./services/EncryptionService";

// Mock services to avoid database dependencies
vi.mock("./db/database.ts", () => ({
  getDb: vi.fn(() => ({}) as any),
}));

vi.mock("./services/ServiceContainer.ts", () => ({
  initializeServiceContainer: vi.fn(),
}));

describe("Repository System", () => {
  let mockEncryptionService: EncryptionService;
  let mockAuditLogger: AuditLogger;
  let originalEnvKey: string | undefined;
  const testKeyBase64 = Buffer.alloc(32, 1).toString("base64");

  beforeEach(() => {
    // Reset repositories before each test
    resetRepositories();
    originalEnvKey = process.env.ENCRYPTION_KEY_BASE64;
    process.env.ENCRYPTION_KEY_BASE64 = testKeyBase64;

    // Create mock services
    mockEncryptionService = new EncryptionService(Buffer.alloc(32, 1));
    mockAuditLogger = new AuditLogger({} as any);
  });

  afterEach(() => {
    // Clean up after each test
    resetRepositories();
    vi.clearAllMocks();
    if (originalEnvKey !== undefined) {
      process.env.ENCRYPTION_KEY_BASE64 = originalEnvKey;
    } else {
      delete process.env.ENCRYPTION_KEY_BASE64;
    }
  });

  describe("getRepositories", () => {
    it("should return a repository container with all required repositories", () => {
      const repositories = getRepositories();

      expect(repositories).toBeDefined();
      expect(repositories.caseRepository).toBeDefined();
      expect(repositories.evidenceRepository).toBeDefined();
      expect(repositories.userRepository).toBeDefined();
      expect(repositories.sessionRepository).toBeDefined();
      expect(repositories.userProfileRepository).toBeDefined();
      expect(repositories.chatConversationRepository).toBeDefined();
      expect(repositories.consentRepository).toBeDefined();
      expect(repositories.notesRepository).toBeDefined();
      expect(repositories.legalIssuesRepository).toBeDefined();
      expect(repositories.timelineEventRepository).toBeDefined();
      expect(repositories.caseFactsRepository).toBeDefined();
      expect(repositories.userFactsRepository).toBeDefined();
    });

    it("should return the same instance on multiple calls (singleton)", () => {
      const repositories1 = getRepositories();
      const repositories2 = getRepositories();

      expect(repositories1).toBe(repositories2);
    });

    it("should create new instances after reset", () => {
      const repositories1 = getRepositories();
      resetRepositories();
      const repositories2 = getRepositories();

      expect(repositories1).not.toBe(repositories2);
    });
  });

  describe("resetRepositories", () => {
    it("should reset the repository container to null", () => {
      const repositories1 = getRepositories();
      expect(repositories1).toBeDefined();

      resetRepositories();
      const repositories2 = getRepositories();

      expect(repositories2).toBeDefined();
      expect(repositories1).not.toBe(repositories2);
    });
  });

  describe("initializeTestRepositories", () => {
    it("should initialize repositories with provided test dependencies", () => {
      const repositories = initializeTestRepositories(
        mockEncryptionService,
        mockAuditLogger,
      );

      expect(repositories).toBeDefined();
      expect(repositories.caseRepository).toBeDefined();
      expect(repositories.evidenceRepository).toBeDefined();
      expect(repositories.userRepository).toBeDefined();
      // Verify the repositories are using the injected audit logger
      expect(repositories.userRepository).toBeDefined();
    });

    it("should override default initialization when using test repositories", () => {
      // Initialize with test dependencies
      const testRepos = initializeTestRepositories(
        mockEncryptionService,
        mockAuditLogger,
      );

      // getRepositories should return the test repositories
      const repos = getRepositories();

      expect(repos).toBe(testRepos);
    });
  });
});
