import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { CaseFactsRepository } from './CaseFactsRepository';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogger } from '../services/AuditLogger';
import * as databaseModule from '../db/database';

describe('CaseFactsRepository', () => {
  let db: Database.Database;
  let repository: CaseFactsRepository;
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

      CREATE TABLE case_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        fact_content TEXT NOT NULL,
        fact_category TEXT NOT NULL CHECK(fact_category IN ('timeline', 'evidence', 'witness', 'location', 'communication', 'other')),
        importance TEXT NOT NULL CHECK(importance IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
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
    db.prepare(
      `
      INSERT INTO cases (title, case_type)
      VALUES ('Test Case', 'employment')
    `
    ).run();

    // Initialize services
    const encryptionKey = EncryptionService.generateKey();
    encryptionService = new EncryptionService(encryptionKey);
    auditLogger = new AuditLogger(db);

    // Initialize repository with encryption and audit logging
    repository = new CaseFactsRepository(encryptionService, auditLogger);

    // Mock getDb to use test database
    vi.spyOn(databaseModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a case fact with encrypted content', () => {
      const fact = repository.create({
        caseId: 1,
        factContent: 'Meeting with witness John Doe at 3pm',
        factCategory: 'witness',
        importance: 'high',
      });

      expect(fact.id).toBe(1);
      expect(fact.caseId).toBe(1);
      expect(fact.factContent).toBe('Meeting with witness John Doe at 3pm');
      expect(fact.factCategory).toBe('witness');
      expect(fact.importance).toBe('high');

      // Verify content is encrypted in database
      const storedFact = db.prepare('SELECT fact_content FROM case_facts WHERE id = ?').get(1) as {
        fact_content: string;
      };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty('algorithm');
      expect(parsedContent).toHaveProperty('ciphertext');
      expect(parsedContent).toHaveProperty('iv');
      expect(parsedContent).toHaveProperty('authTag');
      expect(parsedContent.algorithm).toBe('aes-256-gcm');
    });

    it('should create case facts with different categories', () => {
      const factCategories: Array<
        'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other'
      > = ['timeline', 'evidence', 'witness', 'location', 'communication', 'other'];

      factCategories.forEach((factCategory, index) => {
        const fact = repository.create({
          caseId: 1,
          factContent: `Test ${factCategory} fact`,
          factCategory,
        });

        expect(fact.id).toBe(index + 1);
        expect(fact.factCategory).toBe(factCategory);
        expect(fact.importance).toBe('medium'); // Default importance
      });
    });

    it('should create case facts with different importance levels', () => {
      const importanceLevels: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      importanceLevels.forEach((importance, index) => {
        const fact = repository.create({
          caseId: 1,
          factContent: `Test fact with ${importance} importance`,
          factCategory: 'timeline',
          importance,
        });

        expect(fact.id).toBe(index + 1);
        expect(fact.importance).toBe(importance);
      });
    });

    it('should audit case fact creation', () => {
      repository.create({
        caseId: 1,
        factContent: 'Email received from opposing counsel',
        factCategory: 'communication',
        importance: 'critical',
      });

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.create');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as {
        resource_type: string;
        action: string;
        success: number;
        details: string;
      };

      expect(log.resource_type).toBe('case_fact');
      expect(log.action).toBe('create');
      expect(log.success).toBe(1);

      const details = JSON.parse(log.details);
      expect(details.caseId).toBe(1);
      expect(details.factCategory).toBe('communication');
      expect(details.importance).toBe('critical');
      expect(details.contentLength).toBe(36);
    });
  });

  describe('findById', () => {
    it('should find case fact by ID and decrypt content', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Document submitted on 2024-01-15',
        factCategory: 'timeline',
        importance: 'medium',
      });

      const found = repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.factContent).toBe('Document submitted on 2024-01-15');
      expect(found!.factCategory).toBe('timeline');
      expect(found!.importance).toBe('medium');
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById(999);
      expect(found).toBeNull();
    });

    it('should audit content access', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Confidential witness statement',
        factCategory: 'witness',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('case_fact.content_access');

      repository.findById(created.id);

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factId).toBe(created.id);
    });
  });

  describe('findByCaseId', () => {
    it('should find all case facts for a case ordered by importance', () => {
      repository.create({
        caseId: 1,
        factContent: 'Low importance fact',
        factCategory: 'timeline',
        importance: 'low',
      });

      repository.create({
        caseId: 1,
        factContent: 'Critical fact',
        factCategory: 'witness',
        importance: 'critical',
      });

      repository.create({
        caseId: 1,
        factContent: 'Medium importance fact',
        factCategory: 'evidence',
        importance: 'medium',
      });

      const facts = repository.findByCaseId(1);

      expect(facts).toHaveLength(3);
      // Should be ordered by importance DESC
      expect(facts[0].importance).toBe('critical');
      expect(facts[2].importance).toBe('low');
    });

    it('should return empty array for case with no facts', () => {
      const facts = repository.findByCaseId(1);
      expect(facts).toEqual([]);
    });

    it('should audit bulk content access', () => {
      repository.create({
        caseId: 1,
        factContent: 'Fact 1',
        factCategory: 'timeline',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 2',
        factCategory: 'witness',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('case_fact.content_access');

      repository.findByCaseId(1);

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.count).toBe(2);
    });
  });

  describe('findByCategory', () => {
    it('should find case facts by category', () => {
      repository.create({
        caseId: 1,
        factContent: 'Timeline fact 1',
        factCategory: 'timeline',
      });

      repository.create({
        caseId: 1,
        factContent: 'Witness fact',
        factCategory: 'witness',
      });

      repository.create({
        caseId: 1,
        factContent: 'Timeline fact 2',
        factCategory: 'timeline',
      });

      const timelineFacts = repository.findByCategory(1, 'timeline');
      const witnessFacts = repository.findByCategory(1, 'witness');

      expect(timelineFacts).toHaveLength(2);
      expect(witnessFacts).toHaveLength(1);
      expect(timelineFacts.every((f) => f.factCategory === 'timeline')).toBe(true);
      expect(witnessFacts.every((f) => f.factCategory === 'witness')).toBe(true);
    });

    it('should return empty array for category with no facts', () => {
      const evidenceFacts = repository.findByCategory(1, 'evidence');
      expect(evidenceFacts).toEqual([]);
    });

    it('should audit filtered content access', () => {
      repository.create({
        caseId: 1,
        factContent: 'Location fact',
        factCategory: 'location',
      });

      // Clear previous audit logs
      db.prepare('DELETE FROM audit_logs WHERE event_type = ?').run('case_fact.content_access');

      repository.findByCategory(1, 'location');

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.content_access');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factCategory).toBe('location');
    });
  });

  describe('findByImportance', () => {
    it('should find case facts by importance level', () => {
      repository.create({
        caseId: 1,
        factContent: 'Critical fact',
        factCategory: 'timeline',
        importance: 'critical',
      });

      repository.create({
        caseId: 1,
        factContent: 'Low importance fact',
        factCategory: 'witness',
        importance: 'low',
      });

      repository.create({
        caseId: 1,
        factContent: 'Another critical fact',
        factCategory: 'evidence',
        importance: 'critical',
      });

      const criticalFacts = repository.findByImportance(1, 'critical');
      const lowFacts = repository.findByImportance(1, 'low');

      expect(criticalFacts).toHaveLength(2);
      expect(lowFacts).toHaveLength(1);
      expect(criticalFacts.every((f) => f.importance === 'critical')).toBe(true);
      expect(lowFacts.every((f) => f.importance === 'low')).toBe(true);
    });

    it('should return empty array for importance level with no facts', () => {
      const highFacts = repository.findByImportance(1, 'high');
      expect(highFacts).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update fact content with re-encryption', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Old content',
        factCategory: 'timeline',
      });

      const updated = repository.update(created.id, {
        factContent: 'New content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.factContent).toBe('New content');

      // Verify new content is encrypted in database
      const storedFact = db
        .prepare('SELECT fact_content FROM case_facts WHERE id = ?')
        .get(created.id) as { fact_content: string };
      const parsedContent = JSON.parse(storedFact.fact_content);

      expect(parsedContent).toHaveProperty('ciphertext');
      expect(parsedContent.algorithm).toBe('aes-256-gcm');
    });

    it('should update fact category and importance', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Test fact',
        factCategory: 'timeline',
        importance: 'medium',
      });

      const updated = repository.update(created.id, {
        factCategory: 'witness',
        importance: 'critical',
      });

      expect(updated).not.toBeNull();
      expect(updated!.factCategory).toBe('witness');
      expect(updated!.importance).toBe('critical');
    });

    it('should return null for non-existent ID', () => {
      const updated = repository.update(999, {
        factContent: 'New content',
      });

      expect(updated).toBeNull();
    });

    it('should audit fact updates', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Original content',
        factCategory: 'timeline',
      });

      repository.update(created.id, {
        factContent: 'Updated content',
        importance: 'high',
      });

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.update');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factId).toBe(created.id);
      expect(details.changes).toHaveProperty('factContent');
      expect(details.changes).toHaveProperty('importance');
    });
  });

  describe('delete', () => {
    it('should delete case fact', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Fact to delete',
        factCategory: 'timeline',
      });

      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const deleted = repository.delete(999);
      expect(deleted).toBe(false);
    });

    it('should audit fact deletion', () => {
      const created = repository.create({
        caseId: 1,
        factContent: 'Fact to delete',
        factCategory: 'timeline',
      });

      repository.delete(created.id);

      const auditLogs = db
        .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
        .all('case_fact.delete');
      expect(auditLogs).toHaveLength(1);

      const log = auditLogs[0] as { details: string };
      const details = JSON.parse(log.details);
      expect(details.factId).toBe(created.id);
    });
  });

  describe('backward compatibility', () => {
    it('should handle legacy plaintext data', () => {
      // Insert plaintext fact directly
      db.prepare(
        `
        INSERT INTO case_facts (case_id, fact_content, fact_category, importance)
        VALUES (?, ?, ?, ?)
      `
      ).run(1, 'Plaintext fact', 'timeline', 'medium');

      const found = repository.findById(1);

      expect(found).not.toBeNull();
      expect(found!.factContent).toBe('Plaintext fact');
    });
  });

  describe('CASCADE DELETE', () => {
    it('should delete case facts when case is deleted', () => {
      repository.create({
        caseId: 1,
        factContent: 'Fact 1',
        factCategory: 'timeline',
      });

      repository.create({
        caseId: 1,
        factContent: 'Fact 2',
        factCategory: 'witness',
      });

      // Delete the case
      db.prepare('DELETE FROM cases WHERE id = ?').run(1);

      // Facts should be deleted
      const facts = db.prepare('SELECT * FROM case_facts WHERE case_id = ?').all(1);
      expect(facts).toHaveLength(0);
    });
  });
});
