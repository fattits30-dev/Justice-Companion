/**
 * Deadline Component Types
 *
 * Shared types for deadline UI components
 */

import type {
  Deadline,
  DeadlinePriority,
  DeadlineStatus,
} from "../../lib/types/api.ts";

export type { Deadline, DeadlinePriority, DeadlineStatus };

export interface DeadlineWithDaysInfo extends Deadline {
  daysUntil?: number;
  daysPast?: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

export interface DeadlineCalendarProps {
  caseId?: number;
  onDeadlineClick?: (deadline: Deadline) => void;
  onCreateClick?: (date: Date) => void;
  initialDate?: Date;
}

export interface DeadlineListProps {
  caseId?: number;
  initialFilters?: DeadlineFilters;
  onEdit?: (deadline: Deadline) => void;
  onDelete?: (deadline: Deadline) => void;
  onComplete?: (deadline: Deadline) => void;
}

export interface DeadlineFormProps {
  deadline?: Deadline;
  caseId?: number;
  onSubmit: (data: DeadlineFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface DeadlineWidgetProps {
  limit?: number;
  onClick?: (deadline: Deadline) => void;
  onViewAll?: () => void;
}

export interface DeadlineFilters {
  status?: DeadlineStatus | "all";
  priority?: DeadlinePriority | "all";
  caseId?: number | "all";
  search?: string;
}

export interface DeadlineFormData {
  caseId?: number;
  title: string;
  description?: string;
  deadlineDate: string;
  priority: DeadlinePriority;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
}

export interface DeadlineBadgeProps {
  deadline: Deadline;
  compact?: boolean;
  onClick?: () => void;
}

export interface DeadlinePriorityBadgeProps {
  priority: DeadlinePriority;
  compact?: boolean;
}

export interface DeadlineStatusBadgeProps {
  status: DeadlineStatus;
  compact?: boolean;
}

/**
 * Calendar date cell with deadlines
 */
export interface CalendarDateCell {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  deadlines: Deadline[];
}

/**
 * Priority color configuration
 */
export const PRIORITY_COLORS: Record<
  DeadlinePriority,
  {
    bg: string;
    text: string;
    border: string;
    hover: string;
  }
> = {
  critical: {
    bg: "bg-red-600",
    text: "text-red-600",
    border: "border-red-600",
    hover: "hover:bg-red-700",
  },
  urgent: {
    bg: "bg-red-500",
    text: "text-red-500",
    border: "border-red-500",
    hover: "hover:bg-red-600",
  },
  high: {
    bg: "bg-orange-500",
    text: "text-orange-500",
    border: "border-orange-500",
    hover: "hover:bg-orange-600",
  },
  medium: {
    bg: "bg-blue-500",
    text: "text-blue-500",
    border: "border-blue-500",
    hover: "hover:bg-blue-600",
  },
  low: {
    bg: "bg-gray-400",
    text: "text-gray-400",
    border: "border-gray-400",
    hover: "hover:bg-gray-500",
  },
};

/**
 * Status color configuration
 */
export const STATUS_COLORS: Record<
  DeadlineStatus,
  {
    bg: string;
    text: string;
    border: string;
  }
> = {
  pending: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  upcoming: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  overdue: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  missed: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
  },
};

/**
 * Helper function to calculate days until deadline
 */
export function getDaysUntilDeadline(deadlineDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Helper function to determine if deadline is overdue
 */
export function isDeadlineOverdue(deadline: Deadline): boolean {
  if (deadline.status === "completed") {
    return false;
  }
  return getDaysUntilDeadline(deadline.deadlineDate) < 0;
}

/**
 * Helper function to determine if deadline is urgent (< 7 days)
 */
export function isDeadlineUrgent(deadlineDate: string): boolean {
  const daysUntil = getDaysUntilDeadline(deadlineDate);
  return daysUntil >= 0 && daysUntil <= 7;
}

/**
 * Helper function to format deadline status for display
 */
export function formatDeadlineStatus(deadline: Deadline): string {
  const daysUntil = getDaysUntilDeadline(deadline.deadlineDate);

  if (deadline.status === "completed") {
    return "Completed";
  }

  if (daysUntil < 0) {
    const daysPast = Math.abs(daysUntil);
    return `${daysPast} day${daysPast === 1 ? "" : "s"} overdue`;
  }

  if (daysUntil === 0) {
    return "Due today";
  }

  if (daysUntil === 1) {
    return "Due tomorrow";
  }

  return `${daysUntil} days away`;
}

/**
 * Helper function to format priority for display
 */
export function formatPriority(priority: DeadlinePriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Helper function to enrich deadline with computed fields
 */
export function enrichDeadline(deadline: Deadline): DeadlineWithDaysInfo {
  const daysUntil = getDaysUntilDeadline(deadline.deadlineDate);
  const isOverdue = daysUntil < 0 && deadline.status !== "completed";
  const daysPast = isOverdue ? Math.abs(daysUntil) : 0;

  return {
    ...deadline,
    daysUntil: daysUntil >= 0 ? daysUntil : undefined,
    daysPast: daysPast > 0 ? daysPast : undefined,
    isOverdue,
    isUrgent: isDeadlineUrgent(deadline.deadlineDate),
  };
}
