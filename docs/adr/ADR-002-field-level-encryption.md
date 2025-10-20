# ADR-002: Field-Level Encryption with AES-256-GCM

## Status
Accepted

## Date
2024-02-01

## Context
Justice Companion stores sensitive legal data including case details, evidence, and personal information. GDPR compliance and user privacy require encryption of sensitive data at rest. We need to balance security, performance, and searchability.

Requirements:
- GDPR Article 32: Appropriate technical measures for data protection
- Protect sensitive fields (case details, evidence, personal info)
- Maintain reasonable query performance
- Allow some fields to remain unencrypted for searching
- Support key rotation for long-term security

## Decision
Implement field-level encryption using AES-256-GCM for 11 identified sensitive fields across the database schema. Non-sensitive metadata remains unencrypted for querying.

Encrypted fields:
1. `cases.title` - Case titles may contain identifying information
2. `cases.description` - Detailed case information
3. `evidence.title` - Evidence descriptions
4. `evidence.file_path` - File locations
5. `evidence.content` - Evidence content
6. `legal_issues.description` - Legal issue details
7. `timeline_events.description` - Event descriptions
8. `user_facts.content` - Personal facts
9. `case_facts.content` - Case-specific facts
10. `chat_conversations.messages` - AI chat history (optional)
11. `documents.content` - Document contents

## Consequences

### Positive
- **GDPR compliance**: Meets Article 32 requirements for data protection
- **Selective encryption**: Performance optimization by encrypting only sensitive fields
- **Authenticated encryption**: GCM mode provides integrity verification
- **Standard algorithm**: AES-256 is industry standard, FIPS 140-2 approved
- **Key management**: Single master key simplifies management
- **Tampering detection**: Authentication tag detects any modifications

### Negative
- **No searching encrypted fields**: Cannot use SQL WHERE on encrypted columns
- **Performance overhead**: 15-20% slower for encrypted field operations
- **Key management complexity**: Must securely store and rotate keys
- **Storage overhead**: ~40% increase for encrypted fields (Base64 encoding)
- **Migration complexity**: Existing data must be encrypted
- **No partial updates**: Must decrypt-modify-reencrypt entire field

## Alternatives Considered

### Transparent Database Encryption (TDE)
- **Pros**: Encrypts entire database, transparent to application
- **Cons**: All-or-nothing approach, no field selectivity
- **Rejected because**: Cannot search any data, excessive performance impact

### Application-Level Full Encryption
- **Pros**: Maximum security, simple conceptually
- **Cons**: No searching, major performance impact
- **Rejected because**: Unusable for a case management system

### Homomorphic Encryption
- **Pros**: Allows operations on encrypted data
- **Cons**: Experimental, 1000x+ performance overhead
- **Rejected because**: Not production-ready, impractical performance

### Tokenization
- **Pros**: Can maintain searchability
- **Cons**: Requires token vault, complex implementation
- **Rejected because**: Overcomplicated for desktop application

### No Encryption
- **Pros**: Full functionality, best performance
- **Cons**: GDPR non-compliance, privacy risk
- **Rejected because**: Legal and ethical requirements

## Implementation Details

### Encryption Service
```typescript
class EncryptionService {
  - Algorithm: AES-256-GCM
  - Key size: 256 bits (32 bytes)
  - IV size: 96 bits (12 bytes)
  - Auth tag: 128 bits (16 bytes)
  - Encoding: Base64 for storage
}
```

### Key Management
- Master key stored in environment variable
- Key derivation using PBKDF2 for future key rotation
- Separate keys per user in future versions

### Data Format
```json
{
  "algorithm": "aes-256-gcm",
  "ciphertext": "base64_encrypted_data",
  "iv": "base64_initialization_vector",
  "authTag": "base64_authentication_tag",
  "version": 1
}
```

### Search Strategy
- Maintain unencrypted search indices for encrypted fields
- Use full-text search (FTS5) on sanitized content
- Implement client-side filtering for sensitive searches

## Security Considerations
- Keys never logged or transmitted
- IV must be unique for each encryption operation
- Authentication tag must be verified on decryption
- Failed decryption should fail closed (return null, not error)
- Implement key rotation mechanism for long-term security

## Performance Impact
- Encryption: ~0.5ms per field
- Decryption: ~0.3ms per field
- Storage: 40% overhead (Base64 encoding)
- Memory: Negligible (< 1KB per operation)

## Migration Path
1. Add encrypted field columns to schema
2. Implement EncryptionService
3. Migrate existing data in batches
4. Switch application to use encrypted fields
5. Remove unencrypted columns after verification

## References
- [NIST Special Publication 800-38D (GCM)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [GDPR Article 32 - Security of processing](https://gdpr-info.eu/art-32-gdpr/)