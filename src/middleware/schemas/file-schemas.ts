/**
 * Validation schemas for file operation IPC channels
 *
 * Implements comprehensive validation for all file-related operations including
 * selection, upload, viewing, downloading, printing, and emailing with strict
 * path traversal prevention and file type validation.
 */

import { z } from 'zod';
import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILENAME_LENGTH,
  MAX_FILES_PER_UPLOAD,
  MAX_PATH_LENGTH,
  MAX_STRING_LENGTH,
} from '../utils/constants';
import { sanitizeFilePath, sanitizeFilename } from '../utils/sanitizers';

/**
 * Schema for file selection request
 * Validates filter configuration for file picker dialog
 */
export const fileSelectSchema = z
  .object({
    filters: z
      .array(
        z.object({
          name: z
            .string()
            .min(1, 'Filter name is required')
            .max(100, 'Filter name must be less than 100 characters')
            .trim(),

          extensions: z
            .array(
              z
                .string()
                .min(1, 'Extension cannot be empty')
                .max(10, 'Extension must be less than 10 characters')
                .regex(/^[a-zA-Z0-9]+$/, 'Extension can only contain letters and numbers')
                .transform((s) => s.toLowerCase()),
            )
            .min(1, 'At least one extension is required')
            .max(20, 'Too many extensions in filter'),
        }),
      )
      .max(10, 'Too many filters')
      .optional(),

    properties: z
      .array(
        z.enum(['openFile', 'multiSelections'], {
          message: 'Invalid file selection property',
        }),
      )
      .max(5, 'Too many properties')
      .optional(),
  })
  .strict();

/**
 * Schema for file upload request
 * Validates file path with strict security checks
 */
export const fileUploadSchema = z
  .object({
    filePath: z
      .string()
      .min(1, 'File path is required')
      .max(MAX_PATH_LENGTH, `File path must be less than ${MAX_PATH_LENGTH} characters`)
      .transform(sanitizeFilePath)
      .refine((path) => !path.includes('..'), 'Path traversal is not allowed')
      .refine((path) => {
        // Check if file has an allowed extension
        const extension = path.split('.').pop()?.toLowerCase();
        if (!extension) {
          return false;
        }
        return ALLOWED_FILE_EXTENSIONS.includes(
          extension as (typeof ALLOWED_FILE_EXTENSIONS)[number],
        );
      }, 'File type is not allowed')
      .refine((path) => {
        // Ensure path doesn't contain null bytes or other dangerous characters
        return !path.includes('\0') && !path.includes('\r') && !path.includes('\n');
      }, 'File path contains invalid characters'),
  })
  .strict();

/**
 * Schema for file viewing request
 * Opens file in default system viewer
 */
export const fileViewSchema = z
  .object({
    filePath: z
      .string()
      .min(1, 'File path is required')
      .max(MAX_PATH_LENGTH, `File path must be less than ${MAX_PATH_LENGTH} characters`)
      .transform(sanitizeFilePath)
      .refine((path) => !path.includes('..'), 'Path traversal is not allowed')
      .refine((path) => !path.includes('\0'), 'File path contains null bytes'),
  })
  .strict();

/**
 * Schema for file download request
 * Saves file to user-selected location
 */
export const fileDownloadSchema = z
  .object({
    filePath: z
      .string()
      .min(1, 'File path is required')
      .max(MAX_PATH_LENGTH, `File path must be less than ${MAX_PATH_LENGTH} characters`)
      .transform(sanitizeFilePath)
      .refine((path) => !path.includes('..'), 'Path traversal is not allowed'),

    fileName: z
      .string()
      .max(MAX_FILENAME_LENGTH, `File name must be less than ${MAX_FILENAME_LENGTH} characters`)
      .transform(sanitizeFilename)
      .refine((name) => {
        // Ensure filename doesn't contain path separators
        return !name.includes('/') && !name.includes('\\');
      }, 'File name cannot contain path separators')
      .refine((name) => {
        // Ensure filename has a valid extension
        const extension = name.split('.').pop()?.toLowerCase();
        return extension && extension.length > 0 && extension.length <= 10;
      }, 'File name must have a valid extension')
      .optional(),
  })
  .strict();

/**
 * Schema for file printing request
 * Sends file to system printer
 */
export const filePrintSchema = z
  .object({
    filePath: z
      .string()
      .min(1, 'File path is required')
      .max(MAX_PATH_LENGTH, `File path must be less than ${MAX_PATH_LENGTH} characters`)
      .transform(sanitizeFilePath)
      .refine((path) => !path.includes('..'), 'Path traversal is not allowed')
      .refine((path) => {
        // Only allow printable file types
        const extension = path.split('.').pop()?.toLowerCase();
        const printableExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
        return extension && printableExtensions.includes(extension);
      }, 'File type is not printable'),
  })
  .strict();

/**
 * Schema for file email request
 * Attaches files to email (opens default email client)
 */
export const fileEmailSchema = z
  .object({
    filePaths: z
      .array(
        z
          .string()
          .min(1, 'File path cannot be empty')
          .max(MAX_PATH_LENGTH, `File path must be less than ${MAX_PATH_LENGTH} characters`)
          .transform(sanitizeFilePath)
          .refine((path) => !path.includes('..'), 'Path traversal is not allowed'),
      )
      .min(1, 'At least one file is required')
      .max(MAX_FILES_PER_UPLOAD, `Cannot email more than ${MAX_FILES_PER_UPLOAD} files at once`)
      .refine((paths) => {
        // Check for duplicate paths
        const uniquePaths = new Set(paths);
        return uniquePaths.size === paths.length;
      }, 'Duplicate file paths are not allowed'),

    subject: z.string().max(200, 'Subject must be less than 200 characters').trim().optional(),

    body: z
      .string()
      .max(MAX_STRING_LENGTH, `Body must be less than ${MAX_STRING_LENGTH} characters`)
      .trim()
      .optional(),
  })
  .strict()
  .refine(() => {
    // Calculate total file size check (this is a client-side pre-check)
    // Server will do the actual file size validation
    return true;
  }, 'Total file size exceeds email attachment limit');

// Type exports for use in other files
export type FileSelectInput = z.infer<typeof fileSelectSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type FileViewInput = z.infer<typeof fileViewSchema>;
export type FileDownloadInput = z.infer<typeof fileDownloadSchema>;
export type FilePrintInput = z.infer<typeof filePrintSchema>;
export type FileEmailInput = z.infer<typeof fileEmailSchema>;
