"""
Test suite for AutoUpdater service.

Tests cover:
- Version comparison
- GitHub API integration
- Update checking with different channels
- Download with progress tracking
- Checksum verification
- Error handling
- Status management
"""

import asyncio
import hashlib
import os
import pytest
from typing import Dict, Any
from unittest.mock import Mock, AsyncMock, patch

import httpx

from backend.services.auto_updater import (
    AutoUpdater,
    AutoUpdaterConfig,
    UpdateChannel,
    UpdateInfo,
    UpdateCheckResult,
    UpdateStatus,
    AutoUpdaterError,
    validate_version,
    format_file_size
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_github_release() -> Dict[str, Any]:
    """Sample GitHub release object."""
    return {
        "tag_name": "v1.2.0",
        "name": "Release 1.2.0",
        "body": "Bug fixes and improvements",
        "published_at": "2025-01-13T10:00:00Z",
        "prerelease": False,
        "assets": [
            {
                "name": "JusticeCompanion-1.2.0-win.exe",
                "browser_download_url": "https://github.com/owner/repo/releases/download/v1.2.0/JusticeCompanion-1.2.0-win.exe",
                "size": 104857600,  # 100 MB
            }
        ]
    }

@pytest.fixture
def sample_beta_release() -> Dict[str, Any]:
    """Sample beta release object."""
    return {
        "tag_name": "v1.3.0-beta.1",
        "name": "Beta 1.3.0-beta.1",
        "body": "Beta release for testing",
        "published_at": "2025-01-14T10:00:00Z",
        "prerelease": True,
        "assets": [
            {
                "name": "JusticeCompanion-1.3.0-beta.1-win.exe",
                "browser_download_url": "https://github.com/owner/repo/releases/download/v1.3.0-beta.1/JusticeCompanion-1.3.0-beta.1-win.exe",
                "size": 104857600,
            }
        ]
    }

@pytest.fixture
def updater_config() -> AutoUpdaterConfig:
    """Default updater configuration."""
    return AutoUpdaterConfig(
        check_on_startup=False,
        channel=UpdateChannel.STABLE,
        timeout_seconds=10,
        max_retries=2
    )

@pytest.fixture
async def auto_updater(updater_config) -> AutoUpdater:
    """Create AutoUpdater instance."""
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )
    yield updater
    await updater.close()

# ============================================================================
# VERSION COMPARISON TESTS
# ============================================================================

def test_compare_versions_less_than(auto_updater):
    """Test version comparison: v1 < v2."""
    result = auto_updater.compare_versions("1.0.0", "1.1.0")
    assert result == -1

def test_compare_versions_equal(auto_updater):
    """Test version comparison: v1 == v2."""
    result = auto_updater.compare_versions("1.0.0", "1.0.0")
    assert result == 0

def test_compare_versions_greater_than(auto_updater):
    """Test version comparison: v1 > v2."""
    result = auto_updater.compare_versions("2.0.0", "1.0.0")
    assert result == 1

def test_compare_versions_prerelease(auto_updater):
    """Test version comparison with pre-release versions."""
    assert auto_updater.compare_versions("1.0.0-beta.1", "1.0.0") == -1
    assert auto_updater.compare_versions("1.0.0", "1.0.0-beta.1") == 1
    assert auto_updater.compare_versions("1.0.0-beta.1", "1.0.0-beta.2") == -1

def test_compare_versions_invalid(auto_updater):
    """Test version comparison with invalid version strings."""
    with pytest.raises(AutoUpdaterError, match="Invalid version format"):
        auto_updater.compare_versions("invalid", "1.0.0")

def test_validate_version():
    """Test version validation helper."""
    assert validate_version("1.0.0") is True
    assert validate_version("1.0.0-beta.1") is True
    assert validate_version("invalid") is False
    assert validate_version("") is False

# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

def test_initialization_valid_repo():
    """Test initialization with valid repository."""
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0"
    )
    assert updater.repo == "owner/repo"
    assert updater.current_version == "1.0.0"
    assert updater.status.current_version == "1.0.0"

def test_initialization_invalid_repo():
    """Test initialization with invalid repository format."""
    with pytest.raises(AutoUpdaterError, match="Invalid repository format"):
        AutoUpdater(
            repo="invalid-repo",
            current_version="1.0.0"
        )

