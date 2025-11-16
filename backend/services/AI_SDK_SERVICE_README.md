# AI SDK Service

Python implementation of the AI SDK Service for Justice Companion.

Converted from: `src/services/ai/AISDKService.ts`

## Overview

The AI SDK Service provides a unified interface for interacting with multiple AI providers through a single, consistent API. It supports both streaming and non-streaming chat completions, automatic provider detection, and comprehensive error handling.

## Supported Providers

- **OpenAI** - GPT-4, GPT-3.5, GPT-4 Turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Hugging Face** - Various open-source models via Inference API
- **Qwen** - Qwen 2.5 models via HuggingFace
- **Google** - Gemini Pro, Gemini 1.5
- **Cohere** - Command R+, Command
- **Together AI** - Meta Llama, Mixtral, and more
- **Anyscale** - Meta Llama, Mistral
- **Mistral AI** - Mistral Large, Mistral Medium
- **Perplexity** - Llama 3.1 Sonar models

## Installation

### Required Dependencies

```bash
pip install openai>=1.54.0          # OpenAI and OpenAI-compatible providers
pip install anthropic>=0.39.0       # Anthropic Claude
pip install huggingface-hub>=0.26.0 # HuggingFace models
```

### Optional Dependencies

Install only the SDKs you need:

```bash
# For OpenAI only
pip install openai

# For Anthropic only
pip install anthropic

# For HuggingFace only
pip install huggingface-hub
```

## Quick Start

### Basic Non-Streaming Chat

```python
from backend.services.ai_sdk_service import (
    AISDKService,
    AIProviderConfig,
    AIProviderType,
    ChatMessage,
    MessageRole,
)

# Configure provider
config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-your-api-key",
    model="gpt-4-turbo",
    temperature=0.7,
    max_tokens=2000
)

# Create service
service = AISDKService(config)

# Create messages
messages = [
    ChatMessage(role=MessageRole.SYSTEM, content="You are a helpful assistant."),
    ChatMessage(role=MessageRole.USER, content="Hello, how are you?"),
]

# Get response
response = await service.chat(messages)
print(response)
```

### Streaming Chat with Callbacks

```python
async def stream_example():
    config = AIProviderConfig(
        provider=AIProviderType.ANTHROPIC,
        api_key="sk-ant-your-api-key",
        model="claude-3-5-sonnet-20241022"
    )

    service = AISDKService(config)

    messages = [
        ChatMessage(role=MessageRole.USER, content="Tell me a story."),
    ]

    def on_token(token: str):
        print(token, end="", flush=True)

    def on_complete(full_response: str):
        print(f"\n\nTotal length: {len(full_response)}")

    def on_error(error: Exception):
        print(f"Error: {str(error)}")

    await service.stream_chat(
        messages,
        on_token=on_token,
        on_complete=on_complete,
        on_error=on_error
    )
```

## API Reference

### AIProviderConfig

Configuration for AI providers.

**Parameters:**
- `provider` (AIProviderType) - Provider type (required)
- `api_key` (str) - API key for the provider (required)
- `model` (str) - Model name to use (required)
- `endpoint` (str, optional) - Custom API endpoint
- `temperature` (float) - Sampling temperature (0.0-2.0, default: 0.7)
- `max_tokens` (int) - Maximum tokens to generate (default: 4096)
- `top_p` (float) - Top-p sampling (0.0-1.0, default: 0.9)

### ChatMessage

Individual chat message.

**Parameters:**
- `role` (MessageRole) - Message role: SYSTEM, USER, or ASSISTANT
- `content` (str) - Message content text

### AISDKService

Main service class for AI interactions.

#### Constructor

```python
service = AISDKService(
    config: AIProviderConfig,
    audit_logger: Optional[Any] = None
)
```

#### Methods

##### `async chat(messages: List[ChatMessage], **kwargs) -> str`

Non-streaming chat completion.

**Parameters:**
- `messages` - List of chat messages
- `**kwargs` - Additional provider-specific parameters

**Returns:** Complete response text

**Raises:**
- `ProviderNotConfiguredError` - If client not initialized
- `AIServiceError` - If chat completion fails

