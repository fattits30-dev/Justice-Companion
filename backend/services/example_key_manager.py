"""
Example usage of KeyManager service.

This file demonstrates all KeyManager functionality with practical examples.
"""

import asyncio
import os
import base64
from backend.services.key_manager import KeyManager, generate_encryption_key
from backend.services.encryption_service import EncryptionService


async def example_basic_usage():
    """Example 1: Basic encryption key management."""
    print("\n=== Example 1: Basic Usage ===\n")

    # Initialize KeyManager
    user_data_path = os.path.expanduser("~/.justice-companion-test")
    key_manager = KeyManager(user_data_path)

    # Check backend info
    info = key_manager.get_backend_info()
    print(f"Backend: {info['backend']}")
    print(f"Encryption available: {info['encryption_available']}")

    # Generate new key if doesn't exist
    if not await key_manager.has_key():
        print("No key found. Generating new key...")
        new_key = await key_manager.generate_new_key()
        print(f"Generated key: {new_key[:16]}...")  # First 16 chars only
    else:
        print("Existing key found.")

    # Get encryption key
    key = await key_manager.get_key()
    print(f"Key length: {len(key)} bytes")

    # Validate key
    result = await key_manager.validate_key_file()
    if result["valid"]:
        print("✓ Key is valid")
    else:
        print(f"✗ Key validation failed: {result['error']}")

    return key_manager


async def example_encryption_integration(key_manager: KeyManager):
    """Example 2: Integration with EncryptionService."""
    print("\n=== Example 2: Encryption Integration ===\n")

    # Get encryption key
    key = await key_manager.get_key()

    # Initialize EncryptionService
    encryption_service = EncryptionService(key)

    # Encrypt sensitive data
    sensitive_data = "Confidential legal document content"
    encrypted = encryption_service.encrypt(sensitive_data)

    print(f"Original: {sensitive_data}")
    print(f"Encrypted: {encrypted.ciphertext[:32]}...")

    # Decrypt data
    decrypted = encryption_service.decrypt(encrypted)
    print(f"Decrypted: {decrypted}")

    assert sensitive_data == decrypted
    print("✓ Encryption/decryption successful")


async def example_api_key_storage(key_manager: KeyManager):
    """Example 3: Storing and retrieving API keys."""
    print("\n=== Example 3: API Key Storage ===\n")

    # Store multiple API keys
    api_keys = {
        "openai_api_key": "sk-test-openai-123456",
        "anthropic_api_key": "sk-ant-test-789012",
        "huggingface_api_key": "hf_test_345678",
    }

    print("Storing API keys...")
    for key_name, value in api_keys.items():
        await key_manager.store_key(key_name, value)
        print(f"  ✓ Stored {key_name}")

    # Retrieve API keys
    print("\nRetrieving API keys...")
    for key_name in api_keys.keys():
        value = await key_manager.retrieve_key(key_name)
        if value:
            print(f"  ✓ Retrieved {key_name}: {value[:12]}...")
        else:
            print(f"  ✗ Key not found: {key_name}")

    # Check existence
    print("\nChecking key existence...")
    for key_name in api_keys.keys():
        exists = key_manager.has_stored_key(key_name)
        status = "✓" if exists else "✗"
        print(f"  {status} {key_name}: {'exists' if exists else 'not found'}")

    # Delete one key
    print("\nDeleting huggingface_api_key...")
    await key_manager.delete_key("huggingface_api_key")

    # Verify deletion
    exists = key_manager.has_stored_key("huggingface_api_key")
    print(f"  {'✗ Still exists' if exists else '✓ Deleted successfully'}")


async def example_env_migration():
    """Example 4: Migrating from .env file."""
    print("\n=== Example 4: .env Migration ===\n")

    user_data_path = os.path.expanduser("~/.justice-companion-migration")
    key_manager = KeyManager(user_data_path)

    # Simulate .env key
    env_key = generate_encryption_key()
    print(f"Simulated .env key: {env_key[:16]}...")

    # Migrate to secure storage
    print("Migrating key to secure storage...")
    await key_manager.migrate_from_env(env_key)
    print("✓ Migration complete")

    # Verify migration
    stored_key = await key_manager.get_key()
    env_key_bytes = base64.b64decode(env_key)

    if stored_key == env_key_bytes:
        print("✓ Migrated key matches original")
    else:
        print("✗ Migration verification failed")

    print("\n⚠ IMPORTANT: Remove ENCRYPTION_KEY_BASE64 from .env file")


