/**
 * Comprehensive tests for Phase 3 repositories with encryption
 * Tests: UserProfileRepository, LegalIssuesRepository, TimelineRepository
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3-multiple-ciphers";
import { UserProfileRepository } from "./UserProfileRepository.ts";
import { LegalIssuesRepository } from "./LegalIssuesRepository.ts";
import { TimelineRepository } from "./TimelineRepository.ts";
import { EncryptionService } from "../services/EncryptionService.ts";
import { AuditLogger } from "../services/AuditLogger.ts";
import * as databaseModule from "../db/database.ts";

let db: Database.Database;
let encryptionService: EncryptionService;
let auditLogger: AuditLogger;

function setupDatabase(): void {
  db = new Database(":memory:");

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

    CREATE TABLE user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE legal_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      relevant_law TEXT,
      guidance TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      event_date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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

    -- Insert default user profile
    INSERT INTO user_profile (id, name, email) VALUES (1, 'Test User', 'test@example.com');

    -- Insert test case
    INSERT INTO cases (title, case_type) VALUES ('Test Case', 'employment');
  `);

  const encryptionKey = EncryptionService.generateKey();
  encryptionService = new EncryptionService(encryptionKey);
  auditLogger = new AuditLogger(db);

  // Override getDb
  vi.spyOn(databaseModule, "getDb").mockReturnValue(db);
}

describe("UserProfileRepository", () => {
  let repository: UserProfileRepository;

  beforeEach(() => {
    setupDatabase();
    repository = new UserProfileRepository(encryptionService, auditLogger);
  });

  afterEach(() => {
    db.close();
  });

  it("should encrypt name and email when updating profile", () => {
    repository.update({
      name: "John Doe",
      email: "john.doe@example.com",
    });

    const storedProfile = db
      .prepare("SELECT name, email FROM user_profile WHERE id = 1")
      .get() as any;

    // Verify encrypted format
    const parsedName = JSON.parse(storedProfile.name);
    const parsedEmail = JSON.parse(storedProfile.email);

    expect(parsedName.algorithm).toBe("aes-256-gcm");
    expect(parsedEmail.algorithm).toBe("aes-256-gcm");
  });

  it("should decrypt name and email when retrieving profile", () => {
    repository.update({
      name: "Jane Smith",
      email: "jane.smith@example.com",
    });

    const profile = repository.get();

    expect(profile.name).toBe("Jane Smith");
    expect(profile.email).toBe("jane.smith@example.com");
  });

  it("should audit PII access", () => {
    repository.update({ name: "Test", email: "test@test.com" });
    repository.get();

    const piiLog = db
      .prepare(
        `
      SELECT * FROM audit_logs WHERE event_type = 'profile.pii_access'
    `,
      )
      .get() as any;

    expect(piiLog).toBeDefined();
    expect(piiLog.action).toBe("read");
  });

  it("should not log PII in audit details", () => {
    repository.update({
      name: "SENSITIVE_NAME",
      email: "SENSITIVE_EMAIL@example.com",
    });

    const auditLogs = db
      .prepare("SELECT details FROM audit_logs")
      .all() as any[];

    auditLogs.forEach((log) => {
      if (log.details) {
        expect(log.details).not.toContain("SENSITIVE_NAME");
        expect(log.details).not.toContain("SENSITIVE_EMAIL");
      }
    });
  });
});

describe("LegalIssuesRepository", () => {
  let repository: LegalIssuesRepository;

  beforeEach(() => {
    setupDatabase();
    repository = new LegalIssuesRepository(encryptionService, auditLogger);
  });

  afterEach(() => {
    db.close();
  });

  it("should encrypt description field", () => {
    const issue = repository.create({
      caseId: 1,
      title: "Wrongful Termination",
      description: "Fired after reporting safety violations",
      relevantLaw: "California Labor Code 1102.5",
    });

    const storedIssue = db
      .prepare("SELECT description FROM legal_issues WHERE id = ?")
      .get(issue.id) as any;
    const parsedDesc = JSON.parse(storedIssue.description);

    expect(parsedDesc.algorithm).toBe("aes-256-gcm");
  });

  it("should decrypt description when retrieving", () => {
    const created = repository.create({
      caseId: 1,
      title: "Test Issue",
      description: "Sensitive legal details",
    });

    const retrieved = repository.findById(created.id);

    expect(retrieved!.description).toBe("Sensitive legal details");
  });

  it("should find all issues for a case with decryption", () => {
    repository.create({
      caseId: 1,
      title: "Issue 1",
      description: "Description 1",
    });
    repository.create({
      caseId: 1,
      title: "Issue 2",
      description: "Description 2",
    });

    const issues = repository.findByCaseId(1);

    expect(issues).toHaveLength(2);
    expect(issues[0].description).toBe("Description 2"); // DESC order
    expect(issues[1].description).toBe("Description 1");
  });

  it("should update encrypted description", () => {
    const created = repository.create({
      caseId: 1,
      title: "Test",
      description: "Original",
    });

    const updated = repository.update(created.id, {
      description: "Updated description",
    });

    expect(updated!.description).toBe("Updated description");
  });

  it("should audit legal issue operations", () => {
    const created = repository.create({
      caseId: 1,
      title: "Test",
      description: "Test desc",
    });

    repository.update(created.id, { title: "Updated" });
    repository.delete(created.id);

    const auditLogs = db
      .prepare(
        `
      SELECT event_type FROM audit_logs WHERE resource_type = 'legal_issue'
    `,
      )
      .all() as any[];

    const eventTypes = auditLogs.map((log) => log.event_type);
    expect(eventTypes).toContain("legal_issue.create");
    expect(eventTypes).toContain("legal_issue.update");
    expect(eventTypes).toContain("legal_issue.delete");
  });
});

describe("TimelineRepository", () => {
  let repository: TimelineRepository;

  beforeEach(() => {
    setupDatabase();
    repository = new TimelineRepository(encryptionService, auditLogger);
  });

  afterEach(() => {
    db.close();
  });

  it("should encrypt description field", () => {
    const event = repository.create({
      caseId: 1,
      eventDate: "2024-01-15",
      title: "Warning Received",
      description: "Boss threatened termination for whistleblowing",
    });

    const storedEvent = db
      .prepare("SELECT description FROM timeline_events WHERE id = ?")
      .get(event.id) as any;
    const parsedDesc = JSON.parse(storedEvent.description);

    expect(parsedDesc.algorithm).toBe("aes-256-gcm");
  });

  it("should decrypt description when retrieving", () => {
    const created = repository.create({
      caseId: 1,
      eventDate: "2024-01-15",
      title: "Event",
      description: "Sensitive event details",
    });

    const retrieved = repository.findById(created.id);

    expect(retrieved!.description).toBe("Sensitive event details");
  });

  it("should find all events for a case sorted by date", () => {
    repository.create({
      caseId: 1,
      eventDate: "2024-01-10",
      title: "Earlier Event",
      description: "Earlier",
    });
    repository.create({
      caseId: 1,
      eventDate: "2024-01-20",
      title: "Later Event",
      description: "Later",
    });

    const events = repository.findByCaseId(1);

    expect(events).toHaveLength(2);
    expect(events[0].description).toBe("Later"); // DESC order
    expect(events[1].description).toBe("Earlier");
  });

  it("should update encrypted description", () => {
    const created = repository.create({
      caseId: 1,
      eventDate: "2024-01-15",
      title: "Event",
      description: "Original description",
    });

    const updated = repository.update(created.id, {
      description: "Updated event description",
    });

    expect(updated!.description).toBe("Updated event description");
  });

  it("should audit timeline event operations", () => {
    const created = repository.create({
      caseId: 1,
      eventDate: "2024-01-15",
      title: "Event",
      description: "Test",
    });

    repository.update(created.id, { title: "Updated Event" });
    repository.delete(created.id);

    const auditLogs = db
      .prepare(
        `
      SELECT event_type FROM audit_logs WHERE resource_type = 'timeline_event'
    `,
      )
      .all() as any[];

    const eventTypes = auditLogs.map((log) => log.event_type);
    expect(eventTypes).toContain("timeline_event.create");
    expect(eventTypes).toContain("timeline_event.update");
    expect(eventTypes).toContain("timeline_event.delete");
  });
});

describe("Phase 3 GDPR Compliance", () => {
  it("should never log plaintext PII across all repositories", () => {
    setupDatabase();

    const profileRepo = new UserProfileRepository(
      encryptionService,
      auditLogger,
    );
    const legalRepo = new LegalIssuesRepository(encryptionService, auditLogger);
    const timelineRepo = new TimelineRepository(encryptionService, auditLogger);

    // Perform operations with sensitive data
    profileRepo.update({
      name: "SENSITIVE_PERSON_NAME",
      email: "SENSITIVE_EMAIL@example.com",
    });

    legalRepo.create({
      caseId: 1,
      title: "Issue",
      description: "SENSITIVE_LEGAL_DETAILS",
    });

    timelineRepo.create({
      caseId: 1,
      eventDate: "2024-01-01",
      title: "Event",
      description: "SENSITIVE_EVENT_DETAILS",
    });

    // Check all audit logs
    const allAuditLogs = db
      .prepare(
        `
      SELECT details, error_message FROM audit_logs
    `,
      )
      .all() as any[];

    const sensitiveStrings = [
      "SENSITIVE_PERSON_NAME",
      "SENSITIVE_EMAIL",
      "SENSITIVE_LEGAL_DETAILS",
      "SENSITIVE_EVENT_DETAILS",
    ];

    allAuditLogs.forEach((log) => {
      sensitiveStrings.forEach((sensitiveStr) => {
        if (log.details) {
          expect(log.details).not.toContain(sensitiveStr);
        }
        if (log.error_message) {
          expect(log.error_message).not.toContain(sensitiveStr);
        }
      });
    });

    db.close();
  });
});
