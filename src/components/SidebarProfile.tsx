import React from 'react';
import { User } from 'lucide-react';
import type { UserProfile } from '../models/UserProfile';

interface SidebarProfileProps {
  profile: UserProfile | null;
  onProfileClick: () => void;
}

export const SidebarProfile: React.FC<SidebarProfileProps> = ({
  profile,
  onProfileClick,
}) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const renderAvatar = () => {
    if (profile?.avatarUrl) {
      return (
        <img
          src={profile.avatarUrl}
          alt={profile.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    if (profile?.name) {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-sm">
          {getInitials(profile.name)}
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
        <User className="w-5 h-5" />
      </div>
    );
  };

  const displayName = profile?.name || 'Guest User';
  const displayEmail = profile?.email;

  return (
    <div className="sticky bottom-0 bg-slate-900/80 border-t border-blue-800/30 backdrop-blur-sm">
      <button
        onClick={onProfileClick}
        className="w-full p-4 flex items-center gap-3 hover:bg-blue-800/20 transition-all duration-150 text-left group"
        aria-label="Open profile settings"
      >
        {renderAvatar()}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-blue-100 truncate group-hover:text-white transition-colors">
            {displayName}
          </p>
          {displayEmail && (
            <p className="text-xs text-blue-400 truncate">
              {displayEmail}
            </p>
          )}
        </div>

        <User className="w-5 h-5 text-blue-300 group-hover:text-blue-200 transition-colors flex-shrink-0" />
      </button>
    </div>
  );
};
