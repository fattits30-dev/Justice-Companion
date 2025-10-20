/**
 * GDPR Article 17 - Right to Erasure Implementation
 *
 * This class handles complete deletion of all user data with:
 * - Transactional safety (all-or-nothing)
 * - Foreign key constraint respect
 * - Audit log and consent preservation (legal requirement)
 */

import type Database from 'better-sqlite3';
import type { GdprDeleteOptions, GdprDeleteResult } from '../../models/Gdpr.ts';

export class DataDeleter {
  // Explicit property declaration (TSX strip-only mode compatibility)
  private db: Database.Database;

  constructor(db: Database.Database) {
    // Explicit property assignment (TSX strip-only mode compatibility)
    this.db = db;
  }

  /**
   * Delete ALL user data across 15 tables (preserves audit logs + consents)
   *
   * CRITICAL: This is irreversible. Requires explicit confirmation.
   *
   * Deletion order respects foreign key constraints:
   * 1. event_evidence (FK → timeline_events)
   * 2. case_facts (FK → cases)
   * 3. legal_issues (FK → cases)
   * 4. actions (FK → cases)
   * 5. notes (FK → cases)
   * 6. evidence (FK → cases)
   * 7. timeline_events (FK → cases)
   * 8. chat_messages (FK → chat_conversations)
   * 9. chat_conversations (FK → users)
   * 10. cases (FK → users)
   * 11. user_facts (FK → users)
   * 12. sessions (FK → users)
   * 13. users (root table)
   *
   * PRESERVED (legal requirement):
   * - audit_logs: Immutable compliance trail
   * - consent_records: GDPR proof of user consent history
   */
  deleteAllUserData(
    userId: number,
    options: GdprDeleteOptions
  ): GdprDeleteResult {
    // Safety check: Explicit confirmation required
    if (!options.confirmed) {
      throw new Error(
        'GDPR deletion requires explicit confirmation. Set options.confirmed = true.'
      );
    }

    const deletionDate = new Date().toISOString();
    const deletedCounts: Record<string, number> = {};

    // Use transaction for atomicity - all deletions succeed or all fail
    const deleteTransaction = this.db.transaction(() => {
      // Step 1: Get counts BEFORE deletion (for reporting)
      const casesStmt = this.db.prepare('SELECT id FROM cases WHERE userId = ?');
      const caseIds = (casesStmt.all(userId) as any[]).map((c) => c.id);

      const conversationsStmt = this.db.prepare(
        'SELECT id FROM chat_conversations WHERE userId = ?'
      );
      const conversationIds = (conversationsStmt.all(userId) as any[]).map(
        (c) => c.id
      );

      // Step 2: Delete in bottom-up order (children before parents)

      // 2.1: event_evidence (child of timeline_events)
      if (caseIds.length > 0) {
        const eventIdsStmt = this.db.prepare(
          `SELECT id FROM timeline_events WHERE caseId IN (${caseIds.map(() => '?').join(',')})`
        );
        const eventIds = (eventIdsStmt.all(...caseIds) as any[]).map((e) => e.id);

        if (eventIds.length > 0) {
          const deleteEventEvidence = this.db.prepare(
            `DELETE FROM event_evidence WHERE eventId IN (${eventIds.map(() => '?').join(',')})`
          );
          const result = deleteEventEvidence.run(...eventIds);
          deletedCounts.event_evidence = result.changes;
        } else {
          deletedCounts.event_evidence = 0;
        }
      } else {
        deletedCounts.event_evidence = 0;
      }

      // 2.2: case_facts
      deletedCounts.case_facts = this.deleteByCase(caseIds, 'case_facts');

      // 2.3: legal_issues
      deletedCounts.legal_issues = this.deleteByCase(caseIds, 'legal_issues');

      // 2.4: actions
      deletedCounts.actions = this.deleteByCase(caseIds, 'actions');

      // 2.5: notes
      deletedCounts.notes = this.deleteByCase(caseIds, 'notes');

      // 2.6: evidence
      deletedCounts.evidence = this.deleteByCase(caseIds, 'evidence');

      // 2.7: timeline_events
      deletedCounts.timeline_events = this.deleteByCase(
        caseIds,
        'timeline_events'
      );

      // 2.8: chat_messages (child of chat_conversations)
      if (conversationIds.length > 0) {
        const deleteChatMessages = this.db.prepare(
          `DELETE FROM chat_messages WHERE conversationId IN (${conversationIds.map(() => '?').join(',')})`
        );
        const result = deleteChatMessages.run(...conversationIds);
        deletedCounts.chat_messages = result.changes;
      } else {
        deletedCounts.chat_messages = 0;
      }

      // 2.9: chat_conversations
      const deleteConversations = this.db.prepare(
        'DELETE FROM chat_conversations WHERE userId = ?'
      );
      deletedCounts.chat_conversations = deleteConversations.run(userId).changes;

      // 2.10: cases
      if (caseIds.length > 0) {
        const deleteCases = this.db.prepare(
          `DELETE FROM cases WHERE id IN (${caseIds.map(() => '?').join(',')})`
        );
        deletedCounts.cases = deleteCases.run(...caseIds).changes;
      } else {
        deletedCounts.cases = 0;
      }

      // 2.11: user_facts
      const deleteUserFacts = this.db.prepare(
        'DELETE FROM user_facts WHERE userId = ?'
      );
      deletedCounts.user_facts = deleteUserFacts.run(userId).changes;

      // 2.12: sessions
      const deleteSessions = this.db.prepare(
        'DELETE FROM sessions WHERE userId = ?'
      );
      deletedCounts.sessions = deleteSessions.run(userId).changes;

      // 2.13: users (root table)
      const deleteUser = this.db.prepare('DELETE FROM users WHERE id = ?');
      deletedCounts.users = deleteUser.run(userId).changes;
    });

    // Execute transaction
    deleteTransaction();

    // Step 3: Count preserved records AFTER transaction (legal requirement)
    const auditLogsStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?'
    );
    const preservedAuditLogs = (auditLogsStmt.get(userId.toString()) as any).count;

    const consentsStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM consent_records WHERE userId = ?'
    );
    const preservedConsents = (consentsStmt.get(userId) as any).count;

    return {
      success: true,
      deletedCounts,
      preservedAuditLogs,
      preservedConsents,
      deletionDate,
    };
  }

  /**
   * Helper: Delete records from a table by case IDs
   */
  private deleteByCase(caseIds: number[], tableName: string): number {
    if (caseIds.length === 0) return 0;

    const placeholders = caseIds.map(() => '?').join(',');
    const deleteStmt = this.db.prepare(
      `DELETE FROM ${tableName} WHERE caseId IN (${placeholders})`
    );
    const result = deleteStmt.run(...caseIds);
    return result.changes;
  }
}
