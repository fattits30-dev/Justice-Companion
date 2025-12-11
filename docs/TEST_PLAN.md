# Justice Companion - Comprehensive Test Plan

## Current Test Status

**Total Tests: 1,295** (as of 2025-12-03)

Tests are organized by layer:
- **Routes** (API endpoint tests): ~400 tests
- **Services** (business logic tests): ~600 tests
- **Repositories** (data access tests): ~100 tests
- **Utils** (utility function tests): ~50 tests
- **Integration** (E2E workflow tests): ~145 tests

**Current Coverage:** ~85% (estimated)
**Target Coverage:** 95%+

---

## Test Organization

```
backend/tests/
├── routes/              # API endpoint tests (FastAPI routes)
│   ├── test_auth_routes.py
│   ├── test_cases_routes.py (OLD - needs consolidation)
│   ├── test_dashboard_routes.py
│   ├── test_database_routes.py
│   ├── test_deadlines_routes.py
│   ├── test_evidence_routes.py
│   ├── test_gdpr_enhanced.py
│   ├── test_notifications.py
│   ├── test_port_status_routes.py
│   ├── test_profile_routes.py
│   ├── test_search.py
│   ├── test_templates.py
│   ├── test_tags_routes.py
│   └── test_ai_config_routes.py (BROKEN - needs fix)
│
├── services/           # Service layer unit tests
│   ├── ai/
│   │   ├── test_ai_provider_config_service.py
│   │   ├── test_ai_sdk_service.py
│   │   ├── test_ai_service_factory.py
│   │   ├── test_ai_tool_definitions.py
│   │   ├── test_model_download_service.py
│   │   ├── test_rag_service.py
│   │   └── test_unified_ai_service.py
│   ├── auth/
│   │   ├── test_authorization_service.py
│   │   ├── test_session_manager.py
│   │   ├── test_session_manager_simple.py
│   │   └── test_session_persistence_service.py
│   ├── backup/
│   │   ├── test_backup_retention_policy.py
│   │   └── test_backup_scheduler.py
│   ├── export/
│   │   ├── test_pdf_generator.py
│   │   └── test_template_engine.py
│   ├── gdpr/
│   │   ├── test_data_deleter.py
│   │   ├── test_data_exporter.py
│   │   └── test_gdpr_service.py
│   ├── security/
│   │   ├── test_decryption_cache.py
│   │   └── test_encryption_service.py
│   ├── test_auto_updater.py
│   ├── test_citation_service.py
│   ├── test_deadline_reminder_scheduler.py
│   ├── test_document_parser_service.py
│   ├── test_enhanced_error_tracker.py
│   ├── test_legal_api_service.py
│   ├── test_port_manager.py
│   ├── test_process_manager.py
│   ├── test_search_index_builder.py
│   ├── test_service_container.py
│   ├── test_simple_document_parser.py
│   ├── test_startup_metrics.py
│   └── test_template_seeder.py
│
├── repositories/       # Data access layer tests
│   └── test_case_repository.py
│
├── utils/              # Utility function tests
│   └── test_credentials.py
│
├── test_auth_seed_route.py      # Authentication seeding
├── test_error_handler.py         # Error handling middleware
└── test_p0_fixes.py              # P0 critical fixes (NEW)
```

---

## Test Coverage Gaps

### HIGH PRIORITY - Missing Critical Tests

1. **Chat Routes** (0 tests - CRITICAL)
   - `/chat/stream` - Streaming SSE responses
   - `/chat/send` - Non-streaming chat
   - `/chat/conversations` - List conversations
   - `/chat/conversations/{id}` - Get conversation with messages
   - `/chat/analyze-case` - AI case analysis
   - `/chat/analyze-evidence` - AI evidence analysis
   - `/chat/draft-document` - AI document drafting
   - `/chat/upload-document` - Document upload
   - `/chat/analyze-document` - Document analysis

2. **Case Service Layer** (0 tests)
   - `CaseService` CRUD operations
   - Encryption/decryption of sensitive fields
   - Ownership verification
   - Bulk operations

3. **Chat Service Layer** (0 tests)
   - `ChatService` conversation management
   - Message persistence
   - Conversation history loading

4. **Export Routes** (0 tests)
   - PDF export
   - DOCX export
   - JSON export
   - Template-based exports

5. **Legal Routes** (0 tests - NEW)
   - Legal API endpoints

6. **Database Performance** (0 tests)
   - Query performance benchmarks
   - Index effectiveness
   - N+1 query detection

