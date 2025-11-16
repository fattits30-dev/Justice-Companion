# DataExporter - GDPR Article 20 Implementation

## Overview

The `DataExporter` service implements GDPR Article 20 (Right to Data Portability) by providing a comprehensive system for exporting all user data in a machine-readable format.

**Migrated from:** `src/services/gdpr/DataExporter.ts`

## Features

- **Comprehensive Data Export**: Exports from 13 database tables
- **Automatic Decryption**: Decrypts all encrypted fields using EncryptionService
- **Security-First Design**: Never exports passwords or session tokens
- **Machine-Readable Format**: JSON output with structured metadata
- **Schema Version Tracking**: Includes database schema version for compatibility
- **GDPR Compliant**: Meets all requirements of Article 20

## Installation

The DataExporter requires the following dependencies:

```bash
pip install sqlalchemy cryptography
```

## Usage

### Basic Usage

```python
from sqlalchemy.orm import Session
from backend.services.encryption_service import EncryptionService
from backend.services.gdpr.data_exporter import DataExporter, GdprExportOptions

# Initialize services
encryption_service = EncryptionService(encryption_key)
exporter = DataExporter(db, encryption_service)

# Export all user data
export_result = exporter.export_all_user_data(user_id=1)

# Save to file
exporter.save_to_file(export_result, "exports/user-1-export.json")
```

### With Custom Options

```python
from backend.services.gdpr.data_exporter import GdprExportOptions

# Create custom options
options = GdprExportOptions(
    export_format="json",
    include_files=False,
    date_range=None  # Optional date filtering
)

# Export with options
export_result = exporter.export_all_user_data(
    user_id=1,
    options=options
)
```

### FastAPI Integration

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

@router.post("/api/gdpr/export")
async def export_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """GDPR Article 20 - Export user data."""
    try:
        # Create exporter
        exporter = DataExporter(db, encryption_service)

        # Export data
        export_result = exporter.export_all_user_data(user_id)

        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = f"exports/user-{user_id}-export-{timestamp}.json"
        exporter.save_to_file(export_result, file_path)

        # Log audit event
        audit_logger.log(
            event_type="gdpr.data_export",
            user_id=str(user_id),
            resource_type="user",
            resource_id=str(user_id),
            action="export",
            details={
                "total_records": export_result.metadata.total_records,
                "file_path": file_path
            },
            success=True
        )

        return {
            "success": True,
            "metadata": export_result.metadata.to_dict(),
            "file_path": file_path
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export user data: {str(e)}"
        )
```

## Exported Data

The DataExporter exports data from the following 13 tables:

### 1. User Profile
**Table:** `users`
**Fields:** id, username, email, created_at, updated_at, last_login_at
**Security:** Password hashes are NEVER exported

### 2. Cases
**Table:** `cases`
**Decrypts:** description (if encrypted)
**Includes:** All cases owned by user

### 3. Evidence
**Table:** `evidence`
**Decrypts:** content (if encrypted)
**Includes:** All evidence for user's cases

### 4. Legal Issues
**Table:** `legal_issues`
**Includes:** All legal issues for user's cases

### 5. Timeline Events
**Table:** `timeline_events`
**Decrypts:** description (if encrypted)
**Includes:** All timeline events for user's cases

### 6. Actions
**Table:** `actions`
**Decrypts:** description (if encrypted)
**Includes:** All actions for user's cases

### 7. Notes
**Table:** `notes`
**Decrypts:** content (if encrypted)
**Includes:** All notes for user's cases

### 8. Chat Conversations
**Table:** `chat_conversations`
**Includes:** All chat conversations for user

### 9. Chat Messages
**Table:** `chat_messages`
**Decrypts:** message, response (if encrypted)
**Includes:** All messages in user's conversations

### 10. User Facts
**Table:** `user_facts`
**Includes:** All facts associated with user

### 11. Case Facts
**Table:** `case_facts`
**Includes:** All facts for user's cases

### 12. Sessions
**Table:** `sessions`
**Fields:** id, user_id, created_at, expires_at, ip_address, user_agent
**Security:** Session tokens are NEVER exported

### 13. Consents
**Table:** `consents`
**Includes:** All consent records (required by GDPR)

## Export Format

The export produces a JSON file with the following structure:

```json
{
  "metadata": {
    "exportDate": "2024-11-13T12:00:00.000Z",
    "userId": 1,
    "schemaVersion": "010",
    "format": "json",
    "totalRecords": 42
  },
  "userData": {
    "profile": {
      "tableName": "users",
      "records": [...],
      "count": 1
    },
    "cases": {
      "tableName": "cases",
      "records": [...],
      "count": 5
    },
    "evidence": {
      "tableName": "evidence",
      "records": [...],
      "count": 12
    },
    // ... other tables
  }
}
```

## Classes and Types

### DataExporter

Main service class for exporting user data.

**Constructor:**
```python
DataExporter(db: Session, encryption_service: EncryptionService)
```

**Methods:**

- `export_all_user_data(user_id: int, options: GdprExportOptions = None) -> UserDataExport`
  - Export all user data from 13 tables
  - Automatically decrypts encrypted fields
  - Returns structured export object

- `save_to_file(export_data: UserDataExport, file_path: str) -> None`
  - Save exported data to JSON file
  - Creates parent directories if needed
  - Raises IOError if file cannot be written

### GdprExportOptions

Options for customizing the export.

```python
class GdprExportOptions:
    format: str = "json"           # Export format
    include_files: bool = False    # Include file attachments
    date_range: Dict[str, str] = None  # Optional date filter
