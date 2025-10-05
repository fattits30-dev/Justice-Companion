import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { errorLogger } from '../utils/error-logger';

/**
 * Backup metadata
 */
export interface BackupMetadata {
  filename: string;
  filepath: string;
  size: number;
  created_at: string;
}

/**
 * Get backups directory path
 */
function getBackupsDir(): string {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');

  // Ensure backups directory exists
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  return backupsDir;
}

/**
 * Get current database path
 */
function getDbPath(): string {
  return path.join(app.getPath('userData'), 'justice.db');
}

/**
 * Create a backup of the database
 * @param customFilename Optional custom filename (without extension)
 * @returns Backup metadata
 */
export function createBackup(customFilename?: string): BackupMetadata {
  try {
    const dbPath = getDbPath();

    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found');
    }

    const backupsDir = getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = customFilename
      ? `${customFilename}.db`
      : `justice_backup_${timestamp}.db`;

    const backupPath = path.join(backupsDir, filename);

    // Copy database file
    fs.copyFileSync(dbPath, backupPath);

    const stats = fs.statSync(backupPath);

    const metadata: BackupMetadata = {
      filename,
      filepath: backupPath,
      size: stats.size,
      created_at: new Date().toISOString(),
    };

    errorLogger.logError(`Database backup created: ${filename} (${stats.size} bytes)`, {
      type: 'info',
    });

    return metadata;
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'create-backup' });
    throw error;
  }
}

/**
 * Restore database from a backup file
 * @param filename Backup filename or full path
 */
export function restoreBackup(filename: string): void {
  try {
    const dbPath = getDbPath();
    let backupPath: string;

    // Check if filename is a full path or just a filename
    if (path.isAbsolute(filename)) {
      backupPath = filename;
    } else {
      backupPath = path.join(getBackupsDir(), filename);
    }

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Create a backup of current database before restoring
    createBackup('pre_restore_backup');

    // Restore backup
    fs.copyFileSync(backupPath, dbPath);

    errorLogger.logError(`Database restored from: ${filename}`, { type: 'info' });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'restore-backup' });
    throw error;
  }
}

/**
 * List all available backups
 * @returns Array of backup metadata
 */
export function listBackups(): BackupMetadata[] {
  try {
    const backupsDir = getBackupsDir();

    const files = fs
      .readdirSync(backupsDir)
      .filter((file) => file.endsWith('.db'))
      .map((file) => {
        const filepath = path.join(backupsDir, file);
        const stats = fs.statSync(filepath);

        return {
          filename: file,
          filepath,
          size: stats.size,
          created_at: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at)); // Most recent first

    return files;
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'list-backups' });
    return [];
  }
}

/**
 * Delete a backup file
 * @param filename Backup filename
 */
export function deleteBackup(filename: string): void {
  try {
    const backupPath = path.join(getBackupsDir(), filename);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    fs.unlinkSync(backupPath);

    errorLogger.logError(`Backup deleted: ${filename}`, { type: 'info' });
  } catch (error) {
    errorLogger.logError(error as Error, { context: 'delete-backup' });
    throw error;
  }
}

/**
 * Auto-backup before running migrations
 * Creates a timestamped backup with "pre_migration_" prefix
 */
export function createPreMigrationBackup(): BackupMetadata {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return createBackup(`pre_migration_${timestamp}`);
}
