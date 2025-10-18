---
allowed-tools: Bash(git:*), Bash(gh:*), Task(project-coordinator), MCP(memory:*), MCP(time:*), MCP(sequential-thinking:*)
description: Track development velocity, milestones, and generate progress reports (4 actions)
model: claude-sonnet-4-5-20250929
---

# Project Tracker Workflow

**Action**: $ARGUMENTS (daily|weekly|estimate|milestone)

## Action 1: Daily Standup Report
```bash
# Usage: /project-tracker daily

# 1. Pull today's work from git
git log --since="midnight" --author="$(git config user.name)" --oneline --stat > today.txt

# 2. Calculate velocity
commits_today=$(git log --since="midnight" --author="$(git config user.name)" --oneline | wc -l)
files_changed=$(git diff --stat HEAD@{1.day.ago}..HEAD | tail -1)

# 3. Get PRs merged today
gh pr list --state merged --search "merged:>=$(date -I)" --json number,title,createdAt,mergedAt > prs-today.json

# 4. Retrieve yesterday's blockers from Memory
/mcp__memory__recall --key="blockers-$(date -d yesterday +%Y%m%d)"

# 5. Generate standup report with Sequential Thinking
/mcp__sequential-thinking__analyze --input="{
  commits: $commits_today,
  files_changed: '$files_changed',
  prs_merged: {prs-today.json},
  yesterday_blockers: {memory_output}
}" --format=standup

# Output:
echo "## Daily Standup - $(date +%Y-%m-%d)

### Yesterday:
- Commits: $commits_today
- Files changed: $files_changed
- PRs merged: {count}
- Blockers resolved: {list_from_memory}

### Today's Plan:
{inferred_from_git_status_and_open_prs}

### Current Blockers:
{from_sequential_thinking_analysis}
"

# 6. Store today's blockers
read -p "Any blockers? " blockers
/mcp__memory__store --key="blockers-$(date +%Y%m%d)" --value="$blockers"

# 7. Log timestamp
/mcp__time__log --event="daily-standup" --timestamp="$(date -Iseconds)"
```

## Action 2: Weekly Progress Report
```bash
# Usage: /project-tracker weekly

# 1. Pull week's git activity
git log --since="1 week ago" --author="$(git config user.name)" --oneline --stat > week.txt
git log --since="1 week ago" --author="$(git config user.name)" --pretty=format:"%h - %s" > commits-week.txt

# 2. Calculate weekly metrics
commits_week=$(git log --since="1 week ago" --author="$(git config user.name)" --oneline | wc -l)
prs_merged=$(gh pr list --state merged --search "merged:>=$(date -d '1 week ago' -I)" --json number | jq '. | length')
issues_closed=$(gh issue list --state closed --search "closed:>=$(date -d '1 week ago' -I)" --json number | jq '. | length')

# 3. Retrieve last week's baseline from Memory
/mcp__memory__recall --key="weekly-baseline-$(date -d '1 week ago' +%Y%m%d)"

# 4. Compare velocity with Sequential Thinking
/mcp__sequential-thinking__compare --baseline="{memory_output}" --current="{
  commits: $commits_week,
  prs_merged: $prs_merged,
  issues_closed: $issues_closed
}"

# 5. Generate weekly report
Task tool with subagent_type="project-coordinator"
Prompt: "Generate weekly progress report for Justice Companion:
- Commits this week: $commits_week
- PRs merged: $prs_merged
- Issues closed: $issues_closed
- Velocity trend: {sequential_thinking_output}
- Key changes: {commits-week.txt}

Format: Markdown with sections for Achievements, Velocity Analysis, Next Week Goals, Risks."

# 6. Store this week's baseline
/mcp__memory__store --key="weekly-baseline-$(date +%Y%m%d)" --value="{
  commits: $commits_week,
  prs_merged: $prs_merged,
  issues_closed: $issues_closed,
  timestamp: '$(date -Iseconds)'
}"

# 7. Track milestone progress
/mcp__time__milestone-check --event="weekly-review"
```

