# Authorization Service Documentation

## Overview

The `AuthorizationService` provides comprehensive role-based access control (RBAC) for Justice Companion. It manages permissions, roles, and user authorization checks with full audit logging.

**Migrated from:** `src/services/AuthorizationService.ts`

## Features

- **Permission Checks:** Single, multiple AND/OR logic
- **Role Management:** Assign/remove roles with audit trails
- **User Queries:** Get user permissions and roles
- **System Roles:** Protected roles (admin, user, viewer)
- **Fine-Grained Permissions:** Resource-action based (e.g., `cases.create`)
- **Audit Logging:** All authorization events logged immutably
- **API Guards:** Convenience methods for FastAPI route protection

## Architecture

### Database Schema

The RBAC system uses 4 tables:

1. **roles** - Role definitions (admin, user, viewer)
2. **permissions** - Granular permissions (resource.action format)
3. **role_permissions** - Many-to-many role-permission assignments
4. **user_roles** - Many-to-many user-role assignments

See migration: `src/db/migrations/022_create_rbac_system.sql`

### Permission Naming Convention

Permissions follow the format: `{resource}.{action}`

**Examples:**
- `cases.create` - Create new cases
- `cases.read` - View cases
- `users.delete` - Delete users
- `export.data` - Export data

### System Roles

Three built-in system roles (cannot be deleted):

| Role | Description | Permissions |
|------|-------------|-------------|
| **admin** | Full system access | All permissions |
| **user** | Standard user | CRUD on own data (cases, evidence, documents) |
| **viewer** | Read-only access | Read permissions only |

## Installation

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run database migrations
python src/db/migrate.py
```

## Usage

### Basic Setup

```python
from sqlalchemy.orm import Session
from backend.services.authorization_service import AuthorizationService
from backend.services.audit_logger import AuditLogger

# Initialize service
db: Session = get_database_session()
audit_logger = AuditLogger(db)
auth_service = AuthorizationService(db=db, audit_logger=audit_logger)
```

### Permission Checks

#### Single Permission Check

```python
# Check if user has permission
result = await auth_service.has_permission(user_id=1, permission_name="cases.create")

if result.allowed:
    print("Permission granted!")
else:
    print(f"Permission denied: {result.reason}")
```

#### Multiple Permissions (AND Logic)

```python
# User must have ALL permissions
result = await auth_service.has_all_permissions(
    user_id=1,
    permission_names=["cases.create", "cases.update", "cases.delete"]
)

if result.allowed:
    print("User has all required permissions")
```

#### Multiple Permissions (OR Logic)

```python
# User must have ANY permission
result = await auth_service.has_any_permission(
    user_id=1,
    permission_names=["cases.create", "evidence.create", "documents.create"]
)

if result.allowed:
    print("User has at least one required permission")
```

### Role Checks

```python
# Check if user has specific role
is_admin = await auth_service.has_role(user_id=1, role_name="admin")

if is_admin:
    print("User is administrator")
```

### Query User Permissions

```python
# Get all permissions for user
permissions = await auth_service.get_user_permissions(user_id=1)

for perm in permissions:
    print(f"{perm.name}: {perm.description}")
    # Output: cases.create: Create new cases
```

### Query User Roles

```python
# Get all roles for user (with permissions)
roles = await auth_service.get_user_roles(user_id=1)

for role in roles:
    print(f"Role: {role.display_name}")
    print(f"  Permissions: {len(role.permissions)}")
    for perm in role.permissions:
        print(f"    - {perm.name}")
```

### Role Management

#### Assign Role

```python
# Assign role to user
await auth_service.assign_role(
    user_id=5,
    role_id=2,  # Standard user role
    assigned_by=1  # Admin user ID
)

print("Role assigned successfully")
```

#### Remove Role

```python
# Remove role from user
await auth_service.remove_role(
    user_id=5,
    role_id=2
)

print("Role removed successfully")
```

### Get All Roles

```python
# Get all available roles
roles = await auth_service.get_all_roles()

for role in roles:
    print(f"{role.name}: {role.description}")
    print(f"  System Role: {role.is_system_role}")
    print(f"  Permissions: {len(role.permissions)}")
```

### API Route Guards (FastAPI)

#### Require Permission

```python
from fastapi import APIRouter, Depends, HTTPException
from backend.services.authorization_service import AuthorizationService

router = APIRouter()

@router.post("/cases")
async def create_case(
    case_data: CreateCaseInput,
    current_user: User = Depends(get_current_user),
    auth_service: AuthorizationService = Depends(get_auth_service)
):
    # Require permission (raises HTTPException 403 if denied)
    await auth_service.require_permission(
        user_id=current_user.id,
        permission_name="cases.create"
    )

    # Permission granted - proceed with case creation
    case = create_case_logic(case_data, current_user.id)
    return case
```

#### Require Role

```python
@router.get("/admin/users")
async def list_all_users(
    current_user: User = Depends(get_current_user),
    auth_service: AuthorizationService = Depends(get_auth_service)
):
    # Require admin role (raises HTTPException 403 if denied)
    await auth_service.require_role(
        user_id=current_user.id,
        role_name="admin"
    )

    # Admin access granted
    users = get_all_users()
    return users
