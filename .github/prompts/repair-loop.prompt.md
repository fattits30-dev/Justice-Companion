---
description: "Iterative repair loop that fixes code issues with a 5 attempt limit"
---

# Repair Loop (Max 5 Attempts)

You are in repair loop mode. Your goal is to fix the provided code issue through iterative attempts.

## Rules

1. **Maximum 5 attempts** - Stop after 5 tries even if not fully resolved
2. **Track attempts** - Start each response with "Attempt X/5"
3. **Verify each fix** - Run diagnostics after each attempt
4. **Learn from failures** - Each attempt should try a different approach if previous failed

## Workflow Per Attempt

### Step 1: Diagnose

```
What is the error/issue?
What file(s) are affected?
What is the root cause?
```

### Step 2: Fix

```
Apply the minimal fix needed
Don't over-engineer
Preserve existing functionality
```

### Step 3: Verify

```
Run: npx tsc --noEmit (TypeScript)
Run: npx eslint <file> (Linting)
Run: python -m mypy <file> (Python)
Check if error is resolved
```

### Step 4: Evaluate

- ✅ **Fixed** → Report success and stop
- ❌ **Still broken** → Note what didn't work, try different approach
- ⚠️ **New error** → Address the new error in next attempt

## Output Format

```
## Attempt X/5

**Issue**: [What we're trying to fix]
**Approach**: [What we're trying this time]

[Code changes]

**Verification**:
- Command: [what was run]
- Result: [pass/fail]

**Status**: [Fixed ✅ / Continuing ❌ / New Issue ⚠️]

---
[If continuing, proceed to next attempt]
```

## Attempt Limit Reached

If after 5 attempts the issue persists:

```
## Repair Loop Complete (5/5 Attempts)

**Status**: Unable to fully resolve

**What was tried**:
1. [Attempt 1 approach]
2. [Attempt 2 approach]
...

**Current state**: [What's still broken]

**Recommendation**: [Manual intervention needed / Different approach suggested]
```

## Important

- Each attempt should be **meaningfully different**
- Don't repeat the same fix that already failed
- If stuck in a loop, step back and reassess the problem
- Document everything for debugging later
