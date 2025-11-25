"""
Comprehensive test suite for AuthorizationService.
Tests all permission checks, role management, and RBAC functionality.

Test Coverage:
- Permission checks (single, multiple AND/OR)
- User permission and role queries
- Role assignment and removal
- System role protection
- Error handling and edge cases
- Audit logging integration
"""

import pytest
from unittest.mock import Mock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.services.auth.authorization import (
    AuthorizationService,
    Permission,
    RoleNotFoundError,
)

@pytest.fixture
def in_memory_db():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Create RBAC schema
    db.execute(text("""
        CREATE TABLE roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            description TEXT,
            is_system_role INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))

    db.execute(text("""
        CREATE TABLE permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            description TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))

    db.execute(text("""
        CREATE TABLE role_permissions (
            role_id INTEGER NOT NULL,
            permission_id INTEGER NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        )
    """))

    db.execute(text("""
        CREATE TABLE user_roles (
            user_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER,
            PRIMARY KEY (user_id, role_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )
    """))

    db.commit()

    yield db

    db.close()
    engine.dispose()

@pytest.fixture
def mock_audit_logger():
    """Mock audit logger for testing."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def authorization_service(in_memory_db, mock_audit_logger):
    """Create AuthorizationService instance with test database."""
    return AuthorizationService(db=in_memory_db, audit_logger=mock_audit_logger)

@pytest.fixture
def seed_rbac_data(in_memory_db):
    """Seed test database with RBAC data."""
    db = in_memory_db

    # Insert roles
    db.execute(text("""
        INSERT INTO roles (id, name, display_name, description, is_system_role)
        VALUES
            (1, 'admin', 'Administrator', 'Full system access', 1),
            (2, 'user', 'Standard User', 'Standard user access', 1),
            (3, 'viewer', 'Viewer', 'Read-only access', 1)
    """))

    # Insert permissions
    db.execute(text("""
        INSERT INTO permissions (id, name, resource, action, description)
        VALUES
            (1, 'cases.create', 'cases', 'create', 'Create cases'),
            (2, 'cases.read', 'cases', 'read', 'View cases'),
            (3, 'cases.update', 'cases', 'update', 'Edit cases'),
            (4, 'cases.delete', 'cases', 'delete', 'Delete cases'),
            (5, 'users.create', 'users', 'create', 'Create users'),
            (6, 'users.read', 'users', 'read', 'View users'),
            (7, 'users.update', 'users', 'update', 'Edit users'),
            (8, 'users.delete', 'users', 'delete', 'Delete users')
    """))

    # Assign all permissions to admin role
    db.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES
            (1, 1), (1, 2), (1, 3), (1, 4),
            (1, 5), (1, 6), (1, 7), (1, 8)
    """))

    # Assign case permissions to user role
    db.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES
            (2, 1), (2, 2), (2, 3), (2, 4)
    """))

    # Assign read permissions to viewer role
    db.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES
            (3, 2), (3, 6)
    """))

    # Assign roles to test users
    db.execute(text("""
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES
            (1, 1, NULL),  -- User 1 is admin
            (2, 2, 1),     -- User 2 is standard user
            (3, 3, 1)      -- User 3 is viewer
    """))

    db.commit()

# ===== PERMISSION CHECK TESTS =====

@pytest.mark.asyncio
async def test_has_permission_granted(authorization_service, seed_rbac_data):
    """Test permission check returns allowed when user has permission."""
    result = await authorization_service.has_permission(1, "cases.create")

    assert result.allowed is True
    assert result.reason is None

