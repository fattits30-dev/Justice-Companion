import { logger } from "../../lib/logger.ts";

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
 * - Supports both backend and local-first modes
 */

import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar.tsx";
import { CommandPalette } from "../ui/CommandPalette.tsx";

// Detect local mode at module level (stable across renders)
const isLocalMode = import.meta.env.VITE_LOCAL_MODE === "true";

// Import API clients
import { getLocalApiClient } from "../../lib/api/local";
import { apiClient } from "../../lib/apiClient.ts";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";

// Import both auth contexts - only one will be used based on mode
// The unused one will throw an error if called outside its provider,
// but we only call the one that matches our mode
import { useLocalAuth } from "../../contexts/LocalAuthContext.tsx";
import { useAuth as useBackendAuth } from "../../contexts/AuthContext.tsx";

// Select auth hook based on mode - this is safe because isLocalMode is a compile-time constant
const useAppAuth = isLocalMode ? useLocalAuth : useBackendAuth;

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Use the appropriate auth based on mode
  const auth = useAppAuth();
  const user = auth.user;
  const logoutFn = isLocalMode
    ? (auth as ReturnType<typeof useLocalAuth>).lock
    : (auth as ReturnType<typeof useBackendAuth>).logout;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cases, setCases] = useState<
    Array<{ id: string; title: string; status: string }>
  >([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => {
    return localStorage.getItem("activeCaseId");
  });
  const [itemCounts, setItemCounts] = useState({
    cases: 0,
    documents: 0,
    chat: 0,
  });

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handleLogout = async () => {
    if (logoutFn) {
      await logoutFn();
    }
    navigate(isLocalMode ? "/pin" : "/login");
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleCaseSelect = (caseId: string | null) => {
    setSelectedCaseId(caseId);
    if (caseId) {
      localStorage.setItem("activeCaseId", caseId);
    } else {
      localStorage.removeItem("activeCaseId");
    }
    // Trigger storage event for ChatView to reload messages
    window.dispatchEvent(new Event("storage"));
  };

  // Fetch cases from backend or local storage
  useEffect(() => {
    const fetchCases = async () => {
      try {
        // In local mode, use local API; in backend mode, require session
        if (!isLocalMode) {
          const sessionId = localStorage.getItem("sessionId");
          if (!sessionId) {
            return;
          }
        }

        const client = isLocalMode ? getLocalApiClient() : apiClient;
        const result = await client.cases.list();
        if (result.success && result.data) {
          const casesList = result.data.items || result.data;
          setCases(
            (Array.isArray(casesList) ? casesList : []).map((c: any) => ({
              id: c.id.toString(),
              title: c.title,
              status: c.status,
            })),
          );
        }
      } catch (error) {
        logger.error("Failed to fetch cases:", {
          error: error as Error,
          service: "MainLayout",
        });
      }
    };

    fetchCases();
    // Refetch cases every 5 minutes (300000ms) to stay in sync
    // Individual pages fetch their own data on mount, so frequent polling is unnecessary
    const interval = setInterval(fetchCases, 300000);
    return () => clearInterval(interval);
  }, []);

  // Fetch item counts from dashboard stats
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // In local mode, use local API; in backend mode, require session
        if (!isLocalMode) {
          const sessionId = localStorage.getItem("sessionId");
          if (!sessionId) {
            return;
          }
        }

        const client = isLocalMode ? getLocalApiClient() : apiClient;
        const result = await client.dashboard.getStats();
        if (result.success && result.data) {
          // Support legacy API responses that wrapped stats in a nested object
          // Also handle local vs backend response shape differences
          const statsPayload = result.data as Record<string, unknown> & {
            stats?: Record<string, unknown>;
          };
          const stats = statsPayload.stats ?? statsPayload;
          setItemCounts({
            cases: (stats.activeCases as number) || 0,
            documents: (stats.totalEvidence as number) || 0,
            chat: 0, // Will be implemented when we add chat conversation tracking
          });
        }
      } catch (error) {
        logger.error("Failed to fetch counts:", {
          error: error as Error,
          service: "MainLayout",
        });
      }
    };

    fetchCounts();
    // Refetch counts every 5 minutes (300000ms) to stay in sync
    // Individual pages fetch their own data on mount, so frequent polling is unnecessary
    const interval = setInterval(fetchCounts, 300000);
    return () => clearInterval(interval);
  }, []);

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

  // Mobile navigation items
  const mobileNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/cases", icon: Briefcase, label: "Cases" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-primary-900 overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          currentRoute={location.pathname}
          user={user ? { username: user.username, email: user.email || "" } : null}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          notifications={itemCounts}
          cases={cases}
          selectedCaseId={selectedCaseId}
          onCaseSelect={handleCaseSelect}
        />
      </div>

      {/* Main content area - with bottom padding on mobile for nav */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-white/10 px-2 py-1 z-50">
        <div className="flex justify-around items-center">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? "text-cyan-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
