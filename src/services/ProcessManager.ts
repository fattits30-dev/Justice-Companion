import type { App } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { errorLogger } from '../utils/error-logger.ts';

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
      errorLogger.logError(new Error('Another instance is already running'), {
        service: 'ProcessManager',
        operation: 'enforceSingleInstance',
      });
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
      console.warn('[ProcessManager] Second instance detected, focusing main window...');
      callback();
    });
  }

  /**
   * Check if a port is currently in use
   */
  public async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (_err: NodeJS.ErrnoException) => {
         
        resolve(true);
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
      } else if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        const pid = stdout.trim();
        if (pid) {
          return { pid: parseInt(pid, 10) };
        }
      }
      return { pid: null };
    } catch {
      return { pid: null };
    }
  }

  /**
   * Get process status information
   */
  public async getProcessStatus(): Promise<ProcessStatus> {
    const ports: PortStatus[] = [];
    
    for (const [port, name] of this.managedPorts.entries()) {
      const inUse = await this.isPortInUse(port);
      ports.push({ port, name, inUse });
    }

    return {
      isRunning: true,
      startTime: this.startTime,
      ports
    };
  }

  /**
   * Register a port to be managed by this process
   */
  public registerManagedPort(port: number, name: string): void {
    this.managedPorts.set(port, name);
  }

  /**
   * Add shutdown handler to be called on app quit
   */
  public addShutdownHandler(handler: () => void | Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Execute all shutdown handlers
   */
  public async executeShutdownHandlers(): Promise<void> {
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
          service: 'ProcessManager',
          operation: 'executeShutdownHandlers',
        });
      }
    }
  }
}