import type { App } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import net from "net";
import { errorLogger } from "../utils/error-logger.ts";
import { logger } from "../utils/logger.ts";

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
      errorLogger.logError(new Error("Another instance is already running"), {
        service: "ProcessManager",
        operation: "enforceSingleInstance",
      });
      this.app.quit();
      return false;
    }

    logger.info("[ProcessManager] Single instance lock acquired", {
      service: "ProcessManager",
    });
    return true;
  }

  /**
   * Register callback for when a second instance is launched
   */
  public onSecondInstance(callback: () => void): void {
    this.app.on(
      "second-instance",
      (_event, _commandLine, _workingDirectory) => {
        logger.warn(
          "[ProcessManager] Second instance detected, focusing main window...",
        );
        callback();
      },
    );
  }

  /**
   * Check if a port is currently in use
   */
  public async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once("error", (_err: NodeJS.ErrnoException) => {
        resolve(true);
      });

      server.once("listening", () => {
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
      if (process.platform === "win32") {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split("\n");

        for (const line of lines) {
          const match = line.match(/LISTENING\s+(\d+)/);
          if (match) {
            return { pid: parseInt(match[1], 10) };
          }
        }
      } else if (
        process.platform === "linux" ||
        process.platform === "darwin"
      ) {
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
      ports,
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
   * Kill process running on a specific port
   */
  public async killProcessOnPort(port: number): Promise<boolean> {
    try {
      const processInfo = await this.findProcessByPort(port);

      if (!processInfo.pid) {
        return false; // No process found on port
      }

      if (process.platform === "win32") {
        await execAsync(`taskkill /PID ${processInfo.pid} /F`);
      } else {
        await execAsync(`kill -9 ${processInfo.pid}`);
      }

      return true;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "ProcessManager",
          operation: "killProcessOnPort",
          port,
        },
      );
      return false;
    }
  }

  /**
   * Clean up processes on startup
   */
  public async cleanupOnStartup(): Promise<void> {
    // Kill any lingering processes from previous runs on managed ports
    for (const [port, name] of this.managedPorts.entries()) {
      try {
        const inUse = await this.isPortInUse(port);
        if (inUse) {
          logger.info(
            `[ProcessManager] Port ${port} (${name}) is in use, attempting cleanup...`,
            { service: "ProcessManager", port, name },
          );
          await this.killProcessOnPort(port);
        }
      } catch (error) {
        // Log error but don't throw - cleanup should continue
        this.logError(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: "cleanupOnStartup",
            port,
            name,
          },
        );
      }
    }
  }

  /**
   * Register shutdown handlers
   */
  public registerShutdownHandlers(): void {
    // Register 'before-quit' event handler to execute cleanup before app quits
    this.app.on("before-quit", async () => {
      await this.executeShutdownHandlers();
    });
  }

  /**
   * Register shutdown callback
   */
  public onShutdown(callback: () => void | Promise<void>): void {
    this.addShutdownHandler(callback);
  }

  /**
   * Get status (alias for getProcessStatus)
   */
  public async getStatus(): Promise<ProcessStatus> {
    return this.getProcessStatus();
  }

  /**
   * Track port (alias for registerManagedPort)
   */
  public trackPort(port: number, name: string): void {
    this.registerManagedPort(port, name);
  }

  /**
   * Ensure port is available
   */
  public async ensurePortAvailable(
    port: number,
    maxRetries: number = 1,
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return true;
      }
      await this.killProcessOnPort(port);
    }
    return false;
  }

  /**
   * Log error
   */
  public logError(error: Error, context?: Record<string, unknown>): void {
    // Log to console for immediate feedback
    logger.error("[ProcessManager]", error.message, {
      service: "ProcessManager",
      ...context,
    });

    // Also log to file for persistence
    errorLogger.logError(error, {
      service: "ProcessManager",
      ...context,
    });
  }

  /**
   * Kill process by ID
   */
  public async killProcessById(pid: number): Promise<boolean> {
    try {
      if (process.platform === "win32") {
        await execAsync(`taskkill /PID ${pid} /F`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }
      return true;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "ProcessManager",
          operation: "killProcessById",
          pid,
        },
      );
      return false;
    }
  }

  /**
   * Execute all shutdown handlers
   */
  public async executeShutdownHandlers(): Promise<void> {
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        errorLogger.logError(
          error instanceof Error ? error : new Error(String(error)),
          {
            service: "ProcessManager",
            operation: "executeShutdownHandlers",
          },
        );
      }
    }
  }
}
