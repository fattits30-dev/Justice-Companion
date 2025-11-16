import net from "net";
import { logger } from "../utils/logger";
import { errorLogger } from "../utils/error-logger";
import path from "path";
import fs from "fs";

/**
 * Port configuration for a service
 */
interface PortConfig {
  service: string;
  defaultPort: number;
  range?: [number, number]; // Optional port range for fallback
  description?: string;
  required: boolean;
}

/**
 * Port allocation result
 */
interface PortAllocation {
  service: string;
  requestedPort: number;
  allocatedPort: number;
  status: "allocated" | "in_use" | "error";
  message?: string;
}

/**
 * Port status information
 */
interface PortStatus {
  port: number;
  service: string;
  inUse: boolean;
  pid?: number;
  allocatedAt?: Date;
}

/**
 * Service port mapping
 */
interface ServicePortMap {
  [service: string]: number;
}

/**
 * PortManager Configuration
 */
interface PortManagerConfig {
  portConfigPath?: string;
  enableAutoAllocation?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Default port configuration for Justice Companion services
 */
const DEFAULT_PORT_CONFIGS: PortConfig[] = [
  {
    service: "vite-dev-server",
    defaultPort: 5176,
    range: [5173, 5180],
    description: "Vite development server",
    required: true,
  },
  {
    service: "python-ai-service",
    defaultPort: 5050,
    range: [5050, 5060],
    description: "Python AI document analysis service",
    required: false,
  },
  {
    service: "electron-dev-api",
    defaultPort: 8080,
    range: [8080, 8090],
    description: "Electron development API server",
    required: false,
  },
  {
    service: "playwright-debug",
    defaultPort: 9323,
    range: [9320, 9330],
    description: "Playwright debugger",
    required: false,
  },
];

/**
 * Centralized port management for Justice Companion
 * Handles port allocation, conflict resolution, and monitoring
 */
export class PortManager {
  private portConfigs: Map<string, PortConfig> = new Map();
  private allocatedPorts: Map<string, PortAllocation> = new Map();
  private portMonitors: Map<number, NodeJS.Timeout> = new Map();
  private config: Required<PortManagerConfig>;

  constructor(config?: PortManagerConfig) {
    this.config = {
      portConfigPath: config?.portConfigPath || "",
      enableAutoAllocation: config?.enableAutoAllocation ?? true,
      maxRetries: config?.maxRetries ?? 10,
      retryDelay: config?.retryDelay ?? 100,
    };

    // App reference not needed
    this.initializePortConfigs();
  }

  /**
   * Initialize port configurations from file or defaults
   */
  private initializePortConfigs(): void {
    // Try to load from config file first
    if (
      this.config.portConfigPath &&
      fs.existsSync(this.config.portConfigPath)
    ) {
      try {
        const configData = fs.readFileSync(this.config.portConfigPath, "utf-8");
        const customConfigs = JSON.parse(configData) as PortConfig[];
        customConfigs.forEach((config) => {
          this.portConfigs.set(config.service, config);
        });
        logger.info("[PortManager] Loaded custom port configurations", {
          service: "PortManager",
          metadata: { configFile: this.config.portConfigPath },
        });
      } catch (error) {
        errorLogger.logError(
          error instanceof Error ? error : new Error(String(error)),
          {
            service: "PortManager",
            operation: "initializePortConfigs",
            metadata: { configFile: this.config.portConfigPath },
          },
        );
        this.loadDefaultConfigs();
      }
    } else {
      this.loadDefaultConfigs();
    }
  }

  /**
   * Load default port configurations
   */
  private loadDefaultConfigs(): void {
    DEFAULT_PORT_CONFIGS.forEach((config) => {
      this.portConfigs.set(config.service, config);
    });
    logger.info("[PortManager] Loaded default port configurations", {
      service: "PortManager",
      metadata: { services: Array.from(this.portConfigs.keys()) },
    });
  }

  /**
   * Check if a port is available
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          // Other errors we'll treat as port being unavailable
          errorLogger.logError(err, {
            service: "PortManager",
            operation: "isPortAvailable",
            port,
          });
          resolve(false);
        }
      });

      server.once("listening", () => {
        server.close();
        resolve(true);
      });

      server.listen(port, "127.0.0.1");
    });
  }

  /**
   * Find an available port within a range
   */
  public async findAvailablePort(
    startPort: number,
    endPort?: number,
  ): Promise<number | null> {
    const end = endPort || startPort + 100;

    for (let port = startPort; port <= end; port++) {
      const available = await this.isPortAvailable(port);
      if (available) {
        return port;
      }
    }

    return null;
  }

