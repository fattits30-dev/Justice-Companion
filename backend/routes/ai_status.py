"""
AI Service Status routes for Justice Companion.
Migrated from electron/ipc-handlers/ai-status.ts

Routes:
- GET /ai/status - Get comprehensive AI service status
  (providers, models, health)
- GET /ai/providers - List all available AI providers with capabilities
- GET /ai/providers/configured - List configured providers for current user
- GET /ai/providers/{provider}/test - Test provider connection
- GET /ai/models - List available models for download
- GET /ai/models/downloaded - List downloaded local models
- GET /ai/models/{model_id}/status - Check model download status
- POST /ai/models/{model_id}/download - Start model download
- DELETE /ai/models/{model_id} - Delete downloaded model
- GET /ai/health - Health check for AI services

Security:
- User-scoped provider configurations
- API keys never exposed in responses
- Audit logging for all operations
- Service availability checks with proper error handling

REFACTORED: Now uses service layer instead of direct database/environment
queries
- AIProviderConfigService for provider configuration management
- UnifiedAIService for multi-provider AI operations
- ModelDownloadService for model management
- AIServiceFactory for service instantiation
- EncryptionService for API key encryption
- AuditLogger for comprehensive audit trail
"""

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.models.base import get_db
from backend.routes.auth import get_current_user
from backend.services.ai.providers import \
    AI_PROVIDER_METADATA as CONFIG_PROVIDER_METADATA
from backend.services.ai.providers import AIProviderConfigService
from backend.services.ai.providers import \
    AIProviderType as ConfigProviderType
from backend.services.audit_logger import AuditLogger
from backend.services.security.encryption import EncryptionService
from backend.services.ai.model_download import ModelDownloadService
from backend.services.ai.service import (AIProviderConfig, ChatMessage,
                                                 UnifiedAIService)

router = APIRouter(prefix="/ai", tags=["ai-status"])

# ===== DEPENDENCY INJECTION =====

def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    encryption_key = os.getenv("ENCRYPTION_KEY_BASE64")
    if not encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not configured",
        )
    return EncryptionService(encryption_key)

def get_audit_logger(db: Session = Depends(get_db)) -> AuditLogger:
    """Get audit logger instance."""
    return AuditLogger(db)

