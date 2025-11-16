/**
 * Notification Components
 *
 * Export all notification-related components for easy importing.
 *
 * Usage:
 * ```tsx
 * import { NotificationBadge, NotificationCenter, NotificationCard, NotificationPreferences } from '@/components/notifications';
 * ```
 */

export { NotificationBadge } from "./NotificationBadge.tsx";
export { NotificationCenter } from "./NotificationCenter.tsx";
export { NotificationCard } from "./NotificationCard.tsx";
export { NotificationPreferences } from "./NotificationPreferences.tsx";

// Re-export types for convenience
export type {
  Notification,
  NotificationType,
  NotificationSeverity,
  NotificationMetadata,
  NotificationListParams,
  NotificationStats,
  UpdateNotificationPreferencesRequest,
} from "../../lib/types/api.ts";
