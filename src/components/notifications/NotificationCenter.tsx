/**
 * NotificationCenter Component
 *
 * Full-featured notification management interface.
 *
 * Features:
 * - List all notifications with pagination
 * - Filter by unread/all
 * - Filter by type and severity
 * - Mark individual notification as read
 * - Mark all as read (bulk action)
 * - Delete individual notification
 * - Click notification to navigate to related entity
 * - Loading states and error handling
 * - Empty states
 *
 * Usage:
 * ```tsx
 * <NotificationCenter
 *   sessionId={sessionId}
 *   onNotificationClick={(notification) => navigate(notification.actionUrl)}
 * />
 * ```
 */

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Filter,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient.ts";
import type {
  Notification,
  NotificationType,
  NotificationSeverity,
} from "../../lib/types/api.ts";
import { NotificationCard } from "./NotificationCard.tsx";

interface NotificationCenterProps {
  /** Session ID for API requests */
  sessionId?: string;
  /** Callback when notification is clicked */
  onNotificationClick?: (notification: Notification) => void;
  /** Maximum items to load per page (default: 50) */
  pageSize?: number;
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  sessionId,
  onNotificationClick,
  pageSize = 50,
  refreshInterval = 30000,
}) => {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<
    NotificationSeverity | "all"
  >("all");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Pagination
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = async (reset: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Set session ID if provided
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const currentOffset = reset ? 0 : offset;

      const response = await apiClient.notifications.list({
        unreadOnly: filterUnread,
        type: filterType !== "all" ? filterType : undefined,
        severity: filterSeverity !== "all" ? filterSeverity : undefined,
        limit: pageSize,
        offset: currentOffset,
        includeExpired: false,
        includeDismissed: false,
      });

      if (response.success && Array.isArray(response.data)) {
        if (reset) {
          setNotifications(response.data);
          setOffset(0);
        } else {
          setNotifications((prev) => [...prev, ...response.data]);
        }

        // Check if there are more items
        setHasMore(response.data.length === pageSize);
      } else if (!response.success && "error" in response) {
        setError(response.error.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load notifications";
      setError(errorMessage);
      console.error("[NotificationCenter] Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = async (id: number) => {
    try {
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const response = await apiClient.notifications.markAsRead(id);

      if (response.success) {
        // Update local state optimistically
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif,
          ),
        );
      }
    } catch (err) {
      console.error("[NotificationCenter] Failed to mark as read:", err);
      // Optionally show error toast
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const response = await apiClient.notifications.markAllAsRead();

      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
        );

        // Show success message (optional)
        console.log(
          `Marked ${response.data?.count || 0} notifications as read`,
        );
      }
    } catch (err) {
      console.error("[NotificationCenter] Failed to mark all as read:", err);
      // Optionally show error toast
    }
  };

  /**
   * Delete notification
   */
  const handleDelete = async (id: number) => {
    try {
      if (sessionId) {
        apiClient.setSessionId(sessionId);
      }

      const response = await apiClient.notifications.delete(id);

      if (response.success) {
        // Remove from local state
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }
    } catch (err) {
      console.error("[NotificationCenter] Failed to delete notification:", err);
      // Optionally show error toast
    }
  };

  /**
   * Handle notification click
   */
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Call external handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  /**
   * Load more notifications (pagination)
   */
  const handleLoadMore = () => {
    setOffset((prev) => prev + pageSize);
  };

  /**
   * Reset filters
   */
  const handleResetFilters = () => {
    setFilterUnread(false);
    setFilterType("all");
    setFilterSeverity("all");
    setOffset(0);
  };

  /**
   * Setup data fetching
   */
  useEffect(() => {
    fetchNotifications(true);
  }, [filterUnread, filterType, filterSeverity, sessionId]);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, filterUnread, filterType, filterSeverity, sessionId]);

  /**
   * Fetch more when offset changes
   */
  useEffect(() => {
    if (offset > 0) {
      fetchNotifications(false);
    }
  }, [offset]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mark All as Read Button */}
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-colors ${
              showFilters
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            title="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            {/* Unread Filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterUnread}
                onChange={(e) => setFilterUnread(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Unread only
              </span>
            </label>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Type:
              </label>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as NotificationType | "all")
                }
                className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1"
              >
                <option value="all">All</option>
                <option value="deadline_reminder">Deadline Reminder</option>
                <option value="case_status_change">Case Status Change</option>
                <option value="evidence_uploaded">Evidence Uploaded</option>
                <option value="document_updated">Document Updated</option>
                <option value="system_alert">System Alert</option>
                <option value="system_warning">System Warning</option>
                <option value="system_info">System Info</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Severity:
              </label>
              <select
                value={filterSeverity}
                onChange={(e) =>
                  setFilterSeverity(
                    e.target.value as NotificationSeverity | "all",
                  )
                }
                className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading State */}
        {isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading notifications...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchNotifications(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Bell className="h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filterUnread
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            {(filterType !== "all" || filterSeverity !== "all") && (
              <button
                onClick={handleResetFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        {!error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && !error && hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              Load more
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {isLoading && notifications.length > 0 && (
          <div className="flex justify-center mt-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