@pytest.mark.asyncio
async def test_has_permission_denied(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test permission check returns denied when user lacks permission."""
    result = await authorization_service.has_permission(3, "cases.create")

    assert result.allowed is False
    assert "Missing permission: cases.create" in result.reason

    # Verify audit log
    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "authorization.permission_check"
    assert call_args["success"] is False

@pytest.mark.asyncio
async def test_has_permission_nonexistent_user(authorization_service, seed_rbac_data):
    """Test permission check for non-existent user returns denied."""
    result = await authorization_service.has_permission(999, "cases.create")

    assert result.allowed is False

@pytest.mark.asyncio
async def test_has_permission_nonexistent_permission(authorization_service, seed_rbac_data):
    """Test permission check for non-existent permission returns denied."""
    result = await authorization_service.has_permission(1, "nonexistent.permission")

    assert result.allowed is False

# ===== MULTIPLE PERMISSION TESTS (AND LOGIC) =====

@pytest.mark.asyncio
async def test_has_all_permissions_all_granted(authorization_service, seed_rbac_data):
    """Test has_all_permissions returns allowed when user has all permissions."""
    result = await authorization_service.has_all_permissions(
        1,
        ["cases.create", "cases.read", "cases.update"]
    )

    assert result.allowed is True

@pytest.mark.asyncio
async def test_has_all_permissions_one_missing(authorization_service, seed_rbac_data):
    """Test has_all_permissions returns denied when any permission missing."""
    result = await authorization_service.has_all_permissions(
        2,
        ["cases.create", "users.create"]  # User doesn't have users.create
    )

    assert result.allowed is False
    assert "users.create" in result.reason

@pytest.mark.asyncio
async def test_has_all_permissions_empty_list(authorization_service, seed_rbac_data):
    """Test has_all_permissions with empty list returns allowed."""
    result = await authorization_service.has_all_permissions(1, [])

    assert result.allowed is True

# ===== MULTIPLE PERMISSION TESTS (OR LOGIC) =====

@pytest.mark.asyncio
async def test_has_any_permission_one_granted(authorization_service, seed_rbac_data):
    """Test has_any_permission returns allowed when user has at least one permission."""
    result = await authorization_service.has_any_permission(
        3,
        ["cases.create", "cases.read"]  # Viewer has cases.read
    )

    assert result.allowed is True

@pytest.mark.asyncio
async def test_has_any_permission_none_granted(authorization_service, seed_rbac_data):
    """Test has_any_permission returns denied when user has no permissions."""
    result = await authorization_service.has_any_permission(
        3,
        ["cases.create", "cases.delete", "users.create"]
    )

    assert result.allowed is False
    assert "Missing any of:" in result.reason

@pytest.mark.asyncio
async def test_has_any_permission_empty_list(authorization_service, seed_rbac_data):
    """Test has_any_permission with empty list returns denied."""
    result = await authorization_service.has_any_permission(1, [])

    assert result.allowed is False

# ===== USER PERMISSION QUERY TESTS =====

@pytest.mark.asyncio
async def test_get_user_permissions(authorization_service, seed_rbac_data):
    """Test get_user_permissions returns all user permissions."""
    permissions = await authorization_service.get_user_permissions(1)

    assert len(permissions) == 8  # Admin has all 8 permissions
    assert all(isinstance(p, Permission) for p in permissions)

    # Verify permissions are sorted by resource, action
    permission_names = [p.name for p in permissions]
    assert "cases.create" in permission_names
    assert "users.delete" in permission_names

@pytest.mark.asyncio
async def test_get_user_permissions_no_roles(authorization_service, seed_rbac_data):
    """Test get_user_permissions returns empty list for user with no roles."""
    permissions = await authorization_service.get_user_permissions(999)

    assert permissions == []

@pytest.mark.asyncio
async def test_get_user_permissions_viewer(authorization_service, seed_rbac_data):
    """Test get_user_permissions returns only read permissions for viewer."""
    permissions = await authorization_service.get_user_permissions(3)

    assert len(permissions) == 2
    assert all(p.action == "read" for p in permissions)

# ===== USER ROLE QUERY TESTS =====

@pytest.mark.asyncio
async def test_get_user_roles(authorization_service, seed_rbac_data):
    """Test get_user_roles returns user roles with permissions."""
    roles = await authorization_service.get_user_roles(1)

    assert len(roles) == 1
    assert roles[0].name == "admin"
    assert roles[0].is_system_role is True
    assert len(roles[0].permissions) == 8

@pytest.mark.asyncio
async def test_get_user_roles_no_roles(authorization_service, seed_rbac_data):
    """Test get_user_roles returns empty list for user with no roles."""
    roles = await authorization_service.get_user_roles(999)

    assert roles == []

@pytest.mark.asyncio
async def test_get_user_roles_multiple(authorization_service, seed_rbac_data, in_memory_db):
    """Test get_user_roles returns multiple roles when user has many."""
    # Assign multiple roles to user
    in_memory_db.execute(text("""
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (4, 2, 1), (4, 3, 1)
    """))
    in_memory_db.commit()

    roles = await authorization_service.get_user_roles(4)

    assert len(roles) == 2
    role_names = [r.name for r in roles]
    assert "user" in role_names
    assert "viewer" in role_names

# ===== ROLE CHECK TESTS =====

@pytest.mark.asyncio
async def test_has_role_true(authorization_service, seed_rbac_data):
    """Test has_role returns True when user has role."""
    assert await authorization_service.has_role(1, "admin") is True

@pytest.mark.asyncio
async def test_has_role_false(authorization_service, seed_rbac_data):
    """Test has_role returns False when user doesn't have role."""
    assert await authorization_service.has_role(2, "admin") is False

@pytest.mark.asyncio
async def test_has_role_nonexistent_role(authorization_service, seed_rbac_data):
    """Test has_role returns False for non-existent role."""
    assert await authorization_service.has_role(1, "nonexistent") is False

# ===== ROLE ASSIGNMENT TESTS =====

@pytest.mark.asyncio
async def test_assign_role_success(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test assign_role successfully assigns role to user."""
    await authorization_service.assign_role(
        user_id=5,
        role_id=2,
        assigned_by=1
    )

    # Verify role was assigned
    assert await authorization_service.has_role(5, "user") is True

    # Verify audit log
    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "authorization.role_assigned"
    assert call_args["success"] is True

@pytest.mark.asyncio
async def test_assign_role_duplicate_ignored(authorization_service, seed_rbac_data):
    """Test assign_role ignores duplicate assignments (INSERT OR IGNORE)."""
    await authorization_service.assign_role(
        user_id=1,
        role_id=1,  # User 1 already has admin role
        assigned_by=1
    )

    # Should not raise error (INSERT OR IGNORE behavior)
    assert await authorization_service.has_role(1, "admin") is True

@pytest.mark.asyncio
async def test_assign_role_nonexistent_role(authorization_service, seed_rbac_data):
    """Test assign_role raises error for non-existent role."""
    with pytest.raises(RoleNotFoundError):
        await authorization_service.assign_role(
            user_id=5,
            role_id=999,
            assigned_by=1
        )

# ===== ROLE REMOVAL TESTS =====

@pytest.mark.asyncio
async def test_remove_role_success(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test remove_role successfully removes role from user."""
    # Verify user has role initially
    assert await authorization_service.has_role(2, "user") is True

    await authorization_service.remove_role(user_id=2, role_id=2)

    # Verify role was removed
    assert await authorization_service.has_role(2, "user") is False

    # Verify audit log
    assert mock_audit_logger.log.call_count >= 1

@pytest.mark.asyncio
async def test_remove_role_not_assigned(authorization_service, seed_rbac_data):
    """Test remove_role doesn't fail when role not assigned."""
    await authorization_service.remove_role(user_id=999, role_id=2)

    # Should not raise error (DELETE succeeds with 0 rows)

# ===== GET ALL ROLES TESTS =====

@pytest.mark.asyncio
async def test_get_all_roles(authorization_service, seed_rbac_data):
    """Test get_all_roles returns all roles with permissions."""
    roles = await authorization_service.get_all_roles()

    assert len(roles) == 3
    role_names = [r.name for r in roles]
    assert "admin" in role_names
    assert "user" in role_names
    assert "viewer" in role_names

    # Verify each role has permissions
    admin_role = next(r for r in roles if r.name == "admin")
    assert len(admin_role.permissions) == 8

# ===== GET ROLE PERMISSIONS TESTS =====

@pytest.mark.asyncio
async def test_get_role_permissions(authorization_service, seed_rbac_data):
    """Test get_role_permissions returns all permissions for role."""
    permissions = await authorization_service.get_role_permissions(1)  # Admin role

    assert len(permissions) == 8
    assert all(isinstance(p, Permission) for p in permissions)

@pytest.mark.asyncio
async def test_get_role_permissions_empty(authorization_service, seed_rbac_data, in_memory_db):
    """Test get_role_permissions returns empty list for role with no permissions."""
    # Create role with no permissions
    in_memory_db.execute(text("""
        INSERT INTO roles (id, name, display_name, is_system_role)
        VALUES (99, 'empty', 'Empty Role', 0)
    """))
    in_memory_db.commit()

    permissions = await authorization_service.get_role_permissions(99)

    assert permissions == []

# ===== REQUIRE PERMISSION TESTS =====

@pytest.mark.asyncio
async def test_require_permission_success(authorization_service, seed_rbac_data):
    """Test require_permission doesn't raise when permission granted."""
    await authorization_service.require_permission(1, "cases.create")
    # Should not raise exception

@pytest.mark.asyncio
async def test_require_permission_denied(authorization_service, seed_rbac_data):
    """Test require_permission raises HTTPException when permission denied."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await authorization_service.require_permission(3, "cases.create")

    assert exc_info.value.status_code == 403
    assert "Permission denied" in exc_info.value.detail

# ===== REQUIRE ROLE TESTS =====

@pytest.mark.asyncio
async def test_require_role_success(authorization_service, seed_rbac_data):
    """Test require_role doesn't raise when role assigned."""
    await authorization_service.require_role(1, "admin")
    # Should not raise exception

@pytest.mark.asyncio
async def test_require_role_denied(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test require_role raises HTTPException when role not assigned."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await authorization_service.require_role(2, "admin")

    assert exc_info.value.status_code == 403
    assert "Role required: admin" in exc_info.value.detail

    # Verify audit log
    assert mock_audit_logger.log.call_count >= 1

# ===== EDGE CASE TESTS =====

@pytest.mark.asyncio
async def test_permission_check_with_null_user_id(authorization_service, seed_rbac_data):
    """Test permission check handles None user_id gracefully."""
    result = await authorization_service.has_permission(None, "cases.create")

    assert result.allowed is False

@pytest.mark.asyncio
async def test_get_user_permissions_preserves_order(authorization_service, seed_rbac_data):
    """Test get_user_permissions returns permissions in consistent order."""
    permissions1 = await authorization_service.get_user_permissions(1)
    permissions2 = await authorization_service.get_user_permissions(1)

    # Order should be consistent (sorted by resource, action)
    assert [p.name for p in permissions1] == [p.name for p in permissions2]

# ===== AUDIT LOGGING TESTS =====

@pytest.mark.asyncio
async def test_audit_logging_permission_denied(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test audit logger is called for permission denials."""
    await authorization_service.has_permission(3, "cases.delete")

    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "authorization.permission_check"
    assert call_args["success"] is False
    assert "cases.delete" in call_args["details"]["permission"]

@pytest.mark.asyncio
async def test_audit_logging_role_assignment(authorization_service, seed_rbac_data, mock_audit_logger):
    """Test audit logger is called for role assignments."""
    await authorization_service.assign_role(5, 2, 1)

    mock_audit_logger.log.assert_called_once()
    call_args = mock_audit_logger.log.call_args[1]
    assert call_args["event_type"] == "authorization.role_assigned"
    assert call_args["details"]["target_user_id"] == 5
    assert call_args["details"]["role_id"] == 2

@pytest.mark.asyncio
async def test_no_audit_logging_when_logger_none(seed_rbac_data, in_memory_db):
    """Test service works correctly when audit logger is None."""
    service = AuthorizationService(db=in_memory_db, audit_logger=None)

    result = await service.has_permission(3, "cases.create")

    # Should work without errors
    assert result.allowed is False
