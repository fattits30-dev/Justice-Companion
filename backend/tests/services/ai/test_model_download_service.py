"""
Tests for ModelDownloadService.

Test coverage:
- Model catalog operations
- Download with progress tracking
- Checksum verification
- Error handling and cleanup
- Active download tracking
- File system operations
- Audit logging integration

Run tests:
    pytest backend/services/test_model_download_service.py -v
    pytest backend/services/test_model_download_service.py::test_download_model_success -v
"""

import hashlib
import pytest
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
import tempfile
import shutil

from backend.services.ai.model_download import (
    ModelDownloadService,
    ModelInfo,
    DownloadProgress,
    DownloadStatus,
    ActiveDownload
)

# ===== FIXTURES =====

@pytest.fixture
def temp_models_dir():
    """Create temporary models directory."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def mock_audit_logger():
    """Create mock audit logger."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def service(temp_models_dir, mock_audit_logger):
    """Create ModelDownloadService instance with temp directory."""
    return ModelDownloadService(
        models_dir=temp_models_dir,
        audit_logger=mock_audit_logger
    )

@pytest.fixture
def sample_model():
    """Sample model info for testing."""
    return ModelInfo(
        id="test-model",
        name="Test Model",
        file_name="test_model.gguf",
        url="https://example.com/test_model.gguf",
        size=1000,
        sha256="abc123",
        description="Test model",
        recommended=True
    )

# ===== INITIALIZATION TESTS =====

def test_service_initialization(temp_models_dir, mock_audit_logger):
    """Test service initializes correctly."""
    service = ModelDownloadService(
        models_dir=temp_models_dir,
        audit_logger=mock_audit_logger
    )

    assert service.models_dir == Path(temp_models_dir)
    assert service.audit_logger == mock_audit_logger
    assert isinstance(service.active_downloads, dict)
    assert len(service.active_downloads) == 0
    assert Path(temp_models_dir).exists()

def test_service_creates_models_directory(mock_audit_logger):
    """Test service creates models directory if it doesn't exist."""
    with tempfile.TemporaryDirectory() as temp_dir:
        models_path = Path(temp_dir) / "models"
        assert not models_path.exists()

        service = ModelDownloadService(
            models_dir=str(models_path),
            audit_logger=mock_audit_logger
        )

        assert models_path.exists()

def test_service_logs_initialization(temp_models_dir, mock_audit_logger):
    """Test service logs initialization event."""
    service = ModelDownloadService(
        models_dir=temp_models_dir,
        audit_logger=mock_audit_logger
    )

    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "model.service.initialized"
    assert call_args["action"] == "initialize"
    assert call_args["success"] is True

# ===== MODEL CATALOG TESTS =====

def test_get_available_models(service):
    """Test getting available models from catalog."""
    models = service.get_available_models()

    assert isinstance(models, list)
    assert len(models) == 3  # Qwen 3 variants

    # Check first model structure
    model = models[0]
    assert "id" in model
    assert "name" in model
    assert "fileName" in model
    assert "url" in model
    assert "size" in model
    assert "description" in model
    assert "recommended" in model

def test_available_models_catalog(service):
    """Test model catalog contains expected models."""
    models = service.get_available_models()
    model_ids = [m["id"] for m in models]

    assert "qwen3-8b-q4" in model_ids
    assert "qwen3-8b-q5" in model_ids
    assert "qwen3-8b-iq4" in model_ids

    # Check recommended model
    recommended = [m for m in models if m["recommended"]]
    assert len(recommended) == 1
    assert recommended[0]["id"] == "qwen3-8b-q4"

def test_get_model_by_id_found(service):
    """Test getting model by ID when it exists."""
    model = service._get_model_by_id("qwen3-8b-q4")

    assert model is not None
    assert model.id == "qwen3-8b-q4"
    assert model.name == "Qwen 3 8B (Q4_K_M)"
    assert model.recommended is True

def test_get_model_by_id_not_found(service):
    """Test getting model by ID when it doesn't exist."""
    model = service._get_model_by_id("nonexistent-model")
    assert model is None

# ===== DOWNLOAD STATUS TESTS =====

def test_is_model_downloaded_false(service):
    """Test is_model_downloaded returns False for non-downloaded model."""
    assert service.is_model_downloaded("qwen3-8b-q4") is False

