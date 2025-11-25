"""
Comprehensive tests for template routes with service layer integration.

Tests cover:
1. Create template via TemplateService
2. List templates with filtering
3. Get template by ID
4. Update template
5. Delete template
6. Apply template to create case
7. Seed system templates
8. Error handling and validation
9. Authentication and authorization
10. Audit logging verification

Run with: pytest backend/routes/test_templates.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.models.base import Base, get_db
from backend.models.user import User
from backend.models.session import Session as UserSession
from backend.services.auth.service import AuthenticationService
from backend.services.template_service import TemplateService
from backend.services.template_seeder import TemplateSeeder
from backend.services.audit_logger import AuditLogger

# ===== TEST DATABASE SETUP =====

@pytest.fixture(name="db_session")
def db_session_fixture():
    """Create in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture(name="client")
def client_fixture(db_session):
    """Create FastAPI test client with database override."""
    def get_db_override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = get_db_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(name="test_user")
def test_user_fixture(db_session):
    """Create test user with valid session."""
    # Create user
    user = User(
        email="test@example.com",
        password_hash="hashed_password",
        full_name="Test User",
        security_question_1_hash="hash1",
        security_question_2_hash="hash2"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Create session
    auth_service = AuthenticationService(db=db_session)
    session = UserSession(
        session_id="test-session-id-123",
        user_id=user.id,
        ip_address="127.0.0.1",
        user_agent="pytest"
    )
    db_session.add(session)
    db_session.commit()

    return {
        "user": user,
        "session_id": session.session_id
    }

@pytest.fixture(name="test_user_2")
def test_user_2_fixture(db_session):
    """Create second test user for authorization tests."""
    user = User(
        email="user2@example.com",
        password_hash="hashed_password",
        full_name="User Two",
        security_question_1_hash="hash1",
        security_question_2_hash="hash2"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    session = UserSession(
        session_id="test-session-id-456",
        user_id=user.id,
        ip_address="127.0.0.1",
        user_agent="pytest"
    )
    db_session.add(session)
    db_session.commit()

    return {
        "user": user,
        "session_id": session.session_id
    }

# ===== TEST: CREATE TEMPLATE =====

def test_create_template_success(client, test_user):
    """Test creating a new template via TemplateService."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "name": "Test Template",
        "description": "Test description",
        "category": "civil",
        "templateFields": {
            "titleTemplate": "[Client] vs [Defendant]",
            "descriptionTemplate": "Case regarding [matter]",
            "caseType": "consumer",
            "defaultStatus": "active"
        },
        "suggestedEvidenceTypes": ["Contract", "Correspondence"],
        "timelineMilestones": [
            {
                "title": "File claim",
                "description": "Submit claim to court",
                "daysFromStart": 7,
                "isRequired": True,
                "category": "filing"
            }
        ],
        "checklistItems": [
            {
                "title": "Gather evidence",
                "description": "Collect all relevant documents",
                "category": "evidence",
                "priority": "high",
                "daysFromStart": 1
            }
        ]
    }

    response = client.post("/templates", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Template"
    assert data["category"] == "civil"
    assert data["isSystemTemplate"] is False
    assert data["userId"] == test_user["user"].id
    assert len(data["suggestedEvidenceTypes"]) == 2
    assert len(data["timelineMilestones"]) == 1
    assert len(data["checklistItems"]) == 1

def test_create_template_validation_error(client, test_user):
    """Test template creation with invalid data."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "name": "",  # Empty name should fail
        "category": "civil",
        "templateFields": {
            "titleTemplate": "Test",
            "descriptionTemplate": "Test",
            "caseType": "consumer"
        }
    }

    response = client.post("/templates", json=payload, headers=headers)
    assert response.status_code in [400, 422]  # Validation error

def test_create_template_unauthorized(client):
    """Test creating template without authentication."""
    payload = {
        "name": "Test Template",
        "category": "civil",
        "templateFields": {
            "titleTemplate": "Test",
            "descriptionTemplate": "Test",
            "caseType": "consumer"
        }
    }

    response = client.post("/templates", json=payload)
    assert response.status_code == 401

# ===== TEST: LIST TEMPLATES =====

def test_list_templates_success(client, test_user, db_session):
    """Test listing all templates (system + user templates)."""
    # Seed system templates
    seeder = TemplateSeeder(db=db_session)
    seeder.seed_all()

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.get("/templates", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8  # At least 8 system templates

def test_list_templates_with_category_filter(client, test_user, db_session):
    """Test listing templates filtered by category."""
    seeder = TemplateSeeder(db=db_session)
    seeder.seed_all()

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.get("/templates?category=civil", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert all(t["category"] == "civil" for t in data)

def test_list_templates_invalid_category(client, test_user):
    """Test listing templates with invalid category."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.get("/templates?category=invalid_category", headers=headers)

    assert response.status_code == 400

# ===== TEST: GET TEMPLATE BY ID =====

def test_get_template_success(client, test_user, db_session):
    """Test getting a specific template by ID."""
    # Create template via service
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="Get Test Template",
                description="Test",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER
                )
            ),
            user_id=test_user["user"].id
        )
    )

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.get(f"/templates/{template.id}", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == template.id
    assert data["name"] == "Get Test Template"

def test_get_template_not_found(client, test_user):
    """Test getting non-existent template."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.get("/templates/99999", headers=headers)

    assert response.status_code == 404

def test_get_template_unauthorized_access(client, test_user, test_user_2, db_session):
    """Test that users cannot access other users' templates."""
    # User 1 creates a template
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="User 1 Template",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER
                )
            ),
            user_id=test_user["user"].id
        )
    )

    # User 2 tries to access it
    headers = {"Authorization": f"Bearer {test_user_2['session_id']}"}
    response = client.get(f"/templates/{template.id}", headers=headers)

    assert response.status_code in [403, 404]  # Forbidden or not found