async def example_key_rotation(key_manager: KeyManager):
    """Example 5: Key rotation workflow."""
    print("\n=== Example 5: Key Rotation ===\n")

    # Get current key
    old_key = await key_manager.get_key()
    print(f"Old key: {base64.b64encode(old_key).decode()[:16]}...")

    # Create some encrypted data with old key
    old_service = EncryptionService(old_key)
    sample_data = ["Document 1", "Document 2", "Document 3"]

    print("\nEncrypting sample data with old key...")
    encrypted_records = []
    for data in sample_data:
        encrypted = old_service.encrypt(data)
        encrypted_records.append(encrypted)
        print(f"  ✓ Encrypted: {data}")

    # Rotate key
    print("\nRotating encryption key...")
    new_key_base64 = await key_manager.rotate_key()
    new_key = base64.b64decode(new_key_base64)
    print(f"New key: {new_key_base64[:16]}...")

    # Create new encryption service
    new_service = EncryptionService(new_key)

    # Re-encrypt all data
    print("\nRe-encrypting data with new key...")
    re_encrypted_records = []
    for i, encrypted in enumerate(encrypted_records):
        # Decrypt with old key
        plaintext = old_service.decrypt(encrypted)

        # Re-encrypt with new key
        new_encrypted = new_service.encrypt(plaintext)
        re_encrypted_records.append(new_encrypted)

        print(f"  ✓ Re-encrypted: {plaintext}")

    # Verify re-encryption
    print("\nVerifying re-encrypted data...")
    for i, encrypted in enumerate(re_encrypted_records):
        decrypted = new_service.decrypt(encrypted)
        if decrypted == sample_data[i]:
            print(f"  ✓ Verified: {decrypted}")
        else:
            print(f"  ✗ Verification failed for record {i}")

    print("\n✓ Key rotation complete")


async def example_cache_management(key_manager: KeyManager):
    """Example 6: Cache management."""
    print("\n=== Example 6: Cache Management ===\n")

    # Load key (caches it)
    print("Loading key...")
    key1 = await key_manager.get_key()
    print(f"Key loaded (cached): {len(key1)} bytes")

    # Get cached key (no OS call)
    print("Getting cached key...")
    key2 = await key_manager.get_key()
    print(f"Got cached key: {len(key2)} bytes")

    assert key1 == key2
    print("✓ Keys match (cached)")

    # Clear cache
    print("\nClearing cache...")
    key_manager.clear_cache()
    print("✓ Cache cleared")

    # Load key again (hits OS storage)
    print("Reloading key from OS storage...")
    key3 = await key_manager.get_key()
    print(f"Key reloaded: {len(key3)} bytes")

    assert key1 == key3
    print("✓ Reloaded key matches original")


async def example_error_handling():
    """Example 7: Error handling."""
    print("\n=== Example 7: Error Handling ===\n")

    from backend.services.key_manager import (
        InvalidKeyError,
    )

    user_data_path = os.path.expanduser("~/.justice-companion-error-test")
    key_manager = KeyManager(user_data_path)

    # Handle missing key
    try:
        # Try to get key that doesn't exist
        # (This will fail because we haven't generated one)
        key = await key_manager.get_key()
    except InvalidKeyError as e:
        print(f"✓ Caught InvalidKeyError: {e}")
        print("  → Generating new key...")
        await key_manager.generate_new_key()
        print("  ✓ Key generated")

    # Handle invalid key length
    try:
        # Try to migrate invalid key
        invalid_key = base64.b64encode(b"too short").decode()
        await key_manager.migrate_from_env(invalid_key)
    except InvalidKeyError as e:
        print(f"✓ Caught InvalidKeyError: {e}")

    # Handle empty values
    try:
        await key_manager.store_key("", "value")
    except ValueError as e:
        print(f"✓ Caught ValueError: {e}")

    try:
        await key_manager.store_key("key", "")
    except ValueError as e:
        print(f"✓ Caught ValueError: {e}")

    print("\n✓ Error handling working correctly")


