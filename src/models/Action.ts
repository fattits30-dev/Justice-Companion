export type ActionPriority = "low" | "medium" | "high" | "urgent";
export type ActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Action {
  id: number;
  caseId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateActionInput {
  caseId: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority: ActionPriority;
}

export interface UpdateActionInput {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: ActionPriority;
  status?: ActionStatus;
}