# ===== TEST: UPDATE TEMPLATE =====

def test_update_template_success(client, test_user, db_session):
    """Test updating an existing template."""
    # Create template
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="Original Name",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Original",
                    descriptionTemplate="Original",
                    caseType=CaseType.CONSUMER
                )
            ),
            user_id=test_user["user"].id
        )
    )

    # Update template
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "name": "Updated Name",
        "description": "Updated description"
    }

    response = client.put(f"/templates/{template.id}", json=payload, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"

def test_update_system_template_forbidden(client, test_user, db_session):
    """Test that system templates cannot be updated."""
    # Seed system templates
    seeder = TemplateSeeder(db=db_session)
    seeder.seed_all()

    # Get a system template
    from backend.models.template import CaseTemplate
    system_template = db_session.query(CaseTemplate).filter(
        CaseTemplate.is_system_template == 1
    ).first()

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {"name": "Hacked Name"}

    response = client.put(f"/templates/{system_template.id}", json=payload, headers=headers)

    assert response.status_code in [403, 404]

# ===== TEST: DELETE TEMPLATE =====

def test_delete_template_success(client, test_user, db_session):
    """Test deleting a user template."""
    # Create template
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="Delete Me",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="Test",
                    descriptionTemplate="Test",
                    caseType=CaseType.CONSUMER
                )
            ),
            user_id=test_user["user"].id
        )
    )

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.delete(f"/templates/{template.id}", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] is True
    assert data["id"] == template.id

def test_delete_system_template_forbidden(client, test_user, db_session):
    """Test that system templates cannot be deleted."""
    seeder = TemplateSeeder(db=db_session)
    seeder.seed_all()

    from backend.models.template import CaseTemplate
    system_template = db_session.query(CaseTemplate).filter(
        CaseTemplate.is_system_template == 1
    ).first()

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.delete(f"/templates/{system_template.id}", headers=headers)

    assert response.status_code in [403, 404]

