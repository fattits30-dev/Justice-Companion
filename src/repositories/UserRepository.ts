import { getDb } from '../db/database';
import type { User, CreateUserInput, UpdateUserInput } from '../models/User';
import type { AuditLogger } from '../services/AuditLogger';

/**
 * Repository for managing users
 * Handles user CRUD operations and password management
 *
 * Security:
 * - Passwords stored as salted hashes (never plaintext)
 * - Audit logging for all user operations
 * - Email uniqueness enforced at database level
 */
export class UserRepository {
  constructor(private auditLogger?: AuditLogger) {}

  /**
   * Create a new user
   */
  create(input: CreateUserInput): User {
    try {
      const db = getDb();

      const stmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, password_salt, role)
        VALUES (@username, @email, @passwordHash, @passwordSalt, @role)
      `);

      const result = stmt.run({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        passwordSalt: input.passwordSalt,
        role: input.role ?? 'user',
      });

      const createdUser = this.findById(result.lastInsertRowid as number)!;

      // Audit: User created
      this.auditLogger?.log({
        eventType: 'user.create',
        userId: createdUser.id.toString(),
        resourceType: 'user',
        resourceId: createdUser.id.toString(),
        action: 'create',
        details: {
          username: createdUser.username,
          email: createdUser.email,
          role: createdUser.role,
        },
        success: true,
      });

      return createdUser;
    } catch (error) {
      // Audit: Failed creation
      this.auditLogger?.log({
        eventType: 'user.create',
        userId: undefined,
        resourceType: 'user',
        resourceId: 'unknown',
        action: 'create',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  findById(id: number): User | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        username,
        email,
        password_hash as passwordHash,
        password_salt as passwordSalt,
        role,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt,
        last_login_at as lastLoginAt
      FROM users
      WHERE id = ?
    `);

    const row = stmt.get(id) as (Omit<User, 'isActive'> & { isActive: number }) | undefined;

    if (row) {
      return {
        ...row,
        isActive: row.isActive === 1,
      };
    }

    return null;
  }

  /**
   * Find user by username
   */
  findByUsername(username: string): User | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        username,
        email,
        password_hash as passwordHash,
        password_salt as passwordSalt,
        role,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt,
        last_login_at as lastLoginAt
      FROM users
      WHERE username = ?
    `);

    const row = stmt.get(username) as (Omit<User, 'isActive'> & { isActive: number }) | undefined;

    if (row) {
      return {
        ...row,
        isActive: row.isActive === 1,
      };
    }

    return null;
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        username,
        email,
        password_hash as passwordHash,
        password_salt as passwordSalt,
        role,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt,
        last_login_at as lastLoginAt
      FROM users
      WHERE email = ?
    `);

    const row = stmt.get(email) as (Omit<User, 'isActive'> & { isActive: number }) | undefined;

    if (row) {
      return {
        ...row,
        isActive: row.isActive === 1,
      };
    }

    return null;
  }

  /**
   * Find all users
   */
  findAll(): User[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        username,
        email,
        password_hash as passwordHash,
        password_salt as passwordSalt,
        role,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt,
        last_login_at as lastLoginAt
      FROM users
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as (Omit<User, 'isActive'> & { isActive: number })[];

    return rows.map((row) => ({
      ...row,
      isActive: row.isActive === 1,
    }));
  }

  /**
   * Update user details
   */
  update(id: number, input: UpdateUserInput): User | null {
    try {
      const db = getDb();

      const updates: string[] = [];
      const params: Record<string, unknown> = { id };

      if (input.email !== undefined) {
        updates.push('email = @email');
        params.email = input.email;
      }

      if (input.isActive !== undefined) {
        updates.push('is_active = @isActive');
        params.isActive = input.isActive ? 1 : 0;
      }

      if (input.role !== undefined) {
        updates.push('role = @role');
        params.role = input.role;
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      const stmt = db.prepare(`
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = @id
      `);

      stmt.run(params);

      const updatedUser = this.findById(id);

      // Audit: User updated
      this.auditLogger?.log({
        eventType: 'user.update',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return updatedUser;
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'user.update',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Update user password
   */
  updatePassword(id: number, passwordHash: string, passwordSalt: string): void {
    try {
      const db = getDb();

      const stmt = db.prepare(`
        UPDATE users
        SET password_hash = @passwordHash, password_salt = @passwordSalt
        WHERE id = @id
      `);

      stmt.run({
        id,
        passwordHash,
        passwordSalt,
      });

      // Audit: Password changed (don't log the hash!)
      this.auditLogger?.log({
        eventType: 'user.password_change',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'update',
        success: true,
      });
    } catch (error) {
      // Audit: Failed password change
      this.auditLogger?.log({
        eventType: 'user.password_change',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'update',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: number): void {
    const db = getDb();

    const stmt = db.prepare(`
      UPDATE users
      SET last_login_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(id);

    // Audit: Login timestamp updated
    this.auditLogger?.log({
      eventType: 'user.login_timestamp',
      userId: id.toString(),
      resourceType: 'user',
      resourceId: id.toString(),
      action: 'update',
      success: true,
    });
  }

  /**
   * Delete user
   */
  delete(id: number): boolean {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      const success = result.changes > 0;

      // Audit: User deleted
      this.auditLogger?.log({
        eventType: 'user.delete',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'delete',
        success,
      });

      return success;
    } catch (error) {
      // Audit: Failed deletion
      this.auditLogger?.log({
        eventType: 'user.delete',
        userId: id.toString(),
        resourceType: 'user',
        resourceId: id.toString(),
        action: 'delete',
        success: false,
        errorMessage: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Set audit logger (for dependency injection)
   */
  setAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;
  }

  /**
   * Normalize unknown error values into a message for logging
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return 'Unknown error';
  }
}

export const userRepository = new UserRepository();
