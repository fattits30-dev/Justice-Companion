"""
Comprehensive test suite for search routes.

Tests all search endpoints including:
- Full-text search with FTS5
- Fallback LIKE search
- Saved searches (CRUD operations)
- Search suggestions
- Index management (rebuild, optimize, update, remove)
- Index statistics
- Search syntax and operators
- Entity type filtering
- Authentication and authorization
- Error handling

Run with: pytest backend/routes/test_search.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, patch

from backend.main import app
from backend.models.base import Base, get_db
from backend.services.security.encryption import EncryptionService
from backend.services.auth.service import AuthenticationService

# ===== TEST DATABASE SETUP =====

@pytest.fixture(scope="function")
def test_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create search_index table (FTS5)
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                entity_type, entity_id, user_id, case_id, title, content, tags,
                created_at, status, case_type, evidence_type, file_path,
                message_count, is_pinned
            )
        """))
        conn.commit()

        # Create saved_searches table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS saved_searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                query_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_used_at TEXT,
                use_count INTEGER DEFAULT 0
            )
        """))
        conn.commit()

        # Create audit_logs table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                user_id TEXT,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER NOT NULL,
                error_message TEXT,
                integrity_hash TEXT NOT NULL,
                previous_log_hash TEXT,
                created_at TEXT NOT NULL
            )
        """))
        conn.commit()

        # Create users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        """))
        conn.commit()

        # Create cases table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT,
                case_type TEXT,
                created_at TEXT NOT NULL
            )
        """))
        conn.commit()

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(test_db):
    """Create a test client with dependency injection."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

@pytest.fixture
def mock_encryption_service():
    """Create a mock encryption service."""
    service = Mock(spec=EncryptionService)
    service.encrypt = Mock(return_value=None)
    service.decrypt = Mock(return_value="decrypted content")
    return service

@pytest.fixture
def mock_auth_service(test_db):
    """Create a mock authentication service."""
    service = Mock(spec=AuthenticationService)
    mock_user = Mock()
    mock_user.id = 1
    mock_user.username = "testuser"
    service.validate_session = Mock(return_value=mock_user)
    return service

@pytest.fixture
def auth_headers():
    """Authentication headers for test requests."""
    return {"Authorization": "Bearer test-session-id"}

# ===== TEST SEARCH ENDPOINT =====

