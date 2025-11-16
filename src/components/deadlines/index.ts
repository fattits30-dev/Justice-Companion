/**
 * Deadlines Components
 *
 * Exports all deadline-related UI components
 */

export { DeadlineBadge } from "./DeadlineBadge.tsx";
export { DeadlinePriorityBadge } from "./DeadlinePriorityBadge.tsx";
export { DeadlineStatusBadge } from "./DeadlineStatusBadge.tsx";
export { DeadlineWidget } from "./DeadlineWidget.tsx";

// Re-export types for convenience
export type {
  Deadline,
  DeadlinePriority,
  DeadlineStatus,
  DeadlineWithDaysInfo,
  DeadlineWidgetProps,
  DeadlineBadgeProps,
  DeadlinePriorityBadgeProps,
  DeadlineStatusBadgeProps,
} from "./types.ts";

export {
  PRIORITY_COLORS,
  STATUS_COLORS,
  getDaysUntilDeadline,
  isDeadlineOverdue,
  isDeadlineUrgent,
  formatDeadlineStatus,
  formatPriority,
  enrichDeadline,
} from "./types.ts";
