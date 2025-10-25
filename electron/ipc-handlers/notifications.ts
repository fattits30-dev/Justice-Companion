import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { successResponse, errorResponse, type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { getDb } from '../../src/db/database.ts';
import { NotificationService } from '../../src/services/NotificationService.ts';
import { NotificationRepository } from '../../src/repositories/NotificationRepository.ts';
import { NotificationPreferencesRepository } from '../../src/repositories/NotificationPreferencesRepository.ts';
import { AuditLogger } from '../../src/services/AuditLogger.ts';
import type { NotificationFilters } from '../../src/models/Notification.ts';
import type { UpdateNotificationPreferencesInput } from '../../src/models/NotificationPreferences.ts';

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
    'notifications:list',
    async (_event: IpcMainInvokeEvent, sessionId: string, filters?: NotificationFilters): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:list called by user:', userId, 'with filters:', filters);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const notifications = await service.getNotifications(userId, filters);
          console.warn('[IPC] Retrieved', notifications.length, 'notifications for user', userId);

          return successResponse(notifications);
        } catch (error) {
          console.error('[IPC] notifications:list error:', error);
          return errorResponse('NOTIFICATIONS_LIST_FAILED', error instanceof Error ? error.message : 'Failed to retrieve notifications');
        }
      });
    }
  );

  // Get unread notification count
  ipcMain.handle(
    'notifications:unread-count',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:unread-count called by user:', userId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const count = await service.getUnreadCount(userId);
          console.warn('[IPC] User', userId, 'has', count, 'unread notifications');

          return successResponse(count);
        } catch (error) {
          console.error('[IPC] notifications:unread-count error:', error);
          return errorResponse('UNREAD_COUNT_FAILED', error instanceof Error ? error.message : 'Failed to get unread count');
        }
      });
    }
  );

  // Mark notification as read
  ipcMain.handle(
    'notifications:mark-read',
    async (_event: IpcMainInvokeEvent, sessionId: string, notificationId: number): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:mark-read called by user:', userId, 'for notification:', notificationId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          // Verify notification belongs to user
          const notification = await service.getNotificationById(notificationId);
          if (!notification || notification.userId !== userId) {
            throw new Error('Notification not found or access denied');
          }

          await service.markAsRead(notificationId);
          console.warn('[IPC] Marked notification', notificationId, 'as read');

          return successResponse(null);
        } catch (error) {
          console.error('[IPC] notifications:mark-read error:', error);
          return errorResponse('MARK_READ_FAILED', error instanceof Error ? error.message : 'Failed to mark as read');
        }
      });
    }
  );

  // Mark all notifications as read
  ipcMain.handle(
    'notifications:mark-all-read',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:mark-all-read called by user:', userId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const count = await service.markAllAsRead(userId);
          console.warn('[IPC] Marked', count, 'notifications as read for user', userId);

          return successResponse({ count });
        } catch (error) {
          console.error('[IPC] notifications:mark-all-read error:', error);
          return errorResponse('MARK_ALL_READ_FAILED', error instanceof Error ? error.message : 'Failed to mark all as read');
        }
      });
    }
  );

  // Dismiss notification
  ipcMain.handle(
    'notifications:dismiss',
    async (_event: IpcMainInvokeEvent, sessionId: string, notificationId: number): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:dismiss called by user:', userId, 'for notification:', notificationId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          // Verify notification belongs to user
          const notification = await service.getNotificationById(notificationId);
          if (!notification || notification.userId !== userId) {
            throw new Error('Notification not found or access denied');
          }

          await service.dismiss(notificationId);
          console.warn('[IPC] Dismissed notification', notificationId);

          return successResponse(null);
        } catch (error) {
          console.error('[IPC] notifications:dismiss error:', error);
          return errorResponse('DISMISS_FAILED', error instanceof Error ? error.message : 'Failed to dismiss notification');
        }
      });
    }
  );

  // Get notification preferences
  ipcMain.handle(
    'notifications:preferences',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:preferences called by user:', userId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const prefs = await service.getPreferences(userId);
          console.warn('[IPC] Retrieved notification preferences for user', userId);

          return successResponse(prefs);
        } catch (error) {
          console.error('[IPC] notifications:preferences error:', error);
          return errorResponse('GET_PREFERENCES_FAILED', error instanceof Error ? error.message : 'Failed to get preferences');
        }
      });
    }
  );

  // Update notification preferences
  ipcMain.handle(
    'notifications:update-preferences',
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      preferences: UpdateNotificationPreferencesInput
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:update-preferences called by user:', userId, 'with:', preferences);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const updated = await service.updatePreferences(userId, preferences);
          console.warn('[IPC] Updated notification preferences for user', userId);

          return successResponse(updated);
        } catch (error) {
          console.error('[IPC] notifications:update-preferences error:', error);
          return errorResponse('UPDATE_PREFERENCES_FAILED', error instanceof Error ? error.message : 'Failed to update preferences');
        }
      });
    }
  );

  // Get notification statistics
  ipcMain.handle(
    'notifications:stats',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] notifications:stats called by user:', userId);

          const db = getDb();
          const notificationRepo = new NotificationRepository(db);
          const preferencesRepo = new NotificationPreferencesRepository(db);
          const auditLogger = new AuditLogger(db);
          const service = new NotificationService(notificationRepo, preferencesRepo, auditLogger);

          const stats = await service.getStats(userId);
          console.warn('[IPC] Retrieved notification statistics for user', userId);

          return successResponse(stats);
        } catch (error) {
          console.error('[IPC] notifications:stats error:', error);
          return errorResponse('GET_STATS_FAILED', error instanceof Error ? error.message : 'Failed to get statistics');
        }
      });
    }
  );

  console.warn('[IPC] Notification handlers registered (8 channels)');
}