# Security Policy

## Supported Versions

Currently supported versions of Justice Companion:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

Justice Companion implements multiple layers of security to protect your legal case data:

### Data Protection
- **Local-Only Storage**: All data is stored locally on your device in SQLite. No data is sent to external servers.
- **AES-256-GCM Encryption**: Sensitive data (case descriptions, evidence content, personal information) is encrypted at rest.
- **Password Security**: Passwords are hashed using scrypt with random salts (OWASP recommended).
- **Session Management**: 24-hour session expiration with UUID session IDs.

### GDPR Compliance
- **Right to Data Portability** (Article 20): Export all your data to JSON
- **Right to Erasure** (Article 17): Delete all your data permanently
- **Right to Withdraw Consent** (Article 7.3): Revoke consents at any time
- **Audit Logging**: Immutable audit trail with SHA-256 hash chaining

### Code Security
- **CodeQL Analysis**: Automated security vulnerability scanning
- **Dependency Updates**: Automated Dependabot updates for security patches
- **Type Safety**: Strict TypeScript compilation prevents common bugs
- **Input Validation**: All user inputs are validated and sanitized

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure:

### How to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues via one of these methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to https://github.com/[YOUR-USERNAME]/Justice-Companion/security/advisories
   - Click "New draft security advisory"
   - Provide detailed information about the vulnerability

2. **Email** (Alternative)
   - Send an email to: [YOUR-EMAIL]
   - Subject: "[SECURITY] Justice Companion Vulnerability Report"
   - Include detailed steps to reproduce

### What to Include

When reporting a vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact if exploited
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Versions**: Which versions are affected
- **Suggested Fix**: If you have a suggested fix, please include it
- **Proof of Concept**: If applicable, include a PoC (but do not publicly disclose)

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
2. **Assessment**: We will assess the severity and impact within 7 days
3. **Fix Development**: We will work on a fix and keep you updated on progress
4. **Disclosure**: We will coordinate disclosure with you once a fix is released
5. **Credit**: We will publicly credit you for the discovery (unless you prefer to remain anonymous)

### Severity Levels

We use the CVSS (Common Vulnerability Scoring System) to assess severity:

- **Critical (9.0-10.0)**: Immediate fix required
  - Example: Remote code execution, complete data exposure
- **High (7.0-8.9)**: Fix within 7 days
  - Example: Authentication bypass, SQL injection
- **Medium (4.0-6.9)**: Fix within 30 days
  - Example: XSS, CSRF, information disclosure
- **Low (0.1-3.9)**: Fix in next release
  - Example: Minor information leak, low-impact issues

## Security Best Practices for Users

If you're using Justice Companion, here are security best practices:

### Password Security
- ✅ Use a strong password (12+ characters, mixed case, numbers)
- ✅ Use a unique password (don't reuse from other services)
- ✅ Enable device encryption (Windows BitLocker, macOS FileVault)
- ❌ Don't share your password with anyone
- ❌ Don't write your password down in plain text

### Data Protection
- ✅ Keep your operating system updated
- ✅ Use antivirus/antimalware software
- ✅ Regularly backup your Justice Companion database
- ✅ Export your data regularly (Settings → GDPR → Export Data)
- ❌ Don't share your database file publicly
- ❌ Don't grant unnecessary application permissions

### Session Security
- ✅ Log out when using a shared computer
- ✅ Close Justice Companion when not in use
- ❌ Don't leave your device unlocked and unattended

## Encryption Details

### Data at Rest
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV/Nonce**: 96 bits (12 bytes), randomly generated per encryption
- **Authentication Tag**: 128 bits (16 bytes)
- **Key Storage**: Environment variable (ENCRYPTION_KEY_BASE64)

### Password Hashing
- **Algorithm**: scrypt (OWASP recommended)
- **Salt Size**: 128 bits (16 bytes), randomly generated per user
- **Hash Size**: 512 bits (64 bytes)
- **Comparison**: Timing-safe equality check (prevents timing attacks)

### Session Management
- **Session ID**: UUID v4 (128 bits of randomness)
- **Expiration**: 24 hours
- **Storage**: In-memory (main process) + database
- **Invalidation**: On logout or password change

## Third-Party Dependencies

Justice Companion uses the following security-critical dependencies:

- **better-sqlite3**: SQLite database engine
- **scrypt**: Password hashing (Node.js built-in)
- **crypto**: Encryption/decryption (Node.js built-in)
- **electron**: Application framework

All dependencies are:
- Regularly updated via Dependabot
- Scanned for vulnerabilities via CodeQL
- Reviewed for security issues before updates

## Compliance

Justice Companion is designed to comply with:

- **GDPR** (General Data Protection Regulation)
- **OWASP** (Open Web Application Security Project) guidelines
- **CWE** (Common Weakness Enumeration) best practices

## Contact

For security-related questions (non-vulnerabilities), you can:
- Open a discussion on GitHub
- Email: [YOUR-EMAIL]

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
