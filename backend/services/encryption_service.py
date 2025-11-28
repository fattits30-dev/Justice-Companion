"""
Encryption service for Justice Companion.

Provides secure encryption/decryption of sensitive data using AES-256-GCM.
Handles API keys, sensitive configuration, and user data encryption.
"""

import os
import secrets
from typing import Optional, List, Dict, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag


class EncryptedData:
    """Container for encrypted data with metadata."""

    def __init__(self, algorithm: str, ciphertext: str, iv: str, auth_tag: str, version: int = 1):
        self.algorithm = algorithm
        self.ciphertext = ciphertext  # Hex string
        self.iv = iv  # Hex string
        self.auth_tag = auth_tag  # Hex string
        self.version = version


class EncryptionService:
    """
    Encryption service using AES-256-GCM for secure data encryption.

    Features:
    - AES-256-GCM encryption with unique nonces
    - PBKDF2 key derivation for password-based keys
    - Secure random key generation
    - Authentication tag verification
    """

    def __init__(self, key: Optional[bytes] = None):
        """
        Initialize encryption service with master key.

        Args:
            key: 32-byte master key. If None, uses environment variable.
        """
        if key is None:
            key_hex = os.getenv("ENCRYPTION_KEY")
            if not key_hex:
                raise ValueError("ENCRYPTION_KEY environment variable not set")
            key = bytes.fromhex(key_hex)

        if len(key) != 32:
            raise ValueError("Encryption key must be 32 bytes (256 bits)")

        self._key = key
        self._aesgcm = AESGCM(key)

    @classmethod
    def generate_key(cls) -> bytes:
        """Generate a new random 256-bit encryption key."""
        return secrets.token_bytes(32)

    def encrypt(self, plaintext: str) -> EncryptedData:
        """
        Encrypt plaintext string.

        Args:
            plaintext: String to encrypt

        Returns:
            EncryptedData object with encryption metadata
        """
        if not plaintext:
            return None

        # Generate unique nonce for each encryption
        iv = secrets.token_bytes(12)  # 96 bits for GCM

        # Convert to bytes and encrypt
        plaintext_bytes = plaintext.encode('utf-8')
        ciphertext_with_tag = self._aesgcm.encrypt(iv, plaintext_bytes, None)

        # Split ciphertext and auth tag (GCM combines them)
        # For simplicity, we'll store the combined data and handle it during decryption
        return EncryptedData(
            algorithm="aes-256-gcm",
            ciphertext=ciphertext_with_tag.hex(),  # Store as hex string
            iv=iv.hex(),  # Store as hex string
            auth_tag="",  # GCM combines auth tag with ciphertext
            version=1
        )

    def decrypt(self, encrypted_data: EncryptedData) -> str:
        """
        Decrypt EncryptedData back to plaintext.

        Args:
            encrypted_data: EncryptedData object

        Returns:
            Decrypted plaintext string

        Raises:
            RuntimeError: If decryption fails
        """
        try:
            # Convert hex strings back to bytes
            iv_bytes = bytes.fromhex(encrypted_data.iv)
            ciphertext_bytes = bytes.fromhex(encrypted_data.ciphertext)

            # Decrypt using AES-GCM
            plaintext_bytes = self._aesgcm.decrypt(
                iv_bytes,
                ciphertext_bytes,
                None
            )

            return plaintext_bytes.decode('utf-8')

        except (InvalidTag, ValueError) as e:
            raise RuntimeError(f"Decryption failed: {str(e)}")

    def batch_encrypt(self, plaintexts: List[Optional[str]]) -> List[Optional[EncryptedData]]:
        """
        Encrypt multiple plaintexts.

        Args:
            plaintexts: List of strings to encrypt (None values remain None)

        Returns:
            List of EncryptedData objects (None for None inputs)
        """
        results = []
        for plaintext in plaintexts:
            if plaintext is None or plaintext == "":
                results.append(None)
            else:
                results.append(self.encrypt(plaintext))
        return results

    def batch_decrypt(self, encrypted_list: List[Optional[EncryptedData]]) -> List[Optional[str]]:
        """
        Decrypt multiple EncryptedData objects.

        Args:
            encrypted_list: List of EncryptedData objects (None values remain None)

        Returns:
            List of decrypted strings
        """
        results = []
        for encrypted_data in encrypted_list:
            if encrypted_data is None:
                results.append(None)
            else:
                results.append(self.decrypt(encrypted_data))
        return results

    def rotate_key(self, encrypted_data: EncryptedData, new_service: 'EncryptionService') -> EncryptedData:
        """
        Rotate encrypted data to use a new key.

        Args:
            encrypted_data: Data encrypted with old key
            new_service: Service with new key

        Returns:
            Data re-encrypted with new key
        """
        # Decrypt with old key
        plaintext = self.decrypt(encrypted_data)

        # Encrypt with new key
        return new_service.encrypt(plaintext)

    def encrypt_field(self, data: Dict[str, Any], field: str) -> Dict[str, Any]:
        """
        Encrypt a specific field in a data dictionary.

        Args:
            data: Dictionary containing the field to encrypt
            field: Name of the field to encrypt

        Returns:
            Modified dictionary with encrypted field
        """
        if field not in data:
            return data

        encrypted = self.encrypt(str(data[field]))

        # Replace field with encryption metadata
        result = data.copy()
        result[field] = {
            "ciphertext": encrypted.ciphertext,
            "iv": encrypted.iv,
            "authTag": encrypted.auth_tag,
            "algorithm": encrypted.algorithm,
            "version": encrypted.version
        }

        return result

    def decrypt_field(self, data: Dict[str, Any], field: str) -> Dict[str, Any]:
        """
        Decrypt a specific field in a data dictionary.

        Args:
            data: Dictionary containing the encrypted field
            field: Name of the field to decrypt

        Returns:
            Modified dictionary with decrypted field
        """
        if field not in data or not isinstance(data[field], dict):
            return data

        field_data = data[field]

        # Reconstruct EncryptedData object
        encrypted = EncryptedData(
            algorithm=field_data["algorithm"],
            ciphertext=field_data["ciphertext"],  # Already a hex string
            iv=field_data["iv"],  # Already a hex string
            auth_tag=field_data.get("authTag", ""),  # Already a string
            version=field_data.get("version", 1)
        )

        # Decrypt
        decrypted_value = self.decrypt(encrypted)

        # Replace field with decrypted value
        result = data.copy()
        result[field] = decrypted_value

        return result

    def derive_key_from_password(self, password: str, salt: bytes) -> bytes:
        """
        Derive encryption key from password using PBKDF2.

        Args:
            password: User password
            salt: Random salt bytes

        Returns:
            Derived 32-byte key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,  # OWASP recommended
        )

        password_bytes = password.encode('utf-8')
        return kdf.derive(password_bytes)


# Dependency injection function for FastAPI
def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    return EncryptionService()
