"""
Standalone test script for EncryptionService.
This tests the encryption service without requiring full backend dependencies.
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import directly from the file (not through __init__.py)
import importlib.util

spec = importlib.util.spec_from_file_location(
    "encryption_service",
    Path(__file__).parent / "services" / "encryption_service.py",
)
if spec is None or spec.loader is None:
    raise ImportError("Unable to load encryption_service module specification")

encryption_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encryption_module)

EncryptionService = encryption_module.EncryptionService
EncryptedData = encryption_module.EncryptedData

def test_basic_encryption():
    """Test basic encryption and decryption."""
    print("Test 1: Basic encryption/decryption...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    plaintext = "Sensitive legal information"
    encrypted = service.encrypt(plaintext)

    assert encrypted is not None, "Encryption should return EncryptedData"
    assert encrypted.algorithm == "aes-256-gcm", "Should use AES-256-GCM"
    assert encrypted.version == 1, "Should use version 1"

    decrypted = service.decrypt(encrypted)
    assert decrypted == plaintext, f"Decryption failed: expected '{plaintext}', got '{decrypted}'"

    print("✓ Basic encryption/decryption works")

def test_unique_ivs():
    """Test that each encryption uses a unique IV."""
    print("\nTest 2: Unique IVs...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    plaintext = "Same plaintext"
    encrypted1 = service.encrypt(plaintext)
    encrypted2 = service.encrypt(plaintext)

    assert encrypted1.iv != encrypted2.iv, "IVs should be unique"
    assert encrypted1.ciphertext != encrypted2.ciphertext, "Ciphertexts should differ"

    assert service.decrypt(encrypted1) == plaintext, "First decryption failed"
    assert service.decrypt(encrypted2) == plaintext, "Second decryption failed"

    print("✓ Unique IVs for each encryption")

def test_wrong_key():
    """Test that wrong key fails decryption."""
    print("\nTest 3: Wrong key detection...")

    key1 = EncryptionService.generate_key()
    key2 = EncryptionService.generate_key()

    service1 = EncryptionService(key1)
    service2 = EncryptionService(key2)

    encrypted = service1.encrypt("Secret data")

    try:
        service2.decrypt(encrypted)
        assert False, "Should have raised RuntimeError"
    except RuntimeError as e:
        assert "Decryption failed" in str(e)

    print("✓ Wrong key properly rejected")

def test_tampered_data():
    """Test that tampered data is detected."""
    print("\nTest 4: Tampered data detection...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    plaintext = "Sensitive data"
    encrypted = service.encrypt(plaintext)

    # Tamper with ciphertext
    tampered_ciphertext = encrypted.ciphertext[:-1] + "X"
    tampered = EncryptedData(
        algorithm=encrypted.algorithm,
        ciphertext=tampered_ciphertext,
        iv=encrypted.iv,
        auth_tag=encrypted.auth_tag,
        version=encrypted.version
    )

    try:
        service.decrypt(tampered)
        assert False, "Should have raised RuntimeError"
    except RuntimeError as e:
        assert "Decryption failed" in str(e)

    print("✓ Tampered data properly rejected")

def test_batch_operations():
    """Test batch encryption and decryption."""
    print("\nTest 5: Batch operations...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    plaintexts = ["Case 1", "Case 2", None, "", "Case 5"]
    encrypted_list = service.batch_encrypt(plaintexts)

    assert len(encrypted_list) == 5, "Should return same number of results"
    assert encrypted_list[0] is not None, "Case 1 should be encrypted"
    assert encrypted_list[1] is not None, "Case 2 should be encrypted"
    assert encrypted_list[2] is None, "None should remain None"
    assert encrypted_list[3] is None, "Empty string should return None"
    assert encrypted_list[4] is not None, "Case 5 should be encrypted"

    decrypted_list = service.batch_decrypt(encrypted_list)
    assert decrypted_list[0] == "Case 1", "Case 1 decryption failed"
    assert decrypted_list[1] == "Case 2", "Case 2 decryption failed"
    assert decrypted_list[2] is None, "None should remain None"
    assert decrypted_list[3] is None, "Empty should remain None"
    assert decrypted_list[4] == "Case 5", "Case 5 decryption failed"

    print("✓ Batch operations work correctly")

def test_key_rotation():
    """Test key rotation functionality."""
    print("\nTest 6: Key rotation...")

    old_key = EncryptionService.generate_key()
    new_key = EncryptionService.generate_key()

    old_service = EncryptionService(old_key)
    new_service = EncryptionService(new_key)

    plaintext = "Sensitive case data"
    old_encrypted = old_service.encrypt(plaintext)

    # Rotate to new key
    new_encrypted = old_service.rotate_key(old_encrypted, new_service)
    assert new_encrypted is not None, "Key rotation should return encrypted data"

    # Should not decrypt with old key
    try:
        old_service.decrypt(new_encrypted)
        assert False, "Should not decrypt with old key"
    except RuntimeError:
        pass  # Expected

    # Should decrypt with new key
    decrypted = new_service.decrypt(new_encrypted)
    assert decrypted == plaintext, "Decryption with new key failed"

    print("✓ Key rotation works correctly")

def test_field_operations():
    """Test encrypt_field and decrypt_field helpers."""
    print("\nTest 7: Field operations...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    data = {
        "name": "John Doe",
        "case_number": "2024-001",
        "ssn": "123-45-6789"
    }

    # Encrypt SSN field
    encrypted_data = service.encrypt_field(data, "ssn")

    # Original should be unchanged
    assert data["ssn"] == "123-45-6789", "Original data should be unchanged"

    # Encrypted data should have dict with encryption metadata
    assert encrypted_data["name"] == "John Doe", "Name should be unchanged"
    assert isinstance(encrypted_data["ssn"], dict), "SSN should be encrypted dict"
    assert "ciphertext" in encrypted_data["ssn"], "Should have ciphertext"
    assert "iv" in encrypted_data["ssn"], "Should have IV"
    assert "authTag" in encrypted_data["ssn"], "Should have auth tag"

    # Decrypt SSN field
    decrypted_data = service.decrypt_field(encrypted_data, "ssn")
    assert decrypted_data["ssn"] == "123-45-6789", "SSN should decrypt correctly"

    print("✓ Field operations work correctly")

def test_unicode_and_long_text():
    """Test Unicode characters and long text."""
    print("\nTest 8: Unicode and long text...")

    key = EncryptionService.generate_key()
    service = EncryptionService(key)

    # Test Unicode
    unicode_text = "Legal case: 被告人 vs 原告人 €1,000,000"
    encrypted = service.encrypt(unicode_text)
    decrypted = service.decrypt(encrypted)
    assert decrypted == unicode_text, "Unicode handling failed"

    # Test long text
    long_text = "A" * 10000
    encrypted = service.encrypt(long_text)
    decrypted = service.decrypt(encrypted)
    assert decrypted == long_text, "Long text handling failed"

    print("✓ Unicode and long text work correctly")

def main():
    """Run all tests."""
    print("=" * 60)
    print("EncryptionService Standalone Tests")
    print("=" * 60)

    try:
        test_basic_encryption()
        test_unique_ivs()
        test_wrong_key()
        test_tampered_data()
        test_batch_operations()
        test_key_rotation()
        test_field_operations()
        test_unicode_and_long_text()

        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        return 0

    except Exception as exc:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
