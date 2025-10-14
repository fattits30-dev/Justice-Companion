# 🎯 Plan Your Justice Companion App - Quick Start

Use your Supabase database to plan out your entire app development!

---

## Method 1: SQL Editor (Quick & Easy)

### Step 1: Open SQL Editor

Go to: https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/sql/new

### Step 2: Get Your Project ID

```sql
-- Get your project ID
SELECT id, name FROM projects WHERE name = 'Justice Companion Development';
```

Copy the `id` (UUID) from the result.

### Step 3: Create Feature Tasks

Paste this SQL and run it (replace `YOUR_PROJECT_ID` with the UUID from Step 2):

```sql
-- ============================================================================
-- JUSTICE COMPANION APP PLANNING
-- ============================================================================

-- Replace this with your actual project ID from Step 2
-- Example: '12345678-1234-1234-1234-123456789012'
\set project_id 'YOUR_PROJECT_ID'

-- ============================================================================
-- PHASE 1: CORE FEATURES
-- ============================================================================

INSERT INTO tasks (
    project_id,
    title,
    description,
    task_type,
    priority,
    status,
    estimated_hours,
    story_points
) VALUES
    -- Authentication & Security
    (:'project_id',
     'User Authentication System',
     'Complete user auth with registration, login, password reset, and session management',
     'feature',
     'urgent',
     'in_progress',
     16,
     8),

    -- Case Management
    (:'project_id',
     'Case Creation & Management',
     'CRUD operations for legal cases with status tracking, case types, and metadata',
     'feature',
     'high',
     'todo',
     24,
     13),

    (:'project_id',
     'Evidence Upload & Management',
     'File upload, categorization, PDF/DOCX parsing, and secure storage',
     'feature',
     'high',
     'todo',
     20,
     8),

    -- AI Features
    (:'project_id',
     'AI Chat Assistant',
     'OpenAI integration with streaming responses, RAG, and UK legal API integration',
     'feature',
     'high',
     'todo',
     32,
     13),

    (:'project_id',
     'Legal Research Integration',
     'Connect to legislation.gov.uk and caselaw APIs with citation extraction',
     'feature',
     'medium',
     'todo',
     16,
     8),

    -- Dashboard
    (:'project_id',
     'Dashboard Overview',
     'Summary cards, recent activity, quick actions, and statistics',
     'feature',
     'high',
     'todo',
     12,
     5),

    -- ============================================================================
    -- PHASE 2: ADVANCED FEATURES
    -- ============================================================================

    (:'project_id',
     'Document Export System',
     'Export cases to PDF, DOCX with professional formatting',
     'feature',
     'medium',
     'todo',
     16,
     8),

    (:'project_id',
     'GDPR Data Management',
     'Data export, right to erasure, consent management, audit logs',
     'feature',
     'high',
     'todo',
     24,
     13),

    (:'project_id',
     'Full-Text Search',
     'Search across cases, evidence, notes with SQLite FTS5',
     'feature',
     'medium',
     'todo',
     12,
     5),

    (:'project_id',
     'Settings & User Profile',
     'User preferences, theme settings, account management',
     'feature',
     'low',
     'todo',
     8,
     3),

    -- ============================================================================
    -- PHASE 3: TESTING & QA
    -- ============================================================================

    (:'project_id',
     'Unit Test Suite',
     'Comprehensive unit tests for all services with Vitest',
     'testing',
     'high',
     'todo',
     40,
     13),

    (:'project_id',
     'E2E Test Suite',
     'End-to-end tests with Playwright covering critical user flows',
     'testing',
     'high',
     'todo',
     32,
     13),

    (:'project_id',
     'Security Audit',
     'OWASP compliance, penetration testing, vulnerability scanning',
     'testing',
     'urgent',
     'todo',
     24,
     13),

    -- ============================================================================
    -- PHASE 4: DEPLOYMENT & CI/CD
    -- ============================================================================

    (:'project_id',
     'CI/CD Pipeline Setup',
     'GitHub Actions for automated testing, building, and releases',
     'chore',
     'high',
     'done',
     16,
     8),

    (:'project_id',
     'Multi-Platform Builds',
     'Windows, macOS, Linux installers with electron-builder',
     'chore',
     'high',
     'done',
     20,
     8),

    (:'project_id',
     'Production Release',
     'Final testing, documentation, and v1.0.0 release',
     'chore',
     'urgent',
     'todo',
     24,
     13)
RETURNING id, title, status, estimated_hours, story_points;
```

---

## Method 2: Detailed Breakdown with Labels

After creating tasks, add labels:

```sql
-- Get task and label IDs
SELECT t.id AS task_id, t.title, l.id AS label_id, l.name AS label_name
FROM tasks t
CROSS JOIN labels l
WHERE t.project_id = :'project_id'
  AND t.title = 'AI Chat Assistant'
  AND l.name IN ('ai', 'frontend', 'backend');

-- Add labels to task (replace UUIDs with actual IDs from above)
INSERT INTO task_labels (task_id, label_id) VALUES
    ('TASK_UUID_HERE', 'LABEL_UUID_1'),
    ('TASK_UUID_HERE', 'LABEL_UUID_2'),
    ('TASK_UUID_HERE', 'LABEL_UUID_3');
```

---

## Method 3: Create Task Hierarchy (Parent → Subtasks)

Break down a big feature into subtasks:

