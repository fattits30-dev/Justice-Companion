"""
Comprehensive test suite for SearchIndexBuilder service.
Tests all index building, updating, and optimization functionality.
"""

import pytest
import json
from unittest.mock import Mock
from sqlalchemy.orm import Session

from backend.services.search_index_builder import SearchIndexBuilder
from backend.services.security.encryption import EncryptionService

@pytest.fixture
def mock_db():
    """Mock SQLAlchemy database session."""
    db = Mock(spec=Session)
    db.execute = Mock()
    db.commit = Mock()
    return db

@pytest.fixture
def mock_encryption_service():
    """Mock encryption service."""
    service = Mock(spec=EncryptionService)
    service.is_encrypted = Mock(return_value=True)
    service.decrypt = Mock(return_value="decrypted content")
    return service

@pytest.fixture
def builder(mock_db, mock_encryption_service):
    """Create SearchIndexBuilder instance."""
    return SearchIndexBuilder(
        db=mock_db,
        encryption_service=mock_encryption_service
    )

# ===== REBUILD INDEX TESTS =====

@pytest.mark.asyncio
async def test_rebuild_index_success(builder, mock_db):
    """Test successful full index rebuild."""
    # Mock users query
    users_result = Mock()
    users_result.fetchall = Mock(return_value=[(1,), (2,)])

    # Mock entity queries returning empty lists
    empty_result = Mock()
    empty_result.fetchall = Mock(return_value=[])

    mock_db.execute.side_effect = [
        Mock(),  # BEGIN
        Mock(),  # DELETE FROM search_index
        users_result,  # SELECT users
        # User 1 queries
        empty_result,  # cases
        empty_result,  # evidence
        empty_result,  # conversations
        empty_result,  # notes
        # User 2 queries
        empty_result,  # cases
        empty_result,  # evidence
        empty_result,  # conversations
        empty_result,  # notes
        Mock(),  # COMMIT
        Mock(),  # audit log
    ]

    await builder.rebuild_index()

    # Verify BEGIN/COMMIT
    assert any("BEGIN" in str(call) for call in mock_db.execute.call_args_list)
    assert any("COMMIT" in str(call) for call in mock_db.execute.call_args_list)

@pytest.mark.asyncio
async def test_rebuild_index_rollback_on_error(builder, mock_db):
    """Test rollback on rebuild error."""
    mock_db.execute.side_effect = Exception("Database error")

    with pytest.raises(Exception) as exc_info:
        await builder.rebuild_index()

    assert "Failed to rebuild search index" in str(exc_info.value)
    # Verify ROLLBACK was called
    assert any("ROLLBACK" in str(call) for call in mock_db.execute.call_args_list)

@pytest.mark.asyncio
async def test_rebuild_index_for_user_success(builder, mock_db):
    """Test successful user-specific index rebuild."""
    user_id = 1

    # Mock empty results for all entity types
    empty_result = Mock()
    empty_result.fetchall = Mock(return_value=[])

    mock_db.execute.side_effect = [
        Mock(),  # BEGIN
        Mock(),  # DELETE user's entries
        empty_result,  # cases
        empty_result,  # evidence
        empty_result,  # conversations
        empty_result,  # notes
        Mock(),  # COMMIT
        Mock(),  # audit log
    ]

    await builder.rebuild_index_for_user(user_id)

    # Verify user-specific delete
    delete_calls = [call for call in mock_db.execute.call_args_list if "DELETE" in str(call)]
    assert len(delete_calls) > 0

@pytest.mark.asyncio
async def test_rebuild_index_for_user_rollback_on_error(builder, mock_db):
    """Test rollback on user rebuild error."""
    mock_db.execute.side_effect = Exception("Database error")

    with pytest.raises(Exception) as exc_info:
        await builder.rebuild_index_for_user(1)

    assert "Failed to rebuild search index for user" in str(exc_info.value)

# ===== INDEX CASE TESTS =====

@pytest.mark.asyncio
async def test_index_case_success(builder, mock_db, mock_encryption_service):
    """Test successful case indexing."""
    case_data = {
        "id": 1,
        "user_id": 1,
        "title": "Test Case",
        "description": "Test description",
        "case_type": "civil",
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
    }

    mock_encryption_service.decrypt.return_value = "Test Case"

    await builder.index_case(case_data)

    # Verify INSERT was called
    insert_calls = [call for call in mock_db.execute.call_args_list if "INSERT" in str(call)]
    assert len(insert_calls) > 0
    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_case_with_encrypted_fields(builder, mock_db, mock_encryption_service):
    """Test case indexing with encrypted fields."""
    encrypted_title = json.dumps({
        "ciphertext": "encrypted",
        "iv": "iv",
        "authTag": "tag",
        "salt": "salt"
    })

    case_data = {
        "id": 1,
        "user_id": 1,
        "title": encrypted_title,
        "description": encrypted_title,
        "case_type": "criminal",
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
    }

    mock_encryption_service.is_encrypted.return_value = True
    mock_encryption_service.decrypt.return_value = "Decrypted content"

    await builder.index_case(case_data)

    # Verify decryption was attempted
    assert mock_encryption_service.decrypt.called

