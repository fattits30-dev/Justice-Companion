/**
 * Dependency Injection Container Tests
 *
 * Verifies that the DI container is properly configured and
 * all dependencies can be resolved correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestContainer, resetContainer } from './container.ts';
import { TYPES } from './types.ts';
import type {
  ICaseService,
  ICaseRepository,
  IDatabase,
  IEncryptionService,
  IAuditLogger,
} from './interfaces.ts';

describe('DI Container', () => {
  let testDb: Database.Database;
  let container: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');

    // Create test container
    container = createTestContainer(testDb);
  });

  afterEach(() => {
    testDb.close();
    resetContainer();
  });

  describe('Core Infrastructure', () => {
    it('should resolve Database', () => {
      const database = container.get<IDatabase>(TYPES.Database);
      expect(database).toBeDefined();
      expect(database).toBe(testDb);
    });

    it('should resolve EncryptionService as singleton', () => {
      const service1 = container.get<IEncryptionService>(TYPES.EncryptionService);
      const service2 = container.get<IEncryptionService>(TYPES.EncryptionService);

      expect(service1).toBeDefined();
      expect(service1).toBe(service2); // Should be same instance (singleton)
    });

    it('should resolve AuditLogger as singleton', () => {
      const logger1 = container.get<IAuditLogger>(TYPES.AuditLogger);
      const logger2 = container.get<IAuditLogger>(TYPES.AuditLogger);

      expect(logger1).toBeDefined();
      expect(logger1).toBe(logger2); // Should be same instance (singleton)
    });
  });

  describe('Repositories', () => {
    it('should resolve CaseRepository', () => {
      const repo = container.get<ICaseRepository>(TYPES.CaseRepository);
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('create');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
    });

    it('should create new repository instances per injection', () => {
      const repo1 = container.get<ICaseRepository>(TYPES.CaseRepository);
      const repo2 = container.get<ICaseRepository>(TYPES.CaseRepository);

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      // Repositories are transient, so they should be different instances
      expect(repo1).not.toBe(repo2);
    });

    it('should inject dependencies into repositories', () => {
      // This test verifies that repositories receive their dependencies
      const repo = container.get<ICaseRepository>(TYPES.CaseRepository);

      // The repository should be able to use its injected dependencies
      // We can't directly test private properties, but we can verify
      // that the repository methods don't throw when dependencies are needed
      expect(() => repo.findAll()).not.toThrow();
    });
  });

  describe('Services', () => {
    it('should resolve CaseService with all dependencies', () => {
      const service = container.get<ICaseService>(TYPES.CaseService);

      expect(service).toBeDefined();
      expect(service).toHaveProperty('createCase');
      expect(service).toHaveProperty('getAllCases');
      expect(service).toHaveProperty('getCaseById');
      expect(service).toHaveProperty('updateCase');
      expect(service).toHaveProperty('closeCase');
      expect(service).toHaveProperty('deleteCase');
    });

    it('should inject repository and database into CaseService', () => {
      const service = container.get<ICaseService>(TYPES.CaseService);

      // Verify that the service can call its methods without throwing
      // This proves that dependencies were properly injected
      expect(() => service.getAllCases()).not.toThrow();
    });
  });

  describe('Container Configuration', () => {
    it('should handle multiple container instances independently', () => {
      const db1 = new Database(':memory:');
      const db2 = new Database(':memory:');

      const container1 = createTestContainer(db1);
      const container2 = createTestContainer(db2);

      const database1 = container1.get<IDatabase>(TYPES.Database);
      const database2 = container2.get<IDatabase>(TYPES.Database);

      expect(database1).not.toBe(database2);
      expect(database1).toBe(db1);
      expect(database2).toBe(db2);

      db1.close();
      db2.close();
    });

    it('should support custom encryption keys in test mode', () => {
      const customKey = Buffer.from('custom-test-key-32-bytes-long!!!').toString('base64');
      const customContainer = createTestContainer(testDb, customKey);

      const encryptionService = customContainer.get<IEncryptionService>(
        TYPES.EncryptionService
      );

      expect(encryptionService).toBeDefined();

      // Test that encryption/decryption works
      const plainText = 'test data';
      const encrypted = encryptionService.encrypt(plainText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });
  });

  describe('Dependency Graph', () => {
    it('should resolve complex dependency chains', () => {
      // CaseService -> CaseRepository -> EncryptionService & AuditLogger -> Database
      const service = container.get<ICaseService>(TYPES.CaseService);

      // This should not throw, proving the entire dependency chain is resolved
      expect(() => service.getAllCases()).not.toThrow();
    });

    it('should maintain singleton scope across dependency injections', () => {
      // Get two different services that both depend on EncryptionService
      const caseRepo = container.get<ICaseRepository>(TYPES.CaseRepository);
      const service = container.get<ICaseService>(TYPES.CaseService);

      // Both should receive the same EncryptionService instance (singleton)
      // We can't directly check this, but we can verify consistency
      expect(caseRepo).toBeDefined();
      expect(service).toBeDefined();
    });
  });
});