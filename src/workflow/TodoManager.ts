/**
 * Todo Manager - Task tracking and progress visualization
 *
 * Manages workflow tasks with dependency resolution, progress tracking,
 * and automatic checkoff when tasks are completed.
 */

// @ts-expect-error - Unused import WorkflowPhase - workflow files are WIP
import type { WorkflowTask, WorkflowPlan, WorkflowPhase, TaskExecutionResult } from './types.ts';
import { ConfigManager } from './ConfigManager.ts';

export class TodoManager {
  private configManager: ConfigManager;
  private plan: WorkflowPlan | null = null;
  private currentTask: WorkflowTask | null = null;

  // @ts-expect-error - Unused parameter projectPath - workflow files are WIP
  constructor(private projectPath: string) {
    this.configManager = new ConfigManager(projectPath);
  }

  /**
   * Load plan from file or object
   */
  async loadPlan(plan: WorkflowPlan): Promise<void> {
    this.plan = plan;
    await this.configManager.savePlan(plan);

    const totalTasks = plan.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
    console.log(`✓ Loaded ${totalTasks} tasks from plan\n`);
  }

  /**
   * Get plan from config manager
   */
  async getPlan(): Promise<WorkflowPlan | null> {
    if (!this.plan) {
      this.plan = await this.configManager.loadPlan();
    }
    return this.plan;
  }

