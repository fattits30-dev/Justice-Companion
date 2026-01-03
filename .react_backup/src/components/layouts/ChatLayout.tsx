/**
 * ChatLayout - Modern Chat-Centric Layout
 *
 * Features:
 * - Full navigation in sidebar with clear sections
 * - Collapsible conversation history
 * - Mobile-first with bottom navigation
 * - Dark navy + gold theme
 */

import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Plus,
  Menu,
  Briefcase,
  Settings,
  Scale,
  MoreHorizontal,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  X,
  Lock,
  /* Home, */
} from "lucide-react";

// Detect local mode
const isLocalMode = import.meta.env.VITE_LOCAL_MODE === "true";

// Import auth hooks
import { useLocalAuth } from "../../contexts/LocalAuthContext";
import { useAuth as useBackendAuth } from "../../contexts/AuthContext";

// Select auth hook based on mode
const useAppAuth = isLocalMode ? useLocalAuth : useBackendAuth;

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  preview?: string;
}

// Navigation items configuration
const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat", description: "AI Legal Assistant" },
  { href: "/cases", icon: Briefcase, label: "My Cases", description: "Manage your cases" },
  { href: "/documents", icon: FileText, label: "Documents", description: "Evidence & files" },
  { href: "/timeline", icon: Calendar, label: "Timeline", description: "Deadlines & events" },
];

const secondaryNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function ChatLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppAuth();
  const user = auth.user;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  // Load conversations from localStorage
  useEffect(() => {
    const mockConversations: Conversation[] = [];
    setConversations(mockConversations);
  }, []);

  const handleNewChat = () => {
    setActiveConversation(null);
    setSidebarOpen(false);
    navigate("/chat");
    localStorage.removeItem("chatMessages-global");
    window.location.reload();
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    setSidebarOpen(false);
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const isActive = (path: string) => {
    if (path === "/chat") {
      return location.pathname === "/chat" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // Mobile bottom navigation
  const mobileNavItems = [
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/cases", icon: Briefcase, label: "Cases" },
    { href: "/documents", icon: FileText, label: "Docs" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-primary-950 text-white overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-72 bg-primary-900 border-r border-white/10
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Sidebar Header - Logo & Close */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-400/20">
              <Scale className="w-5 h-5 text-primary-950" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Justice</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Companion</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-gold-400 hover:bg-gold-300 active:scale-[0.98]
                       text-primary-950 font-semibold
                       shadow-lg shadow-gold-400/20
                       transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="px-3 py-2">
          <p className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Navigation
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group
                    ${active
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <div className={`
                    p-1.5 rounded-lg transition-colors
                    ${active ? "bg-gold-400/20 text-gold-400" : "text-white/50 group-hover:text-white/70"}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Chat History Section */}
        <div className="flex-1 overflow-hidden flex flex-col px-3 py-2">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center justify-between px-3 py-2 text-white/30 hover:text-white/50 transition-colors"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Recent Chats
            </span>
            {historyExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {historyExpanded && (
            <div className="flex-1 overflow-y-auto space-y-1 mt-1">
              {conversations.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <p className="text-xs text-white/40">No chat history</p>
                  <p className="text-[10px] text-white/25 mt-1">Start a conversation above</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg
                      flex items-center gap-2 group transition-all duration-200
                      ${activeConversation === conv.id
                        ? "bg-white/10 text-white"
                        : "hover:bg-white/5 text-white/60"
                      }
                    `}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 truncate text-sm">{conv.title}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete conversation
                      }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Secondary Navigation */}
        <div className="px-3 py-2 border-t border-white/10">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200
                  ${active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-gold-400 text-sm font-semibold">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username || "User"}</p>
              <div className="flex items-center gap-1 text-[10px] text-white/40">
                <Lock className="w-2.5 h-2.5" />
                <span>Local Mode</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header with Navigation */}
        <header className="md:hidden bg-primary-900/95 backdrop-blur-sm border-b border-white/10">
          {/* Top bar - Logo and actions */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-gold-400" />
              <span className="font-semibold text-sm">Justice Companion</span>
            </div>
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-white/10 rounded-lg text-gold-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center px-2 pb-2">
            <div className="flex w-full bg-primary-950/50 rounded-xl p-1">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`
                      flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg
                      transition-all duration-200
                      ${active
                        ? "bg-primary-800 text-gold-400 shadow-sm"
                        : "text-white/50 hover:text-white/70 active:scale-95"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        {/* Main Content - no bottom padding needed now */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
