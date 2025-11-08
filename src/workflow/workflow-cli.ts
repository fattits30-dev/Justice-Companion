#!/usr/bin/env tsx
/**
 * Workflow Builder CLI
 *
 * Interactive command-line interface for the generic workflow builder system.
 *
 * Usage:
 *   pnpm tsx src/workflow/workflow-cli.ts
 */

import readline from "readline";
import { ConfigManager } from "./ConfigManager.ts";
import { ProjectPlanner } from "./ProjectPlanner.ts";
import { TodoManager } from "./TodoManager.ts";
// @ts-expect-error - Unused import WorkflowPlan - workflow files are WIP
import type { WorkflowPlan } from "./types.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║           Generic Workflow Builder v1.0.0                ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Step 1: Get project path
  const projectPath = process.cwd();
  console.log(`📁 Project Directory: ${projectPath}\n`);

  const configManager = new ConfigManager(projectPath);

  // Step 2: Check if .localclaude/ exists
  if (configManager.exists()) {
    console.log("✓ Found existing .localclaude/ configuration\n");

    const config = await configManager.loadConfig();
    if (config) {
      console.log("📋 Project Summary:");
      console.log(await configManager.getSummary());
      console.log("");

      // Load existing plan
      const plan = await configManager.loadPlan();
      if (plan) {
        const todoManager = new TodoManager(projectPath);
        await todoManager.loadPlan(plan);

        console.log("✓ Loaded existing workflow plan\n");

        // Show task list
        await todoManager.showTodoList();
        await todoManager.showProgress();

        // Interactive loop
        await interactiveLoop(todoManager, configManager);
        rl.close();
        return;
      }
    }
  }

  // Step 3: Initialize new project
  console.log("❌ No .localclaude/ configuration found\n");
  console.log("Let me help you set up a workflow for this project.\n");

  const shouldSetup = await question(
    "Create workflow configuration? (yes/no): "
  );

  if (
    shouldSetup.toLowerCase() !== "yes" &&
    shouldSetup.toLowerCase() !== "y"
  ) {
    console.log("\nExiting without configuration.\n");
    rl.close();
    return;
  }

  // Step 4: Analyze project
  const planner = new ProjectPlanner(projectPath);
  const analysis = await planner.analyzeProject();

  console.log("\n📊 Project Analysis:");
  console.log(`  Languages: ${analysis.techStack.languages.join(", ")}`);
  console.log(
    `  Frameworks: ${analysis.techStack.frameworks.join(", ") || "None detected"}`
  );
  console.log(
    `  Package Manager: ${analysis.techStack.packageManager || "npm"}`
  );
  console.log(`  Files: ${analysis.structure.fileCount}`);
  console.log(`  Libraries: ${analysis.libraries.length}`);
  console.log("");

  if (analysis.existingFeatures.length > 0) {
    console.log("✨ Existing Features (from README):");
    analysis.existingFeatures.slice(0, 5).forEach((feature) => {
      console.log(`  - ${feature}`);
    });
    if (analysis.existingFeatures.length > 5) {
      console.log(`  ... and ${analysis.existingFeatures.length - 5} more`);
    }
    console.log("");
  }

  if (analysis.suggestedImprovements.length > 0) {
    console.log("💡 Suggested Improvements:");
    analysis.suggestedImprovements.forEach((improvement) => {
      console.log(`  - ${improvement}`);
    });
    console.log("");
  }

  // Step 5: Get user goal
  console.log("What's your main goal for this project?");
  console.log("(Press Enter to use README goals)\n");

  const userGoal = await question("Goal: ");

  // Step 6: Generate plan
  const plan = await planner.generatePlan(userGoal || undefined, analysis);

  // Step 7: Initialize config
  const projectName = plan.projectName;
  await configManager.initialize(projectName, projectPath);

  console.log(`\n✓ Created .localclaude/ configuration\n`);

  // Step 8: Save plan
  await configManager.savePlan(plan);

  // Step 9: Load into TodoManager
  const todoManager = new TodoManager(projectPath);
  await todoManager.loadPlan(plan);

  // Step 10: Show plan
  await todoManager.showTodoList();
  await todoManager.showProgress();

  console.log("\n✅ Workflow setup complete!\n");
  console.log(
    "Next time you run this command, I'll load your existing plan.\n"
  );

  // Interactive loop
  await interactiveLoop(todoManager, configManager);

  rl.close();
}

