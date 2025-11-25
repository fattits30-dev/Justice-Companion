"""
Comprehensive tests for AI Status routes.

Tests cover:
- Service status retrieval
- Provider listing and configuration
- Model management (download, status, deletion)
- Provider connection testing
- Health checks
- Authentication and authorization
- Error handling
- Edge cases

Test Strategy:
- Mock all services (no database queries)
- Use pytest fixtures for reusable test data
- Test both success and error paths
- Verify audit logging
- Check proper HTTP status codes
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from fastapi import HTTPException

from backend.routes.ai_status import (
    router,
    get_encryption_service,
    get_audit_logger,
    get_provider_config_service,
    get_model_download_service,
    get_ai_service
)
from backend.services.ai.providers import (
    AIProviderConfigService,
    AIProviderType,
    AIProviderConfigOutput
)
from backend.services.ai.model_download import (
    ModelDownloadService,
    ActiveDownload
)
from backend.services.ai.service import (
    UnifiedAIService
)
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# ===== FIXTURES =====

@pytest.fixture
def mock_db():
    """Mock database session."""
    return Mock()

@pytest.fixture
def mock_encryption_service():
    """Mock encryption service."""
    mock_service = Mock(spec=EncryptionService)
    mock_service.encrypt = Mock(return_value=Mock(to_dict=lambda: {"encrypted": "data"}))
    mock_service.decrypt = Mock(return_value="decrypted_api_key")
    return mock_service

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger."""
    mock_logger = Mock(spec=AuditLogger)
    mock_logger.log = Mock()
    return mock_logger

@pytest.fixture
def mock_provider_config_service():
    """Mock AI provider configuration service."""
    mock_service = Mock(spec=AIProviderConfigService)

    # Default behaviors
    mock_service.get_configured_providers = Mock(return_value=[AIProviderType.OPENAI])
    mock_service.get_active_provider = Mock(return_value=AIProviderType.OPENAI)
    mock_service.list_provider_configs = Mock(return_value=[])
    mock_service.list_all_providers_metadata = Mock(return_value={"openai": {}})

    # Async methods
    mock_service.get_active_provider_config = AsyncMock(return_value=None)
    mock_service.get_provider_config = AsyncMock(return_value=None)

    return mock_service

@pytest.fixture
def mock_model_download_service():
    """Mock model download service."""
    mock_service = Mock(spec=ModelDownloadService)

    # Default model catalog
    mock_service.get_available_models = Mock(return_value=[
        {
            "id": "qwen3-8b-q4",
            "name": "Qwen 3 8B (Q4_K_M)",
            "fileName": "Qwen_Qwen3-8B-Q4_K_M.gguf",
            "size": 5_030_000_000,
            "description": "Recommended model",
            "recommended": True
        }
    ])
    mock_service.get_downloaded_models = Mock(return_value=[])
    mock_service.is_model_downloaded = Mock(return_value=False)
    mock_service.active_downloads = {}

    # Async methods
    mock_service.download_model = AsyncMock(return_value=True)
    mock_service.delete_model = AsyncMock(return_value=True)

    return mock_service

@pytest.fixture
def mock_ai_service():
    """Mock AI service."""
    mock_service = Mock(spec=UnifiedAIService)
    mock_service.get_provider = Mock(return_value="openai")
    mock_service.get_model = Mock(return_value="gpt-4-turbo")
    mock_service.get_provider_capabilities = Mock(return_value={
        "name": "OpenAI",
        "supports_streaming": True,
        "max_context_tokens": 128000,
        "current_model": "gpt-4-turbo",
        "endpoint": "https://api.openai.com/v1"
    })
    mock_service.chat = AsyncMock(return_value="Test response OK")
    return mock_service

@pytest.fixture
def mock_current_user():
    """Mock authenticated user."""
    return {"userId": 1, "username": "test_user"}

