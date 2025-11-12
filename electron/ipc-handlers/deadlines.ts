import type { Electron } from 'electron';
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { successResponse, type IPCResponse } from '../utils/ipc-response.ts';
import {
  withAuthorization,
  getAuthorizationMiddleware,
} from '../utils/authorization-wrapper.ts';
import { databaseManager } from '../../src/db/database.ts';
import { DeadlineRepository } from '../../src/repositories/DeadlineRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import {
  DeadlineNotFoundError,
  DatabaseError,
  RequiredFieldError,
  ValidationError,
} from '../../src/errors/DomainErrors.ts';
import type { UpdateDeadlineInput } from '../../src/domains/timeline/entities/Deadline.ts';
import { logger } from '../../src/utils/logger';

type DeadlinePriority = "low" | "medium" | "high" | "critical";
type DeadlineStatus = "upcoming" | "overdue" | "completed";

interface CreateDeadlineRequest {
  caseId?: number;
  title: string;
  description?: string;
  deadlineDate?: string;
  dueDate?: string;
  priority?: DeadlinePriority;
}

interface UpdateDeadlineRequest extends Partial<CreateDeadlineRequest> {
  status?: DeadlineStatus;
}

function buildUpdateDeadlineInput(
  data: UpdateDeadlineRequest
): UpdateDeadlineInput {
  const updateInput: UpdateDeadlineInput = {};

  if (typeof data.title === "string") {
    updateInput.title = data.title;
  }

  if (typeof data.description === "string") {
    updateInput.description = data.description;
  }

  const updatedDeadlineDate = data.deadlineDate ?? data.dueDate;
  if (updatedDeadlineDate) {
    updateInput.deadlineDate = updatedDeadlineDate;
  }

  if (data.priority) {
    updateInput.priority = data.priority;
  }

  if (data.status) {
    updateInput.status = data.status;
  }

  return updateInput;
}

/**
 * ===== DEADLINE HANDLERS =====
 * Channels: deadline:getAll, deadline:create, deadline:update, deadline:complete, deadline:delete
 * Total: 5 channels
 */
export function setupDeadlineHandlers(): void {
  // Get all deadlines for user (optionally filtered by case)
  ipcMain.handle(
    "deadline:getAll",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      caseId?: number
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn(
            "[IPC] deadline:getAll called by user:",
            userId,
            caseId ? `for case ${caseId}` : "all cases"
          );

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          // If caseId provided, verify user owns the case and get deadlines for that case
          if (caseId) {
            const authMiddleware = getAuthorizationMiddleware();
            authMiddleware.verifyCaseOwnership(caseId, userId);

            const deadlines = deadlineRepo.findByCaseId(caseId, userId);
            logger.warn(
              "[IPC] Retrieved",
              deadlines.length,
              "deadlines for case",
              caseId
            );
            return successResponse(deadlines); // Properly wrap response
          }

          // Otherwise, get all deadlines for user with case info
          const deadlines = deadlineRepo.findByUserId(userId);
          logger.warn(
            "[IPC] Retrieved",
            deadlines.length,
            "total deadlines for user",
            userId
          );
          return successResponse(deadlines); // Properly wrap response
        } catch (error) {
          logger.error("[IPC] deadline:getAll error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("get deadlines", error.message);
            }

            if (message.includes("not found")) {
              throw new DeadlineNotFoundError(
                caseId
                  ? `Deadline not found for case ${caseId}`
                  : "Deadlines not found"
              );
            }
          }

          throw error; // Re-throw if already a DomainError or unknown error
        }
      });
    }
  );

  // Create new deadline
  ipcMain.handle(
    "deadline:create",
    async (
      _event: IpcMainInvokeEvent,
      data: CreateDeadlineRequest,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] deadline:create called by user:", userId);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          if (!data.caseId) {
            throw new RequiredFieldError("caseId");
          }

          const deadlineDate = data.deadlineDate ?? data.dueDate;
          if (!deadlineDate) {
            throw new RequiredFieldError("deadlineDate");
          }

          const createdDeadline = deadlineRepo.create({
            caseId: data.caseId,
            userId,
            title: data.title,
            description: data.description,
            deadlineDate,
            priority: data.priority ?? "medium",
          });

          logger.warn("[IPC] Created deadline with ID:", createdDeadline.id);
          return successResponse(createdDeadline);
        } catch (error) {
          logger.error("[IPC] deadline:create error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("create deadline", error.message);
            }

            if (message.includes("required") || message.includes("missing")) {
              throw new RequiredFieldError("deadline data");
            }

            if (message.includes("invalid") || message.includes("validation")) {
              throw new ValidationError(error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Update existing deadline
  ipcMain.handle(
    "deadline:update",
    async (
      _event: IpcMainInvokeEvent,
      id: number,
      data: UpdateDeadlineRequest,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          logger.warn("[IPC] deadline:update called for deadline ID:", id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const updateInput = buildUpdateDeadlineInput(data);

          const updatedDeadline = deadlineRepo.update(id, updateInput);

          logger.warn("[IPC] Updated deadline with ID:", id);
          return successResponse(updatedDeadline);
        } catch (error) {
          logger.error("[IPC] deadline:update error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("update deadline", error.message);
            }

            if (message.includes("not found")) {
              throw new DeadlineNotFoundError(`Deadline ${id} not found`);
            }

            if (message.includes("invalid") || message.includes("validation")) {
              throw new ValidationError(error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Mark deadline as complete
  ipcMain.handle(
    "deadline:complete",
    async (
      _event: IpcMainInvokeEvent,
      id: number,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] deadline:complete called for deadline ID:", id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          const completedDeadline = deadlineRepo.complete(id, userId);

          logger.warn("[IPC] Completed deadline with ID:", id);
          return successResponse(completedDeadline);
        } catch (error) {
          logger.error("[IPC] deadline:complete error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("complete deadline", error.message);
            }

            if (message.includes("not found")) {
              throw new DeadlineNotFoundError(`Deadline ${id} not found`);
            }
          }

          throw error;
        }
      });
    }
  );

  // Delete deadline
  ipcMain.handle(
    "deadline:delete",
    async (
      _event: IpcMainInvokeEvent,
      id: number,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          logger.warn("[IPC] deadline:delete called for deadline ID:", id);

          const db = databaseManager.getDatabase();
          const auditLogger = new AuditLogger(db);
          const deadlineRepo = new DeadlineRepository(db, auditLogger);

          deadlineRepo.delete(id, userId);

          logger.warn("[IPC] Deleted deadline with ID:", id);
          return successResponse({ deleted: true });
        } catch (error) {
          logger.error("[IPC] deadline:delete error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("delete deadline", error.message);
            }

            if (message.includes("not found")) {
              throw new DeadlineNotFoundError(`Deadline ${id} not found`);
            }
          }

          throw error;
        }
      });
    }
  );
}
