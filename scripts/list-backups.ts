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

console.log('📋 Database Backups\n');
console.log('='.repeat(80));

try {
  const backupsDir = path.join(process.cwd(), BACKUP_DIR);

  // Check if backups directory exists
  if (!fs.existsSync(backupsDir)) {
    console.log('\n📁 Backups directory not found.');
    console.log(`   Expected location: ${backupsDir}`);
    console.log('\n💡 Tip: Run "npm run db:backup" to create your first backup\n');
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
    console.log('\n📁 No backups found.');
    console.log('\n💡 Tip: Run "npm run db:backup" to create a backup\n');
    process.exit(0);
  }

  console.log(`\nFound ${backupFiles.length} backup(s):\n`);

  backupFiles.forEach((backup, index) => {
    const isRecent = index === 0;
    const prefix = isRecent ? '🌟' : '  ';

    console.log(`${prefix} ${backup.filename}`);
    console.log(`     Location: ${backup.filepath}`);
    console.log(`     Size: ${backup.sizeKB} KB (${backup.sizeMB} MB)`);
    console.log(`     Created: ${backup.created}`);
    console.log(`     Modified: ${backup.modified}`);

    if (index < backupFiles.length - 1) {
      console.log(''); // Add spacing between entries
    }
  });

  // Calculate total size
  const totalSize = backupFiles.reduce((sum, backup) => sum + backup.size, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal: ${backupFiles.length} backup(s), ${totalSizeKB} KB (${totalSizeMB} MB)`);
  console.log(`Location: ${backupsDir}`);
  console.log('\n💡 Tip: Run "npm run db:backup" to create a new backup\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Error listing backups:');
  console.error(error);
  process.exit(1);
}