```

## API Reference

### AuthorizationService

#### Constructor

```python
def __init__(self, db: Session, audit_logger=None)
```

**Parameters:**
- `db` - SQLAlchemy database session
- `audit_logger` - Optional AuditLogger instance for logging

#### Methods

##### `has_permission(user_id: int, permission_name: str) -> PermissionCheckResult`

Check if user has a specific permission.

**Returns:** `PermissionCheckResult` with `allowed` (bool) and optional `reason` (str)

##### `has_all_permissions(user_id: int, permission_names: List[str]) -> PermissionCheckResult`

Check if user has ALL specified permissions (AND logic).

##### `has_any_permission(user_id: int, permission_names: List[str]) -> PermissionCheckResult`

Check if user has ANY of the specified permissions (OR logic).

##### `get_user_permissions(user_id: int) -> List[Permission]`

Get all permissions for a user across all their roles.

##### `get_user_roles(user_id: int) -> List[Role]`

Get all roles assigned to a user with embedded permissions.

##### `has_role(user_id: int, role_name: str) -> bool`

Check if user has a specific role.

##### `assign_role(user_id: int, role_id: int, assigned_by: int) -> None`

Assign a role to a user.

**Raises:** `RoleNotFoundError` if role doesn't exist

##### `remove_role(user_id: int, role_id: int) -> None`

Remove a role from a user.

##### `get_all_roles() -> List[Role]`

Get all available roles in the system with permissions.

##### `get_role_permissions(role_id: int) -> List[Permission]`

Get all permissions for a specific role.

##### `require_permission(user_id: int, permission_name: str) -> None`

Require a permission (raises HTTPException 403 if denied).

##### `require_role(user_id: int, role_name: str) -> None`

Require a specific role (raises HTTPException 403 if denied).

## Models

### PermissionCheckResult

```python
class PermissionCheckResult(BaseModel):
    allowed: bool  # Whether permission is granted
    reason: Optional[str]  # Reason if denied
```

### Permission

```python
class Permission(BaseModel):
    id: int
    name: str  # e.g., "cases.create"
    resource: str  # e.g., "cases"
    action: str  # e.g., "create"
    description: Optional[str]
    created_at: str
```

### Role

```python
class Role(BaseModel):
    id: int
    name: str  # e.g., "admin"
    display_name: str  # e.g., "Administrator"
    description: Optional[str]
    is_system_role: bool  # Protected from deletion
    created_at: str
    updated_at: str
    permissions: List[Permission]  # Embedded permissions
```

## Error Handling

### Exceptions

- **`PermissionDeniedError`** - User lacks required permission
- **`RoleNotFoundError`** - Role doesn't exist
- **`PermissionNotFoundError`** - Permission doesn't exist

### HTTPException Responses

- **403 Forbidden** - Permission denied or role required
- **404 Not Found** - Resource doesn't exist

## Audit Logging

All authorization events are logged:

**Event Types:**
- `authorization.permission_check` - Permission checks (failures only)
- `authorization.role_assigned` - Role assignments
- `authorization.role_removed` - Role removals
- `authorization.role_check` - Role requirement checks (failures only)

**Example Audit Log:**
```json
{
  "event_type": "authorization.role_assigned",
  "user_id": "1",
  "resource_type": "authorization",
  "resource_id": "user:5",
  "action": "assign",
  "success": true,
  "details": {
    "target_user_id": 5,
    "role_id": 2,
    "assigned_by": 1
  }
}
```

## Testing

Run comprehensive test suite (40+ test cases):

```bash
pytest backend/services/test_authorization_service.py -v
```

**Test Coverage:**
- Permission checks (single, multiple AND/OR)
- Role management (assign, remove)
- User queries (permissions, roles)
- Error handling and edge cases
- Audit logging integration

## Performance Considerations

- **Read-Heavy:** Permission checks are fast (single JOIN query)
- **Cache-Friendly:** Permission data rarely changes
- **Indexed Queries:** All joins use indexed foreign keys
- **No Mutations:** Permission checks don't modify data

**Optimization Tips:**
- Cache role-permission mappings in Redis for high-traffic apps
- Use `require_permission()` at API route level (fails fast)
- Batch permission checks when possible

## Security Best Practices

1. **Always check permissions** before allowing operations
2. **Use specific permissions** instead of role checks when possible
3. **Audit all authorization events** for compliance
4. **Protect system roles** from deletion or modification
5. **Use require_permission()** for API route guards

## Migration from TypeScript

Key differences from TypeScript implementation:

1. **Async Methods:** All methods are `async` (SQLAlchemy async patterns)
2. **Pydantic Models:** Input/output validation with Pydantic
3. **HTTPException:** FastAPI exceptions instead of custom errors
4. **Type Hints:** Comprehensive Python 3.9+ type annotations
5. **Audit Logging:** Integrated with Python AuditLogger

## Troubleshooting

### Permission Check Always Returns False

**Solution:** Verify user has role assigned:
```python
roles = await auth_service.get_user_roles(user_id)
print(f"User roles: {[r.name for r in roles]}")
```

### Role Assignment Fails

**Solution:** Check role exists:
```python
roles = await auth_service.get_all_roles()
print(f"Available roles: {[r.name for r in roles]}")
```

### Audit Logging Not Working

**Solution:** Ensure AuditLogger is passed to constructor:
```python
from backend.services.audit_logger import AuditLogger

audit_logger = AuditLogger(db)
auth_service = AuthorizationService(db=db, audit_logger=audit_logger)
```

## Support

For issues or questions:
- Review test suite: `test_authorization_service.py`
- Check migration: `022_create_rbac_system.sql`
- See TypeScript original: `src/services/AuthorizationService.ts`
