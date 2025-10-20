/**
 * Migration status type
 */
export type MigrationStatus = 'applied' | 'rolled_back' | 'failed';
/**
 * Migration record from database
 */
export interface MigrationRecord {
    id: number;
    name: string;
    checksum: string;
    applied_at: string;
    applied_by: string | null;
    duration_ms: number | null;
    status: MigrationStatus;
}
/**
 * Parse migration file into UP and DOWN sections
 */
export declare function parseMigration(content: string): {
    up: string;
    down: string;
};
/**
 * Run all pending migrations
 */
export declare function runMigrations(): void;
/**
 * Rollback a specific migration by name
 */
export declare function rollbackMigration(migrationName: string): void;
/**
 * Get migration status (applied, pending, rolled back)
 */
export declare function getMigrationStatus(): {
    applied: MigrationRecord[];
    pending: string[];
    rolledBack: MigrationRecord[];
};
/**
 * Validate migration file format
 */
export declare function validateMigration(migrationName: string): {
    valid: boolean;
    errors: string[];
};
