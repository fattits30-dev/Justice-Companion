# 🚀 Supabase AI Project Management - Quick Start

**Get up and running in 5 minutes!**

---

## ⚡ 1-Minute Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name it "Justice Companion Planning" (or any name)
4. Save your **Project URL** and **API keys**

### Step 2: Apply Database Migration

```bash
# Login to Supabase CLI
pnpm supabase:login

# Link to your project (get ref from dashboard URL)
pnpm supabase:link --project-ref your-project-ref

# Apply the migration
pnpm supabase:db:push
```

**Note for Windows users**: Use `pnpm supabase:[command]` or `npx -y supabase@latest [command]` instead of just `supabase`.

**That's it!** Your database is now ready with:

- ✅ 8 tables (projects, tasks, labels, comments, etc.)
- ✅ 4 views (progress, hierarchy, overdue, AI summary)
- ✅ Full-text search
- ✅ Pre-seeded labels

---

## 🤖 Using AI Task Breakdown

### Deploy Edge Function

```bash
# Set your Anthropic API key
npx supabase secrets set ANTHROPIC_API_KEY=your-key-here

# Deploy function
npx supabase functions deploy ai-task-breakdown --no-verify-jwt
```

### Use from Code

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/ai-task-breakdown', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_ANON_KEY',
  },
  body: JSON.stringify({
    projectId: 'uuid-from-database',
    taskDescription: 'Add dark mode to UI',
    taskType: 'feature',
    maxSubtasks: 10,
  }),
});

const result = await response.json();
console.log(`Created ${result.subtasks.length} detailed subtasks!`);
```

### Or Use cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-task-breakdown \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "projectId": "project-uuid",
    "taskDescription": "Implement user authentication",
    "taskType": "feature",
    "context": "Using Electron with SQLite",
    "maxSubtasks": 8
  }'
```

---

## 🔗 GitHub Integration (Optional)

### Deploy GitHub Sync Function

```bash
# Set your GitHub token
npx supabase secrets set GITHUB_TOKEN=your-github-token

# Deploy function
npx supabase functions deploy github-sync --no-verify-jwt
```

### Sync a Task to GitHub

```bash
curl -X POST https://your-project.supabase.co/functions/v1/github-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "action": "sync_to_github",
    "taskId": "task-uuid",
    "owner": "your-username",
    "repo": "Justice-Companion"
  }'
```

---

## 📊 Quick Queries

### Get Project Progress

```sql
SELECT * FROM project_progress;
```

### Get All Tasks with Hierarchy

```sql
SELECT * FROM task_hierarchy
JOIN tasks ON task_hierarchy.id = tasks.id
ORDER BY task_hierarchy.path;
```

### Find Overdue Tasks

```sql
SELECT * FROM overdue_tasks
ORDER BY days_overdue DESC;
```

### Get AI-Generated Tasks

```sql
SELECT * FROM tasks
WHERE ai_generated = TRUE
ORDER BY ai_complexity_score DESC;
```

---

## 🎯 Common Use Cases

### 1. Create a Project

```sql
INSERT INTO projects (name, description, status, priority)
VALUES (
  'Justice Companion v2',
  'Major release with AI improvements',
  'active',
  'high'
)
RETURNING *;
```

### 2. Create a Manual Task

```sql
INSERT INTO tasks (
  project_id,
  title,
  description,
  task_type,
  priority,
  estimated_hours,
  story_points
)
VALUES (
  'project-uuid',
  'Implement login screen',
  'Create a secure login UI with validation',
  'feature',
  'high',
  8,
  5
)
RETURNING *;
```

### 3. Update Task Status

```sql
UPDATE tasks
SET status = 'in_progress'
WHERE id = 'task-uuid'
RETURNING *;
```

### 4. Add Label to Task

```sql
INSERT INTO task_labels (task_id, label_id)
SELECT 'task-uuid', id
FROM labels
WHERE name = 'ui/ux'
LIMIT 1;
```

### 5. Add Comment

```sql
INSERT INTO comments (task_id, author, content)
VALUES (
  'task-uuid',
  'john@example.com',
  'Started working on this, ETA 2 days'
)
RETURNING *;
```

---

## 🎨 TypeScript Client

See `client-example.ts` for a complete TypeScript client with:

- ✅ Full TypeScript types
- ✅ All CRUD operations
- ✅ AI task breakdown integration
- ✅ GitHub sync integration
- ✅ Search and filtering

```typescript
import { aiProjectManager } from './client-example';

// Create project
const project = await aiProjectManager.createProject({
  name: 'My Project',
  description: 'Description here',
  status: 'active',
});

// Generate AI breakdown
const breakdown = await aiProjectManager.generateAITaskBreakdown({
  projectId: project.id,
  taskDescription: 'Add search feature',
  maxSubtasks: 10,
});

// Get progress
const progress = await aiProjectManager.getProjectProgress(project.id);
console.log(`${progress.completion_percentage}% complete`);
```

---

## 🔐 Environment Variables

Create `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
GITHUB_TOKEN=your-github-token
```

---

## 📚 Next Steps

1. **Read full docs**: See `README.md` for comprehensive documentation
2. **Explore schema**: Check `migrations/20251014_ai_task_management.sql`
3. **Try examples**: Run queries from `README.md` examples section
4. **Customize**: Modify Edge Functions for your needs

---

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Claude API**: https://docs.anthropic.com
- **GitHub API**: https://docs.github.com/en/rest

---

**Happy Planning! 🎉**

Your AI assistant will now plan **every little detail** for you.
