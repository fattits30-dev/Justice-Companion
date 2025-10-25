# Evidence Domain

## Overview

The Evidence domain manages all evidence-related functionality including document uploads, evidence categorization, file management, and chain of custody tracking for legal cases.

## Domain Components

### Entities

- **Evidence** (`entities/Evidence.ts`): Core entity representing evidence items with file paths, content, type, and obtained dates

### Value Objects

- **EvidenceType** (`value-objects/EvidenceType.ts`): Validates evidence types (document, photo, email, recording, note, witness) and provides type-specific rules

### Domain Events

- **EvidenceUploaded** (`events/EvidenceUploaded.ts`): Fired when new evidence is uploaded to a case

## Business Rules

### Evidence Types and Constraints

| Type | Max File Size | Allowed Extensions | Requires File |
|------|--------------|-------------------|---------------|
| Document | 10MB | .pdf, .doc, .docx, .txt, .rtf, .odt | Yes |
| Photo | 5MB | .jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp | Yes |
| Email | 5MB | .eml, .msg, .txt, .pdf | Yes |
| Recording | 100MB | .mp3, .wav, .m4a, .mp4, .avi, .mov, .webm | Yes |
| Note | 1MB | .txt, .md, .rtf | No |
| Witness | 10MB | .pdf, .doc, .docx, .txt | No |

### Evidence Management Rules
- Evidence must be associated with a case
- File paths are encrypted at rest for security
- Evidence cannot be modified once uploaded (immutability)
- Original files are preserved for chain of custody
- Metadata tracked: upload date, obtained date, file size

## Dependencies

- Requires cases domain (evidence belongs to cases)
- Uses encryption service for sensitive file paths
- Integrates with file storage service
- Audit logging for all evidence operations

## Security Considerations

- File paths encrypted with AES-256-GCM
- Content field encrypted for sensitive notes
- Virus scanning on file uploads (planned)
- Access control through case ownership
- Secure file storage with restricted permissions
- Chain of custody tracking with audit logs

## Usage Examples

```typescript
import { Evidence, EvidenceType } from '@/domains/evidence';

// Create evidence type
const docType = EvidenceType.document();

// Check file requirements
const requiresFile = docType.requiresFile(); // true
const allowedExts = docType.getAllowedExtensions(); // ['.pdf', '.doc', ...]
const maxSize = docType.getMaxFileSize(); // 10485760 bytes (10MB)

// Create evidence record
const evidence: Evidence = {
  id: 1,
  caseId: 42,
  title: 'Employment Contract',
  filePath: '/secure/evidence/contract.pdf',
  content: null,
  evidenceType: docType.getValue(),
  obtainedDate: '2024-01-15',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Evidence upload event
const uploadEvent = EvidenceUploaded.fromEntity(evidence, userId);
```

## File Storage Strategy

- Local storage in user data directory
- Organized by case: `/evidence/{caseId}/{evidenceId}/`
- Original filenames preserved with UUID prefix
- Thumbnails generated for images (planned)
- Automatic backup before deletion

## Testing

- Unit tests for evidence type validation
- Integration tests for file upload/download
- E2E tests for evidence management workflow
- Mock file system for testing
- Test coverage target: 80%+

## Future Enhancements

- OCR for scanned documents
- Audio transcription for recordings
- Evidence tagging and categorization
- Bulk evidence upload
- Evidence comparison tools
- Digital signature verification
- Blockchain-based chain of custody