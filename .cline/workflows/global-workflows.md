# Global Cline Workflows
## 🚀 Reusable Workflows for Any Project

### /quick-fix
**Purpose**: Rapidly fix a bug with minimal token usage
```markdown
1. Get exact error message and location from user
2. Read ONLY the error line and 5 lines context (before/after)
3. Identify the issue using ultrathink analysis
4. Apply minimal fix in single edit
5. Verify fix resolves issue
6. Clear context with new task

Token Budget: < 1000 tokens
```

### /add-feature
**Purpose**: Implement new feature efficiently
```markdown
1. Clarify requirements with user (1-2 questions max)
2. Identify similar existing patterns in codebase
3. Read only relevant pattern file (specific methods)
4. Create new feature following pattern
5. Add necessary tests
6. Update documentation if needed

Token Budget: < 3000 tokens
```

### /refactor-code
**Purpose**: Improve code quality without changing behavior
```markdown
1. Identify refactoring scope (specific file/function)
2. Read current implementation (targeted lines)
3. Analyze improvement opportunities
4. Apply refactoring in batched edits
5. Verify tests still pass
6. Document significant changes

Token Budget: < 2000 tokens
```

### /security-audit
**Purpose**: Quick security check of code
```markdown
1. Scan for common vulnerabilities:
   - Hardcoded secrets (search for: password, api_key, secret)
   - SQL injection points (search for: raw queries)
   - XSS vulnerabilities (search for: innerHTML, dangerouslySet)
2. Check dependencies: npm audit
3. Review authentication/authorization
4. Verify data encryption
5. Generate security report

Token Budget: < 1500 tokens
```

### /test-coverage
**Purpose**: Add tests for untested code
```markdown
1. Identify file needing tests
2. Read ONLY public method signatures
3. Create test file following project pattern
4. Write tests for main functionality
5. Run tests to verify
6. Check coverage improvement

Token Budget: < 2000 tokens
```

### /optimize-performance
**Purpose**: Improve code performance
```markdown
1. Identify performance bottleneck from user
2. Read specific problem area
3. Analyze with ultrathink for issues:
   - N+1 queries
   - Unnecessary re-renders
   - Memory leaks
   - Bundle size issues
4. Apply targeted optimization
5. Measure improvement

Token Budget: < 2500 tokens
```

### /api-endpoint
**Purpose**: Create new API endpoint
```markdown
1. Get endpoint requirements (method, path, purpose)
2. Find similar endpoint pattern
3. Create route handler following pattern
4. Add input validation
5. Implement error handling
6. Add basic test
7. Update API documentation

Token Budget: < 2000 tokens
```

### /debug-error
**Purpose**: Systematic debugging approach
```markdown
1. Get error message and stack trace
2. Read EXACT error location (specific line)
3. Trace back through call stack (5 lines each)
4. Identify root cause
5. Apply fix
6. Add error handling to prevent recurrence

Token Budget: < 1500 tokens
```

### /update-deps
**Purpose**: Update dependencies safely
```markdown
1. Run npm outdated (or equivalent)
2. Check breaking changes for major updates
3. Update package.json
4. Run npm install
5. Run tests to verify
6. Fix any breaking changes
7. Commit with clear message

Token Budget: < 1000 tokens
```

### /clean-code
**Purpose**: Quick code cleanup
```markdown
1. Run linter to identify issues
2. Auto-fix what's possible
3. Read specific unfixable issues
4. Manually fix remaining issues
5. Run formatter
6. Verify no behavior changes

Token Budget: < 800 tokens
```

### /add-logging
**Purpose**: Add debug logging to troubleshoot
```markdown
1. Identify problem area from user
2. Read specific function/method
3. Add strategic console.log/logger calls
4. Include relevant variables
5. Add timestamp and context
6. Make logs removable (tagged)

Token Budget: < 1000 tokens
```

### /create-component
**Purpose**: Create new UI component
```markdown
1. Get component requirements
2. Find similar component pattern
3. Create component following pattern
4. Add props interface/types
5. Include basic styling
6. Add to parent component
7. Create basic test

Token Budget: < 2000 tokens
```

### /database-migration
**Purpose**: Create and run database migration
```markdown
1. Understand schema change needed
2. Check current schema (specific tables)
3. Create migration file
4. Add up/down methods
5. Test migration locally
6. Update models/types
7. Document changes

Token Budget: < 1500 tokens
```

### /fix-types
**Purpose**: Fix TypeScript type errors
```markdown
1. Run type checker to list errors
2. Group errors by type
3. Read specific error locations
4. Fix types (prefer inference over explicit)
5. Add missing type definitions
6. Verify no runtime changes

Token Budget: < 1200 tokens
```

### /setup-ci
**Purpose**: Configure CI/CD pipeline
```markdown
1. Identify CI platform (GitHub Actions, etc.)
2. Find existing workflow or template
3. Create workflow file
4. Add test job
5. Add build job
6. Add deployment step (if needed)
7. Test workflow

Token Budget: < 1500 tokens
```

## 🎯 Workflow Optimization Tips

### Starting a Workflow:
- Clear previous context with "New Task"
- State workflow name clearly: "Run /quick-fix workflow"
- Provide necessary context upfront

### During Workflow:
- Follow steps strictly
- Don't deviate unless blocked
- Keep responses concise
- Batch operations when possible

### Ending Workflow:
- Summarize what was done
- Clear context if switching tasks
- Document any deviations

## 📊 Workflow Metrics

### Track Success:
- Tokens used vs budget
- Time to complete
- Steps completed vs planned
- Quality of outcome

### Continuous Improvement:
- Adjust token budgets based on usage
- Refine steps based on patterns
- Add new workflows for repetitive tasks
- Share successful patterns