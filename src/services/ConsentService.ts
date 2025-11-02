import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';
import type { ConsentType, Consent } from '../domains/settings/entities/Consent.ts';
import type { IConsentRepository } from '../shared/infrastructure/di/repository-interfaces.ts';
import type { IAuditLogger } from '../shared/infrastructure/di/service-interfaces.ts';

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
  hasActiveConsent(userId: number, consentType: ConsentType): boolean {
    return this.consentRepository.hasActiveConsent(userId, consentType);
  }

  /**
   * Get all active consents for a user
   */
  getActiveConsents(userId: number): Consent[] {
    return this.consentRepository.getActiveConsents(userId);
  }
}