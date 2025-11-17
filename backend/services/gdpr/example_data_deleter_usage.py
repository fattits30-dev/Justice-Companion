"""
Example usage of DataDeleter service for GDPR Article 17 (Right to Erasure).

This script demonstrates:
1. Validating deletion before execution
2. Deleting all user data with confirmation
3. Handling errors appropriately
4. Checking deletion results

Run with:
    python backend/services/gdpr/example_data_deleter_usage.py
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.services.gdpr.data_deleter import (
    DataDeleter,
    GdprDeleteOptions,
    DeletionNotConfirmedError,
)
from backend.services.audit_logger import AuditLogger


def example_basic_deletion():
    """Example 1: Basic user data deletion."""
    print("\n" + "=" * 60)
    print("Example 1: Basic User Data Deletion")
    print("=" * 60)

    # Setup database connection
    engine = create_engine("sqlite:///test_deletion.db")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize services
        audit_logger = AuditLogger(db)
        deleter = DataDeleter(db, audit_logger)

        # Delete user data with confirmation
        result = deleter.delete_all_user_data(
            user_id=123,
            options=GdprDeleteOptions(
                confirmed=True, reason="User requested account deletion via settings page"
            ),
        )

        # Check results
        if result.success:
            print(f"✅ Deletion successful at {result.deletion_date}")
            print(f"\nDeleted records:")
            for table, count in result.deleted_counts.items():
                if count > 0:
                    print(f"  - {table}: {count} records")

            print(f"\nPreserved (legal requirement):")
            print(f"  - Audit logs: {result.preserved_audit_logs}")
            print(f"  - Consents: {result.preserved_consents}")
        else:
            print(f"❌ Deletion failed: {result.error}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


def example_validation_before_deletion():
    """Example 2: Validate before deletion."""
    print("\n" + "=" * 60)
    print("Example 2: Validate Before Deletion")
    print("=" * 60)

    # Setup database connection
    engine = create_engine("sqlite:///test_deletion.db")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize services
        audit_logger = AuditLogger(db)
        deleter = DataDeleter(db, audit_logger)

        user_id = 123

        # Step 1: Validate deletion
        print(f"\n📋 Validating deletion for user {user_id}...")
        validation = deleter.validate_deletion(user_id)

        if not validation["valid"]:
            print(f"❌ Validation failed:")
            for warning in validation["warnings"]:
                print(f"  - {warning}")
            return

        # Step 2: Show warnings to user
        print(f"✅ Validation passed")
        if validation["warnings"]:
            print(f"\n⚠️  Warnings:")
            for warning in validation["warnings"]:
                print(f"  - {warning}")

        # Step 3: Confirm with user (simulated)
        print(f"\n🔍 User confirmation required...")
        user_confirmed = True  # In real app, this would be from UI

        if not user_confirmed:
            print("❌ User cancelled deletion")
            return

        # Step 4: Execute deletion
        print(f"\n🗑️  Deleting user data...")
        result = deleter.delete_all_user_data(
            user_id=user_id,
            options=GdprDeleteOptions(
                confirmed=True, reason="User confirmed deletion after validation"
            ),
        )

        print(f"✅ Deletion completed successfully")
        print(f"   Total records deleted: {sum(result.deleted_counts.values())}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


def example_error_handling():
    """Example 3: Error handling."""
    print("\n" + "=" * 60)
    print("Example 3: Error Handling")
    print("=" * 60)

    # Setup database connection
    engine = create_engine("sqlite:///test_deletion.db")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize services
        audit_logger = AuditLogger(db)
        deleter = DataDeleter(db, audit_logger)

        user_id = 999  # Non-existent user

        # Attempt 1: Without confirmation (should fail)
        print("\n❌ Attempt 1: Without confirmation...")
        try:
            result = deleter.delete_all_user_data(
                user_id=user_id, options=GdprDeleteOptions(confirmed=False)
            )
        except DeletionNotConfirmedError as e:
            print(f"   Caught expected error: {e}")

        # Attempt 2: Non-existent user (should fail gracefully)
        print("\n❌ Attempt 2: Non-existent user...")
        validation = deleter.validate_deletion(user_id)
        if not validation["valid"]:
            print(f"   Validation failed: {validation['warnings'][0]}")

        # Attempt 3: Successful deletion
        print("\n✅ Attempt 3: Valid deletion...")
        existing_user_id = 123
        result = deleter.delete_all_user_data(
            user_id=existing_user_id,
            options=GdprDeleteOptions(confirmed=True, reason="Test deletion"),
        )
        print(f"   Deletion successful: {result.success}")

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        db.close()


def example_with_statistics():
    """Example 4: Deletion with detailed statistics."""
    print("\n" + "=" * 60)
    print("Example 4: Deletion with Detailed Statistics")
    print("=" * 60)

    # Setup database connection
    engine = create_engine("sqlite:///test_deletion.db")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize services
        audit_logger = AuditLogger(db)
        deleter = DataDeleter(db, audit_logger)

        user_id = 123

        # Count records before deletion
        print(f"\n📊 Statistics before deletion:")
        tables = ["cases", "evidence", "chat_messages", "sessions"]
        before_counts = {}

        for table in tables:
            try:
                result = db.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE user_id = :user_id"),
                    {"user_id": user_id},
                )
                count = result.fetchone()[0]
                before_counts[table] = count
                print(f"  - {table}: {count} records")
            except Exception:
                before_counts[table] = 0

        # Execute deletion
        print(f"\n🗑️  Executing deletion...")
        result = deleter.delete_all_user_data(
            user_id=user_id, options=GdprDeleteOptions(confirmed=True)
        )

        # Show deletion statistics
        print(f"\n✅ Deletion completed:")
        print(f"  - Success: {result.success}")
        print(f"  - Date: {result.deletion_date}")
        print(
            f"  - Total tables affected: {len([c for c in result.deleted_counts.values() if c > 0])}"
        )
        print(f"  - Total records deleted: {sum(result.deleted_counts.values())}")

        print(f"\n📈 Breakdown by table:")
        for table, count in sorted(result.deleted_counts.items()):
            if count > 0:
                before = before_counts.get(table, 0)
                print(f"  - {table}: {count} deleted (had {before})")

        print(f"\n🔒 Preserved for compliance:")
        print(f"  - Audit logs: {result.preserved_audit_logs}")
        print(f"  - Consents: {result.preserved_consents}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


def example_batch_deletion():
    """Example 5: Batch deletion of multiple users."""
    print("\n" + "=" * 60)
    print("Example 5: Batch Deletion of Multiple Users")
    print("=" * 60)

    # Setup database connection
    engine = create_engine("sqlite:///test_deletion.db")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize services
        audit_logger = AuditLogger(db)
        deleter = DataDeleter(db, audit_logger)

        user_ids = [101, 102, 103, 104, 105]

        print(f"\n🗑️  Deleting {len(user_ids)} users...")

        results = []
        for user_id in user_ids:
            try:
                # Validate first
                validation = deleter.validate_deletion(user_id)
                if not validation["valid"]:
                    print(f"  ⚠️  User {user_id}: Validation failed")
                    continue

                # Delete
                result = deleter.delete_all_user_data(
                    user_id=user_id,
                    options=GdprDeleteOptions(
                        confirmed=True, reason="Batch deletion - inactive accounts"
                    ),
                )

                if result.success:
                    total_deleted = sum(result.deleted_counts.values())
                    print(f"  ✅ User {user_id}: Deleted {total_deleted} records")
                    results.append(result)
                else:
                    print(f"  ❌ User {user_id}: Failed - {result.error}")

            except Exception as e:
                print(f"  ❌ User {user_id}: Error - {e}")

        # Summary
        print(f"\n📊 Batch deletion summary:")
        print(f"  - Total users processed: {len(user_ids)}")
        print(f"  - Successful deletions: {len(results)}")
        print(f"  - Failed deletions: {len(user_ids) - len(results)}")

        total_records = sum(sum(r.deleted_counts.values()) for r in results)
        print(f"  - Total records deleted: {total_records}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("DataDeleter Service - Usage Examples")
    print("=" * 60)

    # Run examples
    example_basic_deletion()
    example_validation_before_deletion()
    example_error_handling()
    example_with_statistics()
    example_batch_deletion()

    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60)