def test_is_model_downloaded_true(service, temp_models_dir):
    """Test is_model_downloaded returns True for downloaded model."""
    # Create fake model file
    model = service._get_model_by_id("qwen3-8b-q4")
    model_path = Path(temp_models_dir) / model.file_name
    model_path.touch()

    assert service.is_model_downloaded("qwen3-8b-q4") is True

def test_is_model_downloaded_invalid_id(service):
    """Test is_model_downloaded returns False for invalid model ID."""
    assert service.is_model_downloaded("invalid-id") is False

def test_get_model_path_exists(service, temp_models_dir):
    """Test get_model_path returns path when model exists."""
    model = service._get_model_by_id("qwen3-8b-q4")
    model_path = Path(temp_models_dir) / model.file_name
    model_path.touch()

    result = service.get_model_path("qwen3-8b-q4")
    assert result == model_path
    assert result.exists()

def test_get_model_path_not_exists(service):
    """Test get_model_path returns None when model doesn't exist."""
    result = service.get_model_path("qwen3-8b-q4")
    assert result is None

def test_get_model_path_invalid_id(service):
    """Test get_model_path returns None for invalid model ID."""
    result = service.get_model_path("invalid-id")
    assert result is None

def test_get_downloaded_models_empty(service):
    """Test get_downloaded_models returns empty list when no models downloaded."""
    models = service.get_downloaded_models()
    assert models == []

def test_get_downloaded_models_with_files(service, temp_models_dir):
    """Test get_downloaded_models returns only downloaded models."""
    # Create two model files
    model1 = service._get_model_by_id("qwen3-8b-q4")
    model2 = service._get_model_by_id("qwen3-8b-q5")

    (Path(temp_models_dir) / model1.file_name).touch()
    (Path(temp_models_dir) / model2.file_name).touch()

    models = service.get_downloaded_models()
    assert len(models) == 2
    model_ids = [m["id"] for m in models]
    assert "qwen3-8b-q4" in model_ids
    assert "qwen3-8b-q5" in model_ids

# ===== DOWNLOAD TESTS =====

