import { logger } from '../utils/logger';

/**
 * Project Planner - README and codebase analysis
 *
 * Analyzes project structure, README, dependencies, and generates
 * comprehensive multi-phase development plans.
 */

import fs from "fs";
import path from "path";
import type {
  ProjectAnalysis,
  ProjectStructure,
  TechStack,
  WorkflowPlan,
  WorkflowPhase,
  WorkflowTask,
} from "./types.ts";

export class ProjectPlanner {
  private projectDir: string;
  private readme: string = "";
  private packageJson: any = null;
  private structure: ProjectStructure | null = null;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Analyze project comprehensively
   */
  async analyzeProject(): Promise<ProjectAnalysis> {
    logger.info("\n╔══════════════════════════════════════╗");
    logger.info("║      Analyzing Project...             ║");
    logger.info("╚══════════════════════════════════════╝\n");

    // Step 1: Read README
    logger.info("→ Reading README...");
    this.readme = this.readReadme();
    if (this.readme) {
      logger.info(`✓ README found (${this.readme.length} chars)`);
    } else {
      logger.info("! No README found");
    }

    // Step 2: Analyze structure
    logger.info("→ Analyzing project structure...");
    this.structure = this.analyzeStructure();
    logger.info(
      `✓ Found ${this.structure.fileCount} files in ${this.structure.dirCount} directories`,
    );

    // Step 3: Load package.json
    logger.info("→ Reading package.json...");
    this.packageJson = this.readPackageJson();
    if (this.packageJson) {
      logger.info(
        `✓ Package: ${this.packageJson.name}@${this.packageJson.version}`,
      );
    }

    // Step 4: Detect tech stack
    logger.info("→ Detecting tech stack...");
    const techStack = this.detectTechStack();
    logger.info(`✓ Languages: ${techStack.languages.join(", ")}`);
    if (techStack.frameworks.length > 0) {
      logger.info(`✓ Frameworks: ${techStack.frameworks.join(", ")}`);
    }

    // Step 5: Extract libraries (Context7 integration point)
    const libraries = this.extractLibraries();

    // Step 6: Analyze existing features
    const existingFeatures = this.extractExistingFeatures();

    // Step 7: Suggest improvements
    const suggestedImprovements = this.suggestImprovements();

    return {
      readme: this.readme,
      structure: this.structure,
      techStack,
      libraries,
      scripts: this.packageJson?.scripts || {},
      existingFeatures,
      suggestedImprovements,
    };
  }

  /**
   * Generate comprehensive project plan
   */
  async generatePlan(
    userGoal?: string,
    analysis?: ProjectAnalysis,
  ): Promise<WorkflowPlan> {
    logger.info("\n╔══════════════════════════════════════╗");
    logger.info("║      Generating Project Plan...       ║");
    logger.info("╚══════════════════════════════════════╝\n");

    const projectAnalysis = analysis || (await this.analyzeProject());

    const plan: WorkflowPlan = {
      projectName: this.packageJson?.name || path.basename(this.projectDir),
      projectPath: this.projectDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userGoal,
      techStack: projectAnalysis.techStack,
      phases: [],
    };

    // Generate phases
    const phases: WorkflowPhase[] = [];

    // Phase 1: Setup & Infrastructure
    phases.push(this.generateSetupPhase(projectAnalysis));

    // Phase 2: Core Features (from README or user goal)
    if (userGoal || this.readme) {
      phases.push(this.generateFeaturePhase(projectAnalysis, userGoal));
    }

    // Phase 3: Testing & Quality
    phases.push(this.generateTestingPhase(projectAnalysis));

    // Phase 4: Documentation
    phases.push(this.generateDocsPhase(projectAnalysis));

    plan.phases = phases;

    // Calculate metadata
    const totalTasks = phases.reduce(
      (sum, phase) => sum + phase.tasks.length,
      0,
    );
    const completedTasks = phases.reduce(
      (sum, phase) =>
        sum + phase.tasks.filter((t) => t.status === "completed").length,
      0,
    );

    plan.metadata = {
      totalTasks,
      completedTasks,
    };

    logger.info(
      `✓ Generated plan with ${plan.phases.length} phases, ${totalTasks} tasks\n`,
    );

    return plan;
  }

  /**
   * Read README file
   */
  private readReadme(): string {
    const readmeFiles = [
      "README.md",
      "README.MD",
      "readme.md",
      "README.txt",
      "README",
    ];

    for (const filename of readmeFiles) {
      const filepath = path.join(this.projectDir, filename);
      if (fs.existsSync(filepath)) {
        try {
          return fs.readFileSync(filepath, "utf-8");
        } catch (error) {
          logger.error(`Error reading ${filename}:`, error);
        }
      }
    }

    return "";
  }