## Action 3: Feature Estimation
```bash
# Usage: /project-tracker estimate "feature description"

feature_description="$ARGUMENTS"

# 1. Search Memory for similar past features
/mcp__memory__search --query="feature $feature_description" --type=completed

# 2. Analyze similar features with Sequential Thinking
/mcp__sequential-thinking__analyze --input="{
  new_feature: '$feature_description',
  past_features: {memory_search_results},
  historical_velocity: {recent_velocity_from_memory}
}" --task=estimate-effort

# Output includes:
# - Estimated hours (based on similar features)
# - Complexity score (1-10)
# - Risk factors
# - Suggested breakdown (tasks)

# 3. Generate detailed estimate
Task tool with subagent_type="project-coordinator"
Prompt: "Create development estimate for: $feature_description

Based on historical data: {memory_search_results}
Sequential Thinking analysis: {sequential_thinking_output}

Provide:
- Estimated time (optimistic, realistic, pessimistic)
- Task breakdown
- Dependencies
- Risk factors
- Similar past features for comparison

Justice Companion context: React 18.3, TypeScript 5.9.3, Electron 38.2.1, DDD architecture."

# 4. Store estimate for future comparison
/mcp__memory__store --key="estimate-$(echo $feature_description | tr ' ' '-')-$(date +%Y%m%d)" --value="{
  feature: '$feature_description',
  estimated_hours: {from_agent_output},
  estimated_date: '$(date -Iseconds)',
  complexity: {complexity_score}
}"

# 5. Log estimation event
/mcp__time__log --event="feature-estimated" --feature="$feature_description"
```

## Action 4: Milestone Progress Check
```bash
# Usage: /project-tracker milestone "v1.0.0"

milestone="$ARGUMENTS"

# 1. Get GitHub milestone data
gh api "repos/:owner/:repo/milestones" --jq ".[] | select(.title==\"$milestone\")" > milestone.json
open_issues=$(jq '.open_issues' milestone.json)
closed_issues=$(jq '.closed_issues' milestone.json)
due_date=$(jq -r '.due_on' milestone.json)

# 2. Calculate completion percentage
total_issues=$((open_issues + closed_issues))
completion_pct=$(echo "scale=2; $closed_issues * 100 / $total_issues" | bc)

# 3. Get milestone baseline from Memory
/mcp__memory__recall --key="milestone-$milestone-baseline"

# 4. Analyze progress trend with Sequential Thinking
/mcp__sequential-thinking__analyze --input="{
  milestone: '$milestone',
  due_date: '$due_date',
  completion: $completion_pct,
  open_issues: $open_issues,
  closed_issues: $closed_issues,
  baseline: {memory_output},
  current_date: '$(date -Iseconds)'
}" --task=predict-completion

# Output includes:
# - On track / behind / ahead status
# - Predicted completion date
# - Burn-down rate
# - Recommended actions

# 5. Generate milestone report
echo "## Milestone Progress: $milestone

### Status
- Due date: $due_date
- Completion: $completion_pct%
- Open issues: $open_issues
- Closed issues: $closed_issues

### Trend Analysis
{sequential_thinking_output}

### Burn-down Rate
{calculated_from_memory_baseline}

### Prediction
{completion_date_prediction}

### Actions Needed
{recommended_actions_from_sequential_thinking}
"

# 6. Update milestone tracking in Memory
/mcp__memory__update --key="milestone-$milestone-baseline" --append="{
  date: '$(date -Iseconds)',
  completion: $completion_pct,
  open_issues: $open_issues,
  closed_issues: $closed_issues
}"

# 7. Check milestone deadline with Time MCP
/mcp__time__milestone-check --milestone="$milestone" --due-date="$due_date"
```

## Efficiency Gains
- **Zero manual tracking**: MCPs store all velocity data automatically
- **Historical learning**: Memory MCP learns from past estimates to improve accuracy
- **Trend detection**: Sequential Thinking identifies patterns (e.g., "velocity drops on Fridays")
- **Proactive alerts**: Time MCP warns if milestone at risk

## When to Use
- **Daily standup**: Every morning (`/project-tracker daily`)
- **Weekly review**: Every Friday (`/project-tracker weekly`)
- **Before feature work**: Estimate effort (`/project-tracker estimate "PDF export"`)
- **Sprint planning**: Check milestone progress (`/project-tracker milestone "v1.0.0"`)

## Integration with Other Workflows
- After `/feature` completion: Stores actual time for future estimates
- After `/git-pr`: Logs PR velocity for trend analysis
- After `/security` or `/perf`: Tracks time spent on non-feature work

**Justice Companion Metrics Tracked**:
- Commits/day (current average from Memory)
- PRs/week (velocity trend)
- Test coverage delta (from CI runs)
- TypeScript errors delta (e.g., 223 → 72 → 0)
- Build time trends (performance metric)
