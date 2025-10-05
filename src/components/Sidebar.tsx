import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Briefcase, FileText, Settings, Menu, ChevronLeft } from 'lucide-react';
import SidebarCaseContext from './SidebarCaseContext';
import { ConfirmDialog } from './ConfirmDialog';
import type { ChatConversation } from '../models/ChatConversation';
import type { UserProfile } from '../models/UserProfile';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onConversationLoad: (conversationId: number) => Promise<void>;
  activeView: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings';
  onViewChange: (view: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings') => void;
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

export function Sidebar({ isExpanded, onToggle, onConversationLoad, activeView, onViewChange, activeCaseId, onActiveCaseIdChange }: SidebarProps): JSX.Element {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [recentChats, setRecentChats] = useState<ChatConversation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);

  // Data loading when expanded
  useEffect(() => {
    const loadInitialData = async () => {
      if (!window.justiceAPI) {
        console.error('window.justiceAPI is not available');
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
      loadInitialData();
    }
  }, [isExpanded]);

  const handleCaseChange = async (caseId: number | null) => {
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

  const handleConversationSelect = async (conversationId: number) => {
    setActiveConversationId(conversationId);
    await onConversationLoad(conversationId);
  };

  const handleNewChat = async () => {
    if (!window.justiceAPI) {
      return;
    }

    try {
      const result = await window.justiceAPI.createConversation({
        caseId: activeCaseId,
        title: `New Chat - ${new Date().toLocaleString()}`,
      });

      if (result.success) {
        setRecentChats(prev => [result.data, ...prev]);
        setActiveConversationId(result.data.id);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleDeleteConversation = (conversationId: number) => {
    setConversationToDelete(conversationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!window.justiceAPI || conversationToDelete === null) {
      setDeleteConfirmOpen(false);
      setConversationToDelete(null);
      return;
    }

    try {
      const result = await window.justiceAPI.deleteConversation(conversationToDelete);
      if (result.success) {
        setRecentChats(prev => prev.filter(chat => chat.id !== conversationToDelete));
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

  const handleRenameConversation = async (conversationId: number, newTitle: string) => {
    if (!window.justiceAPI || !newTitle.trim()) {
      return;
    }

    try {
      console.log(`Rename conversation ${conversationId} to "${newTitle}"`);
      setRecentChats(prev =>
        prev.map(chat =>
          chat.id === conversationId ? { ...chat, title: newTitle } : chat,
        ),
      );
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!userProfile?.name) {
      return 'U';
    }
    return userProfile.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Sidebar - always visible, width changes based on isExpanded */}
      <div className={`fixed inset-y-0 left-0 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 border-r border-blue-800/30 flex flex-col z-50 shadow-2xl transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      }`}>
        {/* Logo - always visible at top */}
        <div className="p-3 border-b border-blue-800/30 bg-slate-900/50 flex items-center justify-center">
          {isExpanded ? (
            <div className="flex items-center space-x-3 w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-400/20">
                <span className="text-white font-bold text-base">⚖️</span>
              </div>
              <div className="flex-1">
                <h1 className="text-base font-bold text-white tracking-tight">Justice Companion</h1>
                <p className="text-xs text-blue-300">Here to help</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-400/20">
              <span className="text-white font-bold text-base">⚖️</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {/* Toggle Button - First Item */}
          <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 py-3 px-3 rounded-lg transition-all mb-2 text-blue-100 hover:bg-blue-800/30 border-b border-blue-800/20 pb-3"
            title={isExpanded ? 'Minimize sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <>
                <ChevronLeft size={20} className="flex-shrink-0" />
                <span className="font-medium">Minimize</span>
              </>
            ) : (
              <Menu size={20} className="flex-shrink-0" />
            )}
          </button>

          {/* Navigation Items */}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 py-3 px-3 rounded-lg transition-all mb-1 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 shadow-lg'
                    : 'text-blue-100 hover:bg-blue-800/30'
                }`}
                title={isExpanded ? undefined : item.label}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isExpanded && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}

          {/* Case Context - only when expanded */}
          {isExpanded && (
            <div className="mt-2">
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

        {/* Profile - always visible */}
        <div className="border-t border-blue-800/30 p-3 bg-slate-900/50">
          <button
            onClick={onToggle}
            className={`w-full flex items-center gap-3 hover:bg-blue-800/30 rounded-lg transition-colors p-2 ${
              !isExpanded && 'justify-center'
            }`}
            title={isExpanded ? undefined : userProfile?.name || 'User Profile'}
          >
            {/* Profile Picture/Initials */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {getUserInitials()}
            </div>
            {isExpanded && (
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">{userProfile?.name || 'User'}</div>
                <div className="text-xs text-blue-300">{userProfile?.email || 'user@example.com'}</div>
              </div>
            )}
          </button>
        </div>
      </div>

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
    </>
  );
}
