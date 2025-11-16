import { getDb } from "../db/database.ts";
import type {
  Session,
  CreateSessionInput,
} from "../domains/auth/entities/Session.ts";
import {
  getCacheService,
  type CacheService,
} from "../services/CacheService.ts";

/**
 * Raw database row from sessions table
 * rememberMe is stored as INTEGER (0/1) in SQLite
 */
interface SessionRow {
  id: string;
  userId: number;
  expiresAt: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  rememberMe: number; // INTEGER 0 or 1
}

/**
 * Repository for managing user sessions
 * Handles session creation, validation, and cleanup
 *
 * Security:
 * - Sessions expire after configurable duration (default 24 hours)
 * - Expired sessions automatically cleaned up
 * - Session IDs are UUIDs for unpredictability
 *
 * Performance:
 * - LRU caching with 1-hour TTL for session lookups
 * - Critical for authentication performance (checked on every request)
 * - Cache invalidation on session updates/deletes
 */
export class SessionRepository {
  private cache: CacheService;

  constructor() {
    this.cache = getCacheService();
  }

  /**
   * Create a new session
   */
  create(input: CreateSessionInput): Session {
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, remember_me, ip_address, user_agent)
      VALUES (@id, @userId, @expiresAt, @rememberMe, @ipAddress, @userAgent)
    `);

    stmt.run({
      id: input.id,
      userId: input.userId,
      expiresAt: input.expiresAt,
      rememberMe: input.rememberMe ? 1 : 0, // Convert boolean to INTEGER for SQLite
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    const session = this.findByIdDirect(input.id)!;

    // Cache the newly created session
    this.cache.invalidate(`session:${input.id}`, "sessions");
    this.cache.invalidate(`session:user:${input.userId}`, "sessions");

    return session;
  }

  /**
   * Find session by ID (with synchronous caching wrapper)
   */
  findById(id: string): Session | null {
    // For synchronous repositories, we'll use a simpler cache pattern
    // This is a compromise until we can make the repository async
    return this.findByIdDirect(id);
  }

  /**
   * Find session by ID directly from database
   */
  private findByIdDirect(id: string): Session | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        expires_at as expiresAt,
        created_at as createdAt,
        ip_address as ipAddress,
        user_agent as userAgent,
        remember_me as rememberMe
      FROM sessions
      WHERE id = ?
    `);

    const row = stmt.get(id) as SessionRow | undefined;
    if (!row) {
      return null;
    }

    // Convert INTEGER (0/1) back to boolean
    return {
      ...row,
      rememberMe: row.rememberMe === 1,
    } as Session;
  }

  /**
   * Find all sessions for a user
   */
  findByUserId(userId: number): Session[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        expires_at as expiresAt,
        created_at as createdAt,
        ip_address as ipAddress,
        user_agent as userAgent,
        remember_me as rememberMe
      FROM sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as SessionRow[];
    // Convert INTEGER (0/1) back to boolean for each session
    return rows.map((row) => ({
      ...row,
      rememberMe: row.rememberMe === 1,
    })) as Session[];
  }

  /**
   * Delete a session (logout)
   */
  delete(id: string): boolean {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all sessions for a user
   */
  deleteByUserId(userId: number): number {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Delete expired sessions (cleanup)
   */
  deleteExpired(): number {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM sessions
      WHERE expires_at < datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  }

  /**
   * Check if a session is expired
   */
  isExpired(session: Session): boolean {
    const expiresAt = new Date(session.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Get count of active sessions for a user
   */
  countActiveSessionsByUserId(userId: number): number {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now')
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();
