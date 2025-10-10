# Encryption System

**Justice Companion - AES-256-GCM Encryption for PII/Sensitive Data**

**Last Updated**: 2025-10-09
**Status**: ✅ COMPLETE (Phase 3 - 11 Fields Encrypted)
**Security Level**: CRITICAL

---

## Table of Contents

1. [Overview](#overview)
2. [Encrypted Fields](#encrypted-fields)
3. [Algorithm & Architecture](#algorithm--architecture)
4. [Repository Integration](#repository-integration)
5. [Key Management](#key-management)
6. [Audit Logging Integration](#audit-logging-integration)
7. [Testing & Performance](#testing--performance)
8. [Security Considerations](#security-considerations)

---

## Overview

Justice Companion implements **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) for protecting sensitive user data at rest. This provides GDPR Article 32 compliant encryption for all personally identifiable information (PII) and sensitive legal data.

**Encryption Approach**: JSON-serialized EncryptedData objects stored in existing TEXT columns (no schema changes required).

**Implementation Progress**:

- **Phase 1**: 2 fields encrypted (cases.description, evidence.content)
- **Phase 3**: 7 additional fields encrypted (notes, chat, profile, legal issues, timeline)
- **Phase 3.5**: 2 additional fields encrypted (user_facts.fact_content, case_facts.fact_content)
- **Total**: 11 fields encrypted across 8 tables

---

## Encrypted Fields

### Phase 1: Initial Encryption (COMPLETE)

| Table      | Field         | Priority | Encrypted Since          | Rationale                                    |
| ---------- | ------------- | -------- | ------------------------ | -------------------------------------------- |
| `cases`    | `description` | P0       | Phase 1 (Commit 1a0e66f) | Case details, client PII, legal strategy     |
| `evidence` | `content`     | P0       | Phase 1 (Commit 15663d2) | Document text, emails, recording transcripts |

### Phase 3: Encryption Expansion (COMPLETE)

| Table             | Field              | Priority | Encrypted Since | Rationale                                                  |
| ----------------- | ------------------ | -------- | --------------- | ---------------------------------------------------------- |
| `notes`           | `content`          | P0       | Phase 3         | Private observations, strategy notes, personal reflections |
| `chat_messages`   | `content`          | P0       | Phase 3         | User queries with case context, PII discussions with AI    |
| `chat_messages`   | `thinking_content` | P1       | Phase 3         | AI reasoning that may reference case facts                 |
| `user_profile`    | `name`             | P0       | Phase 3         | GDPR-protected PII (full name)                             |
| `user_profile`    | `email`            | P0       | Phase 3         | GDPR-protected PII (email address, unique identifier)      |
| `legal_issues`    | `description`      | P1       | Phase 3         | Detailed legal issue explanations, may contain PII         |
| `timeline_events` | `description`      | P1       | Phase 3         | Event details that may reference people, locations, dates  |

### Phase 3.5: Facts Feature (COMPLETE)

| Table        | Field          | Priority | Encrypted Since | Rationale                                                  |
| ------------ | -------------- | -------- | --------------- | ---------------------------------------------------------- |
| `user_facts` | `fact_content` | P0       | Phase 3.5       | Personal details, employment, financial info, medical info |
| `case_facts` | `fact_content` | P1       | Phase 3.5       | Timeline facts, evidence, witnesses, locations             |

**Total Encrypted Fields**: 11 fields across 8 tables

**Fields NOT Encrypted** (Low Sensitivity):

- Metadata fields: title, case_type, status, evidence_type, file_path
- Enumerated types: role, consent_type, importance_level
- Timestamps: created_at, updated_at
- Foreign keys: case_id, user_id, evidence_id

---

## Algorithm & Architecture

### AES-256-GCM Security Properties

- **Algorithm**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits (32 bytes)
- **Mode**: GCM (Galois/Counter Mode)
- **IV Length**: 96 bits (12 bytes, unique per operation)
- **Authentication**: AEAD (Authenticated Encryption with Associated Data)
- **Random IVs**: Cryptographically secure IV generated per encryption

**Why AES-256-GCM?**

1. **NIST Approved**: FIPS 140-2 compliant
2. **Authenticated Encryption**: Detects tampering via auth tag
3. **Performance**: Hardware-accelerated on modern CPUs (AES-NI)
4. **Industry Standard**: Used by Signal, WhatsApp, TLS 1.3
5. **GDPR Compliant**: Satisfies Article 32 requirements

### EncryptionService Class

**Location**: `src/services/EncryptionService.ts` (216 lines)

```typescript
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm' as const;
  private readonly key: Buffer; // 32 bytes

  constructor(key: Buffer | string);
  encrypt(plaintext: string): EncryptedData | null;
  decrypt(encryptedData: EncryptedData): string | null;
  isEncrypted(data: unknown): data is EncryptedData;
  static generateKey(): Buffer;
  rotateKey(oldData: EncryptedData, newService: EncryptionService): EncryptedData | null;
}
```

**Methods**:

- `encrypt(plaintext)` - Encrypts data with AES-256-GCM, returns EncryptedData object
- `decrypt(encryptedData)` - Decrypts and verifies authentication tag
- `isEncrypted(data)` - Type guard for EncryptedData objects
- `generateKey()` - Generates cryptographically secure 256-bit key
- `rotateKey(oldData, newService)` - Re-encrypts data with new key

### EncryptedData Format

```typescript
export interface EncryptedData {
  algorithm: 'aes-256-gcm';
  ciphertext: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector (12 bytes)
  authTag: string; // Base64-encoded authentication tag (16 bytes)
  version: number; // Algorithm version for future rotation
}
```

**Storage Format**: JSON-serialized EncryptedData in existing TEXT columns

**Example Stored Value**:

```json
{
  "algorithm": "aes-256-gcm",
  "ciphertext": "rL5K8kMzW3+JhGq4pN7sX...",
  "iv": "xGH9kP2mN5bQ8cRd",
  "authTag": "zY7mQ4sPn1kT3vWh6oEx==",
  "version": 1
}
```

---

## Repository Integration

All repositories follow this consistent pattern for encryption:

### Encrypt Before INSERT/UPDATE

```typescript
create(input: CreateInput): Entity {
  // Encrypt sensitive field before storing
  const encryptedContent = input.content
    ? this.encryptionService?.encrypt(input.content)
    : null;

  // Serialize EncryptedData to JSON string
  const contentToStore = encryptedContent
    ? JSON.stringify(encryptedContent)
    : null;

  // Store in database
  const stmt = this.db.prepare('INSERT INTO table (content) VALUES (?)');
  stmt.run(contentToStore);

  // Audit PII access
  this.auditLogger?.log({
    eventType: 'resource.create',
    resourceId: id.toString(),
    details: { encrypted: true }
  });
}
```

### Decrypt After SELECT

```typescript
findById(id: number): Entity | null {
  const row = this.db.prepare('SELECT * FROM table WHERE id = ?').get(id);

  if (row) {
    row.content = this.decryptField(row.content);
  }

  return row;
}

private decryptField(storedValue: string | null): string | null {
  if (!storedValue) return null;

  if (!this.encryptionService) {
    // Backward compatibility: no encryption service available
    return storedValue;
  }

  try {
    const encryptedData = JSON.parse(storedValue);

    if (this.encryptionService.isEncrypted(encryptedData)) {
      const decrypted = this.encryptionService.decrypt(encryptedData);

      // Audit PII access
      this.auditLogger?.log({
        eventType: 'resource.content_access',
        resourceId: id.toString(),
        details: { field: 'content', encrypted: true }
      });

      return decrypted;
    }

    // Legacy plaintext data
    return storedValue;
  } catch {
    // JSON parse failed, likely legacy plaintext
    return storedValue;
  }
}
```

### Backward Compatibility

Repositories handle three data states:

1. **Encrypted (EncryptedData JSON)**: Decrypt normally
2. **Legacy Plaintext**: Return as-is, no decryption
3. **NULL/Empty**: Return NULL

This allows gradual migration from plaintext to encrypted storage without breaking existing data.

---

## Key Management

### Generate Encryption Key

```bash
# Generate new 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Output example: `Rj5K8mQ3pN7sX4vWh6oEx9bY7mQ4sPn1kT3vWh6oExg=`

### .env Configuration

```bash
# .env file (NEVER commit to git)
ENCRYPTION_KEY_BASE64=your_base64_encoded_32_byte_key_here
```

**Security**:

- ✅ `.env` file excluded from git via `.gitignore`
- ✅ OS-level file permissions protect `.env` (0600)
- ✅ Key loaded once at application startup
- ⏳ Future: OS keychain integration (Keytar, electron-store with encryption)

### Load Key at Application Startup

```typescript
// electron/main.ts
import { EncryptionService } from './services/EncryptionService';
import dotenv from 'dotenv';

dotenv.config();

const encryptionKey = process.env.ENCRYPTION_KEY_BASE64;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY_BASE64 not found in .env');
}

const encryptionService = new EncryptionService(encryptionKey);

// Inject into repositories
const caseRepository = new CaseRepository(db, encryptionService, auditLogger);
const evidenceRepository = new EvidenceRepository(db, encryptionService, auditLogger);
// ... etc
```

### Key Rotation

```typescript
// Rotate encryption key (requires downtime or read-only mode)
const oldService = new EncryptionService(oldKey);
const newService = new EncryptionService(newKey);

// Re-encrypt all encrypted fields
const cases = db.prepare('SELECT id, description FROM cases').all();

for (const caseRow of cases) {
  if (!caseRow.description) continue;

  const oldEncrypted = JSON.parse(caseRow.description);
  const newEncrypted = oldService.rotateKey(oldEncrypted, newService);
  const newStored = JSON.stringify(newEncrypted);

  db.prepare('UPDATE cases SET description = ? WHERE id = ?').run(newStored, caseRow.id);
}
```

**Key Rotation Triggers**:

- Periodic rotation (e.g., annually)
- Key compromise or suspected breach
- Compliance requirement changes
- Employee termination (if key was shared)

---

## Audit Logging Integration

### PII Access Tracking

All repositories log PII access when decrypting fields:

```typescript
// After successful decryption
this.auditLogger?.log({
  eventType: 'note.content_access',
  resourceType: 'note',
  resourceId: id.toString(),
  action: 'read',
  details: { field: 'content', encrypted: true },
  success: true,
});
```

**Audit Event Types**:

- `case.pii_access` - Case description decrypted
- `evidence.content_access` - Evidence content decrypted
- `note.content_access` - Note content decrypted
- `message.content_access` - Chat message decrypted
- `profile.pii_access` - User profile PII decrypted
- `encryption.key_loaded` - Encryption key loaded at startup
- `encryption.decrypt` - Decryption operation performed

### GDPR Compliance

- ✅ Audit logs contain NO decrypted PII (metadata only)
- ✅ Only field name, resource ID, timestamp logged
- ✅ Satisfies GDPR Article 30 (Records of Processing Activities)
- ✅ Satisfies GDPR Article 32 (Security of Processing)
- ✅ Immutable audit trail (SHA-256 hash chaining)

---

## Testing & Performance

### Unit Tests

**Coverage**:

- ✅ Encrypt → Decrypt round-trip (388 lines in EncryptionService.test.ts)
- ✅ Backward compatibility with plaintext
- ✅ Empty/NULL handling
- ✅ Audit log verification (no PII leakage)
- ✅ Authentication tag tampering detection
- ✅ Repository integration tests (NotesRepository.test.ts, Phase3Repositories.test.ts)

**Test Example**:

```typescript
it('should encrypt content and store as EncryptedData JSON', () => {
  const note = repository.create({
    caseId: 1,
    content: 'Sensitive private note',
  });

  const storedNote = db.prepare('SELECT content FROM notes WHERE id = ?').get(note.id);
  const parsed = JSON.parse(storedNote.content);

  expect(parsed.algorithm).toBe('aes-256-gcm');
  expect(parsed.ciphertext).toBeDefined();
  expect(parsed.iv).toBeDefined();
  expect(parsed.authTag).toBeDefined();
  expect(parsed.version).toBe(1);
});
```

### Performance Characteristics

**Encryption Overhead**:

- **Encryption**: 1-5ms per field (< 1KB plaintext)
- **Decryption**: 1-5ms per field
- **Database Size**: ~33% increase (Base64 encoding + JSON overhead)
- **Memory**: Minimal (key stored once, decrypted data ephemeral)

**Optimization Strategies**:

1. **Lazy Decryption**: Only decrypt when UI requests field
2. **Batch Operations**: Encrypt/decrypt multiple fields in parallel
3. **Caching**: Cache decrypted values in memory with TTL (future)
4. **Hardware Acceleration**: Leverage AES-NI instructions (automatic)

---

## Security Considerations

### Threat Model

**Threats Mitigated**:

1. ✅ **Database File Theft**: Attacker cannot read PII without encryption key
2. ✅ **SQL Injection**: Encrypted data useless without key
3. ✅ **Backup Exposure**: Backups encrypted at application layer
4. ✅ **Insider Threats**: Audit logs track who accessed PII
5. ✅ **Tampering**: Authentication tag detects modified ciphertext

**Threats NOT Mitigated**:

1. ⚠️ **Runtime Memory Dump**: Decrypted data in RAM during use
2. ⚠️ **Keylogger**: Captures plaintext before encryption
3. ⚠️ **Encryption Key Theft**: If `.env` file compromised, all data readable
4. ⚠️ **Quantum Computing**: AES-256 considered quantum-resistant for now

### Migration 004: Encryption Metadata

**File**: `src/db/migrations/004_encryption_expansion.sql`

```sql
-- Documents all encrypted fields for compliance audits
CREATE TABLE encryption_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  encrypted_since TEXT NOT NULL DEFAULT (datetime('now')),
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2')),
  notes TEXT,
  UNIQUE(table_name, column_name)
);

-- Phase 1 + 3 encrypted fields
INSERT INTO encryption_metadata (table_name, column_name, priority, notes) VALUES
  ('cases', 'description', 'P0', 'Encrypted since Phase 1'),
  ('evidence', 'content', 'P0', 'Encrypted since Phase 1'),
  ('notes', 'content', 'P0', 'Encrypted since Phase 3'),
  ('chat_messages', 'content', 'P0', 'Encrypted since Phase 3'),
  ('chat_messages', 'thinking_content', 'P1', 'Encrypted since Phase 3'),
  ('user_profile', 'email', 'P0', 'Encrypted since Phase 3'),
  ('user_profile', 'name', 'P0', 'Encrypted since Phase 3'),
  ('legal_issues', 'description', 'P1', 'Encrypted since Phase 3'),
  ('timeline_events', 'description', 'P1', 'Encrypted since Phase 3');
```

### Repositories with Encryption

| Repository                 | File                                             | Encrypted Fields              | Audit Events                                     | Status       |
| -------------------------- | ------------------------------------------------ | ----------------------------- | ------------------------------------------------ | ------------ |
| CaseRepository             | `src/repositories/CaseRepository.ts`             | `description`                 | `case.create`, `case.update`, `case.pii_access`  | ✅ Phase 1   |
| EvidenceRepository         | `src/repositories/EvidenceRepository.ts`         | `content`                     | `evidence.create`, `evidence.content_access`     | ✅ Phase 1   |
| NotesRepository            | `src/repositories/NotesRepository.ts`            | `content`                     | `note.create`, `note.content_access`             | ✅ Phase 3   |
| ChatConversationRepository | `src/repositories/ChatConversationRepository.ts` | `content`, `thinking_content` | `message.create`, `message.content_access`       | ✅ Phase 3   |
| UserProfileRepository      | `src/repositories/UserProfileRepository.ts`      | `name`, `email`               | `profile.update`, `profile.pii_access`           | ✅ Phase 3   |
| LegalIssuesRepository      | `src/repositories/LegalIssuesRepository.ts`      | `description`                 | `legal_issue.create`, `legal_issue.update`       | ✅ Phase 3   |
| TimelineRepository         | `src/repositories/TimelineRepository.ts`         | `description`                 | `timeline_event.create`, `timeline_event.update` | ✅ Phase 3   |
| UserFactsRepository        | `src/repositories/UserFactsRepository.ts`        | `fact_content`                | `user_fact.create`, `user_fact.update`           | ✅ Phase 3.5 |
| CaseFactsRepository        | `src/repositories/CaseFactsRepository.ts`        | `fact_content`                | `case_fact.create`, `case_fact.update`           | ✅ Phase 3.5 |

---

## Future Enhancements

### Post-Phase 3 Roadmap

1. **Per-User Encryption**: Derive keys from user passwords (key derivation function)
2. **Hardware Security Module (HSM)**: Enterprise key storage for large deployments
3. **Searchable Encryption**: Homomorphic encryption for queries without decryption
4. **Zero-Knowledge Proof**: Prove data integrity without decrypting
5. **Key Rotation Scheduler**: Automatic periodic rotation with minimal downtime
6. **Encryption at Column Level**: Transparent encryption via SQLCipher (full database)
7. **Multi-Key Support**: Different keys for different sensitivity levels

---

## References

- **NIST SP 800-38D**: GCM Mode Specification
- **FIPS 140-2**: Cryptographic Module Validation
- **GDPR Article 32**: Security of Processing
- **OWASP Cryptographic Storage Cheat Sheet**: Best practices
- **RFC 5116**: Authenticated Encryption with Associated Data (AEAD)

---

## Key Files Reference

### Core Implementation

- `src/services/EncryptionService.ts` (216 lines) - AES-256-GCM implementation
- `src/services/EncryptionService.test.ts` (388 lines) - Comprehensive test suite

### Repository Integration (Phases 1-3.5)

- `src/repositories/CaseRepository.ts` - Cases with encrypted descriptions
- `src/repositories/EvidenceRepository.ts` - Evidence with encrypted content
- `src/repositories/NotesRepository.ts` (265 lines) - Notes with encrypted content
- `src/repositories/ChatConversationRepository.ts` - Chat messages encrypted
- `src/repositories/UserProfileRepository.ts` - User profile PII encrypted
- `src/repositories/LegalIssuesRepository.ts` (260 lines) - Legal issues encrypted
- `src/repositories/TimelineRepository.ts` (258 lines) - Timeline events encrypted
- `src/repositories/UserFactsRepository.ts` (337 lines) - User facts encrypted
- `src/repositories/CaseFactsRepository.ts` (385 lines) - Case facts encrypted

### Tests

- `src/repositories/NotesRepository.test.ts` (285 lines)
- `src/repositories/Phase3Repositories.test.ts` (420 lines)
- `src/repositories/UserFactsRepository.test.ts` (570 lines)
- `src/repositories/CaseFactsRepository.test.ts` (682 lines)
- `src/repositories/FactsRepositories.test.ts` (636 lines)

### Migrations

- `src/db/migrations/004_encryption_expansion.sql` - Encryption metadata table

### Documentation

- `ENCRYPTION_IMPLEMENTATION.md` (archived) - Original Phase 1-3 documentation
- `ENCRYPTION_COVERAGE_REPORT.md` (archived) - Risk assessment and coverage audit
- `FACTS_FEATURE_IMPLEMENTATION.md` - Phase 3.5 facts feature with encryption

---

## Conclusion

**Status**: ✅ **ENCRYPTION SYSTEM COMPLETE**

The encryption system is fully operational with:

- ✅ 11 fields encrypted across 8 tables
- ✅ AES-256-GCM with authenticated encryption
- ✅ GDPR Article 32 compliance
- ✅ Comprehensive audit logging (no PII leakage)
- ✅ Backward compatibility with legacy plaintext data
- ✅ 450% increase in encrypted field coverage (2 → 11 fields)
- ✅ Production-ready implementation

**Coverage**: P0 (Critical PII) fields encrypted, P1 (Important) fields encrypted, comprehensive protection.

**Production-Ready**: Yes. Encryption service tested and integrated across all repositories.

---

**Document Version**: 2.0 (Consolidated)
**Sources**:

- `ENCRYPTION_IMPLEMENTATION.md`
- `ENCRYPTION_COVERAGE_REPORT.md`
- `FACTS_FEATURE_IMPLEMENTATION.md`

**Last Updated**: 2025-10-09
**Total Encrypted Fields**: 11 (Phase 1: 2, Phase 3: 7, Phase 3.5: 2)
