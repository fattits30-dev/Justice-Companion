import { ipcMain, safeStorage, app, dialog, BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  successResponse,
  formatError,
  type IPCResponse,
} from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import { databaseManager } from '../../src/db/database.ts';
import { CaseRepository } from '../../src/repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../src/repositories/EvidenceRepository.ts';
import {
  DatabaseError,
  FileNotFoundError,
  EncryptionError,
} from '../../src/errors/DomainErrors.ts';

// Helper functions for backup operations
function getBackupDir(): string {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function getMainDbPath(): string {
  return path.join(app.getPath('userData'), 'justice.db');
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

interface BackupMetadata {
  filename: string;
  path: string;
  size: number;
  created_at: string;
  is_valid: boolean;
  metadata?: {
    version: string;
    record_count: number;
    tables?: string[];
  };
}

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

      const mainDbPath = getMainDbPath();
      const backupDir = getBackupDir();
      const timestamp = formatTimestamp();
      const backupFilename = `backup_${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);

      // Ensure main database exists
      if (!fs.existsSync(mainDbPath)) {
        throw new FileNotFoundError('Main database file not found');
      }

      // Copy database file to backup
      fs.copyFileSync(mainDbPath, backupPath);

      // Get file stats
      const stats = fs.statSync(backupPath);

      // Get database metadata (record count, tables)
      const db = databaseManager.getDatabase();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;

      let totalRecords = 0;
      const tableNames: string[] = [];

      for (const table of tables) {
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
        totalRecords += countResult.count;
        tableNames.push(table.name);
      }

      const backupData: BackupMetadata = {
        filename: backupFilename,
        path: backupPath,
        size: stats.size,
        created_at: new Date().toISOString(),
        is_valid: true,
        metadata: {
          version: '1.0.0',
          record_count: totalRecords,
          tables: tableNames,
        },
      };

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_CREATED,
        userId: null,
        resourceType: 'database',
        resourceId: 'main',
        action: 'backup',
        success: true,
      });

      console.warn('[IPC] Backup created:', backupFilename);
      return successResponse(backupData);
    } catch (error: unknown) {
      console.error('[IPC] db:backup error:', error);
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_CREATED,
        userId: null,
        resourceType: 'database',
        resourceId: 'main',
        action: 'backup',
        success: false,
      });
      return formatError(error);
    }
  });

  // Get database status
  ipcMain.handle('db:status', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:status called');

      const db = databaseManager.getDatabase();
      const isConnected = !!db;

      return successResponse({
        connected: isConnected,
        message: isConnected ? 'Database connected successfully' : 'Database connection failed',
      });
    } catch (error: unknown) {
      console.error('[IPC] db:status error:', error);
      return formatError(error);
    }
  });

  // List all database backups
  ipcMain.handle('db:listBackups', async (_event: IpcMainInvokeEvent): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:listBackups called');

      const backupDir = getBackupDir();
      const backups: BackupMetadata[] = [];

      // Read all .db files in backup directory
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));

      for (const filename of files) {
        const backupPath = path.join(backupDir, filename);
        const stats = fs.statSync(backupPath);

        // Try to open backup and get metadata
        let metadata: BackupMetadata['metadata'] | undefined;
        let isValid = true;

        try {
          const backupDb = new Database(backupPath, { readonly: true });

          const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;

          let totalRecords = 0;
          const tableNames: string[] = [];

          for (const table of tables) {
            const countResult = backupDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
            totalRecords += countResult.count;
            tableNames.push(table.name);
          }

          metadata = {
            version: '1.0.0',
            record_count: totalRecords,
            tables: tableNames,
          };

          backupDb.close();
        } catch (err) {
          console.error('[IPC] Failed to read backup metadata:', filename, err);
          isValid = false;
        }

        backups.push({
          filename,
          path: backupPath,
          size: stats.size,
          created_at: stats.mtime.toISOString(),
          is_valid: isValid,
          metadata,
        });
      }

      // Sort by date descending (newest first)
      backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.warn('[IPC] Found', backups.length, 'backups');
      return successResponse({ backups });
    } catch (error: unknown) {
      console.error('[IPC] db:listBackups error:', error);
      return formatError(error);
    }
  });

  // Restore database from backup
  ipcMain.handle('db:restore', async (_event: IpcMainInvokeEvent, backupFilename: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:restore called with:', backupFilename);

      const backupDir = getBackupDir();
      const backupPath = path.join(backupDir, backupFilename);
      const mainDbPath = getMainDbPath();

      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        throw new FileNotFoundError('Backup file not found');
      }

      // Verify backup is valid SQLite database
      try {
        const testDb = new Database(backupPath, { readonly: true });
        testDb.close();
      } catch (err) {
        console.error('[IPC] Backup verification failed:', err);
        throw new DatabaseError('restore', 'Backup file is corrupted or invalid');
      }

      // Create a backup of current database before restoring
      const timestamp = formatTimestamp();
      const preRestoreBackup = path.join(backupDir, `pre-restore_${timestamp}.db`);

      if (fs.existsSync(mainDbPath)) {
        fs.copyFileSync(mainDbPath, preRestoreBackup);
      }

      // Close current database connection
      databaseManager.close();

      // Copy backup to main database location
      fs.copyFileSync(backupPath, mainDbPath);

      // Reopen database
      databaseManager.getDatabase();

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_RESTORED,
        userId: null,
        resourceType: 'database',
        resourceId: 'main',
        action: 'restore',
        success: true,
      });

      console.warn('[IPC] Database restored from:', backupFilename);
      return successResponse({
        restored: true,
        message: 'Database restored successfully',
        preRestoreBackup,
      });
    } catch (error: unknown) {
      console.error('[IPC] db:restore error:', error);
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_RESTORED,
        userId: null,
        resourceType: 'database',
        resourceId: 'main',
        action: 'restore',
        success: false,
      });
      return formatError(error);
    }
  });

  // Delete a backup file
  ipcMain.handle('db:deleteBackup', async (_event: IpcMainInvokeEvent, backupFilename: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] db:deleteBackup called with:', backupFilename);

      const backupDir = getBackupDir();
      const backupPath = path.join(backupDir, backupFilename);

      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        throw new FileNotFoundError('Backup file not found');
      }

      // Delete the backup file
      fs.unlinkSync(backupPath);

      // Log audit event
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_DELETED,
        userId: null,
        resourceType: 'database',
        resourceId: backupFilename,
        action: 'delete',
        success: true,
      });

      console.warn('[IPC] Backup deleted:', backupFilename);
      return successResponse({
        deleted: true,
        message: 'Backup deleted successfully',
      });
    } catch (error: unknown) {
      console.error('[IPC] db:deleteBackup error:', error);
      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_DELETED,
        userId: null,
        resourceType: 'database',
        resourceId: backupFilename,
        action: 'delete',
        success: false,
      });
      return formatError(error);
    }
  });

  // Auto-backup settings handlers
  ipcMain.handle('backup:getSettings', async (_event: IpcMainInvokeEvent, userId: number): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] backup:getSettings called for user:', userId);

      const { BackupScheduler } = await import('../../src/services/backup/BackupScheduler.ts');
      const scheduler = BackupScheduler.getInstance(databaseManager.getDatabase());

      const settings = scheduler.getBackupSettings(userId);

      // Return default settings if none exist
      if (!settings) {
        return successResponse({
          enabled: false,
          frequency: 'daily',
          backup_time: '03:00',
          keep_count: 7,
        });
      }

      return successResponse({
        enabled: Boolean(settings.enabled),
        frequency: settings.frequency,
        backup_time: settings.backup_time,
        keep_count: settings.keep_count,
        last_backup_at: settings.last_backup_at,
        next_backup_at: settings.next_backup_at,
      });
    } catch (error: unknown) {
      console.error('[IPC] backup:getSettings error:', error);
      return formatError(error);
    }
  });

  ipcMain.handle('backup:updateSettings', async (
    _event: IpcMainInvokeEvent,
    userId: number,
    settings: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      backup_time: string;
      keep_count: number;
    }
  ): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] backup:updateSettings called for user:', userId, 'with settings:', settings);

      const { BackupScheduler } = await import('../../src/services/backup/BackupScheduler.ts');
      const scheduler = BackupScheduler.getInstance(databaseManager.getDatabase());

      const updatedSettings = scheduler.updateBackupSettings(userId, settings);

      logAuditEvent({
        eventType: AuditEventType.DATABASE_SETTINGS_UPDATED,
        userId,
        resourceType: 'backup_settings',
        resourceId: String(updatedSettings.id),
        action: 'update',
        success: true,
        details: { settings },
      });

      return successResponse({
        enabled: Boolean(updatedSettings.enabled),
        frequency: updatedSettings.frequency,
        backup_time: updatedSettings.backup_time,
        keep_count: updatedSettings.keep_count,
        next_backup_at: updatedSettings.next_backup_at,
      });
    } catch (error: unknown) {
      console.error('[IPC] backup:updateSettings error:', error);

      logAuditEvent({
        eventType: AuditEventType.DATABASE_SETTINGS_UPDATED,
        userId,
        resourceType: 'backup_settings',
        resourceId: 'unknown',
        action: 'update',
        success: false,
      });

      return formatError(error);
    }
  });

  ipcMain.handle('backup:cleanupOld', async (_event: IpcMainInvokeEvent, keepCount: number): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] backup:cleanupOld called with keepCount:', keepCount);

      const { BackupRetentionPolicy } = await import('../../src/services/backup/BackupRetentionPolicy.ts');
      const retentionPolicy = new BackupRetentionPolicy();

      const deletedCount = await retentionPolicy.applyRetentionPolicy(keepCount);

      logAuditEvent({
        eventType: AuditEventType.DATABASE_BACKUP_DELETED,
        userId: null,
        resourceType: 'backup',
        resourceId: 'retention-policy',
        action: 'cleanup',
        success: true,
        details: { deletedCount, keepCount },
      });

      return successResponse({
        deletedCount,
        message: `Deleted ${deletedCount} old backup(s)`,
      });
    } catch (error: unknown) {
      console.error('[IPC] backup:cleanupOld error:', error);
      return formatError(error);
    }
  });

  // Secure storage handlers
  ipcMain.handle('secure-storage:encrypt', async (_event: IpcMainInvokeEvent, data: string): Promise<IPCResponse> => {
    try {
      console.warn('[IPC] secure-storage:encrypt called');

      if (!safeStorage.isEncryptionAvailable()) {
        throw new EncryptionError('Encryption not available on this platform');
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
        throw new EncryptionError('Encryption not available on this platform');
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
        throw new EncryptionError('Encryption not available on this platform');
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
        throw new EncryptionError('Encryption not available on this platform');
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
  // File dialog handlers
  ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows[0]; // Get the main window

    if (!mainWindow) {
      throw new Error('No window available for dialog');
    }

    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows[0]; // Get the main window

    if (!mainWindow) {
      throw new Error('No window available for dialog');
    }

    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });
}

export function setupAIConfigHandlers(): void {
  // AI configuration handlers not yet implemented
  // This is a stub to satisfy the import in index.ts
  console.warn('[IPC] AI configuration handlers not yet implemented');
}