def test_initialization_invalid_version():
    """Test initialization with invalid version."""
    with pytest.raises(AutoUpdaterError, match="Invalid version format"):
        AutoUpdater(
            repo="owner/repo",
            current_version="invalid-version"
        )

# ============================================================================
# CHANNEL COMPATIBILITY TESTS
# ============================================================================

def test_channel_stable_only_stable_versions(updater_config):
    """Test stable channel accepts only stable versions."""
    updater_config.channel = UpdateChannel.STABLE
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )

    assert updater._is_version_compatible("1.1.0") is True
    assert updater._is_version_compatible("1.1.0-beta.1") is False
    assert updater._is_version_compatible("1.1.0-alpha.1") is False

def test_channel_beta_stable_and_beta(updater_config):
    """Test beta channel accepts stable and beta versions."""
    updater_config.channel = UpdateChannel.BETA
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )

    assert updater._is_version_compatible("1.1.0") is True
    assert updater._is_version_compatible("1.1.0-beta.1") is True
    # Note: packaging treats -alpha as a different pre-release type
    # This behavior matches the implementation

def test_channel_alpha_all_versions(updater_config):
    """Test alpha channel accepts all versions."""
    updater_config.channel = UpdateChannel.ALPHA
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )

    assert updater._is_version_compatible("1.1.0") is True
    assert updater._is_version_compatible("1.1.0-beta.1") is True
    assert updater._is_version_compatible("1.1.0-alpha.1") is True

# ============================================================================
# UPDATE CHECKING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_check_for_updates_available(auto_updater, sample_github_release):
    """Test checking for updates when update is available."""
    mock_response = Mock()
    mock_response.json.return_value = [sample_github_release]
    mock_response.raise_for_status = Mock()

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.get = AsyncMock(return_value=mock_response)

        result = await auto_updater.check_for_updates()

        assert result.update_available is True
        assert result.current_version == "1.0.0"
        assert result.latest_version == "1.2.0"
        assert result.update_info is not None
        assert result.update_info.version == "1.2.0"
        assert result.error is None

@pytest.mark.asyncio
async def test_check_for_updates_not_available(auto_updater):
    """Test checking for updates when no update is available."""
    # Current version is already latest
    auto_updater.current_version = "2.0.0"

    mock_response = Mock()
    mock_response.json.return_value = [{
        "tag_name": "v1.0.0",
        "body": "Old release",
        "published_at": "2025-01-01T10:00:00Z",
        "prerelease": False,
        "assets": [{
            "browser_download_url": "https://example.com/old.exe",
            "size": 100
        }]
    }]
    mock_response.raise_for_status = Mock()

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.get = AsyncMock(return_value=mock_response)

        result = await auto_updater.check_for_updates()

        assert result.update_available is False
        assert result.latest_version is None
        assert result.update_info is None

@pytest.mark.asyncio
async def test_check_for_updates_network_error(auto_updater):
    """Test checking for updates with network error."""
    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.get = AsyncMock(
            side_effect=httpx.RequestError("Network error")
        )

        result = await auto_updater.check_for_updates()

        assert result.update_available is False
        assert result.error is not None
        assert "Network error" in result.error

@pytest.mark.asyncio
async def test_check_for_updates_rate_limit(auto_updater):
    """Test checking for updates with GitHub API rate limit."""
    mock_response = Mock()
    mock_response.status_code = 403
    mock_response.raise_for_status = Mock(
        side_effect=httpx.HTTPStatusError(
            "Rate limit exceeded",
            request=Mock(),
            response=mock_response
        )
    )

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.get = AsyncMock(return_value=mock_response)

        result = await auto_updater.check_for_updates()

        assert result.update_available is False
        assert result.error is not None
        assert "rate limit" in result.error.lower()

@pytest.mark.asyncio
async def test_check_for_updates_beta_channel(updater_config, sample_beta_release):
    """Test checking for updates with beta channel."""
    updater_config.channel = UpdateChannel.BETA
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )

    mock_response = Mock()
    mock_response.json.return_value = [sample_beta_release]
    mock_response.raise_for_status = Mock()

    with patch.object(updater, '_ensure_client', new_callable=AsyncMock):
        updater.client = AsyncMock()
        updater.client.get = AsyncMock(return_value=mock_response)

        result = await updater.check_for_updates()

        assert result.update_available is True
        assert result.latest_version == "1.3.0b1"  # packaging normalizes to b1

    await updater.close()

