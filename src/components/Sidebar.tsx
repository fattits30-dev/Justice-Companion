import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SidebarNavigation } from './SidebarNavigation';
import SidebarCaseContext from './SidebarCaseContext';
import { SidebarProfile } from './SidebarProfile';
import { ConfirmDialog } from './ConfirmDialog';
import type { ChatConversation } from '../models/ChatConversation';
import type { UserProfile } from '../models/UserProfile';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationLoad: (conversationId: number) => Promise<void>;
  activeView: 'dashboard' | 'cases' | 'documents' | 'settings';
  onViewChange: (view: 'dashboard' | 'cases' | 'documents' | 'settings') => void;
}

export function Sidebar({ isOpen, onClose, onConversationLoad, activeView, onViewChange }: SidebarProps): JSX.Element | null {
  // State management
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [recentChats, setRecentChats] = useState<ChatConversation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);

  // Data loading on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Safety check: ensure window.justiceAPI is available
      if (!window.justiceAPI) {
        console.error('window.justiceAPI is not available');
        return;
      }

      try {
        // Fetch user profile
        const profileResult = await window.justiceAPI.getUserProfile();
        if (profileResult.success) {
          setUserProfile(profileResult.data);
        }

        // Fetch recent conversations (general chat, no case filter)
        const conversationsResult = await window.justiceAPI.getRecentConversations(null, 10);
        if (conversationsResult.success) {
          setRecentChats(conversationsResult.data);
        }
      } catch (error) {
        console.error('Failed to load sidebar data:', error);
      }
    };

    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Event handlers - removed local handleViewChange, use prop instead

  const handleCaseChange = async (caseId: number | null) => {
    setActiveCaseId(caseId);

    if (!window.justiceAPI) {
      console.error('window.justiceAPI is not available');
      return;
    }

    try {
      // Fetch recent chats for the selected case
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
    // Load conversation messages in the main chat window
    await onConversationLoad(conversationId);
  };

  const handleNewChat = async () => {
    if (!window.justiceAPI) {
      console.error('window.justiceAPI is not available');
      return;
    }

    try {
      const result = await window.justiceAPI.createConversation({
        caseId: activeCaseId,
        title: `New Chat - ${new Date().toLocaleString()}`,
      });

      if (result.success) {
        // Add to recent chats at the top
        setRecentChats(prev => [result.data, ...prev]);
        setActiveConversationId(result.data.id);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleProfileClick = () => {
    // TODO: Open profile modal/settings
    console.log('Profile clicked - future: open profile modal');
  };

  const handleDeleteConversation = (conversationId: number) => {
    setConversationToDelete(conversationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!window.justiceAPI || conversationToDelete === null) {
      console.error('window.justiceAPI is not available or no conversation selected');
      setDeleteConfirmOpen(false);
      setConversationToDelete(null);
      return;
    }

    try {
      const result = await window.justiceAPI.deleteConversation(conversationToDelete);
      if (result.success) {
        // Remove from recent chats
        setRecentChats(prev => prev.filter(chat => chat.id !== conversationToDelete));

        // Clear active conversation if it was deleted
        if (activeConversationId === conversationToDelete) {
          setActiveConversationId(null);
        }
      } else {
        console.error('Failed to delete conversation');
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
      console.error('window.justiceAPI is not available or title is empty');
      return;
    }

    try {
      // Update conversation title via IPC
      // Note: Need to add updateConversation IPC handler
      console.log(`Rename conversation ${conversationId} to "${newTitle}"`);

      // Optimistically update UI
      setRecentChats(prev =>
        prev.map(chat =>
          chat.id === conversationId ? { ...chat, title: newTitle } : chat
        )
      );
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 border-r border-blue-800/30 flex flex-col z-50 shadow-2xl">
      {/* Header with logo and close button */}
      <div className="p-4 border-b border-blue-800/30 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-blue-400/20">
            <span className="text-white font-bold text-base">⚖️</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Justice Companion</h1>
            <p className="text-xs text-blue-300">Here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-800/30 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-blue-200" />
        </button>
      </div>

      {/* Navigation */}
      <div className="border-b border-blue-800/30 p-4">
        <SidebarNavigation activeView={activeView} onViewChange={onViewChange} />
      </div>

      {/* Scrollable Middle Section - Case Context & Recent Chats */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Profile at bottom (sticky handled in component) */}
      <SidebarProfile profile={userProfile} onProfileClick={handleProfileClick} />

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
    </div>
  );
}
