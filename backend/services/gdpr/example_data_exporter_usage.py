"""
DataExporter Usage Examples

This script demonstrates how to use the DataExporter service
for GDPR Article 20 (Data Portability) compliance.

Usage examples:
1. Basic export of all user data
2. Export with custom options
3. Export with encrypted field decryption
4. Save to file with custom path
"""

import json
from pathlib import Path
from datetime import datetime

# Import DataExporter and GdprExportOptions
from backend.services.gdpr.data_exporter import DataExporter, GdprExportOptions


def example_1_basic_export(db, encryption_service):
    """
    Example 1: Basic export of all user data.

    This is the simplest use case - export all data for a user
    with default options (JSON format).
    """
    print("\n=== Example 1: Basic Export ===")

    exporter = DataExporter(db, encryption_service)

    # Export all user data
    export_result = exporter.export_all_user_data(user_id=1)

    print(f"Exported {export_result.metadata.total_records} total records")
    print(f"Export date: {export_result.metadata.export_date}")
    print(f"Schema version: {export_result.metadata.schema_version}")

    # Show table counts
    print("\nRecords by table:")
    for table_name, table_export in export_result.user_data.items():
        if table_export.count > 0:
            print(f"  - {table_name}: {table_export.count} records")

    return export_result


def example_2_export_with_options(db, encryption_service):
    """
    Example 2: Export with custom options.

    Demonstrates how to use GdprExportOptions to customize the export.
    """
    print("\n=== Example 2: Export with Options ===")

    exporter = DataExporter(db, encryption_service)

    # Create custom export options
    options = GdprExportOptions(
        export_format="json",
        include_files=False,
        date_range=None,  # Could filter by date range if needed
    )

    # Export with options
    export_result = exporter.export_all_user_data(user_id=1, options=options)

    print(f"Exported in {options.format} format")
    print(f"Total records: {export_result.metadata.total_records}")

    return export_result


def example_3_inspect_decrypted_data(db, encryption_service):
    """
    Example 3: Export with encrypted field decryption.

    Demonstrates how the DataExporter automatically decrypts
    encrypted fields during export.
    """
    print("\n=== Example 3: Inspect Decrypted Data ===")

    exporter = DataExporter(db, encryption_service)

    # Export user data
    export_result = exporter.export_all_user_data(user_id=1)

    # Inspect decrypted case data
    if export_result.user_data["cases"].count > 0:
        case = export_result.user_data["cases"].records[0]
        print(f"\nCase data (decrypted):")
        print(f"  ID: {case.get('id')}")
        print(f"  Title: {case.get('title')}")
        print(
            f"  Description: {case.get('description')[:50]}..."
            if case.get("description")
            else "  Description: None"
        )
        print(f"  Status: {case.get('status')}")

    # Inspect decrypted chat messages
    if export_result.user_data["chatMessages"].count > 0:
        message = export_result.user_data["chatMessages"].records[0]
        print(f"\nChat message (decrypted):")
        print(
            f"  Message: {message.get('message')[:50]}..."
            if message.get("message")
            else "  Message: None"
        )
        print(
            f"  Response: {message.get('response')[:50]}..."
            if message.get("response")
            else "  Response: None"
        )

    return export_result


def example_4_save_to_file(db, encryption_service):
    """
    Example 4: Save export to file.

    Demonstrates how to save the exported data to a JSON file.
    """
    print("\n=== Example 4: Save to File ===")

    exporter = DataExporter(db, encryption_service)

    # Export user data
    export_result = exporter.export_all_user_data(user_id=1)

    # Create exports directory if it doesn't exist
    exports_dir = Path("exports")
    exports_dir.mkdir(exist_ok=True)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"user-1-export-{timestamp}.json"
    file_path = exports_dir / filename

    # Save to file
    exporter.save_to_file(export_result, str(file_path))

    print(f"Exported data saved to: {file_path}")
    print(f"File size: {file_path.stat().st_size} bytes")

    # Verify file contents
    with open(file_path, "r", encoding="utf-8") as f:
        loaded_data = json.load(f)

    print(f"Verified: {loaded_data['metadata']['totalRecords']} records")

    # Cleanup
    if file_path.exists():
        file_path.unlink()
        print(f"Cleaned up: {file_path}")

    return export_result


def example_5_api_endpoint_usage():
    """
    Example 5: Using DataExporter in a FastAPI endpoint.

    This shows how to integrate the DataExporter into a FastAPI
    route handler for GDPR data export requests.
    """
    print("\n=== Example 5: API Endpoint Usage ===")

    example_code = '''
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.services.gdpr.data_exporter import (
    DataExporter,
    GdprExportOptions
)
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.database import get_db

router = APIRouter()

@router.post("/api/gdpr/export")
async def export_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    GDPR Article 20 - Export user data in machine-readable format.
    """
    try:
        # Create exporter
        exporter = DataExporter(db, encryption_service)

        # Export data
        export_result = exporter.export_all_user_data(
            user_id=user_id,
            options=GdprExportOptions(export_format="json")
        )

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

        # Return export metadata
        return {
            "success": True,
            "metadata": export_result.metadata.to_dict(),
            "file_path": file_path
        }

    except Exception as e:
        # Log error
        audit_logger.log(
            event_type="gdpr.data_export",
            user_id=str(user_id),
            resource_type="user",
            resource_id=str(user_id),
            action="export",
            success=False,
            error_message=str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to export user data: {str(e)}"
        )
'''

    print("FastAPI endpoint example:")
    print(example_code)


def example_6_security_considerations():
    """
    Example 6: Security considerations.

    Important security notes when using DataExporter.
    """
    print("\n=== Example 6: Security Considerations ===")

    print(
        """
Security Best Practices:

1. Password Hashes:
   - Password hashes are NEVER exported
   - Only username, email, and timestamps are exported from users table

2. Session Tokens:
   - Session tokens are NEVER exported
   - Only session metadata (IP, user agent, timestamps) is exported

3. Encrypted Fields:
   - All encrypted fields are automatically decrypted before export
   - Uses EncryptionService with AES-256-GCM
   - Requires valid encryption key

4. Access Control:
   - Always verify user identity before exporting data
   - Log all export operations with AuditLogger
   - Implement rate limiting to prevent abuse

5. File Storage:
   - Store exported files in secure location
   - Use encryption at rest for exported files
   - Set appropriate file permissions (0o600)
   - Delete exported files after download or after retention period

6. Audit Trail:
   - Log every export operation with user ID and timestamp
   - Include export metadata (record count, file path)
   - Use immutable audit logs with hash chaining

7. GDPR Compliance:
   - Respond to export requests within 30 days
   - Provide data in machine-readable format (JSON)
   - Include all personal data across all tables
   - Preserve consent records as required by law
"""
    )


def main():
    """Run all examples."""
    print("=" * 60)
    print("DataExporter Usage Examples")
    print("=" * 60)

    # Note: These examples use mock data
    # In production, use real SQLAlchemy session and encryption service

    print("\nNote: To run these examples with real data:")
    print("1. Set up database connection (SQLAlchemy Session)")
    print("2. Initialize EncryptionService with valid key")
    print("3. Pass these to DataExporter constructor")

    # Show API endpoint usage example
    example_5_api_endpoint_usage()

    # Show security considerations
    example_6_security_considerations()

    print("\n" + "=" * 60)
    print("For working examples with mock data, run:")
    print("  python backend/services/gdpr/test_data_exporter.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
