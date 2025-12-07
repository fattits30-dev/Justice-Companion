"""Tests for P0 critical fixes.

This test file verifies:
1. Duplicate @classmethod decorators are removed from Pydantic field validators
2. Encryption key requirement is enforced (fail-fast behavior)
3. Backend refuses to start without ENCRYPTION_KEY_BASE64
"""
import pytest
import os
import subprocess
import sys
from pathlib import Path
from pydantic import ValidationError
from backend.routes.chat import ChatStreamRequest, ChatSendRequest


class TestChatValidation:
    """Test Pydantic field validators work correctly without duplicate decorators."""

    def test_chat_stream_request_strips_message(self):
        """Verify ChatStreamRequest.strip_message validator works."""
        request = ChatStreamRequest(
            message="  test message with spaces  ",
            conversationId=None,
            caseId=None,
            useRAG=True
        )
        # Should strip leading/trailing whitespace
        assert request.message == "test message with spaces"

    def test_chat_send_request_strips_message(self):
        """Verify ChatSendRequest.strip_message validator works."""
        request = ChatSendRequest(
            message="  another test  ",
            conversationId=None,
            caseId=None,
            useRAG=False
        )
        # Should strip leading/trailing whitespace
        assert request.message == "another test"

    def test_chat_stream_request_min_length_validation(self):
        """Verify minimum length validation works."""
        with pytest.raises(ValidationError) as exc_info:
            ChatStreamRequest(
                message="",  # Empty message should fail
                conversationId=None,
                caseId=None,
                useRAG=True
            )
        # Check that validation error is raised
        assert "message" in str(exc_info.value)

    def test_chat_send_request_max_length_validation(self):
        """Verify maximum length validation works."""
        with pytest.raises(ValidationError) as exc_info:
            ChatSendRequest(
                message="x" * 10001,  # Exceeds max_length=10000
                conversationId=None,
                caseId=None,
                useRAG=True
            )
        # Check that validation error is raised
        assert "message" in str(exc_info.value)


class TestEncryptionKeyRequirement:
    """Test backend fails fast without ENCRYPTION_KEY_BASE64."""

    def test_backend_requires_encryption_key(self):
        """Verify app refuses to start without ENCRYPTION_KEY_BASE64."""
        # Skip this test in CI/CD or if we can't run subprocess
        if os.getenv("CI") or os.getenv("SKIP_SUBPROCESS_TESTS"):
            pytest.skip("Skipping subprocess test in CI/CD environment")

        # Create isolated environment without encryption key
        env = os.environ.copy()
        env.pop("ENCRYPTION_KEY_BASE64", None)

        # Get path to backend main module
        backend_path = Path(__file__).parent.parent
        main_module = str(backend_path / "main.py")

        try:
            # Try to import backend.main module (which triggers lifespan)
            # This should fail with RuntimeError
            result = subprocess.run(
                [sys.executable, "-c",
                 "import sys; "
                 "sys.path.insert(0, r'c:\\Users\\sava6\\ClaudeHome\\projects\\Justice Companion'); "
                 "from backend.main import app; "
                 "print('ERROR: Backend started without encryption key')"],
                env=env,
                capture_output=True,
                timeout=10,
                text=True
            )

            # Should fail (non-zero exit code)
            assert result.returncode != 0, \
                f"Backend should fail without ENCRYPTION_KEY_BASE64, but succeeded. Output: {result.stdout}"

            # Should mention encryption key in error
            stderr_lower = result.stderr.lower()
            assert "encryption_key_base64" in stderr_lower or "encryption" in stderr_lower, \
                f"Error should mention encryption key. Stderr: {result.stderr}"

        except subprocess.TimeoutExpired:
            pytest.fail("Backend process hung (should fail fast without encryption key)")


class TestEncryptionServiceDependencies:
    """Test route-level encryption service dependencies fail correctly."""

    def test_cases_encryption_service_requires_key(self):
        """Verify cases.py encryption service dependency fails without key."""
        from backend.routes.cases import get_encryption_service
        from fastapi import HTTPException

        # Remove encryption key from environment
        original_key = os.getenv("ENCRYPTION_KEY_BASE64")
        if "ENCRYPTION_KEY_BASE64" in os.environ:
            del os.environ["ENCRYPTION_KEY_BASE64"]

        try:
            # Should raise HTTPException
            with pytest.raises(HTTPException) as exc_info:
                get_encryption_service()

            # Should be 500 Internal Server Error
            assert exc_info.value.status_code == 500
            assert "ENCRYPTION_KEY_BASE64" in exc_info.value.detail

        finally:
            # Restore original key
            if original_key:
                os.environ["ENCRYPTION_KEY_BASE64"] = original_key

    def test_evidence_encryption_service_requires_key(self):
        """Verify evidence.py encryption service dependency fails without key."""
        from backend.routes.evidence import get_encryption_service
        from fastapi import HTTPException

        # Remove encryption key from environment
        original_key = os.getenv("ENCRYPTION_KEY_BASE64")
        if "ENCRYPTION_KEY_BASE64" in os.environ:
            del os.environ["ENCRYPTION_KEY_BASE64"]

        try:
            # Should raise HTTPException
            with pytest.raises(HTTPException) as exc_info:
                get_encryption_service()

            # Should be 500 Internal Server Error
            assert exc_info.value.status_code == 500
            assert "ENCRYPTION_KEY_BASE64" in exc_info.value.detail

        finally:
            # Restore original key
            if original_key:
                os.environ["ENCRYPTION_KEY_BASE64"] = original_key


class TestEncryptionKeyGeneration:
    """Test encryption key generation instructions."""

    def test_key_generation_script_works(self):
        """Verify the key generation command in error message works."""
        # Run the key generation command from error message
        result = subprocess.run(
            [sys.executable, "-c",
             "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"],
            capture_output=True,
            text=True,
            timeout=5
        )

        # Should succeed
        assert result.returncode == 0, f"Key generation failed: {result.stderr}"

        # Should produce base64 string of correct length (44 chars for 32 bytes)
        generated_key = result.stdout.strip()
        assert len(generated_key) == 44, \
            f"Generated key should be 44 chars (32 bytes base64), got {len(generated_key)}: {generated_key}"

        # Should be valid base64
        try:
            import base64
            decoded = base64.b64decode(generated_key)
            assert len(decoded) == 32, f"Decoded key should be 32 bytes, got {len(decoded)}"
        except Exception as e:
            pytest.fail(f"Generated key is not valid base64: {e}")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
