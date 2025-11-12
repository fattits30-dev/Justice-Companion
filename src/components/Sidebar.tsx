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

import React from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.tsx";
import type { ProfileFormData } from "../types/profile.ts";
import { profileService } from "../services/ProfileService.ts";
import { logger } from '../utils/logger';

/**
 * Custom hook for debounced values
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Error Boundary for Profile Operations
 */
class ProfileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(
      "[ProfileErrorBoundary] Profile operation error:",
      error,
      errorInfo,
    );
    toast.error("Profile Error", {
      description:
        "An error occurred while managing your profile. Please try again.",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <h3 className="text-red-200 font-medium mb-2">Profile Error</h3>
          <p className="text-red-100/80 text-sm">
            Something went wrong with the profile manager. Please refresh the
            page and try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const { refreshUser } = useAuth();
  const [isProfileManagerOpen, setIsProfileManagerOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
  });

  // Debounced profile data for validation
  const debouncedProfileData = useDebounce(profileData, 300);

  // Load profile data when dialog opens (only once per open)
  React.useEffect(() => {
    if (isProfileManagerOpen && user && !profileData.email) {
      // Load profile data from service, fallback to splitting username
      const existingProfile = profileService.get();
      if (existingProfile) {
        setProfileData(profileService.profileToFormData(existingProfile));
      } else {
        // Split existing name into first/last if available
        const nameParts = user.username.split(" ");
        setProfileData({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: user.email || "",
          phone: "",
        });
      }
    }
  }, [isProfileManagerOpen, user, profileData.email]);

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

  const handleProfileSave = React.useCallback(async () => {
    // Convert form data to profile data and update via service
    const profileUpdate =
      profileService.formDataToProfile(debouncedProfileData);
    const result = await profileService.update(profileUpdate);

    if (result.success) {
      // Refresh user data in AuthContext to update UI
      await refreshUser();

      // Update local state to reflect changes immediately
      setProfileData(
        profileService.profileToFormData(result.updatedFields || null),
      );

      toast.success("Profile updated", {
        description: "Your changes have been saved locally",
      });
      setIsProfileManagerOpen(false);
    } else {
      toast.error("Profile update failed", {
        description: result.message,
      });
    }
  }, [debouncedProfileData, refreshUser]);
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
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <div className="relative flex-shrink-0">
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

      {/* Profile Manager Dialog */}
      {isProfileManagerOpen && (
        <ProfileErrorBoundary>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4">
              {/* Header */}
              <div className="p-6 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Profile Manager
                    </h2>
                    <p className="text-white/70 mt-1">
                      Manage your personal information
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h3 className="text-white font-medium mb-3">
                      Profile Information
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) =>
                              setProfileData((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) =>
                              setProfileData((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                          Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h3 className="text-blue-200 font-medium mb-2">
                      Privacy & Security
                    </h3>
                    <p className="text-blue-100/80 text-sm">
                      Your profile information is stored locally on your device
                      and is never transmitted to external servers. This ensures
                      your personal data remains private and secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setIsProfileManagerOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white border border-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </ProfileErrorBoundary>
      )}
    </nav>
  );
});

// Export the memoized component as the default export
export const Sidebar = SidebarComponent;
