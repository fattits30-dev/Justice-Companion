/**
 * NotificationPreferences Component
 *
 * User notification preferences management interface.
 *
 * Features:
 * - Toggle notification types (deadline reminders, case updates, etc.)
 * - Configure deadline reminder threshold (days before)
 * - Toggle sound and desktop notifications
 * - Configure quiet hours with start/end time
 * - Save preferences with validation
 * - Loading and error states
 *
 * Usage:
 * ```tsx
 * <NotificationPreferences sessionId={sessionId} />
 * ```
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  Bell,
  Clock,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient.ts";
import type {
  NotificationPreferences as NotificationPrefs,
  UpdateNotificationPreferencesRequest,
} from "../../lib/types/api.ts";

interface NotificationPreferencesProps {
  /** Session ID for API requests */
  sessionId?: string;
  /** Callback when preferences are saved */
  onSaved?: (preferences: NotificationPrefs) => void;
}

export const NotificationPreferences: React.FC<
  NotificationPreferencesProps
> = ({ sessionId, onSaved }) => {
  // State
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Fetch preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set session ID if provided
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const response = await apiClient.notifications.getPreferences();

      if (response.success && response.data) {
        setPreferences(response.data as NotificationPrefs);
      } else if (!response.success && "error" in response) {
        setError(response.error.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load preferences";
      setError(errorMessage);
      console.error(
        "[NotificationPreferences] Failed to fetch preferences:",
        err,
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Save preferences to API
   */
  const handleSave = async () => {
    if (!preferences) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Set session ID if provided
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      // Validate quiet hours
      if (preferences.quietHoursEnabled) {
        if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
          setError("Please specify both start and end times for quiet hours");
          return;
        }

        // Basic time format validation (HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (
          !timeRegex.test(preferences.quietHoursStart) ||
          !timeRegex.test(preferences.quietHoursEnd)
        ) {
          setError("Quiet hours must be in HH:MM format (e.g., 22:00)");
          return;
        }
      }

      // Validate deadline reminder days
      if (
        preferences.deadlineReminderDays < 1 ||
        preferences.deadlineReminderDays > 90
      ) {
        setError("Deadline reminder days must be between 1 and 90");
        return;
      }

      // Build update request
      const updates: UpdateNotificationPreferencesRequest = {
        deadlineRemindersEnabled: preferences.deadlineRemindersEnabled,
        deadlineReminderDays: preferences.deadlineReminderDays,
        caseUpdatesEnabled: preferences.caseUpdatesEnabled,
        evidenceUpdatesEnabled: preferences.evidenceUpdatesEnabled,
        systemAlertsEnabled: preferences.systemAlertsEnabled,
        soundEnabled: preferences.soundEnabled,
        desktopNotificationsEnabled: preferences.desktopNotificationsEnabled,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      };

      const response = await apiClient.notifications.updatePreferences(updates);

      if (response.success && response.data) {
        setPreferences(response.data as NotificationPrefs);
        setSuccessMessage("Preferences saved successfully");

        // Call callback if provided
        if (onSaved) {
          onSaved(response.data as NotificationPrefs);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else if (!response.success && "error" in response) {
        setError(response.error.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save preferences";
      setError(errorMessage);
      console.error(
        "[NotificationPreferences] Failed to save preferences:",
        err,
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Update preference field
   */
  const updateField = <K extends keyof NotificationPrefs>(
    field: K,
    value: NotificationPrefs[K],
  ) => {
    if (!preferences) {
      return;
    }

    setPreferences({
      ...preferences,
      [field]: value,
    });

    // Clear messages when user makes changes
    setSuccessMessage(null);
    setError(null);
  };

  /**
   * Load preferences on mount
   */
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading preferences...
        </p>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchPreferences}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xs">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Notification Preferences
        </h2>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">
            {successMessage}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Notification Types Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Notification Types
          </h3>
          <div className="space-y-3">
            {/* Deadline Reminders */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.deadlineRemindersEnabled}
                    onChange={(e) =>
                      updateField("deadlineRemindersEnabled", e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deadline Reminders
                  </span>
                </label>
                <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                  Get notified about upcoming deadlines
                </p>
              </div>
              {preferences.deadlineRemindersEnabled && (
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={preferences.deadlineReminderDays}
                    onChange={(e) =>
                      updateField(
                        "deadlineReminderDays",
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-16 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    days before
                  </span>
                </div>
              )}
            </div>

            {/* Case Updates */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.caseUpdatesEnabled}
                  onChange={(e) =>
                    updateField("caseUpdatesEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Case Updates
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                Status changes and important updates
              </p>
            </div>

            {/* Evidence Updates */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.evidenceUpdatesEnabled}
                  onChange={(e) =>
                    updateField("evidenceUpdatesEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Evidence Updates
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                New evidence uploaded or modified
              </p>
            </div>

            {/* System Alerts */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.systemAlertsEnabled}
                  onChange={(e) =>
                    updateField("systemAlertsEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  System Alerts
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                Important system notifications
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Preferences Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Delivery Preferences
          </h3>
          <div className="space-y-3">
            {/* Sound Enabled */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) =>
                    updateField("soundEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {preferences.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sound Notifications
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                Play sound when notifications arrive
              </p>
            </div>

            {/* Desktop Notifications */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.desktopNotificationsEnabled}
                  onChange={(e) =>
                    updateField("desktopNotificationsEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Desktop Notifications
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                Show system notifications on desktop
              </p>
            </div>
          </div>
        </div>

        {/* Quiet Hours Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) =>
                    updateField("quietHoursEnabled", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Quiet Hours
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400 mb-3">
                Mute notifications during specified hours
              </p>

              {preferences.quietHoursEnabled && (
                <div className="ml-6 flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) =>
                        updateField("quietHoursStart", e.target.value)
                      }
                      className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
                    />
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) =>
                        updateField("quietHoursEnd", e.target.value)
                      }
                      className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
