---
name: security-audit
description: "Automated security audit for Justice Companion: validates encryption keys, GDPR compliance, input validation, and OWASP best practices. Use when implementing security features, before releases, or when asked about security posture."
allowed-tools: ["Read", "Grep", "Bash", "mcp__memory__*"]
---

# Security Audit Skill

## Purpose
Comprehensive security validation for Justice Companion's privacy-first architecture.

## When Claude Uses This
- Before production releases
- After implementing authentication/encryption features
- When user asks "is this secure?" or "check security"
- During code reviews of sensitive components

## Audit Checklist

### 1. Encryption Key Security
- [ ] `.env` file not committed to git
- [ ] `ENCRYPTION_KEY_BASE64` migrated to KeyManager (safeStorage)
- [ ] Encrypted key at `%APPDATA%/.encryption-key` has 0o600 permissions
- [ ] No plaintext keys in logs or error messages

### 2. GDPR Compliance
- [ ] GdprService implemented (Articles 17 & 20)
- [ ] Rate limiting on exports (5/24hrs) and deletions (1/30 days)
- [ ] Consent tracking enabled for `data_processing` and `data_erasure_request`
- [ ] Audit logs preserved after user deletion

### 3. Input Validation
- [ ] All user inputs validated with Zod schemas
- [ ] Database queries parameterized (no SQL injection)
- [ ] File paths sanitized (no path traversal)
- [ ] IPC messages validated in preload.ts

### 4. Authentication
- [ ] Passwords hashed with scrypt (OWASP-compliant)
- [ ] Session expiration set to 24 hours
- [ ] Session IDs are UUID v4 (cryptographically random)
- [ ] No session fixation vulnerabilities

### 5. Encrypted Fields
Verify AES-256-GCM encryption on 11 database fields:
- [ ] `users.email`
- [ ] `users.full_name`
- [ ] `cases.title`
- [ ] `cases.description`
- [ ] `evidence.file_path`
- [ ] `evidence.notes`
- [ ] `chat_conversations.message_content`
- [ ] `documents.file_path`
- [ ] `contacts.email`
- [ ] `contacts.phone_number`
- [ ] `contacts.address`

### 6. Dependency Security
- [ ] No critical vulnerabilities in `pnpm audit`
- [ ] better-sqlite3 version supports latest security patches
- [ ] Electron version ≥ 38 (security updates)

## Example Usage

```typescript
// Claude automatically runs this skill when:
user: "Is our app secure enough for production?"

// Claude checks:
// 1. Greps for "ENCRYPTION_KEY" in git history
// 2. Reads KeyManager tests for coverage
// 3. Validates GDPR rate limits in GdprService.ts
// 4. Checks Zod schemas in all repositories
// 5. Stores results in mcp__memory for future reference
```

## Output Format

**Security Audit Report:**
- ✅ Encryption: KeyManager active, no plaintext keys
- ✅ GDPR: Full compliance, 15/15 tests passing
- ⚠️  Dependencies: 2 moderate vulnerabilities (non-critical)
- ✅ Authentication: OWASP-compliant scrypt hashing
- ✅ Input Validation: Zod schemas on all inputs

**Risk Score:** LOW (2/10)
**Recommendation:** Address moderate vulnerabilities before v1.0 release.
