import fs from "fs";
import path from "path";
import { errorLogger } from "../utils/error-logger.ts";

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
  const userDataPath = getUserDataDir();
  const backupsDir = path.join(userDataPath, "backups");

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
  if (process.env.JUSTICE_DB_PATH) {
    return process.env.JUSTICE_DB_PATH;
  }

  return path.join(getUserDataDir(), "justice.db");
}

/**
 * Resolve user data directory without Electron
 *
 * Priority:
 * 1. Directory of JUSTICE_DB_PATH if set
 * 2. ".justice-companion" folder under current working directory
 */
function getUserDataDir(): string {
  if (process.env.JUSTICE_DB_PATH) {
    return path.dirname(process.env.JUSTICE_DB_PATH);
  }

  const fallbackDir = path.join(process.cwd(), ".justice-companion");
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }

  return fallbackDir;
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
      throw new Error("Database file not found");
    }

    const backupsDir = getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
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

    errorLogger.logError(
      `Database backup created: ${filename} (${stats.size} bytes)`,
      {
        type: "info",
      }
    );

    return metadata;
  } catch (error) {
    errorLogger.logError(error as Error, { context: "create-backup" });
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
    createBackup("pre_restore_backup");

    // Restore backup
    fs.copyFileSync(backupPath, dbPath);

    errorLogger.logError(`Database restored from: ${filename}`, {
      type: "info",
    });
  } catch (error) {
    errorLogger.logError(error as Error, { context: "restore-backup" });
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

    const files: BackupMetadata[] = fs
      .readdirSync(backupsDir)
      .filter((file: string) => file.endsWith(".db"))
      .map((file: string) => {
        const filepath = path.join(backupsDir, file);
        const stats = fs.statSync(filepath);

        return {
          filename: file,
          filepath,
          size: stats.size,
          created_at: stats.birthtime.toISOString(),
        };
      })
      .sort((a: BackupMetadata, b: BackupMetadata) =>
        b.created_at.localeCompare(a.created_at)
      ); // Most recent first

    return files;
  } catch (error) {
    errorLogger.logError(error as Error, { context: "list-backups" });
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

    errorLogger.logError(`Backup deleted: ${filename}`, { type: "info" });
  } catch (error) {
    errorLogger.logError(error as Error, { context: "delete-backup" });
    throw error;
  }
}

/**
 * Auto-backup before running migrations
 * Creates a timestamped backup with "pre_migration_" prefix
 */
export function createPreMigrationBackup(): BackupMetadata {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return createBackup(`pre_migration_${timestamp}`);
}