def test_search_basic_query(client, test_db, auth_headers):
    """Test basic search functionality."""
    # Insert test data
    test_db.execute(text("""
        INSERT INTO search_index (entity_type, entity_id, user_id, title, content, created_at)
        VALUES ('case', 1, 1, 'Contract Dispute', 'Legal case about contract breach', '2025-01-01')
    """))
    test_db.commit()

    # Execute search
    response = client.post(
        "/search",
        json={
            "query": "contract",
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert "hasMore" in data
    assert "executionTime" in data

def test_search_with_filters(client, test_db, auth_headers):
    """Test search with entity type filters."""
    # Insert test data
    test_db.execute(text("""
        INSERT INTO search_index (entity_type, entity_id, user_id, title, content, created_at)
        VALUES
            ('case', 1, 1, 'Contract Case', 'Legal case', '2025-01-01'),
            ('evidence', 2, 1, 'Contract Evidence', 'Evidence item', '2025-01-01')
    """))
    test_db.commit()

    # Search only cases
    response = client.post(
        "/search",
        json={
            "query": "contract",
            "filters": {
                "entityTypes": ["case"]
            },
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) > 0
    assert all(r["type"] == "case" for r in data["results"])

def test_search_with_date_range_filter(client, test_db, auth_headers):
    """Test search with date range filter."""
    response = client.post(
        "/search",
        json={
            "query": "contract",
            "filters": {
                "dateRange": {
                    "from": "2025-01-01",
                    "to": "2025-12-31"
                }
            },
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 200

def test_search_with_pagination(client, test_db, auth_headers):
    """Test search with pagination."""
    # Insert multiple test records
    for i in range(30):
        test_db.execute(text(f"""
            INSERT INTO search_index (entity_type, entity_id, user_id, title, content, created_at)
            VALUES ('case', {i+1}, 1, 'Case {i+1}', 'Content for case {i+1}', '2025-01-01')
        """))
    test_db.commit()

    # First page
    response = client.post(
        "/search",
        json={
            "query": "case",
            "limit": 10,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) <= 10
    assert data["hasMore"] is True

def test_search_syntax_operators(client, test_db, auth_headers):
    """Test search syntax with various operators."""
    # Insert test data
    test_db.execute(text("""
        INSERT INTO search_index (entity_type, entity_id, user_id, title, content, created_at)
        VALUES
            ('case', 1, 1, 'Contract Dispute', 'Employment contract dispute', '2025-01-01'),
            ('case', 2, 1, 'Contract Agreement', 'Simple contract agreement', '2025-01-01')
    """))
    test_db.commit()

    # Test prefix wildcard
    response = client.post(
        "/search",
        json={
            "query": "contr*",
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 200

def test_search_unauthorized(client):
    """Test search without authentication."""
    response = client.post(
        "/search",
        json={
            "query": "contract",
            "limit": 20,
            "offset": 0
        }
    )

    assert response.status_code == 401

def test_search_validation_errors(client, auth_headers):
    """Test search with invalid request data."""
    # Empty query
    response = client.post(
        "/search",
        json={
            "query": "",
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )

    assert response.status_code == 422

# ===== TEST REBUILD INDEX ENDPOINT =====

def test_rebuild_index(client, test_db, auth_headers):
    """Test rebuilding search index for user."""
    # Insert test user and case
    test_db.execute(text("""
        INSERT INTO users (id, username, password_hash)
        VALUES (1, 'testuser', 'hash')
    """))
    test_db.execute(text("""
        INSERT INTO cases (id, user_id, title, description, status, case_type, created_at)
        VALUES (1, 1, 'Test Case', 'Test description', 'active', 'civil', '2025-01-01')
    """))
    test_db.commit()

    response = client.post("/search/rebuild-index", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data

def test_rebuild_index_unauthorized(client):
    """Test rebuild index without authentication."""
    response = client.post("/search/rebuild-index")

    assert response.status_code == 401

# ===== TEST SAVED SEARCHES =====

def test_save_search(client, test_db, auth_headers):
    """Test saving a search query."""
    response = client.post(
        "/search/save",
        json={
            "name": "My Saved Search",
            "query": {
                "query": "contract dispute",
                "sortBy": "relevance",
                "sortOrder": "desc",
                "limit": 20,
                "offset": 0
            }
        },
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Saved Search"
    assert "id" in data
    assert "queryJson" in data

def test_list_saved_searches(client, test_db, auth_headers):
    """Test listing all saved searches."""
    # Insert test saved search
    test_db.execute(text("""
        INSERT INTO saved_searches (user_id, name, query_json, created_at, use_count)
        VALUES (1, 'Test Search', '{"query":"test"}', '2025-01-01', 0)
    """))
    test_db.commit()

    response = client.get("/search/saved", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_execute_saved_search(client, test_db, auth_headers):
    """Test executing a saved search."""
    # Insert saved search
    test_db.execute(text("""
        INSERT INTO saved_searches (id, user_id, name, query_json, created_at, use_count)
        VALUES (1, 1, 'Test Search', '{"query":"contract","sortBy":"relevance","sortOrder":"desc","limit":20,"offset":0}', '2025-01-01', 0)
    """))
    test_db.commit()

    response = client.post("/search/saved/1/execute", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data

def test_delete_saved_search(client, test_db, auth_headers):
    """Test deleting a saved search."""
    # Insert saved search
    test_db.execute(text("""
        INSERT INTO saved_searches (id, user_id, name, query_json, created_at, use_count)
        VALUES (1, 1, 'Test Search', '{"query":"test"}', '2025-01-01', 0)
    """))
    test_db.commit()

    response = client.delete("/search/saved/1", headers=auth_headers)

    assert response.status_code == 204

def test_delete_saved_search_not_found(client, auth_headers):
    """Test deleting a non-existent saved search."""
    response = client.delete("/search/saved/999", headers=auth_headers)

    assert response.status_code == 404

# ===== TEST SEARCH SUGGESTIONS =====

def test_get_search_suggestions(client, test_db, auth_headers):
    """Test getting search suggestions."""
    # Insert saved searches for suggestions
    test_db.execute(text("""
        INSERT INTO saved_searches (user_id, name, query_json, created_at, last_used_at, use_count)
        VALUES
            (1, 'Search 1', '{"query":"contract dispute"}', '2025-01-01', '2025-01-02', 5),
            (1, 'Search 2', '{"query":"contract agreement"}', '2025-01-01', '2025-01-03', 3)
    """))
    test_db.commit()

    response = client.get("/search/suggestions?prefix=contr&limit=5", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

# ===== TEST INDEX MANAGEMENT =====

def test_get_index_statistics(client, test_db, auth_headers):
    """Test getting index statistics."""
    # Insert test data
    test_db.execute(text("""
        INSERT INTO search_index (entity_type, entity_id, user_id, title, content, created_at)
        VALUES
            ('case', 1, 1, 'Case 1', 'Content 1', '2025-01-01'),
            ('evidence', 2, 1, 'Evidence 1', 'Content 2', '2025-01-01')
    """))
    test_db.commit()

    response = client.get("/search/index/stats", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "totalDocuments" in data
    assert "documentsByType" in data
    assert "lastUpdated" in data

def test_optimize_index(client, auth_headers):
    """Test optimizing search index."""
    response = client.post("/search/index/optimize", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_update_index_entity(client, auth_headers):
    """Test updating a single entity in the index."""
    response = client.post(
        "/search/index/update",
        json={
            "entityType": "case",
            "entityId": 1
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_update_index_invalid_entity_type(client, auth_headers):
    """Test updating index with invalid entity type."""
    response = client.post(
        "/search/index/update",
        json={
            "entityType": "invalid",
            "entityId": 1
        },
        headers=auth_headers
    )

    assert response.status_code == 422

def test_remove_from_index(client, auth_headers):
    """Test removing an entity from the index."""
    response = client.delete("/search/index/case/1", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_remove_from_index_invalid_entity_type(client, auth_headers):
    """Test removing with invalid entity type."""
    response = client.delete("/search/index/invalid/1", headers=auth_headers)

    assert response.status_code == 400

# ===== TEST ERROR HANDLING =====

def test_search_service_failure(client, test_db, auth_headers):
    """Test handling of search service failures."""
    with patch('backend.routes.search.SearchService.search', side_effect=Exception("Service error")):
        response = client.post(
            "/search",
            json={
                "query": "test",
                "limit": 20,
                "offset": 0
            },
            headers=auth_headers
        )

        assert response.status_code == 500

def test_index_builder_failure(client, auth_headers):
    """Test handling of index builder failures."""
    with patch('backend.routes.search.SearchIndexBuilder.rebuild_index_for_user', side_effect=Exception("Builder error")):
        response = client.post("/search/rebuild-index", headers=auth_headers)

        assert response.status_code == 500

# ===== TEST INTEGRATION =====

def test_full_search_workflow(client, test_db, auth_headers):
    """Test complete search workflow: index -> search -> save -> execute."""
    # 1. Insert test data
    test_db.execute(text("""
        INSERT INTO users (id, username, password_hash)
        VALUES (1, 'testuser', 'hash')
    """))
    test_db.execute(text("""
        INSERT INTO cases (id, user_id, title, description, status, case_type, created_at)
        VALUES (1, 1, 'Contract Dispute', 'Legal case about contract breach', 'active', 'civil', '2025-01-01')
    """))
    test_db.commit()

    # 2. Rebuild index
    rebuild_response = client.post("/search/rebuild-index", headers=auth_headers)
    assert rebuild_response.status_code == 200

    # 3. Perform search
    search_response = client.post(
        "/search",
        json={
            "query": "contract",
            "limit": 20,
            "offset": 0
        },
        headers=auth_headers
    )
    assert search_response.status_code == 200

    # 4. Save the search
    save_response = client.post(
        "/search/save",
        json={
            "name": "Contract Searches",
            "query": {
                "query": "contract",
                "sortBy": "relevance",
                "sortOrder": "desc",
                "limit": 20,
                "offset": 0
            }
        },
        headers=auth_headers
    )
    assert save_response.status_code == 201
    saved_search_id = save_response.json()["id"]

    # 5. Execute saved search
    execute_response = client.post(f"/search/saved/{saved_search_id}/execute", headers=auth_headers)
    assert execute_response.status_code == 200

    # 6. Get index statistics
    stats_response = client.get("/search/index/stats", headers=auth_headers)
    assert stats_response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
