-- ============================================================================
-- JUSTICE COMPANION - COMPLETE PROJECT PLAN
-- ============================================================================
-- Paste this into Supabase SQL Editor and run it!
-- https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/sql/new
-- ============================================================================

DO $$
DECLARE
    project_uuid UUID;
    auth_task_id UUID;
    case_task_id UUID;
    evidence_task_id UUID;
    ai_task_id UUID;
BEGIN
    -- Get Justice Companion project ID
    SELECT id INTO project_uuid
    FROM projects
    WHERE name = 'Justice Companion Development';

    IF project_uuid IS NULL THEN
        RAISE EXCEPTION 'Project not found! Run the migration first.';
    END IF;

    RAISE NOTICE 'Using project ID: %', project_uuid;

    -- ========================================================================
    -- PHASE 1: CORE FEATURES
    -- ========================================================================

    -- 1. User Authentication (Parent Task)
    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points, ai_breakdown_parent
    ) VALUES (
        project_uuid,
        '🔐 User Authentication System',
        'Complete authentication with registration, login, password reset, session management, and security features',
        'feature',
        'urgent',
        'in_progress',
        40,
        21,
        TRUE
    ) RETURNING id INTO auth_task_id;

    -- Authentication subtasks
    INSERT INTO tasks (
        project_id, parent_task_id, title, description, task_type,
        priority, status, estimated_hours, story_points
    ) VALUES
        (project_uuid, auth_task_id, 'Design registration flow', 'Create UI mockups and user flow diagrams', 'task', 'high', 'done', 4, 3),
        (project_uuid, auth_task_id, 'Implement scrypt password hashing', 'Secure password hashing with random salts (N=2^14, r=8, p=1)', 'task', 'urgent', 'done', 6, 5),
        (project_uuid, auth_task_id, 'Build registration UI', 'React form with validation and password strength indicator', 'task', 'high', 'done', 8, 5),
        (project_uuid, auth_task_id, 'Build login UI', 'Login form with error handling and "remember me"', 'task', 'high', 'in_progress', 6, 3),
        (project_uuid, auth_task_id, 'Implement session management', '24-hour sessions with UUID v4 tokens', 'task', 'high', 'in_progress', 8, 5),
        (project_uuid, auth_task_id, 'Add password reset flow', 'Email-based reset with secure token expiration', 'task', 'medium', 'todo', 8, 5);

    RAISE NOTICE '✅ Created authentication tasks';

    -- 2. Case Management (Parent Task)
    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points, ai_breakdown_parent
    ) VALUES (
        project_uuid,
        '⚖️ Case Management System',
        'Complete CRUD for legal cases with status tracking, case types, metadata, and timeline',
        'feature',
        'high',
        'todo',
        48,
        21,
        TRUE
    ) RETURNING id INTO case_task_id;

    -- Case management subtasks
    INSERT INTO tasks (
        project_id, parent_task_id, title, description, task_type,
        priority, status, estimated_hours, story_points
    ) VALUES
        (project_uuid, case_task_id, 'Design case database schema', 'Define tables, relationships, and constraints', 'task', 'high', 'done', 6, 5),
        (project_uuid, case_task_id, 'Implement CaseRepository', 'Database layer with CRUD operations', 'task', 'high', 'done', 8, 5),
        (project_uuid, case_task_id, 'Implement CaseService', 'Business logic with validation and auth', 'task', 'high', 'done', 8, 5),
        (project_uuid, case_task_id, 'Build case list view', 'React component with filtering and sorting', 'task', 'high', 'todo', 10, 8),
        (project_uuid, case_task_id, 'Build case detail view', 'Full case view with evidence, notes, timeline', 'task', 'high', 'todo', 12, 8),
        (project_uuid, case_task_id, 'Add case status transitions', 'Workflow for active → pending → closed', 'task', 'medium', 'todo', 4, 3);

    RAISE NOTICE '✅ Created case management tasks';

    -- 3. Evidence Management (Parent Task)
    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points, ai_breakdown_parent
    ) VALUES (
        project_uuid,
        '📁 Evidence & Document Management',
        'File upload, categorization, PDF/DOCX parsing, text extraction, and secure storage',
        'feature',
        'high',
        'todo',
        36,
        21,
        TRUE
    ) RETURNING id INTO evidence_task_id;

    -- Evidence management subtasks
    INSERT INTO tasks (
        project_id, parent_task_id, title, description, task_type,
        priority, status, estimated_hours, story_points
    ) VALUES
        (project_uuid, evidence_task_id, 'Design evidence schema', 'Tables for evidence, files, and metadata', 'task', 'high', 'done', 4, 3),
        (project_uuid, evidence_task_id, 'Implement file upload', 'Drag-and-drop UI with progress indicator', 'task', 'high', 'todo', 8, 5),
        (project_uuid, evidence_task_id, 'Add PDF text extraction', 'Use pdf-parse library for text extraction', 'task', 'high', 'todo', 6, 5),
        (project_uuid, evidence_task_id, 'Add DOCX text extraction', 'Use mammoth library for DOCX parsing', 'task', 'medium', 'todo', 6, 5),
        (project_uuid, evidence_task_id, 'Implement file encryption', 'Encrypt uploaded files with AES-256-GCM', 'task', 'urgent', 'todo', 8, 8),
        (project_uuid, evidence_task_id, 'Build evidence viewer', 'View evidence with preview and download', 'task', 'medium', 'todo', 4, 3);

    RAISE NOTICE '✅ Created evidence management tasks';

    -- 4. AI Chat Assistant (Parent Task)
    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points, ai_breakdown_parent
    ) VALUES (
        project_uuid,
        '🤖 AI Legal Research Assistant',
        'OpenAI integration with streaming responses, RAG, UK legal API integration, and citation extraction',
        'feature',
        'high',
        'todo',
        56,
        21,
        TRUE
    ) RETURNING id INTO ai_task_id;

    -- AI assistant subtasks
    INSERT INTO tasks (
        project_id, parent_task_id, title, description, task_type,
        priority, status, estimated_hours, story_points
    ) VALUES
        (project_uuid, ai_task_id, 'Integrate OpenAI SDK', 'Set up OpenAI client with streaming support', 'task', 'high', 'done', 6, 5),
        (project_uuid, ai_task_id, 'Build chat UI component', 'React chat interface with streaming messages', 'task', 'high', 'in_progress', 12, 8),
        (project_uuid, ai_task_id, 'Integrate UK legal APIs', 'legislation.gov.uk and caselaw APIs', 'task', 'high', 'todo', 10, 8),
        (project_uuid, ai_task_id, 'Implement RAG system', 'Vector search over case documents and evidence', 'task', 'high', 'todo', 16, 13),
        (project_uuid, ai_task_id, 'Add citation extraction', 'Parse UK legal citations with eyecite', 'task', 'medium', 'todo', 8, 5),
        (project_uuid, ai_task_id, 'Add disclaimer enforcement', 'Auto-append "not legal advice" disclaimer', 'task', 'urgent', 'todo', 4, 3);

    RAISE NOTICE '✅ Created AI assistant tasks';

    -- ========================================================================
    -- PHASE 2: UI & UX
    -- ========================================================================

    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points
    ) VALUES
        (project_uuid, '📊 Dashboard Overview', 'Summary cards, recent activity, quick actions, statistics', 'feature', 'high', 'todo', 12, 8),
        (project_uuid, '🎨 Dark Theme Implementation', 'Dark mode toggle with CSS variables and theme persistence', 'feature', 'medium', 'todo', 8, 5),
        (project_uuid, '📱 Responsive Design', 'Mobile-friendly layouts for all views', 'feature', 'medium', 'todo', 16, 8),
        (project_uuid, '♿ Accessibility Audit', 'WCAG 2.1 AA compliance with ARIA labels', 'task', 'high', 'todo', 12, 8);

    RAISE NOTICE '✅ Created UI/UX tasks';

    -- ========================================================================
    -- PHASE 3: ADVANCED FEATURES
    -- ========================================================================

    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points
    ) VALUES
        (project_uuid, '📄 PDF Export System', 'Export cases to PDF with professional formatting', 'feature', 'medium', 'todo', 16, 8),
        (project_uuid, '🔍 Full-Text Search', 'SQLite FTS5 search across cases, evidence, notes', 'feature', 'medium', 'todo', 12, 8),
        (project_uuid, '🛡️ GDPR Data Management', 'Data export, right to erasure, consent management, audit logs', 'feature', 'high', 'todo', 24, 13),
        (project_uuid, '⚙️ Settings & Profile', 'User preferences, theme settings, account management', 'feature', 'low', 'todo', 8, 5),
        (project_uuid, '📈 Analytics Dashboard', 'Case statistics, usage metrics, performance indicators', 'feature', 'low', 'todo', 16, 8);

    RAISE NOTICE '✅ Created advanced features';

    -- ========================================================================
    -- PHASE 4: TESTING & QA
    -- ========================================================================

    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points
    ) VALUES
        (project_uuid, '🧪 Unit Test Suite', 'Comprehensive unit tests for all services (target: 1200+ tests)', 'testing', 'high', 'in_progress', 40, 13),
        (project_uuid, '🎭 E2E Test Suite', 'Playwright tests covering critical user flows', 'testing', 'high', 'todo', 32, 13),
        (project_uuid, '🔒 Security Audit', 'OWASP compliance, penetration testing, vulnerability scanning', 'testing', 'urgent', 'todo', 24, 13),
        (project_uuid, '⚡ Performance Testing', 'Load testing, memory profiling, bundle size optimization', 'testing', 'medium', 'todo', 16, 8),
        (project_uuid, '📱 Cross-Platform Testing', 'Test on Windows, macOS, Linux', 'testing', 'high', 'todo', 12, 5);

    RAISE NOTICE '✅ Created testing tasks';

    -- ========================================================================
    -- PHASE 5: DEPLOYMENT & CI/CD
    -- ========================================================================

    INSERT INTO tasks (
        project_id, title, description, task_type, priority,
        status, estimated_hours, story_points
    ) VALUES
        (project_uuid, '🚀 CI/CD Pipeline', 'GitHub Actions for automated testing, building, releases', 'chore', 'high', 'done', 16, 8),
        (project_uuid, '📦 Multi-Platform Builds', 'Windows, macOS, Linux installers with electron-builder', 'chore', 'high', 'done', 20, 8),
        (project_uuid, '📚 Documentation', 'User guide, API docs, developer docs, README', 'documentation', 'high', 'todo', 24, 13),
        (project_uuid, '🎉 Production Release v1.0.0', 'Final testing, polish, and official release', 'chore', 'urgent', 'todo', 32, 13);

    RAISE NOTICE '✅ Created deployment tasks';

    -- ========================================================================
    -- ADD LABELS TO KEY TASKS
    -- ========================================================================

    -- Add labels to authentication tasks
    INSERT INTO task_labels (task_id, label_id)
    SELECT auth_task_id, id FROM labels WHERE name IN ('security', 'backend', 'frontend');

    -- Add labels to case management tasks
    INSERT INTO task_labels (task_id, label_id)
    SELECT case_task_id, id FROM labels WHERE name IN ('backend', 'frontend', 'database');

    -- Add labels to evidence tasks
    INSERT INTO task_labels (task_id, label_id)
    SELECT evidence_task_id, id FROM labels WHERE name IN ('security', 'backend', 'frontend');

    -- Add labels to AI tasks
    INSERT INTO task_labels (task_id, label_id)
    SELECT ai_task_id, id FROM labels WHERE name IN ('ai', 'backend', 'frontend');

    RAISE NOTICE '✅ Added labels to tasks';

    -- ========================================================================
    -- SUMMARY
    -- ========================================================================

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ JUSTICE COMPANION PROJECT PLAN CREATED!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Tasks: %', (SELECT COUNT(*) FROM tasks WHERE project_id = project_uuid);
    RAISE NOTICE 'Total Estimated Hours: %', (SELECT SUM(estimated_hours) FROM tasks WHERE project_id = project_uuid);
    RAISE NOTICE 'Total Story Points: %', (SELECT SUM(story_points) FROM tasks WHERE project_id = project_uuid);
    RAISE NOTICE '';
    RAISE NOTICE 'View your plan:';
    RAISE NOTICE '📊 https://supabase.com/dashboard/project/jxrcbriviucaqzcizqyk/editor/public/tasks';
    RAISE NOTICE '';

END $$;

-- ============================================================================
-- VIEW PROJECT PROGRESS
-- ============================================================================

SELECT * FROM project_progress;

-- ============================================================================
-- VIEW TASK HIERARCHY
-- ============================================================================

SELECT
    REPEAT('  ', depth) || title AS task_tree,
    status,
    estimated_hours,
    story_points
FROM task_hierarchy th
JOIN tasks t ON th.id = t.id
ORDER BY th.path;
