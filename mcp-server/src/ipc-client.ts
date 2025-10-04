import { IPCClient } from "./types.js";

export class ElectronIPCClient implements IPCClient {
  private readonly baseUrl = "http://localhost:5555/dev-api";

  async connect(): Promise<void> {
    const isRunning = await this.checkHealth();
    if (!isRunning) {
      throw new Error("Electron dev API server not running on localhost:5555");
    }
    console.error("✅ Connected to Electron dev API");
  }

  async invoke(channel: string, ...args: any[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ipc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, args }),
    });

    if (!response.ok) {
      throw new Error(`IPC invoke failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.result;
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    // Nothing to clean up for HTTP client
  }
}
