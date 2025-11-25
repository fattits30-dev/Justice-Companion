"""
Unit tests for EncryptionService.
Tests AES-256-GCM encryption, decryption, key rotation, and field operations.
"""

import pytest
import base64
import sys
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.encryption_service import EncryptionService, EncryptedData

class TestEncryptionService:
    """Test suite for EncryptionService."""

    @pytest.fixture
    def encryption_key(self) -> bytes:
        """Generate a test encryption key."""
        return EncryptionService.generate_key()

    @pytest.fixture
    def service(self, encryption_key: bytes) -> EncryptionService:
        """Create an EncryptionService instance."""
        return EncryptionService(encryption_key)

    def test_generate_key(self):
        """Test key generation produces 32-byte keys."""
        key = EncryptionService.generate_key()
        assert len(key) == 32
        assert isinstance(key, bytes)

        # Ensure keys are unique
        key2 = EncryptionService.generate_key()
        assert key != key2

    def test_init_with_bytes_key(self, encryption_key: bytes):
        """Test initialization with bytes key."""
        service = EncryptionService(encryption_key)
        assert service.key == encryption_key

    def test_init_with_base64_key(self, encryption_key: bytes):
        """Test initialization with base64 string key."""
        key_base64 = base64.b64encode(encryption_key).decode('utf-8')
        service = EncryptionService(key_base64)
        assert service.key == encryption_key

    def test_init_with_invalid_key_length(self):
        """Test initialization fails with wrong key length."""
        with pytest.raises(ValueError, match="must be exactly 32 bytes"):
            EncryptionService(b"short_key")

    def test_encrypt_decrypt_basic(self, service: EncryptionService):
        """Test basic encryption and decryption."""
        plaintext = "Sensitive legal information"

        # Encrypt
        encrypted = service.encrypt(plaintext)
        assert encrypted is not None
        assert isinstance(encrypted, EncryptedData)
        assert encrypted.algorithm == "aes-256-gcm"
        assert encrypted.version == 1

        # Decrypt
        decrypted = service.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_empty_string(self, service: EncryptionService):
        """Test encrypting empty string returns None."""
        assert service.encrypt("") is None
        assert service.encrypt("   ") is None
        assert service.encrypt(None) is None

    def test_decrypt_none(self, service: EncryptionService):
        """Test decrypting None returns None."""
        assert service.decrypt(None) is None

    def test_encrypt_unicode(self, service: EncryptionService):
        """Test encryption handles Unicode characters."""
        plaintext = "Legal case: 被告人 vs 原告人 €1,000,000"
        encrypted = service.encrypt(plaintext)
        decrypted = service.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_long_text(self, service: EncryptionService):
        """Test encryption handles long text."""
        plaintext = "A" * 10000  # 10KB of text
        encrypted = service.encrypt(plaintext)
        decrypted = service.decrypt(encrypted)
        assert decrypted == plaintext

    def test_unique_ivs(self, service: EncryptionService):
        """Test each encryption uses a unique IV."""
        plaintext = "Same plaintext"

        encrypted1 = service.encrypt(plaintext)
        encrypted2 = service.encrypt(plaintext)

        assert encrypted1 is not None
        assert encrypted2 is not None

        # IVs should be different
        assert encrypted1.iv != encrypted2.iv

        # Ciphertexts should be different (due to different IVs)
        assert encrypted1.ciphertext != encrypted2.ciphertext

        # But decryption should produce same plaintext
        assert service.decrypt(encrypted1) == plaintext
        assert service.decrypt(encrypted2) == plaintext

    def test_decrypt_with_wrong_key(self):
        """Test decryption fails with wrong key."""
        key1 = EncryptionService.generate_key()
        key2 = EncryptionService.generate_key()

        service1 = EncryptionService(key1)
        service2 = EncryptionService(key2)

        encrypted = service1.encrypt("Secret data")

        with pytest.raises(RuntimeError, match="Decryption failed"):
            service2.decrypt(encrypted)

    def test_decrypt_tampered_ciphertext(self, service: EncryptionService):
        """Test decryption fails with tampered ciphertext."""
        plaintext = "Sensitive data"
        encrypted = service.encrypt(plaintext)

        # Tamper with ciphertext
        assert encrypted is not None
        tampered_ciphertext = encrypted.ciphertext[:-1] + "X"
        tampered = EncryptedData(
            algorithm=encrypted.algorithm,
            ciphertext=tampered_ciphertext,
            iv=encrypted.iv,
            auth_tag=encrypted.auth_tag,
            version=encrypted.version
        )

        with pytest.raises(RuntimeError, match="Decryption failed"):
            service.decrypt(tampered)

    def test_decrypt_tampered_auth_tag(self, service: EncryptionService):
        """Test decryption fails with tampered auth tag."""
        plaintext = "Sensitive data"
        encrypted = service.encrypt(plaintext)

        # Tamper with auth tag
        assert encrypted is not None
        tampered_auth_tag = encrypted.auth_tag[:-1] + "X"
        tampered = EncryptedData(
            algorithm=encrypted.algorithm,
            ciphertext=encrypted.ciphertext,
            iv=encrypted.iv,
            auth_tag=tampered_auth_tag,
            version=encrypted.version
        )

        with pytest.raises(RuntimeError, match="Decryption failed"):
            service.decrypt(tampered)

    def test_is_encrypted(self, service: EncryptionService):
        """Test is_encrypted validation."""
        plaintext = "Test data"
        encrypted = service.encrypt(plaintext)

        assert service.is_encrypted(encrypted) is True
        assert service.is_encrypted(None) is False
        assert service.is_encrypted("not encrypted") is False
        assert service.is_encrypted(123) is False

        # Test with dict format (as stored in database)
        encrypted_dict = encrypted.to_dict() if encrypted else {}
        assert service.is_encrypted(encrypted_dict) is True

        # Test with missing required fields
        assert service.is_encrypted({"algorithm": "aes-256-gcm"}) is False

    def test_batch_encrypt(self, service: EncryptionService):
        """Test batch encryption."""
        plaintexts = [
            "Case 1 details",
            "Case 2 details",
            None,
            "",
            "Case 5 details"
        ]

        encrypted_list = service.batch_encrypt(plaintexts)

        assert len(encrypted_list) == 5
        assert encrypted_list[0] is not None
        assert encrypted_list[1] is not None
        assert encrypted_list[2] is None  # None input
        assert encrypted_list[3] is None  # Empty string
        assert encrypted_list[4] is not None

        # Verify decryption
        assert service.decrypt(encrypted_list[0]) == "Case 1 details"
        assert service.decrypt(encrypted_list[1]) == "Case 2 details"
        assert service.decrypt(encrypted_list[4]) == "Case 5 details"

    def test_batch_decrypt(self, service: EncryptionService):
        """Test batch decryption."""
        plaintexts = ["Data 1", "Data 2", "Data 3"]
        encrypted_list = service.batch_encrypt(plaintexts)

        decrypted_list = service.batch_decrypt(encrypted_list)

        assert decrypted_list == plaintexts

    def test_batch_decrypt_with_none(self, service: EncryptionService):
        """Test batch decryption with None values."""
        encrypted_list = [
            service.encrypt("Data 1"),
            None,
            service.encrypt("Data 3")
        ]

        decrypted_list = service.batch_decrypt(encrypted_list)

        assert decrypted_list[0] == "Data 1"
        assert decrypted_list[1] is None
        assert decrypted_list[2] == "Data 3"

    def test_rotate_key(self):
        """Test key rotation functionality."""
        old_key = EncryptionService.generate_key()
        new_key = EncryptionService.generate_key()

        old_service = EncryptionService(old_key)
        new_service = EncryptionService(new_key)

        plaintext = "Sensitive case data"

        # Encrypt with old key
        old_encrypted = old_service.encrypt(plaintext)
        assert old_encrypted is not None

        # Rotate to new key
        new_encrypted = old_service.rotate_key(old_encrypted, new_service)
        assert new_encrypted is not None

        # Should not be able to decrypt with old key
        with pytest.raises(RuntimeError):
            old_service.decrypt(new_encrypted)

        # Should decrypt with new key
        decrypted = new_service.decrypt(new_encrypted)
        assert decrypted == plaintext

    def test_rotate_key_with_none(self, service: EncryptionService):
        """Test key rotation with None returns None."""
        new_service = EncryptionService(EncryptionService.generate_key())

        # Rotate None encrypted data
        result = service.rotate_key(None, new_service)
        assert result is None

    def test_encrypt_field(self, service: EncryptionService):
        """Test encrypting a single field in a dictionary."""
        data = {
            "name": "John Doe",
            "case_number": "2024-001",
            "ssn": "123-45-6789"
        }

        encrypted_data = service.encrypt_field(data, "ssn")

        # Original data should be unchanged
        assert data["ssn"] == "123-45-6789"

        # New data should have encrypted SSN
        assert encrypted_data["name"] == "John Doe"
        assert encrypted_data["case_number"] == "2024-001"
        assert isinstance(encrypted_data["ssn"], dict)
        assert "ciphertext" in encrypted_data["ssn"]
        assert "iv" in encrypted_data["ssn"]
        assert "authTag" in encrypted_data["ssn"]

    def test_decrypt_field(self, service: EncryptionService):
        """Test decrypting a single field in a dictionary."""
        data = {
            "name": "John Doe",
            "case_number": "2024-001",
            "ssn": "123-45-6789"
        }

        # Encrypt the SSN field
        encrypted_data = service.encrypt_field(data, "ssn")

        # Decrypt the SSN field
        decrypted_data = service.decrypt_field(encrypted_data, "ssn")

        assert decrypted_data["name"] == "John Doe"
        assert decrypted_data["case_number"] == "2024-001"
        assert decrypted_data["ssn"] == "123-45-6789"

    def test_encrypt_field_missing_field(self, service: EncryptionService):
        """Test encrypting non-existent field raises error."""
        data = {"name": "John Doe"}

        with pytest.raises(KeyError, match="Field 'ssn' not found"):
            service.encrypt_field(data, "ssn")

    def test_decrypt_field_missing_field(self, service: EncryptionService):
        """Test decrypting non-existent field raises error."""
        data = {"name": "John Doe"}

        with pytest.raises(KeyError, match="Field 'ssn' not found"):
            service.decrypt_field(data, "ssn")

    def test_encrypt_field_with_none_value(self, service: EncryptionService):
        """Test encrypting field with None value."""
        data = {"name": "John Doe", "ssn": None}

        encrypted_data = service.encrypt_field(data, "ssn")
        assert encrypted_data["ssn"] is None

    def test_decrypt_field_with_none_value(self, service: EncryptionService):
        """Test decrypting field with None value."""
        data = {"name": "John Doe", "ssn": None}

        decrypted_data = service.decrypt_field(data, "ssn")
        assert decrypted_data["ssn"] is None

    def test_encrypted_data_to_dict(self, service: EncryptionService):
        """Test EncryptedData serialization to dict."""
        plaintext = "Test data"
        encrypted = service.encrypt(plaintext)

        assert encrypted is not None
        data_dict = encrypted.to_dict()

        assert isinstance(data_dict, dict)
        assert data_dict["algorithm"] == "aes-256-gcm"
        assert data_dict["version"] == 1
        assert "ciphertext" in data_dict
        assert "iv" in data_dict
        assert "authTag" in data_dict  # Note: camelCase for JSON compatibility

    def test_encrypted_data_from_dict(self, service: EncryptionService):
        """Test EncryptedData deserialization from dict."""
        plaintext = "Test data"
        encrypted = service.encrypt(plaintext)

        assert encrypted is not None
        data_dict = encrypted.to_dict()

        # Reconstruct from dict
        reconstructed = EncryptedData.from_dict(data_dict)

        # Should decrypt to same plaintext
        decrypted = service.decrypt(reconstructed)
        assert decrypted == plaintext

    def test_encrypted_data_from_dict_snake_case(self, service: EncryptionService):
        """Test EncryptedData supports both camelCase and snake_case."""
        data_dict = {
            "algorithm": "aes-256-gcm",
            "ciphertext": "dGVzdA==",
            "iv": "YWJjZGVm",
            "auth_tag": "Z2hpamts",  # snake_case
            "version": 1
        }

        encrypted = EncryptedData.from_dict(data_dict)
        assert encrypted.auth_tag == "Z2hpamts"

    def test_concurrent_encryption(self, service: EncryptionService):
        """Test thread-safe encryption operations."""
        import concurrent.futures

        plaintexts = [f"Case {i} details" for i in range(100)]

        # Encrypt concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            encrypted_list = list(executor.map(service.encrypt, plaintexts))

        # Verify all encryptions succeeded
        assert len(encrypted_list) == 100
        assert all(enc is not None for enc in encrypted_list)

        # Verify all have unique IVs
        ivs = [enc.iv for enc in encrypted_list if enc]
        assert len(ivs) == len(set(ivs))  # All unique

        # Verify all decrypt correctly
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            decrypted_list = list(executor.map(service.decrypt, encrypted_list))

        assert decrypted_list == plaintexts

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
