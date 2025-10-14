-- AI-Powered Task Management Schema for Justice Companion
-- Created: 2025-10-14
-- Purpose: Comprehensive project planning with AI-generated task breakdowns

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    target_date DATE,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- TASKS/ISSUES TABLE
-- ============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'bug', 'feature', 'enhancement', 'documentation', 'research', 'chore')),

    -- Status & Priority
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'testing', 'done', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Assignment & Tracking
    assignee TEXT, -- Username or email
    estimated_hours NUMERIC(5,2),
    actual_hours NUMERIC(5,2),
    story_points INTEGER,

    -- Dates
    start_date DATE,
    due_date DATE,
    completed_date DATE,

    -- AI Features
    ai_generated BOOLEAN DEFAULT FALSE, -- Was this task created by AI?
    ai_complexity_score NUMERIC(3,2), -- AI-assessed complexity (0-10)
    ai_breakdown_parent BOOLEAN DEFAULT FALSE, -- Is this a parent task that AI broke down?
    ai_suggestions TEXT, -- AI recommendations for implementation
    ai_dependencies TEXT[], -- AI-identified dependencies

    -- Relations
    depends_on UUID[], -- Array of task IDs this depends on
    blocks UUID[], -- Array of task IDs this blocks
    related_to UUID[], -- Related tasks

    -- GitHub Integration
    github_issue_number INTEGER,
    github_issue_url TEXT,
    github_synced_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Full-text search
    search_vector TSVECTOR
);

-- ============================================================================
-- LABELS/TAGS TABLE
-- ============================================================================
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280', -- Hex color code
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- ============================================================================
-- TASK LABELS (Many-to-Many)
-- ============================================================================
CREATE TABLE task_labels (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, label_id)
);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE, -- Was this comment AI-generated?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- AI PLANNING SESSIONS
-- ============================================================================
CREATE TABLE ai_planning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL, -- User's planning request
    ai_response TEXT NOT NULL, -- AI's detailed breakdown
    tasks_generated INTEGER DEFAULT 0, -- Number of tasks created
    model_used TEXT, -- e.g., "claude-3-5-sonnet"
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- MILESTONES TABLE
-- ============================================================================
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    completed_date DATE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TASK MILESTONES (Many-to-Many)
-- ============================================================================
CREATE TABLE task_milestones (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, milestone_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);

-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_ai_generated ON tasks(ai_generated);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_github_issue_number ON tasks(github_issue_number);
CREATE INDEX idx_tasks_depends_on ON tasks USING GIN(depends_on);
CREATE INDEX idx_tasks_blocks ON tasks USING GIN(blocks);
CREATE INDEX idx_tasks_search_vector ON tasks USING GIN(search_vector);

-- Comments
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- AI Planning Sessions
CREATE INDEX idx_ai_sessions_project_id ON ai_planning_sessions(project_id);
CREATE INDEX idx_ai_sessions_created_at ON ai_planning_sessions(created_at);

-- Milestones
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update search vector for full-text search
CREATE OR REPLACE FUNCTION tasks_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.ai_suggestions, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_update();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Task hierarchy with depth
CREATE VIEW task_hierarchy AS
WITH RECURSIVE task_tree AS (
    -- Base case: root tasks
    SELECT
        id,
        parent_task_id,
        title,
        status,
        priority,
        0 AS depth,
        ARRAY[id] AS path
    FROM tasks
    WHERE parent_task_id IS NULL

    UNION ALL

    -- Recursive case: child tasks
    SELECT
        t.id,
        t.parent_task_id,
        t.title,
        t.status,
        t.priority,
        tt.depth + 1,
        tt.path || t.id
    FROM tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree;

-- View: Project progress summary
CREATE VIEW project_progress AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.status AS project_status,
    COUNT(t.id) AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done') AS completed_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'blocked') AS blocked_tasks,
    COUNT(t.id) FILTER (WHERE t.ai_generated = TRUE) AS ai_generated_tasks,
    ROUND(
        CASE
            WHEN COUNT(t.id) > 0
            THEN (COUNT(t.id) FILTER (WHERE t.status = 'done')::NUMERIC / COUNT(t.id)::NUMERIC) * 100
            ELSE 0
        END,
        2
    ) AS completion_percentage,
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name, p.status;

-- View: Overdue tasks
CREATE VIEW overdue_tasks AS
SELECT
    t.*,
    p.name AS project_name,
    CURRENT_DATE - t.due_date AS days_overdue
FROM tasks t
INNER JOIN projects p ON t.project_id = p.id
WHERE t.due_date < CURRENT_DATE
    AND t.status NOT IN ('done', 'cancelled');

-- View: AI-generated task summary
CREATE VIEW ai_task_summary AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    COUNT(t.id) AS total_ai_tasks,
    AVG(t.ai_complexity_score) AS avg_complexity,
    COUNT(t.id) FILTER (WHERE t.status = 'done') AS completed_ai_tasks,
    COUNT(DISTINCT aps.id) AS planning_sessions_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id AND t.ai_generated = TRUE
LEFT JOIN ai_planning_sessions aps ON aps.project_id = p.id
GROUP BY p.id, p.name;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default project for Justice Companion
INSERT INTO projects (name, description, status, priority)
VALUES (
    'Justice Companion Development',
    'Main development project for Justice Companion - UK Legal Case Management Platform',
    'active',
    'high'
);

-- Insert common labels
WITH project AS (
    SELECT id FROM projects WHERE name = 'Justice Companion Development'
)
INSERT INTO labels (project_id, name, color, description)
SELECT
    project.id,
    label_data.name,
    label_data.color,
    label_data.description
FROM project, (VALUES
    ('bug', '#EF4444', 'Something isn''t working'),
    ('enhancement', '#3B82F6', 'New feature or request'),
    ('documentation', '#10B981', 'Improvements or additions to documentation'),
    ('security', '#DC2626', 'Security-related issue'),
    ('performance', '#F59E0B', 'Performance optimization'),
    ('ui/ux', '#8B5CF6', 'User interface and experience'),
    ('backend', '#6366F1', 'Backend/server-side work'),
    ('frontend', '#EC4899', 'Frontend/client-side work'),
    ('database', '#14B8A6', 'Database-related changes'),
    ('testing', '#A855F7', 'Testing and QA'),
    ('ai', '#F472B6', 'AI/ML features'),
    ('refactoring', '#78716C', 'Code refactoring')
) AS label_data(name, color, description);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users)
-- TODO: Customize based on your auth requirements
CREATE POLICY "Allow all operations for authenticated users" ON projects
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON tasks
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON labels
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON task_labels
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON comments
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON ai_planning_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON milestones
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON task_milestones
    FOR ALL USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE projects IS 'Top-level projects for organizing tasks';
COMMENT ON TABLE tasks IS 'Individual tasks/issues with AI-powered breakdown support';
COMMENT ON TABLE labels IS 'Labels/tags for categorizing tasks';
COMMENT ON TABLE comments IS 'Comments on tasks with AI-generated support';
COMMENT ON TABLE ai_planning_sessions IS 'Tracks AI planning sessions and task generation';
COMMENT ON TABLE milestones IS 'Project milestones and release planning';

COMMENT ON COLUMN tasks.ai_complexity_score IS 'AI-assessed task complexity (0-10 scale)';
COMMENT ON COLUMN tasks.ai_breakdown_parent IS 'True if AI broke this task into subtasks';
COMMENT ON COLUMN tasks.depends_on IS 'Array of task UUIDs this task depends on';
COMMENT ON COLUMN tasks.blocks IS 'Array of task UUIDs this task blocks';
