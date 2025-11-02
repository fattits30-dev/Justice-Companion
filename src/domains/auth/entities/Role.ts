import type { Permission } from './Permission.ts';

/**
 * Role Entity
 * Represents a role in the RBAC system
 */
export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Permission[]; // Associated permissions (loaded via join)
}

/**
 * Create Role DTO
 */
export interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  isSystemRole?: boolean;
}

/**
 * Update Role DTO
 */
export interface UpdateRoleDTO {
  displayName?: string;
  description?: string;
}
