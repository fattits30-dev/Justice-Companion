# Workflow: Add New Feature

## Steps:
1. `sequential_think(task="Add [feature name]")`
2. `search_files(pattern="[relevant]", file_extension=".ts")` - Find relevant files
3. `file_manager(action="read", path="[file]")` - Understand existing code
4. `file_manager(action="write", path="[new file]", content="...")` - Implement feature
5. `type_check()` - Verify types
6. `lint_code(fix=True)` - Fix linting issues
7. `run_tests(test_type="unit")` - Run tests
8. `git_status()` - Check what changed
9. `git_diff()` - Review changes
10. `git_commit(message="Add [feature]", files=".")` - Commit
11. `audit_tools_used()` - Verify workflow

## Safety Checks:
✅ type_check before commit
✅ run_tests after changes
✅ git_diff before commit

## Estimated Time: 10-15 minutes
