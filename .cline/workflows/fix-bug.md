# Workflow: Fix Bug

## Steps:
1. `sequential_think(task="Fix [bug description]")`
2. `grep_code(search_term="[error term]", file_pattern="*.ts")` - Find bug location
3. `file_manager(action="read", path="[affected file]")` - Read affected code
4. `file_manager(action="write", path="[affected file]", content="...")` - Apply fix
5. `run_tests(test_type="unit", file_path="[test file]")` - Verify fix
6. `type_check()` - Ensure no type errors
7. `git_diff()` - Review changes
8. `git_commit(message="Fix [bug]", files="[file]")` - Commit fix
9. `audit_tools_used()` - Verify workflow

## Safety Checks:
✅ run_tests to verify fix
✅ type_check before commit
✅ git_diff to review changes

## Estimated Time: 5-10 minutes
