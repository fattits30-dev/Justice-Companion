/**
 * Validation schemas for database operation IPC channels
 *
 * Implements validation for database management operations including
 * migrations, backups, status checks, and integrity verification.
 */

import { z } from "zod";

/**
 * Schema for database migration execution
 * No parameters required - migrations run sequentially
 *
 * @example
 * ```typescript
 * {}
 * ```
 */
export const dbMigrateSchema = z
  .object({
    // No parameters needed for migration
    // Migration system handles which migrations to run automatically
  })
  .strict();

/**
 * Schema for migration rollback
 * Rolls back the most recent migration
 *
 * @example
 * ```typescript
 * {
 *   confirmation: true
 * }
 * ```
 */
export const dbMigrateRollbackSchema = z
  .object({
    confirmation: z
      .boolean()
      .refine(
        (val) => val === true,
        "Confirmation is required to rollback migration",
      )
      .describe("Must be true to confirm rollback"),

    steps: z
      .number()
      .int("Steps must be an integer")
      .positive("Steps must be positive")
      .max(10, "Cannot rollback more than 10 migrations at once")
      .default(1)
      .optional()
      .describe("Number of migrations to rollback"),
  })
  .strict();

/**
 * Schema for checking migration status
 * Returns list of applied and pending migrations
 *
 * @example
 * ```typescript
 * {}
 * ```
 */
export const dbMigrateStatusSchema = z
  .object({
    // No parameters needed
  })
  .strict();

/**
 * Schema for creating database backup
 * Backs up entire database to timestamped file
 *
 * @example
 * ```typescript
 * {
 *   includeEncryptedData: true
 * }
 * ```
 */
export const dbBackupSchema = z
  .object({
    includeEncryptedData: z
      .boolean()
      .default(true)
      .optional()
      .describe("Whether to include encrypted sensitive data in backup"),

    compression: z
      .boolean()
      .default(true)
      .optional()
      .describe("Whether to compress the backup file"),

    // Custom backup name (otherwise uses timestamp)
    name: z
      .string()
      .max(100, "Backup name must be less than 100 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Backup name can only contain letters, numbers, hyphens, and underscores",
      )
      .optional()
      .describe("Optional custom name for backup (default: timestamp)"),
  })
  .strict();

/**
 * Schema for restoring database from backup
 *
 * @example
 * ```typescript
 * {
 *   backupId: "backup_20250101_123456",
 *   confirmation: true
 * }
 * ```
 */
export const dbRestoreSchema = z
  .object({
    backupId: z
      .string()
      .min(1, "Backup ID is required")
      .max(200, "Backup ID too long")
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid backup ID format")
      .describe("Backup identifier to restore from"),

    confirmation: z
      .boolean()
      .refine(
        (val) => val === true,
        "Confirmation is required to restore database",
      )
      .describe("Must be true to confirm restore operation"),

    createBackupFirst: z
      .boolean()
      .default(true)
      .optional()
      .describe("Create backup of current database before restoring"),
  })
  .strict();

/**
 * Schema for listing available backups
 *
 * @example
 * ```typescript
 * {
 *   limit: 50
 * }
 * ```
 */
export const dbBackupListSchema = z
  .object({
    limit: z
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .max(1000, "Cannot list more than 1000 backups")
      .default(100)
      .optional()
      .describe("Maximum number of backups to list"),

    sortOrder: z
      .enum(["asc", "desc"], {
        message: "Sort order must be asc or desc",
      })
      .default("desc")
      .optional()
      .describe("Sort by creation date"),
  })
  .strict();

/**
 * Schema for deleting a backup
 *
 * @example
 * ```typescript
 * {
 *   backupId: "backup_20250101_123456",
 *   confirmation: true
 * }
 * ```
 */
export const dbBackupDeleteSchema = z
  .object({
    backupId: z
      .string()
      .min(1, "Backup ID is required")
      .max(200, "Backup ID too long")
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid backup ID format"),

    confirmation: z
      .boolean()
      .refine(
        (val) => val === true,
        "Confirmation is required to delete backup",
      )
      .describe("Must be true to confirm deletion"),
  })
  .strict();

/**
 * Schema for checking database status and health
 * Returns database statistics, size, integrity status
 *
 * @example
 * ```typescript
 * {}
 * ```
 */
export const dbStatusSchema = z
  .object({
    // No parameters needed
    includeTableStats: z
      .boolean()
      .default(true)
      .optional()
      .describe("Include per-table statistics"),

    includeIndexStats: z
      .boolean()
      .default(false)
      .optional()
      .describe("Include index usage statistics"),
  })
  .strict();

/**
 * Schema for running database integrity check
 * Validates database structure and detects corruption
 *
 * @example
 * ```typescript
 * {
 *   deep: true
 * }
 * ```
 */
export const dbIntegrityCheckSchema = z
  .object({
    deep: z
      .boolean()
      .default(false)
      .optional()
      .describe("Perform deep integrity check (slower but more thorough)"),

    autoRepair: z
      .boolean()
      .default(false)
      .optional()
      .describe("Automatically attempt to repair detected issues"),
  })
  .strict();

/**
 * Schema for optimizing database (VACUUM, ANALYZE)
 *
 * @example
 * ```typescript
 * {
 *   vacuum: true,
 *   analyze: true
 * }
 * ```
 */
export const dbOptimizeSchema = z
  .object({
    vacuum: z
      .boolean()
      .default(true)
      .optional()
      .describe("Run VACUUM to reclaim space"),

    analyze: z
      .boolean()
      .default(true)
      .optional()
      .describe("Run ANALYZE to update query planner statistics"),

    reindex: z
      .boolean()
      .default(false)
      .optional()
      .describe("Rebuild all indexes"),
  })
  .strict();

/**
 * Schema for exporting database to SQL dump
 *
 * @example
 * ```typescript
 * {
 *   includeData: true,
 *   includeSchema: true
 * }
 * ```
 */
export const dbExportSchema = z
  .object({
    includeSchema: z
      .boolean()
      .default(true)
      .optional()
      .describe("Include table schemas in export"),

    includeData: z
      .boolean()
      .default(true)
      .optional()
      .describe("Include table data in export"),

    tables: z
      .array(
        z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9_]+$/, "Invalid table name"),
      )
      .max(100, "Cannot export more than 100 tables")
      .optional()
      .describe("Specific tables to export (default: all tables)"),

    format: z
      .enum(["sql", "json", "csv"], {
        message: "Format must be sql, json, or csv",
      })
      .default("sql")
      .optional(),
  })
  .strict();

// Type exports for use in other files
export type DbMigrateInput = z.infer<typeof dbMigrateSchema>;
export type DbMigrateRollbackInput = z.infer<typeof dbMigrateRollbackSchema>;
export type DbMigrateStatusInput = z.infer<typeof dbMigrateStatusSchema>;
export type DbBackupInput = z.infer<typeof dbBackupSchema>;
export type DbRestoreInput = z.infer<typeof dbRestoreSchema>;
export type DbBackupListInput = z.infer<typeof dbBackupListSchema>;
export type DbBackupDeleteInput = z.infer<typeof dbBackupDeleteSchema>;
export type DbStatusInput = z.infer<typeof dbStatusSchema>;
export type DbIntegrityCheckInput = z.infer<typeof dbIntegrityCheckSchema>;
export type DbOptimizeInput = z.infer<typeof dbOptimizeSchema>;
export type DbExportInput = z.infer<typeof dbExportSchema>;
