# GDPR Compliance Services

Python implementation of GDPR Articles 17 (Right to Erasure) and 20 (Data Portability) for Justice Companion.

## Overview

This module provides comprehensive GDPR compliance services with:

- **Data Export** (Article 20): Export all user data in machine-readable JSON format
- **Data Deletion** (Article 17): Securely delete all user data with transactional safety
- **Rate Limiting**: Prevent abuse (5 exports/24h, 1 deletion/30d)
- **Consent Management**: Verify user consent before operations
- **Audit Logging**: Immutable blockchain-style audit trail
- **Export-Before-Delete**: Automatic backup workflow

## Files

```
backend/services/gdpr/
├── gdpr_service.py          # Main orchestration service
├── data_exporter.py         # Article 20 implementation
├── data_deleter.py          # Article 17 implementation
├── test_gdpr_service.py     # Integration tests
├── example_usage.py         # Usage examples
└── README.md                # This file
```

## Quick Start

### 1. Initialize Services

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.services.gdpr import create_gdpr_service
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger

# Create database session
engine = create_engine("sqlite:///justice_companion.db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Initialize dependencies
encryption_service = EncryptionService(encryption_key)
audit_logger = AuditLogger(db)

# Create GDPR service
gdpr_service = create_gdpr_service(
    db=db,
    encryption_service=encryption_service,
    audit_logger=audit_logger
)
```

### 2. Export User Data (Article 20)

```python
from backend.services.gdpr import GdprExportOptions

# Export all user data to JSON
export_result = await gdpr_service.export_user_data(
    user_id=123,
    options=GdprExportOptions(export_format="json")
)

print(f"Total records: {export_result.metadata['totalRecords']}")
print(f"Saved to: {export_result.file_path}")
```

### 3. Delete User Data (Article 17)

```python
from backend.services.gdpr import GdprDeleteOptions

# Delete all user data (IRREVERSIBLE!)
delete_result = await gdpr_service.delete_user_data(
    user_id=123,
    options=GdprDeleteOptions(
        confirmed=True,  # MUST be True
        reason="User requested account deletion"
    )
)

print(f"Deleted: {sum(delete_result.deleted_counts.values())} records")
```

## Features

### Data Export (Article 20)

**Exported Tables** (13 total):
- `users`, `cases`, `evidence`, `legal_issues`, `timeline_events`
- `actions`, `notes`, `chat_conversations`, `chat_messages`
- `user_facts`, `case_facts`, `sessions`, `consents`

**Security**: Password hashes **NEVER** exported, encrypted fields auto-decrypted

**Rate Limit**: 5 exports per 24 hours per user

### Data Deletion (Article 17)

**Deletion Order** (respects foreign keys):
- Bottom-up deletion across 15 tables
- Transactional safety (all-or-nothing)
- Preserves audit logs and consent records (legal requirement)

**Safety**: Requires explicit `confirmed=True` flag

## Testing

```bash
pytest backend/services/gdpr/test_gdpr_service.py -v
```

## Migration from TypeScript

Direct port from TypeScript with identical functionality:
- `GdprService.ts` → `gdpr_service.py`
- `DataExporter.ts` → `data_exporter.py`
- `DataDeleter.ts` → `data_deleter.py`

## License

Proprietary - Justice Companion © 2025