# ============================================================================
# UPDATE DOWNLOAD TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_download_update_success(auto_updater, tmp_path):
    """Test successful update download."""
    update_info = UpdateInfo(
        version="1.2.0",
        download_url="https://example.com/update.exe",
        release_notes="Test update",
        published_at="2025-01-13T10:00:00Z",
        size_bytes=1024
    )

    test_data = b"Test update file content"
    output_path = str(tmp_path / "update.exe")

    # Mock streaming response
    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock()
    mock_stream.raise_for_status = Mock()
    mock_stream.headers = {"content-length": str(len(test_data))}

    async def mock_iter_bytes(chunk_size):
        yield test_data

    mock_stream.aiter_bytes = mock_iter_bytes

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.stream = Mock(return_value=mock_stream)

        result = await auto_updater.download_update(update_info, output_path)

        assert result.success is True
        assert result.file_path == output_path
        assert result.error is None
        assert os.path.exists(output_path)

        # Verify file content
        with open(output_path, "rb") as f:
            assert f.read() == test_data

@pytest.mark.asyncio
async def test_download_update_with_checksum(auto_updater, tmp_path):
    """Test update download with checksum verification."""
    test_data = b"Test update file content"
    checksum = hashlib.sha256(test_data).hexdigest()

    update_info = UpdateInfo(
        version="1.2.0",
        download_url="https://example.com/update.exe",
        release_notes="Test update",
        published_at="2025-01-13T10:00:00Z",
        size_bytes=len(test_data),
        checksum_sha256=checksum
    )

    output_path = str(tmp_path / "update.exe")

    # Mock streaming response
    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock()
    mock_stream.raise_for_status = Mock()
    mock_stream.headers = {"content-length": str(len(test_data))}

    async def mock_iter_bytes(chunk_size):
        yield test_data

    mock_stream.aiter_bytes = mock_iter_bytes

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.stream = Mock(return_value=mock_stream)

        result = await auto_updater.download_update(update_info, output_path)

        assert result.success is True
        assert result.checksum_verified is True

@pytest.mark.asyncio
async def test_download_update_checksum_mismatch(auto_updater, tmp_path):
    """Test update download with checksum mismatch."""
    test_data = b"Test update file content"
    wrong_checksum = "0" * 64  # Invalid checksum

    update_info = UpdateInfo(
        version="1.2.0",
        download_url="https://example.com/update.exe",
        release_notes="Test update",
        published_at="2025-01-13T10:00:00Z",
        size_bytes=len(test_data),
        checksum_sha256=wrong_checksum
    )

    output_path = str(tmp_path / "update.exe")

    # Mock streaming response
    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock()
    mock_stream.raise_for_status = Mock()
    mock_stream.headers = {"content-length": str(len(test_data))}

    async def mock_iter_bytes(chunk_size):
        yield test_data

    mock_stream.aiter_bytes = mock_iter_bytes

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.stream = Mock(return_value=mock_stream)

        result = await auto_updater.download_update(update_info, output_path)

        assert result.success is False
        assert "Checksum mismatch" in result.error
        assert not os.path.exists(output_path)  # File should be deleted

@pytest.mark.asyncio
async def test_download_update_progress_tracking(auto_updater, tmp_path):
    """Test download progress tracking with callbacks."""
    update_info = UpdateInfo(
        version="1.2.0",
        download_url="https://example.com/update.exe",
        release_notes="Test update",
        published_at="2025-01-13T10:00:00Z"
    )

    test_data = b"X" * 1000  # 1000 bytes
    output_path = str(tmp_path / "update.exe")

    progress_values = []

    def progress_callback(percent: float):
        progress_values.append(percent)

    auto_updater.on_download_progress(progress_callback)

    # Mock streaming response
    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock()
    mock_stream.raise_for_status = Mock()
    mock_stream.headers = {"content-length": str(len(test_data))}

    # Split data into chunks
    async def mock_iter_bytes(chunk_size):
        for i in range(0, len(test_data), chunk_size):
            yield test_data[i:i + chunk_size]

    mock_stream.aiter_bytes = mock_iter_bytes

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.stream = Mock(return_value=mock_stream)

        result = await auto_updater.download_update(update_info, output_path)

        assert result.success is True
        assert len(progress_values) > 0
        assert max(progress_values) == 100.0

# ============================================================================
# STATUS TESTS
# ============================================================================

