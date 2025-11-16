# Auth Domain

## Overview

The Auth domain handles all authentication and authorization concerns including user registration, login, session management, and access control with enterprise-grade security.

## Domain Components

### Entities

- **User** (`entities/User.ts`): Core user entity with credentials and role information
- **Session** (`entities/Session.ts`): User session tracking with expiration and device info

### Value Objects

- **Email** (`value-objects/Email.ts`): Email validation, formatting, and masking
- **Password** (`value-objects/Password.ts`): Password strength validation following OWASP guidelines

### Domain Events

- **UserRegistered** (`events/UserRegistered.ts`): Fired when a new user registers
- **UserLoggedIn** (`events/UserLoggedIn.ts`): Fired on successful authentication

## Security Implementation

### Password Security (OWASP Compliant)

- **Hashing**: scrypt with 128-bit random salt
- **Min Length**: 12 characters
- **Requirements**: uppercase, lowercase, number, special character
- **Strength Meter**: weak, medium, strong, very_strong
- **Common Pattern Detection**: blocks weak passwords

### Session Management

- **Session Duration**: 24 hours (default), 30 days (remember me)
- **Session ID**: UUID v4
- **Session Storage**: Server-side with encrypted cookies
- **Device Tracking**: IP address and user agent
- **Concurrent Sessions**: Supported with device management

### Email Validation

- **Format**: RFC 5322 compliant regex
- **Max Length**: 255 characters
- **Normalization**: Lowercase, trimmed
- **Business Email Detection**: Identifies personal vs business domains
- **Masking**: Privacy-preserving display (abc\*\*\*@example.com)

## Business Rules

### User Registration

- Unique username and email required
- Email verification (planned)
- Default role: 'user'
- Admin role requires manual elevation
- Account activation required (planned)

### Authentication Flow

1. Validate credentials
2. Check account status (active/locked)
3. Generate session with appropriate duration
4. Log authentication event
5. Update last login timestamp

### Authorization Levels

- **User**: Basic access to own cases and data
- **Admin**: Full system access, user management

## Dependencies

- Encryption service for password hashing
- Audit logger for security events
- Rate limiting for brute force protection
- Session storage (database)

## Security Best Practices

### Rate Limiting

- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- Registration: 10 per hour per IP

### Account Security

- Account lockout after 5 failed attempts
- Password reset via secure token
- Two-factor authentication (planned)
- Suspicious activity detection

## Usage Examples

```typescript
import { Email, Password, User } from "@/domains/auth";

// Validate email
const email = Email.create("user@example.com");
console.log(email.getDomain()); // 'example.com'
console.log(email.isBusinessEmail()); // false
console.log(email.getMasked()); // 'use***@example.com'

// Validate password
const password = Password.create("MySecure@Pass123");
console.log(password.getStrength()); // 'strong'

// Create user
const user: User = {
  id: 1,
  username: "johndoe",
  email: email.getValue(),
  passwordHash: "...", // scrypt hash
  passwordSalt: "...", // 128-bit salt
  role: "user",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: null,
};

// Authentication event
const loginEvent = new UserLoggedIn(user.id, sessionId, {
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
});
```

## Testing

- Unit tests for value objects and validation
- Integration tests for authentication flow
- Security tests for password hashing
- Session management tests
- Rate limiting tests
- Test coverage target: 90%+ (critical domain)

## Compliance

- **GDPR**: User consent, data portability, right to erasure
- **OWASP**: Top 10 security practices implemented
- **Password Policy**: NIST 800-63B compliant
- **Audit Trail**: All authentication events logged

## Future Enhancements

- Multi-factor authentication (TOTP, SMS)
- Social login (OAuth 2.0)
- Biometric authentication
- Single Sign-On (SAML)
- Passwordless authentication
- Device fingerprinting
- Risk-based authentication
- Session replay protection
