import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';
import { ConsentRepository } from '../repositories/ConsentRepository.ts';
import { AuditLogger } from './AuditLogger.ts';
import type { ConsentType, Consent } from '../domains/settings/entities/Consent.ts';
import type { IConsentRepository, IAuditLogger } from '../shared/infrastructure/di/interfaces.ts';

/**
 * Service for managing GDPR consent
 *
 * Features:
 * - Grant consent for data processing activities
 * - Revoke consent (GDPR Article 7.3)
 * - Check active consent status
 * - Privacy policy version tracking
 * - Comprehensive audit logging
 *
 * Consent Types:
 * - data_processing: Required for app to function (legal basis for processing)
 * - encryption: Consent to encrypt sensitive data at rest
 * - ai_processing: Consent to use AI features (optional)
 * - marketing: Consent to receive marketing communications (optional)
 */
@injectable()
export class ConsentService {
  private readonly CURRENT_PRIVACY_VERSION = '1.0';

  constructor(
    @inject(TYPES.ConsentRepository) private consentRepository: IConsentRepository,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger
  ) {}

  /**
   * Grant consent for specific type
   */
  grantConsent(userId: number, consentType: ConsentType): Consent {
    const consent = this.consentRepository.create({
      userId,
      consentType,
      granted: true,
      grantedAt: new Date().toISOString(),
      version: this.CURRENT_PRIVACY_VERSION,
    });

    this.auditLogger?.log({
      eventType: 'consent.granted',
      userId: userId.toString(),
      resourceType: 'consent',
      resourceId: consent.id.toString(),
      action: 'create',
      success: true,
      details: {
        consentType,
        version: this.CURRENT_PRIVACY_VERSION,
      },
    });

    return consent;
  }

  /**
   * Revoke consent (GDPR Article 7.3 - Right to withdraw consent)
   */
  revokeConsent(userId: number, consentType: ConsentType): void {
    const consent = this.consentRepository.findActiveConsent(userId, consentType);

    if (consent) {
      this.consentRepository.revoke(consent.id);

      this.auditLogger?.log({
        eventType: 'consent.revoked',
        userId: userId.toString(),
        resourceType: 'consent',
        resourceId: consent.id.toString(),
        action: 'update',
        success: true,
        details: { consentType },
      });
    }
  }

  /**
   * Check if user has active consent for a specific type
   */
  hasConsent(userId: number, consentType: ConsentType): boolean {
    const consent = this.consentRepository.findActiveConsent(userId, consentType);
    return consent !== null && consent.granted === true && consent.revokedAt === null;
  }

  /**
   * Get all consents for user (for privacy dashboard)
   */
  getUserConsents(userId: number): Consent[] {
    return this.consentRepository.listByUser(userId);
  }

  /**
   * Check if user has granted all required consents
   * Required: data_processing
   */
  hasRequiredConsents(userId: number): boolean {
    return this.hasConsent(userId, 'data_processing');
  }

  /**
   * Grant all consents (convenience method for onboarding)
   */
  grantAllConsents(userId: number): void {
    const consentTypes: ConsentType[] = [
      'data_processing',
      'encryption',
      'ai_processing',
      'marketing',
    ];

    for (const type of consentTypes) {
      // Only grant if not already granted
      if (!this.hasConsent(userId, type)) {
        this.grantConsent(userId, type);
      }
    }
  }

  /**
   * Revoke all consents (for account deletion or privacy reasons)
   */
  revokeAllConsents(userId: number): void {
    const consents = this.consentRepository.listByUser(userId);

    for (const consent of consents) {
      if (!consent.revokedAt) {
        this.consentRepository.revoke(consent.id);
      }
    }

    this.auditLogger?.log({
      eventType: 'consent.revoked',
      userId: userId.toString(),
      resourceType: 'consent',
      resourceId: 'all',
      action: 'update',
      success: true,
      details: { reason: 'All consents revoked' },
    });
  }
}
