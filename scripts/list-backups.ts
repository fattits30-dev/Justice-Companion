/**
 * List Backups Script
 * Displays all available database backups with metadata
 *
 * Note: This script is designed for standalone execution outside Electron context.
 * It lists backups from the 'backups' directory in the current working directory.
 *
 * Usage: npm run db:backup:list
 */

import fs from 'fs';
import path from 'path';

const BACKUP_DIR = 'backups';

console.warn('📋 Database Backups\n');
console.warn('='.repeat(80));

try {
  const backupsDir = path.join(process.cwd(), BACKUP_DIR);

  // Check if backups directory exists
  if (!fs.existsSync(backupsDir)) {
    console.warn('\n📁 Backups directory not found.');
    console.warn(`   Expected location: ${backupsDir}`);
    console.warn('\n💡 Tip: Run "npm run db:backup" to create your first backup\n');
    process.exit(0);
  }

  // Get all .db files in backups directory
  const backupFiles = fs
    .readdirSync(backupsDir)
    .filter((file) => file.endsWith('.db'))
    .map((file) => {
      const filepath = path.join(backupsDir, file);
      const stats = fs.statSync(filepath);

      return {
        filename: file,
        filepath,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.created.localeCompare(a.created)); // Most recent first

  if (backupFiles.length === 0) {
    console.warn('\n📁 No backups found.');
    console.warn('\n💡 Tip: Run "npm run db:backup" to create a backup\n');
    process.exit(0);
  }

  console.warn(`\nFound ${backupFiles.length} backup(s):\n`);

  backupFiles.forEach((backup, index) => {
    const isRecent = index === 0;
    const prefix = isRecent ? '🌟' : '  ';

    console.warn(`${prefix} ${backup.filename}`);
    console.warn(`     Location: ${backup.filepath}`);
    console.warn(`     Size: ${backup.sizeKB} KB (${backup.sizeMB} MB)`);
    console.warn(`     Created: ${backup.created}`);
    console.warn(`     Modified: ${backup.modified}`);

    if (index < backupFiles.length - 1) {
      console.warn(''); // Add spacing between entries
    }
  });

  // Calculate total size
  const totalSize = backupFiles.reduce((sum, backup) => sum + backup.size, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  console.warn('\n' + '='.repeat(80));
  console.warn(`\nTotal: ${backupFiles.length} backup(s), ${totalSizeKB} KB (${totalSizeMB} MB)`);
  console.warn(`Location: ${backupsDir}`);
  console.warn('\n💡 Tip: Run "npm run db:backup" to create a new backup\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Error listing backups:');
  console.error(error);
  process.exit(1);
}
