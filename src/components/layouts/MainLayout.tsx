/**
 * MainLayout - Main app layout with Sidebar + content area + Command Palette
 *
 * Features:
 * - Sidebar navigation
 * - Main content area (outlet for routes)
 * - Command Palette (Cmd/Ctrl+K) for keyboard-driven navigation
 * - User info from AuthContext
 * - Logout functionality
 * - Responsive layout
 */

import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar.tsx";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { CommandPalette } from "../ui/CommandPalette.tsx";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Command palette keyboard shortcut (Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Command palette items
  const commandItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      shortcut: "D",
      onSelect: () => {
        navigate("/dashboard");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "cases",
      label: "Cases",
      icon: <Briefcase className="h-4 w-4" />,
      shortcut: "C",
      onSelect: () => {
        navigate("/cases");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "documents",
      label: "Documents & Evidence",
      icon: <FileText className="h-4 w-4" />,
      shortcut: "E",
      onSelect: () => {
        navigate("/documents");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "chat",
      label: "AI Legal Assistant",
      icon: <MessageSquare className="h-4 w-4" />,
      shortcut: "A",
      onSelect: () => {
        navigate("/chat");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      shortcut: "S",
      onSelect: () => {
        navigate("/settings");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "logout",
      label: "Logout",
      icon: <LogOut className="h-4 w-4" />,
      shortcut: "⌘Q",
      onSelect: () => {
        handleLogout();
        setCommandPaletteOpen(false);
      },
    },
  ];

  return (
    <div className="flex h-screen bg-primary-900 overflow-hidden">
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
          chat: 0,
        }}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Command Palette (Cmd/Ctrl+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        items={commandItems}
        placeholder="Search for pages or actions..."
      />
    </div>
  );
}