def get_provider_config_service(
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> AIProviderConfigService:
    """Get AI provider configuration service instance."""
    return AIProviderConfigService(db, encryption_service, audit_logger)

def get_model_download_service(
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> ModelDownloadService:
    """Get model download service instance."""
    models_dir = os.getenv("MODELS_DIR", "./models")
    return ModelDownloadService(models_dir, audit_logger)

@asynccontextmanager
async def measure_response_time():
    """
    Context manager for measuring async operation response times.

    Yields:
        A function that returns elapsed time when called

    Example:
        async with measure_response_time() as get_elapsed:
            await some_async_operation()
            elapsed = get_elapsed()
    """
    start_time = time.monotonic()
    try:
        yield lambda: time.monotonic() - start_time
    finally:
        pass

class AIServiceFactory:
    """
    Factory for creating UnifiedAIService instances with proper
    dependency injection.

    Handles the transformation from AIProviderConfigService output to
    UnifiedAIService input.
    """

    def __init__(
        self,
        config_service: AIProviderConfigService,
        audit_logger: AuditLogger,
    ):
        self.config_service = config_service
        self.audit_logger = audit_logger

    async def create_for_user(
        self,
        user_id: int,
    ) -> Optional[UnifiedAIService]:
        """
        Create AI service instance for user's active provider configuration.

        Args:
            user_id: User identifier

        Returns:
            UnifiedAIService instance or None if no active provider configured
        """
        active_config = await self.config_service.get_active_provider_config(
            user_id
        )

        if not active_config:
            return None

        # Transform service config to AI service config
        provider_config = AIProviderConfig(
            provider=str(active_config.provider),  # Convert to string safely
            api_key=active_config.api_key,
            model=active_config.model,
            endpoint=active_config.endpoint,
            temperature=active_config.temperature,
            max_tokens=active_config.max_tokens,
            top_p=active_config.top_p,
        )

        return UnifiedAIService(provider_config, self.audit_logger)

def get_ai_service_factory(
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> AIServiceFactory:
    """Get AI service factory instance."""
    return AIServiceFactory(config_service, audit_logger)

async def get_ai_service(
    ai_service_factory: AIServiceFactory = Depends(get_ai_service_factory),
    current_user: int = Depends(get_current_user),
) -> Optional[UnifiedAIService]:
    """
    Get AI service instance for current user's active provider.

    Returns None if no active provider is configured.
    """
    user_id = current_user
    return await ai_service_factory.create_for_user(user_id)

# ===== PYDANTIC MODELS =====

class AIStatusResponse(BaseModel):
    """Response model for comprehensive AI service status."""

    running: bool = Field(
        ...,
        description="Whether AI services are running",
    )
    healthy: bool = Field(
        ...,
        description="Whether services passed health checks",
    )
    configured: bool = Field(
        ...,
        description="Whether any AI provider is configured",
    )
    activeProvider: Optional[str] = Field(
        None,
        description="Active AI provider name",
    )
    activeModel: Optional[str] = Field(
        None,
        description="Active model name",
    )
    providersConfigured: int = Field(
        ...,
        description="Number of configured providers",
    )
    modelsDownloaded: int = Field(
        ...,
        description="Number of local models downloaded",
    )
    capabilities: Optional[Dict[str, Any]] = Field(
        None,
        description="Active provider capabilities",
    )
    error: Optional[str] = Field(
        None,
        description="Error message if unhealthy",
    )

    class Config:
        populate_by_name = True

class ProviderInfoResponse(BaseModel):
    """Response model for provider information."""

    provider: str = Field(..., description="Provider type")
    name: str = Field(..., description="Provider display name")
    configured: bool = Field(..., description="Whether provider is configured")
    active: bool = Field(
        ...,
        description="Whether this is the active provider",
    )
    defaultEndpoint: str = Field(..., description="Default API endpoint")
    supportsStreaming: bool = Field(
        ...,
        description="Whether streaming is supported",
    )
    defaultModel: str = Field(..., description="Default model name")
    maxContextTokens: int = Field(
        ...,
        description="Maximum context window in tokens",
    )
    availableModels: List[str] = Field(
        ...,
        description="List of available models",
    )
    currentModel: Optional[str] = Field(
        None,
        description="Currently configured model",
    )

    class Config:
        populate_by_name = True

class ProvidersListResponse(BaseModel):
    """Response model for providers list."""

    providers: List[ProviderInfoResponse] = Field(
        ...,
        description="List of AI providers",
    )
    totalProviders: int = Field(
        ...,
        description="Total number of available providers",
    )
    configuredProviders: int = Field(
        ...,
        description="Number of configured providers",
    )

    class Config:
        populate_by_name = True

class ModelInfoResponse(BaseModel):
    """Response model for model information."""

    id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Model display name")
    fileName: str = Field(..., description="Model file name")
    size: int = Field(..., description="Model file size in bytes")
    sizeGB: float = Field(..., description="Model file size in GB")
    description: str = Field(..., description="Model description")
    recommended: bool = Field(
        ...,
        description="Whether this is the recommended model",
    )
    downloaded: bool = Field(..., description="Whether model is downloaded")

    class Config:
        populate_by_name = True

class ModelsListResponse(BaseModel):
    """Response model for models list."""

    models: List[ModelInfoResponse] = Field(
        ...,
        description="List of available models",
    )
    totalModels: int = Field(
        ...,
        description="Total number of available models",
    )
    downloadedModels: int = Field(
        ...,
        description="Number of downloaded models",
    )

    class Config:
        populate_by_name = True

class ModelDownloadRequest(BaseModel):
    """Request model for model download."""

    userId: Optional[int] = Field(
        None,
        description="User ID for audit logging",
    )

    class Config:
        populate_by_name = True

class ModelDownloadResponse(BaseModel):
    """Response model for model download initiation."""

    success: bool = Field(
        ...,
        description="Whether download started successfully",
    )
    modelId: str = Field(..., description="Model identifier")
    message: str = Field(..., description="Status message")
    error: Optional[str] = Field(
        None,
        description="Error message if failed",
    )

    class Config:
        populate_by_name = True

class ModelStatusResponse(BaseModel):
    """Response model for model download status."""

    modelId: str = Field(..., description="Model identifier")
    downloaded: bool = Field(
        ...,
        description="Whether model is fully downloaded",
    )
    downloading: bool = Field(
        ...,
        description="Whether download is in progress",
    )
    progress: Optional[Dict[str, Any]] = Field(
        None,
        description="Download progress information",
    )
    error: Optional[str] = Field(
        None,
        description="Error message if download failed",
    )

    class Config:
        populate_by_name = True

class HealthCheckResponse(BaseModel):
    """Response model for health check."""

    status: str = Field(
        ...,
        description="Health status (healthy/degraded/unhealthy)",
    )
    timestamp: str = Field(..., description="Check timestamp (ISO 8601)")
    services: Dict[str, bool] = Field(
        ...,
        description="Individual service health status",
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional health details",
    )

    class Config:
        populate_by_name = True

class ProviderTestResponse(BaseModel):
    """Response model for provider connection test."""

    success: bool = Field(..., description="Whether test succeeded")
    provider: str = Field(..., description="Provider type tested")
    responseTime: Optional[float] = Field(
        None,
        description="Response time in seconds",
    )
    error: Optional[str] = Field(
        None,
        description="Error message if test failed",
    )

    class Config:
        populate_by_name = True

# ===== ROUTES =====

@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    model_service: ModelDownloadService = Depends(
        get_model_download_service
    ),
    ai_service: Optional[UnifiedAIService] = Depends(get_ai_service),
    current_user: int = Depends(get_current_user),
):
    """
    Get comprehensive AI service status.

    Returns:
        Comprehensive status including:
        - Service health (running, healthy)
        - Active provider and model
        - Number of configured providers
        - Number of downloaded models
        - Provider capabilities
        - Any error messages

    Authentication Required: Yes
    """
    try:
        user_id = current_user

        # Get configured providers
        configured_providers = config_service.get_configured_providers(user_id)
        providers_count = len(configured_providers)

        # Get downloaded models
        downloaded_models = model_service.get_downloaded_models()
        models_count = len(downloaded_models)

        # Check if AI service is configured and healthy
        configured = providers_count > 0 or models_count > 0
        running = ai_service is not None
        healthy = running and configured

        # Get active provider details
        active_provider_name = None
        active_model = None
        capabilities = None

        if ai_service:
            active_provider_name = ai_service.get_provider()
            active_model = ai_service.get_model()
            capabilities = ai_service.get_provider_capabilities()

        return AIStatusResponse(
            running=running,
            healthy=healthy,
            configured=configured,
            activeProvider=active_provider_name,
            activeModel=active_model,
            providersConfigured=providers_count,
            modelsDownloaded=models_count,
            capabilities=capabilities,
            error=None if healthy else "No active AI provider configured",
        )

    except Exception as exc:
        # Return error status if check fails
        return AIStatusResponse(
            running=False,
            healthy=False,
            configured=False,
            activeProvider=None,
            activeModel=None,
            providersConfigured=0,
            modelsDownloaded=0,
            capabilities=None,
            error=str(exc),
        )

@router.get("/providers", response_model=ProvidersListResponse)
async def list_providers(
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    current_user: int = Depends(get_current_user),
):
    """
    List all available AI providers with their capabilities.

    Returns:
        List of AI providers with:
        - Provider metadata (name, endpoint, models)
        - Configuration status
        - Active status
        - Capabilities (streaming, context window)

    Authentication Required: Yes
    """
    try:
        user_id = current_user

        # Get configured providers for user
        configured_providers = config_service.get_configured_providers(user_id)
        active_provider = config_service.get_active_provider(user_id)

        # Get user configurations
        user_configs = config_service.list_provider_configs(user_id)
        user_config_map = {config.provider: config for config in user_configs}

        # Build provider info list
        providers_info: List[ProviderInfoResponse] = []

        for provider_type, metadata in CONFIG_PROVIDER_METADATA.items():
            is_configured = provider_type in configured_providers
            is_active = provider_type == active_provider

            current_model = None
            if is_configured and provider_type.value in user_config_map:
                current_model = user_config_map[provider_type.value].model

            providers_info.append(
                ProviderInfoResponse(
                    provider=provider_type.value,
                    name=metadata.name,
                    configured=is_configured,
                    active=is_active,
                    defaultEndpoint=metadata.default_endpoint,
                    supportsStreaming=metadata.supports_streaming,
                    defaultModel=metadata.default_model,
                    maxContextTokens=metadata.max_context_tokens,
                    availableModels=metadata.available_models,
                    currentModel=current_model,
                )
            )

        return ProvidersListResponse(
            providers=providers_info,
            totalProviders=len(CONFIG_PROVIDER_METADATA),
            configuredProviders=len(configured_providers),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list providers: {str(exc)}",
        )

@router.get("/providers/configured", response_model=ProvidersListResponse)
async def list_configured_providers(
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    current_user: int = Depends(get_current_user),
):
    """
    List configured providers for current user.

    Returns:
        List of user's configured AI providers with current settings.

    Authentication Required: Yes
    """
    try:
        user_id = current_user

        # Get user configurations
        user_configs = config_service.list_provider_configs(user_id)

        # Build provider info list (only configured ones)
        providers_info: List[ProviderInfoResponse] = []

        for config in user_configs:
            provider_type = ConfigProviderType(config.provider)
            metadata = CONFIG_PROVIDER_METADATA[provider_type]

            providers_info.append(
                ProviderInfoResponse(
                    provider=config.provider,
                    name=metadata.name,
                    configured=True,
                    active=config.is_active,
                    defaultEndpoint=metadata.default_endpoint,
                    supportsStreaming=metadata.supports_streaming,
                    defaultModel=metadata.default_model,
                    maxContextTokens=metadata.max_context_tokens,
                    availableModels=metadata.available_models,
                    currentModel=config.model,
                )
            )

        return ProvidersListResponse(
            providers=providers_info,
            totalProviders=len(providers_info),
            configuredProviders=len(providers_info),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list configured providers: {str(exc)}",
        )

@router.get("/providers/{provider}/test", response_model=ProviderTestResponse)
async def test_provider(
    provider: str,
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    current_user: int = Depends(get_current_user),
):
    """
    Test connection to a configured AI provider.

    Sends a simple test message to verify connectivity and API key validity.

    Args:
        provider: Provider type (openai, anthropic, etc.)

    Returns:
        Test result with success status and response time.

    Authentication Required: Yes
    """
    try:
        user_id = current_user

        # Validate provider type
        try:
            provider_type = ConfigProviderType(provider)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}",
            )

        # Get provider configuration
        provider_config = await config_service.get_provider_config(
            user_id,
            provider_type,
        )

        if not provider_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provider {provider} is not configured",
            )

        # Create AI service for testing
        ai_config = AIProviderConfig(
            provider=str(provider_config.provider),  # Convert to string safely
            api_key=provider_config.api_key,
            model=provider_config.model,
            endpoint=provider_config.endpoint,
            temperature=0.7,
            max_tokens=50,
            top_p=0.9,  # Required field
        )

        ai_service = UnifiedAIService(ai_config, audit_logger)

        # Send test message
        test_messages = [
            ChatMessage(
                role="user",
                content="Test connection. Reply with 'OK'.",
            )
        ]

        async with measure_response_time() as get_elapsed:
            try:
                await ai_service.chat(test_messages)
                response_time = get_elapsed()

                return ProviderTestResponse(
                    success=True,
                    provider=provider,
                    responseTime=response_time,
                    error=None,
                )

            except Exception as test_error:
                response_time = get_elapsed()

                return ProviderTestResponse(
                    success=False,
                    provider=provider,
                    responseTime=response_time,
                    error=str(test_error),
                )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test provider: {str(exc)}",
        )

