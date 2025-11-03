import { ipcMain } from 'electron';
import {
  successResponse,
  formatError,
} from '../utils/ipc-response.ts';
import { databaseManager } from '../../src/db/database.ts';
import { DatabaseError } from '../../src/errors/DomainErrors.ts';

/**
 * ===== DASHBOARD HANDLERS =====
 * 1 channel: dashboard:get-stats
 */
export function setupDashboardHandlers(): void {
  // Register handler for dashboard:get-stats
  ipcMain.handle('dashboard:get-stats', async (_event, _sessionId) => {
    try {
      const db = databaseManager.getDatabase();

      // Get counts from various tables
      const casesStmt = db.prepare('SELECT COUNT(*) as count FROM cases');
      const casesResult = casesStmt.get() as { count: number };

      const activeCasesStmt = db.prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'active'");
      const activeCasesResult = activeCasesStmt.get() as { count: number };

      const evidenceStmt = db.prepare('SELECT COUNT(*) as count FROM evidence');
      const evidenceResult = evidenceStmt.get() as { count: number };

      // Count recent activity (cases updated in last 7 days)
      const recentActivityStmt = db.prepare(
        "SELECT COUNT(*) as count FROM cases WHERE updated_at >= datetime('now', '-7 days')"
      );
      const recentActivityResult = recentActivityStmt.get() as { count: number };

      // Get recent cases (last 5 updated)
      const recentCasesStmt = db.prepare(`
        SELECT id, title, status, updated_at as lastUpdated
        FROM cases
        ORDER BY updated_at DESC
        LIMIT 5
      `);
      const recentCases = recentCasesStmt.all() as Array<{
        id: string;
        title: string;
        status: 'active' | 'closed' | 'pending';
        lastUpdated: string;
      }>;

      // Return dashboard statistics
      return successResponse({
        totalCases: casesResult.count,
        activeCases: activeCasesResult.count,
        totalEvidence: evidenceResult.count,
        recentActivity: recentActivityResult.count,
        recentCases,
      });
    } catch (error) {
      console.error('[IPC] Dashboard stats error:', error);

      // Wrap generic errors in DomainErrors
      if (error instanceof Error) {
        throw new DatabaseError('load dashboard stats', error.message);
      }

      throw error;
    }
  });
}
