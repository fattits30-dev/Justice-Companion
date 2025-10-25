# Workflow Builder System

**Generic workflow orchestration for managing development tasks, tracking progress, and coordinating multi-agent workflows.**

---

## Overview

The Workflow Builder is a comprehensive task management and project planning system that:

1. **Analyzes your project** - Reads README, package.json, and codebase structure
2. **Generates comprehensive plans** - Multi-phase task breakdown with dependencies
3. **Tracks progress** - Real-time TODO lists with completion percentages
4. **Persists state** - `.localclaude/` directory avoids re-indexing on every launch
5. **Coordinates workflows** - Designed to work with MCP workflow servers and sub-agents

---

## Quick Start

### 1. Run the Workflow CLI

```bash
pnpm workflow
```

This will:
- Check for `.localclaude/` configuration
- If not found, analyze your project and generate a plan
- Load existing plan if configuration exists
- Enter interactive mode

### 2. Interactive Commands

```bash
> next          # Show next available task
> start setup-1 # Start a task
> done setup-1  # Mark task as complete
> list          # Show TODO list
> progress      # Show progress bar
> add           # Add new task
> quit          # Exit
```

---

## Architecture

### Core Components

```
src/workflow/
├── types.ts           # TypeScript type definitions
├── ConfigManager.ts   # .localclaude/ persistence
├── ProjectPlanner.ts  # README & codebase analysis
├── TodoManager.ts     # Task tracking & progress
├── workflow-cli.ts    # Interactive CLI demo
└── index.ts          # Main exports
```

### Data Flow

```
1. ConfigManager checks for .localclaude/
   ├─ If exists: Load config + plan
   └─ If not: Initialize new config

2. ProjectPlanner analyzes project
   ├─ Read README.md
   ├─ Parse package.json
   ├─ Walk directory structure
   ├─ Detect tech stack
   └─ Extract existing features

3. ProjectPlanner generates plan
   ├─ Phase 1: Setup & Infrastructure
   ├─ Phase 2: Core Features (from README)
   ├─ Phase 3: Testing & Quality
   └─ Phase 4: Documentation

4. TodoManager loads plan
   ├─ Track task status (pending → in_progress → completed)
   ├─ Resolve dependencies
   ├─ Calculate progress
   └─ Persist to .localclaude/plan.json

5. Interactive workflow
   ├─ Get next available task
   ├─ Start → Complete → Checkoff
   └─ Update progress in real-time
```

---

## .localclaude/ Directory Structure

When you run the workflow builder, it creates a `.localclaude/` directory:

```
.localclaude/
├── config.json        # Project configuration
├── plan.json          # Active workflow plan
├── memory.json        # Agent decisions, patterns, notes
├── history.jsonl      # Conversation history (JSONL format)
└── backups/          # Timestamped state backups
    └── 2025-10-25T14-30-00-manual/
        ├── config.json
        ├── plan.json
        └── memory.json
```

### config.json

```json
{
  "version": "1.0.0",
  "projectName": "justice-companion",
  "projectPath": "/path/to/project",
  "createdAt": "2025-10-25T14:00:00.000Z",
  "lastUpdated": "2025-10-25T14:30:00.000Z",
  "indexed": true,
  "indexedAt": "2025-10-25T14:05:00.000Z",
  "documentCount": 1523,
  "collectionName": "justice-companion-codebase",
  "context7Enabled": true,
  "context7Libraries": [
    { "name": "react", "ecosystem": "npm" },
    { "name": "electron", "ecosystem": "npm" }
  ],
  "activePlan": ".localclaude/plan.json",
  "settings": {
    "autoCheckoff": true,
    "showProgressInPrompt": true,
    "suggestNextSteps": true
  }
}
```

### plan.json

