/**
 * Deadline Model - Timeline Tracker
 *
 * Represents a legal deadline or milestone event
 * Used for tracking important dates in employment law cases
 */

export interface Deadline {
  id: number;
  caseId: number;
  userId: number;
  title: string;
  description?: string | null;
  deadlineDate: string; // ISO 8601 date (YYYY-MM-DD)
  priority: "low" | "medium" | "high" | "critical";
  status: "upcoming" | "overdue" | "completed";
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateDeadlineInput {
  caseId: number;
  userId: number;
  title: string;
  description?: string;
  deadlineDate: string; // ISO 8601 date (YYYY-MM-DD)
  priority?: "low" | "medium" | "high" | "critical";
}

export interface UpdateDeadlineInput {
  title?: string;
  description?: string | null;
  deadlineDate?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "upcoming" | "overdue" | "completed";
}

/**
 * Deadline with associated case information
 * Used for timeline view
 */
export interface DeadlineWithCase extends Deadline {
  caseTitle: string;
  caseStatus: "active" | "pending" | "closed";
}

/**
 * Priority levels for deadlines
 */
export const DeadlinePriority = {
  CRITICAL: "critical" as const,
  HIGH: "high" as const,
  MEDIUM: "medium" as const,
  LOW: "low" as const,
};

/**
 * Status values for deadlines
 */
export const DeadlineStatus = {
  UPCOMING: "upcoming" as const,
  OVERDUE: "overdue" as const,
  COMPLETED: "completed" as const,
};

/**
 * Helper to calculate days until/past deadline
 */
export function getDaysUntilDeadline(deadlineDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0); // Start of deadline day

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Helper to determine if deadline is urgent (< 7 days)
 */
export function isDeadlineUrgent(deadlineDate: string): boolean {
  const daysUntil = getDaysUntilDeadline(deadlineDate);
  return daysUntil >= 0 && daysUntil <= 7;
}

/**
 * Helper to format deadline status for display
 */
export function formatDeadlineStatus(deadline: Deadline): string {
  const daysUntil = getDaysUntilDeadline(deadline.deadlineDate);

  if (deadline.status === "completed") {
    return "Completed";
  }

  if (deadline.status === "overdue") {
    const daysPast = Math.abs(daysUntil);
    return `Overdue by ${daysPast} day${daysPast === 1 ? "" : "s"}`;
  }

  if (daysUntil === 0) {
    return "Due today";
  }

  if (daysUntil === 1) {
    return "Due tomorrow";
  }

  if (daysUntil < 0) {
    const daysPast = Math.abs(daysUntil);
    return `${daysPast} day${daysPast === 1 ? "" : "s"} overdue`;
  }

  return `${daysUntil} days away`;
}
