"""
Example usage of AI SDK Service.

This file demonstrates how to use the AISDKService for:
1. Non-streaming chat completions
2. Streaming chat completions with callbacks
3. Switching between providers
4. Error handling
5. Audit logging integration
"""

import asyncio
import os
from typing import List

from backend.services.ai_sdk_service import (
    AISDKService,
    AIProviderConfig,
    AIProviderType,
    ChatMessage,
    MessageRole,
    create_ai_sdk_service,
)


# ============================================================================
# Example 1: Simple Non-Streaming Chat (OpenAI)
# ============================================================================

async def example_openai_chat():
    """Example: Simple chat with OpenAI GPT-4."""
    print("\n" + "="*60)
    print("Example 1: OpenAI Non-Streaming Chat")
    print("="*60)

    # Configure OpenAI
    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY", "sk-test-key"),
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=1000
    )

    # Create service
    service = AISDKService(config)

    # Check configuration
    print(f"Provider: {service.get_provider().value}")
    print(f"Model: {service.get_model_name()}")
    print(f"Configured: {service.is_configured()}")

    # Create messages
    messages = [
        ChatMessage(
            role=MessageRole.SYSTEM,
            content="You are a helpful legal assistant."
        ),
        ChatMessage(
            role=MessageRole.USER,
            content="What is the statute of limitations for breach of contract in the UK?"
        )
    ]

    try:
        # Get response
        response = await service.chat(messages)
        print(f"\nResponse:\n{response}")

    except Exception as e:
        print(f"Error: {str(e)}")


# ============================================================================
# Example 2: Streaming Chat with Callbacks (Anthropic)
# ============================================================================

async def example_anthropic_streaming():
    """Example: Streaming chat with Anthropic Claude."""
    print("\n" + "="*60)
    print("Example 2: Anthropic Streaming Chat")
    print("="*60)

    # Configure Anthropic
    config = AIProviderConfig(
        provider=AIProviderType.ANTHROPIC,
        api_key=os.getenv("ANTHROPIC_API_KEY", "sk-ant-test-key"),
        model="claude-3-5-sonnet-20241022",
        temperature=0.7,
        max_tokens=2000
    )

    # Create service
    service = AISDKService(config)

    print(f"Provider: {service.get_provider().value}")
    print(f"Model: {service.get_model_name()}")

    # Create messages
    messages = [
        ChatMessage(
            role=MessageRole.SYSTEM,
            content="You are a UK legal expert specializing in employment law."
        ),
        ChatMessage(
            role=MessageRole.USER,
            content="Explain the key rights under the Employment Rights Act 1996."
        )
    ]

    # Define callbacks
    print("\nStreaming response:")
    print("-" * 60)

    def on_token(token: str):
        """Called for each token received."""
        print(token, end="", flush=True)

    def on_complete(full_response: str):
        """Called when streaming completes."""
        print("\n" + "-" * 60)
        print(f"Total length: {len(full_response)} characters")

    def on_error(error: Exception):
        """Called if an error occurs."""
        print(f"\nError during streaming: {str(error)}")

    try:
        # Stream chat
        await service.stream_chat(
            messages,
            on_token=on_token,
            on_complete=on_complete,
            on_error=on_error
        )

    except Exception as e:
        print(f"Error: {str(e)}")


# ============================================================================
# Example 3: Provider Capabilities
# ============================================================================

async def example_provider_capabilities():
    """Example: Check provider capabilities."""
    print("\n" + "="*60)
    print("Example 3: Provider Capabilities")
    print("="*60)

    providers = [
        (AIProviderType.OPENAI, "gpt-4-turbo", "sk-test-openai"),
        (AIProviderType.ANTHROPIC, "claude-3-5-sonnet-20241022", "sk-test-anthropic"),
        (AIProviderType.TOGETHER, "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "sk-test-together"),
    ]

    for provider, model, api_key in providers:
        config = AIProviderConfig(
            provider=provider,
            api_key=api_key,
            model=model
        )

        service = AISDKService(config)
        capabilities = service.get_provider_capabilities()

        print(f"\n{capabilities.name}:")
        print(f"  Model: {capabilities.current_model}")
        print(f"  Streaming: {capabilities.supports_streaming}")
        print(f"  Max Context: {capabilities.max_context_tokens:,} tokens")
        print(f"  Endpoint: {capabilities.endpoint}")


# ============================================================================
# Example 4: Switching Providers
# ============================================================================

async def example_switching_providers():
    """Example: Switch between providers dynamically."""
    print("\n" + "="*60)
    print("Example 4: Switching Providers")
    print("="*60)

    # Start with OpenAI
    openai_config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY", "sk-test-key"),
        model="gpt-4-turbo"
    )

    service = AISDKService(openai_config)
    print(f"Initial provider: {service.get_provider().value}")
    print(f"Initial model: {service.get_model_name()}")

    # Switch to Anthropic
    anthropic_config = AIProviderConfig(
        provider=AIProviderType.ANTHROPIC,
        api_key=os.getenv("ANTHROPIC_API_KEY", "sk-ant-test-key"),
        model="claude-3-5-sonnet-20241022"
    )

    service.update_config(anthropic_config)
    print(f"\nUpdated provider: {service.get_provider().value}")
    print(f"Updated model: {service.get_model_name()}")


