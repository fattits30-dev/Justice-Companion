# Security Policy

## Supported Versions

We release security updates for the following versions of Justice Companion:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

Security patches are backported to the current major version only. We strongly recommend upgrading to the latest stable release to receive all security fixes.

## Security Features

Justice Companion implements enterprise-grade security measures to protect sensitive legal data:

### Encryption
- **Field-level encryption**: AES-256-GCM for 11 sensitive database fields
- **OS-level key storage**:
  - Windows: Data Protection API (DPAPI)
  - macOS: Keychain
  - Linux: Secret Service API (libsecret)
- **No plaintext keys**: Encryption keys never stored in configuration files

### Authentication & Access Control
- **Password hashing**: Scrypt with 128-bit random salts (OWASP-compliant)
- **Session management**: 24-hour expiration, UUID v4 session IDs
- **Input validation**: Zod schemas for all user inputs
- **Path traversal prevention**: Absolute paths with proper sanitization

### Data Protection
- **GDPR compliance**: Full implementation of Articles 17 (Right to Erasure) and 20 (Data Portability)
- **Immutable audit logging**: SHA-256 hash chaining for tamper-proof event tracking
- **Rate limiting**:
  - Data exports: 5 per 24 hours per user
  - Data deletion: 1 per 30 days per user
- **Consent management**: Granular user consent tracking

### Application Security
- **Electron security**: Context isolation enabled, nodeIntegration disabled
- **IPC security**: Whitelist-based channel validation in preload script
- **Dependency scanning**: Automated vulnerability scanning via GitHub Dependabot
- **Local-first architecture**: No data transmitted to external servers by default

## Reporting a Vulnerability

**DO NOT** create public GitHub issues for security vulnerabilities.

### Reporting Process

We take security seriously and appreciate responsible disclosure. Please report security vulnerabilities through one of these channels:

#### Option 1: GitHub Security Advisories (Preferred)
1. Navigate to the [Security tab](https://github.com/yourusername/justice-companion/security/advisories)
2. Click "Report a vulnerability"
3. Provide detailed information about the vulnerability

#### Option 2: Email
Send encrypted emails to: **security@justicecompanion.app**

PGP Key: [Link to public PGP key when available]

### What to Include

Please provide the following information:
- **Type of vulnerability** (e.g., XSS, SQL injection, path traversal)
- **Affected component** (file path, function name, line number)
- **Attack scenario** (how the vulnerability can be exploited)
- **Proof of concept** (PoC code, screenshots, or reproduction steps)
- **Impact assessment** (what an attacker could achieve)
- **Suggested remediation** (if you have one)

### Response Timeline

- **Initial response**: Within 48 hours
- **Triage and validation**: Within 7 days
- **Fix development**: Within 30 days (severity-dependent)
- **Public disclosure**: 90 days after fix release (coordinated disclosure)

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report within 48 hours
2. **Validation**: We'll validate the vulnerability and assess severity
3. **Updates**: We'll provide regular status updates every 7 days
4. **Fix release**: We'll develop, test, and release a fix
5. **Credit**: We'll credit you in release notes (if desired)

### Severity Assessment

We use the CVSS 3.1 scoring system:

| CVSS Score | Severity | Response Time |
|------------|----------|---------------|
| 9.0-10.0   | Critical | 7 days        |
| 7.0-8.9    | High     | 14 days       |
| 4.0-6.9    | Medium   | 30 days       |
| 0.1-3.9    | Low      | 90 days       |

## Coordinated Disclosure Policy

We follow a coordinated disclosure process:

1. **Private disclosure**: Report sent to security team
2. **Fix development**: Patch developed and tested privately
3. **Pre-notification**: Notify affected users 7 days before public release
4. **Public release**: Fix released with security advisory
5. **CVE assignment**: Request CVE if applicable
6. **Credit**: Public acknowledgment of reporter (if desired)

**Embargo period**: 90 days from fix release before full technical details are published.

## Bug Bounty Program

We currently do not offer a paid bug bounty program. However, we deeply appreciate security research and will:

- Publicly credit researchers (if desired)
- Provide early access to beta features
- Consider financial rewards on a case-by-case basis for critical vulnerabilities

## Security Best Practices for Users

To maximize your security when using Justice Companion:

1. **Keep updated**: Install security updates promptly
2. **Strong passwords**: Use passwords with 12+ characters, mixed case, numbers, symbols
3. **Backup regularly**: Use `pnpm db:backup` to create encrypted backups
4. **Verify downloads**: Check file hashes before installing updates
5. **Secure your device**: Enable full-disk encryption on your operating system
6. **Review audit logs**: Regularly check `Settings > Audit Logs` for suspicious activity

## Security Audits

Justice Companion undergoes regular security reviews:

- **Automated scanning**: Daily dependency vulnerability scans
- **Code review**: Peer review for all security-critical changes
- **Penetration testing**: Annual third-party security assessment (planned)
- **OWASP compliance**: Adherence to OWASP Top 10 guidelines

## Security-Related Configuration

### Encryption Key Management

**Production**: Encryption keys are managed by `KeyManager` using OS-level encryption:
```bash
# Key location (encrypted):
# Windows: %APPDATA%/Justice Companion/.encryption-key
# macOS: ~/Library/Application Support/Justice Companion/.encryption-key
# Linux: ~/.config/Justice Companion/.encryption-key
```

**First run**: If migrating from `.env`, the app auto-migrates keys to secure storage. Delete the `.env` key after migration.

### Audit Logging

All security-relevant events are logged:
- User authentication (login, logout, failed attempts)
- Data access (exports, deletions, encryption/decryption)
- Configuration changes (key rotation, permission changes)
- GDPR operations (consent changes, data requests)

Audit logs use SHA-256 hash chaining to prevent tampering.

## Vulnerability Disclosure History

We maintain transparency about past vulnerabilities:

| CVE ID | Severity | Description | Fixed In | Disclosure Date |
|--------|----------|-------------|----------|-----------------|
| TBD    | TBD      | TBD         | TBD      | TBD             |

See [CHANGELOG.md](./CHANGELOG.md) for detailed security fixes in each release.

## Contact

- **Security team**: security@justicecompanion.app
- **General inquiries**: support@justicecompanion.app
- **GitHub Security**: https://github.com/yourusername/justice-companion/security

## Acknowledgments

We thank the following security researchers for responsible disclosure:

- *No vulnerabilities reported yet*

---

**Last updated**: 2025-10-21
**Version**: 1.0.0
