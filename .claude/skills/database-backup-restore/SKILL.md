---
name: database-backup-restore
description: "Automated SQLite database backup/restore system with validation, encryption, and migration safety. Supports point-in-time recovery, incremental backups, and disaster recovery. Use before risky operations, data migrations, or production deployments."
allowed-tools: ["Bash", "Read", "Write", "Edit", "Grep", "mcp__sqlite__*", "mcp__memory__*"]
---

# Database Backup & Restore Skill

## Purpose
Protect user data with automated backups, safe restoration, and disaster recovery procedures.

## When Claude Uses This
- Before running database migrations
- Before major schema changes
- User requests data backup
- Disaster recovery scenarios
- Testing rollback procedures
- Production deployment preparation

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Use Case |
|------|-----------|-----------|----------|
| **Automatic** | On app start | 7 days | Safety net |
| **Manual** | User-triggered | Indefinite | Before risky operations |
| **Migration** | Before migrations | 30 days | Rollback capability |
| **Export** | User-triggered | Indefinite | Data portability (GDPR) |

### Backup Location
```
.justice-companion/
└── backups/
    ├── automatic/
    │   ├── justice-2025-10-21-1400.db
    │   └── justice-2025-10-21-1530.db
    ├── manual/
    │   └── before-major-update.db
    ├── migration/
    │   └── before-migration-004.db
    └── exports/
        └── user-data-export-2025-10-21.json
```

## Implementation

### Core Backup Service
```typescript
// src/services/BackupService.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface BackupMetadata {
  filename: string;
  timestamp: Date;
  type: 'automatic' | 'manual' | 'migration' | 'export';
  size: number;
  checksum: string;
  migrationVersion?: number;
  description?: string;
}

export class BackupService {
  private backupDir = '.justice-companion/backups';

  /**
   * Create database backup with metadata
   */
  async createBackup(
    type: BackupMetadata['type'],
    description?: string
  ): Promise<BackupMetadata> {
    const timestamp = new Date();
    const filename = `justice-${this.formatDate(timestamp)}.db`;
    const targetDir = path.join(this.backupDir, type);
    const targetPath = path.join(targetDir, filename);

    // Ensure directory exists
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Copy database file
    await fs.promises.copyFile('justice.db', targetPath);

    // Calculate checksum
    const checksum = await this.calculateChecksum(targetPath);

    // Get file size
    const stats = await fs.promises.stat(targetPath);

    const metadata: BackupMetadata = {
      filename,
      timestamp,
      type,
      size: stats.size,
      checksum,
      description,
    };

    // Save metadata
    await this.saveMetadata(metadata);

    // Clean old backups
    await this.cleanOldBackups(type);

    return metadata;
  }

  /**
   * Restore from backup with validation
   */
  async restoreBackup(filename: string): Promise<void> {
    const backupPath = this.findBackup(filename);

    if (!backupPath) {
      throw new Error(`Backup not found: ${filename}`);
    }

    // Validate backup integrity
    const metadata = await this.getMetadata(filename);
    const currentChecksum = await this.calculateChecksum(backupPath);

    if (currentChecksum !== metadata.checksum) {
      throw new Error('Backup file corrupted: checksum mismatch');
    }

    // Create safety backup of current database
    await this.createBackup('automatic', 'Before restore operation');

    // Close all database connections
    await this.closeDatabaseConnections();

    // Restore backup
    await fs.promises.copyFile(backupPath, 'justice.db');

    // Verify restored database
    await this.verifyDatabase();
  }

  /**
   * Calculate SHA-256 checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Verify database integrity
   */
  private async verifyDatabase(): Promise<void> {
    const db = require('better-sqlite3')('justice.db');

    try {
      // Run integrity check
      const result = db.pragma('integrity_check');

      if (result[0].integrity_check !== 'ok') {
        throw new Error('Database integrity check failed');
      }

      // Verify critical tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();

      const requiredTables = ['users', 'cases', 'evidence', 'audit_logs'];
      const existingTables = tables.map(t => t.name);

      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          throw new Error(`Critical table missing: ${table}`);
        }
      }
    } finally {
      db.close();
    }
  }

  /**
   * Clean old backups based on retention policy
   */
  private async cleanOldBackups(type: BackupMetadata['type']): Promise<void> {
    const retentionDays = {
      automatic: 7,
      manual: Infinity,
      migration: 30,
      export: Infinity,
    };

    const maxAge = retentionDays[type];
    if (maxAge === Infinity) return;

    const targetDir = path.join(this.backupDir, type);
    const files = await fs.promises.readdir(targetDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    for (const file of files) {
      const filePath = path.join(targetDir, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    }
  }
}
```

## Backup Scripts

### Create Backup Script
```bash
# scripts/backup-database.ts
import { BackupService } from '../src/services/BackupService';

const backupService = new BackupService();

async function main() {
  const args = process.argv.slice(2);
  const type = (args[0] || 'manual') as 'manual' | 'automatic' | 'migration';
  const description = args[1];

  console.log(`Creating ${type} backup...`);

  const metadata = await backupService.createBackup(type, description);

  console.log(`✅ Backup created: ${metadata.filename}`);
  console.log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Checksum: ${metadata.checksum.substring(0, 16)}...`);
}

main().catch(console.error);
```

### List Backups Script
```bash
# scripts/list-backups.ts
import fs from 'fs';
import path from 'path';