@pytest.mark.asyncio
async def test_index_case_handles_missing_fields(builder, mock_db):
    """Test case indexing with missing optional fields."""
    case_data = {
        "id": 1,
        "user_id": 1,
        "title": "Minimal Case"
    }

    await builder.index_case(case_data)

    # Should not raise, should use defaults
    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_case_error_does_not_raise(builder, mock_db):
    """Test that indexing errors don't raise exceptions."""
    mock_db.execute.side_effect = Exception("Database error")

    case_data = {"id": 1, "user_id": 1, "title": "Test"}

    # Should not raise
    await builder.index_case(case_data)

# ===== INDEX EVIDENCE TESTS =====

@pytest.mark.asyncio
async def test_index_evidence_success(builder, mock_db, mock_encryption_service):
    """Test successful evidence indexing."""
    evidence_data = {
        "id": 1,
        "case_id": 1,
        "title": "Evidence Title",
        "content": "Evidence content",
        "evidence_type": "document",
        "file_path": "/path/to/file",
        "created_at": "2025-01-01T00:00:00Z"
    }

    # Mock case lookup
    case_result = Mock()
    case_result.fetchone = Mock(return_value=(1, 1, "Case Title"))

    mock_db.execute.side_effect = [
        case_result,  # Case lookup
        Mock(),  # INSERT
    ]

    await builder.index_evidence(evidence_data)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_evidence_skips_if_case_not_found(builder, mock_db):
    """Test evidence indexing skips if case doesn't exist."""
    evidence_data = {
        "id": 1,
        "case_id": 999,
        "title": "Evidence Title"
    }

    # Mock case lookup returning None
    case_result = Mock()
    case_result.fetchone = Mock(return_value=None)

    mock_db.execute.return_value = case_result

    await builder.index_evidence(evidence_data)

    # Should not call commit (skipped)
    assert mock_db.commit.call_count == 0

@pytest.mark.asyncio
async def test_index_evidence_with_encrypted_content(builder, mock_db, mock_encryption_service):
    """Test evidence indexing with encrypted content."""
    encrypted_content = json.dumps({
        "ciphertext": "encrypted",
        "iv": "iv",
        "authTag": "tag",
        "salt": "salt"
    })

    evidence_data = {
        "id": 1,
        "case_id": 1,
        "title": encrypted_content,
        "content": encrypted_content,
        "file_path": encrypted_content,
        "evidence_type": "document"
    }

    # Mock case lookup
    case_result = Mock()
    case_result.fetchone = Mock(return_value=(1, 1, "Case Title"))

    mock_db.execute.side_effect = [
        case_result,
        Mock(),  # INSERT
    ]

    mock_encryption_service.is_encrypted.return_value = True
    mock_encryption_service.decrypt.return_value = "Decrypted"

    await builder.index_evidence(evidence_data)

    assert mock_encryption_service.decrypt.called

# ===== INDEX CONVERSATION TESTS =====

@pytest.mark.asyncio
async def test_index_conversation_success(builder, mock_db):
    """Test successful conversation indexing."""
    conversation_data = {
        "id": 1,
        "user_id": 1,
        "title": "Conversation Title",
        "case_id": 1,
        "message_count": 5,
        "created_at": "2025-01-01T00:00:00Z"
    }

    # Mock messages query
    messages_result = Mock()
    messages_result.fetchall = Mock(return_value=[
        ("Message 1",),
        ("Message 2",),
        ("Message 3",)
    ])

    mock_db.execute.side_effect = [
        messages_result,  # Messages query
        Mock(),  # INSERT
    ]

    await builder.index_conversation(conversation_data)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_conversation_with_no_messages(builder, mock_db):
    """Test conversation indexing with no messages."""
    conversation_data = {
        "id": 1,
        "user_id": 1,
        "title": "Empty Conversation",
        "case_id": 1,
        "created_at": "2025-01-01T00:00:00Z"
    }

    # Mock empty messages query
    messages_result = Mock()
    messages_result.fetchall = Mock(return_value=[])

    mock_db.execute.side_effect = [
        messages_result,
        Mock(),  # INSERT
    ]

    await builder.index_conversation(conversation_data)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_conversation_handles_null_messages(builder, mock_db):
    """Test conversation indexing handles null message content."""
    conversation_data = {
        "id": 1,
        "user_id": 1,
        "title": "Conversation",
        "case_id": 1
    }

    # Mock messages with None values
    messages_result = Mock()
    messages_result.fetchall = Mock(return_value=[
        ("Message 1",),
        (None,),  # Null message
        ("Message 3",)
    ])

    mock_db.execute.side_effect = [
        messages_result,
        Mock(),  # INSERT
    ]

    await builder.index_conversation(conversation_data)

    # Should not raise
    mock_db.commit.assert_called()

