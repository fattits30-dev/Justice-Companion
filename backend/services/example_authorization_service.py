"""
Authorization Service Usage Examples
Comprehensive examples for all AuthorizationService methods.

Run this file to see working examples:
    python backend/services/example_authorization_service.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.services.authorization_service import (
    AuthorizationService,
    PermissionCheckResult,
    Permission,
    Role
)


def setup_test_database():
    """Create in-memory database with RBAC schema and seed data."""
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
            PRIMARY KEY (role_id, permission_id)
        )
    """))

    db.execute(text("""
        CREATE TABLE user_roles (
            user_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER,
            PRIMARY KEY (user_id, role_id)
        )
    """))

    # Seed data
    db.execute(text("""
        INSERT INTO roles (id, name, display_name, description, is_system_role)
        VALUES
            (1, 'admin', 'Administrator', 'Full system access', 1),
            (2, 'user', 'Standard User', 'Standard user access', 1),
            (3, 'viewer', 'Viewer', 'Read-only access', 1)
    """))

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
            (8, 'users.delete', 'users', 'delete', 'Delete users'),
            (9, 'export.data', 'export', 'execute', 'Export data')
    """))

    # Assign permissions to roles
    db.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES
            (1, 1), (1, 2), (1, 3), (1, 4),
            (1, 5), (1, 6), (1, 7), (1, 8), (1, 9),
            (2, 1), (2, 2), (2, 3), (2, 4), (2, 9),
            (3, 2), (3, 6)
    """))

    # Assign roles to users
    db.execute(text("""
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES
            (1, 1, NULL),  -- User 1 is admin
            (2, 2, 1),     -- User 2 is standard user
            (3, 3, 1)      -- User 3 is viewer
    """))

    db.commit()
    return db


