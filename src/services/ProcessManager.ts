import type { App } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: number | null;
  name?: string;
}

interface PortStatus {
  port: number;
  name: string;
  inUse: boolean;
}

interface ProcessStatus {
  isRunning: boolean;
  startTime: Date;
  ports: PortStatus[];
}

export class ProcessManager {
  private app: App;
  private startTime: Date;
  private managedPorts: Map<number, string> = new Map();
  private shutdownHandlers: Array<() => void | Promise<void>> = [];

  constructor(app: App) {
    this.app = app;
    this.startTime = new Date();
  }

  /**
   * Enforce single instance lock
   * Quits app if another instance is already running
   */
  public enforceSingleInstance(): boolean {
    const gotLock = this.app.requestSingleInstanceLock();

    if (!gotLock) {
      console.log('[ProcessManager] Another instance is already running. Quitting...');
      this.app.quit();
      return false;
    }

    console.log('[ProcessManager] Single instance lock acquired');
    return true;
  }

  /**
   * Register callback for when a second instance is launched
   */
  public onSecondInstance(callback: () => void): void {
    this.app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
      console.log('[ProcessManager] Second instance detected, focusing main window...');
      callback();
    });
  }

  /**
   * Check if a port is currently in use
   */
  public async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(false);
      });

      server.listen(port);
    });
  }

  /**
   * Find process using a specific port
   */
  public async findProcessByPort(port: number): Promise<ProcessInfo> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
          const match = line.match(/LISTENING\s+(\d+)/);
          if (match) {
            return { pid: parseInt(match[1], 10) };
          }
        }
      } else {
        // Unix-like systems (macOS, Linux)
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        const pid = parseInt(stdout.trim(), 10);
        if (!isNaN(pid)) {
          return { pid };
        }
      }
    } catch (error) {
      // Process not found or command failed
      console.log(`[ProcessManager] No process found on port ${port}`);
    }

    return { pid: null };
  }

  /**
   * Kill a process by ID
   */
  public async killProcessById(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        await execAsync(`powershell -Command "Stop-Process -Id ${pid} -Force"`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }

      console.log(`[ProcessManager] Killed process ${pid}`);
      return true;
    } catch (error) {
      console.error(`[ProcessManager] Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  /**
   * Kill process using a specific port
   */
  public async killProcessOnPort(port: number): Promise<boolean> {
    const processInfo = await this.findProcessByPort(port);

    if (processInfo.pid) {
      console.log(`[ProcessManager] Killing process ${processInfo.pid} on port ${port}`);
      return this.killProcessById(processInfo.pid);
    }

    console.log(`[ProcessManager] No process to kill on port ${port}`);
    return false;
  }

  /**
   * Ensure port is available, with retries
   */
  public async ensurePortAvailable(port: number, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const inUse = await this.isPortInUse(port);

      if (!inUse) {
        console.log(`[ProcessManager] Port ${port} is available`);
        return true;
      }

      console.log(`[ProcessManager] Port ${port} in use, attempting to free (${attempt + 1}/${maxRetries})`);
      const killed = await this.killProcessOnPort(port);

      if (!killed) {
        console.warn(`[ProcessManager] Failed to free port ${port} on attempt ${attempt + 1}`);
      }

      // Wait 1 second between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`[ProcessManager] Failed to free port ${port} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Cleanup on startup - kill any stale processes
   */
  public async cleanupOnStartup(): Promise<void> {
    console.log('[ProcessManager] Running startup cleanup...');

    const ports = [
      { port: 5176, name: 'Vite Dev Server' },
      { port: 5177, name: 'Vite HMR' },
    ];

    for (const { port, name } of ports) {
      try {
        const inUse = await this.isPortInUse(port);
        if (inUse) {
          console.log(`[ProcessManager] Found stale ${name} on port ${port}, cleaning up...`);
          await this.killProcessOnPort(port);
        }
      } catch (error) {
        console.error(`[ProcessManager] Error cleaning up port ${port}:`, error);
      }
    }

    console.log('[ProcessManager] Startup cleanup complete');
  }

  /**
   * Track a port as managed by this process
   */
  public async trackPort(port: number, name: string): Promise<void> {
    this.managedPorts.set(port, name);
    console.log(`[ProcessManager] Tracking port ${port} (${name})`);
  }

  /**
   * Register graceful shutdown handlers
   */
  public registerShutdownHandlers(): void {
    this.app.on('before-quit', async () => {
      console.log('[ProcessManager] App shutting down, running cleanup...');

      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          console.error('[ProcessManager] Shutdown handler error:', error);
        }
      }
    });

    // Handle SIGTERM and SIGINT
    process.on('SIGTERM', () => {
      console.log('[ProcessManager] Received SIGTERM, shutting down gracefully...');
      this.app.quit();
    });

    process.on('SIGINT', () => {
      console.log('[ProcessManager] Received SIGINT, shutting down gracefully...');
      this.app.quit();
    });
  }

  /**
   * Register a shutdown handler
   */
  public onShutdown(handler: () => void | Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Get current process status
   */
  public getStatus(): ProcessStatus {
    const ports: PortStatus[] = [];

    for (const [port, name] of this.managedPorts.entries()) {
      ports.push({
        port,
        name,
        inUse: false, // Will be checked async if needed
      });
    }

    return {
      isRunning: true,
      startTime: this.startTime,
      ports,
    };
  }

  /**
   * Log error with context
   */
  public logError(message: string, context?: Record<string, unknown>): void {
    console.error('[ProcessManager]', message, context || '');
  }
}