```

### UserDataExport

Complete export result with metadata and data.

```python
class UserDataExport:
    metadata: ExportMetadata
    user_data: Dict[str, TableExport]

    def to_dict(self) -> Dict[str, Any]
```

### ExportMetadata

Metadata about the export operation.

```python
class ExportMetadata:
    export_date: str        # ISO 8601 timestamp
    user_id: int           # User ID
    schema_version: str    # Database schema version
    format: str            # Export format
    total_records: int     # Total record count
```

### TableExport

Exported data from a single table.

```python
class TableExport:
    table_name: str                  # Table name
    records: List[Dict[str, Any]]   # Exported records
    count: int                       # Record count
```

## Security Considerations

### What is NOT Exported

1. **Password Hashes**: Never exported for security reasons
2. **Session Tokens**: Never exported to prevent session hijacking
3. **Encryption Keys**: Never stored in export data

### What IS Decrypted

All encrypted fields are automatically decrypted before export:

- Case descriptions
- Evidence content
- Timeline event descriptions
- Action descriptions
- Note content
- Chat messages and responses

### Access Control

Always implement proper access control:

```python
# Verify user identity
if current_user.id != user_id:
    raise HTTPException(status_code=403, detail="Unauthorized")

# Check GDPR consent
consent = db.query(Consent).filter(
    Consent.user_id == user_id,
    Consent.consent_type == "data_processing",
    Consent.granted == True
).first()

if not consent:
    raise HTTPException(status_code=400, detail="Data processing consent required")

# Export data
export_result = exporter.export_all_user_data(user_id)
```

### Audit Logging

Always log export operations:

```python
from backend.services.audit_logger import AuditLogger

audit_logger.log(
    event_type="gdpr.data_export",
    user_id=str(user_id),
    resource_type="user",
    resource_id=str(user_id),
    action="export",
    details={
        "total_records": export_result.metadata.total_records,
        "file_path": file_path
    },
    success=True
)
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```python
from backend.services.rate_limit_service import RateLimitService

# Check rate limit (e.g., 5 exports per 24 hours)
rate_limiter = RateLimitService(db)
if not rate_limiter.check_rate_limit(user_id, "export", max_attempts=5, window_hours=24):
    raise HTTPException(
        status_code=429,
        detail="Export rate limit exceeded. Try again in 24 hours."
    )
```

### File Storage Security

Secure exported files:

```python
import os
from pathlib import Path

# Create secure exports directory
exports_dir = Path("exports")
exports_dir.mkdir(exist_ok=True, mode=0o700)  # Owner-only access

# Generate secure filename
file_path = exports_dir / f"user-{user_id}-export-{timestamp}.json"

# Set file permissions (owner-only read/write)
os.chmod(file_path, 0o600)

# Delete after download or retention period
# (Implement based on your retention policy)
```

## Testing

Run the test suite:

```bash
# Run DataExporter tests with mock data
python backend/services/gdpr/test_data_exporter.py

# View usage examples
python backend/services/gdpr/example_data_exporter_usage.py
```

## GDPR Compliance

The DataExporter meets all GDPR Article 20 requirements:

1. **Machine-Readable Format**: JSON output that can be easily parsed
2. **Complete Data**: Exports all personal data across all tables
3. **Structured Format**: Organized by table with clear metadata
4. **No Omissions**: All user-associated data is included
5. **Decrypted Data**: All encrypted fields are decrypted for portability
6. **Consent Records**: Preserves consent history as required by law
7. **Schema Version**: Includes version for compatibility tracking

### Compliance Checklist

- [x] Export all personal data
- [x] Machine-readable format (JSON)
- [x] Include metadata (export date, user ID, schema version)
- [x] Decrypt encrypted fields
- [x] Never export passwords or tokens
- [x] Preserve consent records
- [x] Support audit logging
- [x] Include record counts
- [x] Convert timestamps to ISO 8601

## Troubleshooting

### Import Errors

If you encounter import errors:

```python
# Add backend to Python path
import sys
from pathlib import Path

backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))
```

### Decryption Failures

If decryption fails, check:

1. Encryption key is correct and matches the key used for encryption
2. Encrypted data format is valid (has ciphertext, iv, authTag)
3. Data hasn't been corrupted or tampered with

### Empty Exports

If exports are empty:

1. Verify user ID exists in database
2. Check user has associated data in tables
3. Verify database connection is working
4. Check query filters are correct

### File Save Errors

If file save fails:

1. Check parent directory exists or can be created
2. Verify write permissions on target directory
3. Check disk space is available
4. Ensure file path is valid for the OS

## Performance

The DataExporter is optimized for performance:

- **Single Query per Table**: Each table export uses one SQL query
- **Lazy Loading**: Data is only fetched when needed
- **Efficient Decryption**: Decrypts only fields that are actually encrypted
- **Streaming**: Can be extended to stream large exports

For very large exports (>10,000 records), consider:

1. Implementing pagination
2. Streaming JSON output
3. Compressing export files
4. Background job processing

## Related Services

- **GdprService**: Orchestrates export and deletion with rate limiting
- **DataDeleter**: Implements GDPR Article 17 (Right to Erasure)
- **EncryptionService**: Handles field-level encryption/decryption
- **AuditLogger**: Provides immutable audit trail

## License

This code is part of Justice Companion and follows the project's license terms.

## Support

For issues or questions:

1. Check this README
2. Review test_data_exporter.py for examples
3. Check example_data_exporter_usage.py for patterns
4. Review GDPR compliance documentation