  /**
   * Get next pending task with all dependencies completed
   */
  async getNextTask(): Promise<WorkflowTask | null> {
    const plan = await this.getPlan();
    if (!plan) return null;

    for (const phase of plan.phases) {
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          // Check if all dependencies are completed
          const allDepsCompleted = task.dependencies.every((depId) => {
            const depTask = this.getTaskById(depId);
            return depTask && depTask.status === 'completed';
          });

          if (allDepsCompleted) {
            return task;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): WorkflowTask | null {
    if (!this.plan) return null;

    for (const phase of this.plan.phases) {
      for (const task of phase.tasks) {
        if (task.id === taskId) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Start task (mark as in_progress)
   */
  async startTask(taskId: string): Promise<WorkflowTask | null> {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.status = 'in_progress';
    task.startedAt = new Date().toISOString();
    this.currentTask = task;

    await this.savePlan();

    console.log(`\n→ Starting: ${task.title}`);

    return task;
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string, result?: TaskExecutionResult): Promise<WorkflowTask | null> {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    if (task.startedAt) {
      const duration = new Date().getTime() - new Date(task.startedAt).getTime();
      task.actualHours = duration / (1000 * 60 * 60); // Convert to hours
    }

    if (result) {
      task.notes = result.output || task.notes;
      if (result.filesModified) {
        task.files = [...(task.files || []), ...result.filesModified];
      }
    }

    this.currentTask = null;

    await this.savePlan();

    console.log(`\n✓ Completed: ${task.title}`);

    // Show progress
    await this.showProgress();

    // Add to memory
    await this.configManager.addDecision(`Completed task: ${task.title}`, task.description);

    return task;
  }

  /**
   * Fail task
   */
  async failTask(taskId: string, reason: string, error?: string): Promise<WorkflowTask | null> {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.status = 'failed';
    task.failedAt = new Date().toISOString();
    task.notes = `Failed: ${reason}\n${error || ''}`;

    this.currentTask = null;

    await this.savePlan();

    console.log(`\n✗ Failed: ${task.title}`);
    console.log(`  Reason: ${reason}`);

    return task;
  }

  /**
   * Block task (dependencies not met or external blocker)
   */
  async blockTask(taskId: string, reason: string): Promise<WorkflowTask | null> {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.status = 'blocked';
    task.notes = `Blocked: ${reason}`;

    await this.savePlan();

    console.log(`\n⚠ Blocked: ${task.title}`);
    console.log(`  Reason: ${reason}`);

    return task;
  }

  /**
   * Add new task manually
   */
  async addTask(
    title: string,
    description: string,
    phase: string,
    options?: {
      category?: WorkflowTask['category'];
      priority?: WorkflowTask['priority'];
      dependencies?: string[];
      acceptanceCriteria?: string[];
    }
  ): Promise<WorkflowTask> {
    const plan = await this.getPlan();
    if (!plan) throw new Error('No plan loaded');

    // Find or create phase
    let targetPhase = plan.phases.find((p) => p.name === phase);
    if (!targetPhase) {
      targetPhase = {
        name: phase,
        tasks: [],
        order: plan.phases.length + 1,
      };
      plan.phases.push(targetPhase);
    }

    // Generate task ID
    const taskCount = plan.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const taskId = `manual-${taskCount + 1}`;

    const task: WorkflowTask = {
      id: taskId,
      title,
      description,
      category: options?.category || 'manual',
      priority: options?.priority || 'medium',
      status: 'pending',
      dependencies: options?.dependencies || [],
      acceptanceCriteria: options?.acceptanceCriteria,
      phase,
      createdAt: new Date().toISOString(),
    };

    targetPhase.tasks.push(task);

    await this.savePlan();

    console.log(`\n✓ Added task: ${title}`);

    return task;
  }

  /**
   * Show TODO list grouped by phase
   */
  async showTodoList(showAll: boolean = false): Promise<void> {
    const plan = await this.getPlan();
    if (!plan) {
      console.log('No plan loaded');
      return;
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    TODO LIST                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    for (const phase of plan.phases) {
      const phaseTasks = showAll ? phase.tasks : phase.tasks.filter((t) => t.status !== 'completed');

      if (phaseTasks.length === 0) continue;

      console.log(`\n📦 ${phase.name}:`);
      if (phase.description) {
        console.log(`   ${phase.description}`);
      }

      for (const task of phaseTasks) {
        const symbol = this.getStatusSymbol(task.status);
        const priority = this.getPriorityEmoji(task.priority);

        console.log(`  ${symbol} ${task.title} ${priority}`);

        // Show dependencies if pending
        if (task.status === 'pending' && task.dependencies.length > 0) {
          const incompleteDeps = task.dependencies.filter((depId) => {
            const dep = this.getTaskById(depId);
            return dep && dep.status !== 'completed';
          });

          if (incompleteDeps.length > 0) {
            console.log(`     ⏳ Waiting on: ${incompleteDeps.length} dependencies`);
          }
        }

        // Show acceptance criteria if in progress
        if (task.status === 'in_progress' && task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
          console.log(`     ✅ Acceptance criteria:`);
          for (const criteria of task.acceptanceCriteria.slice(0, 2)) {
            console.log(`        - ${criteria}`);
          }
        }
      }
    }

    console.log('');
  }

  /**
   * Show progress summary
   */
  async showProgress(): Promise<void> {
    const plan = await this.getPlan();
    if (!plan) {
      console.log('No plan loaded');
      return;
    }

    const stats = this.calculateStats();

    console.log('\n📊 Progress:');
    console.log(`  ✅ Completed: ${stats.completed}/${stats.total} (${stats.percentage}%)`);

    if (stats.inProgress > 0) {
      console.log(`  ⚙️  In Progress: ${stats.inProgress}`);
    }

    if (stats.failed > 0) {
      console.log(`  ❌ Failed: ${stats.failed}`);
    }

    if (stats.blocked > 0) {
      console.log(`  ⚠️  Blocked: ${stats.blocked}`);
    }

    console.log(`  ⏳ Pending: ${stats.pending}`);

    // Progress bar
    const barWidth = 40;
    const filled = Math.round((stats.completed / stats.total) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    console.log(`\n  [${bar}] ${stats.percentage}%\n`);
  }

  /**
   * Get statistics
   */
  calculateStats(): {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    blocked: number;
    pending: number;
    percentage: number;
  } {
    if (!this.plan) {
      return { total: 0, completed: 0, inProgress: 0, failed: 0, blocked: 0, pending: 0, percentage: 0 };
    }

    const tasks = this.plan.phases.flatMap((phase) => phase.tasks);

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      failed,
      blocked,
      pending,
      percentage,
    };
  }

  /**
   * Get mini progress summary for prompt
   */
  async getMiniProgress(): Promise<string> {
    const stats = this.calculateStats();
    return `[${stats.completed}/${stats.total} ${stats.percentage}%]`;
  }

  /**
   * Get status symbol
   */
  private getStatusSymbol(status: WorkflowTask['status']): string {
    const symbols: Record<WorkflowTask['status'], string> = {
      pending: '☐',
      in_progress: '⚙️',
      completed: '✓',
      failed: '✗',
      blocked: '⚠️',
    };

    return symbols[status] || '?';
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: WorkflowTask['priority']): string {
    const emojis: Record<WorkflowTask['priority'], string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    return emojis[priority] || '';
  }

  /**
   * Save plan to config
   */
  private async savePlan(): Promise<void> {
    if (!this.plan) return;

    this.plan.updatedAt = new Date().toISOString();

    // Update metadata
    const stats = this.calculateStats();
    this.plan.metadata = {
      totalTasks: stats.total,
      completedTasks: stats.completed,
    };

    await this.configManager.savePlan(this.plan);
  }

  /**
   * Get current task
   */
  getCurrentTask(): WorkflowTask | null {
    return this.currentTask;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: WorkflowTask['status']): WorkflowTask[] {
    if (!this.plan) return [];

    return this.plan.phases.flatMap((phase) => phase.tasks).filter((task) => task.status === status);
  }

  /**
   * Get tasks by phase
   */
  getTasksByPhase(phaseName: string): WorkflowTask[] {
    if (!this.plan) return [];

    const phase = this.plan.phases.find((p) => p.name === phaseName);
    return phase ? phase.tasks : [];
  }

  /**
   * Check if plan is complete
   */
  isPlanComplete(): boolean {
    const stats = this.calculateStats();
    return stats.completed === stats.total && stats.total > 0;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    return this.calculateStats().percentage;
  }
}