  /**
   * Read package.json
   */
  private readPackageJson(): any {
    const packagePath = path.join(this.projectDir, "package.json");
    if (fs.existsSync(packagePath)) {
      try {
        const data = fs.readFileSync(packagePath, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        logger.error("Error reading package.json:", error);
      }
    }
    return null;
  }

  /**
   * Analyze project directory structure
   */
  private analyzeStructure(): ProjectStructure {
    const structure: ProjectStructure = {
      root: this.projectDir,
      directories: [],
      filesByType: {},
      fileCount: 0,
      dirCount: 0,
      hasPackageJson: false,
      hasReadme: false,
      hasGit: false,
      hasTsConfig: false,
      hasTests: false,
    };

    const skipDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "__pycache__",
      "venv",
      ".venv",
      "target",
      ".cache",
      "coverage",
      "release",
    ]);

    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.projectDir, fullPath);

          if (entry.isDirectory()) {
            if (skipDirs.has(entry.name)) {
              continue;
            }

            structure.directories.push(relativePath);
            structure.dirCount++;
            walkDir(fullPath);
          } else {
            structure.fileCount++;

            const ext = path.extname(entry.name);
            if (ext) {
              structure.filesByType[ext] =
                (structure.filesByType[ext] || 0) + 1;
            }

            // Check for special files
            if (entry.name === "package.json") {
              structure.hasPackageJson = true;
            }
            if (entry.name.toLowerCase().startsWith("readme")) {
              structure.hasReadme = true;
            }
            if (entry.name === "tsconfig.json") {
              structure.hasTsConfig = true;
            }
            if (entry.name.includes("test") || entry.name.includes("spec")) {
              structure.hasTests = true;
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };

    walkDir(this.projectDir);

    structure.hasGit = fs.existsSync(path.join(this.projectDir, ".git"));

    return structure;
  }

  /**
   * Detect technology stack
   */
  private detectTechStack(): TechStack {
    const stack: TechStack = {
      languages: [],
      frameworks: [],
      buildTools: [],
    };

    if (!this.structure) {
      return stack;
    }

    const fileTypes = this.structure.filesByType;

    // Detect languages
    if (fileTypes[".ts"] || fileTypes[".tsx"]) {
      stack.languages.push("TypeScript");
    }
    if (fileTypes[".js"] || fileTypes[".jsx"]) {
      stack.languages.push("JavaScript");
    }
    if (fileTypes[".py"]) {
      stack.languages.push("Python");
    }
    if (fileTypes[".rs"]) {
      stack.languages.push("Rust");
    }
    if (fileTypes[".go"]) {
      stack.languages.push("Go");
    }
    if (fileTypes[".java"]) {
      stack.languages.push("Java");
    }

    // Detect frameworks from package.json
    if (this.packageJson?.dependencies) {
      const deps = {
        ...this.packageJson.dependencies,
        ...this.packageJson.devDependencies,
      };

      if (deps["react"]) {
        stack.frameworks.push("React");
      }
      if (deps["next"]) {
        stack.frameworks.push("Next.js");
      }
      if (deps["vue"]) {
        stack.frameworks.push("Vue");
      }
      if (deps["angular"]) {
        stack.frameworks.push("Angular");
      }
      if (deps["electron"]) {
        stack.frameworks.push("Electron");
      }
      if (deps["express"]) {
        stack.frameworks.push("Express");
      }
      if (deps["fastify"]) {
        stack.frameworks.push("Fastify");
      }
      if (deps["nestjs"]) {
        stack.frameworks.push("NestJS");
      }
    }

    // Detect build tools
    if (this.structure.hasPackageJson) {
      stack.buildTools.push("npm/pnpm/yarn");
      stack.packageManager = this.detectPackageManager();
    }
    if (fileTypes[".toml"]) {
      stack.buildTools.push("Cargo");
    }
    if (fs.existsSync(path.join(this.projectDir, "go.mod"))) {
      stack.buildTools.push("Go modules");
    }

    // Detect runtime
    if (this.packageJson?.engines?.node) {
      stack.runtime = `Node.js ${this.packageJson.engines.node}`;
    }

    // Detect database
    if (this.packageJson?.dependencies) {
      const deps = { ...this.packageJson.dependencies };
      const databases: string[] = [];

      if (deps["better-sqlite3"] || deps["sqlite3"]) {
        databases.push("SQLite");
      }
      if (deps["pg"] || deps["postgres"]) {
        databases.push("PostgreSQL");
      }
      if (deps["mysql"] || deps["mysql2"]) {
        databases.push("MySQL");
      }
      if (deps["mongodb"]) {
        databases.push("MongoDB");
      }
      if (deps["drizzle-orm"]) {
        databases.push("Drizzle ORM");
      }

      if (databases.length > 0) {
        stack.database = databases;
      }
    }

    // Detect testing
    if (this.packageJson?.devDependencies) {
      const devDeps = this.packageJson.devDependencies;
      const testing: string[] = [];

      if (devDeps["vitest"]) {
        testing.push("Vitest");
      }
      if (devDeps["jest"]) {
        testing.push("Jest");
      }
      if (devDeps["@playwright/test"]) {
        testing.push("Playwright");
      }
      if (devDeps["cypress"]) {
        testing.push("Cypress");
      }

      if (testing.length > 0) {
        stack.testing = testing;
      }
    }

    return stack;
  }

  /**
   * Detect package manager from lock files
   */
  private detectPackageManager(): string {
    if (fs.existsSync(path.join(this.projectDir, "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    if (fs.existsSync(path.join(this.projectDir, "yarn.lock"))) {
      return "yarn";
    }
    if (fs.existsSync(path.join(this.projectDir, "package-lock.json"))) {
      return "npm";
    }
    return "npm";
  }

  /**
   * Extract libraries for Context7
   */
  private extractLibraries(): Array<{
    name: string;
    version?: string;
    ecosystem: string;
  }> {
    const libraries: Array<{
      name: string;
      version?: string;
      ecosystem: string;
    }> = [];

    if (this.packageJson?.dependencies) {
      for (const [name, version] of Object.entries(
        this.packageJson.dependencies,
      )) {
        libraries.push({
          name,
          version: version as string,
          ecosystem: "npm",
        });
      }
    }

    return libraries;
  }

  /**
   * Extract existing features from README
   */
  private extractExistingFeatures(): string[] {
    if (!this.readme) {
      return [];
    }

    const features: string[] = [];
    const lines = this.readme.split("\n");

    let inFeatureSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect feature sections
      if (
        /^#{1,3}\s+(features|functionality|capabilities)/i.test(trimmed) ||
        /^#{1,3}\s+✨\s*features/i.test(trimmed)
      ) {
        inFeatureSection = true;
        continue;
      }

      // End of feature section
      if (inFeatureSection && /^#{1,3}\s+/.test(trimmed)) {
        inFeatureSection = false;
      }

      // Extract features from lists
      if (inFeatureSection) {
        if (/^[-*+]\s+/.test(trimmed) || /^#{4}\s+/.test(trimmed)) {
          const feature = trimmed
            .replace(/^[-*+]\s+/, "")
            .replace(/^#{4}\s+/, "")
            .replace(/[🔐📁🤖📝📊]/gu, "")
            .trim();
          if (feature) {
            features.push(feature);
          }
        }
      }
    }

    return features;
  }

  /**
   * Suggest improvements based on analysis
   */
  private suggestImprovements(): string[] {
    const suggestions: string[] = [];

    if (!this.structure) {
      return suggestions;
    }

    // Test coverage
    if (!this.structure.hasTests) {
      suggestions.push("Add test coverage (unit tests with Vitest)");
    }

    // Documentation
    if (!this.structure.hasReadme) {
      suggestions.push("Create comprehensive README.md");
    }

    // TypeScript configuration
    if (this.structure.filesByType[".ts"] && !this.structure.hasTsConfig) {
      suggestions.push("Add tsconfig.json for TypeScript configuration");
    }

    // CI/CD
    if (!fs.existsSync(path.join(this.projectDir, ".github", "workflows"))) {
      suggestions.push("Set up GitHub Actions CI/CD pipeline");
    }

    // Code quality
    if (!this.packageJson?.devDependencies?.["eslint"]) {
      suggestions.push("Add ESLint for code quality");
    }

    if (!this.packageJson?.devDependencies?.["prettier"]) {
      suggestions.push("Add Prettier for code formatting");
    }

    return suggestions;
  }

  /**
   * Generate Setup & Infrastructure phase
   */
  private generateSetupPhase(analysis: ProjectAnalysis): WorkflowPhase {
    const tasks: WorkflowTask[] = [];

    tasks.push({
      id: "setup-1",
      title: "Verify development environment",
      description: `Check Node.js ${analysis.techStack.runtime || ""}, ${analysis.techStack.packageManager || "npm"}, and all required tools are installed`,
      category: "setup",
      priority: "high",
      status: "pending",
      dependencies: [],
      createdAt: new Date().toISOString(),
    });

    tasks.push({
      id: "setup-2",
      title: "Install project dependencies",
      description: `Run ${analysis.techStack.packageManager || "npm"} install to install all dependencies`,
      category: "setup",
      priority: "high",
      status: "pending",
      dependencies: ["setup-1"],
      createdAt: new Date().toISOString(),
    });

    // Add library-specific setup from Context7
    analysis.libraries.slice(0, 5).forEach((lib, index) => {
      tasks.push({
        id: `setup-lib-${index + 1}`,
        title: `Configure ${lib.name}`,
        description: `Set up ${lib.name} according to best practices`,
        category: "setup",
        priority: "medium",
        status: "pending",
        dependencies: ["setup-2"],
        createdAt: new Date().toISOString(),
      });
    });

    return {
      name: "Setup & Infrastructure",
      description: "Initialize development environment and configure tools",
      tasks,
      order: 1,
    };
  }

  /**
   * Generate Core Features phase
   */
  private generateFeaturePhase(
    _analysis: ProjectAnalysis,
    userGoal?: string,
  ): WorkflowPhase {
    const tasks: WorkflowTask[] = [];

    // Extract tasks from README TODO sections
    const readmeTasks = this.extractTasksFromReadme();

    if (readmeTasks.length > 0) {
      tasks.push(...readmeTasks);
    } else if (userGoal) {
      // Generate tasks from user goal
      tasks.push({
        id: "feature-1",
        title: userGoal,
        description: `Implement: ${userGoal}`,
        category: "feature",
        priority: "high",
        status: "pending",
        dependencies: [],
        createdAt: new Date().toISOString(),
      });
    } else {
      // Generic feature task
      tasks.push({
        id: "feature-1",
        title: "Implement core functionality",
        description: "Build the main features of the application",
        category: "feature",
        priority: "high",
        status: "pending",
        dependencies: [],
        createdAt: new Date().toISOString(),
      });
    }

    return {
      name: "Core Features",
      description: "Implement main application features",
      tasks,
      order: 2,
    };
  }

  /**
   * Generate Testing & Quality phase
   */
  private generateTestingPhase(analysis: ProjectAnalysis): WorkflowPhase {
    const tasks: WorkflowTask[] = [];

    const testFramework =
      analysis.techStack.testing?.[0] ||
      (analysis.techStack.frameworks.includes("React") ? "Vitest" : "Jest");

    tasks.push({
      id: "test-1",
      title: "Set up testing framework",
      description: `Configure ${testFramework} for unit testing`,
      category: "testing",
      priority: "high",
      status: "pending",
      dependencies: [],
      createdAt: new Date().toISOString(),
    });

    tasks.push({
      id: "test-2",
      title: "Write unit tests for core features",
      description: "Achieve 80%+ code coverage",
      category: "testing",
      priority: "high",
      status: "pending",
      dependencies: ["test-1"],
      createdAt: new Date().toISOString(),
    });

    return {
      name: "Testing & Quality",
      description: "Ensure code quality and test coverage",
      tasks,
      order: 3,
    };
  }

  /**
   * Generate Documentation phase
   */
  private generateDocsPhase(analysis: ProjectAnalysis): WorkflowPhase {
    const tasks: WorkflowTask[] = [];

    if (!analysis.structure.hasReadme) {
      tasks.push({
        id: "docs-1",
        title: "Create comprehensive README.md",
        description: "Document project setup, usage, and features",
        category: "docs",
        priority: "medium",
        status: "pending",
        dependencies: [],
        createdAt: new Date().toISOString(),
      });
    }

    tasks.push({
      id: "docs-2",
      title: "Add inline code documentation",
      description: "Document all public APIs and complex logic",
      category: "docs",
      priority: "low",
      status: "pending",
      dependencies: [],
      createdAt: new Date().toISOString(),
    });

    return {
      name: "Documentation",
      description: "Create comprehensive project documentation",
      tasks,
      order: 4,
    };
  }

  /**
   * Extract tasks from README TODO/Roadmap sections
   */
  private extractTasksFromReadme(): WorkflowTask[] {
    if (!this.readme) {
      return [];
    }

    const tasks: WorkflowTask[] = [];
    const lines = this.readme.split("\n");

    let inTodoSection = false;
    let inFeatureSection = false;
    let taskId = 1;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect TODO/Roadmap sections
      if (/^#{1,3}\s+(todo|roadmap)/i.test(trimmed)) {
        inTodoSection = true;
        inFeatureSection = false;
        continue;
      } else if (/^#{1,3}\s+(features|feature list)/i.test(trimmed)) {
        inFeatureSection = true;
        inTodoSection = false;
        continue;
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        inTodoSection = false;
        inFeatureSection = false;
      }

      // Extract tasks from lists
      if ((inTodoSection || inFeatureSection) && /^[-*+[\]]\s+/.test(trimmed)) {
        const taskTitle = trimmed
          .replace(/^[-*+]\s+/, "")
          .replace(/^\[[ x]\]\s+/i, "")
          .trim();

        if (taskTitle) {
          tasks.push({
            id: `feature-${taskId}`,
            title: taskTitle,
            description: `Implement: ${taskTitle}`,
            category: "feature",
            priority: "medium",
            status: "pending",
            dependencies: [],
            createdAt: new Date().toISOString(),
          });
          taskId++;
        }
      }
    }

    return tasks;
  }
}
