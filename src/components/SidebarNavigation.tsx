import React from 'react';
import { LayoutDashboard, MessageSquare, Briefcase, FileText, Settings, LucideIcon } from 'lucide-react';

interface SidebarNavigationProps {
  activeView: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings';
  onViewChange: (view: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings') => void;
}

interface NavigationItem {
  id: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings';
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
  },
  {
    id: 'cases',
    label: 'Cases',
    icon: Briefcase,
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
    <nav className="flex flex-col space-y-1" role="navigation" aria-label="Main navigation">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              flex items-center py-3 px-4 transition-all duration-200 rounded-lg
              ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border-l-4 border-blue-400 shadow-lg'
                  : 'text-blue-100 hover:bg-blue-800/30 border-l-4 border-transparent'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon size={20} className="mr-3" />
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
