"""
AI Service Factory - Usage Examples

This file demonstrates how to use the AIServiceFactory for multi-provider
AI service management in Justice Companion.

Run with:
    python backend/services/example_ai_service_factory.py
"""

import asyncio
import tempfile
import os

from backend.services.ai_service_factory import (
    AIServiceFactory,
    AIChatRequest,
    AIChatMessage,
    LegalContext,
    LegislationResult,
    CaseResult,
    get_ai_service_factory,
)


# ============================================================================
# EXAMPLE 1: Basic Factory Initialization
# ============================================================================


def example_1_basic_initialization():
    """
    Example 1: Initialize the AIServiceFactory singleton

    The factory requires a model path pointing to a local GGUF model file.
    This is typically the Qwen 3 8B model.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Basic Factory Initialization")
    print("=" * 60)

    # Create temporary model file for demonstration
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))  # 1 MB dummy file
        model_path = f.name

    try:
        # Reset singleton (only needed for examples)
        AIServiceFactory.reset_instance()

        # Initialize factory with model path
        factory = AIServiceFactory.get_instance(
            model_path=model_path, audit_logger=None  # Optional audit logger
        )

        print(f"[OK] Factory initialized successfully")
        print(f"  Model path: {model_path}")
        print(f"  Current provider: {factory.get_current_provider()}")
        print(f"  Model available: {factory.is_model_available()}")
        print(f"  Model size: {factory.get_model_size()} bytes")

        # Subsequent calls return same instance
        factory2 = AIServiceFactory.get_instance()
        print(f"[OK] Singleton pattern verified: {factory is factory2}")

    finally:
        # Cleanup
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 2: Configure Multiple Providers
# ============================================================================


def example_2_configure_providers():
    """
    Example 2: Configure both OpenAI and Integrated providers

    The factory supports two providers:
    - OpenAI (cloud-based, requires API key)
    - IntegratedAIService (local Qwen 3 model)
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Configure Multiple Providers")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        # Initialize factory
        factory = AIServiceFactory.get_instance(model_path=model_path)

        print(f"[OK] Factory initialized with integrated provider")
        print(f"  Current provider: {factory.get_current_provider()}")

        # Configure OpenAI
        factory.configure_openai(api_key="sk-test-api-key", model="gpt-4o")

        print(f"[OK] OpenAI configured and activated")
        print(f"  Current provider: {factory.get_current_provider()}")

        # Switch back to integrated
        factory.switch_to_integrated()

        print(f"[OK] Switched to integrated provider")
        print(f"  Current provider: {factory.get_current_provider()}")

        # Switch to OpenAI (returns True if successful)
        success = factory.switch_to_openai()

        print(f"[OK] Switch to OpenAI: {success}")
        print(f"  Current provider: {factory.get_current_provider()}")

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 3: Handle Chat Requests
# ============================================================================


async def example_3_handle_chat_requests():
    """
    Example 3: Send chat requests to AI service

    Demonstrates how to create and send chat requests with legal context.
    Note: These are stub implementations that return "NOT_IMPLEMENTED" errors.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Handle Chat Requests")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        # Initialize factory
        factory = AIServiceFactory.get_instance(model_path=model_path)

        # Create a simple chat request
        simple_request = AIChatRequest(
            messages=[
                AIChatMessage(role="user", content="What are my rights regarding unfair dismissal?")
            ],
            case_id=123,
        )

        print("[OK] Created simple chat request")
        print(f"  Messages: {len(simple_request.messages)}")
        print(f"  Case ID: {simple_request.case_id}")

        # Send request (will return stub error in this example)
        response = await factory.handle_chat_request(simple_request)

        print(f"[OK] Received response")
        print(f"  Success: {response.success}")
        if not response.success:
            print(f"  Error: {response.error}")
            print(f"  Code: {response.code}")

        # Create request with legal context
        context_request = AIChatRequest(
            messages=[
                AIChatMessage(role="user", content="What does this legislation say about my case?")
            ],
            context=LegalContext(
                legislation=[
                    LegislationResult(
                        title="Employment Rights Act 1996",
                        section="Section 94",
                        content="An employee has the right not to be unfairly dismissed...",
                        url="https://www.legislation.gov.uk/ukpga/1996/18/section/94",
                    )
                ],
                case_law=[
                    CaseResult(
                        citation="Smith v ABC Ltd [2024] ET/12345/24",
                        court="Employment Tribunal",
                        date="2024-01-15",
                        summary="Claimant successfully argued unfair dismissal...",
                        outcome="Claimant successful",
                        url="https://example.com/case/12345",
                    )
                ],
                knowledge_base=[],
            ),
            case_id=456,
        )

        print("\n[OK] Created request with legal context")
        print(f"  Legislation: {len(context_request.context.legislation)}")
        print(f"  Case law: {len(context_request.context.case_law)}")

        # Send request with context
        response2 = await factory.handle_chat_request(context_request)

        print(f"[OK] Received response with context")
        print(f"  Success: {response2.success}")

        # Alternative method: use chat() alias
        response3 = await factory.chat(simple_request)

        print(f"[OK] Used chat() alias method")
        print(f"  Success: {response3.success}")

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 4: Case Facts Repository Integration
# ============================================================================


def example_4_case_facts_repository():
    """
    Example 4: Integrate with Case Facts Repository

    The integrated AI service can use a case facts repository to retrieve
    relevant case information for context injection.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Case Facts Repository Integration")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        # Initialize factory
        factory = AIServiceFactory.get_instance(model_path=model_path)

        # Create mock repository
        class MockCaseFactsRepository:
            def get_case_facts(self, case_id: int):
                return {
                    "case_id": case_id,
                    "title": "Employment Case",
                    "facts": ["Fact 1", "Fact 2"],
                }

        mock_repository = MockCaseFactsRepository()

        print("[OK] Created mock case facts repository")

        # Set repository on factory
        factory.set_case_facts_repository(mock_repository)

        print("[OK] Repository set on integrated service")
        print(
            f"  Repository available: {factory.integrated_service.case_facts_repository is not None}"
        )

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 5: Model Validation
# ============================================================================


