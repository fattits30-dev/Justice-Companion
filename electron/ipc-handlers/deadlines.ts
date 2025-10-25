import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { successResponse, type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization, getAuthorizationMiddleware } from '../utils/authorization-wrapper.ts';
import { getDb } from '../../src/db/database.ts';
import { DeadlineRepository } from '../../src/repositories/DeadlineRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';

/**
 * ===== DEADLINE HANDLERS =====
 * Channels: deadline:getAll, deadline:create, deadline:update, deadline:complete, deadline:delete
 * Total: 5 channels
 */
export function setupDeadlineHandlers(): void {
  // Get all deadlines for user (optionally filtered by case)
  ipcMain.handle(
    'deadline:getAll',
    async (_event: IpcMainInvokeEvent, sessionId: string, caseId?: number): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:getAll called by user:', userId, caseId ? `for case ${caseId}` : 'all cases');

          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          // If caseId provided, verify user owns the case and get deadlines for that case
          if (caseId) {
            const authMiddleware = getAuthorizationMiddleware();
            authMiddleware.verifyCaseOwnership(caseId, userId);

            const deadlines = deadlineRepo.findByCaseId(caseId, userId);
            console.warn('[IPC] Retrieved', deadlines.length, 'deadlines for case', caseId);
            return deadlines; // withAuthorization will wrap in successResponse
          }

          // Otherwise, get all deadlines for user with case info
          const deadlines = deadlineRepo.findByUserId(userId);
          console.warn('[IPC] Retrieved', deadlines.length, 'total deadlines for user', userId);
          return deadlines; // withAuthorization will wrap in successResponse
        } catch (error) {
          console.error('[IPC] deadline:getAll error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Create new deadline
  ipcMain.handle(
    'deadline:create',
    async (_event: IpcMainInvokeEvent, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:create called by user:', userId);

          // Basic validation (could add Zod schema later)
          const input = data as any;
          if (!input.caseId || !input.title || !input.deadlineDate) {
            throw new Error('Missing required fields: caseId, title, deadlineDate');
          }

          // Verify user owns the case
          const authMiddleware = getAuthorizationMiddleware();
          authMiddleware.verifyCaseOwnership(input.caseId, userId);

          // Create deadline
          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const deadline = deadlineRepo.create({
            caseId: input.caseId,
            userId,
            title: input.title,
            description: input.description,
            deadlineDate: input.deadlineDate,
            priority: input.priority || 'medium',
          });

          console.warn('[IPC] Deadline created successfully:', deadline.id);
          return successResponse(deadline);
        } catch (error) {
          console.error('[IPC] deadline:create error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Update deadline
  ipcMain.handle(
    'deadline:update',
    async (_event: IpcMainInvokeEvent, id: number, data: unknown, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:update called by user:', userId, 'for deadline:', id);

          // Verify deadline exists and user owns it
          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const existing = deadlineRepo.findById(id);
          if (!existing) {
            throw new Error(`Deadline with ID ${id} not found`);
          }

          if (existing.userId !== userId) {
            throw new Error('Unauthorized: You do not own this deadline');
          }

          // Update deadline
          const input = data as any;
          const updated = deadlineRepo.update(id, userId, {
            title: input.title,
            description: input.description,
            deadlineDate: input.deadlineDate,
            priority: input.priority,
            status: input.status,
          });

          if (!updated) {
            throw new Error(`Failed to update deadline ${id}`);
          }

          console.warn('[IPC] Deadline updated successfully:', id);
          return successResponse(updated);
        } catch (error) {
          console.error('[IPC] deadline:update error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Mark deadline as completed
  ipcMain.handle(
    'deadline:complete',
    async (_event: IpcMainInvokeEvent, id: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:complete called by user:', userId, 'for deadline:', id);

          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          // Verify ownership (markCompleted will also check this)
          const existing = deadlineRepo.findById(id);
          if (!existing) {
            throw new Error(`Deadline with ID ${id} not found`);
          }

          if (existing.userId !== userId) {
            throw new Error('Unauthorized: You do not own this deadline');
          }

          // Mark as completed
          const updated = deadlineRepo.markCompleted(id, userId);

          if (!updated) {
            throw new Error(`Failed to mark deadline ${id} as completed`);
          }

          console.warn('[IPC] Deadline marked as completed:', id);
          return successResponse(updated);
        } catch (error) {
          console.error('[IPC] deadline:complete error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );

  // Delete deadline (soft delete)
  ipcMain.handle(
    'deadline:delete',
    async (_event: IpcMainInvokeEvent, id: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:delete called by user:', userId, 'for deadline:', id);

          const db = getDb();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          // Delete (repository will verify ownership)
          const deleted = deadlineRepo.delete(id, userId);

          if (!deleted) {
            throw new Error(`Deadline with ID ${id} not found or unauthorized`);
          }

          console.warn('[IPC] Deadline deleted successfully:', id);
          return successResponse({ success: true });
        } catch (error) {
          console.error('[IPC] deadline:delete error:', error);
          throw error; // withAuthorization will handle error formatting
        }
      });
    }
  );
}
