import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Client for communicating with Electron main process via HTTP bridge
 */
export interface IPCClient {
  connect(): Promise<void>;
  invoke(channel: string, ...args: any[]): Promise<any>;
  disconnect(): void;
}

export { Tool };