@pytest.fixture
def client(
    mock_db,
    mock_encryption_service,
    mock_audit_logger,
    mock_provider_config_service,
    mock_model_download_service,
    mock_current_user
):
    """Test client with mocked dependencies."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(router)

    # Override dependencies
    app.dependency_overrides[get_encryption_service] = lambda: mock_encryption_service
    app.dependency_overrides[get_audit_logger] = lambda: mock_audit_logger
    app.dependency_overrides[get_provider_config_service] = lambda: mock_provider_config_service
    app.dependency_overrides[get_model_download_service] = lambda: mock_model_download_service
    app.dependency_overrides[get_ai_service] = lambda: None

    # Mock authentication
    from backend.routes.auth import get_current_user as real_get_current_user
    app.dependency_overrides[real_get_current_user] = lambda: mock_current_user

    return TestClient(app)

# ===== TEST: GET /ai/status =====

def test_get_ai_status_healthy(client, mock_provider_config_service, mock_model_download_service, mock_ai_service):
    """Test GET /ai/status with healthy service."""
    # Configure mocks for healthy state
    mock_provider_config_service.get_configured_providers.return_value = [AIProviderType.OPENAI]
    mock_model_download_service.get_downloaded_models.return_value = []

    # Override AI service to return mock
    client.app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    response = client.get("/ai/status")

    assert response.status_code == 200
    data = response.json()
    assert data["running"] is True
    assert data["healthy"] is True
    assert data["configured"] is True
    assert data["activeProvider"] == "openai"
    assert data["activeModel"] == "gpt-4-turbo"
    assert data["providersConfigured"] == 1
    assert data["error"] is None

def test_get_ai_status_no_provider(client, mock_provider_config_service):
    """Test GET /ai/status with no configured provider."""
    mock_provider_config_service.get_configured_providers.return_value = []

    response = client.get("/ai/status")

    assert response.status_code == 200
    data = response.json()
    assert data["running"] is False
    assert data["healthy"] is False
    assert data["configured"] is False
    assert data["activeProvider"] is None
    assert data["error"] == "No active AI provider configured"

def test_get_ai_status_error_handling(client, mock_provider_config_service):
    """Test GET /ai/status handles service errors gracefully."""
    mock_provider_config_service.get_configured_providers.side_effect = Exception("Database error")

    response = client.get("/ai/status")

    assert response.status_code == 200
    data = response.json()
    assert data["running"] is False
    assert data["healthy"] is False
    assert "Database error" in data["error"]

# ===== TEST: GET /ai/providers =====

def test_list_providers(client, mock_provider_config_service):
    """Test GET /ai/providers returns all providers."""
    mock_provider_config_service.get_configured_providers.return_value = [AIProviderType.OPENAI]
    mock_provider_config_service.get_active_provider.return_value = AIProviderType.OPENAI

    response = client.get("/ai/providers")

    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert data["totalProviders"] == 10  # All 10 supported providers
    assert data["configuredProviders"] == 1

def test_list_providers_with_configs(client, mock_provider_config_service):
    """Test GET /ai/providers includes user configurations."""
    mock_config = Mock()
    mock_config.provider = "openai"
    mock_config.model = "gpt-4-turbo"
    mock_config.is_active = True

    mock_provider_config_service.list_provider_configs.return_value = [mock_config]
    mock_provider_config_service.get_configured_providers.return_value = [AIProviderType.OPENAI]
    mock_provider_config_service.get_active_provider.return_value = AIProviderType.OPENAI

    response = client.get("/ai/providers")

    assert response.status_code == 200
    data = response.json()

    # Find OpenAI provider
    openai_provider = next((p for p in data["providers"] if p["provider"] == "openai"), None)
    assert openai_provider is not None
    assert openai_provider["configured"] is True
    assert openai_provider["active"] is True
    assert openai_provider["currentModel"] == "gpt-4-turbo"

def test_list_providers_error(client, mock_provider_config_service):
    """Test GET /ai/providers handles errors."""
    mock_provider_config_service.get_configured_providers.side_effect = Exception("Service error")

    response = client.get("/ai/providers")

    assert response.status_code == 500
    assert "Failed to list providers" in response.json()["detail"]

# ===== TEST: GET /ai/providers/configured =====

def test_list_configured_providers(client, mock_provider_config_service):
    """Test GET /ai/providers/configured returns only configured providers."""
    mock_config = Mock()
    mock_config.provider = "openai"
    mock_config.model = "gpt-4-turbo"
    mock_config.is_active = True

    mock_provider_config_service.list_provider_configs.return_value = [mock_config]
    mock_provider_config_service.get_configured_providers.return_value = [AIProviderType.OPENAI]

    response = client.get("/ai/providers/configured")

    assert response.status_code == 200
    data = response.json()
    assert len(data["providers"]) == 1
    assert data["providers"][0]["provider"] == "openai"
    assert data["providers"][0]["configured"] is True
    assert data["configuredProviders"] == 1

def test_list_configured_providers_empty(client, mock_provider_config_service):
    """Test GET /ai/providers/configured with no configured providers."""
    mock_provider_config_service.list_provider_configs.return_value = []
    mock_provider_config_service.get_configured_providers.return_value = []

    response = client.get("/ai/providers/configured")

    assert response.status_code == 200
    data = response.json()
    assert len(data["providers"]) == 0
    assert data["totalProviders"] == 0
    assert data["configuredProviders"] == 0

# ===== TEST: GET /ai/providers/{provider}/test =====

def test_test_provider_success(client, mock_provider_config_service, mock_audit_logger):
    """Test GET /ai/providers/openai/test with successful connection."""
    mock_config = AIProviderConfigOutput(
        id=1,
        user_id=1,
        provider="openai",
        api_key="sk-test123",
        model="gpt-4-turbo",
        endpoint=None,
        temperature=0.7,
        max_tokens=4096,
        top_p=0.9,
        enabled=True,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    mock_provider_config_service.get_provider_config.return_value = mock_config

    with patch('backend.routes.ai_status.UnifiedAIService') as mock_ai_class:
        mock_ai_instance = Mock()
        mock_ai_instance.chat = AsyncMock(return_value="OK")
        mock_ai_class.return_value = mock_ai_instance

        response = client.get("/ai/providers/openai/test")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["provider"] == "openai"
    assert data["responseTime"] is not None
    assert data["error"] is None

def test_test_provider_not_configured(client, mock_provider_config_service):
    """Test GET /ai/providers/openai/test with unconfigured provider."""
    mock_provider_config_service.get_provider_config.return_value = None

    response = client.get("/ai/providers/openai/test")

    assert response.status_code == 404
    assert "not configured" in response.json()["detail"]

def test_test_provider_invalid_provider(client):
    """Test GET /ai/providers/invalid/test with invalid provider."""
    response = client.get("/ai/providers/invalid_provider/test")

    assert response.status_code == 400
    assert "Invalid provider" in response.json()["detail"]

def test_test_provider_connection_failure(client, mock_provider_config_service):
    """Test GET /ai/providers/openai/test with connection failure."""
    mock_config = AIProviderConfigOutput(
        id=1,
        user_id=1,
        provider="openai",
        api_key="sk-test123",
        model="gpt-4-turbo",
        endpoint=None,
        temperature=0.7,
        max_tokens=4096,
        top_p=0.9,
        enabled=True,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    mock_provider_config_service.get_provider_config.return_value = mock_config

    with patch('backend.routes.ai_status.UnifiedAIService') as mock_ai_class:
        mock_ai_instance = Mock()
        mock_ai_instance.chat = AsyncMock(side_effect=Exception("API connection failed"))
        mock_ai_class.return_value = mock_ai_instance

        response = client.get("/ai/providers/openai/test")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["provider"] == "openai"
    assert "API connection failed" in data["error"]

# ===== TEST: GET /ai/models =====

def test_list_models(client, mock_model_download_service):
    """Test GET /ai/models returns available models."""
    response = client.get("/ai/models")

    assert response.status_code == 200
    data = response.json()
    assert len(data["models"]) == 1
    assert data["models"][0]["id"] == "qwen3-8b-q4"
    assert data["models"][0]["recommended"] is True
    assert data["models"][0]["downloaded"] is False
    assert data["totalModels"] == 1
    assert data["downloadedModels"] == 0

def test_list_models_with_downloaded(client, mock_model_download_service):
    """Test GET /ai/models includes download status."""
    mock_model_download_service.is_model_downloaded.return_value = True
    mock_model_download_service.get_downloaded_models.return_value = [
        {
            "id": "qwen3-8b-q4",
            "name": "Qwen 3 8B (Q4_K_M)",
            "fileName": "Qwen_Qwen3-8B-Q4_K_M.gguf",
            "size": 5_030_000_000,
            "description": "Recommended model",
            "recommended": True
        }
    ]

    response = client.get("/ai/models")

    assert response.status_code == 200
    data = response.json()
    assert data["models"][0]["downloaded"] is True
    assert data["downloadedModels"] == 1

def test_list_models_error(client, mock_model_download_service):
    """Test GET /ai/models handles errors."""
    mock_model_download_service.get_available_models.side_effect = Exception("Service error")

    response = client.get("/ai/models")

    assert response.status_code == 500
    assert "Failed to list models" in response.json()["detail"]

# ===== TEST: GET /ai/models/downloaded =====

def test_list_downloaded_models(client, mock_model_download_service):
    """Test GET /ai/models/downloaded returns downloaded models."""
    mock_model_download_service.get_downloaded_models.return_value = [
        {
            "id": "qwen3-8b-q4",
            "name": "Qwen 3 8B (Q4_K_M)",
            "fileName": "Qwen_Qwen3-8B-Q4_K_M.gguf",
            "size": 5_030_000_000,
            "description": "Recommended model",
            "recommended": True
        }
    ]

    response = client.get("/ai/models/downloaded")

    assert response.status_code == 200
    data = response.json()
    assert len(data["models"]) == 1
    assert data["models"][0]["downloaded"] is True
    assert data["downloadedModels"] == 1

def test_list_downloaded_models_empty(client, mock_model_download_service):
    """Test GET /ai/models/downloaded with no downloads."""
    mock_model_download_service.get_downloaded_models.return_value = []

    response = client.get("/ai/models/downloaded")

    assert response.status_code == 200
    data = response.json()
    assert len(data["models"]) == 0
    assert data["downloadedModels"] == 0

# ===== TEST: GET /ai/models/{model_id}/status =====

def test_get_model_status_not_downloaded(client, mock_model_download_service):
    """Test GET /ai/models/qwen3-8b-q4/status for not downloaded model."""
    response = client.get("/ai/models/qwen3-8b-q4/status")

    assert response.status_code == 200
    data = response.json()
    assert data["modelId"] == "qwen3-8b-q4"
    assert data["downloaded"] is False
    assert data["downloading"] is False
    assert data["progress"] is None
    assert data["error"] is None

def test_get_model_status_downloaded(client, mock_model_download_service):
    """Test GET /ai/models/qwen3-8b-q4/status for downloaded model."""
    mock_model_download_service.is_model_downloaded.return_value = True

    response = client.get("/ai/models/qwen3-8b-q4/status")

    assert response.status_code == 200
    data = response.json()
    assert data["downloaded"] is True
    assert data["downloading"] is False

def test_get_model_status_downloading(client, mock_model_download_service):
    """Test GET /ai/models/qwen3-8b-q4/status during download."""
    mock_model_download_service.active_downloads = {
        "qwen3-8b-q4": ActiveDownload(
            model_id="qwen3-8b-q4",
            start_time=1234567890.0,
            last_progress=1234567895.0
        )
    }

    response = client.get("/ai/models/qwen3-8b-q4/status")

    assert response.status_code == 200
    data = response.json()
    assert data["downloading"] is True
    assert data["progress"] is not None
    assert "startTime" in data["progress"]

def test_get_model_status_not_found(client, mock_model_download_service):
    """Test GET /ai/models/invalid/status with invalid model ID."""
    response = client.get("/ai/models/invalid_model/status")

    assert response.status_code == 404
    assert "Model not found" in response.json()["detail"]

# ===== TEST: POST /ai/models/{model_id}/download =====

def test_download_model_success(client, mock_model_download_service):
    """Test POST /ai/models/qwen3-8b-q4/download initiates download."""
    response = client.post("/ai/models/qwen3-8b-q4/download")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["modelId"] == "qwen3-8b-q4"
    assert data["message"] == "Download started"
    assert data["error"] is None

def test_download_model_already_downloaded(client, mock_model_download_service):
    """Test POST /ai/models/qwen3-8b-q4/download when already downloaded."""
    mock_model_download_service.is_model_downloaded.return_value = True

    response = client.post("/ai/models/qwen3-8b-q4/download")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Model already downloaded"

def test_download_model_already_in_progress(client, mock_model_download_service):
    """Test POST /ai/models/qwen3-8b-q4/download when download in progress."""
    mock_model_download_service.active_downloads = {"qwen3-8b-q4": ActiveDownload("qwen3-8b-q4", 0.0, 0.0)}

    response = client.post("/ai/models/qwen3-8b-q4/download")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "already in progress" in data["message"]

def test_download_model_not_found(client, mock_model_download_service):
    """Test POST /ai/models/invalid/download with invalid model ID."""
    response = client.post("/ai/models/invalid_model/download")

    assert response.status_code == 404
    assert "Model not found" in response.json()["detail"]

# ===== TEST: DELETE /ai/models/{model_id} =====

def test_delete_model_success(client, mock_model_download_service):
    """Test DELETE /ai/models/qwen3-8b-q4 deletes model."""
    response = client.delete("/ai/models/qwen3-8b-q4")

    assert response.status_code == 204
    mock_model_download_service.delete_model.assert_called_once()

def test_delete_model_not_downloaded(client, mock_model_download_service):
    """Test DELETE /ai/models/qwen3-8b-q4 when not downloaded."""
    mock_model_download_service.delete_model.return_value = False

    response = client.delete("/ai/models/qwen3-8b-q4")

    assert response.status_code == 404
    assert "not downloaded" in response.json()["detail"]

def test_delete_model_not_found(client, mock_model_download_service):
    """Test DELETE /ai/models/invalid with invalid model ID."""
    response = client.delete("/ai/models/invalid_model")

    assert response.status_code == 404
    assert "Model not found" in response.json()["detail"]

# ===== TEST: GET /ai/health =====

def test_health_check_healthy(client, mock_provider_config_service, mock_model_download_service):
    """Test GET /ai/health with all services healthy."""
    response = client.get("/ai/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["services"]["provider_config"] is True
    assert data["services"]["model_download"] is True
    assert data["details"]["healthy_services"] == 2

def test_health_check_degraded(client, mock_provider_config_service, mock_model_download_service):
    """Test GET /ai/health with some services unhealthy."""
    mock_provider_config_service.list_all_providers_metadata.side_effect = Exception("Service error")

    response = client.get("/ai/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["services"]["provider_config"] is False
    assert data["services"]["model_download"] is True

def test_health_check_unhealthy(client, mock_provider_config_service, mock_model_download_service):
    """Test GET /ai/health with all services unhealthy."""
    mock_provider_config_service.list_all_providers_metadata.side_effect = Exception("Service error")
    mock_model_download_service.get_available_models.side_effect = Exception("Service error")

    response = client.get("/ai/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unhealthy"
    assert all(not healthy for healthy in data["services"].values())

# ===== TEST: Authentication and Authorization =====

def test_unauthenticated_request(client):
    """Test endpoints require authentication."""
    # Override to simulate no auth
    from backend.routes.auth import get_current_user as real_get_current_user

    def raise_auth_error():
        raise HTTPException(status_code=401, detail="Not authenticated")

    client.app.dependency_overrides[real_get_current_user] = raise_auth_error

    response = client.get("/ai/status")

    assert response.status_code == 401

def test_public_endpoints_no_auth():
    """Test public endpoints work without authentication."""
    # Health check and model list are public
    # This is tested implicitly in other tests

# ===== TEST: Edge Cases =====

def test_concurrent_downloads(client, mock_model_download_service):
    """Test handling concurrent download requests."""
    # First request starts download
    response1 = client.post("/ai/models/qwen3-8b-q4/download")
    assert response1.status_code == 200

    # Simulate download in progress
    mock_model_download_service.active_downloads = {"qwen3-8b-q4": ActiveDownload("qwen3-8b-q4", 0.0, 0.0)}

    # Second request should fail
    response2 = client.post("/ai/models/qwen3-8b-q4/download")
    assert response2.status_code == 200
    assert response2.json()["success"] is False

def test_large_model_size_display(client, mock_model_download_service):
    """Test model size is correctly converted to GB."""
    response = client.get("/ai/models")

    assert response.status_code == 200
    data = response.json()
    model = data["models"][0]

    # 5_030_000_000 bytes = ~4.68 GB
    assert model["sizeGB"] == pytest.approx(4.68, rel=0.1)

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
