/**
 * PythonProcessManager
 *
 * Manages the Python AI service subprocess lifecycle.
 * Handles starting, stopping, health checks, and auto-restart on crashes.
 *
 * @module PythonProcessManager
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';
import { app } from 'electron';
import { logger } from '../../src/utils/logger';

export interface PythonProcessConfig {
  port?: number;
  host?: string;
  maxStartupAttempts?: number;
  healthCheckInterval?: number;
  autoRestart?: boolean;
}

export class PythonProcessManager {
  private pythonProcess: ChildProcess | null = null;
  private readonly port: number;
  private readonly host: string;
  private readonly maxStartupAttempts: number;
  private readonly healthCheckInterval: number;
  private readonly autoRestart: boolean;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private restartAttempts: number = 0;
  private readonly maxRestartAttempts: number = 3;

  constructor(config: PythonProcessConfig = {}) {
    this.port = config.port ?? 5051;
    this.host = config.host ?? '127.0.0.1';
    this.maxStartupAttempts = config.maxStartupAttempts ?? 20;
    this.healthCheckInterval = config.healthCheckInterval ?? 30000; // 30 seconds
    this.autoRestart = config.autoRestart ?? true;
  }

  /**
   * Get the base URL for HTTP requests to the Python service
   */
  public get baseURL(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Start the Python AI service
   */
  async start(): Promise<void> {
    if (this.pythonProcess) {
      logger.info('[Python] Service already running');
      return;
    }

    const isDev = !app.isPackaged;

    // Determine Python executable path
    const pythonExecutable = isDev
      ? 'python' // Use system Python in development
      : path.join(process.resourcesPath, 'ai-service', 'justice-companion-ai.exe');

    // Determine project root and main.py path
    // In development: process.cwd() is the project root
    // In production: process.resourcesPath contains the bundled files
    const projectRoot = isDev ? process.cwd() : process.resourcesPath;
    const mainPyPath = isDev
      ? path.join(projectRoot, 'ai-service', 'main.py')
      : null;

    logger.info('[Python] Starting AI service...');
    logger.info(`[Python] Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    logger.info(`[Python] Executable: ${pythonExecutable}`);
    logger.info(`[Python] Working directory: ${projectRoot}`);
    if (mainPyPath) {
      logger.info(`[Python] Main script: ${mainPyPath}`);
    }
    logger.info(`[Python] Port: ${this.port}`);

    // Spawn Python process
    // In development, run the main.py directly from ai-service directory
    // In production, run the bundled executable
    const pythonArgs = isDev ? [mainPyPath!] : [];
    const pythonCwd = isDev ? path.join(projectRoot, 'ai-service') : projectRoot;
    
    this.pythonProcess = spawn(
      pythonExecutable,
      pythonArgs,
      {
        env: {
          ...process.env,
          PORT: this.port.toString(),
          HOST: this.host,
          PYTHONUNBUFFERED: '1', // Disable Python output buffering
          PYTHONPATH: isDev ? path.join(projectRoot, 'ai-service') : undefined,
          ENVIRONMENT: 'production', // Force production mode to disable uvicorn reload (it swallows logs)
          // Pass AI tokens from environment - check both HF and OpenAI
          HF_TOKEN: process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        },
        cwd: pythonCwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Handle stdout
    this.pythonProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      logger.info(`[Python stdout] ${message}`);
    });

    // Handle stderr
    this.pythonProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      logger.error(`[Python stderr] ${message}`);
    });

    // Handle process exit
    this.pythonProcess.on('exit', (code: number | null, signal: string | null) => {
      logger.error(`[Python] Process exited with code ${code}, signal ${signal}`);
      this.pythonProcess = null;

      // Clear health check timer
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Attempt auto-restart if enabled and not too many attempts
      if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        logger.info(`[Python] Auto-restart attempt ${this.restartAttempts}/${this.maxRestartAttempts}...`);
        setTimeout(() => {
          this.start().catch((error) => {
            logger.error(`[Python] Auto-restart failed:`, error);
          });
        }, 2000);
      } else if (this.restartAttempts >= this.maxRestartAttempts) {
        logger.error(`[Python] Max restart attempts (${this.maxRestartAttempts}) reached. Manual intervention required.`);
      }
    });

    // Handle process errors
    this.pythonProcess.on('error', (error: Error) => {
      logger.error(`[Python] Process error:`, error);
      this.pythonProcess = null;
    });

    // Wait for service to be ready
    await this.waitForReady();

    // Reset restart attempts counter on successful start
    this.restartAttempts = 0;

    // Start health check monitoring
    this.startHealthCheckMonitoring();

    logger.info('[Python] Service started successfully');
  }

  /**
   * Wait for the Python service to be ready by polling the /health endpoint
   */
  private async waitForReady(): Promise<void> {
    logger.info('[Python] Waiting for service to be ready...');

    for (let attempt = 1; attempt <= this.maxStartupAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.baseURL}/health`, {
          timeout: 1000,
        });

        if (response.data.status === 'healthy') {
          logger.info(`[Python] Service ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // Service not ready yet, wait and retry
        logger.info(`[Python] Startup attempt ${attempt}/${this.maxStartupAttempts}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Failed to start
    this.stop();
    throw new Error(
      `Python AI service failed to start within ${(this.maxStartupAttempts * 500) / 1000} seconds`
    );
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.checkHealth();
      if (!healthy) {
        logger.error('[Python] Health check failed! Service may be down.');
        if (this.autoRestart) {
          logger.info('[Python] Attempting to restart service...');
          this.restart().catch((error) => {
            logger.error('[Python] Restart failed:', error);
          });
        }
      }
    }, this.healthCheckInterval);
  }

  /**
   * Check if the Python service is healthy
   */
  async checkHealth(): Promise<boolean> {
    if (!this.pythonProcess) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 3000,
      });
      return response.data.status === 'healthy';
    } catch (error) {
      logger.error('[Python] Health check failed:', error);
      return false;
    }
  }

  /**
   * Restart the Python service
   */
  async restart(): Promise<void> {
    logger.info('[Python] Restarting service...');
    this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }

  /**
   * Stop the Python service
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.pythonProcess) {
      logger.info('[Python] Stopping service...');
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
    }
  }

  /**
   * Check if the Python service is running
   */
  isRunning(): boolean {
    return this.pythonProcess !== null && !this.pythonProcess.killed;
  }

  /**
   * Get service status information
   */
  getStatus(): {
    running: boolean;
    port: number;
    host: string;
    restartAttempts: number;
  } {
    return {
      running: this.isRunning(),
      port: this.port,
      host: this.host,
      restartAttempts: this.restartAttempts,
    };
  }
}

// Singleton instance
let pythonProcessManagerInstance: PythonProcessManager | null = null;

/**
 * Get or create the singleton PythonProcessManager instance
 */
export function getPythonProcessManager(): PythonProcessManager | null {
  return pythonProcessManagerInstance;
}

/**
 * Set the singleton PythonProcessManager instance (called from main.ts)
 */
export function setPythonProcessManager(instance: PythonProcessManager): void {
  pythonProcessManagerInstance = instance;
}
