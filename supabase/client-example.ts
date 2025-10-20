/**
 * Supabase AI Project Management Client
 * TypeScript helpers for AI task breakdown and GitHub sync
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// Type Definitions
// =============================================================================

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  task_type: 'task' | 'bug' | 'feature' | 'enhancement' | 'documentation' | 'research' | 'chore';
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'testing' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  story_points: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  ai_generated: boolean;
  ai_complexity_score: number | null;
  ai_breakdown_parent: boolean;
  ai_suggestions: string | null;
  ai_dependencies: string[] | null;
  depends_on: string[] | null;
  blocks: string[] | null;
  related_to: string[] | null;
  github_issue_number: number | null;
  github_issue_url: string | null;
  github_synced_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface AIBreakdownRequest {
  projectId: string;
  taskDescription: string;
  taskType?: 'feature' | 'bug' | 'enhancement' | 'research';
  context?: string;
  maxSubtasks?: number;
}

interface AIBreakdownResponse {
  success: boolean;
  planningSessionId: string;
  parentTask: {
    id: string;
    title: string;
    totalSubtasks: number;
    totalEstimatedHours: number;
    totalStoryPoints: number;
  };
  subtasks: Task[];
  aiResponse: {
    model: string;
    tokensUsed: number;
  };
}

interface GitHubSyncRequest {
  action: 'sync_to_github' | 'sync_from_github' | 'sync_all';
  taskId?: string;
  issueNumber?: number;
  owner: string;
  repo: string;
}

// =============================================================================
// API Client
// =============================================================================

export class AIProjectManager {
  private supabase = supabase;
  private functionsUrl = `${supabaseUrl}/functions/v1`;

  // ===========================================================================
  // Projects
  // ===========================================================================

  async createProject(data: {
    name: string;
    description?: string;
    status?: Project['status'];
    priority?: Project['priority'];
    startDate?: string;
    targetDate?: string;
  }): Promise<Project> {
    const { data: project, error } = await this.supabase
      .from('projects')
      .insert({
        name: data.name,
        description: data.description,
        status: data.status || 'planning',
        priority: data.priority || 'medium',
        start_date: data.startDate,
        target_date: data.targetDate,
      })
      .select()
      .single();

    if (error) throw error;
    return project;
  }

  async getProject(projectId: string): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  async listProjects(status?: Project['status']): Promise<Project[]> {
    let query = this.supabase.from('projects').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getProjectProgress(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  // ===========================================================================
  // Tasks
  // ===========================================================================

  async createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    taskType?: Task['task_type'];
    priority?: Task['priority'];
    estimatedHours?: number;
    storyPoints?: number;
    dueDate?: string;
  }): Promise<Task> {
    const { data: task, error } = await this.supabase
      .from('tasks')
      .insert({
        project_id: data.projectId,
        title: data.title,
        description: data.description,
        task_type: data.taskType || 'task',
        priority: data.priority || 'medium',
        estimated_hours: data.estimatedHours,
        story_points: data.storyPoints,
        due_date: data.dueDate,
        status: 'todo',
      })
      .select()
      .single();

    if (error) throw error;
    return task;
  }

  async getTask(taskId: string): Promise<Task> {
    const { data, error } = await this.supabase.from('tasks').select('*').eq('id', taskId).single();

    if (error) throw error;
    return data;
  }

  async listTasks(
    projectId: string,
    filters?: {
      status?: Task['status'];
      aiGenerated?: boolean;
    }
  ): Promise<Task[]> {
    let query = this.supabase.from('tasks').select('*').eq('project_id', projectId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.aiGenerated !== undefined) {
      query = query.eq('ai_generated', filters.aiGenerated);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async searchTasks(query: string): Promise<Task[]> {
    const { data, error } = await this.supabase.rpc('search_tasks', {
      search_query: query,
    });

    if (error) throw error;
    return data;
  }

  async getTaskHierarchy(projectId: string) {
    const { data, error } = await this.supabase
      .from('task_hierarchy')
      .select('*, tasks!inner(*)')
      .eq('tasks.project_id', projectId)
      .order('path');

    if (error) throw error;
    return data;
  }

  async getOverdueTasks(projectId?: string) {
    let query = this.supabase.from('overdue_tasks').select('*');

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.order('days_overdue', { ascending: false });

    if (error) throw error;
    return data;
  }

  // ===========================================================================
  // AI Task Breakdown
  // ===========================================================================

  async generateAITaskBreakdown(request: AIBreakdownRequest): Promise<AIBreakdownResponse> {
    const response = await fetch(`${this.functionsUrl}/ai-task-breakdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AI breakdown failed: ${error.error}`);
    }

    return response.json();
  }

  async getAIPlanningHistory(projectId: string) {
    const { data, error } = await this.supabase
      .from('ai_planning_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAITaskSummary(projectId: string) {
    const { data, error } = await this.supabase
      .from('ai_task_summary')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  // ===========================================================================
  // GitHub Integration
  // ===========================================================================

  async syncToGitHub(taskId: string, owner: string, repo: string) {
    const response = await fetch(`${this.functionsUrl}/github-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'sync_to_github',
        taskId,
        owner,
        repo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub sync failed: ${error.error}`);
    }

    return response.json();
  }

  async syncFromGitHub(issueNumber: number, owner: string, repo: string) {
    const response = await fetch(`${this.functionsUrl}/github-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'sync_from_github',
        issueNumber,
        owner,
        repo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub sync failed: ${error.error}`);
    }

    return response.json();
  }

  async syncAllFromGitHub(owner: string, repo: string) {
    const response = await fetch(`${this.functionsUrl}/github-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'sync_all',
        owner,
        repo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub sync failed: ${error.error}`);
    }

    return response.json();
  }

  // ===========================================================================
  // Labels
  // ===========================================================================

  async createLabel(projectId: string, name: string, color: string, description?: string) {
    const { data, error } = await this.supabase
      .from('labels')
      .insert({
        project_id: projectId,
        name,
        color,
        description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addLabelToTask(taskId: string, labelId: string) {
    const { data, error } = await this.supabase
      .from('task_labels')
      .insert({
        task_id: taskId,
        label_id: labelId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ===========================================================================
  // Comments
  // ===========================================================================

  async addComment(taskId: string, author: string, content: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        task_id: taskId,
        author,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTaskComments(taskId: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

export async function exampleUsage() {
  const client = new AIProjectManager();

  // 1. Create a project
  const project = await client.createProject({
    name: 'Justice Companion v2.0',
    description: 'Next major release with AI improvements',
    status: 'active',
    priority: 'high',
  });

  console.warn('Created project:', project.id);

  // 2. Generate AI task breakdown
  const aiBreakdown = await client.generateAITaskBreakdown({
    projectId: project.id,
    taskDescription: 'Implement end-to-end encryption for case data',
    taskType: 'feature',
    context: `
      - Current encryption: AES-256-GCM for sensitive fields
      - Goal: Encrypt entire case database
      - Must maintain search capabilities
      - Need key rotation support
      - Zero-knowledge architecture
    `,
    maxSubtasks: 12,
  });

  console.warn(`AI generated ${aiBreakdown.subtasks.length} subtasks!`);
  console.warn(`Total estimate: ${aiBreakdown.parentTask.totalEstimatedHours} hours`);

  // 3. List AI-generated tasks
  const aiTasks = await client.listTasks(project.id, { aiGenerated: true });
  console.warn(`Found ${aiTasks.length} AI-generated tasks`);

  // 4. Sync to GitHub
  const syncResult = await client.syncToGitHub(
    aiBreakdown.parentTask.id,
    'your-username',
    'Justice-Companion'
  );
  console.warn(`Synced to GitHub issue #${syncResult.result.githubIssueNumber}`);

  // 5. Get project progress
  const progress = await client.getProjectProgress(project.id);
  console.warn(`Project is ${progress.completion_percentage}% complete`);

  // 6. Search tasks
  const searchResults = await client.searchTasks('encryption security');
  console.warn(`Found ${searchResults.length} matching tasks`);
}

// Export singleton instance
export const aiProjectManager = new AIProjectManager();
