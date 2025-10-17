"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMigration = parseMigration;
exports.runMigrations = runMigrations;
exports.rollbackMigration = rollbackMigration;
exports.getMigrationStatus = getMigrationStatus;
exports.validateMigration = validateMigration;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("./database");
const error_logger_1 = require("../utils/error-logger");
/**
 * Enhanced migration table with checksum, duration, and status tracking
 */
function ensureMigrationsTable() {
    const db = (0, database_1.getDb)();
    db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      applied_by TEXT,
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'applied' CHECK(status IN ('applied', 'rolled_back', 'failed'))
    )
  `);
}
/**
 * Calculate SHA-256 checksum of migration file
 */
function calculateChecksum(content) {
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Parse migration file into UP and DOWN sections
 */
function parseMigration(content) {
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
    const up = upMatch ? upMatch[1].trim() : content.trim();
    const down = downMatch ? downMatch[1].trim() : '';
    return { up, down };
}
/**
 * Run all pending migrations
 */
function runMigrations() {
    const db = (0, database_1.getDb)();
    // Try multiple paths to find migrations
    const possiblePaths = [
        path_1.default.join(__dirname, 'migrations'), // Bundled: dist-electron/migrations
        path_1.default.join(process.cwd(), 'dist-electron', 'migrations'), // Development bundled
        path_1.default.join(process.cwd(), 'src', 'db', 'migrations'), // Development source
        path_1.default.join(process.resourcesPath || '', 'migrations'), // Production
    ];
    let migrationsDir = '';
    for (const dir of possiblePaths) {
        if (fs_1.default.existsSync(dir)) {
            migrationsDir = dir;
            break;
        }
    }
    if (!migrationsDir) {
        throw new Error('Migrations directory not found! Searched paths: ' + possiblePaths.join(', '));
    }
    try {
        ensureMigrationsTable();
        // Get list of migration files
        const migrationFiles = fs_1.default
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();
        // Get already applied migrations
        const appliedMigrations = db
            .prepare('SELECT name, checksum FROM migrations WHERE status = ?')
            .all('applied')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((row) => ({
            name: row.name,
            checksum: row.checksum,
        }));
        const appliedNames = appliedMigrations.map((m) => m.name);
        // Run pending migrations
        for (const file of migrationFiles) {
            if (!appliedNames.includes(file)) {
                const migrationPath = path_1.default.join(migrationsDir, file);
                const migrationContent = fs_1.default.readFileSync(migrationPath, 'utf8');
                const checksum = calculateChecksum(migrationContent);
                const { up } = parseMigration(migrationContent);
                error_logger_1.errorLogger.logError(`Running migration: ${file}`, { type: 'info' });
                const startTime = Date.now();
                // Execute migration in a transaction
                const applyMigration = db.transaction(() => {
                    db.exec(up);
                    const duration = Date.now() - startTime;
                    db.prepare(`
            INSERT INTO migrations (name, checksum, duration_ms, status)
            VALUES (?, ?, ?, 'applied')
          `).run(file, checksum, duration);
                });
                applyMigration();
                error_logger_1.errorLogger.logError(`Migration completed: ${file} (${Date.now() - startTime}ms)`, {
                    type: 'info',
                });
            }
            else {
                // Verify checksum for already-applied migrations
                const applied = appliedMigrations.find((m) => m.name === file);
                const migrationPath = path_1.default.join(migrationsDir, file);
                const migrationContent = fs_1.default.readFileSync(migrationPath, 'utf8');
                const currentChecksum = calculateChecksum(migrationContent);
                if (applied && applied.checksum !== currentChecksum) {
                    error_logger_1.errorLogger.logError(`WARNING: Migration ${file} has been modified after being applied! ` +
                        `Original checksum: ${applied.checksum}, Current: ${currentChecksum}`, { type: 'warn' });
                }
            }
        }
        error_logger_1.errorLogger.logError('All migrations completed', { type: 'info' });
    }
    catch (error) {
        error_logger_1.errorLogger.logError(error, { context: 'run-migrations' });
        throw error;
    }
}
/**
 * Rollback a specific migration by name
 */
function rollbackMigration(migrationName) {
    const db = (0, database_1.getDb)();
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    try {
        ensureMigrationsTable();
        // Check if migration is applied
        const migration = db
            .prepare('SELECT * FROM migrations WHERE name = ? AND status = ?')
            .get(migrationName, 'applied');
        if (!migration) {
            throw new Error(`Migration ${migrationName} is not applied or already rolled back`);
        }
        const migrationPath = path_1.default.join(migrationsDir, migrationName);
        if (!fs_1.default.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        const migrationContent = fs_1.default.readFileSync(migrationPath, 'utf8');
        const { down } = parseMigration(migrationContent);
        if (!down || down.length === 0) {
            throw new Error(`Migration ${migrationName} has no DOWN section - cannot rollback`);
        }
        error_logger_1.errorLogger.logError(`Rolling back migration: ${migrationName}`, { type: 'info' });
        const startTime = Date.now();
        // Execute rollback in a transaction
        const rollback = db.transaction(() => {
            db.exec(down);
            db.prepare(`
        UPDATE migrations
        SET status = 'rolled_back'
        WHERE name = ?
      `).run(migrationName);
        });
        rollback();
        error_logger_1.errorLogger.logError(`Rollback completed: ${migrationName} (${Date.now() - startTime}ms)`, {
            type: 'info',
        });
    }
    catch (error) {
        error_logger_1.errorLogger.logError(error, { context: 'rollback-migration' });
        throw error;
    }
}
/**
 * Get migration status (applied, pending, rolled back)
 */
function getMigrationStatus() {
    const db = (0, database_1.getDb)();
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    ensureMigrationsTable();
    const migrationFiles = fs_1.default
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();
    const applied = db
        .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at ASC')
        .all('applied');
    const rolledBack = db
        .prepare('SELECT * FROM migrations WHERE status = ? ORDER BY applied_at DESC')
        .all('rolled_back');
    const appliedNames = applied.map((m) => m.name);
    const pending = migrationFiles.filter((file) => !appliedNames.includes(file));
    return { applied, pending, rolledBack };
}
/**
 * Validate migration file format
 */
function validateMigration(migrationName) {
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    const migrationPath = path_1.default.join(migrationsDir, migrationName);
    const errors = [];
    if (!fs_1.default.existsSync(migrationPath)) {
        errors.push('Migration file does not exist');
        return { valid: false, errors };
    }
    const content = fs_1.default.readFileSync(migrationPath, 'utf8');
    const { up, down } = parseMigration(content);
    if (!up || up.length === 0) {
        errors.push('Migration has no UP section');
    }
    if (!down || down.length === 0) {
        errors.push('Migration has no DOWN section (rollback not supported)');
    }
    // Check for basic SQL syntax issues
    if (up && !up.toUpperCase().includes('CREATE') && !up.toUpperCase().includes('INSERT') &&
        !up.toUpperCase().includes('ALTER') && !up.toUpperCase().includes('UPDATE')) {
        errors.push('UP section does not appear to contain valid SQL statements');
    }
    return { valid: errors.length === 0, errors };
}
// Run migrations when script is executed directly
if (require.main === module) {
    try {
        runMigrations();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
