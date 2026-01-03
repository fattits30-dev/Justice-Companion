"""Shim for standalone encryption service integration tests."""

from backend.services.security.encryption import EncryptedData, EncryptionService

__all__ = ["EncryptedData", "EncryptionService"]
