/**
 * NotificationCard Component
 *
 * Displays a single notification with actions.
 *
 * Features:
 * - Priority-based color coding (urgent=red, high=orange, medium=blue, low=gray)
 * - Mark as read action
 * - Delete (dismiss) action
 * - Click to navigate to related entity
 * - Relative time display
 * - Icon based on notification type
 *
 * Usage:
 * ```tsx
 * <NotificationCard
 *   notification={notification}
 *   onMarkAsRead={handleMarkAsRead}
 *   onDelete={handleDelete}
 *   onClick={handleClick}
 * />
 * ```
 */

import React from "react";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  FileText,
  FolderOpen,
  Upload,
  Info,
  Trash2,
} from "lucide-react";
import type { Notification } from "../../lib/types/api.ts";
import { formatDistanceToNow } from "date-fns";

interface NotificationCardProps {
  /** Notification data */
  notification: Notification;
  /** Callback when notification is clicked */
  onClick?: (notification: Notification) => void;
  /** Callback when mark as read is clicked */
  onMarkAsRead: (id: number) => void;
  /** Callback when delete is clicked */
  onDelete: (id: number) => void;
  /** Show actions (default: true) */
  showActions?: boolean;
}

/**
 * Get icon component based on notification type
 */
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "deadline_reminder":
      return Bell;
    case "case_status_change":
      return FolderOpen;
    case "evidence_uploaded":
      return Upload;
    case "document_updated":
      return FileText;
    case "system_alert":
      return AlertCircle;
    case "system_warning":
      return AlertCircle;
    case "system_info":
      return Info;
    default:
      return Bell;
  }
};

/**
 * Get color classes based on severity
 */
const getSeverityColors = (severity: string) => {
  switch (severity) {
    case "urgent":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-600 dark:text-red-400",
        badge: "bg-red-600 text-white",
      };
    case "high":
      return {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        border: "border-orange-200 dark:border-orange-800",
        icon: "text-orange-600 dark:text-orange-400",
        badge: "bg-orange-600 text-white",
      };
    case "medium":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
        badge: "bg-blue-600 text-white",
      };
    case "low":
      return {
        bg: "bg-gray-50 dark:bg-gray-800",
        border: "border-gray-200 dark:border-gray-700",
        icon: "text-gray-600 dark:text-gray-400",
        badge: "bg-gray-600 text-white",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-800",
        border: "border-gray-200 dark:border-gray-700",
        icon: "text-gray-600 dark:text-gray-400",
        badge: "bg-gray-600 text-white",
      };
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp: string): string => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Recently";
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  showActions = true,
}) => {
  const Icon = getNotificationIcon(notification.type);
  const colors = getSeverityColors(notification.severity);

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border
        ${colors.bg}
        ${colors.border}
        ${!notification.isRead ? "font-medium" : "font-normal"}
        ${onClick ? "cursor-pointer hover:shadow-md" : ""}
        transition-all duration-200
      `}
    >
      {/* Unread Indicator */}
      {!notification.isRead && (
        <div className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full" />
      )}

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`p-2 rounded-full ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {notification.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {formatRelativeTime(notification.createdAt)}
              </p>
            </div>

            {/* Severity Badge */}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.badge}`}
            >
              {notification.severity}
            </span>
          </div>

          {/* Message */}
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {notification.message}
          </p>

          {/* Action Link */}
          {notification.actionUrl && notification.actionLabel && (
            <div className="mt-2">
              <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {notification.actionLabel} →
              </span>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 mt-3">
              {!notification.isRead && (
                <button
                  onClick={handleMarkAsRead}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle className="h-3 w-3" />
                  Mark as read
                </button>
              )}

              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                title="Delete notification"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