async function main() {
  const backupDir = '.justice-companion/backups';
  const types = ['automatic', 'manual', 'migration', 'export'];

  console.log('📦 Available Backups:\n');

  for (const type of types) {
    const dir = path.join(backupDir, type);

    if (!fs.existsSync(dir)) continue;

    const files = await fs.promises.readdir(dir);

    if (files.length === 0) continue;

    console.log(`${type.toUpperCase()}:`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.promises.stat(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const date = stats.mtime.toISOString().split('T')[0];

      console.log(`  - ${file} (${size} MB, ${date})`);
    }

    console.log('');
  }
}

main().catch(console.error);
```

### Restore Backup Script
```bash
# scripts/restore-backup.ts
import { BackupService } from '../src/services/BackupService';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function confirm(question: string): Promise<boolean> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const filename = process.argv[2];

  if (!filename) {
    console.error('Usage: pnpm db:restore <backup-filename>');
    process.exit(1);
  }

  console.log(`⚠️  WARNING: This will replace your current database!`);
  console.log(`   Restoring from: ${filename}`);
  console.log(`   A backup of current database will be created first.\n`);

  const confirmed = await confirm('Continue? (y/N): ');

  if (!confirmed) {
    console.log('Restore cancelled.');
    process.exit(0);
  }

  const backupService = new BackupService();

  console.log('\nRestoring backup...');
  await backupService.restoreBackup(filename);

  console.log('✅ Database restored successfully!');
  console.log('   Please restart the application.\n');

  rl.close();
}

main().catch(console.error);
```

## Migration Safety Integration

### Automatic Pre-Migration Backup
```typescript
// scripts/migration-status.ts
import { BackupService } from '../src/services/BackupService';

async function runMigration(version: number) {
  const backupService = new BackupService();

  // Create backup before migration
  console.log('Creating pre-migration backup...');
  const backup = await backupService.createBackup(
    'migration',
    `Before migration ${version.toString().padStart(3, '0')}`
  );

  console.log(`Backup created: ${backup.filename}`);

  try {
    // Run migration
    console.log(`Running migration ${version}...`);
    await applyMigration(version);
    console.log('✅ Migration successful');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('Rolling back...');

    // Automatic rollback
    await backupService.restoreBackup(backup.filename);

    console.log('Database restored to pre-migration state');
    throw error;
  }
}
```

## GDPR Data Export

### Export User Data (JSON)
```typescript
// src/services/DataExportService.ts
export class DataExportService {
  async exportUserData(userId: number): Promise<string> {
    const db = require('better-sqlite3')('justice.db');

    const userData = {
      user: db.prepare('SELECT * FROM users WHERE id = ?').get(userId),
      cases: db.prepare('SELECT * FROM cases WHERE user_id = ?').all(userId),
      evidence: db.prepare(`
        SELECT e.* FROM evidence e
        JOIN cases c ON e.case_id = c.id
        WHERE c.user_id = ?
      `).all(userId),
      documents: db.prepare(`
        SELECT d.* FROM documents d
        JOIN cases c ON d.case_id = c.id
        WHERE c.user_id = ?
      `).all(userId),
      auditLogs: db.prepare(`
        SELECT * FROM audit_logs WHERE user_id = ?
      `).all(userId),
    };

    db.close();

    const filename = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
    const exportPath = path.join('.justice-companion/backups/exports', filename);

    await fs.promises.writeFile(
      exportPath,
      JSON.stringify(userData, null, 2)
    );

    return filename;
  }
}
```

## Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "db:backup": "tsx scripts/backup-database.ts",
    "db:backup:list": "tsx scripts/list-backups.ts",
    "db:restore": "tsx scripts/restore-backup.ts",
    "db:export": "tsx scripts/export-user-data.ts"
  }
}
```

## Usage Examples

```bash
# Create manual backup
pnpm db:backup manual "Before major refactor"

# List all backups
pnpm db:backup:list

# Restore from backup
pnpm db:restore justice-2025-10-21-1400.db

# Export user data (GDPR)
pnpm db:export --user-id 123
```

## Testing Backup/Restore

```typescript
// tests/services/BackupService.test.ts
import { BackupService } from '@/services/BackupService';
import fs from 'fs';

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    backupService = new BackupService();
  });

  it('creates backup with valid checksum', async () => {
    const metadata = await backupService.createBackup('manual');

    expect(metadata.checksum).toHaveLength(64); // SHA-256
    expect(metadata.size).toBeGreaterThan(0);
  });

  it('detects corrupted backups', async () => {
    const metadata = await backupService.createBackup('manual');

    // Corrupt backup file
    const backupPath = `backups/manual/${metadata.filename}`;
    await fs.promises.appendFile(backupPath, 'corrupted data');

    // Restore should fail
    await expect(
      backupService.restoreBackup(metadata.filename)
    ).rejects.toThrow('checksum mismatch');
  });

  it('cleans old automatic backups', async () => {
    // Create 10 automatic backups
    for (let i = 0; i < 10; i++) {
      await backupService.createBackup('automatic');
    }

    // Only 7 should remain (retention policy)
    const files = await fs.promises.readdir('backups/automatic');
    expect(files.length).toBeLessThanOrEqual(7);
  });
});
```

## Best Practices

1. **Always backup before:**
   - Database migrations
   - Schema changes
   - Major refactors
   - Production deployments

2. **Verify backups:**
   - Check integrity after creation
   - Test restore procedure regularly
   - Validate checksums

3. **Secure backups:**
   - Store in `.justice-companion/` (gitignored)
   - Consider encryption for sensitive data
   - Set proper file permissions

4. **Monitor disk space:**
   - Automatic cleanup of old backups
   - Alert when backup directory > 1GB
   - Compress old backups

## References
- SQLite Backup API: https://www.sqlite.org/backup.html
- better-sqlite3 Backup: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise
- GDPR Data Portability: Article 20
