import type {
  ConsentType,
  Consent,
} from "../domains/settings/entities/Consent.ts";
import type { ConsentRepository } from "../repositories/ConsentRepository.ts";
import type { AuditLogger } from "./AuditLogger.ts";

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
export class ConsentService {
  private readonly CURRENT_PRIVACY_VERSION = "1.0";
  private consentRepository: ConsentRepository;
  private auditLogger?: AuditLogger;

  constructor(
    consentRepository: ConsentRepository,
    auditLogger?: AuditLogger,
  ) {
    this.consentRepository = consentRepository;
    this.auditLogger = auditLogger;
  }

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
      eventType: "consent.granted",
      userId: userId,
      resourceType: "consent",
      resourceId: consent.id.toString(),
      action: "create",
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
    const consent = this.consentRepository.findActiveConsent(
      userId,
      consentType,
    );

    if (consent) {
      this.consentRepository.revoke(consent.id);

      this.auditLogger?.log({
        eventType: "consent.revoked",
        userId: userId,
        resourceType: "consent",
        resourceId: consent.id.toString(),
        action: "update",
        success: true,
        details: { consentType },
      });
    }
  }

  /**
   * Check if user has active consent for a specific type
   */
  hasActiveConsent(userId: number, consentType: ConsentType): boolean {
    const consent = this.consentRepository.findActiveConsent(
      userId,
      consentType,
    );
    return consent !== null;
  }

  /**
   * Get all active consents for a user
   */
  getActiveConsents(userId: number): Consent[] {
    const allConsents = this.consentRepository.listByUser(userId);
    return allConsents.filter((consent) => !consent.revokedAt);
  }

  /**
   * Alias for hasActiveConsent() - for test compatibility
   */
  hasConsent(userId: number, consentType: ConsentType): boolean {
    return this.hasActiveConsent(userId, consentType);
  }

  /**
   * Get all consents for a user (active and revoked)
   */
  getUserConsents(userId: number): Consent[] {
    return this.consentRepository.listByUser(userId);
  }

  /**
   * Check if user has all required consents
   * Required consent: data_processing (legal basis for processing)
   */
  hasRequiredConsents(userId: number): boolean {
    return this.hasActiveConsent(userId, "data_processing");
  }

  /**
   * Grant all consent types at once (convenience method)
   */
  grantAllConsents(userId: number): Consent[] {
    const types: ConsentType[] = [
      "data_processing",
      "encryption",
      "ai_processing",
      "marketing",
    ];
    const consents: Consent[] = [];

    for (const type of types) {
      // Check if consent already exists
      const existing = this.consentRepository.findActiveConsent(userId, type);
      if (!existing) {
        const consent = this.grantConsent(userId, type);
        consents.push(consent);
      }
    }

    return consents;
  }

  /**
   * Revoke all consents for a user (GDPR Article 7.3)
   */
  revokeAllConsents(userId: number): void {
    const activeConsents = this.getActiveConsents(userId);

    for (const consent of activeConsents) {
      this.consentRepository.revoke(consent.id);
    }

    // Always log revoke all event (even if no consents exist)
    this.auditLogger?.log({
      eventType: "consent.revoked",
      userId: userId,
      resourceType: "consent",
      resourceId: "all",
      action: "update",
      success: true,
      details: {
        reason: "All consents revoked",
        revokedCount: activeConsents.length,
      },
    });
  }
}
