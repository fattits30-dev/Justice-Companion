/**
 * Permission Entity
 * Represents a granular permission in the RBAC system
 */
export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

/**
 * Create Permission DTO
 */
export interface CreatePermissionDTO {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