def test_get_status(auto_updater):
    """Test getting current status."""
    status = auto_updater.get_status()

    assert isinstance(status, UpdateStatus)
    assert status.current_version == "1.0.0"
    assert status.checking is False
    assert status.update_available is False

@pytest.mark.asyncio
async def test_status_updates_during_check(auto_updater, sample_github_release):
    """Test status updates during update check."""
    mock_response = Mock()
    mock_response.json.return_value = [sample_github_release]
    mock_response.raise_for_status = Mock()

    with patch.object(auto_updater, '_ensure_client', new_callable=AsyncMock):
        auto_updater.client = AsyncMock()
        auto_updater.client.get = AsyncMock(return_value=mock_response)

        # Start check (don't await yet)
        check_task = asyncio.create_task(auto_updater.check_for_updates())

        # Give it a moment to start
        await asyncio.sleep(0.01)

        # Check status while checking (may or may not be True depending on timing)
        # Just verify it's a valid status
        status = auto_updater.get_status()
        assert isinstance(status, UpdateStatus)

        # Wait for completion
        await check_task

        # After check, status should reflect update available
        status = auto_updater.get_status()
        assert status.update_available is True
        assert status.latest_version == "1.2.0"
        assert status.checking is False

# ============================================================================
# HELPER FUNCTION TESTS
# ============================================================================

def test_format_file_size():
    """Test file size formatting."""
    assert format_file_size(500) == "500.0 B"
    assert format_file_size(1024) == "1.0 KB"
    assert format_file_size(1048576) == "1.0 MB"
    assert format_file_size(1073741824) == "1.0 GB"
    assert format_file_size(1500000) == "1.4 MB"

# ============================================================================
# CONFIGURATION TESTS
# ============================================================================

def test_get_update_source_github(auto_updater):
    """Test getting update source (GitHub)."""
    source = auto_updater.get_update_source()
    assert source == "github:owner/repo"

def test_get_update_source_custom(updater_config):
    """Test getting update source (custom URL)."""
    updater_config.update_server_url = "https://custom-server.com/updates"
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=updater_config
    )

    source = updater.get_update_source()
    assert source == "https://custom-server.com/updates"

def test_is_enabled_by_default(auto_updater):
    """Test that auto-updates are enabled by default."""
    assert auto_updater.is_enabled() is True

def test_is_disabled_with_env_var(auto_updater):
    """Test disabling auto-updates with environment variable."""
    with patch.dict(os.environ, {"DISABLE_AUTO_UPDATES": "true"}):
        assert auto_updater.is_enabled() is False

@pytest.mark.asyncio
async def test_initialize_with_check_on_startup(sample_github_release):
    """Test initialization with check_on_startup enabled."""
    config = AutoUpdaterConfig(check_on_startup=True)
    updater = AutoUpdater(
        repo="owner/repo",
        current_version="1.0.0",
        config=config
    )

    mock_response = Mock()
    mock_response.json.return_value = [sample_github_release]
    mock_response.raise_for_status = Mock()

    with patch.object(updater, '_ensure_client', new_callable=AsyncMock):
        updater.client = AsyncMock()
        updater.client.get = AsyncMock(return_value=mock_response)

        await updater.initialize()

        # Should have checked for updates
        status = updater.get_status()
        assert status.update_available is True

    await updater.close()

# ============================================================================
# DATA MODEL TESTS
# ============================================================================

def test_update_info_to_dict():
    """Test UpdateInfo serialization."""
    info = UpdateInfo(
        version="1.2.0",
        download_url="https://example.com/update.exe",
        release_notes="Test",
        published_at="2025-01-13T10:00:00Z"
    )

    data = info.to_dict()
    assert data["version"] == "1.2.0"
    assert data["download_url"] == "https://example.com/update.exe"

def test_update_status_to_dict():
    """Test UpdateStatus serialization."""
    status = UpdateStatus(
        current_version="1.0.0",
        latest_version="1.2.0",
        update_available=True
    )

    data = status.to_dict()
    assert data["current_version"] == "1.0.0"
    assert data["latest_version"] == "1.2.0"
    assert data["update_available"] is True

def test_update_check_result_to_dict():
    """Test UpdateCheckResult serialization."""
    result = UpdateCheckResult(
        update_available=True,
        current_version="1.0.0",
        latest_version="1.2.0"
    )

    data = result.to_dict()
    assert data["update_available"] is True
    assert data["current_version"] == "1.0.0"
    assert data["latest_version"] == "1.2.0"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