  /**
   * Allocate a port for a service
   */
  public async allocatePort(serviceName: string): Promise<PortAllocation> {
    const config = this.portConfigs.get(serviceName);

    if (!config) {
      const allocation: PortAllocation = {
        service: serviceName,
        requestedPort: 0,
        allocatedPort: 0,
        status: "error",
        message: `No port configuration found for service: ${serviceName}`,
      };
      this.allocatedPorts.set(serviceName, allocation);
      return allocation;
    }

    // Check if already allocated
    const existingAllocation = this.allocatedPorts.get(serviceName);
    if (existingAllocation && existingAllocation.status === "allocated") {
      const stillAvailable = await this.isPortAvailable(
        existingAllocation.allocatedPort,
      );
      if (!stillAvailable) {
        return existingAllocation;
      }
    }

    // Try the default port first
    const defaultAvailable = await this.isPortAvailable(config.defaultPort);
    if (defaultAvailable) {
      const allocation: PortAllocation = {
        service: serviceName,
        requestedPort: config.defaultPort,
        allocatedPort: config.defaultPort,
        status: "allocated",
        message: `Allocated default port ${config.defaultPort}`,
      };
      this.allocatedPorts.set(serviceName, allocation);
      logger.info(
        `[PortManager] Allocated port ${config.defaultPort} for ${serviceName}`,
        {
          service: "PortManager",
          metadata: { allocation },
        },
      );
      return allocation;
    }

    // If auto-allocation is enabled and we have a range, try to find an alternative
    if (this.config.enableAutoAllocation && config.range) {
      const availablePort = await this.findAvailablePort(
        config.range[0],
        config.range[1],
      );

      if (availablePort) {
        const allocation: PortAllocation = {
          service: serviceName,
          requestedPort: config.defaultPort,
          allocatedPort: availablePort,
          status: "allocated",
          message: `Default port ${config.defaultPort} was in use. Allocated alternative port ${availablePort}`,
        };
        this.allocatedPorts.set(serviceName, allocation);
        logger.info(
          `[PortManager] Allocated alternative port ${availablePort} for ${serviceName}`,
          {
            service: "PortManager",
            metadata: { allocation },
          },
        );
        return allocation;
      }
    }

    // Port allocation failed
    const allocation: PortAllocation = {
      service: serviceName,
      requestedPort: config.defaultPort,
      allocatedPort: 0,
      status: "in_use",
      message: `Port ${config.defaultPort} is in use and no alternatives available`,
    };
    this.allocatedPorts.set(serviceName, allocation);
    errorLogger.logError(
      new Error(`Failed to allocate port for ${serviceName}`),
      {
        service: "PortManager",
        metadata: { allocation },
      },
    );
    return allocation;
  }

  /**
   * Allocate all required ports
   */
  public async allocateAllPorts(): Promise<Map<string, PortAllocation>> {
    const allocations = new Map<string, PortAllocation>();

    for (const [serviceName, config] of this.portConfigs) {
      if (config.required) {
        const allocation = await this.allocatePort(serviceName);
        allocations.set(serviceName, allocation);
      }
    }

    return allocations;
  }

  /**
   * Get allocated port for a service
   */
  public getPort(serviceName: string): number | null {
    const allocation = this.allocatedPorts.get(serviceName);
    return allocation && allocation.status === "allocated"
      ? allocation.allocatedPort
      : null;
  }

  /**
   * Get all allocated ports
   */
  public getAllocatedPorts(): ServicePortMap {
    const portMap: ServicePortMap = {};

    for (const [service, allocation] of this.allocatedPorts) {
      if (allocation.status === "allocated") {
        portMap[service] = allocation.allocatedPort;
      }
    }

    return portMap;
  }

  /**
   * Release a port allocation
   */
  public releasePort(serviceName: string): void {
    const allocation = this.allocatedPorts.get(serviceName);
    if (allocation) {
      this.allocatedPorts.delete(serviceName);

      // Stop monitoring if active
      const monitor = this.portMonitors.get(allocation.allocatedPort);
      if (monitor) {
        clearInterval(monitor);
        this.portMonitors.delete(allocation.allocatedPort);
      }

      logger.info(
        `[PortManager] Released port ${allocation.allocatedPort} for ${serviceName}`,
        {
          service: "PortManager",
          metadata: { serviceName, port: allocation.allocatedPort },
        },
      );
    }
  }

  /**
   * Release all allocated ports
   */
  public releaseAllPorts(): void {
    for (const [serviceName] of this.allocatedPorts) {
      this.releasePort(serviceName);
    }
  }

