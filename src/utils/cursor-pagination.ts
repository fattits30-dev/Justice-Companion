/**
 * Cursor-Based Pagination Utilities for Justice Companion
 *
 * Provides type-safe cursor encoding/decoding for efficient pagination
 * across SQLite repositories with better-sqlite3.
 *
 * Cursor Types:
 * - Simple rowid-based: For default ORDER BY rowid DESC queries
 * - Composite: For complex ordering (e.g., ORDER BY createdAt DESC, id ASC)
 *
 * Benefits over offset-based pagination:
 * - Consistent results during concurrent data changes
 * - No skipped or duplicated rows
 * - Better performance (no OFFSET scanning)
 * - Natural fit with SQLite rowid indexing
 *
 * @see https://use-the-index-luke.com/no-offset for details
 */

/**
 * Simple cursor for rowid-based pagination
 */
export interface SimpleCursor {
  /** SQLite rowid (implicit primary key) */
  rowid: number;
  /** Optional timestamp for staleness detection */
  timestamp?: number;
}

/**
 * Composite cursor for complex ordering
 *
 * @example
 * // ORDER BY event_date DESC, id ASC
 * const cursor: CompositeCursor = {
 *   keys: { eventDate: '2025-10-20', id: 123 },
 *   timestamp: Date.now()
 * };
 */
export interface CompositeCursor {
  /** Cursor keys matching ORDER BY columns */
  keys: Record<string, string | number | null>;
  /** Optional timestamp for staleness detection */
  timestamp?: number;
}

/**
 * Union type for all cursor types
 */
export type Cursor = SimpleCursor | CompositeCursor;

/**
 * Cursor encoding/decoding errors
 */
export class CursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CursorError";
  }
}

/**
 * Maximum cursor age in milliseconds (5 minutes)
 * Prevents using stale cursors when data has changed significantly
 */
export const MAX_CURSOR_AGE_MS = 5 * 60 * 1000;

/**
 * Encode a simple rowid-based cursor to base64 string
 *
 * @param rowid - SQLite rowid
 * @param timestamp - Optional timestamp (defaults to Date.now())
 * @returns Base64-encoded cursor string
 *
 * @example
 * const cursor = encodeSimpleCursor(123);
 * // Returns: "eyJyb3dpZCI6MTIzLCJ0aW1lc3RhbXAiOjE3MzQ3MTI4MDB9"
 */
