/**
 * Path Security Utility
 *
 * Validates file paths against a whitelist to prevent unauthorized file system access.
 * Used by IPC handlers that accept file paths from the renderer process.
 */

import { resolve, normalize, sep } from 'path';
import { app } from 'electron';

/**
 * Allowed directories for file operations
 */
const ALLOWED_DIRECTORIES = [
  // User data directory (app settings, databases, logs)
  app.getPath('userData'),

  // Documents directory (user's documents folder)
  app.getPath('documents'),

  // Downloads directory (for exports, backups)
  app.getPath('downloads'),

  // Temp directory (for temporary files)
  app.getPath('temp'),
];

/**
 * Validate that a file path is within allowed directories
 *
 * @param filePath - The file path to validate
 * @returns True if path is allowed, false otherwise
 *
 * @example
 * ```ts
 * if (!isPathAllowed('/etc/passwd')) {
 *   throw new Error('Access denied: Path outside allowed directories');
 * }
 * ```
 */
export function isPathAllowed(filePath: string): boolean {
  try {
    // Normalize and resolve to absolute path
    const absolutePath = normalize(resolve(filePath));

    // Check if path starts with any allowed directory
    return ALLOWED_DIRECTORIES.some(allowedDir => {
      const normalizedAllowedDir = normalize(resolve(allowedDir));

      // Ensure we're checking directory boundaries (not just string prefix)
      return absolutePath === normalizedAllowedDir ||
             absolutePath.startsWith(normalizedAllowedDir + sep);
    });
  } catch (_error) {
    // If path resolution fails, deny access
    return false;
  }
}

/**
 * Validate path or throw error
 *
 * @param filePath - The file path to validate
 * @throws Error if path is not allowed
 *
 * @example
 * ```ts
 * validatePathOrThrow(backupPath); // Throws if path not allowed
 * // Proceed with file operation
 * ```
 */
export function validatePathOrThrow(filePath: string): void {
  if (!isPathAllowed(filePath)) {
    throw new Error(
      `Access denied: Path "${filePath}" is outside allowed directories. ` +
      `Allowed directories: ${ALLOWED_DIRECTORIES.join(', ')}`
    );
  }
}

/**
 * Get list of allowed directories
 *
 * @returns Array of allowed directory paths
 */
export function getAllowedDirectories(): string[] {
  return [...ALLOWED_DIRECTORIES];
}

/**
 * Add a custom allowed directory (use with caution)
 *
 * @param directory - Directory path to allow
 *
 * @example
 * ```ts
 * // Allow project-specific directory
 * addAllowedDirectory('/path/to/project/exports');
 * ```
 */
export function addAllowedDirectory(directory: string): void {
  const normalizedDir = normalize(resolve(directory));

  if (!ALLOWED_DIRECTORIES.includes(normalizedDir)) {
    ALLOWED_DIRECTORIES.push(normalizedDir);
  }
}
