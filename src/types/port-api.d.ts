/**
 * Port status and management API types
 */

export interface PortStatus {
  port: number;
  service: string;
  inUse: boolean;
  allocatedAt?: string;
}

export interface PortAllocation {
  [service: string]: number;
}

export interface PortMonitorData {
  timestamp: string;
  allocatedPorts: PortAllocation;
  portStatus: PortStatus[];
  environment: Record<string, string>;
}

export interface PortApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PortApi {
  /**
   * Get current port status for all services
   */
  getPortStatus(): Promise<PortApiResponse<PortMonitorData>>;

  /**
   * Allocate a port for a specific service
   */
  allocatePort(serviceName: string): Promise<PortApiResponse<{ port: number; service: string }>>;

  /**
   * Release all allocated ports
   */
  releaseAllPorts(): Promise<PortApiResponse<void>>;

  /**
   * Restart all services
   */
  restartServices(): Promise<PortApiResponse<void>>;

  /**
   * Get the allocated port for a specific service
   */
  getServicePort(serviceName: string): Promise<PortApiResponse<{ port: number; service: string }>>;

  /**
   * Check if a specific port is available
   */
  isPortAvailable(port: number): Promise<PortApiResponse<{ port: number; available: boolean }>>;
}

// Port management API is now part of a separate namespace
declare global {
  interface Window {
    portApi?: {
      // Port management API
      getPortStatus: () => Promise<PortApiResponse<PortMonitorData>>;
      allocatePort: (serviceName: string) => Promise<PortApiResponse<{ port: number; service: string }>>;
      releaseAllPorts: () => Promise<PortApiResponse<void>>;
      restartServices: () => Promise<PortApiResponse<void>>;
      getServicePort: (serviceName: string) => Promise<PortApiResponse<{ port: number; service: string }>>;
      isPortAvailable: (port: number) => Promise<PortApiResponse<{ port: number; available: boolean }>>;
    };
  }
}