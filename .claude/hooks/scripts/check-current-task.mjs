#!/usr/bin/env node

/**
 * Task Enforcer Script
 * Reminds Claude to check Planner MCP before starting work
 */

const input = JSON.parse(process.argv[2] || '{}');

const reminder = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK ENFORCER REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before starting work, you MUST:

1. Check Planner MCP for the current task
2. Verify what the active task is
3. Work ONLY on that task until complete
4. Do NOT start new tasks without finishing current ones

Use the Planner MCP tools to check task status NOW.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

const output = {
  systemMessage: reminder
};

console.log(JSON.stringify(output));
