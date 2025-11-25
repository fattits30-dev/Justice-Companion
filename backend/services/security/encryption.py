"""
AES-256-GCM encryption service for protecting sensitive legal data.
Ported from src/services/EncryptionService.ts

Security properties:
- 256-bit key size (AES-256)
- Galois/Counter Mode (GCM) for authenticated encryption
- Unique random IV for each encryption operation
- Authentication tag prevents tampering
- Zero plaintext logging or storage
- Thread-safe encryption/decryption operations
"""

import base64
import os
import threading
from typing import Optional, Dict, Any, List, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class EncryptedData:
    """Encrypted data format with authentication."""

    def __init__(
        self, algorithm: str, ciphertext: str, iv: str, auth_tag: str, version: int
    ):
        self.algorithm = algorithm
        self.ciphertext = ciphertext
        self.iv = iv
        self.auth_tag = auth_tag
        self.version = version

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "algorithm": self.algorithm,
            "ciphertext": self.ciphertext,
            "iv": self.iv,
            "authTag": self.auth_tag,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EncryptedData":
        """Create EncryptedData from dictionary."""
        auth_tag = data.get("authTag") or data.get("auth_tag")
        if not isinstance(auth_tag, str):
            raise ValueError("Encrypted data missing authentication tag")
        return cls(
            algorithm=data["algorithm"],
            ciphertext=data["ciphertext"],
            iv=data["iv"],
            auth_tag=auth_tag,
            version=data["version"],
        )