  /**
   * Monitor port availability
   */
  public startPortMonitoring(
    serviceName: string,
    interval: number = 5000,
  ): void {
    const allocation = this.allocatedPorts.get(serviceName);
    if (!allocation || allocation.status !== "allocated") {
      return;
    }

    // Clear existing monitor if any
    const existingMonitor = this.portMonitors.get(allocation.allocatedPort);
    if (existingMonitor) {
      clearInterval(existingMonitor);
    }

    // Start new monitor
    const monitor = setInterval(async () => {
      const available = await this.isPortAvailable(allocation.allocatedPort);
      if (available) {
        logger.warn(
          `[PortManager] Port ${allocation.allocatedPort} for ${serviceName} became available unexpectedly`,
          {
            service: "PortManager",
            metadata: { serviceName, port: allocation.allocatedPort },
          },
        );

        // Could trigger reconnection logic here
        this.onPortBecameAvailable(serviceName, allocation.allocatedPort);
      }
    }, interval);

    this.portMonitors.set(allocation.allocatedPort, monitor);
    logger.info(
      `[PortManager] Started monitoring port ${allocation.allocatedPort} for ${serviceName}`,
      {
        service: "PortManager",
        serviceName,
        port: allocation.allocatedPort,
        interval,
      },
    );
  }

  /**
   * Stop monitoring a port
   */
  public stopPortMonitoring(serviceName: string): void {
    const allocation = this.allocatedPorts.get(serviceName);
    if (allocation) {
      const monitor = this.portMonitors.get(allocation.allocatedPort);
      if (monitor) {
        clearInterval(monitor);
        this.portMonitors.delete(allocation.allocatedPort);
        logger.info(
          `[PortManager] Stopped monitoring port ${allocation.allocatedPort} for ${serviceName}`,
          {
            service: "PortManager",
            serviceName,
            port: allocation.allocatedPort,
          },
        );
      }
    }
  }

  /**
   * Get port status for all configured services
   */
  public async getPortStatus(): Promise<PortStatus[]> {
    const statuses: PortStatus[] = [];

    for (const [serviceName, allocation] of this.allocatedPorts) {
      if (allocation.status === "allocated") {
        const inUse = !(await this.isPortAvailable(allocation.allocatedPort));
        statuses.push({
          port: allocation.allocatedPort,
          service: serviceName,
          inUse,
          allocatedAt: new Date(),
        });
      }
    }

    return statuses;
  }

  /**
   * Save port configuration to file
   */
  public async saveConfiguration(filePath?: string): Promise<void> {
    const configPath = filePath || this.config.portConfigPath;

    if (!configPath) {
      throw new Error("No configuration file path specified");
    }

    const configs = Array.from(this.portConfigs.values());
    const allocations = Array.from(this.allocatedPorts.values());

    const configData = {
      timestamp: new Date().toISOString(),
      portConfigs: configs,
      allocations: allocations.filter((a) => a.status === "allocated"),
    };

    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

      logger.info("[PortManager] Saved port configuration", {
        service: "PortManager",
        configPath,
        services: configs.length,
      });
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "PortManager",
          operation: "saveConfiguration",
          configPath,
        },
      );
      throw error;
    }
  }

  /**
   * Handle port became available event
   */
  private onPortBecameAvailable(serviceName: string, port: number): void {
    // This could be extended to emit events or trigger reconnection logic
    logger.info(
      `[PortManager] Port ${port} for ${serviceName} is now available`,
      {
        service: "PortManager",
        serviceName,
        port,
      },
    );
  }

  /**
   * Get environment variables for allocated ports
   */
  public getEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};

    for (const [service, allocation] of this.allocatedPorts) {
      if (allocation.status === "allocated") {
        const envKey = service.toUpperCase().replace(/-/g, "_") + "_PORT";
        env[envKey] = String(allocation.allocatedPort);
      }
    }

    return env;
  }

  /**
   * Wait for a port to become available
   */
  public async waitForPort(
    port: number,
    timeout: number = 30000,
    checkInterval: number = 1000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const available = !(await this.isPortAvailable(port));
      if (available) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return false;
  }

  /**
   * Cleanup and release resources
   */
  public async cleanup(): Promise<void> {
    // Stop all port monitors
    for (const monitor of this.portMonitors.values()) {
      clearInterval(monitor);
    }
    this.portMonitors.clear();

    // Save current configuration
    if (this.config.portConfigPath) {
      try {
        await this.saveConfiguration();
      } catch (error) {
        // Log but don't throw during cleanup
        errorLogger.logError(
          error instanceof Error ? error : new Error(String(error)),
          {
            service: "PortManager",
            operation: "cleanup",
          },
        );
      }
    }

    // Clear allocations
    this.allocatedPorts.clear();

    logger.info("[PortManager] Cleanup completed", {
      service: "PortManager",
    });
  }
}

// Export singleton instance for convenience
let portManagerInstance: PortManager | null = null;

export function getPortManager(config?: PortManagerConfig): PortManager {
  if (!portManagerInstance) {
    portManagerInstance = new PortManager(config);
  }
  return portManagerInstance;
}