# ===== INDEX NOTE TESTS =====

@pytest.mark.asyncio
async def test_index_note_success(builder, mock_db, mock_encryption_service):
    """Test successful note indexing."""
    note_data = {
        "id": 1,
        "user_id": 1,
        "title": "Note Title",
        "content": "Note content",
        "case_id": 1,
        "is_pinned": True,
        "created_at": "2025-01-01T00:00:00Z"
    }

    await builder.index_note(note_data)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_note_with_no_title(builder, mock_db):
    """Test note indexing uses default title if missing."""
    note_data = {
        "id": 1,
        "user_id": 1,
        "content": "Note content without title",
        "case_id": 1
    }

    await builder.index_note(note_data)

    # Should use "Untitled Note" as default
    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_index_note_with_encrypted_content(builder, mock_db, mock_encryption_service):
    """Test note indexing with encrypted content."""
    encrypted_content = json.dumps({
        "ciphertext": "encrypted",
        "iv": "iv",
        "authTag": "tag",
        "salt": "salt"
    })

    note_data = {
        "id": 1,
        "user_id": 1,
        "title": "Note",
        "content": encrypted_content,
        "case_id": 1
    }

    mock_encryption_service.is_encrypted.return_value = True
    mock_encryption_service.decrypt.return_value = "Decrypted note"

    await builder.index_note(note_data)

    assert mock_encryption_service.decrypt.called

# ===== REMOVE FROM INDEX TESTS =====

@pytest.mark.asyncio
async def test_remove_from_index_success(builder, mock_db):
    """Test successful removal from index."""
    await builder.remove_from_index("case", 1)

    # Verify DELETE was called
    delete_calls = [call for call in mock_db.execute.call_args_list if "DELETE" in str(call)]
    assert len(delete_calls) > 0
    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_remove_from_index_error_raises(builder, mock_db):
    """Test removal error raises exception."""
    mock_db.execute.side_effect = Exception("Database error")

    with pytest.raises(Exception) as exc_info:
        await builder.remove_from_index("case", 1)

    assert "Failed to remove" in str(exc_info.value)

# ===== UPDATE IN INDEX TESTS =====

@pytest.mark.asyncio
async def test_update_in_index_case(builder, mock_db):
    """Test updating a case in the index."""
    case_result = Mock()
    case_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "user_id": 1,
        "title": "Updated Case",
        "description": "Updated description",
        "case_type": "civil",
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
    }))

    mock_db.execute.side_effect = [
        case_result,  # SELECT case
        Mock(),  # INSERT
    ]

    await builder.update_in_index("case", 1)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_update_in_index_evidence(builder, mock_db):
    """Test updating evidence in the index."""
    evidence_result = Mock()
    evidence_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "case_id": 1,
        "title": "Updated Evidence",
        "content": "Updated content",
        "evidence_type": "document"
    }))

    case_result = Mock()
    case_result.fetchone = Mock(return_value=(1, 1, "Case Title"))

    mock_db.execute.side_effect = [
        evidence_result,  # SELECT evidence
        case_result,  # SELECT case
        Mock(),  # INSERT
    ]

    await builder.update_in_index("evidence", 1)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_update_in_index_conversation(builder, mock_db):
    """Test updating conversation in the index."""
    conversation_result = Mock()
    conversation_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "user_id": 1,
        "title": "Updated Conversation",
        "case_id": 1,
        "message_count": 3
    }))

    messages_result = Mock()
    messages_result.fetchall = Mock(return_value=[("Message 1",)])

    mock_db.execute.side_effect = [
        conversation_result,  # SELECT conversation
        messages_result,  # SELECT messages
        Mock(),  # INSERT
    ]

    await builder.update_in_index("conversation", 1)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_update_in_index_note(builder, mock_db):
    """Test updating note in the index."""
    note_result = Mock()
    note_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "user_id": 1,
        "title": "Updated Note",
        "content": "Updated content",
        "case_id": 1,
        "is_pinned": False
    }))

    mock_db.execute.side_effect = [
        note_result,  # SELECT note
        Mock(),  # INSERT
    ]

    await builder.update_in_index("note", 1)

    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_update_in_index_entity_not_found(builder, mock_db):
    """Test update handles entity not found gracefully."""
    not_found_result = Mock()
    not_found_result.fetchone = Mock(return_value=None)

    mock_db.execute.return_value = not_found_result

    # Should not raise
    await builder.update_in_index("case", 999)

