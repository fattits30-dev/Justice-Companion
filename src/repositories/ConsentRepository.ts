import { getDb } from "../db/database.ts";
import type {
  Consent,
  CreateConsentInput,
  ConsentType,
} from "../domains/settings/entities/Consent.ts";

/**
 * Repository for managing GDPR consent records
 *
 * Features:
 * - Track user consent for different data processing activities
 * - Support consent withdrawal (GDPR Article 7.3)
 * - Privacy policy version tracking
 * - Audit trail via audit logger
 */
export class ConsentRepository {
  /**
   * Create a new consent record
   */
  create(input: CreateConsentInput): Consent {
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO consents (user_id, consent_type, granted, granted_at, version)
      VALUES (@userId, @consentType, @granted, @grantedAt, @version)
    `);

    const result = stmt.run({
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted ? 1 : 0,
      grantedAt: input.grantedAt ?? new Date().toISOString(),
      version: input.version,
    });

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Find consent by ID
   */
  findById(id: number): Consent | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        consent_type as consentType,
        granted,
        granted_at as grantedAt,
        revoked_at as revokedAt,
        version,
        created_at as createdAt
      FROM consents
      WHERE id = ?
    `);

    const row = stmt.get(id) as
      | (Omit<Consent, "granted"> & { granted: number })
      | undefined;

    if (row) {
      return {
        ...row,
        granted: row.granted === 1,
      };
    }

    return null;
  }

  /**
   * Find active consent for user and type
   * Returns only non-revoked consents
   */
  findActiveConsent(userId: number, consentType: ConsentType): Consent | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        consent_type as consentType,
        granted,
        granted_at as grantedAt,
        revoked_at as revokedAt,
        version,
        created_at as createdAt
      FROM consents
      WHERE user_id = ? AND consent_type = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(userId, consentType) as
      | (Omit<Consent, "granted"> & { granted: number })
      | undefined;

    if (row) {
      return {
        ...row,
        granted: row.granted === 1,
      };
    }

    return null;
  }

  /**
   * List all consents for a user
   */
  listByUser(userId: number): Consent[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        consent_type as consentType,
        granted,
        granted_at as grantedAt,
        revoked_at as revokedAt,
        version,
        created_at as createdAt
      FROM consents
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as (Omit<Consent, "granted"> & {
      granted: number;
    })[];

    return rows.map((row) => ({
      ...row,
      granted: row.granted === 1,
    }));
  }

  /**
   * Alias for listByUser() - for service compatibility
   */
  findByUserId(userId: number): Consent[] {
    return this.listByUser(userId);
  }

  /**
   * Check if user has active consent for a specific type
   * Returns boolean instead of Consent object
   */
  hasActiveConsent(userId: number, consentType: ConsentType): boolean {
    const consent = this.findActiveConsent(userId, consentType);
    return consent !== null;
  }

  /**
   * Get all active consents for a user (excluding revoked)
   */
  getActiveConsents(userId: number): Consent[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        id,
        user_id as userId,
        consent_type as consentType,
        granted,
        granted_at as grantedAt,
        revoked_at as revokedAt,
        version,
        created_at as createdAt
      FROM consents
      WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as (Omit<Consent, "granted"> & {
      granted: number;
    })[];

    return rows.map((row) => ({
      ...row,
      granted: row.granted === 1,
    }));
  }

  /**
   * Revoke a consent (GDPR Article 7.3)
   */
  revoke(id: number): Consent | null {
    const db = getDb();

    const stmt = db.prepare(`
      UPDATE consents
      SET revoked_at = datetime('now')
      WHERE id = ? AND revoked_at IS NULL
    `);

    stmt.run(id);

    return this.findById(id);
  }

  /**
   * Delete a consent record
   * Note: Normally you should revoke instead of delete for audit trail
   */
  delete(id: number): boolean {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM consents WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all consents for a user (GDPR Article 17 - Right to be forgotten)
   */
  deleteByUserId(userId: number): number {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM consents WHERE user_id = ?");
    const result = stmt.run(userId);
    return result.changes;
  }
}

export const consentRepository = new ConsentRepository();
