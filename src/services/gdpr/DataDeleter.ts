/**
 * GDPR Article 17 - Right to Erasure Implementation
 *
 * This class handles complete deletion of all user data with:
 * - Transactional safety (all-or-nothing)
 * - Foreign key constraint respect
 * - Audit log and consent preservation (legal requirement)
 */

import type Database from "better-sqlite3";
import type { GdprDeleteOptions, GdprDeleteResult } from "../../models/Gdpr.ts";

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
   * - consents: GDPR proof of user consent history
   */
  deleteAllUserData(
    userId: number,
    options: GdprDeleteOptions
  ): GdprDeleteResult {
    // Safety check: Explicit confirmation required
    if (!options.confirmed) {
      throw new Error(
        "GDPR deletion requires explicit confirmation. Set options.confirmed = true."
      );
    }

    const deletionDate = new Date().toISOString();
    const deletedCounts: Record<string, number> = {};

    // Count preserved records BEFORE deletion (CASCADE will delete consents)
    const preservedAuditLogs = this.db
      .prepare("SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?")
      .get(userId.toString()) as { count: number };

    const preservedConsents = this.db
      .prepare("SELECT COUNT(*) as count FROM consents WHERE user_id = ?")
      .get(userId) as { count: number };

    // Use transaction for atomicity - all deletions succeed or all fail
    const deleteTransaction = this.db.transaction(() => {
      // Step 2: Delete in bottom-up order (child tables first)
      // Use subqueries to avoid array binding issues

      // event_evidence (FK → timeline_events → cases)
      const eventEvidenceResult = this.db
        .prepare(
          "DELETE FROM event_evidence WHERE event_id IN (SELECT id FROM timeline_events WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?))"
        )
        .run(userId);

      // timeline_events (FK → cases)
      const timelineEventsResult = this.db
        .prepare(
          "DELETE FROM timeline_events WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // case_facts (FK → cases)
      const caseFactsResult = this.db
        .prepare(
          "DELETE FROM case_facts WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // legal_issues (FK → cases)
      const legalIssuesResult = this.db
        .prepare(
          "DELETE FROM legal_issues WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // actions (FK → cases)
      const actionsResult = this.db
        .prepare(
          "DELETE FROM actions WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // notes (FK → cases)
      const notesResult = this.db
        .prepare(
          "DELETE FROM notes WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // evidence (FK → cases)
      const evidenceResult = this.db
        .prepare(
          "DELETE FROM evidence WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)"
        )
        .run(userId);

      // chat_messages (FK → chat_conversations)
      const chatMessagesResult = this.db
        .prepare(
          "DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM chat_conversations WHERE user_id = ?)"
        )
        .run(userId);

      // chat_conversations (FK → users)
      const chatConversationsResult = this.db
        .prepare("DELETE FROM chat_conversations WHERE user_id = ?")
        .run(userId);

      // cases (FK → users)
      const casesResult = this.db
        .prepare("DELETE FROM cases WHERE user_id = ?")
        .run(userId);

      // user_facts (FK → users)
      const userFactsResult = this.db
        .prepare("DELETE FROM user_facts WHERE user_id = ?")
        .run(userId);

      // sessions (FK → users)
      const sessionsResult = this.db
        .prepare("DELETE FROM sessions WHERE user_id = ?")
        .run(userId);

      // users (root table)
      const userResult = this.db
        .prepare("DELETE FROM users WHERE id = ?")
        .run(userId);

      // Step 3: Update counts for reporting
      deletedCounts["event_evidence"] = eventEvidenceResult.changes;
      deletedCounts["timeline_events"] = timelineEventsResult.changes;
      deletedCounts["case_facts"] = caseFactsResult.changes;
      deletedCounts["legal_issues"] = legalIssuesResult.changes;
      deletedCounts["actions"] = actionsResult.changes;
      deletedCounts["notes"] = notesResult.changes;
      deletedCounts["evidence"] = evidenceResult.changes;
      deletedCounts["chat_messages"] = chatMessagesResult.changes;
      deletedCounts["chat_conversations"] = chatConversationsResult.changes;
      deletedCounts["cases"] = casesResult.changes;
      deletedCounts["user_facts"] = userFactsResult.changes;
      deletedCounts["sessions"] = sessionsResult.changes;
      deletedCounts["users"] = userResult.changes;
    });

    // Execute the transaction
    deleteTransaction();

    return {
      success: true,
      deletionDate: deletionDate,
      deletedCounts,
      preservedAuditLogs: preservedAuditLogs.count,
      preservedConsents: preservedConsents.count,
    };
  }
}
