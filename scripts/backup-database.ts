/**
 * Backup Database Script
 * Creates a timestamped backup of the Justice Companion database
 *
 * Note: This script is designed for standalone execution outside Electron context.
 * It backs up the database from the current working directory.
 *
 * Usage: npm run db:backup
 */

import fs from 'fs';
import path from 'path';

const DB_NAME = 'justice.db';
const BACKUP_DIR = 'backups';

console.warn('📦 Creating database backup...\n');

try {
  // Determine database path (current directory for development)
  const dbPath = path.join(process.cwd(), DB_NAME);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at: ${dbPath}`);
  }

  // Ensure backups directory exists
  const backupsDir = path.join(process.cwd(), BACKUP_DIR);
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    console.warn(`📁 Created backups directory: ${backupsDir}`);
  }

  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `justice_backup_${timestamp}.db`;
  const backupPath = path.join(backupsDir, backupFilename);

  // Copy database file
  fs.copyFileSync(dbPath, backupPath);

  // Get file stats
  const stats = fs.statSync(backupPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.warn('✅ Backup created successfully!\n');
  console.warn('='.repeat(80));
  console.warn(`  Filename: ${backupFilename}`);
  console.warn(`  Location: ${backupPath}`);
  console.warn(`  Size: ${sizeKB} KB (${sizeMB} MB)`);
  console.warn(`  Created: ${new Date().toISOString()}`);
  console.warn('='.repeat(80));
  console.warn('\n💡 Tip: Run "npm run db:backup:list" to view all backups\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Backup failed:');
  console.error(error);
  process.exit(1);
}
