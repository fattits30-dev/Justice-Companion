import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { UserFactsRepository } from './UserFactsRepository';
import { EncryptionService } from '../services/EncryptionService.js';
import { AuditLogger } from '../services/AuditLogger.js';
import * as databaseModule from '../db/database';

describe('UserFactsRepository', () => {
  let db: Database.Database | null = null;
  let repository: UserFactsRepository;
  let encryptionService: EncryptionService;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create schema
    db.exec(`
      CREATE TABLE cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        case_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE user_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        fact_content TEXT NOT NULL,
        fact_type TEXT NOT NULL CHECK(fact_type IN ('personal', 'employment', 'financial', 'contact', 'medical', 'other')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'export', 'decrypt')),
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1)),
        error_message TEXT,
        integrity_hash TEXT NOT NULL,
        previous_log_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
      CREATE INDEX idx_audit_logs_chain ON audit_logs(timestamp ASC, id ASC);
    `);

    // Create test case
    db.prepare(`
      INSERT INTO cases (title, case_type)
      VALUES ('Test Case', 'employment')
    `).run();

    // Initialize services
    const encryptionKey = EncryptionService.generateKey();
    encryptionService = new EncryptionService(encryptionKey);
    auditLogger = new AuditLogger(db);

    // Initialize repository with encryption and audit logging
    repository = new UserFactsRepository(encryptionService, auditLogger);

    // Mock getDb to use test database
    vi.spyOn(databaseModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a user fact with encrypted content', () => {
      const fact = repository.create({
        caseId: 1,
        factContent: 'SSN: 123-45-6789',
        factType: 'personal',
      });

      expect(fact.id).toBe(1);
      expect(fact.caseId).toBe(1);
      expect(fact.factContent).toBe('SSN: 123-45-6789');
      expect(fact.factType).toBe('personal');

      // Verify content is encrypted in database
      const storedFact = db.prepare('SELECT fact_content FROM user_facts WHERE id = ?').get(1) as { fact_content: string };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty('algorithm');
      expect(parsedContent).toHaveProperty('ciphertext');
      expect(parsedContent).toHaveProperty('iv');
      expect(parsedContent).toHaveProperty('authTag');
      expect(parsedContent.algorithm).toBe('aes-256-gcm');
    });

    it('should create user facts with different types', () => {
      const factTypes: Array<'personal' | 'employment' | 'financial' | 'contact' | 'medical' | 'other'> = [
        'personal',
        'employment',
        'financial',
        'contact',
        'medical',
        'other',
      ];

      factTypes.forEach((factType, index) => {
        const fact = repository.create({
          caseId: 1,
          factContent: `Test ${factType} fact`,
          factType,
        });

        expect(fact.id).toBe(index + 1);
        expect(fact.factType).toBe(factType);
      });
    });

    it('should audit user fact creation', () => {
      repository.create({
        caseId: 1,
        factContent: 'Phone: 555-1234',
        factType: 'contact',
      });

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.create');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as {
        resource_type: string;
        action: string;
        success: number;
        details: string;
      };

      expect(log.resource_type).toBe('user_fact');
      expect(log.action).toBe('create');
      expect(log.success).toBe(1);

      const details = JSON.parse(log.details);
      expect(details.caseId).toBe(1);
      expect(details.factType).toBe('contact');
      expect(details.contentLength).toBe(15);
    });

    it('should throw error if encryption service is missing', () => {
      const repoWithoutEncryption = new UserFactsRepository();

      expect(() => {
        repoWithoutEncryption.create({
          caseId: 1,
          factContent: 'Test fact',
          factType: 'personal',
        });
      }).toThrow('EncryptionService is required');
    });

    it('should audit failed creation', () => {
      const repoWithoutEncryption = new UserFactsRepository(undefined, auditLogger);

      try {
        repoWithoutEncryption.create({
          caseId: 1,
          factContent: 'Test fact',
          factType: 'personal',
        });
      } catch (error) {
        // Expected error
      }

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ? AND success = 0').all('user_fact.create');
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find user fact by ID and decrypt content', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Date of birth: 1990-01-01',
        factType: 'personal',
      });

      const found = repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.factContent).toBe('Date of birth: 1990-01-01');
      expect(found!.factType).toBe('personal');
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById(999);
      expect(found).toBeNull();
    });

    it('should audit content access when decrypting', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Salary: $50,000',
        factType: 'financial',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('user_fact.content_access');

      repository.findById(created.id);

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as {
        resource_type: string;
        action: string;
        details: string;
      };

      expect(log.resource_type).toBe('user_fact');
      expect(log.action).toBe('read');

      const details = JSON.parse(log.details);
      expect(details.field).toBe('fact_content');
      expect(details.encrypted).toBe(true);
    });
  });

  describe('findByCaseId', () => {
    it('should find all user facts for a case', () => {
      repository.create({
        caseId: 1,
        factContent: 'Fact 1',
        factType: 'personal',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 2',
        factType: 'employment',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 3',
        factType: 'financial',
      });

      const facts = repository.findByCaseId(1);

      expect(facts).toHaveLength(3);
      expect(facts.map((f) => f.factContent)).toContain('Fact 1');
      expect(facts.map((f) => f.factContent)).toContain('Fact 2');
      expect(facts.map((f) => f.factContent)).toContain('Fact 3');
    });

    it('should return empty array for case with no facts', () => {
      const facts = repository.findByCaseId(1);
      expect(facts).toEqual([]);
    });

    it('should audit bulk content access', () => {
      repository.create({
        caseId: 1,
        factContent: 'Fact 1',
        factType: 'personal',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 2',
        factType: 'employment',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('user_fact.content_access');

      repository.findByCaseId(1);

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.count).toBe(2);
    });
  });

  describe('findByType', () => {
    it('should find user facts by type', () => {
      repository.create({
        caseId: 1,
        factContent: 'Personal fact 1',
        factType: 'personal',
      });

      repository.create({
        caseId: 1,
        factContent: 'Employment fact',
        factType: 'employment',
      });

      repository.create({
        caseId: 1,
        factContent: 'Personal fact 2',
        factType: 'personal',
      });

      const personalFacts = repository.findByType(1, 'personal');
      const employmentFacts = repository.findByType(1, 'employment');

      expect(personalFacts).toHaveLength(2);
      expect(employmentFacts).toHaveLength(1);
      expect(personalFacts.every((f) => f.factType === 'personal')).toBe(true);
      expect(employmentFacts.every((f) => f.factType === 'employment')).toBe(true);
    });

    it('should return empty array for type with no facts', () => {
      const medicalFacts = repository.findByType(1, 'medical');
      expect(medicalFacts).toEqual([]);
    });

    it('should audit filtered content access', () => {
      repository.create({
        caseId: 1,
        factContent: 'Financial fact',
        factType: 'financial',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('user_fact.content_access');

      repository.findByType(1, 'financial');

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factType).toBe('financial');
    });
  });

  describe('update', () => {
    it('should update fact content with re-encryption', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Old content',
        factType: 'personal',
      });

      const updated = repository.update(created.id, {
        factContent: 'New content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.factContent).toBe('New content');

      // Verify new content is encrypted in database
      const storedFact = db.prepare('SELECT fact_content FROM user_facts WHERE id = ?').get(created.id) as { fact_content: string };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty('ciphertext');
      expect(parsedContent.algorithm).toBe('aes-256-gcm');
    });

    it('should update fact type', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      const updated = repository.update(created.id, {
        factType: 'employment',
      });

      expect(updated).not.toBeNull();
      expect(updated!.factType).toBe('employment');
      expect(updated!.factContent).toBe('Test fact'); // Content unchanged
    });

    it('should update both content and type', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Old fact',
        factType: 'personal',
      });

      const updated = repository.update(created.id, {
        factContent: 'New fact',
        factType: 'financial',
      });

      expect(updated).not.toBeNull();
      expect(updated!.factContent).toBe('New fact');
      expect(updated!.factType).toBe('financial');
    });

    it('should audit update operation', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      repository.update(created.id, {
        factContent: 'Updated fact',
      });

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.update');
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[auditLogs.length - 1] as {
        resource_type: string;
        action: string;
        success: number;
        details: string;
      };

      expect(log.resource_type).toBe('user_fact');
      expect(log.action).toBe('update');
      expect(log.success).toBe(1);

      const details = JSON.parse(log.details);
      expect(details.updatedFields).toContain('factContent');
    });

    it('should throw error if encryption service is missing', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      const repoWithoutEncryption = new UserFactsRepository();

      expect(() => {
        repoWithoutEncryption.update(created.id, {
          factContent: 'New content',
        });
      }).toThrow('EncryptionService is required');
    });
  });

  describe('delete', () => {
    it('should delete user fact', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'To be deleted',
        factType: 'personal',
      });

      const success = repository.delete(created.id);
      expect(success).toBe(true);

      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent fact', () => {
      const success = repository.delete(999);
      expect(success).toBe(false);
    });

    it('should audit delete operation', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      repository.delete(created.id);

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.delete');
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[auditLogs.length - 1] as {
        resource_type: string;
        action: string;
        success: number;
      };

      expect(log.resource_type).toBe('user_fact');
      expect(log.action).toBe('delete');
      expect(log.success).toBe(1);
    });
  });

  describe('backward compatibility', () => {
    it('should handle legacy plaintext data', () => {
      // Insert plaintext fact directly
      db.prepare(`
        INSERT INTO user_facts (case_id, fact_content, fact_type)
        VALUES (?, ?, ?)
      `).run(1, 'Plaintext fact', 'personal');

      const found = repository.findById(1);

      expect(found).not.toBeNull();
      expect(found!.factContent).toBe('Plaintext fact');
    });

    it('should handle repository without encryption service', () => {
      const repoWithoutEncryption = new UserFactsRepository();

      // Insert plaintext fact
      db.prepare(`
        INSERT INTO user_facts (case_id, fact_content, fact_type)
        VALUES (?, ?, ?)
      `).run(1, 'Plaintext fact', 'personal');

      const found = repoWithoutEncryption.findById(1);

      expect(found).not.toBeNull();
      expect(found!.factContent).toBe('Plaintext fact');
    });
  });

  describe('dependency injection', () => {
    it('should allow setting encryption service', () => {
      const repo = new UserFactsRepository();
      repo.setEncryptionService(encryptionService);

      const fact = repo.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      expect(fact.factContent).toBe('Test fact');
    });

    it('should allow setting audit logger', () => {
      const repo = new UserFactsRepository(encryptionService);
      repo.setAuditLogger(auditLogger);

      repo.create({
        caseId: 1,
        factContent: 'Test fact',
        factType: 'personal',
      });

      const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.create');
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('CASCADE DELETE', () => {
    it('should delete user facts when case is deleted', () => {
      repository.create({
        caseId: 1,
        factContent: 'Fact 1',
        factType: 'personal',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 2',
        factType: 'employment',
      });

      // Delete the case
      db.prepare('DELETE FROM cases WHERE id = ?').run(1);

      // Facts should be deleted
      const facts = db.prepare('SELECT * FROM user_facts WHERE case_id = ?').all(1);
      expect(facts).toHaveLength(0);
    });
  });
});
