// src/services/backup/BackupRetentionPolicy.ts
import { listBackups, deleteBackup, BackupMetadata } from '../../db/backup.ts';
import { errorLogger } from '../../utils/error-logger.ts';

/**
 * Backup Retention Policy Service
 * Manages automatic cleanup of old backups based on retention rules
 */
export class BackupRetentionPolicy {
  /**
   * Apply retention policy to delete old backups
   * @param keepCount Number of backups to retain (1-30)
   * @returns Number of backups deleted
   */
  async applyRetentionPolicy(keepCount: number): Promise<number> {
    try {
      // Validate keepCount
      if (keepCount < 1 || keepCount > 30) {
        throw new Error(`Invalid keepCount: ${keepCount}. Must be between 1 and 30.`);
      }

      // Get all backups sorted by creation date (most recent first)
      const allBackups = await this.getBackupsSortedByDate();

      if (allBackups.length === 0) {
        errorLogger.logError('No backups found for retention policy', { type: 'info' });
        return 0;
      }

      // Separate protected backups (pre_migration_*) from regular backups
      const protectedBackups = allBackups.filter(b =>
        b.filename.startsWith('pre_migration_') || b.filename.startsWith('pre_restore_backup')
      );
      const regularBackups = allBackups.filter(b =>
        !b.filename.startsWith('pre_migration_') && !b.filename.startsWith('pre_restore_backup')
      );

      // Determine which regular backups to keep
      const backupsToKeep = regularBackups.slice(0, keepCount);
      const backupsToDelete = regularBackups.slice(keepCount);

      // Safety check: Always keep at least 1 backup
      if (backupsToKeep.length === 0 && regularBackups.length > 0) {
        errorLogger.logError(
          'Retention policy would delete all backups. Keeping at least 1 for safety.',
          { type: 'warning' }
        );
        return 0;
      }

      // Delete old backups
      const deletedCount = await this.deleteOldBackups(backupsToDelete);

      errorLogger.logError(
        `Retention policy applied: kept ${backupsToKeep.length} backups, ` +
        `deleted ${deletedCount} backups, ` +
        `protected ${protectedBackups.length} migration/restore backups`,
        { type: 'info' }
      );

      return deletedCount;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'retention-policy' });
      throw error;
    }
  }

  /**
   * Get all backups sorted by creation date (most recent first)
   */
  private async getBackupsSortedByDate(): Promise<BackupMetadata[]> {
    // listBackups() already returns backups sorted by created_at DESC
    return listBackups();
  }

  /**
   * Delete specified backups
   * @param backupsToDelete Array of backups to delete
   * @returns Number of successfully deleted backups
   */
  private async deleteOldBackups(backupsToDelete: BackupMetadata[]): Promise<number> {
    let deletedCount = 0;

    for (const backup of backupsToDelete) {
      try {
        deleteBackup(backup.filename);
        deletedCount++;
      } catch (error) {
        // Log error but continue with other deletions
        errorLogger.logError(
          new Error(`Failed to delete backup ${backup.filename}: ${(error as Error).message}`),
          { context: 'retention-policy-delete' }
        );
      }
    }

    return deletedCount;
  }

  /**
   * Get retention policy summary
   * @param keepCount Configured keep count
   * @returns Summary of backups by category
   */
  async getRetentionSummary(keepCount: number): Promise<{
    total: number;
    protected: number;
    toKeep: number;
    toDelete: number;
  }> {
    const allBackups = await this.getBackupsSortedByDate();

    const protectedBackups = allBackups.filter(b =>
      b.filename.startsWith('pre_migration_') || b.filename.startsWith('pre_restore_backup')
    );
    const regularBackups = allBackups.filter(b =>
      !b.filename.startsWith('pre_migration_') && !b.filename.startsWith('pre_restore_backup')
    );

    const toKeep = Math.min(keepCount, regularBackups.length);
    const toDelete = Math.max(0, regularBackups.length - keepCount);

    return {
      total: allBackups.length,
      protected: protectedBackups.length,
      toKeep,
      toDelete,
    };
  }
}