@router.get("/models", response_model=ModelsListResponse)
async def list_models(
    model_service: ModelDownloadService = Depends(get_model_download_service),
):
    """
    List all available models for download.

    Returns:
        List of models with metadata (size, description, download status).

    Authentication Required: No (public model catalog)
    """
    try:
        # Get available models from catalog
        available_models = model_service.get_available_models()

        # Enrich with download status
        models_info: List[ModelInfoResponse] = []
        downloaded_count = 0

        for model in available_models:
            is_downloaded = model_service.is_model_downloaded(model["id"])
            if is_downloaded:
                downloaded_count += 1

            models_info.append(
                ModelInfoResponse(
                    id=model["id"],
                    name=model["name"],
                    fileName=model["fileName"],
                    size=model["size"],
                    sizeGB=round(model["size"] / (1024**3), 2),
                    description=model["description"],
                    recommended=model["recommended"],
                    downloaded=is_downloaded,
                )
            )

        return ModelsListResponse(
            models=models_info,
            totalModels=len(models_info),
            downloadedModels=downloaded_count,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(exc)}",
        )

@router.get("/models/downloaded", response_model=ModelsListResponse)
async def list_downloaded_models(
    model_service: ModelDownloadService = Depends(get_model_download_service),
):
    """
    List downloaded local models.

    Returns:
        List of downloaded models with metadata.

    Authentication Required: No
    """
    try:
        # Get downloaded models
        downloaded_models = model_service.get_downloaded_models()

        # Build response
        models_info: List[ModelInfoResponse] = []

        for model in downloaded_models:
            models_info.append(
                ModelInfoResponse(
                    id=model["id"],
                    name=model["name"],
                    fileName=model["fileName"],
                    size=model["size"],
                    sizeGB=round(model["size"] / (1024**3), 2),
                    description=model["description"],
                    recommended=model["recommended"],
                    downloaded=True,
                )
            )

        return ModelsListResponse(
            models=models_info,
            totalModels=len(models_info),
            downloadedModels=len(models_info),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list downloaded models: {str(exc)}",
        )

