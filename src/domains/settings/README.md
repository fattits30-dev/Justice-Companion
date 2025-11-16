# Settings Domain

## Overview

The Settings domain manages user preferences, profile information, consent tracking for GDPR compliance, and application configuration.

## Domain Components

### Entities

- **UserProfile** (`entities/UserProfile.ts`): User profile information (single-row table design)
- **Consent** (`entities/Consent.ts`): GDPR consent tracking with versioning

### Value Objects

(To be added based on requirements)

## Features

### User Profile Management

- **Single User Design**: Desktop app with one user profile
- **Profile Fields**: Name, email, avatar URL
- **Avatar Support**: Local file or URL
- **Auto-save**: Changes saved immediately

### Consent Management (GDPR Compliant)

#### Consent Types

- **data_processing**: Required for app functionality
- **encryption**: Consent for data encryption
- **ai_processing**: AI feature usage consent
- **marketing**: Marketing communications (optional)

#### Consent Tracking

- Version tracking for privacy policy
- Timestamp for grant/revoke actions
- Immutable audit trail
- Consent withdrawal support

### Application Settings

#### Security Settings

- Encryption preferences
- Session timeout configuration
- Auto-lock settings
- Backup frequency

#### UI Preferences

- Theme selection (light/dark/auto)
- Font size adjustments
- Notification preferences
- Language selection (planned)

#### Legal Research Settings

- Default jurisdiction
- Preferred court levels
- API rate limit warnings
- Cache duration

## Business Rules

### Profile Management

- Email validation required
- Name cannot be empty
- Avatar size limit: 5MB
- Supported avatar formats: jpg, png, webp

### Consent Requirements

- **data_processing**: Must be granted to use app
- **encryption**: Recommended for security
- **ai_processing**: Required for AI features
- **marketing**: Always optional

### Consent Versioning

- New privacy policy = new version
- Previous consents archived
- Re-consent required for major changes
- Grace period for consent renewal

## GDPR Compliance

### Article 7 - Consent Management

- Clear consent requests
- Easy withdrawal mechanism
- Consent proof storage
- Separate consents for different purposes

### Article 13/14 - Information Requirements

- Privacy policy version tracking
- Clear data usage explanations
- Contact information provided
- Data retention periods specified

### Article 20 - Data Portability

- Export profile data
- Machine-readable format (JSON)
- Include consent history
- Transfer to other services

## Dependencies

- Auth domain for user association
- Encryption service for sensitive data
- Audit logger for consent changes
- GDPR service for compliance

## Usage Examples

```typescript
import { UserProfile, Consent } from "@/domains/settings";

// User profile (singleton)
const profile: UserProfile = {
  id: 1, // Always 1 for single-user app
  name: "John Doe",
  email: "john.doe@example.com",
  avatarUrl: "/avatars/john.jpg",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Create consent record
const consent: Consent = {
  id: 1,
  userId: 123,
  consentType: "ai_processing",
  granted: true,
  grantedAt: new Date().toISOString(),
  revokedAt: null,
  version: "2.0.0", // Privacy policy version
  createdAt: new Date().toISOString(),
};

// Check consent status
function hasAIConsent(consents: Consent[]): boolean {
  const aiConsent = consents.find(
    (c) => c.consentType === "ai_processing" && c.granted && !c.revokedAt,
  );
  return !!aiConsent;
}

// Revoke consent
function revokeConsent(consent: Consent): Consent {
  return {
    ...consent,
    granted: false,
    revokedAt: new Date().toISOString(),
  };
}
```

## Settings Storage

### Local Storage

- Profile: SQLite database
- Preferences: JSON file
- Consents: SQLite with audit trail
- Cache: Application data directory

### Sync Strategy (Future)

- Cloud backup option
- Device sync via account
- Conflict resolution
- Offline-first approach

## Testing

- Unit tests for consent logic
- Integration tests for profile updates
- GDPR compliance tests
- E2E tests for settings UI
- Test coverage target: 80%+

## UI Components

### Settings Sections

1. **Profile**: Name, email, avatar
2. **Security**: Encryption, passwords, sessions
3. **Privacy**: Consent management, data export
4. **Preferences**: UI, notifications, language
5. **Legal**: Jurisdiction, court preferences
6. **About**: Version, licenses, credits

### Consent Dialog

- Clear explanation of data use
- Granular consent options
- Links to privacy policy
- Decline consequences explained

## Future Enhancements

- Multi-profile support
- Cloud synchronization
- Biometric authentication settings
- Advanced notification rules
- Custom themes
- Keyboard shortcut configuration
- Plugin preferences
- Backup automation settings
- Integration with legal practice systems
