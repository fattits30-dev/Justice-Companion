import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { UserFactsRepository } from './UserFactsRepository';
import { CaseFactsRepository } from './CaseFactsRepository';
import { EncryptionService } from '../services/EncryptionService.js';
import { AuditLogger } from '../services/AuditLogger.js';
import * as databaseModule from '../db/database';

describe('Facts Repositories Integration Tests', () => {
  let db: Database.Database;
  let userFactsRepo: UserFactsRepository;
  let caseFactsRepo: CaseFactsRepository;
  let encryptionService: EncryptionService;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create full schema with both tables
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
    db.prepare(`
      INSERT INTO cases (title, case_type)
      VALUES ('Employment Discrimination Case', 'employment')
    `).run();

    // Initialize services
    const encryptionKey = EncryptionService.generateKey();
    encryptionService = new EncryptionService(encryptionKey);
    auditLogger = new AuditLogger(db);

    // Initialize both repositories
    userFactsRepo = new UserFactsRepository(encryptionService, auditLogger);
    caseFactsRepo = new CaseFactsRepository(encryptionService, auditLogger);

    // Mock getDb to use test database
    vi.spyOn(databaseModule, 'getDb').mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  describe('Creating both fact types for a case', () => {
    it('should create user facts and case facts for the same case', () => {
      // Create user facts (personal information)
      userFactsRepo.create({
        caseId: 1,
        factContent: 'Name: Jane Smith',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Email: jane.smith@example.com',
        factType: 'contact',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Salary: $75,000/year',
        factType: 'financial',
      });

      // Create case facts (case-specific information)
      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Meeting with HR on 2024-01-15',
        factCategory: 'timeline',
        importance: 'high',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Witness: John Doe, coworker',
        factCategory: 'witness',
        importance: 'critical',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Email from supervisor dated 2024-01-10',
        factCategory: 'evidence',
        importance: 'critical',
      });

      // Verify user facts
      const userFacts = userFactsRepo.findByCaseId(1);
      expect(userFacts).toHaveLength(3);
      expect(userFacts.map((f) => f.factType)).toContain('personal');
      expect(userFacts.map((f) => f.factType)).toContain('contact');
      expect(userFacts.map((f) => f.factType)).toContain('financial');

      // Verify case facts
      const caseFacts = caseFactsRepo.findByCaseId(1);
      expect(caseFacts).toHaveLength(3);
      expect(caseFacts.map((f) => f.factCategory)).toContain('timeline');
      expect(caseFacts.map((f) => f.factCategory)).toContain('witness');
      expect(caseFacts.map((f) => f.factCategory)).toContain('evidence');
    });
  });

  describe('Encryption verification across both repositories', () => {
    it('should encrypt both user facts and case facts independently', () => {
      const userFact = userFactsRepo.create({
        caseId: 1,
        factContent: 'SSN: 123-45-6789',
        factType: 'personal',
      });

      const caseFact = caseFactsRepo.create({
        caseId: 1,
        factContent: 'Location: 123 Main St, City, State',
        factCategory: 'location',
      });

      // Verify user fact is encrypted in database
      const storedUserFact = db.prepare('SELECT fact_content FROM user_facts WHERE id = ?').get(userFact.id) as { fact_content: string };
      const userFactData = JSON.parse(storedUserFact.fact_content);
      expect(userFactData.algorithm).toBe('aes-256-gcm');
      expect(userFactData).toHaveProperty('ciphertext');

      // Verify case fact is encrypted in database
      const storedCaseFact = db.prepare('SELECT fact_content FROM case_facts WHERE id = ?').get(caseFact.id) as { fact_content: string };
      const caseFactData = JSON.parse(storedCaseFact.fact_content);
      expect(caseFactData.algorithm).toBe('aes-256-gcm');
      expect(caseFactData).toHaveProperty('ciphertext');

      // Verify they decrypt correctly
      const retrievedUserFact = userFactsRepo.findById(userFact.id);
      const retrievedCaseFact = caseFactsRepo.findById(caseFact.id);

      expect(retrievedUserFact!.factContent).toBe('SSN: 123-45-6789');
      expect(retrievedCaseFact!.factContent).toBe('Location: 123 Main St, City, State');
    });
  });

  describe('Filtering and categorization', () => {
    beforeEach(() => {
      // Create diverse set of facts
      userFactsRepo.create({
        caseId: 1,
        factContent: 'Personal info 1',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Personal info 2',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Employment info',
        factType: 'employment',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Timeline event 1',
        factCategory: 'timeline',
        importance: 'high',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Timeline event 2',
        factCategory: 'timeline',
        importance: 'low',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Critical evidence',
        factCategory: 'evidence',
        importance: 'critical',
      });
    });

    it('should filter user facts by type', () => {
      const personalFacts = userFactsRepo.findByType(1, 'personal');
      const employmentFacts = userFactsRepo.findByType(1, 'employment');

      expect(personalFacts).toHaveLength(2);
      expect(employmentFacts).toHaveLength(1);
    });

    it('should filter case facts by category', () => {
      const timelineFacts = caseFactsRepo.findByCategory(1, 'timeline');
      const evidenceFacts = caseFactsRepo.findByCategory(1, 'evidence');

      expect(timelineFacts).toHaveLength(2);
      expect(evidenceFacts).toHaveLength(1);
    });

    it('should filter case facts by importance', () => {
      const criticalFacts = caseFactsRepo.findByImportance(1, 'critical');
      const highFacts = caseFactsRepo.findByImportance(1, 'high');
      const lowFacts = caseFactsRepo.findByImportance(1, 'low');

      expect(criticalFacts).toHaveLength(1);
      expect(highFacts).toHaveLength(1);
      expect(lowFacts).toHaveLength(1);
    });
  });

  describe('Cascade delete behavior', () => {
    it('should delete both user facts and case facts when case is deleted', () => {
      // Create facts
      userFactsRepo.create({
        caseId: 1,
        factContent: 'User fact 1',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'User fact 2',
        factType: 'employment',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Case fact 1',
        factCategory: 'timeline',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Case fact 2',
        factCategory: 'witness',
      });

      // Verify facts exist
      expect(userFactsRepo.findByCaseId(1)).toHaveLength(2);
      expect(caseFactsRepo.findByCaseId(1)).toHaveLength(2);

      // Delete the case
      db.prepare('DELETE FROM cases WHERE id = ?').run(1);

      // Verify all facts are deleted
      expect(userFactsRepo.findByCaseId(1)).toHaveLength(0);
      expect(caseFactsRepo.findByCaseId(1)).toHaveLength(0);
    });
  });

  describe('Audit trail verification', () => {
    it('should create separate audit logs for user facts and case facts', () => {
      userFactsRepo.create({
        caseId: 1,
        factContent: 'User fact',
        factType: 'personal',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Case fact',
        factCategory: 'timeline',
      });

      const userFactAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.create');
      const caseFactAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('case_fact.create');

      expect(userFactAudits).toHaveLength(1);
      expect(caseFactAudits).toHaveLength(1);
    });

    it('should audit content access for both fact types', () => {
      const userFact = userFactsRepo.create({
        caseId: 1,
        factContent: 'User fact',
        factType: 'personal',
      });

      const caseFact = caseFactsRepo.create({
        caseId: 1,
        factContent: 'Case fact',
        factCategory: 'timeline',
      });

      // Clear previous content access logs
      db.prepare('DELETE FROM audit_logs WHERE event_type LIKE ?').run('%content_access%');

      userFactsRepo.findById(userFact.id);
      caseFactsRepo.findById(caseFact.id);

      const userFactAccessAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.content_access');
      const caseFactAccessAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('case_fact.content_access');

      expect(userFactAccessAudits).toHaveLength(1);
      expect(caseFactAccessAudits).toHaveLength(1);
    });

    it('should audit updates and deletes for both fact types', () => {
      const userFact = userFactsRepo.create({
        caseId: 1,
        factContent: 'User fact',
        factType: 'personal',
      });

      const caseFact = caseFactsRepo.create({
        caseId: 1,
        factContent: 'Case fact',
        factCategory: 'timeline',
      });

      userFactsRepo.update(userFact.id, { factContent: 'Updated user fact' });
      caseFactsRepo.update(caseFact.id, { factContent: 'Updated case fact' });

      userFactsRepo.delete(userFact.id);
      caseFactsRepo.delete(caseFact.id);

      const userFactUpdateAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.update');
      const caseFactUpdateAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('case_fact.update');
      const userFactDeleteAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('user_fact.delete');
      const caseFactDeleteAudits = db.prepare('SELECT * FROM audit_logs WHERE event_type = ?').all('case_fact.delete');

      expect(userFactUpdateAudits.length).toBeGreaterThan(0);
      expect(caseFactUpdateAudits.length).toBeGreaterThan(0);
      expect(userFactDeleteAudits.length).toBeGreaterThan(0);
      expect(caseFactDeleteAudits.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world case scenario', () => {
    it('should handle a complete employment discrimination case with mixed facts', () => {
      // User personal facts (P0 encryption - direct PII)
      userFactsRepo.create({
        caseId: 1,
        factContent: 'Full Name: Jane Elizabeth Smith',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'DOB: 1985-03-15',
        factType: 'personal',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Phone: (555) 123-4567',
        factType: 'contact',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Email: jane.smith@email.com',
        factType: 'contact',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Job Title: Senior Software Engineer',
        factType: 'employment',
      });

      userFactsRepo.create({
        caseId: 1,
        factContent: 'Annual Salary: $95,000',
        factType: 'financial',
      });

      // Case facts (P1 encryption - may contain PII)
      caseFactsRepo.create({
        caseId: 1,
        factContent: '2023-01-10: Started employment at TechCorp Inc.',
        factCategory: 'timeline',
        importance: 'medium',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: '2024-01-15: First incident of discrimination reported to HR',
        factCategory: 'timeline',
        importance: 'critical',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: '2024-02-01: Second warning received from supervisor',
        factCategory: 'timeline',
        importance: 'critical',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Witness: John Doe, Engineering Manager, witnessed discriminatory comments',
        factCategory: 'witness',
        importance: 'high',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Witness: Sarah Johnson, HR Representative, present at initial complaint meeting',
        factCategory: 'witness',
        importance: 'high',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Email thread between supervisor and plaintiff (attached as PDF)',
        factCategory: 'evidence',
        importance: 'critical',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Written warning document dated 2024-02-01',
        factCategory: 'evidence',
        importance: 'critical',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'TechCorp Inc. office, 123 Tech Street, San Francisco, CA',
        factCategory: 'location',
        importance: 'low',
      });

      caseFactsRepo.create({
        caseId: 1,
        factContent: 'Phone call with HR on 2024-01-20, documented in call log',
        factCategory: 'communication',
        importance: 'medium',
      });

      // Verify all facts are created and encrypted
      const userFacts = userFactsRepo.findByCaseId(1);
      const caseFacts = caseFactsRepo.findByCaseId(1);

      expect(userFacts).toHaveLength(6);
      expect(caseFacts).toHaveLength(9);

      // Verify categorization
      const personalFacts = userFactsRepo.findByType(1, 'personal');
      const contactFacts = userFactsRepo.findByType(1, 'contact');
      const timelineFacts = caseFactsRepo.findByCategory(1, 'timeline');
      const witnessFacts = caseFactsRepo.findByCategory(1, 'witness');
      const criticalFacts = caseFactsRepo.findByImportance(1, 'critical');

      expect(personalFacts).toHaveLength(2);
      expect(contactFacts).toHaveLength(2);
      expect(timelineFacts).toHaveLength(3);
      expect(witnessFacts).toHaveLength(2);
      expect(criticalFacts).toHaveLength(4);

      // Verify encryption on random samples
      const randomUserFact = userFacts[0];
      const randomCaseFact = caseFacts[0];

      const storedUserFact = db.prepare('SELECT fact_content FROM user_facts WHERE id = ?').get(randomUserFact.id) as { fact_content: string };
      const storedCaseFact = db.prepare('SELECT fact_content FROM case_facts WHERE id = ?').get(randomCaseFact.id) as { fact_content: string };

      expect(JSON.parse(storedUserFact.fact_content).algorithm).toBe('aes-256-gcm');
      expect(JSON.parse(storedCaseFact.fact_content).algorithm).toBe('aes-256-gcm');

      // Verify audit trail exists for all operations
      const allAudits = db.prepare('SELECT * FROM audit_logs WHERE resource_type IN (?, ?)').all('user_fact', 'case_fact');
      expect(allAudits.length).toBeGreaterThan(15); // At least create + content_access events
    });
  });

  describe('Error handling', () => {
    it('should handle invalid case IDs gracefully', () => {
      expect(() => {
        userFactsRepo.create({
          caseId: 999, // Non-existent case
          factContent: 'Test fact',
          factType: 'personal',
        });
      }).toThrow(); // Should throw foreign key constraint error
    });

    it('should handle invalid fact types', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO user_facts (case_id, fact_content, fact_type)
          VALUES (1, 'Test', 'invalid_type')
        `).run();
      }).toThrow(); // Should throw CHECK constraint error
    });

    it('should handle invalid fact categories', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO case_facts (case_id, fact_content, fact_category, importance)
          VALUES (1, 'Test', 'invalid_category', 'medium')
        `).run();
      }).toThrow(); // Should throw CHECK constraint error
    });

    it('should handle invalid importance levels', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO case_facts (case_id, fact_content, fact_category, importance)
          VALUES (1, 'Test', 'timeline', 'invalid_importance')
        `).run();
      }).toThrow(); // Should throw CHECK constraint error
    });
  });
});
