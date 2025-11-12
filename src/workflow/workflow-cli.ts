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
import { logger } from '../utils/logger';
// Unused import for future use - workflow files are WIP
import type { WorkflowPlan as _WorkflowPlan } from "./types.ts";

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
  logger.info("\n╔══════════════════════════════════════════════════════════╗");
  logger.info("║           Generic Workflow Builder v1.0.0                ║");
  logger.info("╚══════════════════════════════════════════════════════════╝\n");

  // Step 1: Get project path
  const projectPath = process.cwd();
  logger.info(`📁 Project Directory: ${projectPath}\n`);

  const configManager = new ConfigManager(projectPath);

  // Step 2: Check if .localclaude/ exists
  if (configManager.exists()) {
    logger.info("✓ Found existing .localclaude/ configuration\n");

    const config = await configManager.loadConfig();
    if (config) {
      logger.info("📋 Project Summary:");
      logger.info(await configManager.getSummary());
      logger.info("");

      // Load existing plan
      const plan = await configManager.loadPlan();
      if (plan) {
        const todoManager = new TodoManager(projectPath);
        await todoManager.loadPlan(plan);

        logger.info("✓ Loaded existing workflow plan\n");

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
  logger.info("❌ No .localclaude/ configuration found\n");
  logger.info("Let me help you set up a workflow for this project.\n");

  const shouldSetup = await question(
    "Create workflow configuration? (yes/no): ",
  );

  if (
    shouldSetup.toLowerCase() !== "yes" &&
    shouldSetup.toLowerCase() !== "y"
  ) {
    logger.info("\nExiting without configuration.\n");
    rl.close();
    return;
  }

  // Step 4: Analyze project
  const planner = new ProjectPlanner(projectPath);
  const analysis = await planner.analyzeProject();

  logger.info("\n📊 Project Analysis:");
  logger.info(`  Languages: ${analysis.techStack.languages.join(", ")}`);
  logger.info(
    `  Frameworks: ${analysis.techStack.frameworks.join(", ") || "None detected"}`,
  );
  logger.info(
    `  Package Manager: ${analysis.techStack.packageManager || "npm"}`,
  );
  logger.info(`  Files: ${analysis.structure.fileCount}`);
  logger.info(`  Libraries: ${analysis.libraries.length}`);
  logger.info("");

  if (analysis.existingFeatures.length > 0) {
    logger.info("✨ Existing Features (from README):");
    analysis.existingFeatures.slice(0, 5).forEach((feature) => {
      logger.info(`  - ${feature}`);
    });
    if (analysis.existingFeatures.length > 5) {
      logger.info(`  ... and ${analysis.existingFeatures.length - 5} more`);
    }
    logger.info("");
  }

  if (analysis.suggestedImprovements.length > 0) {
    logger.info("💡 Suggested Improvements:");
    analysis.suggestedImprovements.forEach((improvement) => {
      logger.info(`  - ${improvement}`);
    });
    logger.info("");
  }

  // Step 5: Get user goal
  logger.info("What's your main goal for this project?");
  logger.info("(Press Enter to use README goals)\n");

  const userGoal = await question("Goal: ");

  // Step 6: Generate plan
  const plan = await planner.generatePlan(userGoal || undefined, analysis);

  // Step 7: Initialize config
  const projectName = plan.projectName;
  await configManager.initialize(projectName, projectPath);

  logger.info(`\n✓ Created .localclaude/ configuration\n`);

  // Step 8: Save plan
  await configManager.savePlan(plan);

  // Step 9: Load into TodoManager
  const todoManager = new TodoManager(projectPath);
  await todoManager.loadPlan(plan);

  // Step 10: Show plan
  await todoManager.showTodoList();
  await todoManager.showProgress();

  logger.info("\n✅ Workflow setup complete!\n");
  logger.info(
    "Next time you run this command, I'll load your existing plan.\n",
  );

  // Interactive loop
  await interactiveLoop(todoManager, configManager);

  rl.close();
}

async function interactiveLoop(
  todoManager: TodoManager,
  configManager: ConfigManager,
) {
  logger.info("\n╔══════════════════════════════════════════════════════════╗");
  logger.info("║                Interactive Workflow Mode                  ║");
  logger.info("╚══════════════════════════════════════════════════════════╝\n");

  logger.info("Commands:");
  logger.info("  next       - Show next available task");
  logger.info("  start <id> - Start a task");
  logger.info("  done <id>  - Mark task as complete");
  logger.info("  fail <id>  - Mark task as failed");
  logger.info("  list       - Show TODO list");
  logger.info("  progress   - Show progress");
  logger.info("  add        - Add new task");
  logger.info("  help       - Show commands");
  logger.info("  quit       - Exit\n");

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
            logger.info("\n📋 Next Available Task:");
            logger.info(`  ID: ${nextTask.id}`);
            logger.info(`  Title: ${nextTask.title}`);
            logger.info(`  Description: ${nextTask.description}`);
            logger.info(`  Priority: ${nextTask.priority}`);
            logger.info(`  Category: ${nextTask.category}`);
          } else {
            logger.info(
              "\n✅ No pending tasks! All dependencies blocked or plan complete.",
            );
          }
          break;
        }

        case "start": {
          const taskId = args[0];
          if (!taskId) {
            logger.info("❌ Usage: start <task-id>");
            break;
          }

          const task = await todoManager.startTask(taskId);
          if (task) {
            logger.info(`\n✓ Started task: ${task.title}`);
          } else {
            logger.info(`\n❌ Task not found: ${taskId}`);
          }
          break;
        }

        case "done": {
          const taskId = args[0];
          if (!taskId) {
            logger.info("❌ Usage: done <task-id>");
            break;
          }

          const task = await todoManager.completeTask(taskId);
          if (!task) {
            logger.info(`\n❌ Task not found: ${taskId}`);
          }
          break;
        }

        case "fail": {
          const taskId = args[0];
          if (!taskId) {
            logger.info("❌ Usage: fail <task-id> <reason>");
            break;
          }

          const reason = args.slice(1).join(" ") || "No reason provided";
          const task = await todoManager.failTask(taskId, reason);
          if (!task) {
            logger.info(`\n❌ Task not found: ${taskId}`);
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
          logger.info("\n➕ Add New Task:");
          const title = await question("  Title: ");
          const description = await question("  Description: ");
          const phase = await question("  Phase (default: Manual): ");

          await todoManager.addTask(title, description, phase || "Manual");
          break;
        }

        case "summary": {
          logger.info("\n" + (await configManager.getSummary()));
          break;
        }

        case "backup": {
          const label = args[0] || "manual";
          const backupPath = await configManager.createBackup(label);
          logger.info(`\n✓ Created backup: ${backupPath}`);
          break;
        }

        case "help": {
          logger.info("\nAvailable Commands:");
          logger.info("  next       - Show next available task");
          logger.info("  start <id> - Start a task");
          logger.info("  done <id>  - Mark task as complete");
          logger.info("  fail <id> <reason> - Mark task as failed");
          logger.info("  list       - Show TODO list (pending only)");
          logger.info("  list:all   - Show all tasks (including completed)");
          logger.info("  progress   - Show progress bar");
          logger.info("  add        - Add new task interactively");
          logger.info("  summary    - Show project summary");
          logger.info("  backup [label] - Create backup of current state");
          logger.info("  help       - Show this help");
          logger.info("  quit       - Exit interactive mode");
          break;
        }

        case "quit":
        case "exit":
          logger.info("\n✅ Workflow session saved. Goodbye!\n");
          return;

        default:
          logger.info(`\n❌ Unknown command: ${cmd}`);
          logger.info('Type "help" for available commands.');
      }
    } catch (error) {
      logger.error(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Run CLI
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
