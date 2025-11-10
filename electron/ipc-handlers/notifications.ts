import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { successResponse, type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { databaseManager } from '../../src/db/database.ts';
import { NotificationService } from '../../src/services/NotificationService.ts';
import { NotificationRepository } from '../../src/repositories/NotificationRepository.ts';
import { NotificationPreferencesRepository } from '../../src/repositories/NotificationPreferencesRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import type { NotificationFilters } from '../../src/models/Notification.ts';
import type { UpdateNotificationPreferencesInput } from '../../src/models/NotificationPreferences.ts';
import {
  DatabaseError,
  NotificationNotFoundError,
  ValidationError,
} from '../../src/errors/DomainErrors.ts';

/**
 * ===== NOTIFICATION HANDLERS =====
 * Channels:
 * - notifications:list - Get notifications with filters
 * - notifications:unread-count - Get unread notification count
 * - notifications:mark-read - Mark a notification as read
 * - notifications:mark-all-read - Mark all notifications as read
 * - notifications:dismiss - Dismiss a notification
 * - notifications:preferences - Get notification preferences
 * - notifications:update-preferences - Update notification preferences
 * - notifications:stats - Get notification statistics
 * Total: 8 channels
 */
export function setupNotificationHandlers(): void {
  // Get notifications with optional filters
  ipcMain.handle(
    "notifications:list",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      filters?: NotificationFilters
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:list called by user:",
            userId,
            "with filters:",
            filters
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const notifications = await service.getNotifications(userId, filters);
          console.warn(
            "[IPC] Retrieved",
            notifications.length,
            "notifications for user",
            userId
          );

          return successResponse(notifications);
        } catch (error) {
          console.error("[IPC] notifications:list error:", error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("list notifications", error.message);
            }
          }

          throw error;
        }
      });
    }
  );

  // Get unread notification count
  ipcMain.handle(
    "notifications:unread-count",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:unread-count called by user:",
            userId
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const count = await service.getUnreadCount(userId);
          console.warn(
            "[IPC] User",
            userId,
            "has",
            count,
            "unread notifications"
          );

          return successResponse(count);
        } catch (error) {
          console.error("[IPC] notifications:unread-count error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("get unread count", error.message);
            }
          }
          throw error;
        }
      });
    }
  );

  // Mark notification as read
  ipcMain.handle(
    "notifications:mark-read",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      notificationId: number
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:mark-read called by user:",
            userId,
            "for notification:",
            notificationId
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          // Verify notification belongs to user
          const notification =
            await service.getNotificationById(notificationId);
          if (!notification || notification.userId !== userId) {
            throw new NotificationNotFoundError(notificationId);
          }

          await service.markAsRead(notificationId);
          console.warn("[IPC] Marked notification", notificationId, "as read");

          return successResponse(null);
        } catch (error) {
          console.error("[IPC] notifications:mark-read error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError(
                "mark notification as read",
                error.message
              );
            }
            if (
              message.includes("not found") ||
              message.includes("access denied")
            ) {
              throw new NotificationNotFoundError(notificationId);
            }
          }
          throw error;
        }
      });
    }
  );

  // Mark all notifications as read
  ipcMain.handle(
    "notifications:mark-all-read",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:mark-all-read called by user:",
            userId
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const count = await service.markAllAsRead(userId);
          console.warn(
            "[IPC] Marked",
            count,
            "notifications as read for user",
            userId
          );

          return successResponse({ count });
        } catch (error) {
          console.error("[IPC] notifications:mark-all-read error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("mark all as read", error.message);
            }
          }
          throw error;
        }
      });
    }
  );

  // Dismiss notification
  ipcMain.handle(
    "notifications:dismiss",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      notificationId: number
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:dismiss called by user:",
            userId,
            "for notification:",
            notificationId
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          // Verify notification belongs to user
          const notification =
            await service.getNotificationById(notificationId);
          if (!notification || notification.userId !== userId) {
            throw new NotificationNotFoundError(notificationId);
          }

          await service.dismiss(notificationId);
          console.warn("[IPC] Dismissed notification", notificationId);

          return successResponse(null);
        } catch (error) {
          console.error("[IPC] notifications:dismiss error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError("dismiss notification", error.message);
            }
            if (
              message.includes("not found") ||
              message.includes("access denied")
            ) {
              throw new NotificationNotFoundError(notificationId);
            }
          }
          throw error;
        }
      });
    }
  );

  // Get notification preferences
  ipcMain.handle(
    "notifications:preferences",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:preferences called by user:",
            userId
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const prefs = await service.getPreferences(userId);
          console.warn(
            "[IPC] Retrieved notification preferences for user",
            userId
          );

          return successResponse(prefs);
        } catch (error) {
          console.error("[IPC] notifications:preferences error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError(
                "get notification preferences",
                error.message
              );
            }
          }
          throw error;
        }
      });
    }
  );

  // Update notification preferences
  ipcMain.handle(
    "notifications:update-preferences",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      preferences: UpdateNotificationPreferencesInput
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] notifications:update-preferences called by user:",
            userId,
            "with:",
            preferences
          );

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const updated = await service.updatePreferences(userId, preferences);
          console.warn(
            "[IPC] Updated notification preferences for user",
            userId
          );

          return successResponse(updated);
        } catch (error) {
          console.error("[IPC] notifications:update-preferences error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError(
                "update notification preferences",
                error.message
              );
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

  // Get notification statistics
  ipcMain.handle(
    "notifications:stats",
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn("[IPC] notifications:stats called by user:", userId);

          const db = databaseManager.getDatabase();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(
            notificationRepo,
            preferencesRepo,
            auditLogger
          );

          const stats = await service.getStats(userId);
          console.warn(
            "[IPC] Retrieved notification statistics for user",
            userId
          );

          return successResponse(stats);
        } catch (error) {
          console.error("[IPC] notifications:stats error:", error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("database") || message.includes("sqlite")) {
              throw new DatabaseError(
                "get notification statistics",
                error.message
              );
            }
          }
          throw error;
        }
      });
    }
  );

  console.warn("[IPC] Notification handlers registered (8 channels)");
}