# ===== OPTIMIZE INDEX TESTS =====

@pytest.mark.asyncio
async def test_optimize_index_success(builder, mock_db):
    """Test successful index optimization."""
    await builder.optimize_index()

    # Verify rebuild and optimize commands
    assert mock_db.execute.call_count >= 2
    mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_optimize_index_error_raises(builder, mock_db):
    """Test optimization error raises exception."""
    mock_db.execute.side_effect = Exception("FTS5 error")

    with pytest.raises(Exception) as exc_info:
        await builder.optimize_index()

    assert "Failed to optimize search index" in str(exc_info.value)

# ===== GET INDEX STATS TESTS =====

@pytest.mark.asyncio
async def test_get_index_stats_success(builder, mock_db):
    """Test successful retrieval of index stats."""
    # Mock total count
    total_result = Mock()
    total_result.fetchone = Mock(return_value=(100,))

    # Mock by-type counts
    by_type_result = Mock()
    by_type_result.fetchall = Mock(return_value=[
        ("case", 40),
        ("evidence", 30),
        ("conversation", 20),
        ("note", 10)
    ])

    # Mock last updated
    last_update_result = Mock()
    last_update_result.fetchone = Mock(return_value=("2025-01-01T00:00:00Z",))

    mock_db.execute.side_effect = [
        total_result,
        by_type_result,
        last_update_result
    ]

    stats = await builder.get_index_stats()

    assert stats["total_documents"] == 100
    assert stats["documents_by_type"]["case"] == 40
    assert stats["documents_by_type"]["evidence"] == 30
    assert stats["last_updated"] == "2025-01-01T00:00:00Z"

@pytest.mark.asyncio
async def test_get_index_stats_empty_index(builder, mock_db):
    """Test stats for empty index."""
    total_result = Mock()
    total_result.fetchone = Mock(return_value=(0,))

    by_type_result = Mock()
    by_type_result.fetchall = Mock(return_value=[])

    last_update_result = Mock()
    last_update_result.fetchone = Mock(return_value=(None,))

    mock_db.execute.side_effect = [
        total_result,
        by_type_result,
        last_update_result
    ]

    stats = await builder.get_index_stats()

    assert stats["total_documents"] == 0
    assert stats["documents_by_type"] == {}
    assert stats["last_updated"] is None

@pytest.mark.asyncio
async def test_get_index_stats_error_raises(builder, mock_db):
    """Test stats error raises exception."""
    mock_db.execute.side_effect = Exception("Database error")

    with pytest.raises(Exception) as exc_info:
        await builder.get_index_stats()

    assert "Failed to get index stats" in str(exc_info.value)

# ===== TAG EXTRACTION TESTS =====

def test_extract_tags_with_hashtags(builder):
    """Test tag extraction finds hashtags."""
    content = "This is a #legal #case with #evidence"
    tags = builder._extract_tags(content)

    assert "legal" in tags
    assert "case" in tags
    assert "evidence" in tags

def test_extract_tags_with_dates(builder):
    """Test tag extraction finds dates."""
    content = "Date of incident: 2025-01-15"
    tags = builder._extract_tags(content)

    assert "2025-01-15" in tags

def test_extract_tags_with_emails(builder):
    """Test tag extraction finds email addresses."""
    content = "Contact: john.doe@example.com"
    tags = builder._extract_tags(content)

    assert "john.doe@example.com" in tags

def test_extract_tags_with_phone_numbers(builder):
    """Test tag extraction finds phone numbers."""
    content = "Phone: +1 (555) 123-4567"
    tags = builder._extract_tags(content)

    assert any("555" in tag for tag in tags.split())

def test_extract_tags_with_empty_content(builder):
    """Test tag extraction handles empty content."""
    tags = builder._extract_tags("")
    assert tags == ""