# ============================================================================
# Example 5: Error Handling
# ============================================================================

async def example_error_handling():
    """Example: Proper error handling."""
    print("\n" + "="*60)
    print("Example 5: Error Handling")
    print("="*60)

    # Invalid API key
    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key="invalid-key",
        model="gpt-4-turbo"
    )

    service = AISDKService(config)

    messages = [
        ChatMessage(role=MessageRole.USER, content="Hello")
    ]

    try:
        response = await service.chat(messages)
        print(f"Response: {response}")
    except Exception as e:
        print(f"Expected error caught: {type(e).__name__}")
        print(f"Error message: {str(e)}")


# ============================================================================
# Example 6: Using Factory Function
# ============================================================================

async def example_factory_function():
    """Example: Use factory function for quick setup."""
    print("\n" + "="*60)
    print("Example 6: Factory Function")
    print("="*60)

    # Quick setup with factory function
    service = create_ai_sdk_service(
        provider="openai",
        api_key=os.getenv("OPENAI_API_KEY", "sk-test-key"),
        model="gpt-4-turbo",
        temperature=0.5,
        max_tokens=500
    )

    print(f"Provider: {service.get_provider().value}")
    print(f"Model: {service.get_model_name()}")
    print(f"Temperature: {service.config.temperature}")
    print(f"Max tokens: {service.config.max_tokens}")


# ============================================================================
# Example 7: Audit Logging Integration
# ============================================================================

class SimpleAuditLogger:
    """Simple audit logger for demonstration."""

    def log(self, event: dict):
        """Log audit event."""
        print(f"\n[AUDIT] {event['event_type']}")
        print(f"  Action: {event['action']}")
        print(f"  Success: {event['success']}")
        print(f"  Provider: {event['details'].get('provider', 'N/A')}")
        if event.get('error_message'):
            print(f"  Error: {event['error_message']}")


async def example_audit_logging():
    """Example: Integration with audit logger."""
    print("\n" + "="*60)
    print("Example 7: Audit Logging")
    print("="*60)

    # Create audit logger
    audit_logger = SimpleAuditLogger()

    # Create service with audit logging
    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY", "sk-test-key"),
        model="gpt-3.5-turbo"
    )

    service = AISDKService(config, audit_logger=audit_logger)

    messages = [
        ChatMessage(role=MessageRole.USER, content="Hello, how are you?")
    ]

    try:
        response = await service.chat(messages)
        print(f"\nResponse: {response}")
    except Exception as e:
        print(f"Error: {str(e)}")


# ============================================================================
# Example 8: Multi-Turn Conversation
# ============================================================================

async def example_multi_turn_conversation():
    """Example: Multi-turn conversation."""
    print("\n" + "="*60)
    print("Example 8: Multi-Turn Conversation")
    print("="*60)

    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY", "sk-test-key"),
        model="gpt-4-turbo"
    )

    service = AISDKService(config)

    # Build conversation history
    messages: List[ChatMessage] = [
        ChatMessage(
            role=MessageRole.SYSTEM,
            content="You are a helpful assistant."
        ),
    ]

    # Turn 1
    messages.append(
        ChatMessage(role=MessageRole.USER, content="What is Python?")
    )

    response1 = await service.chat(messages)
    print(f"\nUser: What is Python?")
    print(f"Assistant: {response1[:100]}...")

    messages.append(
        ChatMessage(role=MessageRole.ASSISTANT, content=response1)
    )

    # Turn 2
    messages.append(
        ChatMessage(role=MessageRole.USER, content="What are its main uses?")
    )

    response2 = await service.chat(messages)
    print(f"\nUser: What are its main uses?")
    print(f"Assistant: {response2[:100]}...")


# ============================================================================
# Main Function
# ============================================================================

async def main():
    """Run all examples."""
    print("\n" + "="*60)
    print("AI SDK Service - Usage Examples")
    print("="*60)

    # Run examples
    examples = [
        ("Simple Chat", example_openai_chat),
        ("Streaming", example_anthropic_streaming),
        ("Capabilities", example_provider_capabilities),
        ("Switching Providers", example_switching_providers),
        ("Error Handling", example_error_handling),
        ("Factory Function", example_factory_function),
        ("Audit Logging", example_audit_logging),
        ("Multi-Turn", example_multi_turn_conversation),
    ]

    print("\nSelect example to run:")
    for i, (name, _) in enumerate(examples, 1):
        print(f"  {i}. {name}")
    print("  0. Run all examples")

    try:
        choice = int(input("\nEnter choice: "))

        if choice == 0:
            for name, func in examples:
                print(f"\n\nRunning: {name}")
                try:
                    await func()
                except Exception as e:
                    print(f"Error in example: {str(e)}")
        elif 1 <= choice <= len(examples):
            _, func = examples[choice - 1]
            await func()
        else:
            print("Invalid choice")

    except KeyboardInterrupt:
        print("\n\nExamples interrupted by user")
    except Exception as e:
        print(f"\nError: {str(e)}")


if __name__ == "__main__":
    # Note: Set environment variables before running:
    # export OPENAI_API_KEY="sk-..."
    # export ANTHROPIC_API_KEY="sk-ant-..."

    asyncio.run(main())
