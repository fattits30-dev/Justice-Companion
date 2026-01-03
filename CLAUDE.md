# Justice Companion - Claude Code Instructions

## MANDATORY MCP Usage

You MUST use the following MCP tools as specified. These are not optional.

---

### 1. GitHub MCP - Project Persistence

**ALWAYS use GitHub MCP for:**
- Creating commits with meaningful messages
- Creating/reviewing pull requests
- Managing issues for bugs and features
- Syncing work to remote repository
- Checking CI/CD status before merging

**Commands:**
```
mcp__github__create_issue - Log bugs and feature requests
mcp__github__create_pull_request - Submit changes for review
mcp__github__get_pull_request - Review PR details
mcp__github__list_issues - Check existing issues before creating duplicates
```

**Rules:**
- After completing any significant feature or fix, CREATE A COMMIT
- Before starting new work, PULL latest changes
- Create issues for any bugs discovered during development
- Never push directly to main without PR review

---

### 2. Sequential Thinking MCP - Debugging/Fixing/Implementing

**ALWAYS use Sequential Thinking for:**
- Debugging errors (analyze step-by-step)
- Implementing new features (plan before coding)
- Fixing complex bugs (trace through logic)
- Refactoring code (consider all implications)
- Architecture decisions (evaluate trade-offs)

**When to invoke:**
```
mcp__sequential-thinking__sequentialthinking
```

**Rules:**
- Before writing ANY fix for a bug, use sequential thinking to analyze root cause
- Before implementing a feature, use sequential thinking to plan the approach
- When stuck on a problem, use sequential thinking to break it down
- Document the reasoning in code comments when relevant

---

### 3. Context7 MCP - Best Practices & Documentation

**ALWAYS use Context7 for:**
- Looking up Flutter/Dart best practices
- Checking Flutter build configuration options
- Finding correct API usage for libraries
- Verifying platform integration plugins
- FastAPI/Python backend patterns

**When to invoke:**
```
mcp__context7__resolve-library-id - Find the library
mcp__context7__get-library-docs - Get documentation
```

**Rules:**
- Before using any library API you're unsure about, CHECK CONTEXT7 FIRST
- When implementing patterns (auth, state management, etc.), look up best practices
- Don't guess at library APIs - verify with documentation
- Use latest patterns, not outdated approaches

---

### 4. Memory MCP - Project Knowledge

**ALWAYS use Memory for:**
- Storing architectural decisions
- Recording project-specific patterns
- Saving debugging insights
- Tracking technical debt
- Remembering user preferences

**Commands:**
```
mcp__memory__create_entities - Store new knowledge
mcp__memory__create_relations - Link related concepts
mcp__memory__search_nodes - Recall stored information
```

**Rules:**
- After making an architectural decision, STORE IT in memory
- When discovering a non-obvious pattern, SAVE IT
- Before implementing something, CHECK if there's existing knowledge
- Update memory when patterns change

---

### 5. Project Planner MCP - Task Management

**ALWAYS use Planner for:**
- Breaking down features into tasks
- Tracking implementation progress
- Managing dependencies between tasks
- Estimating complexity
- Keeping work organized

**Rules:**
- At the START of any session, check/update the project plan
- Break down large features into subtasks BEFORE implementing
- Mark tasks complete as you finish them
- Keep the plan in sync with GitHub issues
- Update plan when scope changes

---

## Project Structure

```
Justice-Companion/
├── lib/                    # Flutter app
│   ├── app/                # App shell, routing, theme
│   ├── data/               # Data sources and repositories
│   ├── domain/             # Domain entities and contracts
│   └── ui/                 # Screens/widgets
├── backend/                # Python FastAPI
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── models/             # Database models
├── scripts/                # Dev scripts (use these!)
├── android/ios/...         # Flutter platform targets
└── test/                   # Flutter tests
```

## Development Commands

```bash
# Always use these scripts
./scripts/dev.sh frontend     # Start dev server
./scripts/test.sh frontend    # Run tests
./scripts/lint.sh             # Check code quality
./scripts/build.sh            # Production build
./scripts/component-dev.sh    # Component development
```

## Workflow Rules

1. **Before Starting Work:**
   - Pull latest: `git pull origin main`
   - Check planner for current tasks
   - Review any open issues

2. **During Development:**
   - Use sequential thinking for complex logic
   - Check context7 for library usage
   - Store insights in memory
   - Update planner as you progress

3. **After Completing Work:**
   - Run tests: `./scripts/test.sh frontend`
   - Run lint: `./scripts/lint.sh`
   - Commit with clear message
   - Push and create PR if significant
   - Update planner to mark complete

4. **On Errors:**
   - Use sequential thinking to debug
   - Check context7 for correct patterns
   - Create GitHub issue if it's a bug
   - Store fix approach in memory

## Code Quality Standards

- Dart analyzer must pass (flutter analyze)
- Flutter lints must pass (0 errors)
- All critical widgets should have tests
- No `dynamic` types without justification
- Use existing UI components from `lib/ui/` where possible

## Environment

- **Platform:** Android/Termux
- **Flutter SDK:** 3.x
- **Dart:** 3.x (via Flutter)
- **Backend:** Python 3.12 (limited on Termux)
- **CI/CD:** GitHub Actions (use for full tests/builds)
