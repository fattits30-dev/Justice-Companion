import { z } from "zod";

/**
 * Cursor-based pagination parameters
 *
 * Cursor approach chosen over offset for:
 * - Better performance with encrypted data
 * - Consistent results during concurrent updates
 * - Natural fit with SQLite rowid indexing
 */
export interface PaginationParams {
  /** Number of items per page (max 100) */
  limit: number;

  /**
   * Opaque cursor for next page
   * Format: base64(rowid:timestamp) for consistency
   */
  cursor?: string;

  /**
   * Sort direction (affects cursor navigation)
   * Default: 'desc' (newest first)
   */
  direction?: "asc" | "desc";
}

/**
 * Paginated result wrapper
 * Generic type T represents the decrypted domain model
 */
export interface PaginatedResult<T> {
  /** Current page items (already decrypted) */
  items: T[];

  /** Total count across all pages (expensive, optional) */
  totalCount?: number;

  /** Number of items returned in current page */
  totalReturned: number;

  /** Cursor for next page (undefined if last page) */
  nextCursor?: string;

  /** Cursor for previous page (undefined if first page) */
  prevCursor?: string;

  /** Fast check without counting all rows */
  hasMore: boolean;

  /** Page size used for this query */
  pageSize: number;
}

/**
 * Zod schema for runtime validation
 * Enforces OWASP input validation requirements
 */
export const PaginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type ValidatedPaginationParams = z.infer<typeof PaginationParamsSchema>;