```json
{
  "projectName": "justice-companion",
  "projectPath": "/path/to/project",
  "createdAt": "2025-10-25T14:00:00.000Z",
  "updatedAt": "2025-10-25T14:30:00.000Z",
  "userGoal": "Improve test coverage and CI/CD pipeline",
  "techStack": {
    "languages": ["TypeScript", "JavaScript"],
    "frameworks": ["React", "Electron"],
    "buildTools": ["npm/pnpm/yarn"],
    "packageManager": "pnpm",
    "runtime": "Node.js >=20.18.0 <21.0.0",
    "database": ["SQLite", "Drizzle ORM"],
    "testing": ["Vitest", "Playwright"]
  },
  "phases": [
    {
      "name": "Setup & Infrastructure",
      "description": "Initialize development environment",
      "order": 1,
      "tasks": [
        {
          "id": "setup-1",
          "title": "Verify development environment",
          "description": "Check Node.js, pnpm installed",
          "category": "setup",
          "priority": "high",
          "status": "completed",
          "dependencies": [],
          "createdAt": "2025-10-25T14:00:00.000Z",
          "completedAt": "2025-10-25T14:05:00.000Z"
        }
      ]
    }
  ],
  "metadata": {
    "totalTasks": 15,
    "completedTasks": 3
  }
}
```

---

## Task Lifecycle

### States

- **pending** - Task not yet started, waiting for dependencies
- **in_progress** - Currently being worked on
- **completed** - Successfully finished
- **failed** - Encountered errors, needs retry or fix
- **blocked** - Dependencies not met or external blocker

### Dependency Resolution

Tasks with dependencies only become available when all dependencies are completed:

```typescript
// Example task with dependencies
{
  id: "test-2",
  title: "Write unit tests for core features",
  dependencies: ["test-1"],  // Must complete test-1 first
  status: "pending"
}
```

The `TodoManager.getNextTask()` method automatically finds the next task where all dependencies are satisfied.

---

## Usage Examples

### Example 1: New Project Setup

```bash
$ pnpm workflow

╔══════════════════════════════════════════════════════════╗
║           Generic Workflow Builder v1.0.0                ║
╚══════════════════════════════════════════════════════════╝

📁 Project Directory: F:\Justice Companion take 2

❌ No .localclaude/ configuration found

Let me help you set up a workflow for this project.

Create workflow configuration? (yes/no): yes

╔══════════════════════════════════════════════════════════╗
║      Analyzing Project...                                 ║
╚══════════════════════════════════════════════════════════╝

→ Reading README...
✓ README found (57123 chars)

→ Analyzing project structure...
✓ Found 487 files in 89 directories

→ Reading package.json...
✓ Package: justice-companion@1.0.0

→ Detecting tech stack...
✓ Languages: TypeScript, JavaScript
✓ Frameworks: React, Electron

📊 Project Analysis:
  Languages: TypeScript, JavaScript
  Frameworks: React, Electron
  Package Manager: pnpm
  Files: 487
  Libraries: 102

What's your main goal for this project?
(Press Enter to use README goals)

Goal: Improve test coverage to 80%

╔══════════════════════════════════════════════════════════╗
║      Generating Project Plan...                           ║
╚══════════════════════════════════════════════════════════╝

✓ Generated plan with 4 phases, 18 tasks

✓ Created .localclaude/ configuration

✓ Loaded 18 tasks from plan

╔══════════════════════════════════════════════════════════╗
║                    TODO LIST                              ║
╚══════════════════════════════════════════════════════════╝

📦 Setup & Infrastructure:
   Initialize development environment
  ☐ Verify development environment 🟠
  ☐ Install project dependencies 🟠
  ☐ Configure react 🟡

📦 Core Features:
   Implement main application features
  ☐ Improve test coverage to 80% 🔴

📦 Testing & Quality:
   Ensure code quality and test coverage
  ☐ Set up testing framework 🟠
  ☐ Write unit tests for core features 🟠

📦 Documentation:
   Create comprehensive project documentation
  ☐ Add inline code documentation 🟢


📊 Progress:
  ✅ Completed: 0/18 (0%)
  ⏳ Pending: 18

  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%

✅ Workflow setup complete!

Next time you run this command, I'll load your existing plan.
```

### Example 2: Continuing Work