# ===== TEST: APPLY TEMPLATE =====

def test_apply_template_success(client, test_user, db_session):
    """Test applying template to create case with variable substitution."""
    # Create template
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields, TimelineMilestone
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="Apply Test",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="[Client] vs [Defendant]",
                    descriptionTemplate="Case about [matter]",
                    caseType=CaseType.CONSUMER
                ),
                timelineMilestones=[
                    TimelineMilestone(
                        title="File claim",
                        description="Submit to court",
                        daysFromStart=7,
                        category="filing"
                    )
                ]
            ),
            user_id=test_user["user"].id
        )
    )

    # Apply template
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "variables": {
            "Client": "John Doe",
            "Defendant": "Acme Corp",
            "matter": "breach of contract"
        }
    }

    response = client.post(f"/templates/{template.id}/apply", json=payload, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["case"]["title"] == "John Doe vs Acme Corp"
    assert "breach of contract" in data["case"]["description"]
    assert len(data["appliedMilestones"]) == 1
    assert data["templateId"] == template.id

# ===== TEST: SEED TEMPLATES =====

def test_seed_templates_success(client, test_user, db_session):
    """Test seeding system templates."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    response = client.post("/templates/seed", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["total_templates"] == 8
    assert data["stats"]["seeded"] + data["stats"]["skipped"] == 8

def test_seed_templates_idempotent(client, test_user, db_session):
    """Test that seeding is idempotent (no duplicates)."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}

    # First seed
    response1 = client.post("/templates/seed", headers=headers)
    assert response1.status_code == 200
    data1 = response1.json()

    # Second seed (should skip all)
    response2 = client.post("/templates/seed", headers=headers)
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["stats"]["skipped"] == 8
    assert data2["stats"]["seeded"] == 0

# ===== TEST: AUDIT LOGGING =====

def test_audit_logging_create_template(client, test_user, db_session):
    """Test that template creation is audited."""
    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "name": "Audit Test",
        "category": "civil",
        "templateFields": {
            "titleTemplate": "Test",
            "descriptionTemplate": "Test",
            "caseType": "consumer"
        }
    }

    response = client.post("/templates", json=payload, headers=headers)
    assert response.status_code == 201
    template_id = response.json()["id"]

    # Check audit log
    audit_logger = AuditLogger(db=db_session)
    logs = audit_logger.query(
        resource_type="template",
        resource_id=str(template_id),
        event_type="template.create"
    )

    assert len(logs) > 0
    assert logs[0]["action"] == "create"
    assert logs[0]["success"] is True

# ===== TEST: VARIABLE SUBSTITUTION =====

def test_variable_substitution_edge_cases(client, test_user, db_session):
    """Test variable substitution with edge cases."""
    service = TemplateService(db=db_session)
    from backend.services.template_service import CreateTemplateInput, TemplateFields
    from backend.models.template import TemplateCategory
    from backend.models.case import CaseType

    template = db_session.exec(
        service.create_template(
            input_data=CreateTemplateInput(
                name="Edge Case Test",
                category=TemplateCategory.CIVIL,
                templateFields=TemplateFields(
                    titleTemplate="[Var1] and [Var2] and [MissingVar]",
                    descriptionTemplate="[Var1] appears twice [Var1]",
                    caseType=CaseType.CONSUMER
                )
            ),
            user_id=test_user["user"].id
        )
    )

    headers = {"Authorization": f"Bearer {test_user['session_id']}"}
    payload = {
        "variables": {
            "Var1": "Value1",
            "Var2": "Value2"
            # MissingVar not provided - should remain as [MissingVar]
        }
    }

    response = client.post(f"/templates/{template.id}/apply", json=payload, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert "Value1" in data["case"]["title"]
    assert "Value2" in data["case"]["title"]
    assert "[MissingVar]" in data["case"]["title"]  # Should remain unchanged
    assert data["case"]["description"].count("Value1") == 2  # Appears twice

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
