# Workflow: Pre-Release Preparation

## Steps:
1. `sequential_think(task="Prepare for v[version] release")`
2. `git_status()` - Check repository state
3. `type_check()` - Ensure no type errors
4. `lint_code(fix=True)` - Auto-fix linting issues
5. `run_tests(test_type="coverage")` - Full test suite with coverage
6. `build_app(platform="all")` - Build for all platforms (Windows, Mac, Linux)
7. `db_backup(action="create")` - Create pre-release backup
8. `todo_add(task="Test Windows installer", priority=1)` - Add testing tasks
9. `todo_add(task="Test macOS DMG", priority=1)`
10. `todo_add(task="Test Linux packages", priority=2)`
11. `git_commit(message="Prepare v[version] release", files=".")` - Commit
12. `audit_tools_used()` - Verify workflow

## Safety Checks:
✅ Full test coverage
✅ All platforms built
✅ Database backed up
✅ Manual testing tasks tracked

## Use Case:
- Before version releases
- Major feature deployments
- Production updates

## Estimated Time: 20-30 minutes