```bash
$ pnpm workflow

╔══════════════════════════════════════════════════════════╗
║           Generic Workflow Builder v1.0.0                ║
╚══════════════════════════════════════════════════════════╝

📁 Project Directory: F:\Justice Companion take 2

✓ Found existing .localclaude/ configuration

📋 Project Summary:
Project: justice-companion
Indexed: ✓ (1523 documents)
Plan: 3/18 tasks (17%)
Context7: 5 libraries

✓ Loaded existing workflow plan

╔══════════════════════════════════════════════════════════╗
║                    TODO LIST                              ║
╚══════════════════════════════════════════════════════════╝

📦 Setup & Infrastructure:
  ☐ Configure better-sqlite3 🟡
  ☐ Configure drizzle-orm 🟡

📦 Core Features:
  ☐ Improve test coverage to 80% 🔴

📊 Progress:
  ✅ Completed: 3/18 (17%)
  ⏳ Pending: 15

  [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 17%

╔══════════════════════════════════════════════════════════╗
║                Interactive Workflow Mode                  ║
╚══════════════════════════════════════════════════════════╝

> next

📋 Next Available Task:
  ID: setup-lib-1
  Title: Configure better-sqlite3
  Description: Set up better-sqlite3 according to best practices
  Priority: medium
  Category: setup

> start setup-lib-1

→ Starting: Configure better-sqlite3

✓ Started task: Configure better-sqlite3

> done setup-lib-1

✓ Completed: Configure better-sqlite3

📊 Progress:
  ✅ Completed: 4/18 (22%)
  ⏳ Pending: 14

  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 22%

```

---

## Integration with MCP Workflow Server

The workflow builder is designed to integrate with MCP (Model Context Protocol) workflow servers:

### MCP Tool Calls

```typescript
// Initialize plan
await mcp.workflow.plan.init({
  projectName: 'justice-companion',
  projectPath: '/path/to/project',
  userGoal: 'Improve test coverage',
});

// Add tasks
await mcp.workflow.plan.add({
  taskId: 'test-1',
  title: 'Set up testing framework',
  description: 'Configure Vitest',
  category: 'testing',
  priority: 'high',
  dependencies: [],
  phase: 'Testing & Quality',
});

// Start execution
await mcp.workflow.plan.start({ taskId: 'test-1' });

// Mark complete
await mcp.workflow.plan.done({
  taskId: 'test-1',
  notes: 'Vitest configured successfully',
});

// Get status
const status = await mcp.workflow.plan.status();
console.log(status.summary); // { total: 18, completed: 4, ... }

// Sync summary
await mcp.workflow.summary.sync();
```

### Sub-Agent Coordination

Tasks can be assigned to specialized sub-agents:

```typescript
{
  id: "feature-1",
  title: "Implement user authentication",
  assignedTo: "backend-architect",  // Sub-agent
  acceptanceCriteria: [
    "Password hashing with scrypt",
    "Session management with 24h expiration",
    "Unit tests with 90% coverage"
  ]
}
```

---

## Context7 Integration

The workflow builder can integrate with Context7 for library-specific best practices:

### Library Detection

```typescript
const analysis = await planner.analyzeProject();

console.log(analysis.libraries);
// [
//   { name: 'react', version: '^18.3.1', ecosystem: 'npm' },
//   { name: 'electron', version: '38.3.0', ecosystem: 'npm' },
//   ...
// ]
```

### Context7-Aware Task Generation

When generating setup tasks, the planner creates library-specific configuration tasks:

```typescript
// Automatically generated from detected libraries
{
  id: "setup-lib-react",
  title: "Configure react",
  description: "Set up react according to best practices (Context7)",
  category: "setup",
  priority: "medium"
}
```

**Future**: Integrate with Context7 MCP server to fetch actual documentation and best practices for each library.

---

## API Reference

### ConfigManager

```typescript
class ConfigManager {
  constructor(projectPath: string);

  exists(): boolean;
  async initialize(projectName: string, projectPath: string): Promise<LocalClaudeConfig>;
  async loadConfig(): Promise<LocalClaudeConfig | null>;
  async saveConfig(config: LocalClaudeConfig): Promise<void>;
  async markIndexed(documentCount: number, collectionName: string): Promise<void>;

  async loadPlan(): Promise<WorkflowPlan | null>;
  async savePlan(plan: WorkflowPlan): Promise<void>;

  async loadMemory(): Promise<AgentContext['memory']>;
  async saveMemory(memory: AgentContext['memory']): Promise<void>;

  async appendHistory(entry: { ... }): Promise<void>;
  async loadHistory(limit?: number): Promise<Array<...>>;

  async createBackup(label?: string): Promise<string>;
  async listBackups(): Promise<Array<...>>;

  async getSummary(): Promise<string>;
  async addDecision(decision: string, reasoning: string): Promise<void>;
  async addPattern(pattern: string, context: string): Promise<void>;
  async addNote(note: string): Promise<void>;
}
```