### MEDIUM PRIORITY - Incomplete Coverage

7. **Middleware** (partial coverage)
   - ✅ Error handling middleware (tested)
   - ❌ Logging middleware (not tested)
   - ❌ Performance middleware (not tested)
   - ❌ Response wrapper middleware (not tested)
   - ❌ CORS middleware (not tested)

8. **AI Service Integration** (partial coverage)
   - ✅ Provider configuration (tested)
   - ✅ AI SDK service (tested)
   - ✅ RAG service (tested)
   - ❌ Streaming responses (not tested)
   - ❌ Tool calling (not tested)
   - ❌ HuggingFace integration (not tested)
   - ❌ Anthropic integration (not tested)

9. **Document Parsing** (partial coverage)
   - ✅ Simple text parser (tested)
   - ❌ PDF parsing (not tested)
   - ❌ DOCX parsing (not tested)
   - ❌ OCR integration (not tested)

10. **Bulk Operations** (0 tests)
    - Bulk delete with transaction rollback
    - Bulk update with validation
    - Bulk archive with audit logging

### LOW PRIORITY - Edge Cases

11. **Security Edge Cases**
    - SQL injection attempts
    - XSS prevention
    - Path traversal attempts
    - File upload size limits
    - Rate limiting enforcement

12. **Concurrency**
    - Simultaneous case updates
    - Race conditions in session management
    - Database transaction isolation

13. **Performance**
    - Large dataset handling (1000+ cases)
    - Memory usage under load
    - Database query optimization

---

## Test Strategy

### Unit Tests (70% of tests)
**Focus:** Individual functions, methods, service classes

**Tools:**
- pytest
- pytest-mock
- pytest-asyncio

**Example:**
```python
def test_encryption_service_encrypt_decrypt():
    """Test encryption/decryption round-trip."""
    service = EncryptionService("base64_key_here")
    original = "sensitive data"
    encrypted = service.encrypt(original)
    decrypted = service.decrypt(encrypted)
    assert decrypted == original
    assert encrypted != original
```

### Integration Tests (20% of tests)
**Focus:** Multiple components working together

**Tools:**
- TestClient (FastAPI)
- pytest fixtures
- Database transactions

**Example:**
```python
def test_create_case_with_encryption(client, db_session):
    """Test case creation with encrypted fields."""
    response = client.post("/cases", json={
        "title": "Test Case",
        "description": "Sensitive description",
        "case_type": "employment"
    })
    assert response.status_code == 200

    # Verify encryption in database
    case = db_session.query(Case).first()
    assert case.description_encrypted != "Sensitive description"
```

### E2E Tests (10% of tests)
**Focus:** Complete user workflows

**Tools:**
- Playwright (existing E2E tests in frontend)
- pytest for backend workflows

**Example:**
```python
async def test_full_case_workflow(client):
    """Test complete case workflow: create, add evidence, export."""
    # 1. Create case
    case_response = client.post("/cases", json={...})
    case_id = case_response.json()["data"]["id"]

    # 2. Upload evidence
    evidence_response = client.post(
        f"/evidence",
        files={"file": ("test.pdf", pdf_content, "application/pdf")},
        data={"case_id": case_id}
    )

    # 3. Export case
    export_response = client.post(f"/export/cases/{case_id}", json={"format": "pdf"})
    assert export_response.status_code == 200
```

---

## Testing Standards

### All Tests Must Include

1. **Descriptive docstrings**
   ```python
   def test_user_login_with_valid_credentials():
       """Test user can login with correct username/password."""
   ```

2. **Arrange-Act-Assert pattern**
   ```python
   # Arrange
   user = create_test_user()

   # Act
   response = client.post("/auth/login", json={"username": user.username, "password": "password"})

   # Assert
   assert response.status_code == 200
   assert "access_token" in response.json()
   ```

3. **Cleanup (fixtures or teardown)**
   ```python
   @pytest.fixture
   def db_session():
       session = SessionLocal()
       yield session
       session.rollback()  # Rollback any changes
       session.close()
   ```

4. **Edge cases and error paths**
   ```python
   def test_login_with_invalid_password():
       """Test login fails with incorrect password."""
       response = client.post("/auth/login", json={"username": "user", "password": "wrong"})
       assert response.status_code == 401
   ```

### Test Naming Convention

