// GitHub Issue Sync Edge Function
// Syncs tasks between Supabase and GitHub Issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Octokit } from 'https://esm.sh/@octokit/rest@19.0.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: 'sync_to_github' | 'sync_from_github' | 'sync_all';
  taskId?: string;
  issueNumber?: number;
  owner: string;
  repo: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const octokit = new Octokit({ auth: githubToken });

    // Parse request
    const body: SyncRequest = await req.json();
    const { action, taskId, issueNumber, owner, repo } = body;

    // Validate input
    if (!owner || !repo) {
      return new Response(JSON.stringify({ error: 'Missing required fields: owner, repo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'sync_to_github':
        result = await syncTaskToGitHub(supabase, octokit, taskId!, owner, repo);
        break;

      case 'sync_from_github':
        result = await syncIssueToTask(supabase, octokit, issueNumber!, owner, repo);
        break;

      case 'sync_all':
        result = await syncAll(supabase, octokit, owner, repo);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in github-sync function:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper: Sync Supabase task to GitHub issue
async function syncTaskToGitHub(
  supabase: any,
  octokit: any,
  taskId: string,
  owner: string,
  repo: string
) {
  // Get task from Supabase
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, task_labels(label:labels(name, color))')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Prepare GitHub issue data
  const issueData = {
    title: task.title,
    body: formatTaskDescription(task),
    labels: task.task_labels?.map((tl: any) => tl.label.name) || [],
    assignees: task.assignee ? [task.assignee] : [],
    milestone: undefined, // TODO: Map milestones
  };

  let githubIssue;

  if (task.github_issue_number) {
    // Update existing issue
    githubIssue = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: task.github_issue_number,
      ...issueData,
    });
  } else {
    // Create new issue
    githubIssue = await octokit.rest.issues.create({
      owner,
      repo,
      ...issueData,
    });

    // Update task with GitHub issue info
    await supabase
      .from('tasks')
      .update({
        github_issue_number: githubIssue.data.number,
        github_issue_url: githubIssue.data.html_url,
        github_synced_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }

  return {
    taskId,
    githubIssueNumber: githubIssue.data.number,
    githubIssueUrl: githubIssue.data.html_url,
  };
}

// Helper: Sync GitHub issue to Supabase task
async function syncIssueToTask(
  supabase: any,
  octokit: any,
  issueNumber: number,
  owner: string,
  repo: string
) {
  // Get issue from GitHub
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // Check if task already exists
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id')
    .eq('github_issue_number', issueNumber)
    .single();

  const taskData = {
    title: issue.title,
    description: issue.body || '',
    task_type: mapGitHubLabelsToTaskType(issue.labels),
    status: mapGitHubStateToStatus(issue.state),
    priority: mapGitHubLabelsToPriority(issue.labels),
    assignee: issue.assignee?.login,
    github_issue_number: issueNumber,
    github_issue_url: issue.html_url,
    github_synced_at: new Date().toISOString(),
  };

  if (existingTask) {
    // Update existing task
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', existingTask.id)
      .select()
      .single();

    if (error) throw error;

    return { action: 'updated', taskId: updatedTask.id, issueNumber };
  } else {
    // Create new task
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;

    return { action: 'created', taskId: newTask.id, issueNumber };
  }
}

// Helper: Sync all issues and tasks
async function syncAll(supabase: any, octokit: any, owner: string, repo: string) {
  // Get all open issues from GitHub
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });

  const syncResults = [];

  for (const issue of issues) {
    try {
      const result = await syncIssueToTask(supabase, octokit, issue.number, owner, repo);
      syncResults.push(result);
    } catch (error) {
      console.error(`Failed to sync issue #${issue.number}:`, error);
      syncResults.push({
        issueNumber: issue.number,
        error: error.message,
      });
    }
  }

  return {
    totalIssues: issues.length,
    syncedSuccessfully: syncResults.filter((r) => !r.error).length,
    failed: syncResults.filter((r) => r.error).length,
    details: syncResults,
  };
}

// Helper functions for mapping GitHub data to Supabase
function formatTaskDescription(task: any): string {
  let body = task.description || '';

  if (task.ai_generated) {
    body += '\n\n---\n**🤖 AI Generated Task**\n';
    if (task.ai_suggestions) {
      body += `\n**Implementation Suggestions:**\n${task.ai_suggestions}`;
    }
    if (task.ai_complexity_score) {
      body += `\n**Complexity Score:** ${task.ai_complexity_score}/10`;
    }
  }

  if (task.estimated_hours) {
    body += `\n\n**Estimated Hours:** ${task.estimated_hours}h`;
  }

  if (task.story_points) {
    body += ` | **Story Points:** ${task.story_points}`;
  }

  return body;
}

function mapGitHubLabelsToTaskType(labels: any[]): string {
  const labelNames = labels.map((l) => l.name.toLowerCase());

  if (labelNames.includes('bug')) return 'bug';
  if (labelNames.includes('enhancement') || labelNames.includes('feature')) return 'feature';
  if (labelNames.includes('documentation')) return 'documentation';

  return 'task';
}

function mapGitHubStateToStatus(state: string): string {
  return state === 'open' ? 'todo' : 'done';
}

function mapGitHubLabelsToPriority(labels: any[]): string {
  const labelNames = labels.map((l) => l.name.toLowerCase());

  if (labelNames.includes('urgent') || labelNames.includes('critical')) return 'urgent';
  if (labelNames.includes('high')) return 'high';
  if (labelNames.includes('low')) return 'low';

  return 'medium';
}
