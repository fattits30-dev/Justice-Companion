import type Database from 'better-sqlite3';
import type { Permission, PermissionCheckResult } from '../domains/auth/entities/Permission.ts';
import type { Role } from '../domains/auth/entities/Role.ts';
import { injectable, inject } from 'inversify';
import { TYPES } from '../shared/infrastructure/di/types.ts';

/**
 * Authorization Service
 * Handles permission checks and role-based access control
 */
@injectable()
export class AuthorizationService {
  constructor(@inject(TYPES.Database) private db: Database.Database) {}

  /**
   * Check if user has a specific permission
   * @param userId - User ID to check
   * @param permissionName - Permission name (e.g., 'cases.create')
   * @returns Permission check result
   */
  async hasPermission(userId: number, permissionName: string): Promise<PermissionCheckResult> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ? AND p.name = ?
    `;

    const result = this.db.prepare(query).get(userId, permissionName) as { count: number };

    return {
      allowed: result.count > 0,
      reason: result.count > 0 ? undefined : `Missing permission: ${permissionName}`,
    };
  }

  /**
   * Check if user has multiple permissions (AND logic)
   * @param userId - User ID to check
   * @param permissionNames - Array of permission names
   * @returns Permission check result
   */
  async hasAllPermissions(userId: number, permissionNames: string[]): Promise<PermissionCheckResult> {
    for (const permissionName of permissionNames) {
      const result = await this.hasPermission(userId, permissionName);
      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   * @param userId - User ID to check
   * @param permissionNames - Array of permission names
   * @returns Permission check result
   */
  async hasAnyPermission(userId: number, permissionNames: string[]): Promise<PermissionCheckResult> {
    for (const permissionName of permissionNames) {
      const result = await this.hasPermission(userId, permissionName);
      if (result.allowed) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `Missing any of: ${permissionNames.join(', ')}`,
    };
  }

  /**
   * Get all permissions for a user
   * @param userId - User ID
   * @returns Array of permissions
   */
  async getUserPermissions(userId: number): Promise<Permission[]> {
    const query = `
      SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description, p.created_at
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ?
      ORDER BY p.resource, p.action
    `;

    const rows = this.db.prepare(query).all(userId) as Array<{
      id: number;
      name: string;
      resource: string;
      action: string;
      description: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      resource: row.resource,
      action: row.action,
      description: row.description,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get all roles for a user
   * @param userId - User ID
   * @returns Array of roles
   */
  async getUserRoles(userId: number): Promise<Role[]> {
    const query = `
      SELECT r.id, r.name, r.display_name, r.description, r.is_system_role,
             r.created_at, r.updated_at
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
      ORDER BY r.name
    `;

    const rows = this.db.prepare(query).all(userId) as Array<{
      id: number;
      name: string;
      display_name: string;
      description: string | null;
      is_system_role: number;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      isSystemRole: row.is_system_role === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Check if user has a specific role
   * @param userId - User ID
   * @param roleName - Role name (e.g., 'admin')
   * @returns True if user has the role
   */
  async hasRole(userId: number, roleName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.name = ?
    `;

    const result = this.db.prepare(query).get(userId, roleName) as { count: number };
    return result.count > 0;
  }

  /**
   * Assign role to user
   * @param userId - User ID
   * @param roleId - Role ID
   * @param assignedBy - User ID who is assigning the role
   */
  async assignRole(userId: number, roleId: number, assignedBy: number): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, roleId, assignedBy);
  }

  /**
   * Remove role from user
   * @param userId - User ID
   * @param roleId - Role ID
   */
  async removeRole(userId: number, roleId: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM user_roles
      WHERE user_id = ? AND role_id = ?
    `);

    stmt.run(userId, roleId);
  }

  /**
   * Get all available roles
   * @returns Array of all roles
   */
  async getAllRoles(): Promise<Role[]> {
    const query = `
      SELECT id, name, display_name, description, is_system_role,
             created_at, updated_at
      FROM roles
      ORDER BY name
    `;

    const rows = this.db.prepare(query).all() as Array<{
      id: number;
      name: string;
      display_name: string;
      description: string | null;
      is_system_role: number;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      isSystemRole: row.is_system_role === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Get permissions for a specific role
   * @param roleId - Role ID
   * @returns Array of permissions
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const query = `
      SELECT p.id, p.name, p.resource, p.action, p.description, p.created_at
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.resource, p.action
    `;

    const rows = this.db.prepare(query).all(roleId) as Array<{
      id: number;
      name: string;
      resource: string;
      action: string;
      description: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      resource: row.resource,
      action: row.action,
      description: row.description,
      createdAt: new Date(row.created_at),
    }));
  }
}