async def example_validation():
    """Example 8: Key validation."""
    print("\n=== Example 8: Key Validation ===\n")

    user_data_path = os.path.expanduser("~/.justice-companion-validation")
    key_manager = KeyManager(user_data_path)

    # Check if key exists
    has_key = await key_manager.has_key()
    print(f"Key exists: {has_key}")

    if not has_key:
        print("Generating key for validation test...")
        await key_manager.generate_new_key()

    # Validate key
    result = await key_manager.validate_key_file()

    print("\nValidation result:")
    print(f"  Valid: {result['valid']}")
    if not result["valid"]:
        print(f"  Error: {result.get('error', 'Unknown')}")
    else:
        print("  ✓ Key is valid and ready to use")

    # Get backend info
    info = key_manager.get_backend_info()
    print("\nBackend information:")
    print(f"  Backend: {info['backend']}")
    print(f"  Encryption available: {info['encryption_available']}")
    print(f"  Service name: {info['service_name']}")
    print(f"  User data path: {info['user_data_path']}")


async def example_complete_workflow():
    """Example 9: Complete production workflow."""
    print("\n=== Example 9: Complete Production Workflow ===\n")

    # 1. Initialize
    user_data_path = os.path.expanduser("~/.justice-companion")
    key_manager = KeyManager(user_data_path)

    print("1. Initializing KeyManager...")
    info = key_manager.get_backend_info()
    print(f"   Backend: {info['backend']}")

    # 2. Check for .env migration
    print("\n2. Checking for .env migration...")
    env_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if env_key and not await key_manager.has_key():
        print("   Migrating from .env...")
        await key_manager.migrate_from_env(env_key)
        print("   ✓ Migration complete")
        print("   ⚠ Remove ENCRYPTION_KEY_BASE64 from .env")
    elif not await key_manager.has_key():
        print("   Generating new key...")
        await key_manager.generate_new_key()
        print("   ✓ New key generated")
    else:
        print("   ✓ Existing key found")

    # 3. Validate key
    print("\n3. Validating encryption key...")
    result = await key_manager.validate_key_file()
    if not result["valid"]:
        raise Exception(f"Key validation failed: {result['error']}")
    print("   ✓ Key is valid")

    # 4. Initialize encryption service
    print("\n4. Initializing EncryptionService...")
    key = await key_manager.get_key()
    encryption_service = EncryptionService(key)
    print("   ✓ EncryptionService ready")

    # 5. Store API keys
    print("\n5. Configuring API keys...")
    if not key_manager.has_stored_key("openai_api_key"):
        # In production, get from secure input
        await key_manager.store_key("openai_api_key", "sk-test-123")
        print("   ✓ OpenAI API key stored")
    else:
        print("   ✓ OpenAI API key already configured")

    # 6. Test encryption
    print("\n6. Testing encryption...")
    test_data = "Confidential case information"
    encrypted = encryption_service.encrypt(test_data)
    decrypted = encryption_service.decrypt(encrypted)
    assert test_data == decrypted
    print("   ✓ Encryption working correctly")

    # 7. Setup complete
    print("\n✓ Setup complete - System ready for production use")

    return key_manager, encryption_service


async def main():
    """Run all examples."""
    print("=" * 60)
    print("KeyManager Service - Example Usage")
    print("=" * 60)

    try:
        # Example 1: Basic usage
        key_manager = await example_basic_usage()

        # Example 2: Encryption integration
        await example_encryption_integration(key_manager)

        # Example 3: API key storage
        await example_api_key_storage(key_manager)

        # Example 4: .env migration
        await example_env_migration()

        # Example 5: Key rotation
        await example_key_rotation(key_manager)

        # Example 6: Cache management
        await example_cache_management(key_manager)

        # Example 7: Error handling
        await example_error_handling()

        # Example 8: Validation
        await example_validation()

        # Example 9: Complete workflow
        await example_complete_workflow()

        print("\n" + "=" * 60)
        print("✓ All examples completed successfully")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error running examples: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    # Run examples
    asyncio.run(main())
