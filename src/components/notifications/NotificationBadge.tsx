/**
 * NotificationBadge Component
 *
 * Displays unread notification count badge in the header.
 *
 * Features:
 * - Real-time unread count polling (30s interval)
 * - Click to open notification center
 * - Visual badge with count (hidden if 0)
 * - Auto-refresh on mount
 * - Error handling with fallback
 *
 * Usage:
 * ```tsx
 * <NotificationBadge onClick={() => setShowCenter(true)} />
 * ```
 */

import React, { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { apiClient } from "../../lib/apiClient.ts";

interface NotificationBadgeProps {
  /** Callback when badge is clicked */
  onClick: () => void;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollingInterval?: number;
  /** Session ID for API requests */
  sessionId?: string;
  /** Custom className for styling */
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onClick,
  pollingInterval = 30000,
  sessionId,
  className = "",
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch unread notification count from API
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set session ID if provided
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const response = await apiClient.notifications.getUnreadCount();

      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      } else if (!response.success && "error" in response) {
        setError(response.error.message);
        console.error("[NotificationBadge] API error:", response.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch notification count";
      setError(errorMessage);
      console.error("[NotificationBadge] Failed to fetch unread count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Setup polling interval on mount
   */
  useEffect(() => {
    // Fetch immediately on mount
    fetchUnreadCount();

    // Setup polling interval
    const interval = setInterval(fetchUnreadCount, pollingInterval);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollingInterval]);

  /**
   * Handle badge click
   */
  const handleClick = () => {
    onClick();
    // Optionally refresh count after opening
    fetchUnreadCount();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors ${className}`}
      title={error ? `Error: ${error}` : `${unreadCount} unread notifications`}
      aria-label={`Notifications. ${unreadCount} unread.`}
    >
      {/* Bell Icon */}
      <Bell
        className={`h-6 w-6 ${error ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}
      />

      {/* Unread Count Badge */}
      {unreadCount > 0 && !error && (
        <span
          className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
          aria-live="polite"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <span
          className="absolute top-0 right-0 inline-block w-2 h-2 transform translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full animate-pulse"
          aria-label="Loading notifications"
        />
      )}

      {/* Error Indicator */}
      {error && (
        <span
          className="absolute top-0 right-0 inline-block w-2 h-2 transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
          aria-label="Error loading notifications"
        />
      )}
    </button>
  );
};

export default NotificationBadge;
