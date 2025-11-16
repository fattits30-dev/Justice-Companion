"""
Example usage of SecureStorageService for storing API keys securely.

This demonstrates how to use the service in a FastAPI application
to manage OpenAI, Anthropic, and other provider API keys.
"""

import asyncio
import logging
from typing import Optional

from secure_storage_service import (
    SecureStorageService,
    SecureStorageError,
    secure_storage,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def example_basic_usage():
    """Basic usage: store, retrieve, and delete API keys."""
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Basic Usage")
    print("=" * 60 + "\n")

    # Initialize the service
    service = SecureStorageService.get_instance()
    await service.init()

    # Check backend info
    backend_info = service.get_backend_info()
    print(f"Backend: {backend_info['backend']}")
    print(f"Encryption available: {backend_info['encryption_available']}")
    print(f"Service name: {backend_info['service_name']}\n")

    # Store an OpenAI API key
    print("Storing OpenAI API key...")
    await service.set_api_key("openai_api_key", "sk-test-1234567890")
    print("✓ API key stored securely\n")

    # Retrieve the API key
    print("Retrieving OpenAI API key...")
    api_key = await service.get_api_key("openai_api_key")
    print(f"✓ Retrieved: {api_key[:10]}... (truncated for security)\n")

    # Check if key exists
    exists = await service.has_api_key("openai_api_key")
    print(f"Key exists: {exists}\n")

    # Delete the API key
    print("Deleting API key...")
    await service.delete_api_key("openai_api_key")
    print("✓ API key deleted\n")

    # Verify deletion
    exists = await service.has_api_key("openai_api_key")
    print(f"Key exists after deletion: {exists}\n")


async def example_multiple_providers():
    """Store API keys for multiple AI providers."""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Multiple Provider API Keys")
    print("=" * 60 + "\n")

    service = SecureStorageService.get_instance()
    await service.init()

    # Store API keys for different providers
    providers = {
        "openai_api_key": "sk-test-openai-1234567890",
        "anthropic_api_key": "sk-ant-test-1234567890",
        "huggingface_api_key": "hf_test1234567890",
        "cohere_api_key": "co_test1234567890",
    }

    print("Storing API keys for multiple providers...\n")
    for key, value in providers.items():
        await service.set_api_key(key, value)
        print(f"✓ Stored {key}")

    print("\nListing stored keys...\n")
    keys_status = await service.list_keys()
    for key, exists in keys_status.items():
        status = "✓" if exists else "✗"
        print(f"{status} {key}: {'stored' if exists else 'not stored'}")


async def example_error_handling():
    """Demonstrate error handling."""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Error Handling")
    print("=" * 60 + "\n")

    service = SecureStorageService.get_instance()
    await service.init()

    # Try to store with empty key
    print("1. Attempting to store with empty key...")
    try:
        await service.set_api_key("", "some_value")
    except ValueError as e:
        print(f"✓ Caught expected error: {e}\n")

    # Try to store with empty value
    print("2. Attempting to store with empty value...")
    try:
        await service.set_api_key("test_key", "")
    except ValueError as e:
        print(f"✓ Caught expected error: {e}\n")

    # Try to retrieve non-existent key
    print("3. Attempting to retrieve non-existent key...")
    result = await service.get_api_key("nonexistent_key")
    print(f"✓ Result: {result} (returns None, not an error)\n")

    # Try to delete non-existent key
    print("4. Attempting to delete non-existent key...")
    try:
        await service.delete_api_key("nonexistent_key")
        print("✓ No error raised (graceful handling)\n")
    except Exception as e:
        print(f"✗ Unexpected error: {e}\n")


async def example_fastapi_integration():
    """Example integration with FastAPI application."""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: FastAPI Integration Pattern")
    print("=" * 60 + "\n")

    # Initialize service at application startup
    print("Initializing service at application startup...")
    await secure_storage.init()
    print("✓ Service initialized\n")

    # Simulate storing user's API key (e.g., during settings update)
    print("User updates their OpenAI API key in settings...")
    user_id = "user_123"
    key_name = f"user_{user_id}_openai_api_key"
    await secure_storage.set_api_key(key_name, "sk-user-key-1234567890")
    print(f"✓ Stored API key for {key_name}\n")

    # Simulate retrieving API key for a chat request
    print("User sends chat message, retrieving their API key...")
    api_key = await secure_storage.get_api_key(key_name)
    if api_key:
        print(f"✓ Retrieved API key: {api_key[:10]}... (using for OpenAI request)\n")
    else:
        print("✗ No API key found for user\n")

    # Simulate user deleting their account
    print("User deletes their account, removing API key...")
    await secure_storage.delete_api_key(key_name)
    print("✓ API key deleted\n")


async def example_clear_all_keys():
    """Demonstrate clearing all stored keys."""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Clear All Keys")
    print("=" * 60 + "\n")

    service = SecureStorageService.get_instance()
    await service.init()

    # Store some test keys
    print("Storing test keys...")
    await service.set_api_key("test_key_1", "value1")
    await service.set_api_key("test_key_2", "value2")
    print("✓ Stored 2 test keys\n")

    # List keys
    print("Keys before clearing:")
    keys_before = await service.list_keys()
    for key, exists in keys_before.items():
        if exists:
            print(f"  ✓ {key}")

    # Clear all keys
    print("\nClearing all keys...")
    await service.clear_all()
    print("✓ All keys cleared\n")

    # List keys again
    print("Keys after clearing:")
    keys_after = await service.list_keys()
    existing_keys = [key for key, exists in keys_after.items() if exists]
    if existing_keys:
        print(f"  Still exists: {', '.join(existing_keys)}")
    else:
        print("  (none)")


async def example_convenience_functions():
    """Demonstrate convenience functions."""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Convenience Functions")
    print("=" * 60 + "\n")

    from secure_storage_service import (
        set_api_key,
        get_api_key,
        delete_api_key,
        has_api_key,
    )

    # Use module-level convenience functions
    print("Using convenience functions (no need to get instance)...\n")

    print("1. Setting API key...")
    await set_api_key("convenience_test", "test_value")
    print("✓ Stored\n")

    print("2. Checking if key exists...")
    exists = await has_api_key("convenience_test")
    print(f"✓ Exists: {exists}\n")

    print("3. Getting API key...")
    value = await get_api_key("convenience_test")
    print(f"✓ Retrieved: {value}\n")

    print("4. Deleting API key...")
    await delete_api_key("convenience_test")
    print("✓ Deleted\n")


async def example_encryption_availability():
    """Check encryption availability on different platforms."""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Encryption Availability Check")
    print("=" * 60 + "\n")

    service = SecureStorageService.get_instance()
    await service.init()

    if service.is_encryption_available():
        print("✓ OS-level encryption is available")
        backend_info = service.get_backend_info()
        print(f"  Backend: {backend_info['backend']}")
        print("\nYour API keys are securely encrypted by the OS:")
        print("  - Windows: DPAPI (Data Protection API)")
        print("  - macOS: Keychain")
        print("  - Linux: Secret Service API (gnome-keyring/kwallet)")
    else:
        print("⚠ OS-level encryption is NOT available")
        print("\nAPI keys will be stored in plaintext as fallback.")
        print("On Linux, install gnome-keyring or kwallet:")
        print("  sudo apt-get install gnome-keyring  # Ubuntu/Debian")
        print("  sudo yum install gnome-keyring      # CentOS/RHEL")


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("SecureStorageService Usage Examples")
    print("=" * 60)

    try:
        await example_basic_usage()
        await example_multiple_providers()
        await example_error_handling()
        await example_fastapi_integration()
        await example_clear_all_keys()
        await example_convenience_functions()
        await example_encryption_availability()

        print("\n" + "=" * 60)
        print("All examples completed successfully!")
        print("=" * 60 + "\n")

    except Exception as e:
        logger.error(f"Error running examples: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
