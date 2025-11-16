# Workflow: Code Quality Check

## Steps:
1. `sequential_think(task="Run full code quality check")`
2. `type_check()` - TypeScript type checking
3. `lint_code(fix=False)` - Check linting issues
4. `format_code()` - Format with Prettier
5. `run_tests(test_type="coverage")` - Run tests with coverage
6. `git_status()` - Check repository status
7. `audit_tools_used()` - Verify workflow

## Safety Checks:
✅ All quality tools run
✅ No auto-fixes applied (review first)
✅ Coverage report generated

## Use Case:
- Before pull requests
- After refactoring
- Regular health checks

## Estimated Time: 3-5 minutes
