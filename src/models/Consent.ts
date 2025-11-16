/**
 * Consent model for GDPR compliance
 * Tracks user consent for different data processing activities
 */
export type ConsentType =
  | "data_processing" // Required for app to function
  | "encryption" // Consent to encrypt sensitive data
  | "ai_processing" // Consent to use AI features
  | "marketing"; // Consent to receive marketing communications

export interface Consent {
  id: number;
  userId: number;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null; // ISO 8601 timestamp
  revokedAt: string | null; // ISO 8601 timestamp
  version: string; // Privacy policy version
  createdAt: string;
}

/**
 * Input for creating a new consent record
 */
export interface CreateConsentInput {
  userId: number;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: string;
  version: string;
}
