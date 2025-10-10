# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Justice Companion, please send a responsible disclosure report to:

**Email**: [Your security contact email]

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours of receiving the report
- **Confirmation**: Within 7 days, we'll confirm the vulnerability and provide a timeline for a fix
- **Fix Release**: Security fixes are prioritized and typically released within 30 days
- **Public Disclosure**: After a fix is released, we'll coordinate disclosure with you

### Security Features

Justice Companion is designed with security as a priority:

#### 🔐 Encryption
- **AES-256-GCM** encryption for all sensitive data at rest
- Unique encryption keys per installation
- Key derivation using industry standards

#### 🔑 Authentication
- **scrypt** password hashing with 128-bit random salts
- OWASP-compliant password requirements (12+ characters minimum)
- Timing-safe password comparison to prevent timing attacks
- Session management with 24-hour expiration
- UUID v4 session identifiers

#### 🛡️ Application Security
- **Local-only storage**: All data remains on your device
- No cloud services or remote data transmission
- Electron security best practices
- Content Security Policy (CSP) enforcement
- Sandboxed renderer processes

#### 📝 Audit Logging
- Immutable audit trail with SHA-256 hash chaining
- Tamper detection via blockchain-style verification
- GDPR-compliant metadata-only logging
- No sensitive data stored in audit logs

#### 🔍 Code Security
- TypeScript strict mode for type safety
- ESLint security rules enforcement
- Automated dependency vulnerability scanning (Dependabot)
- CodeQL security analysis in CI/CD
- Regular security audits

### Known Security Considerations

#### Desktop Application Security

Justice Companion is a desktop application that runs locally. Users should be aware:

1. **Encryption Key Security**: The encryption key in `.env` file is critical. If compromised, all encrypted data can be decrypted. Store this file securely and never share it.

2. **Physical Access**: As a desktop app, anyone with physical access to your computer while unlocked may access the application. Always lock your computer when away.

3. **Database Backups**: Database backups are not encrypted by default. Store backups in secure locations.

4. **Development Mode**: Never run the application in development mode (`npm run electron:dev`) on untrusted networks or with production data.

### Security Best Practices for Users

1. **Strong Passwords**: Use a password manager to generate strong, unique passwords
2. **Regular Backups**: Back up your database regularly: `npm run db:backup`
3. **Keep Updated**: Always use the latest version for security patches
4. **Secure Environment**: Run Justice Companion on a device with up-to-date antivirus software
5. **Encryption Key**: Store your encryption key securely and back it up separately

### Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed. Users will be notified through:

- GitHub Security Advisories
- Release notes
- In-app notifications (if implemented)

### Vulnerability Disclosure Policy

We follow responsible disclosure practices:

1. **Private Report**: Report vulnerabilities privately via email
2. **Investigation**: We investigate and confirm the vulnerability
3. **Fix Development**: We develop and test a fix
4. **Coordinated Release**: We release the fix and disclose the vulnerability
5. **Credit**: We credit reporters in release notes (unless they prefer anonymity)

### Out of Scope

The following are considered out of scope:

- Vulnerabilities in dependencies that are already publicly disclosed and have no fix available
- Issues that require physical access to the user's computer
- Social engineering attacks
- Denial of service attacks requiring unrealistic resource consumption
- Issues in development-only code paths (e.g., `dev-api-server.ts`)

### Legal

We will not pursue legal action against security researchers who:

- Make a good faith effort to avoid privacy violations and data destruction
- Report vulnerabilities privately and give us reasonable time to respond
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue

### Contact

For security-related questions or concerns:

- **Security Issues**: [Your security email]
- **General Questions**: [Your general contact email]
- **GitHub Issues**: For non-security bugs and feature requests only

---

**Thank you for helping keep Justice Companion and our users safe!**