##### `async stream_chat(messages, on_token=None, on_complete=None, on_error=None, **kwargs)`

Streaming chat completion with callbacks.

**Parameters:**
- `messages` - List of chat messages
- `on_token` - Callback for each token: `(token: str) -> None`
- `on_complete` - Callback on completion: `(full_response: str) -> None`
- `on_error` - Callback for errors: `(error: Exception) -> None`
- `on_function_call` - Callback for function calls (planned)
- `**kwargs` - Additional provider-specific parameters

##### `get_provider() -> AIProviderType`

Get current provider type.

##### `get_model_name() -> str`

Get current model name.

##### `update_config(config: AIProviderConfig) -> None`

Update configuration and reinitialize client.

##### `is_configured() -> bool`

Check if service is properly configured.

##### `get_provider_capabilities() -> ProviderCapabilities`

Get provider capabilities (streaming support, context window, etc).

## Provider-Specific Notes

### OpenAI

```python
config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-...",
    model="gpt-4-turbo"  # or gpt-4, gpt-3.5-turbo
)
```

**Models:**
- `gpt-4-turbo` - Most capable, 128K context
- `gpt-4` - High quality, 8K context
- `gpt-3.5-turbo` - Fast and cost-effective, 16K context

### Anthropic (Claude)

```python
config = AIProviderConfig(
    provider=AIProviderType.ANTHROPIC,
    api_key="sk-ant-...",
    model="claude-3-5-sonnet-20241022"
)
```

**Models:**
- `claude-3-5-sonnet-20241022` - Best balance, 200K context
- `claude-3-opus-20240229` - Most capable, 200K context
- `claude-3-haiku-20240307` - Fast and economical, 200K context

**Note:** Anthropic requires system messages to be passed separately from conversation messages. This is handled automatically by the service.

### HuggingFace

```python
config = AIProviderConfig(
    provider=AIProviderType.HUGGINGFACE,
    api_key="hf_...",
    model="meta-llama/Llama-2-70b-chat-hf"
)
```

**Popular Models:**
- `meta-llama/Llama-2-70b-chat-hf`
- `mistralai/Mixtral-8x7B-Instruct-v0.1`
- `HuggingFaceH4/zephyr-7b-beta`

### Together AI

```python
config = AIProviderConfig(
    provider=AIProviderType.TOGETHER,
    api_key="...",
    model="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
)
```

Uses OpenAI-compatible API.

### Other Providers

All other providers (Google, Cohere, Anyscale, Mistral, Perplexity) use OpenAI-compatible APIs and follow the same pattern.

## Error Handling

The service provides comprehensive error handling:

```python
from backend.services.ai_sdk_service import (
    AIServiceError,
    ProviderNotConfiguredError,
    ProviderNotSupportedError,
    StreamingError,
)

try:
    response = await service.chat(messages)
except ProviderNotConfiguredError:
    print("Service not properly configured")
except AIServiceError as e:
    print(f"AI service error: {str(e)}")
except Exception as e:
    print(f"Unexpected error: {str(e)}")
```

## Audit Logging

The service supports audit logging for tracking all operations:

```python
class AuditLogger:
    def log(self, event: dict):
        # Log event to database or file
        print(f"[AUDIT] {event['event_type']}: {event['action']}")

audit_logger = AuditLogger()
service = AISDKService(config, audit_logger=audit_logger)

# All operations will be logged
await service.chat(messages)
```

**Logged Events:**
- `ai.chat` - Non-streaming chat completions
- `ai.stream` - Streaming chat completions
- Includes provider, model, success status, error messages

## Advanced Usage

### Switching Providers Dynamically

```python
# Start with OpenAI
openai_config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-...",
    model="gpt-4-turbo"
)
service = AISDKService(openai_config)

# Switch to Anthropic
anthropic_config = AIProviderConfig(
    provider=AIProviderType.ANTHROPIC,
    api_key="sk-ant-...",
    model="claude-3-5-sonnet-20241022"
)
service.update_config(anthropic_config)
```

### Multi-Turn Conversations

