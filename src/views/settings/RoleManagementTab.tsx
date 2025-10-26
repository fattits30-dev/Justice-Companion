import React, { useState, useEffect } from 'react';
import { Shield, Users, Key, Plus, Trash2, Edit } from 'lucide-react';
import type { Role, Permission } from '../../domains/auth/entities/Role.ts';

/**
 * Role Management Tab (Admin Only)
 * Allows administrators to manage roles and permissions
 */
export const RoleManagementTab: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call IPC to get all roles
      const rolesData = await window.electron.invoke('rbac:getAllRoles');
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const perms = await window.electron.invoke('rbac:getRolePermissions', roleId);
      setPermissions(perms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    }
  };

  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role);
    await loadRolePermissions(role.id);
  };

  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      await window.electron.invoke('rbac:assignRole', { userId, roleId });
      alert('Role assigned successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    try {
      await window.electron.invoke('rbac:removeRole', { userId, roleId });
      alert('Role removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadRoles}
          className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
            <p className="text-sm text-gray-500">Manage user roles and permissions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Roles
            </h3>
          </div>

          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedRole?.id === role.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{role.displayName}</div>
                    <div className="text-sm text-gray-500">{role.name}</div>
                  </div>
                  {role.isSystemRole && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      System
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="mt-2 text-sm text-gray-600">{role.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            {selectedRole ? `${selectedRole.displayName} Permissions` : 'Permissions'}
          </h3>

          {!selectedRole ? (
            <p className="text-gray-500 text-center py-8">
              Select a role to view its permissions
            </p>
          ) : permissions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No permissions assigned to this role
            </p>
          ) : (
            <div className="space-y-4">
              {/* Group permissions by resource */}
              {Object.entries(
                permissions.reduce((acc, perm) => {
                  if (!acc[perm.resource]) {
                    acc[perm.resource] = [];
                  }
                  acc[perm.resource].push(perm);
                  return {};
                }, {} as Record<string, Permission[]>)
              ).map(([resource, perms]) => (
                <div key={resource} className="border-b border-gray-200 pb-3 last:border-0">
                  <h4 className="font-medium text-gray-700 capitalize mb-2">{resource}</h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <span
                        key={perm.id}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {perm.action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{roles.length}</div>
              <div className="text-sm text-gray-500">Total Roles</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {roles.filter((r) => r.isSystemRole).length}
              </div>
              <div className="text-sm text-gray-500">System Roles</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Key className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedRole ? permissions.length : '-'}
              </div>
              <div className="text-sm text-gray-500">Permissions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> System roles (Admin, User, Viewer) cannot be deleted.
          Custom roles can be created and modified as needed. Permission changes take
          effect immediately.
        </p>
      </div>
    </div>
  );
};
