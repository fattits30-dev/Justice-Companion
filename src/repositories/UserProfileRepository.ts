import { getDb } from '../db/database';
import type { UserProfile, UpdateUserProfileInput } from '../models/UserProfile';
import { EncryptionService, type EncryptedData } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';
import { errorLogger } from '../utils/error-logger';

/**
 * Repository for managing user profile with encryption for PII
 *
 * Security:
 * - name and email fields encrypted using AES-256-GCM (P0 priority)
 * - Audit logging for profile access and updates
 * - GDPR Article 32 compliance for personal data
 * - Backward compatibility with legacy plaintext data
 */
export class UserProfileRepository {
  private encryptionService?: EncryptionService;
  private auditLogger?: AuditLogger;

  /**
   * Get the user profile (always ID = 1)
   */
  get(): UserProfile {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT id, name, email, avatar_url as avatarUrl,
               created_at as createdAt, updated_at as updatedAt
        FROM user_profile
        WHERE id = 1
      `);

      const profile = stmt.get() as UserProfile | undefined;

      // Should never happen (default inserted in migration)
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Decrypt PII fields after SELECT
      const originalName = profile.name;
      const originalEmail = profile.email;

      profile.name = this.decryptField(profile.name) ?? 'Legal User';
      profile.email = this.decryptField(profile.email);

      // Audit: PII accessed (encrypted name/email fields)
      const piiAccessed =
        (originalName && profile.name !== originalName) ||
        (originalEmail && profile.email !== originalEmail);

      if (piiAccessed) {
        this.auditLogger?.log({
          eventType: 'profile.pii_access',
          resourceType: 'profile',
          resourceId: '1',
          action: 'read',
          details: {
            fieldsAccessed: ['name', 'email'],
            encrypted: true,
          },
          success: true,
        });
      }

      return profile;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileRepository.get',
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  update(input: UpdateUserProfileInput): UserProfile {
    const db = getDb();

    try {
      const encryption = this.requireEncryptionService();
      const updates: string[] = [];
      const params: Record<string, unknown> = {};

      if (input.name !== undefined) {
        updates.push('name = @name');
        if (input.name && input.name.trim().length > 0) {
          const encryptedName = encryption.encrypt(input.name);
          params.name = encryptedName ? JSON.stringify(encryptedName) : null;
        } else {
          params.name = null;
        }
      }

      if (input.email !== undefined) {
        updates.push('email = @email');
        if (input.email === null) {
          params.email = null;
        } else if (input.email && input.email.trim().length > 0) {
          const encryptedEmail = encryption.encrypt(input.email);
          params.email = encryptedEmail ? JSON.stringify(encryptedEmail) : null;
        } else {
          params.email = null;
        }
      }

      if (input.avatarUrl !== undefined) {
        updates.push('avatar_url = @avatarUrl');
        params.avatarUrl = input.avatarUrl;
      }

      if (updates.length === 0) {
        return this.get();
      }

      const stmt = db.prepare(`
        UPDATE user_profile
        SET ${updates.join(', ')}
        WHERE id = 1
      `);

      stmt.run(params);

      // Audit: Profile updated
      this.auditLogger?.log({
        eventType: 'profile.update',
        resourceType: 'profile',
        resourceId: '1',
        action: 'update',
        details: {
          fieldsUpdated: Object.keys(input),
        },
        success: true,
      });

      return this.get();
    } catch (error) {
      // Audit: Failed update
      this.auditLogger?.log({
        eventType: 'profile.update',
        resourceType: 'profile',
        resourceId: '1',
        action: 'update',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      errorLogger.logError(error as Error, {
        context: 'UserProfileRepository.update',
      });
      throw error;
    }
  }

  /**
   * Decrypt field with backward compatibility
   * @param storedValue - Encrypted JSON string or legacy plaintext
   * @returns Decrypted plaintext or null
   */
  private decryptField(storedValue: string | null | undefined): string | null {
    if (!storedValue) {
      return null;
    }

    // If no encryption service, return as-is (backward compatibility)
    if (!this.encryptionService) {
      return storedValue;
    }

    try {
      // Try to parse as encrypted data
      const encryptedData = JSON.parse(storedValue) as EncryptedData;

      // Verify it's actually encrypted data format
      if (this.encryptionService.isEncrypted(encryptedData)) {
        return this.encryptionService.decrypt(encryptedData);
      }

      // If it's not encrypted format, treat as legacy plaintext
      return storedValue;
    } catch (_error) {
      // JSON parse failed - likely legacy plaintext data
      return storedValue;
    }
  }

  /**
   * Set encryption service (for dependency injection)
   */
  setEncryptionService(service: EncryptionService): void {
    this.encryptionService = service;
  }

  /**
   * Set audit logger (for dependency injection)
   */
  setAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;
  }

  private requireEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      throw new Error('EncryptionService not configured for UserProfileRepository');
    }
    return this.encryptionService;
  }
}

export const userProfileRepository = new UserProfileRepository();