@router.get("/models/{model_id}/status", response_model=ModelStatusResponse)
async def get_model_status(
    model_id: str,
    model_service: ModelDownloadService = Depends(get_model_download_service),
):
    """
    Check model download status.

    Args:
        model_id: Model identifier

    Returns:
        Model download status (downloaded, downloading, progress).

    Authentication Required: No
    """
    try:
        # Check if model exists in catalog
        available_models = model_service.get_available_models()
        model_exists = any(m["id"] == model_id for m in available_models)

        if not model_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )

        # Check download status
        is_downloaded = model_service.is_model_downloaded(model_id)
        is_downloading = model_id in model_service.active_downloads

        progress_info = None
        if is_downloading:
            active_download = model_service.active_downloads[model_id]
            progress_info = {
                "startTime": active_download.start_time,
                "lastProgress": active_download.last_progress,
            }

        return ModelStatusResponse(
            modelId=model_id,
            downloaded=is_downloaded,
            downloading=is_downloading,
            progress=progress_info,
            error=None,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model status: {str(exc)}",
        )

@router.post(
    "/models/{model_id}/download",
    response_model=ModelDownloadResponse,
)
async def download_model(
    model_id: str,
    background_tasks: BackgroundTasks,
    request: ModelDownloadRequest = ModelDownloadRequest(),
    model_service: ModelDownloadService = Depends(get_model_download_service),
    current_user: int = Depends(get_current_user),
):
    """
    Start downloading a model.

    Args:
        model_id: Model identifier
        request: Download request with optional user ID

    Returns:
        Download initiation result.

    Authentication Required: Yes

    Note: Download runs in background.
    Use GET /models/{model_id}/status to track progress.
    """
    try:
        user_id = current_user

        # Check if model exists in catalog
        available_models = model_service.get_available_models()
        model_exists = any(m["id"] == model_id for m in available_models)

        if not model_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )

        # Check if already downloaded
        if model_service.is_model_downloaded(model_id):
            return ModelDownloadResponse(
                success=True,
                modelId=model_id,
                message="Model already downloaded",
                error=None,
            )

        # Check if download already in progress
        if model_id in model_service.active_downloads:
            return ModelDownloadResponse(
                success=False,
                modelId=model_id,
                message="Download already in progress",
                error="Download already in progress",
            )

        # Start download in background
        async def download_task():
            await model_service.download_model(
                model_id=model_id,
                user_id=user_id,
            )

        background_tasks.add_task(download_task)

        return ModelDownloadResponse(
            success=True,
            modelId=model_id,
            message="Download started",
            error=None,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start model download: {str(exc)}",
        )

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    model_service: ModelDownloadService = Depends(get_model_download_service),
    current_user: int = Depends(get_current_user),
):
    """
    Delete a downloaded model.

    Args:
        model_id: Model identifier

    Returns:
        204 No Content on success

    Authentication Required: Yes
    """
    try:
        user_id = current_user

        # Check if model exists in catalog
        available_models = model_service.get_available_models()
        model_exists = any(m["id"] == model_id for m in available_models)

        if not model_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}",
            )

        # Delete model
        success = await model_service.delete_model(model_id, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not downloaded: {model_id}",
            )

        return None  # 204 No Content

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(exc)}",
        )

@router.get("/health", response_model=HealthCheckResponse)
async def health_check(
    config_service: AIProviderConfigService = Depends(
        get_provider_config_service
    ),
    model_service: ModelDownloadService = Depends(get_model_download_service),
):
    """
    Health check for AI services.

    Returns:
        Health status with individual service checks.

    Authentication Required: No (public health endpoint)
    """
    try:
        services_health = {}

        # Check provider config service
        try:
            # Simple check: list all providers metadata
            metadata = config_service.list_all_providers_metadata()
            services_health["provider_config"] = len(metadata) > 0
        except Exception:
            services_health["provider_config"] = False

        # Check model download service
        try:
            # Simple check: get available models
            models = model_service.get_available_models()
            services_health["model_download"] = len(models) > 0
        except Exception:
            services_health["model_download"] = False

        # Determine overall status
        all_healthy = all(services_health.values())
        any_healthy = any(services_health.values())

        if all_healthy:
            overall_status = "healthy"
        elif any_healthy:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"

        return HealthCheckResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            services=services_health,
            details={
                "total_services": len(services_health),
                "healthy_services": sum(services_health.values()),
            },
        )

    except Exception as exc:
        return HealthCheckResponse(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat(),
            services={},
            details={"error": str(exc)},
        )
