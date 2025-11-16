/**
 * Deadline Dependency Domain Entity
 * Wave 6 Task 3: Timeline Gantt Chart
 *
 * Represents a dependency relationship between two deadlines for Gantt chart visualization
 */

export type DependencyType =
  | "finish-to-start"
  | "start-to-start"
  | "finish-to-finish"
  | "start-to-finish";

export interface DeadlineDependency {
  id: number;
  sourceDeadlineId: number;
  targetDeadlineId: number;
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: string;
  createdBy: number | null;
}

export interface CreateDeadlineDependencyInput {
  sourceDeadlineId: number;
  targetDeadlineId: number;
  dependencyType: DependencyType;
  lagDays?: number;
  createdBy?: number;
}

export interface UpdateDeadlineDependencyInput {
  dependencyType?: DependencyType;
  lagDays?: number;
}

/**
 * Extended Deadline with dependency information for Gantt chart
 */
export interface DeadlineWithDependencies {
  id: number;
  caseId: number;
  userId: number;
  title: string;
  description?: string | null;
  deadlineDate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "upcoming" | "overdue" | "completed";
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Additional UI metadata
  caseTitle?: string; // Optional case title for Gantt chart display

  // Dependency information
  dependencies: DeadlineDependency[]; // Outgoing dependencies (this deadline depends on...)
  dependents: DeadlineDependency[]; // Incoming dependencies (other deadlines depend on this)
  dependenciesCount: number;
  dependentsCount: number;
}
