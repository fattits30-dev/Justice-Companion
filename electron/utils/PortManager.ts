/**
 * Port Management Utility
 *
 * Centralized utility for managing port conflicts and process cleanup.
 * Prevents zombie processes from blocking ports when services restart.
 *
 * Features:
 * - Kill all processes using a specific port
 * - Check if a port is available
 * - Wait for a port to become available
 * - Retry logic with multiple kill strategies
 * - Cross-platform support (Windows, macOS, Linux)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../src/utils/logger';

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: string;
  name: string;
}

export class PortAccessDeniedError extends Error {
  constructor(pid: string) {
    super(`Access denied when trying to kill process ${pid}`);
    this.name = 'PortAccessDeniedError';
  }
}

export class PortTimeoutError extends Error {
  constructor(port: number, timeoutMs: number) {
    super(`Port ${port} did not become available within ${timeoutMs}ms`);
    this.name = 'PortTimeoutError';
  }
}

export class PortManager {
  /**
   * Kill all processes using the specified port
   * Uses aggressive retry strategy with multiple kill methods
   *
   * @param port - Port number to clean
   * @param maxRetries - Number of retry attempts per process (default: 3)
   * @returns Array of killed PIDs
   */
  static async killProcessesOnPort(port: number, maxRetries: number = 3): Promise<string[]> {
    try {
      logger.info(`[PortManager] Checking for processes on port ${port}...`);

      const pids = await this.getProcessIdsOnPort(port);

      if (pids.length === 0) {
        logger.info(`[PortManager] No processes found on port ${port}`);
        return [];
      }

      logger.info(`[PortManager] Found ${pids.length} process(es) on port ${port}`, { pids });

      const killedPids: string[] = [];

      // Kill each process with retry logic
      for (const pid of pids) {
        try {
          await this.killProcessWithRetry(pid, maxRetries);
          killedPids.push(pid);
        } catch (error) {
          logger.warn(`[PortManager] Could not kill process ${pid}`, { error });
          // Continue trying other processes
        }
      }

      if (killedPids.length > 0) {
        // Wait for processes to fully terminate
        logger.info(`[PortManager] Waiting for ${killedPids.length} process(es) to terminate...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify processes were killed
        await this.verifyProcessesKilled(port, new Set(pids));
      }

      logger.info(`[PortManager] Successfully killed ${killedPids.length} process(es)`, { killedPids });
      return killedPids;
    } catch (error) {
      logger.error('[PortManager] Error during port cleanup', { port, error });
      throw error;
    }
  }

  /**
   * Get PIDs of all processes listening on the specified port
   */
  private static async getProcessIdsOnPort(port: number): Promise<string[]> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use netstat
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        return this.parseWindowsNetstat(stdout);
      } else {
        // Unix: Use lsof
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        return stdout
          .trim()
          .split('\n')
          .filter((pid) => pid.length > 0);
      }
    } catch (error) {
      // No processes found (command returned no results)
      return [];
    }
  }

  /**
   * Parse Windows netstat output to extract PIDs
   */
  private static parseWindowsNetstat(output: string): string[] {
    const pids = new Set<string>();
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // Look for LISTENING state
      if (parts.length >= 5 && parts[3].includes('LISTENING')) {
        const pid = parts[4];
        if (pid !== '0') {
          pids.add(pid);
        }
      }
    }

    return Array.from(pids);
  }

  /**
   * Kill a single process with retry logic and multiple strategies
   */
  private static async killProcessWithRetry(pid: string, maxAttempts: number): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (process.platform === 'win32') {
          // Windows: Use taskkill with /F flag (force kill)
          await execAsync(`taskkill /F /PID ${pid}`, { timeout: 5000 });
        } else {
          // Unix: Use kill command
          await execAsync(`kill -9 ${pid}`, { timeout: 5000 });
        }

        logger.info(`[PortManager] Successfully killed process ${pid}`, { attempt });
        return;
      } catch (error: any) {
        const errorMessage = error?.message || String(error);

        // Check if process already terminated
        if (
          errorMessage.includes('not found') ||
          errorMessage.includes('No such process') ||
          errorMessage.includes('No tasks')
        ) {
          logger.info(`[PortManager] Process ${pid} already terminated`);
          return;
        }

        // Check if access denied
        if (errorMessage.includes('Access is denied') || errorMessage.includes('Operation not permitted')) {
          logger.warn(`[PortManager] Access denied for process ${pid}, trying alternative method...`, {
            attempt,
          });

          if (process.platform === 'win32') {
            // Try with /T flag to kill child processes (might help with permissions)
            try {
              await execAsync(`taskkill /F /T /PID ${pid}`, { timeout: 5000 });
              logger.info(`[PortManager] Successfully killed process ${pid} with /T flag`, { attempt });
              return;
            } catch (treeError: any) {
              if (attempt === maxAttempts) {
                throw new PortAccessDeniedError(pid);
              }
            }
          } else {
            if (attempt === maxAttempts) {
              throw new PortAccessDeniedError(pid);
            }
          }
        } else {
          logger.warn(`[PortManager] Failed to kill process ${pid} on attempt ${attempt}`, {
            error: errorMessage,
          });
        }

        // Wait before retry
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw new Error(`Failed to kill process ${pid} after ${maxAttempts} attempts`);
  }

  /**
   * Verify all processes were successfully killed
   */
  private static async verifyProcessesKilled(port: number, originalPids: Set<string>): Promise<void> {
    try {
      const remainingPids = await this.getProcessIdsOnPort(port);
      const stillAlive = remainingPids.filter((pid) => originalPids.has(pid));

      if (stillAlive.length > 0) {
        logger.warn(`[PortManager] ${stillAlive.length} process(es) still alive after cleanup`, {
          pids: stillAlive,
        });
      } else {
        logger.info('[PortManager] All processes successfully terminated');
      }
    } catch (error) {
      // No processes on port (good - they were all killed)
      logger.info('[PortManager] Port is clear, all processes terminated');
    }
  }

  /**
   * Check if a port is available (not in use)
   *
   * @param port - Port number to check
   * @returns true if port is available
   */
  static async isPortAvailable(port: number): Promise<boolean> {
    try {
      const pids = await this.getProcessIdsOnPort(port);
      return pids.length === 0;
    } catch (error) {
      logger.error('[PortManager] Error checking port availability', { port, error });
      return false;
    }
  }

  /**
   * Wait for a port to become available
   *
   * @param port - Port number to wait for
   * @param timeoutMs - Maximum wait time in milliseconds
   * @returns true if port became available within timeout
   */
  static async waitForPortAvailable(port: number, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 200; // Check every 200ms

    while (Date.now() - startTime < timeoutMs) {
      const available = await this.isPortAvailable(port);
      if (available) {
        logger.info(`[PortManager] Port ${port} became available after ${Date.now() - startTime}ms`);
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    logger.warn(`[PortManager] Port ${port} did not become available within ${timeoutMs}ms`);
    return false;
  }

  /**
   * Find an available port starting from the given port
   *
   * @param startPort - Starting port number
   * @param maxAttempts - Maximum ports to try (default: 10)
   * @returns Available port number or null if none found
   */
  static async findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      const available = await this.isPortAvailable(port);
      if (available) {
        logger.info(`[PortManager] Found available port: ${port}`);
        return port;
      }
    }

    logger.warn(`[PortManager] No available ports found starting from ${startPort}`);
    return null;
  }

  /**
   * Get information about processes using a port
   *
   * @param port - Port number to check
   * @returns Array of process information
   */
  static async getProcessesOnPort(port: number): Promise<ProcessInfo[]> {
    const pids = await this.getProcessIdsOnPort(port);
    const processes: ProcessInfo[] = [];

    for (const pid of pids) {
      try {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
          const match = stdout.match(/"([^"]+)"/);
          const name = match ? match[1] : 'Unknown';
          processes.push({ pid, name });
        } else {
          const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
          const name = stdout.trim();
          processes.push({ pid, name });
        }
      } catch {
        // Process might have terminated, use unknown
        processes.push({ pid, name: 'Unknown' });
      }
    }

    return processes;
  }
}
