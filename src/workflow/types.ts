/**
 * Workflow Builder - Type Definitions
 *
 * Generic workflow orchestration system for managing development tasks,
 * tracking progress, and coordinating multi-agent workflows.
 */

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  category:
    | "setup"
    | "feature"
    | "testing"
    | "docs"
    | "refactor"
    | "bugfix"
    | "manual";
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  dependencies: string[];
  phase?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string; // For sub-agent assignment
  acceptanceCriteria?: string[];
  files?: string[]; // Files related to this task
  tests?: string[]; // Test files related to this task
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  notes?: string;
}

export interface WorkflowPhase {
  name: string;
  description?: string;
  tasks: WorkflowTask[];
  order: number;
}

export interface WorkflowPlan {
  projectName: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  userGoal?: string;
  techStack: TechStack;
  phases: WorkflowPhase[];
  metadata?: {
    totalTasks: number;
    completedTasks: number;
    estimatedTotalHours?: number;
    actualTotalHours?: number;
  };
}

export interface TechStack {
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  packageManager?: string;
  runtime?: string;
  database?: string[];
  testing?: string[];
}

export interface ProjectStructure {
  root: string;
  directories: string[];
  filesByType: Record<string, number>;
  fileCount: number;
  dirCount: number;
  hasPackageJson: boolean;
  hasReadme: boolean;
  hasGit: boolean;
  hasTsConfig: boolean;
  hasTests: boolean;
}

export interface ProjectAnalysis {
  readme: string;
  structure: ProjectStructure;
  techStack: TechStack;
  libraries: Array<{ name: string; version?: string; ecosystem: string }>;
  scripts: Record<string, string>;
  existingFeatures: string[];
  suggestedImprovements: string[];
}

export interface LocalClaudeConfig {
  version: string;
  projectName: string;
  projectPath: string;
  createdAt: string;
  lastUpdated: string;
  indexed: boolean;
  indexedAt?: string;
  documentCount?: number;
  collectionName?: string;
  context7Enabled: boolean;
  context7Libraries?: Array<{ name: string; ecosystem: string }>;
  activePlan?: string; // Path to active plan JSON
  settings: {
    autoCheckoff: boolean;
    showProgressInPrompt: boolean;
    suggestNextSteps: boolean;
  };
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  filesModified?: string[];
  testsRun?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  duration?: number; // milliseconds
}

export interface AgentContext {
  projectPath: string;
  currentTask?: WorkflowTask;
  plan?: WorkflowPlan;
  config: LocalClaudeConfig;
  availableTools: string[];
  memory: {
    decisions: Array<{
      timestamp: string;
      decision: string;
      reasoning: string;
    }>;
    patterns: Array<{ pattern: string; context: string }>;
    notes: Array<{ timestamp: string; note: string }>;
  };
}

export interface MCPWorkflowState {
  planId: string;
  status: "idle" | "planning" | "executing" | "paused" | "completed" | "failed";
  currentPhaseIndex: number;
  currentTaskId?: string;
  history: Array<{
    timestamp: string;
    action: string;
    taskId?: string;
    result?: string;
  }>;
}

// MCP Tool Call Types
export interface MCPPlanInit {
  projectName: string;
  projectPath: string;
  userGoal: string;
}

export interface MCPPlanAdd {
  taskId: string;
  title: string;
  description: string;
  category: WorkflowTask["category"];
  priority: WorkflowTask["priority"];
  dependencies: string[];
  acceptanceCriteria?: string[];
  phase: string;
}

export interface MCPPlanStatus {
  tasks: Array<{
    id: string;
    title: string;
    status: WorkflowTask["status"];
    phase: string;
  }>;
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    blocked: number;
  };
}

export interface WorkflowSummary {
  lastUpdated: string;
  projectName: string;
  currentPhase: string;
  progress: {
    percentage: number;
    completed: number;
    total: number;
  };
  recentChanges: Array<{
    timestamp: string;
    type: "task_completed" | "task_started" | "task_failed" | "phase_completed";
    details: string;
  }>;
  nextSteps: string[];
}