```python
messages = [
    ChatMessage(role=MessageRole.SYSTEM, content="You are a helpful assistant."),
]

# Turn 1
messages.append(ChatMessage(role=MessageRole.USER, content="What is Python?"))
response1 = await service.chat(messages)
messages.append(ChatMessage(role=MessageRole.ASSISTANT, content=response1))

# Turn 2
messages.append(ChatMessage(role=MessageRole.USER, content="What are its uses?"))
response2 = await service.chat(messages)
```

### Custom Endpoints

```python
config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-...",
    model="gpt-4-turbo",
    endpoint="https://custom-proxy.example.com/v1"  # Custom endpoint
)
```

## Testing

Run the test suite:

```bash
# Run all tests
pytest backend/services/test_ai_sdk_service.py -v

# Run specific test class
pytest backend/services/test_ai_sdk_service.py::TestServiceMethods -v

# Run with coverage
pytest backend/services/test_ai_sdk_service.py --cov=backend.services.ai_sdk_service
```

## Examples

See `example_ai_sdk_usage.py` for comprehensive examples:

```bash
python backend/services/example_ai_sdk_usage.py
```

**Included Examples:**
1. Simple non-streaming chat (OpenAI)
2. Streaming chat with callbacks (Anthropic)
3. Provider capabilities
4. Switching providers
5. Error handling
6. Factory function usage
7. Audit logging integration
8. Multi-turn conversations

## Performance Considerations

### Non-Streaming vs Streaming

- **Non-Streaming**: Best for short responses, simpler error handling
- **Streaming**: Better UX for long responses, token-by-token delivery

### Provider Selection

- **OpenAI GPT-4**: Highest quality, slower, more expensive
- **OpenAI GPT-3.5**: Fast, cost-effective, good quality
- **Anthropic Claude**: Very high quality, large context window
- **Together AI / Anyscale**: Open-source models, cost-effective
- **HuggingFace**: Free tier available, various model sizes

### Context Window Management

```python
# Check max context tokens
capabilities = service.get_provider_capabilities()
print(f"Max context: {capabilities.max_context_tokens:,} tokens")

# Adjust max_tokens accordingly
config = AIProviderConfig(
    provider=AIProviderType.OPENAI,
    api_key="sk-...",
    model="gpt-4-turbo",
    max_tokens=min(4096, capabilities.max_context_tokens // 2)
)
```

## Security Considerations

1. **API Key Management**: Never hardcode API keys. Use environment variables or secure key management.

```python
import os

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not set")
```

2. **Input Validation**: All inputs are validated using Pydantic models.

3. **Error Messages**: Sensitive information is not exposed in error messages.

4. **Audit Logging**: All operations can be logged for security auditing.

## Troubleshooting

### "SDK not installed" Error

```python
# Install required SDK
pip install openai  # For OpenAI
pip install anthropic  # For Anthropic
pip install huggingface-hub  # For HuggingFace
```

### "Client not configured" Error

Ensure API key is valid and provider configuration is correct:

```python
print(f"Is configured: {service.is_configured()}")
print(f"Provider: {service.get_provider()}")
```

### Streaming Not Working

Check if provider supports streaming:

```python
capabilities = service.get_provider_capabilities()
print(f"Supports streaming: {capabilities.supports_streaming}")
```

## Migration from TypeScript

Key differences from the TypeScript version:

1. **Async/Await**: All I/O operations use async/await
2. **Type Hints**: Python 3.9+ type hints for static analysis
3. **Pydantic Models**: Input validation using Pydantic
4. **Exceptions**: Python exception classes instead of Error objects
5. **Callbacks**: Functions instead of callback objects
6. **Enums**: Python Enum classes for type safety

## Contributing

When adding new providers:

1. Add provider to `AIProviderType` enum
2. Add metadata to `AI_PROVIDER_METADATA` dict
3. Implement provider-specific methods if needed
4. Add tests to `test_ai_sdk_service.py`
5. Update documentation

## License

Part of Justice Companion project. See main project LICENSE file.

## Support

For issues or questions:
1. Check this documentation
2. Review example files
3. Check test files for usage patterns
4. Open an issue on the project repository
