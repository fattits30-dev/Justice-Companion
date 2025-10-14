-- ============================================================================
-- Explore Your Deployed Supabase Database
-- ============================================================================

-- 1. View the default project
SELECT 
    id,
    name,
    description,
    status,
    priority,
    created_at
FROM projects;

-- 2. View all pre-configured labels
SELECT 
    name,
    color,
    description
FROM labels
ORDER BY name;

-- 3. Check database tables (metadata)
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Check all views
SELECT 
    table_name AS view_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 5. Check all indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Check all triggers
SELECT 
    trigger_name,
    event_object_table AS table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. Sample query: Create a test task and see the hierarchy
INSERT INTO tasks (
    project_id,
    title,
    description,
    task_type,
    priority,
    status
) 
SELECT 
    id,
    'Sample Task: Implement Authentication',
    'Add user authentication with OAuth and JWT',
    'feature',
    'high',
    'todo'
FROM projects 
WHERE name = 'Justice Companion Development'
LIMIT 1
RETURNING id, title, status, created_at;

-- 8. View task hierarchy (will show the sample task)
SELECT 
    id,
    title,
    depth,
    path
FROM task_hierarchy
ORDER BY path;

-- 9. View project progress
SELECT * FROM project_progress;

-- 10. View AI task summary (empty until AI generates tasks)
SELECT * FROM ai_task_summary;

