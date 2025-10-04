import React, { useState } from 'react';
import { Scale, MessageSquarePlus, ChevronDown, Trash2, Edit2 } from 'lucide-react';
import type { ChatConversation } from '../models/ChatConversation';

interface SidebarCaseContextProps {
  activeCaseId: number | null;
  activeConversationId: number | null;
  recentChats: ChatConversation[];
  onCaseChange: (caseId: number | null) => void;
  onConversationSelect: (conversationId: number) => void;
  onNewChat: () => void;
  onDeleteConversation?: (conversationId: number) => void;
  onRenameConversation?: (conversationId: number, newTitle: string) => void;
}

const SidebarCaseContext: React.FC<SidebarCaseContextProps> = ({
  activeCaseId,
  activeConversationId,
  recentChats,
  onCaseChange,
  onConversationSelect,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState<number | null>(null);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const truncateTitle = (title: string, maxLength: number = 40): string => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  const activeCaseTitle = activeCaseId ? `Case: ${activeCaseId}` : 'General Chat';

  return (
    <div className="border-b border-blue-800/30 p-4">
      {/* Active Case Selector */}
      <div className="mb-4">
        <label className="text-xs font-medium text-blue-300 uppercase tracking-wide mb-2 block">
          Active Case
        </label>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-blue-950/50 border border-blue-700/30 rounded-lg hover:bg-blue-900/50 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-300" />
              <span className="text-sm text-blue-100 font-medium">
                {activeCaseTitle}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-blue-300 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-blue-700/50 rounded-lg shadow-2xl z-10 backdrop-blur-sm">
              <button
                onClick={() => {
                  onCaseChange(null);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-800/30 transition-colors rounded-lg ${
                  activeCaseId === null ? 'bg-blue-700/30 text-blue-200' : 'text-blue-100'
                }`}
              >
                General Chat
              </button>
              {/* Additional cases would be mapped here from a cases list */}
            </div>
          )}
        </div>
      </div>

      {/* Recent Chats */}
      <div className="mb-4">
        <h3 className="text-xs font-medium text-blue-300 uppercase tracking-wide mb-2">
          Recent Chats
        </h3>
        <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
          {recentChats.length === 0 ? (
            <p className="text-sm text-blue-400/60 italic py-2 px-3">
              No recent chats yet
            </p>
          ) : (
            recentChats.slice(0, 10).map((chat) => (
              <div
                key={chat.id}
                className={`relative rounded-lg transition-all ${
                  activeConversationId === chat.id
                    ? 'bg-blue-600/30 shadow-lg border border-blue-500/30'
                    : 'hover:bg-blue-800/20 border border-transparent'
                }`}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                {editingChatId === chat.id ? (
                  /* Edit Mode */
                  <div className="py-2 px-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameConversation?.(chat.id, editTitle.trim());
                          setEditingChatId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingChatId(null);
                        }
                      }}
                      onBlur={() => setEditingChatId(null)}
                      autoFocus
                      className="w-full bg-blue-950/50 border border-blue-500/50 rounded px-2 py-1 text-sm text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter title..."
                    />
                  </div>
                ) : (
                  /* Normal Mode */
                  <button
                    onClick={() => onConversationSelect(chat.id)}
                    className="w-full text-left py-2 px-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 overflow-hidden">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-100">
                            {truncateTitle(chat.title)}
                          </span>
                        </div>
                        <div className="text-xs text-blue-400 mt-0.5">
                          {formatTimestamp(chat.updatedAt)}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {hoveredChatId === chat.id && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTitle(chat.title);
                              setEditingChatId(chat.id);
                            }}
                            className="p-1.5 hover:bg-blue-500/30 rounded transition-colors"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-300" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation?.(chat.id);
                            }}
                            className="p-1.5 hover:bg-red-500/30 rounded transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all font-medium shadow-lg hover:shadow-xl"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="text-sm">New Chat</span>
      </button>
    </div>
  );
};

export default SidebarCaseContext;
