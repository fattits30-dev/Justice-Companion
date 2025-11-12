/**
 * Config Manager - .localclaude/ directory management
 *
 * Manages persistent configuration and context for the workflow builder.
 * Prevents re-indexing on every launch by storing project state.
 */

import fs from 'fs';
import path from 'path';
import type { LocalClaudeConfig, WorkflowPlan, AgentContext } from './types.ts';
import { logger } from '../utils/logger';

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private planPath: string;
  private memoryPath: string;
  private historyPath: string;
  private backupsDir: string;

  constructor(projectPath: string) {
    this.configDir = path.join(projectPath, '.localclaude');
    this.configPath = path.join(this.configDir, 'config.json');
    this.planPath = path.join(this.configDir, 'plan.json');
    this.memoryPath = path.join(this.configDir, 'memory.json');
    this.historyPath = path.join(this.configDir, 'history.jsonl');
    this.backupsDir = path.join(this.configDir, 'backups');
  }

  /**
   * Check if project is already configured
   */
  exists(): boolean {
    return fs.existsSync(this.configDir) && fs.existsSync(this.configPath);
  }

  /**
   * Initialize .localclaude/ directory and config
   */
  async initialize(projectName: string, projectPath: string): Promise<LocalClaudeConfig> {
    // Create directories
    fs.mkdirSync(this.configDir, { recursive: true });
    fs.mkdirSync(this.backupsDir, { recursive: true });

    const config: LocalClaudeConfig = {
      version: '1.0.0',
      projectName,
      projectPath,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      indexed: false,
      context7Enabled: true,
      settings: {
        autoCheckoff: true,
        showProgressInPrompt: true,
        suggestNextSteps: true,
      },
    };

    await this.saveConfig(config);

    // Initialize empty memory
    await this.saveMemory({
      decisions: [],
      patterns: [],
      notes: [],
    });

    return config;
  }

  /**
   * Load configuration from .localclaude/config.json
   */
  async loadConfig(): Promise<LocalClaudeConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data) as LocalClaudeConfig;
    } catch (error) {
      logger.error('Error loading config:', error);
      return null;
    }
  }

  /**
   * Save configuration to .localclaude/config.json
   */
  async saveConfig(config: LocalClaudeConfig): Promise<void> {
    const updated = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf-8');
  }

  /**
   * Mark project as indexed
   */
  async markIndexed(documentCount: number, collectionName: string): Promise<void> {
    const config = await this.loadConfig();
    if (!config) {throw new Error('Config not found');}

    config.indexed = true;
    config.indexedAt = new Date().toISOString();
    config.documentCount = documentCount;
    config.collectionName = collectionName;

    await this.saveConfig(config);
  }

  /**
   * Load workflow plan
   */
  async loadPlan(): Promise<WorkflowPlan | null> {
    try {
      if (!fs.existsSync(this.planPath)) {
        return null;
      }

      const data = fs.readFileSync(this.planPath, 'utf-8');
      return JSON.parse(data) as WorkflowPlan;
    } catch (error) {
      logger.error('Error loading plan:', error);
      return null;
    }
  }

  /**
   * Save workflow plan
   */
  async savePlan(plan: WorkflowPlan): Promise<void> {
    const updated = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(this.planPath, JSON.stringify(updated, null, 2), 'utf-8');

    // Update config to reference active plan
    const config = await this.loadConfig();
    if (config) {
      config.activePlan = this.planPath;
      await this.saveConfig(config);
    }
  }

  /**
   * Load agent memory (decisions, patterns, notes)
   */
  async loadMemory(): Promise<AgentContext['memory']> {
    try {
      if (!fs.existsSync(this.memoryPath)) {
        return { decisions: [], patterns: [], notes: [] };
      }

      const data = fs.readFileSync(this.memoryPath, 'utf-8');
      return JSON.parse(data) as AgentContext['memory'];
    } catch (error) {
      logger.error('Error loading memory:', error);
      return { decisions: [], patterns: [], notes: [] };
    }
  }

  /**
   * Save agent memory
   */
  async saveMemory(memory: AgentContext['memory']): Promise<void> {
    fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
  }

  /**
   * Append to conversation history (JSONL format)
   */
  async appendHistory(entry: {
    timestamp: string;
    userInput: string;
    intent: string;
    outcome: string;
  }): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.historyPath, line, 'utf-8');
  }

  /**
   * Load conversation history
   */
  async loadHistory(limit?: number): Promise<
    Array<{
      timestamp: string;
      userInput: string;
      intent: string;
      outcome: string;
    }>
  > {
    try {
      if (!fs.existsSync(this.historyPath)) {
        return [];
      }

      const data = fs.readFileSync(this.historyPath, 'utf-8');
      const lines = data.trim().split('\n').filter(Boolean);

      const history = lines.map((line) => JSON.parse(line));

      if (limit) {
        return history.slice(-limit);
      }

      return history;
    } catch (error) {
      logger.error('Error loading history:', error);
      return [];
    }
  }

  /**
   * Create backup of current state
   */
  async createBackup(label: string = 'manual'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupsDir, `${timestamp}-${label}`);

    fs.mkdirSync(backupDir, { recursive: true });

    // Copy config, plan, and memory
    const files = [
      { src: this.configPath, name: 'config.json' },
      { src: this.planPath, name: 'plan.json' },
      { src: this.memoryPath, name: 'memory.json' },
    ];

    for (const file of files) {
      if (fs.existsSync(file.src)) {
        fs.copyFileSync(file.src, path.join(backupDir, file.name));
      }
    }

    return backupDir;
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<
    Array<{
      path: string;
      timestamp: string;
      label: string;
    }>
  > {
    try {
      if (!fs.existsSync(this.backupsDir)) {
        return [];
      }

      const entries = fs.readdirSync(this.backupsDir);

      return entries.map((entry) => {
        const parts = entry.split('-');
        const label = parts.slice(-1)[0];
        const timestamp = parts.slice(0, -1).join('-');

        return {
          path: path.join(this.backupsDir, entry),
          timestamp,
          label,
        };
      });
    } catch (error) {
      logger.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Get project summary for display
   */
  async getSummary(): Promise<string> {
    const config = await this.loadConfig();
    const plan = await this.loadPlan();

    if (!config) {
      return 'Project not configured';
    }

    const lines: string[] = [];
    lines.push(`Project: ${config.projectName}`);

    if (config.indexed) {
      lines.push(`Indexed: ✓ (${config.documentCount || 0} documents)`);
    } else {
      lines.push(`Indexed: ✗`);
    }

    if (plan) {
      const total = plan.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
      const completed = plan.phases.reduce(
        (sum, phase) => sum + phase.tasks.filter((t) => t.status === 'completed').length,
        0
      );
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      lines.push(`Plan: ${completed}/${total} tasks (${percentage}%)`);
    }

    if (config.context7Enabled && config.context7Libraries) {
      lines.push(`Context7: ${config.context7Libraries.length} libraries`);
    }

    return lines.join('\n');
  }

  /**
   * Add decision to memory
   */
  async addDecision(decision: string, reasoning: string): Promise<void> {
    const memory = await this.loadMemory();
    memory.decisions.push({
      timestamp: new Date().toISOString(),
      decision,
      reasoning,
    });
    await this.saveMemory(memory);
  }

  /**
   * Add pattern to memory
   */
  async addPattern(pattern: string, context: string): Promise<void> {
    const memory = await this.loadMemory();
    memory.patterns.push({ pattern, context });
    await this.saveMemory(memory);
  }

  /**
   * Add note to memory
   */
  async addNote(note: string): Promise<void> {
    const memory = await this.loadMemory();
    memory.notes.push({
      timestamp: new Date().toISOString(),
      note,
    });
    await this.saveMemory(memory);
  }
}
