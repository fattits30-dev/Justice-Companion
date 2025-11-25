"""
Test suite for CaseRepository.
Verifies encryption, decryption, CRUD operations, and backward compatibility.
"""

import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.case import Case, CaseStatus, CaseType
from backend.repositories.case_repository import CaseRepository
from backend.services.case_service import (

    CreateCaseInput,
    UpdateCaseInput
)
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def encryption_service():
    """Create encryption service with test key."""
    test_key = EncryptionService.generate_key()
    return EncryptionService(test_key)

@pytest.fixture
def audit_logger(db_session):
    """Create audit logger."""
    return AuditLogger(db_session)

@pytest.fixture
def case_repository(db_session, encryption_service, audit_logger):
    """Create case repository."""
    return CaseRepository(db_session, encryption_service, audit_logger)

def test_create_case_with_encryption(case_repository):
    """Test creating a case with encrypted description."""
    input_data = CreateCaseInput(
        title="Employment Dispute",
        description="Wrongful termination case details",
        case_type="employment",
        user_id=1
    )

    case = case_repository.create(input_data)

    assert case.id is not None
    assert case.title == "Employment Dispute"
    assert case.description == "Wrongful termination case details"  # Decrypted
    assert case.case_type == CaseType.employment
    assert case.status == CaseStatus.active
    assert case.user_id == 1

def test_create_case_encrypts_description_in_database(case_repository, db_session):
    """Test that description is encrypted in database."""
    input_data = CreateCaseInput(
        title="Test Case",
        description="Sensitive information",
        case_type="employment",
        user_id=1
    )

    case = case_repository.create(input_data)

    # Query database directly to verify encryption
    db_case = db_session.query(Case).filter(Case.id == case.id).first()

    # Description in database should be encrypted JSON
    assert db_case.description is not None
    encrypted_dict = json.loads(db_case.description)
    assert "algorithm" in encrypted_dict
    assert "ciphertext" in encrypted_dict
    assert "iv" in encrypted_dict
    assert encrypted_dict["algorithm"] == "aes-256-gcm"

def test_find_by_id_decrypts_description(case_repository):
    """Test finding case by ID decrypts description."""
    input_data = CreateCaseInput(
        title="Test Case",
        description="Secret data",
        case_type="employment",
        user_id=1
    )

    created_case = case_repository.create(input_data)
    found_case = case_repository.find_by_id(created_case.id)

    assert found_case is not None
    assert found_case.description == "Secret data"  # Decrypted

def test_find_by_user_id(case_repository):
    """Test finding all cases for a user."""
    # Create multiple cases
    for i in range(3):
        input_data = CreateCaseInput(
            title=f"Case {i+1}",
            description=f"Description {i+1}",
            case_type="employment",
            user_id=1
        )
        case_repository.create(input_data)

    cases = case_repository.find_by_user_id(1)
    assert len(cases) == 3
    assert all(case.description is not None for case in cases)

def test_find_all_with_status_filter(case_repository):
    """Test finding all cases with status filter."""
    # Create cases with different statuses
    input1 = CreateCaseInput(title="Active Case", description="Active", case_type="employment", user_id=1)
    case1 = case_repository.create(input1)

    input2 = CreateCaseInput(title="Pending Case", description="Pending", case_type="employment", user_id=1)
    case2 = case_repository.create(input2)
    case_repository.update(case2.id, UpdateCaseInput(status="pending"))

    # Filter by active status
    active_cases = case_repository.find_all(status="active")
    assert len(active_cases) >= 1
    assert all(case.status == CaseStatus.active for case in active_cases)

def test_update_case(case_repository):
    """Test updating a case."""
    input_data = CreateCaseInput(
        title="Original Title",
        description="Original Description",
        case_type="employment",
        user_id=1
    )
    case = case_repository.create(input_data)

    # Update title and description
    update_input = UpdateCaseInput(
        title="Updated Title",
        description="Updated Description"
    )
    updated_case = case_repository.update(case.id, update_input)

    assert updated_case is not None
    assert updated_case.title == "Updated Title"
    assert updated_case.description == "Updated Description"

def test_update_case_encrypts_new_description(case_repository, db_session):
    """Test that updated description is encrypted in database."""
    input_data = CreateCaseInput(
        title="Test Case",
        description="Original",
        case_type="employment",
        user_id=1
    )
    case = case_repository.create(input_data)

    # Update description
    update_input = UpdateCaseInput(description="New Secret Data")
    case_repository.update(case.id, update_input)

    # Query database directly
    db_case = db_session.query(Case).filter(Case.id == case.id).first()
    encrypted_dict = json.loads(db_case.description)
    assert "ciphertext" in encrypted_dict

