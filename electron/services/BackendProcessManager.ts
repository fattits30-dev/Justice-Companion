/**
 * Backend Process Manager
 *
 * Manages the Python FastAPI backend process lifecycle:
 * - Kills duplicate processes on startup
 * - Starts backend process
 * - Monitors health and auto-restarts on crashes
 * - Graceful shutdown when Electron closes
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../../src/utils/logger';

const execAsync = promisify(exec);

interface BackendProcessConfig {
  port: number;
  host?: string;
  autoRestart?: boolean;
  healthCheckInterval?: number;
  maxRestarts?: number;
}

export class BackendProcessManager {
  private process: ChildProcess | null = null;
  private config: Required<BackendProcessConfig>;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private restartCount = 0;
  private isShuttingDown = false;

  constructor(config: BackendProcessConfig) {
    this.config = {
      host: config.host || '127.0.0.1',
      autoRestart: config.autoRestart ?? true,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      maxRestarts: config.maxRestarts || 5,
      ...config,
    };
  }

  /**
   * Start the backend process
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Python FastAPI backend...', { service: 'BackendProcessManager' });

      // Step 1: Kill any existing processes on this port
      await this.killExistingProcesses();

      // Step 2: Start the backend process
      await this.startBackendProcess();

      // Step 3: Wait for backend to be healthy
      await this.waitForHealthy();

      // Step 4: Start health monitoring
      this.startHealthMonitoring();

      logger.info(`Backend started successfully on ${this.config.host}:${this.config.port}`, {
        service: 'BackendProcessManager',
      });
    } catch (error) {
      logger.error('Failed to start backend', { service: 'BackendProcessManager', error });
      throw error;
    }
  }

  /**
   * Stop the backend process gracefully
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;

    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Kill the process
    if (this.process) {
      logger.info('Stopping Python backend...', { service: 'BackendProcessManager' });

      return new Promise((resolve) => {
        if (!this.process) {
          resolve();
          return;
        }

        this.process.once('exit', () => {
          logger.info('Backend stopped successfully', { service: 'BackendProcessManager' });
          this.process = null;
          resolve();
        });

        // Try graceful shutdown first
        this.process.kill('SIGTERM');

        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (this.process) {
            logger.warn('Backend did not stop gracefully, forcing kill', {
              service: 'BackendProcessManager',
            });
            this.process.kill('SIGKILL');
          }
        }, 5000);
      });
    }
  }

  /**
   * Kill any existing processes using the backend port
   * Uses aggressive retry strategy with multiple kill methods
   */
  private async killExistingProcesses(): Promise<void> {
    try {
      logger.info(`Checking for existing processes on port ${this.config.port}...`, {
        service: 'BackendProcessManager',
      });

      const { stdout } = await execAsync(`netstat -ano | findstr :${this.config.port}`);
      const lines = stdout.trim().split('\n');

      const pids = new Set<string>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3].includes('LISTENING')) {
          const pid = parts[4];
          if (pid !== '0') {
            pids.add(pid);
          }
        }
      }

      if (pids.size > 0) {
        logger.info(`Found ${pids.size} existing process(es), killing...`, {
          service: 'BackendProcessManager',
          pids: Array.from(pids),
        });

        // Kill each process with retry logic
        for (const pid of pids) {
          await this.killProcessWithRetry(pid);
        }

        // Wait longer for processes to fully terminate
        logger.info('Waiting for processes to terminate...', { service: 'BackendProcessManager' });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify all processes are killed
        await this.verifyProcessesKilled(pids);
      } else {
        logger.info('No existing processes found', { service: 'BackendProcessManager' });
      }
    } catch (error) {
      // No processes found (netstat returned no results)
      logger.info('No existing processes on port', { service: 'BackendProcessManager' });
    }
  }

  /**
   * Kill a single process with retry logic and multiple strategies
   */
  private async killProcessWithRetry(pid: string, maxAttempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Try taskkill with /F flag (force kill)
        await execAsync(`taskkill /F /PID ${pid}`, { timeout: 5000 });
        logger.info(`Successfully killed process ${pid}`, {
          service: 'BackendProcessManager',
          attempt,
        });
        return;
      } catch (error: any) {
        const errorMessage = error?.message || String(error);

        // Check if process already terminated
        if (errorMessage.includes('not found') || errorMessage.includes('No tasks')) {
          logger.info(`Process ${pid} already terminated`, { service: 'BackendProcessManager' });
          return;
        }

        // Check if access denied
        if (errorMessage.includes('Access is denied')) {
          logger.warn(`Access denied for process ${pid}, trying alternative method...`, {
            service: 'BackendProcessManager',
            attempt,
          });

          // Try with /T flag to kill child processes (might help with permissions)
          try {
            await execAsync(`taskkill /F /T /PID ${pid}`, { timeout: 5000 });
            logger.info(`Successfully killed process ${pid} with /T flag`, {
              service: 'BackendProcessManager',
              attempt,
            });
            return;
          } catch (treeError: any) {
            if (attempt === maxAttempts) {
              logger.warn(
                `Failed to kill process ${pid} after ${maxAttempts} attempts (access denied). Process may be protected or already terminated.`,
                { service: 'BackendProcessManager' }
              );
            }
          }
        } else {
          logger.warn(`Failed to kill process ${pid} on attempt ${attempt}`, {
            service: 'BackendProcessManager',
            error: errorMessage,
          });
        }

        // Wait before retry
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }

  /**
   * Verify all processes were successfully killed
   */
  private async verifyProcessesKilled(pids: Set<string>): Promise<void> {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${this.config.port}`);
      const remainingPids = new Set<string>();

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3].includes('LISTENING')) {
          const pid = parts[4];
          if (pids.has(pid)) {
            remainingPids.add(pid);
          }
        }
      }

      if (remainingPids.size > 0) {
        logger.warn(`${remainingPids.size} process(es) still alive after cleanup`, {
          service: 'BackendProcessManager',
          pids: Array.from(remainingPids),
        });
      } else {
        logger.info('All processes successfully terminated', { service: 'BackendProcessManager' });
      }
    } catch (error) {
      // No processes on port (good - they were all killed)
      logger.info('Port is clear, all processes terminated', { service: 'BackendProcessManager' });
    }
  }

  /**
   * Start the backend process
   */
  private async startBackendProcess(): Promise<void> {
    const backendDir = path.join(__dirname, '../../backend');
    const pythonCmd = 'py';
    const args = [
      '-3.12',
      '-m',
      'uvicorn',
      'main:app',
      '--host',
      this.config.host,
      '--port',
      String(this.config.port),
      '--reload',
    ];

    logger.info('Spawning backend process...', {
      service: 'BackendProcessManager',
      command: `${pythonCmd} ${args.join(' ')}`,
      cwd: backendDir,
    });

    this.process = spawn(pythonCmd, args, {
      cwd: backendDir,
      stdio: 'pipe', // Capture stdout/stderr
      shell: true,
    });

    // Log stdout
    this.process.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.info(`[Backend] ${output}`, { service: 'BackendProcessManager' });
      }
    });

    // Log stderr
    this.process.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('UserWarning')) {
        // Filter out Pydantic warnings
        logger.warn(`[Backend] ${output}`, { service: 'BackendProcessManager' });
      }
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      logger.info('Backend process exited', {
        service: 'BackendProcessManager',
        code,
        signal,
      });

      this.process = null;

      // Auto-restart if not shutting down
      if (!this.isShuttingDown && this.config.autoRestart) {
        this.handleCrash();
      }
    });

    // Handle process errors
    this.process.on('error', (error) => {
      logger.error('Backend process error', { service: 'BackendProcessManager', error });
    });
  }

  /**
   * Wait for backend to become healthy
   */
  private async waitForHealthy(maxAttempts = 30, delayMs = 1000): Promise<void> {
    logger.info('Waiting for backend to become healthy...', {
      service: 'BackendProcessManager',
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (await this.checkHealth()) {
        logger.info(`Backend healthy after ${attempt} attempt(s)`, {
          service: 'BackendProcessManager',
        });
        return;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Backend failed to become healthy within timeout');
  }

  /**
   * Check if backend is healthy
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }

      return false;
    } catch (error) {
      // Backend not ready yet
      return false;
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      if (!this.isShuttingDown) {
        const healthy = await this.checkHealth();
        if (!healthy) {
          logger.warn('Backend health check failed', { service: 'BackendProcessManager' });
          // Process will auto-restart via exit handler if autoRestart is enabled
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Handle backend crash and attempt restart
   */
  private async handleCrash(): Promise<void> {
    this.restartCount++;

    if (this.restartCount > this.config.maxRestarts) {
      logger.error('Backend exceeded max restart attempts, giving up', {
        service: 'BackendProcessManager',
        restartCount: this.restartCount,
        maxRestarts: this.config.maxRestarts,
      });
      return;
    }

    logger.warn('Backend crashed, attempting restart...', {
      service: 'BackendProcessManager',
      attempt: this.restartCount,
      maxRestarts: this.config.maxRestarts,
    });

    try {
      // Wait a bit before restarting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Restart
      await this.start();

      // Reset restart counter on successful restart
      this.restartCount = 0;
    } catch (error) {
      logger.error('Failed to restart backend', { service: 'BackendProcessManager', error });
    }
  }

  /**
   * Get backend status
   */
  async getStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    pid?: number;
    restartCount: number;
  }> {
    return {
      running: this.process !== null,
      healthy: await this.checkHealth(),
      pid: this.process?.pid,
      restartCount: this.restartCount,
    };
  }
}
