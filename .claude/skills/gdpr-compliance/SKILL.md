---
name: gdpr-compliance
description: "GDPR compliance validator for Justice Companion: checks Articles 17 (Right to Erasure) and 20 (Data Portability), validates rate limits, consent management, and audit trail integrity. Use when implementing GDPR features, before data exports/deletions, or during compliance audits."
allowed-tools: ["Read", "Grep", "Bash", "mcp__memory__*"]
---

# GDPR Compliance Skill

## Purpose
Validate full GDPR compliance for Justice Companion's data protection obligations.

## When Claude Uses This
- Before production releases
- When implementing data export/deletion features
- User asks about GDPR compliance or data privacy
- During legal/compliance audits

## GDPR Requirements

### Article 20 - Data Portability (Right to Export)
- [ ] Machine-readable format (JSON)
- [ ] All user data across 13 tables
- [ ] Encrypted fields decrypted before export
- [ ] Rate limiting: 5 exports per 24 hours per user
- [ ] Consent required: `data_processing`
- [ ] Audit trail: SHA-256 hash chaining

### Article 17 - Right to Erasure (Right to Delete)
- [ ] Cascade deletion across 15 steps (respects foreign keys)
- [ ] Safety flag: `confirmed: true` required
- [ ] Rate limiting: 1 deletion per 30 days per user
- [ ] Consent required: `data_erasure_request`
- [ ] Preserved data: Audit logs + consent records (legal requirement)
- [ ] Export before delete option
- [ ] Transaction safety: All-or-nothing (atomic)

## Validation Checklist

### 1. GdprService Implementation
```typescript
// Check service exists and has required methods
F:\Justice Companion take 2\src\services\gdpr\GdprService.ts
- exportUserData(userId, options)
- deleteUserData(userId, options)
```

### 2. Rate Limiting
```typescript
// Verify rate limits enforced
src/services/gdpr/GdprService.ts:
- Export: 5 per 24 hours
- Delete: 1 per 30 days

// Check audit logs for violations
SELECT * FROM gdpr_audit_logs
WHERE action_type IN ('EXPORT_RATE_LIMIT_EXCEEDED', 'DELETE_RATE_LIMIT_EXCEEDED');
```

### 3. Consent Management
```typescript
// Validate consent types exist
src/db/schema.ts:
- data_processing (required for export)
- data_erasure_request (required for delete)

// Check consent verification
src/repositories/ConsentRepository.ts:
- hasActiveConsent(userId, consentType)
```

### 4. Data Coverage
Ensure all tables included in export:
- [ ] users
- [ ] cases
- [ ] evidence
- [ ] documents
- [ ] chat_conversations
- [ ] chat_messages
- [ ] contacts
- [ ] calendar_events
- [ ] tags
- [ ] case_tags
- [ ] consents
- [ ] sessions
- [ ] audit_logs

### 5. Deletion Order (Cascade Safety)
```typescript
// Verify deletion respects foreign keys
DataDeleter.ts deletion order:
1. chat_messages → 2. chat_conversations → 3. evidence
4. documents → 5. calendar_events → 6. case_tags
7. cases → 8. contacts → 9. tags → 10. sessions
11. consents (except data_erasure_request) → 12. users

// Preserved (legal requirement):
- audit_logs
- data_erasure_request consent
```

### 6. Test Coverage
```bash
# Run GDPR integration tests
pnpm test src/services/gdpr/Gdpr.integration.test.ts

# Expected: 15/15 passing
# Tests cover:
# - Data export with decryption
# - Data deletion with cascade
# - Rate limiting enforcement
# - Consent validation
# - Audit log preservation
# - Error handling
```

## Compliance Risks

### CRITICAL (Fix Immediately)
- ❌ Missing rate limiting → GDPR Article 12.5 violation
- ❌ No consent verification → GDPR Article 6.1(a) violation
- ❌ Audit logs not preserved → GDPR Article 30 violation

### HIGH (Fix Before Release)
- ⚠️  Incomplete data export → GDPR Article 20.1 violation
- ⚠️  Deletion not atomic → Data integrity risk
- ⚠️  No export before delete option → User experience issue

### MEDIUM (Address Soon)
- ⚠️  Rate limit too restrictive → Usability concern
- ⚠️  No GDPR request audit trail → Compliance gap

## Example Usage

```typescript
// Claude automatically runs this skill when:
user: "Are we GDPR compliant?"

// Claude checks:
// 1. Reads GdprService.ts for implementation
// 2. Greps for rate limiting logic
// 3. Validates test coverage (15/15 tests)
// 4. Checks consent types in schema
// 5. Stores compliance status in mcp__memory
```

## Output Format

**GDPR Compliance Report:**
- ✅ Article 20 (Data Portability): COMPLIANT
  - Machine-readable JSON export
  - 13 tables covered
  - Rate limiting: 5/24hrs
  - Consent: data_processing verified

- ✅ Article 17 (Right to Erasure): COMPLIANT
  - 15-step cascade deletion
  - Rate limiting: 1/30 days
  - Audit logs preserved
  - Transaction safety: atomic

- ✅ Test Coverage: 15/15 passing (100%)

**Compliance Score:** 100% (Production-Ready)
**Next Steps:** Schedule annual compliance audit.

## Reference Documentation

- `src/services/gdpr/GdprService.ts` - Orchestration layer (363 lines)
- `src/services/gdpr/DataExporter.ts` - Export logic (344 lines)
- `src/services/gdpr/DataDeleter.ts` - Deletion logic (191 lines)
- `src/models/Gdpr.ts` - Type definitions (153 lines)
- `src/services/gdpr/Gdpr.integration.test.ts` - Test suite (822 lines)
