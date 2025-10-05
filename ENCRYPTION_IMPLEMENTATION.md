# Encryption Implementation Documentation
**Justice Companion - AES-256-GCM Encryption Service**
**Version**: Phase 3 Complete
**Last Updated**: 2025-10-05

---

## Overview

Justice Companion implements **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) for protecting sensitive user data at rest. This document covers the complete encryption architecture, including Phase 3 expansion to all PII fields.

---

## Encrypted Fields by Table

### Phase 1: Initial Encryption (COMPLETE)

| Table | Field | Priority | Encrypted Since |
|-------|-------|----------|-----------------|
| `cases` | `description` | P0 | Phase 1 (Commit 1a0e66f) |
| `evidence` | `content` | P0 | Phase 1 (Commit 15663d2) |

### Phase 3: Encryption Expansion (COMPLETE)

| Table | Field | Priority | Encrypted Since |
|-------|-------|----------|-----------------|
| `notes` | `content` | P0 | Phase 3 |
| `chat_messages` | `content` | P0 | Phase 3 |
| `chat_messages` | `thinking_content` | P1 | Phase 3 |
| `user_profile` | `name` | P0 | Phase 3 |
| `user_profile` | `email` | P0 | Phase 3 |
| `legal_issues` | `description` | P1 | Phase 3 |
| `timeline_events` | `description` | P1 | Phase 3 |

**Total Encrypted Fields**: 9 fields across 6 tables

---

## Encryption Algorithm: AES-256-GCM

### Security Properties

- **Algorithm**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits (32 bytes)
- **Mode**: GCM (Galois/Counter Mode)
- **IV Length**: 96 bits (12 bytes)
- **Authentication**: AEAD (Authenticated Encryption with Associated Data)
- **Random IVs**: Unique cryptographically secure IV per encryption operation

### Why AES-256-GCM?

1. **NIST Approved**: FIPS 140-2 compliant
2. **Authenticated Encryption**: Detects tampering via auth tag
3. **Performance**: Hardware-accelerated on modern CPUs (AES-NI)
4. **Industry Standard**: Used by Signal, WhatsApp, TLS 1.3
5. **GDPR Compliant**: Satisfies Article 32 requirements

---

## Architecture

### EncryptionService Class

**Location**: `src/services/EncryptionService.ts`

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

### EncryptedData Format

```typescript
export interface EncryptedData {
  algorithm: 'aes-256-gcm';
  ciphertext: string;    // Base64-encoded encrypted data
  iv: string;            // Base64-encoded initialization vector
  authTag: string;       // Base64-encoded authentication tag
  version: number;       // Algorithm version (future-proofing)
}
```

**Storage Format**: JSON-serialized EncryptedData in existing TEXT columns

Example stored value:
```json
{
  "algorithm": "aes-256-gcm",
  "ciphertext": "rL5K8kMzW3+...",
  "iv": "xGH9kP2mN5==",
  "authTag": "zY7mQ4sPn1==",
  "version": 1
}
```

---

## Repository Integration Pattern

All repositories follow this pattern:

### Encrypt Before INSERT/UPDATE

```typescript
create(input: CreateInput): Entity {
  const encryptedContent = input.content
    ? this.encryptionService?.encrypt(input.content)
    : null;

  const contentToStore = encryptedContent
    ? JSON.stringify(encryptedContent)
    : null;

  db.prepare('INSERT INTO table (content) VALUES (?)').run(contentToStore);
}
```

### Decrypt After SELECT

```typescript
findById(id: number): Entity | null {
  const row = db.prepare('SELECT * FROM table WHERE id = ?').get(id);

  if (row) {
    row.content = this.decryptField(row.content);
  }

  return row;
}

private decryptField(storedValue: string | null): string | null {
  if (!storedValue) return null;

  if (!this.encryptionService) {
    // Backward compatibility: no encryption service
    return storedValue;
  }

  try {
    const encryptedData = JSON.parse(storedValue);

    if (this.encryptionService.isEncrypted(encryptedData)) {
      return this.encryptionService.decrypt(encryptedData);
    }

    // Legacy plaintext data
    return storedValue;
  } catch {
    // JSON parse failed, likely legacy plaintext
    return storedValue;
  }
}
```

---

## Repositories with Encryption (Phase 3)

### 1. CaseRepository
**File**: `src/repositories/CaseRepository.ts`
**Encrypted Fields**: `description`
**Audit Events**: `case.create`, `case.update`, `case.delete`, `case.pii_access`

### 2. EvidenceRepository
**File**: `src/repositories/EvidenceRepository.ts`
**Encrypted Fields**: `content`
**Audit Events**: `evidence.create`, `evidence.update`, `evidence.delete`, `evidence.content_access`

### 3. NotesRepository (NEW - Phase 3)
**File**: `src/repositories/NotesRepository.ts`
**Encrypted Fields**: `content`
**Audit Events**: `note.create`, `note.update`, `note.delete`, `note.content_access`

### 4. ChatConversationRepository (UPDATED - Phase 3)
**File**: `src/repositories/ChatConversationRepository.ts`
**Encrypted Fields**: `content`, `thinking_content`
**Audit Events**: `message.create`, `message.content_access`

### 5. UserProfileRepository (UPDATED - Phase 3)
**File**: `src/repositories/UserProfileRepository.ts`
**Encrypted Fields**: `name`, `email`
**Audit Events**: `profile.update`, `profile.pii_access`

### 6. LegalIssuesRepository (NEW - Phase 3)
**File**: `src/repositories/LegalIssuesRepository.ts`
**Encrypted Fields**: `description`
**Audit Events**: `legal_issue.create`, `legal_issue.update`, `legal_issue.delete`

