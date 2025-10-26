-- Migration 022: Role-Based Access Control (RBAC) System
-- Creates roles, permissions, and junction tables for fine-grained authorization
-- Migration: 022_create_rbac_system.sql
-- Created: 2025-10-25

-- Roles table: defines available roles in the system
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,           -- e.g., 'admin', 'user', 'viewer'
  display_name TEXT NOT NULL,          -- e.g., 'Administrator', 'Standard User'
  description TEXT,
  is_system_role INTEGER NOT NULL DEFAULT 0,  -- System roles cannot be deleted
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table: defines granular permissions
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,           -- e.g., 'cases.create', 'evidence.delete'
  resource TEXT NOT NULL,               -- e.g., 'cases', 'evidence', 'users'
  action TEXT NOT NULL,                 -- e.g., 'create', 'read', 'update', 'delete'
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission junction table (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User-Role junction table (many-to-many, users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER,  -- User ID who assigned this role
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Trigger to update roles.updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_role_timestamp
  AFTER UPDATE ON roles
  FOR EACH ROW
BEGIN
  UPDATE roles SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 1),
  ('user', 'Standard User', 'Standard user with read/write access to own data', 1),
  ('viewer', 'Viewer', 'Read-only access to data', 1);

-- Insert default permissions (CRUD for each resource)
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Cases permissions
  ('cases.create', 'cases', 'create', 'Create new cases'),
  ('cases.read', 'cases', 'read', 'View cases'),
  ('cases.update', 'cases', 'update', 'Edit cases'),
  ('cases.delete', 'cases', 'delete', 'Delete cases'),

  -- Evidence permissions
  ('evidence.create', 'evidence', 'create', 'Upload evidence'),
  ('evidence.read', 'evidence', 'read', 'View evidence'),
  ('evidence.update', 'evidence', 'update', 'Edit evidence metadata'),
  ('evidence.delete', 'evidence', 'delete', 'Delete evidence'),

  -- Users permissions (admin only)
  ('users.create', 'users', 'create', 'Create new users'),
  ('users.read', 'users', 'read', 'View user profiles'),
  ('users.update', 'users', 'update', 'Edit user profiles'),
  ('users.delete', 'users', 'delete', 'Delete users'),

  -- Roles permissions (admin only)
  ('roles.create', 'roles', 'create', 'Create new roles'),
  ('roles.read', 'roles', 'read', 'View roles'),
  ('roles.update', 'roles', 'update', 'Edit roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),

  -- Timeline permissions
  ('timeline.create', 'timeline', 'create', 'Add timeline events'),
  ('timeline.read', 'timeline', 'read', 'View timeline'),
  ('timeline.update', 'timeline', 'update', 'Edit timeline events'),
  ('timeline.delete', 'timeline', 'delete', 'Delete timeline events'),

  -- Documents permissions
  ('documents.create', 'documents', 'create', 'Upload documents'),
  ('documents.read', 'documents', 'read', 'View documents'),
  ('documents.update', 'documents', 'update', 'Edit document metadata'),
  ('documents.delete', 'documents', 'delete', 'Delete documents'),

  -- Export permissions
  ('export.data', 'export', 'execute', 'Export data to external formats'),

  -- Settings permissions
  ('settings.read', 'settings', 'read', 'View settings'),
  ('settings.update', 'settings', 'update', 'Modify settings');

-- Assign permissions to Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions;

-- Assign permissions to User role (CRUD on own data)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'user'),
  id
FROM permissions
WHERE name IN (
  'cases.create', 'cases.read', 'cases.update', 'cases.delete',
  'evidence.create', 'evidence.read', 'evidence.update', 'evidence.delete',
  'timeline.create', 'timeline.read', 'timeline.update', 'timeline.delete',
  'documents.create', 'documents.read', 'documents.update', 'documents.delete',
  'export.data',
  'settings.read', 'settings.update'
);

-- Assign permissions to Viewer role (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'viewer'),
  id
FROM permissions
WHERE name IN (
  'cases.read',
  'evidence.read',
  'timeline.read',
  'documents.read',
  'settings.read'
);

-- Migrate existing users.role to user_roles table
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  u.id,
  r.id,
  NULL  -- System migration, no assigner
FROM users u
JOIN roles r ON r.name = u.role;

-- Note: We keep the users.role column for backward compatibility
-- but the authoritative source is now user_roles table
