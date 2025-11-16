"""
Example usage of ServiceContainer for dependency injection.

Demonstrates:
1. Application startup with service initialization
2. Retrieving services from container
3. Using services across different parts of application
4. Testing scenario with container reset
"""

import os
import sys
from pathlib import Path

# Direct imports to avoid __init__.py dependencies
sys.path.insert(0, str(Path(__file__).parent))

from service_container import (
    ServiceContainer,
    initialize_service_container,
    get_encryption_service,
    get_audit_logger,
    get_key_manager,
    reset_service_container
)
from encryption_service import EncryptionService
from audit_logger import AuditLogger


def example_application_startup():
    """
    Example 1: Typical application startup sequence.

    This demonstrates how to initialize the service container
    during application startup with real service instances.
    """
    print("=" * 70)
    print("Example 1: Application Startup")
    print("=" * 70)

    # Step 1: Create service instances
    print("\n1. Creating service instances...")

    # Generate a test encryption key (in production, use KeyManager)
    encryption_key = os.urandom(32)
    encryption_service = EncryptionService(encryption_key)
    print(f"   [OK] Created EncryptionService with {len(encryption_key)}-byte key")

    # Create audit logger (in production, pass real DB connection)
    audit_logger = AuditLogger(db=None)  # None for demo
    print("   [OK] Created AuditLogger")

    # Step 2: Initialize service container
    print("\n2. Initializing service container...")
    initialize_service_container(
        encryption_service=encryption_service,
        audit_logger=audit_logger
    )
    print("   [OK] Service container initialized")

    # Step 3: Use services from anywhere in application
    print("\n3. Using services from container...")

    # Get encryption service and encrypt data
    enc_svc = get_encryption_service()
    encrypted = enc_svc.encrypt("Sensitive legal data")
    print(f"   [OK] Encrypted data: {encrypted.ciphertext[:50]}...")

    # Decrypt to verify
    decrypted = enc_svc.decrypt(encrypted)
    print(f"   [OK] Decrypted data: {decrypted}")

    # Get audit logger and log event
    audit = get_audit_logger()
    print("   [OK] Retrieved audit logger from container")

    print("\n[OK] Application startup complete!")


def example_service_usage_in_repository():
    """
    Example 2: Using services in a repository class.

    This demonstrates how repositories can retrieve services
    from the container without needing them passed as constructor arguments.
    """
    print("\n" + "=" * 70)
    print("Example 2: Service Usage in Repository")
    print("=" * 70)

    class CaseRepository:
        """Example repository that uses services from container."""

        def save_case(self, case_data: dict):
            """Save a case with encryption and audit logging."""
            # Get services from container
            encryption = get_encryption_service()
            audit = get_audit_logger()

            # Encrypt sensitive fields
            encrypted_title = encryption.encrypt(case_data['title'])
            encrypted_desc = encryption.encrypt(case_data['description'])

            print(f"\n   Saving case: {case_data['title']}")
            print(f"   [OK] Encrypted title: {encrypted_title.ciphertext[:40]}...")
            print(f"   [OK] Encrypted description: {encrypted_desc.ciphertext[:40]}...")

            # Log the action (in production, this would actually log to DB)
            print(f"   [OK] Logged audit event: case.created")

            return {
                'id': 'case-123',
                'title': encrypted_title,
                'description': encrypted_desc
            }

    # Use the repository
    repo = CaseRepository()
    case = repo.save_case({
        'title': 'Smith v. Jones',
        'description': 'Employment discrimination case'
    })

    print(f"\n[OK] Case saved with ID: {case['id']}")


def example_testing_scenario():
    """
    Example 3: Testing scenario with container reset.

    This demonstrates how to reset the container between tests
    to ensure test isolation.
    """
    print("\n" + "=" * 70)
    print("Example 3: Testing Scenario")
    print("=" * 70)

    print("\n1. First test - using real services...")

    # First test uses real services
    enc_svc_1 = get_encryption_service()
    encrypted = enc_svc_1.encrypt("Test data")
    print(f"   [OK] Encrypted with service 1: {encrypted.ciphertext[:40]}...")

    # Reset container for next test
    print("\n2. Resetting container...")
    reset_service_container()
    print("   [OK] Container reset")

    # Initialize with new services (could be mocks in real tests)
    print("\n3. Second test - reinitializing with new services...")
    new_key = os.urandom(32)
    new_encryption = EncryptionService(new_key)
    new_audit = AuditLogger(db=None)

    initialize_service_container(
        encryption_service=new_encryption,
        audit_logger=new_audit
    )
    print("   [OK] Container reinitialized")

    # Use new services
    enc_svc_2 = get_encryption_service()
    encrypted_2 = enc_svc_2.encrypt("Test data")
    print(f"   [OK] Encrypted with service 2: {encrypted_2.ciphertext[:40]}...")

    # Verify they're different (different keys = different ciphertext)
    if encrypted.ciphertext != encrypted_2.ciphertext:
        print("\n[OK] Services are properly isolated between tests")
    else:
        print("\n[X] Warning: Services not properly isolated")


def example_error_handling():
    """
    Example 4: Error handling when container not initialized.

    This demonstrates the error messages users get when trying
    to use services before initialization.
    """
    print("\n" + "=" * 70)
    print("Example 4: Error Handling")
    print("=" * 70)

    # Reset to clear any previous initialization
    reset_service_container()

    print("\nAttempting to use services before initialization...")

    try:
        get_encryption_service()
    except Exception as e:
        print(f"   [X] Expected error: {e}")

    try:
        get_audit_logger()
    except Exception as e:
        print(f"   [X] Expected error: {e}")

    print("\n[OK] Clear error messages help developers diagnose issues")


def example_singleton_pattern():
    """
    Example 5: Singleton pattern demonstration.

    This shows that the container maintains a single instance
    regardless of how it's accessed.
    """
    print("\n" + "=" * 70)
    print("Example 5: Singleton Pattern")
    print("=" * 70)

    # Reinitialize container first
    encryption_key = os.urandom(32)
    initialize_service_container(
        encryption_service=EncryptionService(encryption_key),
        audit_logger=AuditLogger(db=None)
    )

    print("\nGetting container instance multiple ways...")

    # Get container directly
    container1 = ServiceContainer()
    print(f"   Container 1 ID: {id(container1)}")

    # Get via module function
    from service_container import get_container
    container2 = get_container()
    print(f"   Container 2 ID: {id(container2)}")

    # Create "new" instance
    container3 = ServiceContainer()
    print(f"   Container 3 ID: {id(container3)}")

    # Verify they're all the same instance
    if id(container1) == id(container2) == id(container3):
        print("\n[OK] All references point to the same singleton instance")

    # Verify services are the same too
    enc1 = get_encryption_service()
    enc2 = get_encryption_service()

    if id(enc1) == id(enc2):
        print("[OK] Service instances are also singletons")


def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("SERVICE CONTAINER EXAMPLES")
    print("=" * 70)

    try:
        # Example 1: Application startup
        example_application_startup()

        # Example 2: Repository usage
        example_service_usage_in_repository()

        # Example 3: Testing scenario
        example_testing_scenario()

        # Example 4: Error handling
        example_error_handling()

        # Example 5: Singleton pattern
        example_singleton_pattern()

        print("\n" + "=" * 70)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY")
        print("=" * 70)

    except Exception as e:
        print(f"\n[X] Error running examples: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Clean up
        reset_service_container()


if __name__ == "__main__":
    main()
