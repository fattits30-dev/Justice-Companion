# Global Ultrathink Rules for Cline
## 🧠 Ultrathink Methodology: Deep Analysis Before Action

### Core Principle: THINK → ANALYZE → PLAN → EXECUTE
Before ANY action, engage in deep reasoning to minimize token usage and maximize accuracy.

## 🎯 Token Optimization Rules

### File Operations (Reduce 80% Token Usage)
1. **NEVER read entire files** when you only need specific sections
   - Use line ranges: "Read lines 50-100 of file.js"
   - Focus on specific functions or classes
2. **AVOID re-reading files** you've already seen
   - Keep mental notes of file structure
   - Reference previous reads in conversation
3. **BATCH operations** together
   - Group multiple edits to same file
   - Combine related file reads in single request

### Context Management
- **START new tasks** when switching contexts (clear history)
- **SUMMARIZE** long conversations before continuing
- **EXCLUDE** unnecessary files from workspace analysis
- **USE** specific file paths instead of wildcards

## 🔍 Ultrathink Analysis Framework

### Before Any Code Change:
```
1. UNDERSTAND: What is the actual problem?
2. CONTEXT: What existing code relates to this?
3. IMPACT: What could break?
4. PATTERN: Is there an existing pattern to follow?
5. OPTIMIZE: What's the minimal change needed?
```

### Decision Tree for Actions:
```
Need Information?
├── Specific location known? → Read specific lines
├── Pattern searching? → Use grep/search first
└── Exploring structure? → Read package.json/main files only

Making Changes?
├── Single file? → Batch all edits together
├── Multiple files? → Plan sequence to minimize re-reads
└── New feature? → Check existing patterns first
```

## 💡 Smart Shortcuts

### Information Gathering (Save 70% tokens)
```bash
# Instead of: "Read all files in src/"
# Use: "Show me the main entry point and package.json structure"

# Instead of: "Read the entire component"
# Use: "Show me the render method and state management in Component.jsx"

# Instead of: Reading file multiple times
# Use: "Based on our earlier read of file.js, modify the function..."
```

### Code Modifications (Save 60% tokens)
```bash
# Batch related changes:
"In UserService.js:
1. Update the login method (lines 45-60)
2. Add error handling (after line 58)
3. Update the return type (line 47)"

# Reference patterns:
"Apply the same error handling pattern from AuthService.js"
```

## 🏗️ Architecture Awareness

### Always Consider:
1. **Existing Patterns**: Follow established conventions
2. **Dependencies**: Check package.json before suggesting libraries
3. **Security**: Never expose sensitive data
4. **Performance**: Avoid unnecessary complexity
5. **Maintainability**: Prefer clarity over cleverness

### Language-Specific Optimizations:

#### JavaScript/TypeScript
- Prefer functional approaches
- Use TypeScript strict mode
- Leverage existing utilities
- Follow ESLint rules

#### Python
- Follow PEP 8
- Use type hints
- Prefer comprehensions
- Leverage standard library

#### Other Languages
- Follow language idioms
- Use standard libraries first
- Maintain consistent style

## 🚀 Efficiency Patterns

### Pattern 1: Reconnaissance First
```
1. Check package.json/requirements.txt
2. Identify main entry points
3. Understand folder structure
4. THEN make targeted reads
```

### Pattern 2: Incremental Development
```
1. Make smallest working change
2. Test that change
3. Build on success
4. Avoid big-bang refactors
```

### Pattern 3: Error Recovery
```
1. Identify exact error location
2. Read ONLY the error context
3. Apply minimal fix
4. Verify fix works
```

## 🎨 Communication Style

### Ultrathink Responses:
- **CONCISE**: Get to the point quickly
- **SPECIFIC**: Reference exact locations
- **ACTIONABLE**: Clear next steps
- **EFFICIENT**: Minimize back-and-forth

### Example Response Pattern:
```
"I'll fix the authentication issue by:
1. Updating line 47 in auth.js (add null check)
2. Adding error handler at line 62
This follows your existing error pattern from user.js."
```

## 🔒 Security & Compliance

### Always:
- Validate inputs
- Sanitize outputs
- Encrypt sensitive data
- Follow OWASP guidelines
- Respect privacy laws

### Never:
- Hardcode secrets
- Log sensitive data
- Trust user input
- Ignore security warnings
- Skip validation

## 📊 Performance Considerations

### Code Performance:
- Avoid N+1 queries
- Implement caching where appropriate
- Use async/await properly
- Optimize bundle sizes
- Profile before optimizing

### Cline Performance:
- Clear context regularly
- Use specific file paths
- Batch operations
- Avoid unnecessary reads
- Start new tasks for new features

## 🧪 Testing Philosophy

### Test Strategy:
1. **Unit**: Core business logic
2. **Integration**: API and service boundaries
3. **E2E**: Critical user paths only
4. **Performance**: Measure don't guess

### Test Writing:
- Test behavior not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

## 📝 Documentation Approach

### When to Document:
- Complex business logic
- Non-obvious decisions
- API contracts
- Configuration options

### Documentation Style:
- Clear and concise
- Include examples
- Explain "why" not just "what"
- Keep close to code

## 🔄 Continuous Improvement

### After Each Task:
1. What worked well?
2. What used too many tokens?
3. What pattern can be reused?
4. What should be automated?

### Learning from Patterns:
- Identify repetitive tasks
- Create workflows for common operations
- Build on successful approaches
- Share knowledge in documentation

## 🎯 Quick Reference

### Token Savers:
- `New Task` button: Clears context
- Specific line reads: `lines 10-20`
- Reference previous: `As we saw earlier...`
- Batch edits: Multiple changes at once
- Use search: Find before reading

### Quality Checkers:
- Run linters before committing
- Test after each change
- Security scan regularly
- Profile performance
- Review accessibility

## 🚨 Red Flags to Avoid

### High Token Usage:
❌ Reading entire directories
❌ Re-reading same files
❌ Long explanations
❌ Trial-and-error debugging
❌ Unfocused exploration

### Better Approaches:
✅ Targeted file reads
✅ Remember previous context
✅ Concise communication
✅ Systematic debugging
✅ Planned exploration

---

**Remember**: Every token counts. Think deeply, act precisely, communicate efficiently.

**Ultrathink Mantra**: "Measure twice, cut once, explain briefly."