### 7. TimelineRepository (NEW - Phase 3)
**File**: `src/repositories/TimelineRepository.ts`
**Encrypted Fields**: `description`
**Audit Events**: `timeline_event.create`, `timeline_event.update`, `timeline_event.delete`

---

## Key Management

### Encryption Key Generation

```bash
# Generate new 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### .env Configuration

```bash
# .env file (NEVER commit to git)
ENCRYPTION_KEY_BASE64=your_base64_encoded_32_byte_key_here
```

### Key Loading (Application Startup)

```typescript
// electron/main.ts or similar
import { EncryptionService } from './services/EncryptionService';
import dotenv from 'dotenv';

dotenv.config();

const encryptionKey = process.env.ENCRYPTION_KEY_BASE64;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY_BASE64 not found in .env');
}

const encryptionService = new EncryptionService(encryptionKey);

// Inject into repositories
caseRepository.setEncryptionService(encryptionService);
evidenceRepository.setEncryptionService(encryptionService);
notesRepository.setEncryptionService(encryptionService);
// ... etc
```

### Security Considerations

1. **Key Storage**:
   - Stored in `.env` file (excluded from git via `.gitignore`)
   - OS-level file permissions protect `.env`
   - Future: OS keychain integration (Keytar, electron-store with encryption)

2. **Key Rotation**:
   - Use `EncryptionService.rotateKey()` method
   - Batch re-encrypt all encrypted fields
   - Requires downtime or read-only mode during rotation

3. **Key Compromise**:
   - If key leaked: immediate rotation required
   - All encrypted data must be re-encrypted with new key
   - Audit logs track who accessed PII

---

## Backward Compatibility

### Legacy Plaintext Data

Repositories handle three data states:

1. **Encrypted (EncryptedData JSON)**: Decrypt normally
2. **Legacy Plaintext**: Return as-is, no decryption
3. **NULL/Empty**: Return NULL

This allows gradual migration from plaintext to encrypted storage.

### Migration from Plaintext to Encrypted

```typescript
// Example: Encrypt all existing plaintext notes
const notes = db.prepare('SELECT id, content FROM notes').all();

for (const note of notes) {
  const encrypted = encryptionService.encrypt(note.content);
  const stored = JSON.stringify(encrypted);

  db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(stored, note.id);
}
```

---

## Audit Logging Integration

### PII Access Tracking

All repositories log PII access:

```typescript
// After decrypting PII
if (originalValue && decryptedValue !== originalValue) {
  this.auditLogger?.log({
    eventType: 'note.content_access',
    resourceType: 'note',
    resourceId: id.toString(),
    action: 'read',
    details: { field: 'content', encrypted: true },
    success: true,
  });
}
```

### GDPR Compliance

- **Audit logs contain NO decrypted PII**
- Only metadata logged: field name, resource ID, timestamp
- Satisfies GDPR Article 30 (Records of Processing Activities)

---

## Testing

### Unit Tests

**Location**: `src/repositories/*.test.ts`

Coverage:
- Encrypt → Decrypt round-trip
- Backward compatibility with plaintext
- Empty/NULL handling
- Audit log verification (no PII leakage)
- Authentication tag tampering detection

### Test Example

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
});
```

---

## Performance Characteristics

### Encryption Overhead

- **Encryption**: 1-5ms per field (< 1KB plaintext)
- **Decryption**: 1-5ms per field
- **Database Impact**: ~33% size increase (Base64 encoding + JSON overhead)

### Optimization Strategies

1. **Lazy Decryption**: Only decrypt when UI requests field
2. **Batch Operations**: Encrypt/decrypt multiple fields in parallel
3. **Caching**: Cache decrypted values in memory (with TTL)

---

## Migration 004: Encryption Expansion

**File**: `src/db/migrations/004_encryption_expansion.sql`

```sql
-- Creates encryption_metadata table to document encrypted fields
-- No schema changes (uses existing TEXT columns)

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

---

## Security Threat Model

### Threats Mitigated

1. **Database File Theft**: Attacker cannot read PII without encryption key
2. **SQL Injection**: Encrypted data useless without key
3. **Backup Exposure**: Backups encrypted at application layer
4. **Insider Threats**: Audit logs track who accessed PII

### Threats NOT Mitigated

1. **Runtime Memory Dump**: Decrypted data in RAM during use
2. **Keylogger**: Capture plaintext before encryption
3. **Encryption Key Theft**: If `.env` file compromised, all data readable
4. **Quantum Computing**: AES-256 considered quantum-resistant for now

---

## Future Enhancements

### Post-Phase 3 Roadmap

1. **Per-User Encryption**: Derive keys from user passwords
2. **Hardware Security Module (HSM)**: Enterprise key storage
3. **Searchable Encryption**: Homomorphic encryption for queries
4. **Zero-Knowledge Proof**: Prove data integrity without decrypting
5. **Key Rotation Scheduler**: Automatic periodic rotation
6. **Encryption at Column Level**: Transparent encryption via SQLCipher

---

## References

- **NIST SP 800-38D**: GCM Mode Specification
- **FIPS 140-2**: Cryptographic Module Validation
- **GDPR Article 32**: Security of Processing
- **OWASP Cryptographic Storage Cheat Sheet**

---

**Document Version**: 2.0 (Phase 3 Complete)
**Author**: Agent Hotel (Database & Migration Specialist)
**Status**: Production Ready
**Next Review**: Post-Deployment Security Audit