class EncryptionService:
    """
    AES-256-GCM encryption service for protecting sensitive legal data.

    Example:
        service = EncryptionService(encryption_key)
        encrypted = service.encrypt("Sensitive legal information")
        decrypted = service.decrypt(encrypted)
    """

    ALGORITHM = "aes-256-gcm"
    VERSION = 1
    IV_LENGTH = 12  # 96 bits is standard for GCM
    KEY_LENGTH = 32  # 256 bits

    def __init__(self, key: Union[bytes, str]):
        """
        Initialize encryption service.

        Args:
            key: 256-bit (32 byte) encryption key as bytes or base64 string

        Raises:
            ValueError: If key is not exactly 32 bytes
        """
        # Convert base64 string to bytes if needed
        if isinstance(key, str):
            self.key = base64.b64decode(key)
        else:
            self.key = key

        # CRITICAL: Verify key length (256 bits = 32 bytes)
        if len(self.key) != self.KEY_LENGTH:
            raise ValueError(
                f"Encryption key must be exactly 32 bytes (256 bits), got {len(self.key)} bytes"
            )

        # Initialize AESGCM cipher
        self.cipher = AESGCM(self.key)

        # Thread-safe lock for encryption operations
        self._lock = threading.Lock()

    def encrypt(self, plaintext: Optional[str]) -> Optional[EncryptedData]:
        """
        Encrypt plaintext using AES-256-GCM.

        Args:
            plaintext: String to encrypt

        Returns:
            EncryptedData object or None if input is empty/null

        Security:
        - Generates cryptographically secure random IV for each operation
        - Produces authentication tag to prevent tampering
        - Never reuses IVs (critical for GCM security)
        """
        # Don't encrypt empty/null values
        if not plaintext or not plaintext.strip():
            return None

        try:
            # Generate random IV (MUST be unique for each encryption)
            iv = os.urandom(self.IV_LENGTH)

            # Encrypt and get ciphertext with auth tag
            plaintext_bytes = plaintext.encode("utf-8")
            ciphertext_with_tag = self.cipher.encrypt(iv, plaintext_bytes, None)

            # Split ciphertext and auth tag (last 16 bytes is auth tag for GCM)
            ciphertext = ciphertext_with_tag[:-16]
            auth_tag = ciphertext_with_tag[-16:]

            return EncryptedData(
                algorithm=self.ALGORITHM,
                ciphertext=base64.b64encode(ciphertext).decode("utf-8"),
                iv=base64.b64encode(iv).decode("utf-8"),
                auth_tag=base64.b64encode(auth_tag).decode("utf-8"),
                version=self.VERSION,
            )
        except Exception as error:
            # CRITICAL: Never log plaintext or key material
            raise RuntimeError(f"Encryption failed: {str(error)}") from error

    def decrypt(self, encrypted_data: Optional[EncryptedData]) -> Optional[str]:
        """
        Decrypt ciphertext using AES-256-GCM.

        Args:
            encrypted_data: EncryptedData object from encrypt()

        Returns:
            Decrypted plaintext string or None if input is None

        Raises:
            RuntimeError: If decryption fails (wrong key, tampered data, corrupted ciphertext)

        Security:
        - Verifies authentication tag before returning plaintext
        - Throws error if data has been tampered with
        - Generic error messages (don't leak key material or plaintext)
        """
        if not encrypted_data:
            return None

        try:
            # Validate encrypted data structure
            if not self.is_encrypted(encrypted_data):
                raise ValueError("Invalid encrypted data format")

            # Check algorithm version
            if encrypted_data.algorithm != self.ALGORITHM:
                raise ValueError(f"Unsupported algorithm: {encrypted_data.algorithm}")

            # Decode base64 components
            iv = base64.b64decode(encrypted_data.iv)
            ciphertext = base64.b64decode(encrypted_data.ciphertext)
            auth_tag = base64.b64decode(encrypted_data.auth_tag)

            # Combine ciphertext and auth tag for decryption
            ciphertext_with_tag = ciphertext + auth_tag

            # Decrypt data (verifies auth tag automatically)
            plaintext_bytes = self.cipher.decrypt(iv, ciphertext_with_tag, None)

            return plaintext_bytes.decode("utf-8")
        except Exception:
            # CRITICAL: Don't leak plaintext, key material, or detailed errors
            # Authentication tag verification failures will throw here
            raise RuntimeError(
                "Decryption failed: data may be corrupted or tampered with"
            )

    def is_encrypted(self, data: Any) -> bool:
        """
        Check if data is in encrypted format.

        Args:
            data: Data to check

        Returns:
            True if data is EncryptedData, False otherwise
        """
        if not data:
            return False

        if isinstance(data, EncryptedData):
            return True

        if isinstance(data, dict):
            required_keys = {"algorithm", "ciphertext", "iv", "version"}
            auth_tag_key = "authTag" in data or "auth_tag" in data
            return all(key in data for key in required_keys) and auth_tag_key

        return False

    def batch_encrypt(
        self, plaintexts: List[Optional[str]]
    ) -> List[Optional[EncryptedData]]:
        """
        Batch encrypt multiple plaintexts with optimized performance.

        Args:
            plaintexts: Array of strings to encrypt

        Returns:
            Array of EncryptedData objects (None for empty/null inputs)

        Performance optimization:
        - Generates unique IV for each plaintext (security requirement)
        - Processes all encryptions in a single batch operation

        Security properties:
        - Each plaintext gets a unique random IV (critical for GCM mode)
        - Authentication tags prevent tampering
        - Maintains same security guarantees as individual encryption
        """
        results: List[Optional[EncryptedData]] = []

        for plaintext in plaintexts:
            # Handle empty/null values
            if not plaintext or not plaintext.strip():
                results.append(None)
                continue

            try:
                # Encrypt with unique IV
                encrypted = self.encrypt(plaintext)
                results.append(encrypted)
            except Exception as error:
                # CRITICAL: Never log plaintext or key material
                raise RuntimeError(
                    f"Batch encryption failed at index {len(results)}: {str(error)}"
                ) from error

        return results

    def batch_decrypt(
        self, encrypted_data_array: List[Optional[EncryptedData]]
    ) -> List[Optional[str]]:
        """
        Batch decrypt multiple ciphertexts with optimized performance.

        Args:
            encrypted_data_array: Array of EncryptedData objects from encrypt() or batch_encrypt()

        Returns:
            Array of decrypted plaintext strings (None for null inputs)

        Raises:
            RuntimeError: If any decryption fails (wrong key, tampered data, corrupted ciphertext)

        Security properties:
        - Verifies authentication tag for each ciphertext before returning
        - Throws error if any data has been tampered with
        - Maintains same security guarantees as individual decryption
        """
        results: List[Optional[str]] = []

        for i, encrypted_data in enumerate(encrypted_data_array):
            if not encrypted_data:
                results.append(None)
                continue

            try:
                # Decrypt with auth tag verification
                plaintext = self.decrypt(encrypted_data)
                results.append(plaintext)
            except Exception:
                # CRITICAL: Don't leak plaintext, key material, or detailed errors
                raise RuntimeError(
                    f"Batch decryption failed at index {i}: data may be corrupted or tampered with"
                )

        return results

    def rotate_key(
        self, old_encrypted_data: EncryptedData, new_service: "EncryptionService"
    ) -> Optional[EncryptedData]:
        """
        Rotate encryption key by re-encrypting data with new key.

        Args:
            old_encrypted_data: Data encrypted with old key (this instance)
            new_service: EncryptionService initialized with new key

        Returns:
            Data re-encrypted with new key, or None if decryption returns None

        Note:
            This method requires the old EncryptionService instance to decrypt,
            then uses new_service to encrypt. Caller must handle batch re-encryption.

        Example:
            old_service = EncryptionService(old_key)
            new_service = EncryptionService(new_key)

            # Re-encrypt single value
            new_encrypted = old_service.rotate_key(old_encrypted_data, new_service)

            # Re-encrypt all values in database
            for record in database.get_all_encrypted_records():
                new_encrypted = old_service.rotate_key(record.encrypted_field, new_service)
                database.update(record.id, encrypted_field=new_encrypted)
        """
        # Decrypt with old key (this instance)
        plaintext = self.decrypt(old_encrypted_data)

        # Re-encrypt with new key
        return new_service.encrypt(plaintext)

    def encrypt_field(self, data: Dict[str, Any], field: str) -> Dict[str, Any]:
        """
        Encrypt a specific field in a dictionary.

        Args:
            data: Dictionary containing the field to encrypt
            field: Name of the field to encrypt

        Returns:
            New dictionary with encrypted field (original dict is unchanged)

        Raises:
            KeyError: If field doesn't exist in data
            RuntimeError: If encryption fails

        Example:
            user_data = {"name": "John Doe", "ssn": "123-45-6789"}
            encrypted_data = service.encrypt_field(user_data, "ssn")
            # Result: {"name": "John Doe", "ssn": {...encrypted data...}}
        """
        if field not in data:
            raise KeyError(f"Field '{field}' not found in data")

        # Create a copy to avoid mutating the original
        result = data.copy()

        # Encrypt the field value
        plaintext = str(data[field]) if data[field] is not None else None
        encrypted = self.encrypt(plaintext)

        # Store as dict for JSON serialization
        result[field] = encrypted.to_dict() if encrypted else None

        return result

    def decrypt_field(self, data: Dict[str, Any], field: str) -> Dict[str, Any]:
        """
        Decrypt a specific field in a dictionary.

        Args:
            data: Dictionary containing the encrypted field
            field: Name of the field to decrypt

        Returns:
            New dictionary with decrypted field (original dict is unchanged)

        Raises:
            KeyError: If field doesn't exist in data
            RuntimeError: If decryption fails

        Example:
            encrypted_data = {"name": "John Doe", "ssn": {...encrypted data...}}
            decrypted_data = service.decrypt_field(encrypted_data, "ssn")
            # Result: {"name": "John Doe", "ssn": "123-45-6789"}
        """
        if field not in data:
            raise KeyError(f"Field '{field}' not found in data")

        # Create a copy to avoid mutating the original
        result = data.copy()

        # Get encrypted field value
        encrypted_value = data[field]

        if encrypted_value is None:
            result[field] = None
        elif isinstance(encrypted_value, dict):
            # Convert dict to EncryptedData object
            encrypted_data = EncryptedData.from_dict(encrypted_value)
            result[field] = self.decrypt(encrypted_data)
        elif isinstance(encrypted_value, EncryptedData):
            result[field] = self.decrypt(encrypted_value)
        else:
            raise ValueError(f"Field '{field}' is not in encrypted format")

        return result

    @staticmethod
    def generate_key() -> bytes:
        """
        Generate a new 256-bit encryption key.

        Returns:
            Cryptographically secure random 32-byte key

        Usage:
            key = EncryptionService.generate_key()
            key_base64 = base64.b64encode(key).decode('utf-8')
            # Store securely in .env file: ENCRYPTION_KEY_BASE64=<key_base64>
        """
        return os.urandom(32)  # 32 bytes = 256 bits