export function encodeSimpleCursor(rowid: number, timestamp?: number): string {
  if (!Number.isInteger(rowid) || rowid < 1) {
    throw new CursorError(`Invalid rowid: ${rowid}. Must be positive integer.`);
  }

  const cursor: SimpleCursor = {
    rowid,
    timestamp: timestamp ?? Date.now(),
  };

  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * Decode a simple rowid-based cursor from base64 string
 *
 * @param encoded - Base64-encoded cursor
 * @param options - Decoding options
 * @returns Decoded simple cursor
 * @throws CursorError if cursor is invalid or stale
 *
 * @example
 * const cursor = decodeSimpleCursor("eyJyb3dpZCI6MTIz...");
 * logger.info(cursor.rowid); // 123
 */
export function decodeSimpleCursor(
  encoded: string,
  options?: {
    /** Check if cursor is older than MAX_CURSOR_AGE_MS */
    validateAge?: boolean;
  },
): SimpleCursor {
  if (!encoded || encoded.length === 0) {
    throw new CursorError("Empty cursor string");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch (error) {
    throw new CursorError(
      `Invalid base64 encoding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  let cursor: unknown;
  try {
    cursor = JSON.parse(decoded);
  } catch (error) {
    // Backward compatibility: Try parsing old format "rowid:timestamp"
    const parts = decoded.split(":");
    if (parts.length === 2) {
      const rowid = parseInt(parts[0], 10);
      const timestamp = parseInt(parts[1], 10);
      if (Number.isInteger(rowid) && Number.isInteger(timestamp)) {
        cursor = { rowid, timestamp };
      } else {
        throw new CursorError(`Invalid cursor format: ${decoded}`);
      }
    } else {
      throw new CursorError(
        `Invalid JSON in cursor: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Type guard: Validate SimpleCursor structure
  if (!isSimpleCursor(cursor)) {
    throw new CursorError(
      `Invalid cursor structure: ${JSON.stringify(cursor)}`,
    );
  }

  // Optional: Validate cursor age
  if (options?.validateAge && cursor.timestamp) {
    const age = Date.now() - cursor.timestamp;
    if (age > MAX_CURSOR_AGE_MS) {
      throw new CursorError(
        `Cursor expired (age: ${Math.floor(age / 1000)}s, max: ${MAX_CURSOR_AGE_MS / 1000}s)`,
      );
    }
  }

  return cursor;
}

/**
 * Encode a composite cursor for complex ordering
 *
 * @param keys - Column values matching ORDER BY clause
 * @param timestamp - Optional timestamp (defaults to Date.now())
 * @returns Base64-encoded cursor string
 *
 * @example
 * // For: ORDER BY event_date DESC, id ASC
 * const cursor = encodeCompositeCursor({ eventDate: '2025-10-20', id: 123 });
 */
export function encodeCompositeCursor(
  keys: Record<string, string | number | null>,
  timestamp?: number,
): string {
  if (Object.keys(keys).length === 0) {
    throw new CursorError("Composite cursor keys cannot be empty");
  }

  const cursor: CompositeCursor = {
    keys,
    timestamp: timestamp ?? Date.now(),
  };

  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * Decode a composite cursor from base64 string
 *
 * @param encoded - Base64-encoded cursor
 * @param options - Decoding options
 * @returns Decoded composite cursor
 * @throws CursorError if cursor is invalid or stale
 *
 * @example
 * const cursor = decodeCompositeCursor("eyJrZXlzIjp7ImV2ZW50RGF0ZSI6IjIwMjUtMTAtMjAifX0=");
 * logger.info(cursor.keys.eventDate); // '2025-10-20'
 */
export function decodeCompositeCursor(
  encoded: string,
  options?: {
    /** Check if cursor is older than MAX_CURSOR_AGE_MS */
    validateAge?: boolean;
  },
): CompositeCursor {
  if (!encoded || encoded.length === 0) {
    throw new CursorError("Empty cursor string");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch (error) {
    throw new CursorError(
      `Invalid base64 encoding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  let cursor: unknown;
  try {
    cursor = JSON.parse(decoded);
  } catch (error) {
    throw new CursorError(
      `Invalid JSON in cursor: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Type guard: Validate CompositeCursor structure
  if (!isCompositeCursor(cursor)) {
    throw new CursorError(
      `Invalid composite cursor structure: ${JSON.stringify(cursor)}`,
    );
  }

  // Optional: Validate cursor age
  if (options?.validateAge && cursor.timestamp) {
    const age = Date.now() - cursor.timestamp;
    if (age > MAX_CURSOR_AGE_MS) {
      throw new CursorError(
        `Cursor expired (age: ${Math.floor(age / 1000)}s, max: ${MAX_CURSOR_AGE_MS / 1000}s)`,
      );
    }
  }

  return cursor;
}

/**
 * Type guard: Check if value is a SimpleCursor
 */
export function isSimpleCursor(value: unknown): value is SimpleCursor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cursor = value as Record<string, unknown>;

  // Must have rowid
  if (
    typeof cursor.rowid !== "number" ||
    !Number.isInteger(cursor.rowid) ||
    cursor.rowid < 1
  ) {
    return false;
  }

  // Optional timestamp
  if (cursor.timestamp !== undefined) {
    if (
      typeof cursor.timestamp !== "number" ||
      !Number.isInteger(cursor.timestamp)
    ) {
      return false;
    }
  }

  // No extra properties (strict validation)
  const allowedKeys = ["rowid", "timestamp"];
  const actualKeys = Object.keys(cursor);
  const extraKeys = actualKeys.filter((key) => !allowedKeys.includes(key));
  if (extraKeys.length > 0) {
    return false;
  }

  return true;
}

/**
 * Type guard: Check if value is a CompositeCursor
 */
export function isCompositeCursor(value: unknown): value is CompositeCursor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cursor = value as Record<string, unknown>;

  // Must have keys object
  if (
    typeof cursor.keys !== "object" ||
    cursor.keys === null ||
    Array.isArray(cursor.keys)
  ) {
    return false;
  }

  const keys = cursor.keys as Record<string, unknown>;
  if (Object.keys(keys).length === 0) {
    return false;
  }

  // Validate key values: must be string, number, or null
  for (const value of Object.values(keys)) {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      value !== null
    ) {
      return false;
    }
  }

  // Optional timestamp
  if (cursor.timestamp !== undefined) {
    if (
      typeof cursor.timestamp !== "number" ||
      !Number.isInteger(cursor.timestamp)
    ) {
      return false;
    }
  }

  // No extra properties (strict validation)
  const allowedKeys = ["keys", "timestamp"];
  const actualKeys = Object.keys(cursor);
  const extraKeys = actualKeys.filter((key) => !allowedKeys.includes(key));
  if (extraKeys.length > 0) {
    return false;
  }

  return true;
}

/**
 * Build WHERE clause for simple cursor pagination
 *
 * @param cursor - Decoded simple cursor
 * @param direction - Pagination direction ('asc' or 'desc')
 * @returns SQL WHERE clause fragment
 *
 * @example
 * const whereClause = buildSimpleWhereClause({ rowid: 123 }, 'desc');
 * // Returns: "rowid < 123"
 */
export function buildSimpleWhereClause(
  cursor: SimpleCursor,
  direction: "asc" | "desc",
): { clause: string; params: number[] } {
  const comparator = direction === "asc" ? ">" : "<";

  return {
    clause: `rowid ${comparator} ?`,
    params: [cursor.rowid],
  };
}

/**
 * Build WHERE clause for composite cursor pagination
 *
 * Generates SQL for complex ordering scenarios using the "row value comparison" pattern.
 *
 * @param cursor - Decoded composite cursor
 * @param columns - Column names in ORDER BY order
 * @param direction - Pagination direction ('asc' or 'desc')
 * @returns SQL WHERE clause fragment
 *
 * @example
 * // For: ORDER BY event_date DESC, id ASC
 * const cursor = { keys: { eventDate: '2025-10-20', id: 123 } };
 * const { clause, params } = buildCompositeWhereClause(cursor, ['event_date', 'id'], 'desc');
 * // Returns:
 * // clause: "(event_date < ? OR (event_date = ? AND id > ?))"
 * // params: ['2025-10-20', '2025-10-20', 123]
 */
export function buildCompositeWhereClause(
  cursor: CompositeCursor,
  columns: string[],
  direction: "asc" | "desc",
): { clause: string; params: (string | number | null)[] } {
  if (columns.length === 0) {
    throw new CursorError("Columns array cannot be empty");
  }

  // Validate that cursor has all required keys
  const cursorKeys = Object.keys(cursor.keys);
  const missingKeys = columns.filter((col) => !cursorKeys.includes(col));
  if (missingKeys.length > 0) {
    throw new CursorError(`Cursor missing keys: ${missingKeys.join(", ")}`);
  }

  const comparator = direction === "asc" ? ">" : "<";
  const equalComparator = direction === "asc" ? ">" : "<";

  // Build WHERE clause using row value comparison pattern
  // E.g., for ORDER BY date DESC, id ASC:
  // (date < ? OR (date = ? AND id > ?))

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  // First column: simple comparison
  conditions.push(`${columns[0]} ${comparator} ?`);
  params.push(cursor.keys[columns[0]]);

  // Subsequent columns: equality chain + comparison
  if (columns.length > 1) {
    for (let i = 1; i < columns.length; i++) {
      const equalityChain = columns
        .slice(0, i)
        .map((col) => {
          params.push(cursor.keys[col]);
          return `${col} = ?`;
        })
        .join(" AND ");

      params.push(cursor.keys[columns[i]]);
      conditions.push(
        `(${equalityChain} AND ${columns[i]} ${equalComparator} ?)`,
      );
    }
  }

  const clause =
    conditions.length === 1 ? conditions[0] : `(${conditions.join(" OR ")})`;

  return { clause, params };
}

/**
 * Reverse pagination direction for "Previous Page" button
 *
 * @param direction - Current direction
 * @returns Opposite direction
 *
 * @example
 * const prevDirection = reverseDirection('desc'); // 'asc'
 */
export function reverseDirection(direction: "asc" | "desc"): "asc" | "desc" {
  return direction === "asc" ? "desc" : "asc";
}

/**
 * Extract cursor from paginated result for "Previous Page" navigation
 *
 * @param items - Current page items
 * @param getRowid - Function to extract rowid from item
 * @param direction - Current pagination direction
 * @returns Cursor for previous page
 *
 * @example
 * const prevCursor = getPrevCursor(items, item => item.id, 'desc');
 */
export function getPrevCursor<T>(
  items: T[],
  getRowid: (item: T) => number,
  _direction: "asc" | "desc",
): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  // For "previous page", use the first item's rowid
  const firstItem = items[0];
  const rowid = getRowid(firstItem);

  return encodeSimpleCursor(rowid);
}

/**
 * Extract cursor from paginated result for "Next Page" navigation
 *
 * @param items - Current page items
 * @param getRowid - Function to extract rowid from item
 * @param direction - Current pagination direction
 * @returns Cursor for next page
 *
 * @example
 * const nextCursor = getNextCursor(items, item => item.id, 'desc');
 */
export function getNextCursor<T>(
  items: T[],
  getRowid: (item: T) => number,
  _direction: "asc" | "desc",
): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  // For "next page", use the last item's rowid
  const lastItem = items[items.length - 1];
  const rowid = getRowid(lastItem);

  return encodeSimpleCursor(rowid);
}

/**
 * Utility: Check if cursor is stale (older than MAX_CURSOR_AGE_MS)
 *
 * @param cursor - Decoded cursor
 * @returns True if cursor is stale
 */
export function isCursorStale(cursor: SimpleCursor | CompositeCursor): boolean {
  if (!cursor.timestamp) {
    return false; // No timestamp, assume fresh
  }

  const age = Date.now() - cursor.timestamp;
  return age > MAX_CURSOR_AGE_MS;
}

/**
 * Utility: Get cursor age in seconds
 *
 * @param cursor - Decoded cursor
 * @returns Age in seconds, or null if no timestamp
 */
export function getCursorAge(
  cursor: SimpleCursor | CompositeCursor,
): number | null {
  if (!cursor.timestamp) {
    return null;
  }

  return Math.floor((Date.now() - cursor.timestamp) / 1000);
}