```sql
-- Step 1: Create parent task
INSERT INTO tasks (
    project_id,
    title,
    description,
    task_type,
    priority,
    estimated_hours,
    story_points,
    status
)
VALUES (
    :'project_id',
    'Complete Authentication System',
    'End-to-end user authentication with all security features',
    'feature',
    'urgent',
    40,
    21,
    'in_progress'
)
RETURNING id AS parent_task_id;

-- Step 2: Copy the parent_task_id from above, then create subtasks
INSERT INTO tasks (
    project_id,
    parent_task_id,
    title,
    description,
    task_type,
    priority,
    estimated_hours,
    story_points,
    status
) VALUES
    -- Subtask 1
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Design user registration flow',
     'Create wireframes and UI mockups for registration screens',
     'task',
     'high',
     4,
     3,
     'done'),

    -- Subtask 2
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Implement password hashing',
     'Use scrypt for secure password hashing with salt',
     'task',
     'urgent',
     6,
     5,
     'done'),

    -- Subtask 3
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Build login UI component',
     'React form with validation and error handling',
     'task',
     'high',
     8,
     5,
     'in_progress'),

    -- Subtask 4
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Implement session management',
     'Create session tokens with 24-hour expiration',
     'task',
     'high',
     6,
     5,
     'todo'),

    -- Subtask 5
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Add password reset flow',
     'Email-based password reset with secure tokens',
     'task',
     'medium',
     8,
     5,
     'todo'),

    -- Subtask 6
    (:'project_id',
     'PARENT_TASK_ID_HERE',
     'Write auth unit tests',
     'Test all auth functions with Vitest',
     'testing',
     'high',
     8,
     3,
     'todo')
RETURNING id, title, status;
```

---

## Method 4: View Your Plan

### See All Tasks

```sql
SELECT
    t.title,
    t.task_type,
    t.priority,
    t.status,
    t.estimated_hours,
    t.story_points,
    CASE
        WHEN t.parent_task_id IS NOT NULL THEN '  ↳ Subtask'
        ELSE 'Parent Task'
    END AS level
FROM tasks t
WHERE t.project_id = :'project_id'
ORDER BY
    COALESCE(t.parent_task_id, t.id),
    t.created_at;
```

### See Task Hierarchy

```sql
SELECT
    depth,
    title,
    status,
    estimated_hours
FROM task_hierarchy th
JOIN tasks t ON th.id = t.id
WHERE t.project_id = :'project_id'
ORDER BY th.path;
```

### See Project Progress

```sql
SELECT
    project_name,
    total_tasks,
    completed_tasks,
    in_progress_tasks,
    blocked_tasks,
    completion_percentage,
    total_estimated_hours
FROM project_progress
WHERE project_id = :'project_id';
```

### See Overdue Tasks

```sql
SELECT
    title,
    due_date,
    days_overdue,
    priority,
    status
FROM overdue_tasks
WHERE project_id = :'project_id'
ORDER BY days_overdue DESC;
```

---

## Quick Template: Copy & Paste Plan

Here's a ready-to-use plan for Justice Companion:

```sql
-- Get project ID first
SELECT id FROM projects WHERE name = 'Justice Companion Development';

-- Create all main features (run one at a time or all together)
DO $$
DECLARE
    project_uuid UUID;
BEGIN
    -- Get project ID
    SELECT id INTO project_uuid
    FROM projects
    WHERE name = 'Justice Companion Development';

    -- Core Features
    INSERT INTO tasks (project_id, title, description, task_type, priority, status, estimated_hours, story_points)
    SELECT project_uuid, title, description, task_type, priority, status, estimated_hours, story_points
    FROM (VALUES
        ('User Authentication', 'Secure login/register with scrypt hashing', 'feature', 'urgent', 'in_progress', 16, 8),
        ('Case Management', 'CRUD for legal cases with metadata', 'feature', 'high', 'todo', 24, 13),
        ('Evidence Management', 'File upload with PDF/DOCX parsing', 'feature', 'high', 'todo', 20, 8),
        ('AI Chat Assistant', 'OpenAI integration with RAG', 'feature', 'high', 'todo', 32, 13),
        ('Dashboard', 'Overview with stats and quick actions', 'feature', 'high', 'todo', 12, 5),
        ('GDPR Compliance', 'Data export, consent, audit logs', 'feature', 'high', 'todo', 24, 13),
        ('Full-Text Search', 'SQLite FTS5 across all data', 'feature', 'medium', 'todo', 12, 5),
        ('Unit Tests', 'Comprehensive test coverage', 'testing', 'high', 'todo', 40, 13),
        ('E2E Tests', 'Playwright test suite', 'testing', 'high', 'todo', 32, 13),
        ('Production Release', 'Final v1.0.0 release', 'chore', 'urgent', 'todo', 24, 13)
    ) AS tasks(title, description, task_type, priority, status, estimated_hours, story_points);

    RAISE NOTICE 'Created % tasks', (SELECT COUNT(*) FROM tasks WHERE project_id = project_uuid);
END $$;
```

---

## 🎯 What This Gives You

After running these queries, you'll have:

- ✅ **Complete task breakdown** for Justice Companion
- ✅ **Estimated hours** for each feature (total: ~300+ hours)
- ✅ **Story points** for sprint planning
- ✅ **Priority levels** (urgent, high, medium, low)
- ✅ **Task hierarchy** (parent tasks → subtasks)
- ✅ **Progress tracking** with completion percentages
- ✅ **Status tracking** (todo, in_progress, done, blocked)

---

## 📊 View Your Plan in Supabase Dashboard

1. **Table View**: https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/editor/public/tasks
2. **SQL Editor**: https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/sql

---

## 🚀 Next Steps

1. Run the SQL queries above to create your plan
2. View progress: `SELECT * FROM project_progress;`
3. Update task status as you work:
   ```sql
   UPDATE tasks
   SET status = 'in_progress'
   WHERE title = 'User Authentication';
   ```
4. Add comments to tasks:
   ```sql
   INSERT INTO comments (task_id, author, content)
   VALUES ('TASK_ID', 'Your Name', 'Started working on this feature!');
   ```

Your Justice Companion development roadmap is ready! 🎉