def test_extract_tags_with_mixed_content(builder):
    """Test tag extraction with multiple tag types."""
    content = """
    Case #123 filed on 2025-01-15
    Contact attorney at attorney@lawfirm.com
    Phone: +1-555-1234
    #urgent #criminal
    """
    tags = builder._extract_tags(content)

    assert "123" in tags
    assert "urgent" in tags
    assert "criminal" in tags
    assert "2025-01-15" in tags
    assert "attorney@lawfirm.com" in tags

# ===== DECRYPT IF NEEDED TESTS =====

@pytest.mark.asyncio
async def test_decrypt_if_needed_with_encrypted_data(builder, mock_encryption_service):
    """Test decryption of encrypted content."""
    encrypted_json = json.dumps({
        "ciphertext": "encrypted",
        "iv": "iv",
        "authTag": "tag",
        "salt": "salt"
    })

    mock_encryption_service.is_encrypted.return_value = True
    mock_encryption_service.decrypt.return_value = "Decrypted content"

    result = await builder._decrypt_if_needed(encrypted_json)

    assert result == "Decrypted content"
    mock_encryption_service.decrypt.assert_called_once()

@pytest.mark.asyncio
async def test_decrypt_if_needed_with_plaintext(builder, mock_encryption_service):
    """Test no decryption for plaintext content."""
    plaintext = "This is not encrypted"

    result = await builder._decrypt_if_needed(plaintext)

    assert result == plaintext
    mock_encryption_service.decrypt.assert_not_called()

@pytest.mark.asyncio
async def test_decrypt_if_needed_with_empty_string(builder, mock_encryption_service):
    """Test decryption handles empty string."""
    result = await builder._decrypt_if_needed("")

    assert result == ""

@pytest.mark.asyncio
async def test_decrypt_if_needed_without_encryption_service(mock_db):
    """Test decryption without encryption service."""
    builder = SearchIndexBuilder(db=mock_db, encryption_service=None)

    content = "Some content"
    result = await builder._decrypt_if_needed(content)

    assert result == content

@pytest.mark.asyncio
async def test_decrypt_if_needed_handles_decryption_error(builder, mock_encryption_service):
    """Test decryption error returns original content."""
    encrypted_json = json.dumps({"ciphertext": "encrypted"})

    mock_encryption_service.is_encrypted.return_value = True
    mock_encryption_service.decrypt.side_effect = Exception("Decryption failed")

    result = await builder._decrypt_if_needed(encrypted_json)

    # Should return original content on error
    assert result == encrypted_json

# ===== INTEGRATION-STYLE TESTS =====

@pytest.mark.asyncio
async def test_full_rebuild_workflow(builder, mock_db, mock_encryption_service):
    """Test complete rebuild workflow."""
    # Mock users
    users_result = Mock()
    users_result.fetchall = Mock(return_value=[(1,)])

    # Mock single case
    cases_result = Mock()
    cases_result.fetchall = Mock(return_value=[
        Mock(_mapping={
            "id": 1,
            "user_id": 1,
            "title": "Test Case",
            "description": "Description",
            "case_type": "civil",
            "status": "active",
            "created_at": "2025-01-01T00:00:00Z"
        })
    ])

    # Mock empty evidence, conversations, notes
    empty_result = Mock()
    empty_result.fetchall = Mock(return_value=[])

    mock_db.execute.side_effect = [
        Mock(),  # BEGIN
        Mock(),  # DELETE
        users_result,  # SELECT users
        cases_result,  # SELECT cases
        Mock(),  # INSERT case
        empty_result,  # evidence
        empty_result,  # conversations
        empty_result,  # notes
        Mock(),  # COMMIT
        Mock(),  # audit log
    ]

    await builder.rebuild_index()

    # Verify workflow completed
    assert mock_db.commit.called

@pytest.mark.asyncio
async def test_incremental_update_workflow(builder, mock_db):
    """Test incremental update workflow for multiple entities."""
    # Update case
    case_result = Mock()
    case_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "user_id": 1,
        "title": "Case",
        "description": "",
        "case_type": "civil",
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
    }))

    mock_db.execute.side_effect = [
        case_result,
        Mock(),  # INSERT
    ]

    await builder.update_in_index("case", 1)

    # Update note
    note_result = Mock()
    note_result.fetchone = Mock(return_value=Mock(_mapping={
        "id": 1,
        "user_id": 1,
        "title": "Note",
        "content": "Content",
        "case_id": 1,
        "is_pinned": False
    }))

    mock_db.execute.side_effect = [
        note_result,
        Mock(),  # INSERT
    ]

    await builder.update_in_index("note", 1)

    # Both updates should complete
    assert mock_db.commit.call_count >= 2
