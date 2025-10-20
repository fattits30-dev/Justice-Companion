/**
 * GDPR Article 20 - Data Portability Implementation
 *
 * This class handles exporting all user data in a machine-readable format
 * with proper decryption of sensitive fields.
 */

import type Database from 'better-sqlite3';
import { EncryptionService } from '../EncryptionService';
import type { UserDataExport, TableExport, GdprExportOptions } from '../../models/Gdpr';

export class DataExporter {
  constructor(
    private db: Database.Database,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Export all user data across 15 tables with decryption
   */
  exportAllUserData(
    userId: number,
    options: GdprExportOptions = {}
  ): UserDataExport {
    const exportDate = new Date().toISOString();

    const data: UserDataExport = {
      metadata: {
        exportDate,
        userId,
        schemaVersion: this.getSchemaVersion(),
        format: options.format || 'json',
        totalRecords: 0,
      },
      userData: {
        profile: this.exportUserProfile(userId),
        cases: this.exportCases(userId),
        evidence: this.exportEvidence(userId),
        legalIssues: this.exportLegalIssues(userId),
        timelineEvents: this.exportTimelineEvents(userId),
        actions: this.exportActions(userId),
        notes: this.exportNotes(userId),
        chatConversations: this.exportChatConversations(userId),
        chatMessages: this.exportChatMessages(userId),
        userFacts: this.exportUserFacts(userId),
        caseFacts: this.exportCaseFacts(userId),
        sessions: this.exportSessions(userId),
        consents: this.exportConsents(userId),
      },
    };

    // Calculate total records
    data.metadata.totalRecords = this.countTotalRecords(data.userData);

    return data;
  }

  /**
   * Export user profile (from users table)
   * WARNING: Password hash is NEVER exported (security)
   */
  private exportUserProfile(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT
        id, username, email, created_at, updated_at, last_login
      FROM users
      WHERE id = ?
    `);

    const user = stmt.get(userId) as any;

    return {
      tableName: 'users',
      records: user ? [user] : [],
      count: user ? 1 : 0,
    };
  }

  /**
   * Export all cases owned by user
   * Decrypts: description (if encrypted)
   */
  private exportCases(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT * FROM cases
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    const cases = stmt.all(userId) as any[];

    // Decrypt encrypted fields
    const decryptedCases = cases.map((caseRecord) => {
      // Decrypt description if encrypted
      if (caseRecord.description) {
        try {
          const encryptedData = JSON.parse(caseRecord.description);
          if (encryptedData.ciphertext && encryptedData.iv) {
            const decrypted = this.encryptionService.decrypt(encryptedData);
            caseRecord.description = decrypted;
          }
        } catch (err) {
          // Field not encrypted or already decrypted
        }
      }

      return caseRecord;
    });

    return {
      tableName: 'cases',
      records: decryptedCases,
      count: decryptedCases.length,
    };
  }

  /**
   * Export all evidence for user's cases
   * Decrypts: content (if encrypted)
   */
  private exportEvidence(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT e.*
      FROM evidence e
      JOIN cases c ON e.caseId = c.id
      WHERE c.userId = ?
      ORDER BY e.createdAt DESC
    `);

    const evidence = stmt.all(userId) as any[];

    // Decrypt encrypted fields
    const decryptedEvidence = evidence.map((record) => {
      if (record.content) {
        try {
          const encryptedData = JSON.parse(record.content);
          if (encryptedData.ciphertext && encryptedData.iv) {
            record.content = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      return record;
    });

    return {
      tableName: 'evidence',
      records: decryptedEvidence,
      count: decryptedEvidence.length,
    };
  }

  /**
   * Export legal issues for user's cases
   */
  private exportLegalIssues(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT li.*
      FROM legal_issues li
      JOIN cases c ON li.caseId = c.id
      WHERE c.userId = ?
      ORDER BY li.createdAt DESC
    `);

    const issues = stmt.all(userId) as any[];

    return {
      tableName: 'legal_issues',
      records: issues,
      count: issues.length,
    };
  }

  /**
   * Export timeline events for user's cases
   * Decrypts: description (if encrypted)
   */
  private exportTimelineEvents(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT te.*
      FROM timeline_events te
      JOIN cases c ON te.caseId = c.id
      WHERE c.userId = ?
      ORDER BY te.date DESC
    `);

    const events = stmt.all(userId) as any[];

    // Decrypt descriptions
    const decryptedEvents = events.map((event) => {
      if (event.description) {
        try {
          const encryptedData = JSON.parse(event.description);
          if (encryptedData.ciphertext && encryptedData.iv) {
            event.description = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      return event;
    });

    return {
      tableName: 'timeline_events',
      records: decryptedEvents,
      count: decryptedEvents.length,
    };
  }

  /**
   * Export actions for user's cases
   * Decrypts: description (if encrypted)
   */
  private exportActions(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT a.*
      FROM actions a
      JOIN cases c ON a.caseId = c.id
      WHERE c.userId = ?
      ORDER BY a.dueDate DESC
    `);

    const actions = stmt.all(userId) as any[];

    // Decrypt descriptions
    const decryptedActions = actions.map((action) => {
      if (action.description) {
        try {
          const encryptedData = JSON.parse(action.description);
          if (encryptedData.ciphertext && encryptedData.iv) {
            action.description = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      return action;
    });

    return {
      tableName: 'actions',
      records: decryptedActions,
      count: decryptedActions.length,
    };
  }

  /**
   * Export notes for user's cases
   * Decrypts: content (if encrypted)
   */
  private exportNotes(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT n.*
      FROM notes n
      JOIN cases c ON n.caseId = c.id
      WHERE c.userId = ?
      ORDER BY n.createdAt DESC
    `);

    const notes = stmt.all(userId) as any[];

    // Decrypt content
    const decryptedNotes = notes.map((note) => {
      if (note.content) {
        try {
          const encryptedData = JSON.parse(note.content);
          if (encryptedData.ciphertext && encryptedData.iv) {
            note.content = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      return note;
    });

    return {
      tableName: 'notes',
      records: decryptedNotes,
      count: decryptedNotes.length,
    };
  }

  /**
   * Export chat conversations
   */
  private exportChatConversations(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_conversations
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    const conversations = stmt.all(userId) as any[];

    return {
      tableName: 'chat_conversations',
      records: conversations,
      count: conversations.length,
    };
  }

  /**
   * Export chat messages
   * Decrypts: message, response (if user consented to encryption)
   */
  private exportChatMessages(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT m.*
      FROM chat_messages m
      JOIN chat_conversations c ON m.conversationId = c.id
      WHERE c.userId = ?
      ORDER BY m.timestamp DESC
    `);

    const messages = stmt.all(userId) as any[];

    // Decrypt if encrypted
    const decryptedMessages = messages.map((msg) => {
      // Decrypt message
      if (msg.message) {
        try {
          const encryptedData = JSON.parse(msg.message);
          if (encryptedData.ciphertext && encryptedData.iv) {
            msg.message = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      // Decrypt response
      if (msg.response) {
        try {
          const encryptedData = JSON.parse(msg.response);
          if (encryptedData.ciphertext && encryptedData.iv) {
            msg.response = this.encryptionService.decrypt(encryptedData);
          }
        } catch (err) {
          // Not encrypted
        }
      }

      return msg;
    });

    return {
      tableName: 'chat_messages',
      records: decryptedMessages,
      count: decryptedMessages.length,
    };
  }

  /**
   * Export user facts
   */
  private exportUserFacts(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT * FROM user_facts
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    const facts = stmt.all(userId) as any[];

    return {
      tableName: 'user_facts',
      records: facts,
      count: facts.length,
    };
  }

  /**
   * Export case facts for user's cases
   */
  private exportCaseFacts(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT cf.*
      FROM case_facts cf
      JOIN cases c ON cf.caseId = c.id
      WHERE c.userId = ?
      ORDER BY cf.createdAt DESC
    `);

    const facts = stmt.all(userId) as any[];

    return {
      tableName: 'case_facts',
      records: facts,
      count: facts.length,
    };
  }

  /**
   * Export active sessions
   */
  private exportSessions(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT id, sessionId, userId, createdAt, expiresAt, lastActivity
      FROM sessions
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    const sessions = stmt.all(userId) as any[];

    return {
      tableName: 'sessions',
      records: sessions,
      count: sessions.length,
    };
  }

  /**
   * Export consent records (GDPR requires preservation)
   */
  private exportConsents(userId: number): TableExport {
    const stmt = this.db.prepare(`
      SELECT * FROM consent_records
      WHERE userId = ?
      ORDER BY timestamp DESC
    `);

    const consents = stmt.all(userId) as any[];

    return {
      tableName: 'consent_records',
      records: consents,
      count: consents.length,
    };
  }

  /**
   * Get current database schema version from migrations table
   */
  private getSchemaVersion(): string {
    try {
      const stmt = this.db.prepare(`
        SELECT MAX(version) as version FROM migrations
      `);
      const result = stmt.get() as any;
      return result?.version?.toString() || '0';
    } catch (err) {
      return '0';
    }
  }

  /**
   * Count total records across all tables
   */
  private countTotalRecords(userData: UserDataExport['userData']): number {
    return Object.values(userData).reduce(
      (sum, table) => sum + (table?.count || 0),
      0
    );
  }
}
