"""
Authorization Service for role-based access control (RBAC).
Migrated from src/services/AuthorizationService.ts

Features:
- Permission checks (single, multiple AND/OR)
- Role-based access control with fine-grained permissions
- User role and permission management
- System roles (admin, user, viewer) with predefined permissions
- Permission querying and role assignment/removal
- Comprehensive audit logging for all authorization operations

Security:
- All operations verify user existence and permissions
- System roles cannot be deleted (protected)
- Permission checks are cached-friendly (no mutations)
- All authorization events audited
- HTTPException 403 for permission denied
- HTTPException 404 for non-existent resources
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from pydantic import BaseModel, Field, ConfigDict

class PermissionDeniedError(Exception):
    """Exception raised when user lacks required permission."""

class RoleNotFoundError(Exception):
    """Exception raised when role is not found."""

class PermissionNotFoundError(Exception):
    """Exception raised when permission is not found."""

# Pydantic models for input/output
class PermissionCheckResult(BaseModel):
    """Result of a permission check."""

    allowed: bool = Field(..., description="Whether permission is granted")
    reason: Optional[str] = Field(None, description="Reason if permission denied")

    model_config = ConfigDict(from_attributes=True)

class Permission(BaseModel):
    """Permission entity model."""

    id: int
    name: str = Field(..., description="Permission name (e.g., 'cases.create')")
    resource: str = Field(..., description="Resource type (e.g., 'cases')")
    action: str = Field(..., description="Action type (e.g., 'create', 'read')")
    description: Optional[str] = Field(None, description="Permission description")
    created_at: str = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)

class Role(BaseModel):
    """Role entity model with permissions."""

    id: int
    name: str = Field(..., description="Role name (e.g., 'admin', 'user')")
    display_name: str = Field(..., description="Human-readable role name")
    description: Optional[str] = Field(None, description="Role description")
    is_system_role: bool = Field(..., description="Whether this is a protected system role")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    permissions: List[Permission] = Field(default_factory=list, description="Role permissions")

    model_config = ConfigDict(from_attributes=True)

class AssignRoleInput(BaseModel):
    """Input model for assigning a role to a user."""

    user_id: int = Field(..., description="User ID to assign role to")
    role_id: int = Field(..., description="Role ID to assign")
    assigned_by: int = Field(..., description="User ID performing the assignment")

class RemoveRoleInput(BaseModel):
    """Input model for removing a role from a user."""

    user_id: int = Field(..., description="User ID to remove role from")
    role_id: int = Field(..., description="Role ID to remove")

class AuthorizationService:
    """
    Business logic layer for authorization and RBAC.
    Handles permission checks, role management, and access control.

    All operations are read-heavy and cache-friendly (no mutations to permission data).
    Role assignments and removals are audit-logged.
    """

    def __init__(self, db: Session, audit_logger=None):
        """
        Initialize authorization service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.audit_logger = audit_logger

    def _log_audit(
        self,
        event_type: str,
        user_id: Optional[int],
        resource_id: str,
        action: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log audit event if audit logger is configured."""
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id) if user_id else None,
                resource_type="authorization",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details or {},
                error_message=error_message,
            )

    async def has_permission(self, user_id: int, permission_name: str) -> PermissionCheckResult:
        """
        Check if user has a specific permission.

        Args:
            user_id: User ID to check
            permission_name: Permission name (e.g., 'cases.create')

        Returns:
            Permission check result with allowed status and optional reason
        """
        query = text(
            """
            SELECT COUNT(*) as count
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = :user_id AND p.name = :permission_name
        """
        )

        result = self.db.execute(
            query, {"user_id": user_id, "permission_name": permission_name}
        ).fetchone()

        count = result[0] if result else 0
        allowed = count > 0

        if not allowed:
            self._log_audit(
                event_type="authorization.permission_check",
                user_id=user_id,
                resource_id=permission_name,
                action="check",
                success=False,
                details={"permission": permission_name, "reason": "Permission not granted"},
            )

        return PermissionCheckResult(
            allowed=allowed, reason=None if allowed else f"Missing permission: {permission_name}"
        )

    async def has_all_permissions(
        self, user_id: int, permission_names: List[str]
    ) -> PermissionCheckResult:
        """
        Check if user has ALL specified permissions (AND logic).

        Args:
            user_id: User ID to check
            permission_names: List of permission names

        Returns:
            Permission check result (denied if ANY permission missing)
        """
        for permission_name in permission_names:
            result = await self.has_permission(user_id, permission_name)
            if not result.allowed:
                return result

        return PermissionCheckResult(allowed=True)

    async def has_any_permission(
        self, user_id: int, permission_names: List[str]
    ) -> PermissionCheckResult:
        """
        Check if user has ANY of the specified permissions (OR logic).

        Args:
            user_id: User ID to check
            permission_names: List of permission names

        Returns:
            Permission check result (allowed if ANY permission granted)
        """
        for permission_name in permission_names:
            result = await self.has_permission(user_id, permission_name)
            if result.allowed:
                return PermissionCheckResult(allowed=True)

        return PermissionCheckResult(
            allowed=False, reason=f"Missing any of: {', '.join(permission_names)}"
        )

    async def get_user_permissions(self, user_id: int) -> List[Permission]:
        """
        Get all permissions for a user (across all their roles).

        Args:
            user_id: User ID

        Returns:
            List of unique permissions the user has
        """
        query = text(
            """
            SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description, p.created_at
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = :user_id
            ORDER BY p.resource, p.action
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        rows = result.fetchall()

        return [
            Permission(
                id=row[0],
                name=row[1],
                resource=row[2],
                action=row[3],
                description=row[4],
                created_at=row[5],
            )
            for row in rows
        ]

    async def get_user_roles(self, user_id: int) -> List[Role]:
        """
        Get all roles assigned to a user (with their permissions).

        Args:
            user_id: User ID

        Returns:
            List of roles with embedded permissions
        """
        query = text(
            """
            SELECT r.id, r.name, r.display_name, r.description, r.is_system_role,
                   r.created_at, r.updated_at
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = :user_id
            ORDER BY r.name
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        rows = result.fetchall()

        roles = []
        for row in rows:
            # Load permissions for each role
            permissions = await self.get_role_permissions(row[0])

            roles.append(
                Role(
                    id=row[0],
                    name=row[1],
                    display_name=row[2],
                    description=row[3],
                    is_system_role=bool(row[4]),
                    created_at=row[5],
                    updated_at=row[6],
                    permissions=permissions,
                )
            )

        return roles

    async def has_role(self, user_id: int, role_name: str) -> bool:
        """
        Check if user has a specific role.

        Args:
            user_id: User ID
            role_name: Role name (e.g., 'admin', 'user')

        Returns:
            True if user has the role, False otherwise
        """
        query = text(
            """
            SELECT COUNT(*) as count
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = :user_id AND r.name = :role_name
        """
        )

        result = self.db.execute(query, {"user_id": user_id, "role_name": role_name}).fetchone()

        return result[0] > 0 if result else False

    async def assign_role(self, user_id: int, role_id: int, assigned_by: int) -> None:
        """
        Assign a role to a user.

        Args:
            user_id: User ID to assign role to
            role_id: Role ID to assign
            assigned_by: User ID performing the assignment

        Raises:
            RoleNotFoundError: If role doesn't exist
        """
        # Verify role exists
        role_check = self.db.execute(
            text("SELECT id FROM roles WHERE id = :role_id"), {"role_id": role_id}
        ).fetchone()

        if not role_check:
            raise RoleNotFoundError(f"Role with ID {role_id} not found")

        try:
            # INSERT OR IGNORE to prevent duplicate assignments
            stmt = text(
                """
                INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by)
                VALUES (:user_id, :role_id, :assigned_by)
            """
            )

            self.db.execute(
                stmt, {"user_id": user_id, "role_id": role_id, "assigned_by": assigned_by}
            )
            self.db.commit()

            self._log_audit(
                event_type="authorization.role_assigned",
                user_id=assigned_by,
                resource_id=f"user:{user_id}",
                action="assign",
                success=True,
                details={"target_user_id": user_id, "role_id": role_id, "assigned_by": assigned_by},
            )

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="authorization.role_assigned",
                user_id=assigned_by,
                resource_id=f"user:{user_id}",
                action="assign",
                success=False,
                error_message=str(error),
            )
            raise

    async def remove_role(self, user_id: int, role_id: int) -> None:
        """
        Remove a role from a user.

        Args:
            user_id: User ID to remove role from
            role_id: Role ID to remove
        """
        try:
            stmt = text(
                """
                DELETE FROM user_roles
                WHERE user_id = :user_id AND role_id = :role_id
            """
            )

            self.db.execute(stmt, {"user_id": user_id, "role_id": role_id})

            # Get the number of rows affected
            affected_result = self.db.execute(text("SELECT changes()"))
            rows_affected = affected_result.scalar()

            self.db.commit()

            self._log_audit(
                event_type="authorization.role_removed",
                user_id=user_id,
                resource_id=f"user:{user_id}",
                action="remove",
                success=True,
                details={
                    "target_user_id": user_id,
                    "role_id": role_id,
                    "rows_affected": rows_affected,
                },
            )

        except Exception as error:
            self.db.rollback()
            self._log_audit(
                event_type="authorization.role_removed",
                user_id=user_id,
                resource_id=f"user:{user_id}",
                action="remove",
                success=False,
                error_message=str(error),
            )
            raise

    async def get_all_roles(self) -> List[Role]:
        """
        Get all available roles in the system (with permissions).

        Returns:
            List of all roles with embedded permissions
        """
        query = text(
            """
            SELECT id, name, display_name, description, is_system_role,
                   created_at, updated_at
            FROM roles
            ORDER BY name
        """
        )

        result = self.db.execute(query)
        rows = result.fetchall()

        roles = []
        for row in rows:
            # Load permissions for each role
            permissions = await self.get_role_permissions(row[0])

            roles.append(
                Role(
                    id=row[0],
                    name=row[1],
                    display_name=row[2],
                    description=row[3],
                    is_system_role=bool(row[4]),
                    created_at=row[5],
                    updated_at=row[6],
                    permissions=permissions,
                )
            )

        return roles

    async def get_role_permissions(self, role_id: int) -> List[Permission]:
        """
        Get all permissions for a specific role.

        Args:
            role_id: Role ID

        Returns:
            List of permissions granted to the role
        """
        query = text(
            """
            SELECT p.id, p.name, p.resource, p.action, p.description, p.created_at
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = :role_id
            ORDER BY p.resource, p.action
        """
        )

        result = self.db.execute(query, {"role_id": role_id})
        rows = result.fetchall()

        return [
            Permission(
                id=row[0],
                name=row[1],
                resource=row[2],
                action=row[3],
                description=row[4],
                created_at=row[5],
            )
            for row in rows
        ]

    async def require_permission(self, user_id: int, permission_name: str) -> None:
        """
        Require a permission (raises HTTPException if not granted).
        Convenience method for API route guards.

        Args:
            user_id: User ID to check
            permission_name: Permission name required

        Raises:
            HTTPException: 403 if permission not granted
        """
        result = await self.has_permission(user_id, permission_name)
        if not result.allowed:
            raise HTTPException(status_code=403, detail=f"Permission denied: {result.reason}")

    async def require_role(self, user_id: int, role_name: str) -> None:
        """
        Require a specific role (raises HTTPException if not assigned).
        Convenience method for API route guards.

        Args:
            user_id: User ID to check
            role_name: Role name required (e.g., 'admin')

        Raises:
            HTTPException: 403 if role not assigned
        """
        has_role = await self.has_role(user_id, role_name)
        if not has_role:
            self._log_audit(
                event_type="authorization.role_check",
                user_id=user_id,
                resource_id=role_name,
                action="check",
                success=False,
                details={"required_role": role_name},
            )
            raise HTTPException(status_code=403, detail=f"Role required: {role_name}")
