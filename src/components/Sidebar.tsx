/**
 * Sidebar Component
 *
 * Built with TDD - All tests written FIRST
 *
 * Features:
 * - Navigation links with icons
 * - Active route highlighting
 * - User info display
 * - Logout functionality
 * - Collapse/expand
 * - Notification badges
 * - Accessible navigation
 */

import React, { type JSX } from "react";
import { logger } from "../utils/logger.ts";
import { apiClient } from "../lib/apiClient.ts";

interface SidebarProps {
  currentRoute: string;
  user?: {
    username: string;
    email: string;
  } | null;
  onLogout?: () => void;
  onNavigate?: (route: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  notifications?: {
    cases?: number;
    documents?: number;
    chat?: number;
  };
  cases?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  selectedCaseId?: string | null;
  onCaseSelect?: (caseId: string | null) => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: JSX.Element;
  badge?: number;
}

const SidebarComponent = React.memo(function Sidebar({
  currentRoute,
  user = null,
  onLogout,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  notifications = {},
  cases = [],
  selectedCaseId = null,
  onCaseSelect,
}: SidebarProps) {
  const [isProfileManagerOpen, setIsProfileManagerOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [recentConversations, setRecentConversations] = React.useState<
    Array<{
      id: number;
      title: string;
      updatedAt: string;
      messageCount: number;
    }>
  >([]);

  // Load profile when popup opens
  React.useEffect(() => {
    if (isProfileManagerOpen) {
      const loadProfile = async () => {
        try {
          // Use apiClient instead of legacy window.justiceAPI
          const response = await apiClient.profile.get();
          
          if (response) {
            const profileData = response as {
              name?: string;
              firstName?: string | null;
              lastName?: string | null;
              email?: string | null;
              phone?: string | null;
            };
            
            // Use firstName/lastName if available, otherwise split name
            const fname = profileData.firstName || profileData.name?.split(" ")[0] || "";
            const lname = profileData.lastName || profileData.name?.split(" ").slice(1).join(" ") || "";
            
            setProfileData({
              firstName: fname,
              lastName: lname,
              email: profileData.email || "",
              phone: profileData.phone || "",
            });
          }
        } catch (error) {
          logger.error("Failed to load profile:", { error: error as Error });
        }
      };
      loadProfile();
    }
  }, [isProfileManagerOpen]);

  // Load recent conversations when selected case changes
  React.useEffect(() => {
    const fetchRecentConversations = async () => {
      if (!selectedCaseId) {
        setRecentConversations([]);
        return;
      }

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          return;
        }

        const result = await window.justiceAPI.getRecentConversations(
          sessionId,
          parseInt(selectedCaseId, 10),
          5,
        );

        if (result.success && result.data) {
          setRecentConversations(result.data);
        }
      } catch (error) {
        logger.error("Failed to fetch recent conversations:", {
          error: error as Error,
          metadata: { selectedCaseId },
        });
      }
    };

    fetchRecentConversations();
  }, [selectedCaseId]);

  // Memoized event handlers
  const handleLinkClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (onNavigate) {
        e.preventDefault();
        onNavigate(href);
      }
    },
    [onNavigate],
  );

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Cases",
      href: "/cases",
      badge: notifications.cases,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      name: "Documents",
      href: "/documents",
      badge: notifications.documents,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: "Timeline",
      href: "/timeline",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: "Chat",
      href: "/chat",
      badge: notifications.chat,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className={`flex flex-col h-screen bg-gray-900 border-r border-white/10 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-white">Justice Companion</h1>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 text-white/90 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        )}
      </div>
      {/* Case Selector */}
      {!isCollapsed && onCaseSelect && (
        <div className="px-4 py-3 border-b border-white/10">
          <label
            htmlFor="case-selector"
            className="block text-xs font-medium text-white/70 mb-2"
          >
            Active Case
          </label>
          <select
            id="case-selector"
            value={selectedCaseId || ""}
            onChange={(e) => onCaseSelect(e.target.value || null)}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">No case selected</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Recent Chat History */}
      {!isCollapsed && selectedCaseId && recentConversations.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-medium text-white/70 mb-2">
            Recent Conversations
          </h3>
          <div className="space-y-1">
            {recentConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onNavigate?.("/chat")}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                title={`${conversation.title} - ${conversation.messageCount} messages`}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <span className="flex-1 truncate">{conversation.title}</span>
                  <span className="text-xs text-white/50">
                    {conversation.messageCount}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = currentRoute === item.href;

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary-500/20 text-white border border-primary-500/30"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {!isCollapsed && <span className="flex-1">{item.name}</span>}
                  {!isCollapsed && item.badge && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Profile Button */}
      {user && (
        <div className="border-t border-white/10 p-4">
          {isCollapsed ? (
            /* Collapsed: Circle Badge with Initials */
            <button
              className="relative flex items-center justify-center w-10 h-10 mx-auto bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full text-white font-semibold text-sm hover:from-secondary-400 hover:to-secondary-500 transition-all duration-200 shadow-lg hover:shadow-secondary"
              onClick={() => onNavigate?.("/settings")}
              aria-label={`${user.username} - View profile settings`}
              title={`${user.username}\n${user.email}\nClick for settings`}
            >
              {user.username.substring(0, 2).toUpperCase()}
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full"></span>
            </button>
          ) : (
            /* Expanded: Full Profile Card */
            <div className="space-y-3">
              <button
                onClick={() => setIsProfileManagerOpen(true)}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors w-full text-left"
                aria-label="Open profile manager"
              >
                <div className="relative shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full text-white font-semibold text-sm shadow-lg">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-white/70 truncate">{user.email}</p>
                </div>
                <svg
                  className="w-4 h-4 text-white/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200"
                aria-label="Logout"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
      {/* Profile Quick Menu */}
      {isProfileManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full text-white font-bold text-lg shadow-lg">
                    {profileData?.firstName ? profileData.firstName.substring(0, 1).toUpperCase() : user?.username.substring(0, 1).toUpperCase()}
                    {profileData?.lastName ? profileData.lastName.substring(0, 1).toUpperCase() : user?.username.substring(1, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-gray-900 rounded-full"></span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {profileData?.firstName || profileData?.lastName 
                      ? `${profileData.firstName} ${profileData.lastName}`.trim()
                      : user?.username}
                  </h2>
                  <p className="text-white/70 text-sm">{profileData?.email || user?.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            {profileData && (
              <div className="px-6 py-4 border-b border-gray-700 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">First Name</span>
                  <span className="text-white">{profileData.firstName || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Last Name</span>
                  <span className="text-white">{profileData.lastName || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Email</span>
                  <span className="text-white">{profileData.email || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Phone</span>
                  <span className="text-white">{profileData.phone || "—"}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setIsProfileManagerOpen(false);
                  onNavigate?.("/settings");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 rounded-lg text-white transition-colors"
              >
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Manage Profile</span>
                <svg className="w-4 h-4 ml-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsProfileManagerOpen(false)}
                className="w-full px-4 py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});

// Export the memoized component as the default export
export const Sidebar = SidebarComponent;
