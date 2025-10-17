import {
  Briefcase,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SidebarCaseContext from '../features/chat/components/SidebarCaseContext';
import type { ChatConversation } from '../models/ChatConversation';
import type { UserProfile } from '../models/UserProfile';
import { ConfirmDialog } from './ConfirmDialog';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onConversationLoad: (conversationId: number) => Promise<void>;
  activeView: 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';
  onViewChange: (
    view: 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings'
  ) => void;
  activeCaseId: number | null;
  onActiveCaseIdChange: (caseId: number | null) => void;
}

const navigationItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  { id: 'cases' as const, label: 'Cases', icon: Briefcase },
  { id: 'documents' as const, label: 'Documents', icon: FileText },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function Sidebar({
  isExpanded,
  onToggle,
  onConversationLoad,
  activeView,
  onViewChange,
  activeCaseId,
  onActiveCaseIdChange,
}: SidebarProps): JSX.Element {
  const { user, logout } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [recentChats, setRecentChats] = useState<ChatConversation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Data loading when expanded
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      if (!window.justiceAPI) {
        return;
      }

      try {
        const profileResult = await window.justiceAPI.getUserProfile();
        if (profileResult.success) {
          setUserProfile(profileResult.data);
        }

        const conversationsResult = await window.justiceAPI.getRecentConversations(null, 10);
        if (conversationsResult.success) {
          setRecentChats(conversationsResult.data);
        }
      } catch (error) {
        console.error('Failed to load sidebar data:', error);
      }
    };

    if (isExpanded) {
      void loadInitialData();
    }
  }, [isExpanded]);

  const handleCaseChange = async (caseId: number | null): Promise<void> => {
    onActiveCaseIdChange(caseId);
    if (!window.justiceAPI) {
      return;
    }

    try {
      const result = await window.justiceAPI.getRecentConversations(caseId, 10);
      if (result.success) {
        setRecentChats(result.data);
      }
    } catch (error) {
      console.error('Failed to load conversations for case:', caseId, error);
    }
  };

  const handleConversationSelect = (conversationId: number): void => {
    setActiveConversationId(conversationId);
    void onConversationLoad(conversationId);
  };

  const handleNewChat = async (): Promise<void> => {
    if (!window.justiceAPI || !user) {
      return;
    }

    try {
      const result = await window.justiceAPI.createConversation({
        caseId: activeCaseId,
        userId: user.id,
        title: `New Chat - ${new Date().toLocaleString()}`,
      });

      if (result.success) {
        setRecentChats((prev) => [result.data, ...prev]);
        setActiveConversationId(result.data.id);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleDeleteConversation = (conversationId: number): void => {
    setConversationToDelete(conversationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!window.justiceAPI || conversationToDelete === null) {
      setDeleteConfirmOpen(false);
      setConversationToDelete(null);
      return;
    }

    try {
      const result = await window.justiceAPI.deleteConversation(conversationToDelete);
      if (result.success) {
        setRecentChats((prev) => prev.filter((chat) => chat.id !== conversationToDelete));
        if (activeConversationId === conversationToDelete) {
          setActiveConversationId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleRenameConversation = async (
    conversationId: number,
    newTitle: string,
  ): Promise<void> => {
    if (!window.justiceAPI || !newTitle.trim()) {
      return;
    }

    try {
      setRecentChats((prev) =>
        prev.map((chat) => (chat.id === conversationId ? { ...chat, title: newTitle } : chat)),
      );
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  // Get user initials from auth user or profile
  const getUserInitials = (): string => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    if (userProfile?.name) {
      return userProfile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  // Handle logout
  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      // App will automatically redirect to login screen via AuthContext
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLogoutConfirmOpen(false);
    }
  };

  return (
    <>
      {/* Sidebar - Modern 2025 Design: Ultra-compact collapsed (48px), sleek expanded (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col ${
          isExpanded ? 'w-64' : 'w-12'
        } bg-gradient-to-b from-slate-900/95 via-blue-950/95 to-slate-900/95 border-r border-white/5 shadow-2xl backdrop-blur-xl transition-[width] duration-300 ease-in-out`}
        aria-label="Main navigation"
      >
        {/* Logo - Minimal and modern */}
        <header
          className={`flex items-center justify-center h-14 ${
            isExpanded ? 'px-3' : 'px-0'
          } bg-slate-900/30 border-b border-blue-800/20 transition-[padding] duration-300`}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center shadow-lg ring-1 ring-blue-400/30 transition-transform hover:scale-105">
                <span className="text-white font-bold text-xs">⚖️</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xs font-bold text-white tracking-tight truncate">
                  Justice Companion
                </h1>
                <p className="text-[10px] text-blue-300/80 truncate">Legal Assistant</p>
              </div>
            </div>
          ) : (
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center shadow-lg ring-1 ring-blue-400/30 transition-transform hover:scale-110">
              <span className="text-white text-[10px] font-bold">⚖️</span>
            </div>
          )}
        </header>

        {/* Navigation - Refined spacing and hover effects */}
        <nav
          className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-800/50 scrollbar-track-transparent ${
            isExpanded ? 'px-2 py-3' : 'px-1 py-3'
          }`}
          role="navigation"
          aria-label="Main menu"
        >
          {/* Toggle Button - Sleek and minimal */}
          <button
            type="button"
            onClick={onToggle}
            className={`group mb-3 flex w-full items-center rounded-md border-b border-blue-800/10 pb-3 text-blue-100/90 transition-[background-color,transform,color] duration-200 hover:bg-blue-800/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:scale-95 ${
              isExpanded ? 'gap-2.5 px-2.5 py-2.5' : 'justify-center py-2.5'
            }`}
            aria-label={isExpanded ? 'Minimize sidebar' : 'Expand sidebar'}
            title={isExpanded ? 'Minimize sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
          >
            {isExpanded ? (
              <>
                <ChevronLeft
                  size={18}
                  className="flex-shrink-0 transition-transform group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">Minimize</span>
              </>
            ) : (
              <Menu
                size={18}
                className="flex-shrink-0 transition-transform group-hover:scale-110"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Navigation Items - Modern hover states and active indicators */}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`group mb-1 flex w-full items-center rounded-md transition-[background-color,box-shadow,transform,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/25 to-blue-500/20 text-blue-200 shadow-md ring-1 ring-blue-500/20'
                    : 'text-blue-100/80 hover:bg-blue-800/20 hover:text-white'
                } ${isExpanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5'}`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={isExpanded ? undefined : item.label}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-transform ${
                    isActive ? 'text-blue-300' : 'group-hover:scale-110'
                  }`}
                  aria-hidden="true"
                />
                {isExpanded && <span className="truncate text-xs font-medium">{item.label}</span>}
                {isActive && !isExpanded && (
                  <div
                    className="absolute left-0 h-5 w-0.5 rounded-r-full bg-blue-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Case Context - only when expanded */}
          {isExpanded && (
            <div className="mt-3 border-t border-blue-800/10 pt-3">
              <SidebarCaseContext
                activeCaseId={activeCaseId}
                activeConversationId={activeConversationId}
                recentChats={recentChats}
                onCaseChange={handleCaseChange}
                onConversationSelect={handleConversationSelect}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={handleRenameConversation}
              />
            </div>
          )}
        </nav>

        {/* Profile - Polished and compact */}
        <footer
          className={`border-t border-blue-800/20 bg-slate-900/30 transition-[padding] duration-300 ${
            isExpanded ? 'px-2 py-2.5' : 'px-1 py-2.5'
          }`}
          role="contentinfo"
        >
          {isExpanded ? (
            <div className="space-y-1">
              {/* User Info - Compact and modern */}
              <button
                type="button"
                onClick={() => onViewChange('settings')}
                className="group flex w-full items-center gap-2 rounded-md p-1.5 transition-[background-color,transform] duration-200 hover:bg-blue-800/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:scale-95"
                aria-label="Open user settings"
                title="Open Settings"
              >
                {/* Profile Picture/Initials - Smaller and refined */}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white shadow-md ring-1 ring-blue-400/30 transition-transform group-hover:scale-105">
                  {getUserInitials()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[11px] font-semibold text-white">
                    {user?.username ?? 'User'}
                  </div>
                  <div className="truncate text-[10px] text-blue-300/70">
                    {user?.email ?? userProfile?.email ?? 'user@example.com'}
                  </div>
                </div>
                <User
                  size={14}
                  className="flex-shrink-0 text-blue-300/60 transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
              </button>

              {/* Logout Button - Refined danger state */}
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className="group flex w-full items-center gap-2 rounded-md p-1.5 text-red-300/80 transition-[background-color,transform,color] duration-200 hover:bg-red-900/20 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 active:scale-95"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut
                  size={16}
                  className="flex-shrink-0 transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="group flex w-full items-center justify-center rounded-md py-1.5 transition-[background-color,transform] duration-200 hover:bg-blue-800/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:scale-95"
              aria-label={`${user?.username ?? 'User Profile'} - Click to expand`}
              title={`${user?.username ?? 'User Profile'} - Click to expand`}
            >
              {/* Profile Picture/Initials - Compact collapsed state */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white shadow-md ring-1 ring-blue-400/30 transition-transform group-hover:scale-110">
                {getUserInitials()}
              </div>
            </button>
          )}
        </footer>
      </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setConversationToDelete(null);
        }}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        title="Logout"
        message="Are you sure you want to logout? Any unsaved work will be lost."
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
