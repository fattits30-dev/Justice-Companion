"""
End-to-end integration test for chat functionality.

Tests the complete flow:
1. User sends message
2. Backend receives message
3. AI service processes message
4. Response streams back to user
5. Conversation saved to database
"""

import pytest
import asyncio
from backend.models.base import SessionLocal
from backend.services.ai.stub import StubAIService
from backend.services.chat_service import ChatService, CreateConversationInput, CreateMessageInput
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger
from backend.db_context import db_session, DatabaseManager
from backend.ai_context import stub_ai_service_context


def test_context_managers_basic():
    """Test that context managers work correctly."""
    # Test database context manager
    with db_session() as db:
        assert db is not None
        # Database session is active

    # Test database manager
    with DatabaseManager.create() as db_mgr:
        assert db_mgr.session is not None
        assert not db_mgr._closed

    # Manager should be closed after context
    assert db_mgr._closed


def test_ai_service_context_manager():
    """Test AI service context manager."""
    with stub_ai_service_context() as ai_service:
        assert ai_service is not None
        assert isinstance(ai_service, StubAIService)
        assert ai_service.config.provider == "openai"
        assert ai_service.config.model == "stub-model"


@pytest.mark.asyncio
async def test_chat_end_to_end_with_context_managers():
    """
    Test complete chat flow using context managers.

    Flow:
    1. Create conversation
    2. Send user message
    3. Get AI response
    4. Save both messages
    5. Verify in database
    """
    # Create encryption service (stub mode)
    encryption_service = EncryptionService(b"0" * 32)

    # Use database context manager
    with db_session() as db:
        # Create services
        audit_logger = AuditLogger(db)
        chat_service = ChatService(db, encryption_service, audit_logger)

        # Use AI service context manager
        with stub_ai_service_context(audit_logger) as ai_service:
            # Step 1: Create conversation
            user_id = 1
            conversation_input = CreateConversationInput(
                user_id=user_id,
                case_id=None,
                title="Test Chat E2E"
            )

            conversation = await chat_service.create_conversation(conversation_input)
            assert conversation is not None
            assert conversation.id is not None
            conversation_id = conversation.id

            # Step 2: Send user message
            user_message = "What is unfair dismissal?"
            user_message_input = CreateMessageInput(
                conversation_id=conversation_id,
                role="user",
                content=user_message
            )

            saved_user_message = await chat_service.add_message(user_message_input, user_id)
            assert saved_user_message.content == user_message

            # Step 3: Get AI response
            from backend.services.ai.models import ChatMessage

            messages = [
                ChatMessage(role="system", content="You are a helpful legal assistant."),
                ChatMessage(role="user", content=user_message)
            ]

            ai_response = await ai_service.chat(messages)
            assert ai_response is not None
            assert len(ai_response) > 0

            # Verify stub response contains expected content
            assert "unfair dismissal" in ai_response.lower()
            assert "employment" in ai_response.lower()

            # Step 4: Save assistant message
            assistant_message_input = CreateMessageInput(
                conversation_id=conversation_id,
                role="assistant",
                content=ai_response
            )

            saved_assistant_message = await chat_service.add_message(
                assistant_message_input, user_id
            )
            assert saved_assistant_message.content == ai_response

            # Step 5: Verify in database
            loaded_conversation = await chat_service.load_conversation(conversation_id, user_id)
            assert loaded_conversation is not None
            assert len(loaded_conversation.messages) == 2
            assert loaded_conversation.messages[0].role == "user"
            assert loaded_conversation.messages[1].role == "assistant"

            print(f"✅ Chat E2E test passed!")
            print(f"   Conversation ID: {conversation_id}")
            print(f"   User message: {user_message}")
            print(f"   AI response: {ai_response[:100]}...")


@pytest.mark.asyncio
async def test_streaming_chat_with_context_managers():
    """Test streaming chat response with context managers."""
    encryption_service = EncryptionService(b"0" * 32)

    with db_session() as db:
        audit_logger = AuditLogger(db)

        with stub_ai_service_context(audit_logger) as ai_service:
            # Test streaming
            from backend.services.ai.models import ChatMessage

            messages = [
                ChatMessage(role="user", content="Tell me about employment tribunals")
            ]

            full_response = ""
            token_count = 0

            async for token in ai_service.stream_chat(messages):
                full_response += token
                token_count += 1

            assert len(full_response) > 0
            assert token_count > 0
            assert "employment tribunal" in full_response.lower()

            print(f"✅ Streaming test passed!")
            print(f"   Received {token_count} tokens")
            print(f"   Full response: {full_response[:100]}...")


if __name__ == "__main__":
    # Run tests directly
    print("=== Testing Chat End-to-End Flow ===\n")

    print("Test 1: Context Managers Basic")
    test_context_managers_basic()
    print("✅ Passed\n")

    print("Test 2: AI Service Context Manager")
    test_ai_service_context_manager()
    print("✅ Passed\n")

    print("Test 3: Chat End-to-End with Context Managers")
    asyncio.run(test_chat_end_to_end_with_context_managers())
    print("✅ Passed\n")

    print("Test 4: Streaming Chat")
    asyncio.run(test_streaming_chat_with_context_managers())
    print("✅ Passed\n")

    print("=== All Tests Passed! ===")
