import { useState, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export interface Tab {
  id: string;
  label: string;
  icon?: ComponentType<LucideProps>;
  content: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>(defaultTab ?? tabs[0]?.id ?? '');
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (defaultTab && tabs.some((tab) => tab.id === defaultTab)) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, tabs]);

  const handleTabClick = (tabId: string): void => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const tabCount = tabs.length;
    let newIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = index > 0 ? index - 1 : tabCount - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = index < tabCount - 1 ? index + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabCount - 1;
        break;
      default:
        return;
    }

    const newTabId = tabs[newIndex]?.id;
    if (newTabId) {
      setActiveTab(newTabId);
      onChange?.(newTabId);
      tabRefs.current.get(newTabId)?.focus();
    }
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="Settings navigation"
        className="flex items-center gap-1 border-b border-blue-800/30 bg-slate-900/50 px-2 overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.id, el);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                group relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                transition-all duration-200 ease-out
                ${isActive ? 'text-blue-300' : 'text-slate-300 hover:text-white'}
                focus:outline-none focus:ring-3 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-t-lg
              `}
            >
              {Icon && (
                <Icon
                  className={`
                    w-4 h-4 transition-colors duration-200
                    ${isActive ? 'text-blue-400' : 'text-slate-300 group-hover:text-white'}
                  `}
                  size={16}
                />
              )}
              <span>{tab.label}</span>

              {/* Active indicator */}
              <div
                className={`
                  absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400
                  transition-all duration-200 ease-out
                  ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                `}
              />
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`tabpanel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={!isActive}
              className={`
                h-full overflow-y-auto
                ${isActive ? 'animate-in fade-in-0 slide-in-from-left-2 duration-200' : ''}
              `}
              tabIndex={0}
            >
              {tab.content}
            </div>
          );
        })}
      </div>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {activeTabContent && `${tabs.find((tab) => tab.id === activeTab)?.label} tab selected`}
      </div>
    </div>
  );
}
