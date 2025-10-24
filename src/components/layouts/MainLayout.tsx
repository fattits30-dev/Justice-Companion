/**
 * MainLayout - Main app layout with Sidebar + content area
 *
 * Features:
 * - Sidebar navigation
 * - Main content area (outlet for routes)
 * - User info from AuthContext
 * - Logout functionality
 * - Responsive layout
 */

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { useAuth } from '../../contexts/AuthContext';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentRoute={location.pathname}
        user={user ? { username: user.username, email: user.email } : null}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        notifications={{
          cases: 0,
          documents: 0,
          chat: 0
        }}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