@pytest.mark.asyncio
async def test_download_model_invalid_id(service, mock_audit_logger):
    """Test download_model raises HTTPException for invalid model ID."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await service.download_model("invalid-id")

    assert exc_info.value.status_code == 404
    assert "Model not found" in exc_info.value.detail

    # Check audit log
    mock_audit_logger.log.assert_called()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "model.download.failed"
    assert call_args["success"] is False

@pytest.mark.asyncio
async def test_download_model_already_downloaded(service, temp_models_dir, mock_audit_logger):
    """Test download_model returns True immediately if model already exists."""
    # Create fake model file
    model = service._get_model_by_id("qwen3-8b-q4")
    model_path = Path(temp_models_dir) / model.file_name
    model_path.write_bytes(b"x" * model.size)

    progress_calls = []

    def progress_callback(progress: DownloadProgress):
        progress_calls.append(progress)

    result = await service.download_model(
        "qwen3-8b-q4",
        progress_callback=progress_callback
    )

    assert result is True
    assert len(progress_calls) == 1
    assert progress_calls[0].status == DownloadStatus.COMPLETE
    assert progress_calls[0].percentage == 100.0

@pytest.mark.asyncio
async def test_download_model_already_in_progress(service, temp_models_dir):
    """Test download_model returns False if download already in progress."""
    # Register active download
    service.active_downloads["qwen3-8b-q4"] = ActiveDownload(
        model_id="qwen3-8b-q4",
        start_time=1234567890.0,
        last_progress=1234567890.0
    )

    result = await service.download_model("qwen3-8b-q4")
    assert result is False

@pytest.mark.asyncio
async def test_download_model_success(service, temp_models_dir, mock_audit_logger):
    """Test successful model download with progress tracking."""
    model = service._get_model_by_id("qwen3-8b-q4")
    model_content = b"x" * 1000  # Small test data

    progress_calls = []

    def progress_callback(progress: DownloadProgress):
        progress_calls.append(progress)

    # Create async generator for streaming bytes
    async def mock_aiter_bytes(chunk_size):
        yield model_content

    # Mock httpx client
    mock_response = AsyncMock()
    mock_response.raise_for_status = Mock()
    mock_response.aiter_bytes = mock_aiter_bytes

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = Mock(return_value=mock_response)
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=None)

    # Mock _calculate_sha256 to return correct checksum
    async def mock_sha256(path):
        return "abc123"

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        with patch.object(service, "_calculate_sha256", side_effect=mock_sha256):
            result = await service.download_model(
                "qwen3-8b-q4",
                progress_callback=progress_callback,
                user_id="test-user"
            )

    assert result is True
    assert len(progress_calls) > 0
    assert progress_calls[-1].status == DownloadStatus.COMPLETE
    assert progress_calls[-1].percentage == 100.0

    # Check model file exists
    model_path = Path(temp_models_dir) / model.file_name
    assert model_path.exists()

    # Check audit logs
    assert mock_audit_logger.log.call_count >= 2
    event_types = [call[1]["event_type"] for call in mock_audit_logger.log.call_args_list]
    assert "model.download.started" in event_types
    assert "model.download.completed" in event_types

@pytest.mark.asyncio
async def test_download_model_checksum_failure(service, temp_models_dir, mock_audit_logger):
    """Test download fails on checksum mismatch."""
    model_content = b"x" * 1000

    progress_calls = []

    def progress_callback(progress: DownloadProgress):
        progress_calls.append(progress)

    # Temporarily add expected_checksum to the model for testing
    model = service._get_model_by_id("qwen3-8b-q4")
    original_sha = model.sha256
    model.sha256 = "expected_checksum_abc123"  # Add checksum for testing

    try:
        # Create async generator for streaming bytes
        async def mock_aiter_bytes(chunk_size):
            yield model_content

        # Mock httpx client
        mock_response = AsyncMock()
        mock_response.raise_for_status = Mock()
        mock_response.aiter_bytes = mock_aiter_bytes

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.stream = Mock(return_value=mock_response)
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)

        # Mock _calculate_sha256 to return wrong checksum
        async def mock_sha256_wrong(path):
            return "wrong_hash_that_doesnt_match"

        with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
            with patch.object(service, "_calculate_sha256", side_effect=mock_sha256_wrong):
                result = await service.download_model(
                    "qwen3-8b-q4",
                    progress_callback=progress_callback
                )

        assert result is False
        assert len(progress_calls) > 0
        assert progress_calls[-1].status == DownloadStatus.ERROR
        assert "Checksum verification failed" in progress_calls[-1].error

        # Check temp file was cleaned up
        temp_path = Path(temp_models_dir) / f"{model.file_name}.tmp"
        assert not temp_path.exists()
    finally:
        # Restore original SHA256 value
        model.sha256 = original_sha

@pytest.mark.asyncio
async def test_download_model_network_error(service, temp_models_dir, mock_audit_logger):
    """Test download handles network errors gracefully."""
    progress_calls = []

    def progress_callback(progress: DownloadProgress):
        progress_calls.append(progress)

    # Mock httpx client to raise error
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(side_effect=Exception("Network error"))

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        result = await service.download_model(
            "qwen3-8b-q4",
            progress_callback=progress_callback
        )

    assert result is False
    assert len(progress_calls) > 0
    assert progress_calls[-1].status == DownloadStatus.ERROR
    assert progress_calls[-1].error is not None

    # Check audit log
    call_args_list = [call[1] for call in mock_audit_logger.log.call_args_list]
    failed_logs = [c for c in call_args_list if c["event_type"] == "model.download.failed"]
    assert len(failed_logs) == 1

@pytest.mark.asyncio
async def test_download_model_cleans_up_temp_file_on_error(service, temp_models_dir):
    """Test temp file is cleaned up on download error."""
    model = service._get_model_by_id("qwen3-8b-q4")
    temp_path = Path(temp_models_dir) / f"{model.file_name}.tmp"

    # Create temp file manually
    temp_path.touch()
    assert temp_path.exists()

    # Mock httpx to raise error
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(side_effect=Exception("Network error"))

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        result = await service.download_model("qwen3-8b-q4")

    assert result is False
    assert not temp_path.exists()

@pytest.mark.asyncio
async def test_download_model_unregisters_active_download(service):
    """Test active download is unregistered after completion."""
    model_content = b"x" * 1000

    # Create async generator for streaming bytes
    async def mock_aiter_bytes(chunk_size):
        yield model_content

    # Mock httpx client
    mock_response = AsyncMock()
    mock_response.raise_for_status = Mock()
    mock_response.aiter_bytes = mock_aiter_bytes

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = Mock(return_value=mock_response)
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=None)

    # Mock _calculate_sha256
    async def mock_sha256(path):
        return "abc123"

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        with patch.object(service, "_calculate_sha256", side_effect=mock_sha256):
            await service.download_model("qwen3-8b-q4")

    # Check active download was removed
    assert "qwen3-8b-q4" not in service.active_downloads

# ===== DELETE TESTS =====

@pytest.mark.asyncio
async def test_delete_model_success(service, temp_models_dir, mock_audit_logger):
    """Test successful model deletion."""
    # Create fake model file
    model = service._get_model_by_id("qwen3-8b-q4")
    model_path = Path(temp_models_dir) / model.file_name
    model_path.touch()

    result = await service.delete_model("qwen3-8b-q4", user_id="test-user")

    assert result is True
    assert not model_path.exists()

    # Check audit log
    mock_audit_logger.log.assert_called()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "model.deleted"
    assert call_args["action"] == "delete"
    assert call_args["success"] is True

@pytest.mark.asyncio
async def test_delete_model_not_found(service, mock_audit_logger):
    """Test delete_model returns False for non-existent model."""
    result = await service.delete_model("qwen3-8b-q4")
    assert result is False

@pytest.mark.asyncio
async def test_delete_model_invalid_id(service):
    """Test delete_model returns False for invalid model ID."""
    result = await service.delete_model("invalid-id")
    assert result is False

# ===== VERIFICATION TESTS =====

@pytest.mark.asyncio
async def test_verify_model_not_in_catalog(service):
    """Test verify_model for model not in catalog."""
    result = await service.verify_model("invalid-id")

    assert result["valid"] is False
    assert result["exists"] is False
    assert "Model not found in catalog" in result["error"]

@pytest.mark.asyncio
async def test_verify_model_not_downloaded(service):
    """Test verify_model for model not downloaded."""
    result = await service.verify_model("qwen3-8b-q4")

    assert result["valid"] is False
    assert result["exists"] is False
    assert "Model file not found" in result["error"]

@pytest.mark.asyncio
async def test_verify_model_success_without_checksum(service, temp_models_dir):
    """Test verify_model succeeds with correct file size (no checksum)."""
    # Create model without checksum
    model = ModelInfo(
        id="test-no-checksum",
        name="Test Model",
        file_name="test.ggu",
        url="https://example.com/test.ggu",
        size=1000,
        sha256=None,  # No checksum
        description="Test",
        recommended=False
    )

    # Temporarily add to catalog
    service.AVAILABLE_MODELS.append(model)

    # Create file with correct size
    model_path = Path(temp_models_dir) / model.file_name
    model_path.write_bytes(b"x" * 1000)

    result = await service.verify_model("test-no-checksum")

    assert result["valid"] is True
    assert result["exists"] is True
    assert result["size_match"] is True
    assert "checksum_match" not in result

    # Cleanup
    service.AVAILABLE_MODELS.remove(model)

@pytest.mark.asyncio
async def test_verify_model_success_with_checksum(service, temp_models_dir):
    """Test verify_model succeeds with correct checksum."""
    # Create test data
    test_data = b"x" * 1000
    expected_hash = hashlib.sha256(test_data).hexdigest()

    # Create model with checksum
    model = ModelInfo(
        id="test-with-checksum",
        name="Test Model",
        file_name="test.ggu",
        url="https://example.com/test.ggu",
        size=1000,
        sha256=expected_hash,
        description="Test",
        recommended=False
    )

    # Temporarily add to catalog
    service.AVAILABLE_MODELS.append(model)

    # Create file
    model_path = Path(temp_models_dir) / model.file_name
    model_path.write_bytes(test_data)

    result = await service.verify_model("test-with-checksum")

    assert result["valid"] is True
    assert result["exists"] is True
    assert result["size_match"] is True
    assert result["checksum_match"] is True
    assert result["calculated_hash"] == expected_hash
    assert result["expected_hash"] == expected_hash

    # Cleanup
    service.AVAILABLE_MODELS.remove(model)

@pytest.mark.asyncio
async def test_verify_model_size_mismatch(service, temp_models_dir):
    """Test verify_model fails on size mismatch."""
    model = service._get_model_by_id("qwen3-8b-q4")
    model_path = Path(temp_models_dir) / model.file_name

    # Create file with wrong size
    model_path.write_bytes(b"x" * 500)  # Wrong size

    result = await service.verify_model("qwen3-8b-q4")

    assert result["valid"] is False
    assert result["exists"] is True
    assert result["size_match"] is False
    assert result["actual_size"] == 500
    assert result["expected_size"] == model.size

# ===== HELPER METHOD TESTS =====

@pytest.mark.asyncio
async def test_calculate_sha256(service, temp_models_dir):
    """Test SHA-256 calculation."""
    test_data = b"Hello, World!"
    expected_hash = hashlib.sha256(test_data).hexdigest()

    test_file = Path(temp_models_dir) / "test.txt"
    test_file.write_bytes(test_data)

    result = await service._calculate_sha256(test_file)
    assert result == expected_hash

@pytest.mark.asyncio
async def test_calculate_sha256_large_file(service, temp_models_dir):
    """Test SHA-256 calculation on large file (chunks)."""
    # Create 1MB file
    test_data = b"x" * (1024 * 1024)
    expected_hash = hashlib.sha256(test_data).hexdigest()

    test_file = Path(temp_models_dir) / "large.bin"
    test_file.write_bytes(test_data)

    result = await service._calculate_sha256(test_file)
    assert result == expected_hash

# ===== MODELS DIR TESTS =====

def test_get_models_dir(service, temp_models_dir):
    """Test get_models_dir returns correct path."""
    result = service.get_models_dir()
    assert result == Path(temp_models_dir)
    assert isinstance(result, Path)

# ===== EDGE CASES =====

@pytest.mark.asyncio
async def test_download_model_without_progress_callback(service, temp_models_dir):
    """Test download works without progress callback."""
    model_content = b"x" * 1000

    # Create async generator for streaming bytes
    async def mock_aiter_bytes(chunk_size):
        yield model_content

    # Mock httpx client
    mock_response = AsyncMock()
    mock_response.raise_for_status = Mock()
    mock_response.aiter_bytes = mock_aiter_bytes

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = Mock(return_value=mock_response)
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=None)

    # Mock _calculate_sha256
    async def mock_sha256(path):
        return "abc123"

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        with patch.object(service, "_calculate_sha256", side_effect=mock_sha256):
            result = await service.download_model("qwen3-8b-q4")

    assert result is True

@pytest.mark.asyncio
async def test_download_model_without_audit_logger(temp_models_dir):
    """Test download works without audit logger."""
    service = ModelDownloadService(models_dir=temp_models_dir, audit_logger=None)
    model_content = b"x" * 1000

    # Create async generator for streaming bytes
    async def mock_aiter_bytes(chunk_size):
        yield model_content

    # Mock httpx client
    mock_response = AsyncMock()
    mock_response.raise_for_status = Mock()
    mock_response.aiter_bytes = mock_aiter_bytes

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = Mock(return_value=mock_response)
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=None)

    # Mock _calculate_sha256
    async def mock_sha256(path):
        return "abc123"

    with patch("backend.services.ai.model_download.httpx.AsyncClient", return_value=mock_client):
        with patch.object(service, "_calculate_sha256", side_effect=mock_sha256):
            result = await service.download_model("qwen3-8b-q4")

    assert result is True

# ===== DATACLASS TESTS =====

def test_model_info_to_dict():
    """Test ModelInfo.to_dict() conversion."""
    model = ModelInfo(
        id="test-id",
        name="Test Model",
        file_name="test.ggu",
        url="https://example.com/test.ggu",
        size=1000,
        sha256="abc123",
        description="Test description",
        recommended=True
    )

    result = model.to_dict()

    assert result["id"] == "test-id"
    assert result["name"] == "Test Model"
    assert result["fileName"] == "test.ggu"
    assert result["url"] == "https://example.com/test.ggu"
    assert result["size"] == 1000
    assert result["sha256"] == "abc123"
    assert result["description"] == "Test description"
    assert result["recommended"] is True

def test_download_progress_to_dict():
    """Test DownloadProgress.to_dict() conversion."""
    progress = DownloadProgress(
        model_id="test-id",
        downloaded_bytes=500,
        total_bytes=1000,
        percentage=50.0,
        speed=1024.0,
        status=DownloadStatus.DOWNLOADING,
        error=None
    )

    result = progress.to_dict()

    assert result["modelId"] == "test-id"
    assert result["downloadedBytes"] == 500
    assert result["totalBytes"] == 1000
    assert result["percentage"] == 50.0
    assert result["speed"] == 1024.0
    assert result["status"] == "downloading"
    assert result["error"] is None
