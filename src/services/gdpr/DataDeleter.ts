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
      const caseIds = casesStmt.all(userId).map((c: { id: number }) => c.id);

      const conversationsStmt = this.db.prepare(
        'SELECT id FROM chat_conversations WHERE userId = ?'
      );
      const conversationIds = conversationsStmt.all(userId).map((c: { id: number }) => c.id);

      // Step 2: Delete in bottom-up order (child tables first)
      // event_evidence (FK → timeline_events)
      const deleteEventEvidence = this.db.prepare(
        'DELETE FROM event_evidence WHERE eventId IN (SELECT id FROM timeline_events WHERE caseId IN (?))'
      );
      deleteEventEvidence.run(caseIds);
      
      // timeline_events (FK → cases)
      const deleteTimelineEvents = this.db.prepare(
        'DELETE FROM timeline_events WHERE caseId IN (?)'
      );
      deleteTimelineEvents.run(caseIds);
      
      // case_facts (FK → cases)
      const deleteCaseFacts = this.db.prepare(
        'DELETE FROM case_facts WHERE caseId IN (?)'
      );
      deleteCaseFacts.run(caseIds);
      
      // legal_issues (FK → cases)
      const deleteLegalIssues = this.db.prepare(
        'DELETE FROM legal_issues WHERE caseId IN (?)'
      );
      deleteLegalIssues.run(caseIds);
      
      // actions (FK → cases)
      const deleteActions = this.db.prepare(
        'DELETE FROM actions WHERE caseId IN (?)'
      );
      deleteActions.run(caseIds);
      
      // notes (FK → cases)
      const deleteNotes = this.db.prepare(
        'DELETE FROM notes WHERE caseId IN (?)'
      );
      deleteNotes.run(caseIds);
      
      // evidence (FK → cases)
      const deleteEvidence = this.db.prepare(
        'DELETE FROM evidence WHERE caseId IN (?)'
      );
      deleteEvidence.run(caseIds);
      
      // chat_messages (FK → chat_conversations)
      const deleteChatMessages = this.db.prepare(
        'DELETE FROM chat_messages WHERE conversationId IN (?)'
      );
      deleteChatMessages.run(conversationIds);
      
      // chat_conversations (FK → users)
      const deleteChatConversations = this.db.prepare(
        'DELETE FROM chat_conversations WHERE userId = ?'
      );
      deleteChatConversations.run(userId);
      
      // cases (FK → users)
      const deleteCases = this.db.prepare(
        'DELETE FROM cases WHERE userId = ?'
      );
      deleteCases.run(userId);
      
      // user_facts (FK → users)
      const deleteUserFacts = this.db.prepare(
        'DELETE FROM user_facts WHERE userId = ?'
      );
      deleteUserFacts.run(userId);
      
      // sessions (FK → users)
      const deleteSessions = this.db.prepare(
        'DELETE FROM sessions WHERE userId = ?'
      );
      deleteSessions.run(userId);
      
      // users (root table)
      const deleteUser = this.db.prepare(
        'DELETE FROM users WHERE id = ?'
      );
      deleteUser.run(userId);
      
      // Step 3: Update counts for reporting
      deletedCounts['event_evidence'] = deleteEventEvidence.changes;
      deletedCounts['timeline_events'] = deleteTimelineEvents.changes;
      deletedCounts['case_facts'] = deleteCaseFacts.changes;
      deletedCounts['legal_issues'] = deleteLegalIssues.changes;
      deletedCounts['actions'] = deleteActions.changes;
      deletedCounts['notes'] = deleteNotes.changes;
      deletedCounts['evidence'] = deleteEvidence.changes;
      deletedCounts['chat_messages'] = deleteChatMessages.changes;
      deletedCounts['chat_conversations'] = deleteChatConversations.changes;
      deletedCounts['cases'] = deleteCases.changes;
      deletedCounts['user_facts'] = deleteUserFacts.changes;
      deletedCounts['sessions'] = deleteSessions.changes;
      deletedCounts['users'] = deleteUser.changes;
    });

    // Execute the transaction
    deleteTransaction();

    return {
      success: true,
      deletedAt: deletionDate,
      counts: deletedCounts
    };
  }
}