### ProjectPlanner

```typescript
class ProjectPlanner {
  constructor(projectDir: string);

  async analyzeProject(): Promise<ProjectAnalysis>;
  async generatePlan(userGoal?: string, analysis?: ProjectAnalysis): Promise<WorkflowPlan>;

  private readReadme(): string;
  private readPackageJson(): any;
  private analyzeStructure(): ProjectStructure;
  private detectTechStack(): TechStack;
  private extractLibraries(): Array<...>;
  private extractExistingFeatures(): string[];
  private suggestImprovements(): string[];
  private extractTasksFromReadme(): WorkflowTask[];
}
```

### TodoManager

```typescript
class TodoManager {
  constructor(projectPath: string);

  async loadPlan(plan: WorkflowPlan): Promise<void>;
  async getPlan(): Promise<WorkflowPlan | null>;

  async getNextTask(): Promise<WorkflowTask | null>;
  getTaskById(taskId: string): WorkflowTask | null;

  async startTask(taskId: string): Promise<WorkflowTask | null>;
  async completeTask(taskId: string, result?: TaskExecutionResult): Promise<WorkflowTask | null>;
  async failTask(taskId: string, reason: string, error?: string): Promise<WorkflowTask | null>;
  async blockTask(taskId: string, reason: string): Promise<WorkflowTask | null>;

  async addTask(title: string, description: string, phase: string, options?: { ... }): Promise<WorkflowTask>;

  async showTodoList(showAll?: boolean): Promise<void>;
  async showProgress(): Promise<void>;

  calculateStats(): { total, completed, inProgress, failed, blocked, pending, percentage };
  async getMiniProgress(): Promise<string>;

  getCurrentTask(): WorkflowTask | null;
  getTasksByStatus(status: WorkflowTask['status']): WorkflowTask[];
  getTasksByPhase(phaseName: string): WorkflowTask[];

  isPlanComplete(): boolean;
  getCompletionPercentage(): number;
}
```

---

## Best Practices

### 1. Always Check for .localclaude/ First

```typescript
const configManager = new ConfigManager(projectPath);

if (configManager.exists()) {
  // Load existing config
  const config = await configManager.loadConfig();
  const plan = await configManager.loadPlan();
} else {
  // Initialize new project
  await configManager.initialize(projectName, projectPath);
}
```

### 2. Use Dependency Resolution

```typescript
// Get next task that's ready to start
const nextTask = await todoManager.getNextTask();

if (nextTask) {
  await todoManager.startTask(nextTask.id);
  // ... do work ...
  await todoManager.completeTask(nextTask.id);
}
```

### 3. Track Progress in Real-Time

```typescript
// Show progress after each task completion
await todoManager.completeTask(taskId);
await todoManager.showProgress(); // Automatically called

// Get mini progress for prompt
const progress = await todoManager.getMiniProgress(); // "[3/18 17%]"
console.log(`Justice Companion ${progress} >`);
```

### 4. Create Backups Before Major Changes

```typescript
// Before rotating encryption key, refactoring, etc.
const backupPath = await configManager.createBackup('before-refactor');
console.log(`Backup created: ${backupPath}`);
```

### 5. Use Acceptance Criteria

```typescript
await todoManager.addTask('Implement authentication', 'User login system', 'Core Features', {
  category: 'feature',
  priority: 'critical',
  acceptanceCriteria: [
    'Password hashing with scrypt',
    'Session management with 24h expiration',
    'Unit tests with 90% coverage',
    'OWASP compliance verified',
  ],
});
```

---

## Roadmap

- [ ] **Context7 Integration** - Fetch real library docs and best practices
- [ ] **MCP Workflow Server** - Full MCP workflow.* tool integration
- [ ] **Sub-Agent Coordination** - Task assignment to specialized agents
- [ ] **Auto-Checkoff** - Automatically mark tasks complete when criteria met
- [ ] **Web UI** - React-based workflow dashboard
- [ ] **GitHub Integration** - Create issues/PRs from tasks
- [ ] **Time Estimation** - ML-based task duration prediction
- [ ] **Smart Scheduling** - Critical path analysis, resource allocation

---

## License

MIT
