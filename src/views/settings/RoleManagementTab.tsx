import React, { useState, useEffect } from 'react';
import { Shield, Users, Key } from 'lucide-react';
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
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Role Management
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Roles</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {roles.map((role) => (
                <li key={role.id} className="px-4 py-4 hover:bg-gray-50 cursor-pointer">
                  <div 
                    className={`flex items-center justify-between ${
                      selectedRole?.id === role.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-500 mr-3" />
                      <span className="font-medium text-gray-900">{role.name}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {role.permissions.length} permissions
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Permissions Details */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {selectedRole.name} Permissions
                </h3>
              </div>
              <div className="p-4">
                {permissions.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {permissions.map((permission) => (
                      <li key={permission.id} className="py-3">
                        <div className="flex items-center">
                          <Key className="w-5 h-5 text-gray-500 mr-3" />
                          <span className="text-gray-900">{permission.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No permissions assigned to this role.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a role to view its permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};