async def example_1_single_permission_check():
    """Example 1: Check if user has a single permission."""
    print("\n=== Example 1: Single Permission Check ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Check if admin can create cases
    result = await auth_service.has_permission(user_id=1, permission_name="cases.create")
    print(f"Admin has cases.create: {result.allowed}")

    # Check if viewer can create cases
    result = await auth_service.has_permission(user_id=3, permission_name="cases.create")
    print(f"Viewer has cases.create: {result.allowed}")
    if not result.allowed:
        print(f"Reason: {result.reason}")

    db.close()


async def example_2_multiple_permissions_and():
    """Example 2: Check if user has ALL permissions (AND logic)."""
    print("\n=== Example 2: Multiple Permissions (AND Logic) ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Admin should have all case permissions
    result = await auth_service.has_all_permissions(
        user_id=1,
        permission_names=["cases.create", "cases.read", "cases.update", "cases.delete"]
    )
    print(f"Admin has all case permissions: {result.allowed}")

    # Standard user has case permissions but not user management
    result = await auth_service.has_all_permissions(
        user_id=2,
        permission_names=["cases.create", "users.create"]
    )
    print(f"Standard user has cases + users permissions: {result.allowed}")
    if not result.allowed:
        print(f"Reason: {result.reason}")

    db.close()


async def example_3_multiple_permissions_or():
    """Example 3: Check if user has ANY permission (OR logic)."""
    print("\n=== Example 3: Multiple Permissions (OR Logic) ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Viewer can read cases OR users (has cases.read)
    result = await auth_service.has_any_permission(
        user_id=3,
        permission_names=["cases.read", "users.read"]
    )
    print(f"Viewer has any read permission: {result.allowed}")

    # Viewer cannot create anything
    result = await auth_service.has_any_permission(
        user_id=3,
        permission_names=["cases.create", "users.create", "cases.delete"]
    )
    print(f"Viewer has any create/delete permission: {result.allowed}")
    if not result.allowed:
        print(f"Reason: {result.reason}")

    db.close()


async def example_4_get_user_permissions():
    """Example 4: Get all permissions for a user."""
    print("\n=== Example 4: Get User Permissions ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Get admin permissions
    permissions = await auth_service.get_user_permissions(user_id=1)
    print(f"\nAdmin permissions ({len(permissions)} total):")
    for perm in permissions:
        print(f"  - {perm.name}: {perm.description}")

    # Get viewer permissions
    permissions = await auth_service.get_user_permissions(user_id=3)
    print(f"\nViewer permissions ({len(permissions)} total):")
    for perm in permissions:
        print(f"  - {perm.name}: {perm.description}")

    db.close()


async def example_5_get_user_roles():
    """Example 5: Get all roles for a user with permissions."""
    print("\n=== Example 5: Get User Roles ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Get admin roles
    roles = await auth_service.get_user_roles(user_id=1)
    print(f"\nUser 1 roles ({len(roles)} total):")
    for role in roles:
        print(f"  Role: {role.display_name} ({role.name})")
        print(f"    System Role: {role.is_system_role}")
        print(f"    Permissions: {len(role.permissions)}")
        for perm in role.permissions[:3]:  # Show first 3
            print(f"      - {perm.name}")
        if len(role.permissions) > 3:
            print(f"      ... and {len(role.permissions) - 3} more")

    db.close()


async def example_6_role_check():
    """Example 6: Check if user has a specific role."""
    print("\n=== Example 6: Role Check ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Check admin role
    is_admin = await auth_service.has_role(user_id=1, role_name="admin")
    print(f"User 1 is admin: {is_admin}")

    is_admin = await auth_service.has_role(user_id=2, role_name="admin")
    print(f"User 2 is admin: {is_admin}")

    # Check viewer role
    is_viewer = await auth_service.has_role(user_id=3, role_name="viewer")
    print(f"User 3 is viewer: {is_viewer}")

    db.close()


async def example_7_assign_role():
    """Example 7: Assign a role to a user."""
    print("\n=== Example 7: Assign Role ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # User 4 starts with no roles
    roles = await auth_service.get_user_roles(user_id=4)
    print(f"User 4 roles before assignment: {len(roles)}")

    # Assign standard user role
    await auth_service.assign_role(
        user_id=4,
        role_id=2,  # Standard user role
        assigned_by=1  # Assigned by admin
    )
    print("Assigned 'user' role to User 4")

    # Verify assignment
    roles = await auth_service.get_user_roles(user_id=4)
    print(f"User 4 roles after assignment: {len(roles)}")
    for role in roles:
        print(f"  - {role.name}: {role.display_name}")

    # Check permissions
    has_perm = await auth_service.has_permission(user_id=4, permission_name="cases.create")
    print(f"User 4 can now create cases: {has_perm.allowed}")

    db.close()


async def example_8_remove_role():
    """Example 8: Remove a role from a user."""
    print("\n=== Example 8: Remove Role ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # User 2 is standard user
    has_role = await auth_service.has_role(user_id=2, role_name="user")
    print(f"User 2 has 'user' role before removal: {has_role}")

    # Remove role
    await auth_service.remove_role(user_id=2, role_id=2)
    print("Removed 'user' role from User 2")

    # Verify removal
    has_role = await auth_service.has_role(user_id=2, role_name="user")
    print(f"User 2 has 'user' role after removal: {has_role}")

    # Check permissions (should be gone)
    has_perm = await auth_service.has_permission(user_id=2, permission_name="cases.create")
    print(f"User 2 can still create cases: {has_perm.allowed}")

    db.close()


async def example_9_get_all_roles():
    """Example 9: Get all available roles in the system."""
    print("\n=== Example 9: Get All Roles ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    roles = await auth_service.get_all_roles()
    print(f"\nAll system roles ({len(roles)} total):")

    for role in roles:
        print(f"\n  {role.display_name} ({role.name})")
        print(f"    Description: {role.description}")
        print(f"    System Role: {role.is_system_role}")
        print(f"    Permissions: {len(role.permissions)}")
        for perm in role.permissions[:3]:  # Show first 3
            print(f"      - {perm.name}")
        if len(role.permissions) > 3:
            print(f"      ... and {len(role.permissions) - 3} more")

    db.close()


async def example_10_require_permission_guard():
    """Example 10: Use require_permission as API route guard."""
    print("\n=== Example 10: Require Permission Guard ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    from fastapi import HTTPException

    # Simulate API route that requires permission
    async def create_case_endpoint(user_id: int):
        try:
            # Guard: Require permission
            await auth_service.require_permission(
                user_id=user_id,
                permission_name="cases.create"
            )
            return "Case created successfully!"
        except HTTPException as e:
            return f"Error {e.status_code}: {e.detail}"

    # Admin can create cases
    result = await create_case_endpoint(user_id=1)
    print(f"Admin creates case: {result}")

    # Viewer cannot create cases
    result = await create_case_endpoint(user_id=3)
    print(f"Viewer creates case: {result}")

    db.close()


async def example_11_require_role_guard():
    """Example 11: Use require_role as API route guard."""
    print("\n=== Example 11: Require Role Guard ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    from fastapi import HTTPException

    # Simulate admin-only endpoint
    async def admin_endpoint(user_id: int):
        try:
            # Guard: Require admin role
            await auth_service.require_role(
                user_id=user_id,
                role_name="admin"
            )
            return "Admin operation completed!"
        except HTTPException as e:
            return f"Error {e.status_code}: {e.detail}"

    # Admin can access
    result = await admin_endpoint(user_id=1)
    print(f"Admin accesses admin endpoint: {result}")

    # Standard user cannot access
    result = await admin_endpoint(user_id=2)
    print(f"Standard user accesses admin endpoint: {result}")

    db.close()


async def example_12_complex_permission_scenario():
    """Example 12: Complex real-world permission scenario."""
    print("\n=== Example 12: Complex Permission Scenario ===")

    db = setup_test_database()
    auth_service = AuthorizationService(db=db)

    # Scenario: User wants to export case data
    # Requirements:
    #   - Must have cases.read permission
    #   - Must have export.data permission
    #   - OR must be admin

    async def can_export_cases(user_id: int) -> bool:
        # Check if user is admin (has all permissions)
        is_admin = await auth_service.has_role(user_id, "admin")
        if is_admin:
            print(f"  User {user_id} is admin - export allowed")
            return True

        # Check if user has required permissions
        result = await auth_service.has_all_permissions(
            user_id,
            ["cases.read", "export.data"]
        )

        if result.allowed:
            print(f"  User {user_id} has required permissions - export allowed")
        else:
            print(f"  User {user_id} missing permissions - export denied")
            print(f"    Reason: {result.reason}")

        return result.allowed

    # Test different users
    print("\nChecking export permissions:")
    await can_export_cases(user_id=1)  # Admin
    await can_export_cases(user_id=2)  # Standard user
    await can_export_cases(user_id=3)  # Viewer

    db.close()


async def main():
    """Run all examples."""
    print("=" * 60)
    print("Authorization Service Usage Examples")
    print("=" * 60)

    await example_1_single_permission_check()
    await example_2_multiple_permissions_and()
    await example_3_multiple_permissions_or()
    await example_4_get_user_permissions()
    await example_5_get_user_roles()
    await example_6_role_check()
    await example_7_assign_role()
    await example_8_remove_role()
    await example_9_get_all_roles()
    await example_10_require_permission_guard()
    await example_11_require_role_guard()
    await example_12_complex_permission_scenario()

    print("\n" + "=" * 60)
    print("All examples completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
