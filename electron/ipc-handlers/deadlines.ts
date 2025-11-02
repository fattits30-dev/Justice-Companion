import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { successResponse, type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization, getAuthorizationMiddleware } from '../utils/authorization-wrapper.ts';
import { databaseManager } from '../../src/db/database.ts';
import { DeadlineRepository } from '../../src/repositories/DeadlineRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';

// Define proper types for better type safety
interface DeadlineData {
  caseId?: number;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
}

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

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          // If caseId provided, verify user owns the case and get deadlines for that case
          if (caseId) {
            const authMiddleware = getAuthorizationMiddleware();
            authMiddleware.verifyCaseOwnership(caseId, userId);

            const deadlines = deadlineRepo.findByCaseId(caseId, userId);
            console.warn('[IPC] Retrieved', deadlines.length, 'deadlines for case', caseId);
            return successResponse(deadlines); // Properly wrap response
          }

          // Otherwise, get all deadlines for user with case info
          const deadlines = deadlineRepo.findByUserId(userId);
          console.warn('[IPC] Retrieved', deadlines.length, 'total deadlines for user', userId);
          return successResponse(deadlines); // Properly wrap response
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
    async (_event: IpcMainInvokeEvent, data: DeadlineData, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:create called by user:', userId);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const createdDeadline = deadlineRepo.create({
            ...data,
            userId
          });

          console.warn('[IPC] Created deadline with ID:', createdDeadline.id);
          return successResponse(createdDeadline);
        } catch (error) {
          console.error('[IPC] deadline:create error:', error);
          throw error;
        }
      });
    }
  );

  // Update existing deadline
  ipcMain.handle(
    'deadline:update',
    async (_event: IpcMainInvokeEvent, id: number, data: Partial<DeadlineData>, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:update called for deadline ID:', id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const updatedDeadline = deadlineRepo.update(id, userId, data);
          
          console.warn('[IPC] Updated deadline with ID:', id);
          return successResponse(updatedDeadline);
        } catch (error) {
          console.error('[IPC] deadline:update error:', error);
          throw error;
        }
      });
    }
  );

  // Mark deadline as complete
  ipcMain.handle(
    'deadline:complete',
    async (_event: IpcMainInvokeEvent, id: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:complete called for deadline ID:', id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const completedDeadline = deadlineRepo.complete(id, userId);
          
          console.warn('[IPC] Completed deadline with ID:', id);
          return successResponse(completedDeadline);
        } catch (error) {
          console.error('[IPC] deadline:complete error:', error);
          throw error;
        }
      });
    }
  );

  // Delete deadline
  ipcMain.handle(
    'deadline:delete',
    async (_event: IpcMainInvokeEvent, id: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] deadline:delete called for deadline ID:', id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          deadlineRepo.delete(id, userId);
          
          console.warn('[IPC] Deleted deadline with ID:', id);
          return successResponse({ deleted: true });
        } catch (error) {
          console.error('[IPC] deadline:delete error:', error);
          throw error;
        }
      });
    }
  );
}