def example_5_model_validation():
    """
    Example 5: Validate local model availability

    Check if the local model file exists and get its size.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Model Validation")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        # Write 10 MB
        f.write(b"0" * (10 * 1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        # Initialize factory
        factory = AIServiceFactory.get_instance(model_path=model_path)

        # Check model availability
        is_available = factory.is_model_available()
        model_size = factory.get_model_size()

        print(f"[OK] Model validation completed")
        print(f"  Model available: {is_available}")
        print(f"  Model size: {model_size:,} bytes ({model_size / (1024 * 1024):.2f} MB)")

        # Test with nonexistent model
        factory.model_path = "/nonexistent/path/model.gguf"

        is_available2 = factory.is_model_available()
        model_size2 = factory.get_model_size()

        print(f"\n[OK] Nonexistent model test")
        print(f"  Model available: {is_available2}")
        print(f"  Model size: {model_size2} bytes")

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 6: Thread Safety
# ============================================================================


def example_6_thread_safety():
    """
    Example 6: Verify singleton thread safety

    The factory uses a thread-safe singleton pattern to ensure only one
    instance is created even with concurrent access.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Thread Safety Verification")
    print("=" * 60)

    import threading

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        instances = []

        def create_instance():
            factory = AIServiceFactory.get_instance(model_path=model_path)
            instances.append(factory)

        # Create 10 threads
        threads = [threading.Thread(target=create_instance) for _ in range(10)]

        print("[OK] Created 10 threads")

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all threads
        for thread in threads:
            thread.join()

        print(f"[OK] All threads completed")

        # Verify all instances are the same
        unique_instances = len(set(id(inst) for inst in instances))

        print(f"[OK] Thread safety verification")
        print(f"  Total instances created: {len(instances)}")
        print(f"  Unique instances: {unique_instances}")
        print(f"  Thread-safe: {unique_instances == 1}")

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# EXAMPLE 7: Using the Helper Function
# ============================================================================


def example_7_helper_function():
    """
    Example 7: Use get_ai_service_factory() helper

    Demonstrates the convenience helper function for accessing the singleton.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Helper Function Usage")
    print("=" * 60)

    # Create temporary model file
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as f:
        f.write(b"0" * (1024 * 1024))
        model_path = f.name

    try:
        AIServiceFactory.reset_instance()

        # Initialize factory first
        factory1 = AIServiceFactory.get_instance(model_path=model_path)

        print("[OK] Initialized factory with get_instance()")

        # Use helper function to retrieve
        factory2 = get_ai_service_factory()

        print("[OK] Retrieved factory with get_ai_service_factory()")
        print(f"  Same instance: {factory1 is factory2}")

        # Test error case
        AIServiceFactory.reset_instance()

        try:
            factory3 = get_ai_service_factory()
            print("[ERROR] Should have raised RuntimeError")
        except RuntimeError as e:
            print(f"[OK] Correctly raised error: {str(e)}")

    finally:
        AIServiceFactory.reset_instance()
        try:
            os.unlink(model_path)
        except Exception:
            pass


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def main():
    """Run all examples"""
    print("\n" + "=" * 60)
    print("AI SERVICE FACTORY - USAGE EXAMPLES")
    print("=" * 60)
    print("\nDemonstrating multi-provider AI service management...")

    # Run synchronous examples
    example_1_basic_initialization()
    example_2_configure_providers()
    example_4_case_facts_repository()
    example_5_model_validation()
    example_6_thread_safety()
    example_7_helper_function()

    # Run async examples
    asyncio.run(example_3_handle_chat_requests())

    print("\n" + "=" * 60)
    print("ALL EXAMPLES COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print("\nKey Takeaways:")
    print("1. AIServiceFactory uses singleton pattern for global access")
    print("2. Supports both OpenAI (cloud) and Integrated (local) providers")
    print("3. Provider switching is seamless and logged")
    print("4. Model validation ensures local model availability")
    print("5. Thread-safe for concurrent access")
    print("6. Comprehensive audit logging for all operations")
    print("\nNext Steps:")
    print("- Replace stub implementations with real AI services")
    print("- Integrate with OpenAI SDK for cloud provider")
    print("- Implement local model loading with llama.cpp")
    print("- Add RAG pipeline for UK legal data retrieval")
    print()


if __name__ == "__main__":
    main()
