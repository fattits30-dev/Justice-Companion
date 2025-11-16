"""
Example usage of GDPR Service for Justice Companion.

This file demonstrates how to use the GdprService for:
- Exporting user data (GDPR Article 20 - Data Portability)
- Deleting user data (GDPR Article 17 - Right to Erasure)
- Export-before-delete workflow
- Rate limiting and consent management

Requirements:
- Active database connection
- Encryption service configured with valid key
- Audit logger instance
- User with active 'data_processing' consent

Run example:
    python -m backend.services.gdpr.example_usage
"""

import asyncio
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.services.gdpr import (
    GdprService,
    GdprExportOptions,
    GdprDeleteOptions,
    RateLimitError,
    ConsentRequiredError,
    create_gdpr_service
)
from backend.services.encryption_service import EncryptionService
from backend.services.audit_logger import AuditLogger


async def example_export_user_data():
    """
    Example 1: Export user data (GDPR Article 20).

    This demonstrates:
    - Exporting all user data to JSON format
    - Automatic file persistence
    - Decryption of sensitive fields
    - Audit logging
    """
    print("=" * 80)
    print("Example 1: Export User Data (GDPR Article 20)")
    print("=" * 80)

    # Initialize services (replace with your actual database and key)
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY_BASE64 environment variable not set")
        return

    encryption_service = EncryptionService(encryption_key)
    audit_logger = AuditLogger(db)

    # Create GDPR service
    gdpr_service = create_gdpr_service(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    # User ID to export
    user_id = 1

    try:
        # Export user data
        print(f"\nExporting data for user {user_id}...")

        export_result = await gdpr_service.export_user_data(
            user_id=user_id,
            options=GdprExportOptions(export_format="json")
        )

        # Display results
        print(f"\n✓ Export completed successfully!")
        print(f"  Export Date: {export_result.metadata['exportDate']}")
        print(f"  Total Records: {export_result.metadata['totalRecords']}")
        print(f"  File Path: {export_result.file_path}")

        # Display table-by-table counts
        print(f"\n  Data exported by table:")
        for table_name, table_data in export_result.user_data.items():
            count = table_data.get("count", 0)
            if count > 0:
                print(f"    - {table_name}: {count} records")

    except RateLimitError as e:
        print(f"\n✗ Rate limit exceeded: {e.detail}")
        print("  You can perform 5 exports per 24 hours.")

    except ConsentRequiredError as e:
        print(f"\n✗ Consent required: {e.detail}")
        print("  User must grant 'data_processing' consent first.")

    except Exception as e:
        print(f"\n✗ Export failed: {e}")

    finally:
        db.close()


async def example_delete_user_data():
    """
    Example 2: Delete user data (GDPR Article 17).

    This demonstrates:
    - Complete user data deletion
    - Transactional safety (all-or-nothing)
    - Audit log and consent preservation
    - Deletion statistics
    """
    print("\n" + "=" * 80)
    print("Example 2: Delete User Data (GDPR Article 17)")
    print("=" * 80)

    # Initialize services
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY_BASE64 environment variable not set")
        return

    encryption_service = EncryptionService(encryption_key)
    audit_logger = AuditLogger(db)

    gdpr_service = create_gdpr_service(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    # User ID to delete
    user_id = 1

    try:
        # CRITICAL: This is irreversible!
        print(f"\n⚠️  WARNING: Deleting all data for user {user_id}")
        print("  This operation is IRREVERSIBLE.")

        # Uncomment the following to actually delete
        # confirmation = input("  Type 'DELETE' to confirm: ")
        # if confirmation != "DELETE":
        #     print("  Deletion cancelled.")
        #     return

        delete_result = await gdpr_service.delete_user_data(
            user_id=user_id,
            options=GdprDeleteOptions(
                confirmed=True,  # MUST be True
                reason="User requested account deletion"
            )
        )

        # Display results
        print(f"\n✓ Deletion completed successfully!")
        print(f"  Deletion Date: {delete_result.deletion_date}")
        print(f"  Preserved Audit Logs: {delete_result.preserved_audit_logs}")
        print(f"  Preserved Consents: {delete_result.preserved_consents}")

        # Display deletion counts
        print(f"\n  Records deleted by table:")
        for table_name, count in delete_result.deleted_counts.items():
            if count > 0:
                print(f"    - {table_name}: {count} records")

    except ConsentRequiredError as e:
        print(f"\n✗ Consent required: {e.detail}")

    except Exception as e:
        print(f"\n✗ Deletion failed: {e}")

    finally:
        db.close()


async def example_export_before_delete():
    """
    Example 3: Export-before-delete workflow.

    This demonstrates:
    - Creating a backup before deletion
    - Combined export + delete operation
    - Automatic export path tracking
    """
    print("\n" + "=" * 80)
    print("Example 3: Export-Before-Delete Workflow")
    print("=" * 80)

    # Initialize services
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY_BASE64 environment variable not set")
        return

    encryption_service = EncryptionService(encryption_key)
    audit_logger = AuditLogger(db)

    gdpr_service = create_gdpr_service(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    user_id = 1

    try:
        print(f"\n⚠️  Deleting user {user_id} with backup...")

        # Delete with automatic export
        delete_result = await gdpr_service.delete_user_data(
            user_id=user_id,
            options=GdprDeleteOptions(
                confirmed=True,
                export_before_delete=True,  # Creates backup automatically
                reason="User requested deletion with backup"
            )
        )

        # Display results
        print(f"\n✓ Export and deletion completed!")
        print(f"  Backup saved to: {delete_result.export_path}")
        print(f"  Deletion date: {delete_result.deletion_date}")
        print(f"  Total records deleted: {sum(delete_result.deleted_counts.values())}")

        # Backup file can be used for data recovery if needed
        if delete_result.export_path and Path(delete_result.export_path).exists():
            file_size = Path(delete_result.export_path).stat().st_size
            print(f"  Backup file size: {file_size:,} bytes")

    except Exception as e:
        print(f"\n✗ Operation failed: {e}")

    finally:
        db.close()


async def example_rate_limit_handling():
    """
    Example 4: Handling rate limits.

    This demonstrates:
    - Rate limit error handling
    - Retry logic with backoff
    - User-friendly error messages
    """
    print("\n" + "=" * 80)
    print("Example 4: Rate Limit Handling")
    print("=" * 80)

    # Initialize services
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY_BASE64 environment variable not set")
        return

    encryption_service = EncryptionService(encryption_key)
    audit_logger = AuditLogger(db)

    gdpr_service = create_gdpr_service(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    user_id = 1

    print(f"\nAttempting multiple exports for user {user_id}...")
    print("Rate limit: 5 exports per 24 hours")

    for attempt in range(1, 8):
        try:
            print(f"\n  Attempt {attempt}...", end=" ")

            export_result = await gdpr_service.export_user_data(
                user_id=user_id,
                options=GdprExportOptions(export_format="json")
            )

            print(f"✓ Success ({export_result.metadata['totalRecords']} records)")

        except RateLimitError as e:
            print(f"✗ Rate limit exceeded")
            print(f"    Message: {e.detail}")
            print(f"    Wait until rate limit resets (24 hours from first attempt)")
            break

        except Exception as e:
            print(f"✗ Error: {e}")
            break

    db.close()


async def example_consent_verification():
    """
    Example 5: Consent verification.

    This demonstrates:
    - Checking consent before operations
    - Handling missing consent errors
    - User-friendly consent prompts
    """
    print("\n" + "=" * 80)
    print("Example 5: Consent Verification")
    print("=" * 80)

    # Initialize services
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        print("ERROR: ENCRYPTION_KEY_BASE64 environment variable not set")
        return

    encryption_service = EncryptionService(encryption_key)
    audit_logger = AuditLogger(db)

    gdpr_service = create_gdpr_service(
        db=db,
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )

    # Try exporting for user without consent
    user_id = 999  # Assumed to have no consent

    try:
        print(f"\nAttempting export for user {user_id}...")

        export_result = await gdpr_service.export_user_data(user_id=user_id)

        print(f"✓ Export successful")

    except ConsentRequiredError as e:
        print(f"✗ Consent required")
        print(f"  Message: {e.detail}")
        print(f"\n  Action needed:")
        print(f"    1. User must grant 'data_processing' consent")
        print(f"    2. Use ConsentService.grant_consent()")
        print(f"    3. Retry export operation")

    except Exception as e:
        print(f"✗ Error: {e}")

    finally:
        db.close()


async def main():
    """Run all examples."""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "  GDPR Service Examples - Justice Companion".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "═" * 78 + "╝")

    # Run examples (uncomment to execute)
    # await example_export_user_data()
    # await example_delete_user_data()
    # await example_export_before_delete()
    # await example_rate_limit_handling()
    # await example_consent_verification()

    print("\n" + "=" * 80)
    print("Examples completed!")
    print("=" * 80)
    print("\nNOTE: Uncomment example functions in main() to run.")
    print("      Make sure to set ENCRYPTION_KEY_BASE64 environment variable.")
    print()


if __name__ == "__main__":
    asyncio.run(main())
