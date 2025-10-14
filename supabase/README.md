# Justice Companion - Supabase AI Project Management

**AI-Powered Task Planning & GitHub Integration**

This Supabase project provides comprehensive project management capabilities with AI-powered task breakdown that "plans every little detail" using Claude AI.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Database Schema](#database-schema)
4. [Edge Functions](#edge-functions)
5. [Example Queries](#example-queries)
6. [GitHub Integration](#github-integration)
7. [AI Task Breakdown](#ai-task-breakdown)
8. [Deployment](#deployment)

---

## ✨ Features

### Core Capabilities

- **🤖 AI Task Breakdown**: Claude AI generates detailed task breakdowns with every little detail
- **🔗 GitHub Integration**: Two-way sync with GitHub Issues
- **📊 Project Management**: Projects, tasks, milestones, labels
- **🔍 Full-Text Search**: Search across all tasks and descriptions
- **📈 Progress Tracking**: Real-time project progress metrics
- **🏷️ Task Dependencies**: Complex task relationships and blocking
- **💬 Comments & Collaboration**: Task comments with AI-generated support
- **📋 Custom Views**: Pre-built views for common queries

### Database Features

- **PostgreSQL** with extensions (uuid-ossp, pg_trgm)
- **Row Level Security (RLS)** enabled on all tables
- **Automatic timestamps** with triggers
- **Full-text search** with `tsvector` indexing
- **Recursive CTEs** for task hierarchy
- **Materialized views** for performance

---

## 🚀 Quick Start

### 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Deno](https://deno.land/) for Edge Functions (optional)
- Supabase project created at [supabase.com](https://supabase.com)

### 2. Install Supabase CLI

```bash
# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/supabase/cli/main/install.ps1 | iex

# macOS/Linux
brew install supabase/tap/supabase

# Or via npm (already installed in this project)
pnpm add -D supabase
```

### 3. Link to Your Project

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Get your project ref from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/general
```

### 4. Run Database Migration

```bash
# Apply the migration to create all tables, functions, and views
npx supabase db push

# Or if using local development:
npx supabase start
npx supabase db reset
```

### 5. Set Environment Variables

Create a `.env` file in your project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic API (for AI task breakdown)
ANTHROPIC_API_KEY=your-anthropic-api-key

# GitHub (for issue syncing)
GITHUB_TOKEN=your-github-personal-access-token
```

### 6. Deploy Edge Functions

```bash
# Deploy AI task breakdown function
npx supabase functions deploy ai-task-breakdown --no-verify-jwt

# Deploy GitHub sync function
npx supabase functions deploy github-sync --no-verify-jwt

# Set secrets for Edge Functions
npx supabase secrets set ANTHROPIC_API_KEY=your-key
npx supabase secrets set GITHUB_TOKEN=your-token
```

---

## 🗄️ Database Schema

### Tables

| Table                    | Description                          | Key Features                                     |
| ------------------------ | ------------------------------------ | ------------------------------------------------ |
| **projects**             | Top-level project containers         | Status, priority, dates, metadata                |
| **tasks**                | Tasks/issues with AI support         | Subtasks, dependencies, AI metadata, GitHub sync |
| **labels**               | Tags for categorizing tasks          | Color-coded, project-scoped                      |
| **task_labels**          | Many-to-many task-label junction     | Links tasks to labels                            |
| **comments**             | Task comments                        | AI-generated support                             |
| **ai_planning_sessions** | AI planning history                  | Tracks token usage, tasks generated              |
| **milestones**           | Project milestones                   | Release planning                                 |
| **task_milestones**      | Many-to-many task-milestone junction | Links tasks to milestones                        |

### Views

| View                 | Description                    | Use Case                |
| -------------------- | ------------------------------ | ----------------------- |
| **task_hierarchy**   | Recursive task tree with depth | Display nested subtasks |
| **project_progress** | Project completion statistics  | Dashboard metrics       |
| **overdue_tasks**    | Tasks past due date            | Daily review            |
| **ai_task_summary**  | AI usage statistics            | AI performance tracking |

### Key Fields

**Tasks Table - AI Features:**

```sql
ai_generated BOOLEAN          -- Was this created by AI?
ai_complexity_score NUMERIC   -- AI-assessed complexity (0-10)
ai_breakdown_parent BOOLEAN   -- Did AI break this into subtasks?
ai_suggestions TEXT           -- AI implementation tips
ai_dependencies TEXT[]        -- AI-identified dependencies
```

---

## 🔧 Edge Functions

### 1. AI Task Breakdown

**Endpoint**: `https://your-project.supabase.co/functions/v1/ai-task-breakdown`

**Purpose**: Uses Claude AI to generate detailed task breakdowns with comprehensive subtasks.

**Request**:

```json
{
  "projectId": "uuid",
  "taskDescription": "Implement user authentication system",
  "taskType": "feature",
  "context": "Using Electron with local SQLite database",
  "maxSubtasks": 10
}
```

**Response**:

```json
{
  "success": true,
  "planningSessionId": "uuid",
  "parentTask": {
    "id": "uuid",
    "title": "Implement user authentication system",
    "totalSubtasks": 8,
    "totalEstimatedHours": 24,
    "totalStoryPoints": 21
  },
  "subtasks": [
    {
      "id": "uuid",
      "title": "Design authentication database schema",
      "description": "Create users table with encrypted password storage...",
      "taskType": "task",
      "priority": "high",
      "estimatedHours": 3,
      "storyPoints": 3,
      "aiComplexityScore": 5.5,
      "aiSuggestions": "Use scrypt for password hashing..."
    }
  ],
  "aiResponse": {
    "model": "claude-3-5-sonnet-20241022",
    "tokensUsed": 2453
  }
}
```

**Example cURL**:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ai-task-breakdown \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "projectId": "project-uuid-here",
    "taskDescription": "Add dark mode to UI",
    "taskType": "feature",
    "maxSubtasks": 5
  }'
```

### 2. GitHub Sync

**Endpoint**: `https://your-project.supabase.co/functions/v1/github-sync`

**Purpose**: Two-way sync between Supabase tasks and GitHub Issues.

**Actions**:

1. **sync_to_github**: Create/update GitHub issue from Supabase task
2. **sync_from_github**: Import GitHub issue as Supabase task
3. **sync_all**: Bulk sync all GitHub issues

**Request (Sync to GitHub)**:

```json
{
  "action": "sync_to_github",
  "taskId": "uuid",
  "owner": "your-github-username",
  "repo": "Justice-Companion"
}
```

**Request (Sync from GitHub)**:

```json
{
  "action": "sync_from_github",
  "issueNumber": 42,
  "owner": "your-github-username",
  "repo": "Justice-Companion"
}
```

**Request (Sync All)**:

```json
{
  "action": "sync_all",
  "owner": "your-github-username",
  "repo": "Justice-Companion"
}
```

**Response**:

```json
{
  "success": true,
  "action": "sync_to_github",
  "result": {
    "taskId": "uuid",
    "githubIssueNumber": 42,
    "githubIssueUrl": "https://github.com/user/repo/issues/42"
  }
}
```

---

## 📊 Example Queries

### Get All Projects with Progress

```sql
SELECT * FROM project_progress
ORDER BY completion_percentage DESC;
```

### Get Task Hierarchy for Project

```sql
SELECT
  th.*,
  t.status,
  t.priority,
  t.estimated_hours,
  t.ai_generated
FROM task_hierarchy th
JOIN tasks t ON th.id = t.id
WHERE t.project_id = 'your-project-id'
ORDER BY th.path;
```

### Find Overdue Tasks

```sql
SELECT
  title,
  due_date,
  days_overdue,
  project_name,
  status
FROM overdue_tasks
ORDER BY days_overdue DESC;
```

### Search Tasks by Text

```sql
SELECT
  id,
  title,
  description,
  ts_rank(search_vector, to_tsquery('english', 'authentication & security')) AS rank
FROM tasks
WHERE search_vector @@ to_tsquery('english', 'authentication & security')
ORDER BY rank DESC
LIMIT 10;
```

### Get AI-Generated Tasks Summary

```sql
SELECT * FROM ai_task_summary
WHERE total_ai_tasks > 0
ORDER BY avg_complexity DESC;
```

### Get Tasks with Dependencies

```sql
SELECT
  t.id,
  t.title,
  t.status,
  t.depends_on,
  array_agg(dt.title) FILTER (WHERE dt.id IS NOT NULL) AS dependency_titles
FROM tasks t
LEFT JOIN LATERAL unnest(t.depends_on) AS dep_id ON true
LEFT JOIN tasks dt ON dt.id = dep_id
WHERE t.depends_on IS NOT NULL AND array_length(t.depends_on, 1) > 0
GROUP BY t.id, t.title, t.status, t.depends_on;
```

### Get AI Planning Session History

```sql
SELECT
  aps.created_at,
  aps.prompt,
  aps.tasks_generated,
  aps.model_used,
  aps.tokens_used,
  p.name AS project_name
FROM ai_planning_sessions aps
JOIN projects p ON aps.project_id = p.id
ORDER BY aps.created_at DESC
LIMIT 20;
```

---

## 🔗 GitHub Integration

### Setup GitHub Token

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token with permissions:
   - `repo` (full repository access)
   - `read:org` (if using organization repos)
3. Set environment variable: `GITHUB_TOKEN=your_token`

### Sync Workflows

**Manual Sync**:

```javascript
// Sync single task to GitHub
const response = await fetch(`${SUPABASE_URL}/functions/v1/github-sync`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    action: 'sync_to_github',
    taskId: 'task-uuid',
    owner: 'your-username',
    repo: 'Justice-Companion',
  }),
});
```

**Automated Sync with Webhooks** (TODO):

Set up GitHub webhooks to automatically sync issues when they're created/updated.

---

## 🤖 AI Task Breakdown

### How It Works

1. **User provides high-level task description**
2. **Claude AI analyzes** and breaks down into detailed subtasks
3. **AI considers**:
   - Planning & research
   - Implementation details
   - Testing requirements
   - Documentation needs
   - DevOps/deployment
   - Security considerations
   - Performance optimization
   - UI/UX aspects

4. **AI generates**:
   - Actionable task titles
   - Detailed descriptions
   - Time estimates
   - Story points
   - Complexity scores
   - Implementation suggestions
   - Dependency chains

### Example Usage

```javascript
// AI Task Breakdown Example
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-task-breakdown`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    projectId: 'project-uuid',
    taskDescription: 'Implement GDPR data export feature',
    taskType: 'feature',
    context: `
      - Electron desktop app
      - SQLite database
      - Must export: user data, cases, evidence, audit logs
      - Format: JSON with encryption option
      - Compliance: GDPR Article 20 (Right to data portability)
    `,
    maxSubtasks: 15,
  }),
});

const result = await response.json();
console.log(`Created ${result.subtasks.length} detailed subtasks!`);
```

### AI Prompt Engineering

The AI prompt is designed to extract **every little detail**:

- ✅ **Comprehensive**: Covers all aspects (planning, implementation, testing, docs, DevOps)
- ✅ **Technical**: Provides specific implementation guidance
- ✅ **Realistic**: Accurate time and complexity estimates
- ✅ **Dependency-aware**: Identifies task relationships
- ✅ **Prioritized**: Sorts by criticality

---

## 🚀 Deployment

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Run migrations
npx supabase db reset

# Serve Edge Functions locally
npx supabase functions serve ai-task-breakdown --env-file .env
npx supabase functions serve github-sync --env-file .env
```

### Production Deployment

```bash
# Link to production project
npx supabase link --project-ref your-prod-project

# Push database changes
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy ai-task-breakdown
npx supabase functions deploy github-sync

# Set production secrets
npx supabase secrets set ANTHROPIC_API_KEY=prod-key
npx supabase secrets set GITHUB_TOKEN=prod-token
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Claude API Documentation](https://docs.anthropic.com/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

## 🤝 Contributing

This Supabase setup is part of the Justice Companion project. See the main [README.md](../README.md) for contribution guidelines.

---

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details

---

**Created**: 2025-10-14
**Last Updated**: 2025-10-14
**Version**: 1.0.0

**AI-Powered Project Management for Justice Companion** 🚀
