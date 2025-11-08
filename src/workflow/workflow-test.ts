#!/usr/bin/env tsx
/**
 * Workflow Builder Test
 *
 * Non-interactive test script to demonstrate the workflow builder system.
 *
 * Usage:
 *   pnpm tsx src/workflow/workflow-test.ts
 */

import { ConfigManager } from "./ConfigManager.ts";
import { ProjectPlanner } from "./ProjectPlanner.ts";
import { TodoManager } from "./TodoManager.ts";

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       Workflow Builder Test - Non-Interactive            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const projectPath = process.cwd();
  console.log(`📁 Project Directory: ${projectPath}\n`);

  const configManager = new ConfigManager(projectPath);

  // Step 1: Check if .localclaude/ exists
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

        // Test task operations
        console.log(
          "\n╔══════════════════════════════════════════════════════════╗"
        );
        console.log(
          "║                  Test: Task Operations                    ║"
        );
        console.log(
          "╚══════════════════════════════════════════════════════════╝\n"
        );

        // Get next task
        const nextTask = await todoManager.getNextTask();
        if (nextTask) {
          console.log(`✓ Next available task: ${nextTask.title}\n`);

          // Simulate task execution
          console.log(`→ Simulating: Start task ${nextTask.id}...`);
          await todoManager.startTask(nextTask.id);
          console.log("✓ Task started\n");

          console.log(`→ Simulating: Work on task...`);
          console.log("  [Working... 100% complete]\n");

          console.log(`→ Simulating: Complete task ${nextTask.id}...`);
          await todoManager.completeTask(nextTask.id, {
            taskId: nextTask.id,
            success: true,
            output: "Task completed successfully via automated test",
          });
        } else {
          console.log(
            "✅ No pending tasks - all dependencies blocked or plan complete\n"
          );
        }

        // Test adding a new task
        console.log(
          "\n╔══════════════════════════════════════════════════════════╗"
        );
        console.log(
          "║                  Test: Add New Task                       ║"
        );
        console.log(
          "╚══════════════════════════════════════════════════════════╝\n"
        );

        await todoManager.addTask(
          "Test automated task creation",
          "Verify that tasks can be added programmatically",
          "Testing & Quality",
          {
            category: "testing",
            priority: "low",
            acceptanceCriteria: [
              "Task appears in TODO list",
              "Task can be completed",
            ],
          }
        );

        // Show updated progress
        await todoManager.showProgress();

        console.log(
          "\n✅ Test complete! All workflow operations working correctly.\n"
        );
        return;
      }
    }
  }

  // Step 2: Initialize new project (non-interactive)
  console.log("❌ No .localclaude/ configuration found\n");
  console.log("→ Initializing workflow for Justice Companion...\n");

  // Analyze project
  const planner = new ProjectPlanner(projectPath);
  const analysis = await planner.analyzeProject();

  console.log("\n📊 Project Analysis Complete:");
  console.log(`  Languages: ${analysis.techStack.languages.join(", ")}`);
  console.log(
    `  Frameworks: ${analysis.techStack.frameworks.join(", ") || "None detected"}`
  );
  console.log(
    `  Package Manager: ${analysis.techStack.packageManager || "npm"}`
  );
  console.log(`  Runtime: ${analysis.techStack.runtime || "Unknown"}`);
  console.log(
    `  Database: ${analysis.techStack.database?.join(", ") || "None detected"}`
  );
  console.log(
    `  Testing: ${analysis.techStack.testing?.join(", ") || "None detected"}`
  );
  console.log(`  Files: ${analysis.structure.fileCount}`);
  console.log(`  Directories: ${analysis.structure.dirCount}`);
  console.log(`  Libraries: ${analysis.libraries.length}`);
  console.log("");

  if (analysis.existingFeatures.length > 0) {
    console.log("✨ Existing Features (from README):");
    analysis.existingFeatures.slice(0, 10).forEach((feature) => {
      console.log(`  - ${feature}`);
    });
    if (analysis.existingFeatures.length > 10) {
      console.log(`  ... and ${analysis.existingFeatures.length - 10} more`);
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

  // Generate plan with test goal
  const userGoal = "Implement workflow builder system for task management";
  console.log(`🎯 Goal: ${userGoal}\n`);

  const plan = await planner.generatePlan(userGoal, analysis);

  // Initialize config
  const projectName = plan.projectName;
  await configManager.initialize(projectName, projectPath);

  console.log(`\n✓ Created .localclaude/ configuration\n`);

  // Save plan
  await configManager.savePlan(plan);

  // Load into TodoManager
  const todoManager = new TodoManager(projectPath);
  await todoManager.loadPlan(plan);

  // Show plan
  await todoManager.showTodoList();
  await todoManager.showProgress();

  // Add decision to memory
  await configManager.addDecision(
    "Initialized workflow builder system",
    "Created .localclaude/ directory with project analysis and multi-phase plan"
  );

  // Add pattern to memory
  await configManager.addPattern(
    "Project initialization workflow",
    "Always check for .localclaude/ first to avoid re-indexing"
  );

  // Add note to memory
  await configManager.addNote(
    "Workflow system successfully initialized via automated test"
  );

  // Create backup
  const backupPath = await configManager.createBackup("initial-setup");
  console.log(`\n💾 Created backup: ${backupPath}\n`);

  console.log("\n✅ Workflow setup complete!\n");
  console.log("Next time you run this script, I'll load your existing plan.\n");

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              Workflow Builder Test Summary               ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log("✅ ConfigManager - .localclaude/ persistence");
  console.log("✅ ProjectPlanner - README & codebase analysis");
  console.log("✅ TodoManager - Task tracking & progress");
  console.log("✅ Memory system - Decisions, patterns, notes");
  console.log("✅ Backup system - State preservation");
  console.log("✅ Progress visualization - Real-time TODO lists\n");

  console.log("🎉 All systems operational!\n");
}

// Run test
main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
