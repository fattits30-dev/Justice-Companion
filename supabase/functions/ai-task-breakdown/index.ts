// AI Task Breakdown Edge Function
// Uses Claude to generate detailed task breakdowns with every little detail

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskBreakdownRequest {
  projectId: string;
  taskDescription: string;
  taskType?: 'feature' | 'bug' | 'enhancement' | 'research';
  context?: string;
  maxSubtasks?: number;
}

interface GeneratedTask {
  title: string;
  description: string;
  taskType: string;
  priority: string;
  estimatedHours: number;
  storyPoints: number;
  aiComplexityScore: number;
  aiSuggestions: string;
  dependsOn: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Parse request
    const body: TaskBreakdownRequest = await req.json();
    const {
      projectId,
      taskDescription,
      taskType = 'feature',
      context = '',
      maxSubtasks = 10,
    } = body;

    // Validate input
    if (!projectId || !taskDescription) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectId, taskDescription' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construct AI prompt for detailed task breakdown
    const prompt = `You are an expert software project manager and technical architect. Break down the following task into **every little detail** with comprehensive subtasks.

# Task Information
**Type**: ${taskType}
**Description**: ${taskDescription}

${context ? `**Additional Context**:\n${context}` : ''}

# Instructions
1. Analyze the task thoroughly and identify ALL required subtasks
2. Be EXTREMELY DETAILED - include every single step, no matter how small
3. For each subtask, provide:
   - Clear, actionable title
   - Detailed description with technical specifics
   - Type (task/bug/feature/documentation/testing/research)
   - Priority (low/medium/high/urgent)
   - Estimated hours (realistic estimate)
   - Story points (1-13 Fibonacci scale)
   - Complexity score (0-10 scale)
   - Implementation suggestions
   - Dependencies (which subtasks must be done first)

4. Consider these aspects:
   - **Planning**: Research, design, architecture decisions
   - **Implementation**: Actual coding tasks
   - **Testing**: Unit tests, integration tests, E2E tests
   - **Documentation**: Code docs, API docs, user guides
   - **DevOps**: CI/CD, deployment, monitoring
   - **Security**: Authentication, authorization, data protection
   - **Performance**: Optimization, caching, scaling
   - **UI/UX**: Design, accessibility, user flows

5. Maximum ${maxSubtasks} subtasks (prioritize the most critical ones)

# Output Format
Return a JSON array of subtasks with this exact structure:

\`\`\`json
{
  "parentTask": {
    "title": "Main task title",
    "summary": "High-level overview",
    "totalEstimatedHours": 0,
    "totalStoryPoints": 0
  },
  "subtasks": [
    {
      "title": "Subtask title",
      "description": "Detailed description with technical specifics",
      "taskType": "task|bug|feature|documentation|testing|research",
      "priority": "low|medium|high|urgent",
      "estimatedHours": 0,
      "storyPoints": 0,
      "aiComplexityScore": 0,
      "aiSuggestions": "Implementation tips and best practices",
      "dependsOn": ["title-of-dependency-task"]
    }
  ]
}
\`\`\`

Be thorough and detailed. Break down every little thing!`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content[0].text;

    // Parse JSON from AI response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const breakdown = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);

    // Create AI planning session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('ai_planning_sessions')
      .insert({
        project_id: projectId,
        prompt: taskDescription,
        ai_response: content,
        tasks_generated: breakdown.subtasks.length,
        model_used: 'claude-3-5-sonnet-20241022',
        tokens_used: aiResponse.usage.input_tokens + aiResponse.usage.output_tokens,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create planning session:', sessionError);
    }

    // Create parent task
    const { data: parentTask, error: parentError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: breakdown.parentTask.title,
        description: breakdown.parentTask.summary,
        task_type: taskType,
        status: 'todo',
        priority: 'high',
        estimated_hours: breakdown.parentTask.totalEstimatedHours,
        story_points: breakdown.parentTask.totalStoryPoints,
        ai_generated: true,
        ai_breakdown_parent: true,
      })
      .select()
      .single();

    if (parentError) {
      throw new Error(`Failed to create parent task: ${parentError.message}`);
    }

    // Create subtasks
    const subtaskPromises = breakdown.subtasks.map(async (subtask: GeneratedTask) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          parent_task_id: parentTask.id,
          title: subtask.title,
          description: subtask.description,
          task_type: subtask.taskType,
          priority: subtask.priority,
          estimated_hours: subtask.estimatedHours,
          story_points: subtask.storyPoints,
          ai_complexity_score: subtask.aiComplexityScore,
          ai_suggestions: subtask.aiSuggestions,
          ai_generated: true,
          status: 'todo',
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to create subtask "${subtask.title}":`, error);
      }

      return data;
    });

    const createdSubtasks = await Promise.all(subtaskPromises);

    // Update dependencies (after all tasks are created)
    // This is a second pass to link dependencies by matching titles
    const taskMap = new Map();
    createdSubtasks.forEach((task) => {
      if (task) taskMap.set(task.title, task.id);
    });

    for (let i = 0; i < breakdown.subtasks.length; i++) {
      const subtask = breakdown.subtasks[i];
      const createdTask = createdSubtasks[i];

      if (!createdTask || !subtask.dependsOn || subtask.dependsOn.length === 0) {
        continue;
      }

      const dependencyIds = subtask.dependsOn
        .map((depTitle: string) => taskMap.get(depTitle))
        .filter((id: string | undefined) => id !== undefined);

      if (dependencyIds.length > 0) {
        await supabase.from('tasks').update({ depends_on: dependencyIds }).eq('id', createdTask.id);
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        planningSessionId: sessionData?.id,
        parentTask: {
          id: parentTask.id,
          title: parentTask.title,
          totalSubtasks: breakdown.subtasks.length,
          totalEstimatedHours: breakdown.parentTask.totalEstimatedHours,
          totalStoryPoints: breakdown.parentTask.totalStoryPoints,
        },
        subtasks: createdSubtasks.filter((t) => t !== null),
        aiResponse: {
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: aiResponse.usage.input_tokens + aiResponse.usage.output_tokens,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-task-breakdown function:', error);

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