def test_delete_case(case_repository):
    """Test deleting a case."""
    input_data = CreateCaseInput(
        title="To Delete",
        description="Will be deleted",
        case_type="employment",
        user_id=1
    )
    case = case_repository.create(input_data)

    # Delete case
    success = case_repository.delete(case.id)
    assert success is True

    # Verify case is gone
    found_case = case_repository.find_by_id(case.id)
    assert found_case is None

def test_close_case(case_repository):
    """Test closing a case."""
    input_data = CreateCaseInput(
        title="To Close",
        description="Will be closed",
        case_type="employment",
        user_id=1
    )
    case = case_repository.create(input_data)

    # Close case
    closed_case = case_repository.close(case.id)
    assert closed_case is not None
    assert closed_case.status == CaseStatus.closed

def test_count_by_status(case_repository):
    """Test counting cases by status."""
    # Create cases with different statuses
    input1 = CreateCaseInput(title="Active 1", description="A", case_type="employment", user_id=1)
    case_repository.create(input1)

    input2 = CreateCaseInput(title="Active 2", description="B", case_type="employment", user_id=1)
    case_repository.create(input2)

    input3 = CreateCaseInput(title="Closed", description="C", case_type="employment", user_id=1)
    case3 = case_repository.create(input3)
    case_repository.close(case3.id)

    counts = case_repository.count_by_status()
    assert counts["active"] >= 2
    assert counts["closed"] >= 1

def test_get_statistics(case_repository):
    """Test getting case statistics."""
    # Create some cases
    for i in range(5):
        input_data = CreateCaseInput(
            title=f"Case {i+1}",
            description=f"Desc {i+1}",
            case_type="employment",
            user_id=1
        )
        case_repository.create(input_data)

    stats = case_repository.get_statistics()
    assert "totalCases" in stats
    assert "statusCounts" in stats
    assert stats["totalCases"] >= 5

def test_search_cases_by_title(case_repository):
    """Test searching cases by title."""
    input_data = CreateCaseInput(
        title="Unique Employment Case",
        description="Test",
        case_type="employment",
        user_id=1
    )
    case_repository.create(input_data)

    results = case_repository.search_cases(user_id=1, query="Unique Employment")
    assert len(results) >= 1
    assert any("Unique Employment" in case.title for case in results)

def test_backward_compatibility_with_plaintext(case_repository, db_session):
    """Test backward compatibility with legacy plaintext descriptions."""
    # Manually insert case with plaintext description (legacy data)
    legacy_case = Case(
        title="Legacy Case",
        description="Plain text description",  # Not encrypted
        case_type=CaseType.employment,
        status=CaseStatus.active,
        user_id=1
    )
    db_session.add(legacy_case)
    db_session.commit()
    db_session.refresh(legacy_case)

    # Repository should handle plaintext gracefully
    found_case = case_repository.find_by_id(legacy_case.id)
    assert found_case is not None
    assert found_case.description == "Plain text description"

def test_batch_decryption_in_find_all(case_repository):
    """Test batch decryption performance optimization in find_all."""
    # Create multiple cases
    for i in range(10):
        input_data = CreateCaseInput(
            title=f"Case {i+1}",
            description=f"Description {i+1}",
            case_type="employment",
            user_id=1
        )
        case_repository.create(input_data)

    # find_all should use batch decryption
    cases = case_repository.find_all()
    assert len(cases) >= 10
    assert all(case.description is not None for case in cases)

def test_create_case_without_description(case_repository):
    """Test creating a case without description."""
    input_data = CreateCaseInput(
        title="No Description Case",
        description=None,
        case_type="employment",
        user_id=1
    )

    case = case_repository.create(input_data)
    assert case.id is not None
    assert case.description is None

def test_encryption_service_not_configured_error(db_session):
    """Test that repository raises error if encryption service is not configured."""
    repository = CaseRepository(db_session, None)  # No encryption service

    input_data = CreateCaseInput(
        title="Test",
        description="Should fail",
        case_type="employment",
        user_id=1
    )

    with pytest.raises(RuntimeError, match="EncryptionService not configured"):
        repository.create(input_data)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
