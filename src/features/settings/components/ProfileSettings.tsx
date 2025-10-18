/**
 * ProfileSettings Component
 *
 * Extracted from SettingsView.tsx for better modularity and testability.
 * Handles user profile management and password changes with comprehensive
 * validation and error handling.
 *
 * Features:
 * - Profile viewing and editing (name, email)
 * - Password change with OWASP-compliant validation
 * - Loading states and error handling
 * - Memory leak prevention with proper cleanup
 */

import { SkeletonText } from '@/components/ui/Skeleton';
import { LoadingSpinner } from '@/components/ui/Spinner';
import { Shield, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '@/models/UserProfile';
import { validatePasswordChange } from '@/utils/passwordValidation';

/**
 * Toast notification interface for displaying success and error messages
 */
interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Props for the ProfileSettings component
 */
interface ProfileSettingsProps {
  /** Toast notification handler */
  toast: Toast;
}

/**
 * Props for the SettingsSection component
 */
interface SettingsSectionProps {
  /** Icon component to display in the section header */
  icon: React.ComponentType<{ className?: string }>;
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Section content */
  children: React.ReactNode;
}

/**
 * Reusable settings section with icon, title, and description
 *
 * @param props - Section properties including icon, title, description, and children
 * @returns Styled settings section container
 */
function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-slate-900/30 border border-blue-700/20 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="h-5 w-5 text-blue-400" />
        <div>
          <h3 className="text-base font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * Props for the SettingItem component
 */
interface SettingItemProps {
  /** Item label */
  label: string;
  /** Item value to display */
  value: string;
  /** Action button text (optional) */
  action?: string;
  /** Action button click handler (optional) */
  onAction?: () => void;
  /** Whether this is an info-only item with no action button */
  info?: boolean;
}

/**
 * Reusable setting item with label, value, and optional action button
 *
 * @param props - Item properties including label, value, and optional action
 * @returns Styled setting item row
 */
function SettingItem({ label, value, action, onAction, info }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
      <div className="flex-1">
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-xs text-slate-300 mt-0.5">{value}</p>
      </div>
      {action && onAction && !info && (
        <button
          onClick={onAction}
          className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * Main ProfileSettings component for managing user profile and password changes
 *
 * @param props - Component props including toast notifications
 * @returns ProfileSettings component JSX
 */
export function ProfileSettings({ toast }: ProfileSettingsProps): JSX.Element {
  // User Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Refs for timeout cleanup (prevent memory leaks)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Resets the password change form to initial state
   */
  const resetPasswordForm = (): void => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
  };

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      if (!window.justiceAPI) {
        setIsLoadingProfile(false);
        toast.error('Failed to load profile: API not available');
        return;
      }

      setIsLoadingProfile(true);
      try {
        const result = await window.justiceAPI.getUserProfile();
        if (result.success && result.data) {
          setUserProfile(result.data);
          setEditedName(result.data.name ?? '');
          setEditedEmail(result.data.email ?? '');
        } else {
          toast.error('Failed to load profile');
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();

    // Cleanup timeout on unmount to prevent memory leaks
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [toast]);

  /**
   * Handles saving profile changes (name and email)
   *
   * @returns Promise that resolves when profile update completes or fails
   */
  const handleSaveProfile = async (): Promise<void> => {
    if (!window.justiceAPI) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const result = await window.justiceAPI.updateUserProfile({
        name: editedName,
        email: editedEmail,
      });

      if (result.success && result.data) {
        setUserProfile(result.data);
        setIsEditingProfile(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  /**
   * Handles password change with validation and API call
   *
   * @returns Promise that resolves when password change completes or fails
   */
  const handleChangePassword = async (): Promise<void> => {
    setPasswordError(null);

    // Validate password change request
    const validation = validatePasswordChange(oldPassword, newPassword, confirmNewPassword);
    if (!validation.isValid) {
      setPasswordError(validation.error || 'Password validation failed');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const result = await window.justiceAPI.changePassword(
        oldPassword,
        newPassword,
      );

      if (result.success) {
        toast.success('Password changed successfully! Please login again.');
        resetPasswordForm();
        setIsChangingPassword(false);
        // User will be logged out automatically
      } else {
        setPasswordError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <SettingsSection icon={User} title="Profile" description="Manage your personal information">
        {isLoadingProfile ? (
          <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
            <SkeletonText lines={2} />
            <span className="sr-only">Loading profile...</span>
          </div>
        ) : isEditingProfile ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-white mb-1">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                placeholder="Enter your name"
                disabled={isSavingProfile}
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-xs font-medium text-white mb-1">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                placeholder="Enter your email"
                disabled={isSavingProfile}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleSaveProfile()}
                disabled={isSavingProfile}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <button
                onClick={() => {
                  setIsEditingProfile(false);
                  setEditedName(userProfile?.name ?? '');
                  setEditedEmail(userProfile?.email ?? '');
                }}
                disabled={isSavingProfile}
                className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <SettingItem
              label="Name"
              value={userProfile?.name ?? 'Not set'}
              action="Edit Profile"
              onAction={() => setIsEditingProfile(true)}
            />
            <SettingItem
              label="Email"
              value={userProfile?.email ?? 'Not set'}
              action="Edit Profile"
              onAction={() => setIsEditingProfile(true)}
            />
          </>
        )}
      </SettingsSection>

      {/* Account Security */}
      <SettingsSection
        icon={Shield}
        title="Account Security"
        description="Manage your account password"
      >
        {!isChangingPassword ? (
          <button
            onClick={() => setIsChangingPassword(true)}
            className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
          >
            Change Password
          </button>
        ) : (
          <div className="space-y-3">
            {passwordError && (
              <div
                className="px-3 py-2 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-xs"
                role="alert"
              >
                {passwordError}
              </div>
            )}
            <div>
              <label htmlFor="current-password" className="block text-xs font-medium text-white mb-1">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                placeholder="Enter current password"
                disabled={isSubmittingPassword}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-white mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                placeholder="At least 12 characters"
                disabled={isSubmittingPassword}
              />
              <p className="text-xs text-slate-300 mt-1">
                12+ chars, uppercase, lowercase, number
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-white mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                placeholder="Re-enter new password"
                disabled={isSubmittingPassword}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleChangePassword()}
                disabled={isSubmittingPassword}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmittingPassword ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Changing...</span>
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  resetPasswordForm();
                }}
                disabled={isSubmittingPassword}
                className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
