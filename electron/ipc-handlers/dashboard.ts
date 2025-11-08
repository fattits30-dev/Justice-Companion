import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { successResponse, type IPCResponse } from "../utils/ipc-response";
import { withAuthorization } from "../utils/authorization-wrapper";
import { databaseManager } from "../../src/db/database";
import { DatabaseError } from "../../src/errors/DomainErrors";

/**
 * ===== DASHBOARD HANDLERS =====
 * 1 channel: dashboard:get-stats
 *
 * SECURITY: All queries filtered by userId to prevent horizontal privilege escalation
 */
export function setupDashboardHandlers(): void {
  // Register handler for dashboard:get-stats
  ipcMain.handle(
    "dashboard:get-stats",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] dashboard:get-stats called by user:", userId);
          const db = databaseManager.getDatabase();

          // SECURITY: Filter all queries by user_id to prevent data leakage
          // Get counts from various tables (user-specific)
          const casesStmt = db.prepare(
            "SELECT COUNT(*) as count FROM cases WHERE user_id = ?"
          );
          const casesResult = casesStmt.get(userId) as { count: number };

          const activeCasesStmt = db.prepare(
            "SELECT COUNT(*) as count FROM cases WHERE user_id = ? AND status = 'active'"
          );
          const activeCasesResult = activeCasesStmt.get(userId) as {
            count: number;
          };

          // Evidence count (filtered by cases owned by user)
          const evidenceStmt = db.prepare(`
            SELECT COUNT(*) as count FROM evidence
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = ?)
          `);
          const evidenceResult = evidenceStmt.get(userId) as { count: number };

          // Count recent activity (user's cases updated in last 7 days)
          const recentActivityStmt = db.prepare(
            "SELECT COUNT(*) as count FROM cases WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')"
          );
          const recentActivityResult = recentActivityStmt.get(userId) as {
            count: number;
          };

          // Get recent cases (user's last 5 updated cases)
          const recentCasesStmt = db.prepare(`
            SELECT id, title, status, updated_at as lastUpdated
            FROM cases
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 5
          `);
          const recentCases = recentCasesStmt.all(userId) as Array<{
            id: number;
            title: string;
            status: string;
            lastUpdated: string;
          }>;

          // Return dashboard statistics (user-specific only)
          return successResponse({
            totalCases: casesResult.count,
            activeCases: activeCasesResult.count,
            totalEvidence: evidenceResult.count,
            recentActivity: recentActivityResult.count,
            recentCases,
          });
        } catch (error) {
          console.error("[IPC] Dashboard stats error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            throw new DatabaseError("load dashboard stats", error.message);
          }

          throw error;
        }
      });
    }
  );
}