async function interactiveLoop(
  todoManager: TodoManager,
  configManager: ConfigManager
) {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                Interactive Workflow Mode                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log("Commands:");
  console.log("  next       - Show next available task");
  console.log("  start <id> - Start a task");
  console.log("  done <id>  - Mark task as complete");
  console.log("  fail <id>  - Mark task as failed");
  console.log("  list       - Show TODO list");
  console.log("  progress   - Show progress");
  console.log("  add        - Add new task");
  console.log("  help       - Show commands");
  console.log("  quit       - Exit\n");

  while (true) {
    const command = await question("\n> ");

    if (!command) {
      continue;
    }

    const [cmd, ...args] = command.split(" ");

    try {
      switch (cmd.toLowerCase()) {
        case "next": {
          const nextTask = await todoManager.getNextTask();
          if (nextTask) {
            console.log("\n📋 Next Available Task:");
            console.log(`  ID: ${nextTask.id}`);
            console.log(`  Title: ${nextTask.title}`);
            console.log(`  Description: ${nextTask.description}`);
            console.log(`  Priority: ${nextTask.priority}`);
            console.log(`  Category: ${nextTask.category}`);
          } else {
            console.log(
              "\n✅ No pending tasks! All dependencies blocked or plan complete."
            );
          }
          break;
        }

        case "start": {
          const taskId = args[0];
          if (!taskId) {
            console.log("❌ Usage: start <task-id>");
            break;
          }

          const task = await todoManager.startTask(taskId);
          if (task) {
            console.log(`\n✓ Started task: ${task.title}`);
          } else {
            console.log(`\n❌ Task not found: ${taskId}`);
          }
          break;
        }

        case "done": {
          const taskId = args[0];
          if (!taskId) {
            console.log("❌ Usage: done <task-id>");
            break;
          }

          const task = await todoManager.completeTask(taskId);
          if (!task) {
            console.log(`\n❌ Task not found: ${taskId}`);
          }
          break;
        }

        case "fail": {
          const taskId = args[0];
          if (!taskId) {
            console.log("❌ Usage: fail <task-id> <reason>");
            break;
          }

          const reason = args.slice(1).join(" ") || "No reason provided";
          const task = await todoManager.failTask(taskId, reason);
          if (!task) {
            console.log(`\n❌ Task not found: ${taskId}`);
          }
          break;
        }

        case "list": {
          await todoManager.showTodoList(false);
          break;
        }

        case "list:all": {
          await todoManager.showTodoList(true);
          break;
        }

        case "progress": {
          await todoManager.showProgress();
          break;
        }

        case "add": {
          console.log("\n➕ Add New Task:");
          const title = await question("  Title: ");
          const description = await question("  Description: ");
          const phase = await question("  Phase (default: Manual): ");

          await todoManager.addTask(title, description, phase || "Manual");
          break;
        }

        case "summary": {
          console.log("\n" + (await configManager.getSummary()));
          break;
        }

        case "backup": {
          const label = args[0] || "manual";
          const backupPath = await configManager.createBackup(label);
          console.log(`\n✓ Created backup: ${backupPath}`);
          break;
        }

        case "help": {
          console.log("\nAvailable Commands:");
          console.log("  next       - Show next available task");
          console.log("  start <id> - Start a task");
          console.log("  done <id>  - Mark task as complete");
          console.log("  fail <id> <reason> - Mark task as failed");
          console.log("  list       - Show TODO list (pending only)");
          console.log("  list:all   - Show all tasks (including completed)");
          console.log("  progress   - Show progress bar");
          console.log("  add        - Add new task interactively");
          console.log("  summary    - Show project summary");
          console.log("  backup [label] - Create backup of current state");
          console.log("  help       - Show this help");
          console.log("  quit       - Exit interactive mode");
          break;
        }

        case "quit":
        case "exit":
          console.log("\n✅ Workflow session saved. Goodbye!\n");
          return;

        default:
          console.log(`\n❌ Unknown command: ${cmd}`);
          console.log('Type "help" for available commands.');
      }
    } catch (error) {
      console.error(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Run CLI
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
