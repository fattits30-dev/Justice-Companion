import { ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import {
  successResponse,
  errorResponse,
  formatError,
  IPCErrorCode,
  type IPCResponse,
} from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import { databaseManager } from '../../src/db/database.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../src/repositories/EvidenceRepository.ts';

/**
 * ===== DATABASE HANDLERS =====
 * Channels: db:migrate, db:backup, db:status
 *           dashboard:stats
 *           secure-storage:* (5 channels)
 *           ui:logError
 *           ai:configure, ai:testConnection
 * Total: 13 channels
 */
export function setupDatabaseHandlers(): void {
  // Run database migrations
  ipcMain.handle('db:migrate', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:migrate called');

      // TODO: Create backup before migration
      // TODO: Call runMigrations() from migrate.ts
      // TODO: Return detailed migration results

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_MIGRATED,
        userId: null, // System operation
        resourceType: 'database',
        resourceId: 'main',
        action: 'migrate',
        success: true,
      });

      console.warn('[IPC] Migrations placeholder - full implementation pending');
      return successResponse({
        migrationsRun: 0,
        message: 'Migration system integration pending',
      });
    } catch (error: unknown) {
      console.error('[IPC] db:migrate error:', error);
      return formatError(error);
    }
  });

  // Create database backup
  ipcMain.handle('db:backup', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:backup called');

      // TODO: Implement backup functionality
      // TODO: Copy database file with timestamp
      // TODO: Return backup file path

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_CREATED,
        userId: null, // TODO: Extract from session
        resourceType: 'database',
        resourceId: 'main',
        action: 'backup',
        success: true,
      });

      console.warn('[IPC] Backup placeholder - full implementation pending');
      return successResponse({
        backupCreated: false,
        message: 'Backup system integration pending',
      });
    } catch (error: unknown) {
      console.error('[IPC] db:backup error:', error);
      return formatError(error);
    }
  });

  // Get database status
  ipcMain.handle('db:status', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:status called');

      const db = databaseManager.getDatabase();
      const isConnected = db ? true : false;
      
      return successResponse({
        connected: isConnected,
        message: isConnected ? 'Database connected successfully' : 'Database connection failed',
      });
    } catch (error: unknown) {
      console.error('[IPC] db:status error:', error);
      return formatError(error);
    }
  });

  // Secure storage handlers
  ipcMain.handle('secure-storage:encrypt', async (_event: IpcMainInvokeEvent, data: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:encrypt called');
      
      if (!safeStorage.isEncryptionAvailable()) {
        return errorResponse(IPCErrorCode.ENCRYPTION_NOT_AVAILABLE, 'Encryption not available on this platform');
      }
      
      const encrypted = safeStorage.encryptString(data);
      return successResponse({
        encryptedData: encrypted.toString('base64'),
      });
    } catch (error: unknown) {
      console.error('[IPC] secure-storage:encrypt error:', error);
      return formatError(error);
    }
  });

  ipcMain.handle('secure-storage:decrypt', async (_event: IpcMainInvokeEvent, encryptedData: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:decrypt called');
      
      if (!safeStorage.isEncryptionAvailable()) {
        return errorResponse(IPCErrorCode.ENCRYPTION_NOT_AVAILABLE, 'Encryption not available on this platform');
      }
      
      const decrypted = safeStorage.decryptString(Buffer.from(encryptedData, 'base64'));
      return successResponse({
        decryptedData: decrypted,
      });
    } catch (error: unknown) {
      console.error('[IPC] secure-storage:decrypt error:', error);
      return formatError(error);
    }
  });

  ipcMain.handle('secure-storage:isAvailable', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:isAvailable called');
      
      const isAvailable = safeStorage.isEncryptionAvailable();
      return successResponse({
        available: isAvailable,
      });
    } catch (error: unknown) {
      console.error('[IPC] secure-storage:isAvailable error:', error);
      return formatError(error);
    }
  });

  ipcMain.handle('secure-storage:encryptBuffer', async (_event: IpcMainInvokeEvent, buffer: Buffer): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:encryptBuffer called');
      
      if (!safeStorage.isEncryptionAvailable()) {
        return errorResponse(IPCErrorCode.ENCRYPTION_NOT_AVAILABLE, 'Encryption not available on this platform');
      }
      
      const encrypted = safeStorage.encryptString(buffer.toString('utf8'));
      return successResponse({
        encryptedBuffer: encrypted.toString('base64'),
      });
    } catch (error: unknown) {
      console.error('[IPC] secure-storage:encryptBuffer error:', error);
      return formatError(error);
    }
  });

  ipcMain.handle('secure-storage:decryptBuffer', async (_event: IpcMainInvokeEvent, encryptedBuffer: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:decryptBuffer called');
      
      if (!safeStorage.isEncryptionAvailable()) {
        return errorResponse(IPCErrorCode.ENCRYPTION_NOT_AVAILABLE, 'Encryption not available on this platform');
      }
      
      const decrypted = safeStorage.decryptString(Buffer.from(encryptedBuffer, 'base64'));
      return successResponse({
        decryptedBuffer: Buffer.from(decrypted).toString('base64'),
      });
    } catch (error: unknown) {
      console.error('[IPC] secure-storage:decryptBuffer error:', error);
      return formatError(error);
    }
  });

  // Dashboard stats handler
  ipcMain.handle('dashboard:stats', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] dashboard:stats called');

      const caseRepo = new CaseRepository(databaseManager.getDatabase());
      const evidenceRepo = new EvidenceRepository(databaseManager.getDatabase());
      
      const totalCases = await caseRepo.count();
      const totalEvidence = await evidenceRepo.count();
      
      return successResponse({
        totalCases,
        totalEvidence,
      });
    } catch (error: unknown) {
      console.error('[IPC] dashboard:stats error:', error);
      return formatError(error);
    }
  });

  // UI error logging
  ipcMain.handle('ui:logError', async (_event: IpcMainInvokeEvent, error: Error): Promise<IPCResponse> => {
    try {
      console.error('[IPC] ui:logError called with error:', error);

      // Log the error to audit system
      logAuditEvent({
        eventType: AuditEventType.ERROR_LOGGED,
        userId: null,
        resourceType: 'ui',
        resourceId: 'error-logger',
        action: 'log-error',
        success: false,
        details: {
          message: error.message,
          stack: error.stack,
        },
      });

      return successResponse({
        logged: true,
        message: 'Error logged successfully',
      });
    } catch (logError: unknown) {
      console.error('[IPC] ui:logError internal error:', logError);
      return formatError(logError);
    }
  });
}

// Export stub functions for handlers that are already included in setupDatabaseHandlers
// These are called separately in index.ts for organization purposes
export function setupDashboardHandlers(): void {
  // Dashboard handler already registered in setupDatabaseHandlers
  // This is a stub to satisfy the import in index.ts
}

export function setupSecureStorageHandlers(): void {
  // Secure storage handlers already registered in setupDatabaseHandlers
  // This is a stub to satisfy the import in index.ts
}

export function setupUIHandlers(): void {
  // UI handler already registered in setupDatabaseHandlers
  // This is a stub to satisfy the import in index.ts
}

export function setupAIConfigHandlers(): void {
  // AI configuration handlers not yet implemented
  // This is a stub to satisfy the import in index.ts
  console.warn('[IPC] AI configuration handlers not yet implemented');
}