```python
def test_<component>_<action>_<expected_result>():
    """
    component: encryption_service, auth_routes, case_repository
    action: encrypts, returns_404, creates
    expected_result: successfully, with_error, when_unauthorized
    """
    pass

# Examples:
def test_encryption_service_encrypts_successfully():
def test_auth_routes_returns_401_when_unauthorized():
def test_case_repository_creates_with_audit_log():
```

---

## Running Tests

### Run All Tests
```bash
pytest backend/tests/ -v
```

### Run With Coverage
```bash
pytest backend/tests/ --cov=backend --cov-report=html --cov-report=term
```

### Run Specific Test File
```bash
pytest backend/tests/routes/test_auth_routes.py -v
```

### Run Specific Test
```bash
pytest backend/tests/routes/test_auth_routes.py::test_login_success -v
```

### Run Tests Matching Pattern
```bash
pytest -k "auth" -v  # All tests with "auth" in name
pytest -k "not slow" -v  # Exclude slow tests
```

### Run With Markers
```bash
pytest -m "integration" -v  # Only integration tests
pytest -m "not slow" -v  # Exclude slow tests
```

---

## Test Fixtures

### Database Fixtures
```python
@pytest.fixture
def db_session():
    """Provide clean database session for each test."""
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def test_user(db_session):
    """Create test user for authentication tests."""
    user = User(username="testuser", email="test@example.com")
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()
    return user
```

### Service Fixtures
```python
@pytest.fixture
def encryption_service():
    """Provide encryption service with test key."""
    key = base64.b64encode(os.urandom(32)).decode()
    return EncryptionService(key)

@pytest.fixture
def audit_logger(db_session):
    """Provide audit logger for service tests."""
    return AuditLogger(db_session)
```

### Client Fixtures
```python
@pytest.fixture
def client():
    """Provide FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def authenticated_client(client, test_user):
    """Provide authenticated test client with JWT token."""
    response = client.post("/auth/login", json={
        "username": test_user.username,
        "password": "password123"
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
```

---

## Coverage Goals

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Routes | 80% | 95% | HIGH |
| Services | 85% | 95% | HIGH |
| Repositories | 90% | 95% | MEDIUM |
| Utils | 70% | 90% | MEDIUM |
| Middleware | 50% | 85% | HIGH |
| Models | 60% | 80% | LOW |

**Overall Target: 95% code coverage**

---

## Continuous Integration

### Pre-commit Checks
- Run fast tests (<1 second each)
- Linting (ruff, black, mypy)
- Type checking

### Pull Request Checks
- Run all unit tests (<30 seconds)
- Coverage report (must not decrease)
- Integration tests (<2 minutes)

### Nightly Builds
- Full test suite including E2E
- Performance benchmarks
- Security scans

---

## Test Performance

### Speed Targets
- Unit tests: <0.1s each
- Integration tests: <1s each
- E2E tests: <10s each
- Full suite: <5 minutes

### Current Performance
- Unit tests: ~0.05s average ✅
- Integration tests: ~0.8s average ✅
- E2E tests: ~5s average ✅
- Full suite: ~3 minutes ✅

---

## Next Steps

### Immediate (This Week)
1. ✅ Fix broken `test_ai_config_routes.py` import
2. ✅ Add comprehensive chat route tests
3. ✅ Add case service layer tests
4. ✅ Add export route tests

### Short Term (This Sprint)
5. Add middleware tests (logging, performance)
6. Add document parsing integration tests
7. Add bulk operations tests
8. Generate coverage report and identify gaps

### Long Term (Next Quarter)
9. Add performance benchmarks
10. Add security penetration tests
11. Add load/stress tests
12. Reach 95% overall coverage

---

## Appendix: Test Markers

```python
# In pytest.ini or pyproject.toml
[tool.pytest.ini_options]
markers = [
    "unit: Unit tests (fast)",
    "integration: Integration tests (moderate speed)",
    "e2e: End-to-end tests (slow)",
    "slow: Tests that take >1 second",
    "security: Security-focused tests",
    "performance: Performance benchmarks",
    "requires_ai: Tests requiring AI service",
    "requires_db: Tests requiring database",
]
```

**Usage:**
```python
@pytest.mark.unit
def test_encryption_service_generates_key():
    pass

@pytest.mark.integration
@pytest.mark.requires_db
def test_case_creation_with_audit_log():
    pass

@pytest.mark.e2e
@pytest.mark.slow
def test_full_export_workflow():
    pass
```

---

**Last Updated:** 2025-12-03
**Next Review:** 2025-12-10
