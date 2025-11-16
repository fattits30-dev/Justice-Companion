# Workflow: Database Migration

## Steps:
1. `sequential_think(task="Add [migration description]")`
2. `db_backup(action="create")` - ⚠️ CRITICAL - ALWAYS backup first!
3. `db_migrate(action="create")` - Create new migration file
4. `file_manager(action="write", path="src/db/migrations/[file].sql", content="...")` - Write SQL
5. `db_migrate(action="run")` - Apply migration
6. `db_migrate(action="status")` - Verify migration applied
7. `run_tests(test_type="unit")` - Test database changes
8. `git_commit(message="Add migration: [description]", files=".")` - Commit
9. `audit_tools_used()` - Verify workflow

## Safety Checks:
✅ db_backup BEFORE db_migrate (NON-NEGOTIABLE)
✅ db_migrate status to verify
✅ run_tests to ensure no breaks

## CRITICAL RULE:
🚨 NEVER run db_migrate without db_backup first!

## Estimated Time: 5-8 minutes
