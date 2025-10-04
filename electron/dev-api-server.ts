import express from "express";
import { ipcMain } from "electron";

export class DevAPIServer {
  private app: express.Application;
  private server: any;

  constructor(private port: number = 5555) {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/dev-api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // IPC proxy endpoint
    this.app.post("/dev-api/ipc", async (req, res) => {
      const { channel, args } = req.body;

      try {
        const result = await this.invokeIPC(channel, args);
        res.json({ result });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private async invokeIPC(channel: string, args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const handlers = (ipcMain as any)._events?.[channel];

      if (!handlers) {
        reject(new Error(`No IPC handler registered for channel: ${channel}`));
        return;
      }

      const handler = Array.isArray(handlers) ? handlers[0] : handlers;
      const mockEvent = { sender: null };

      Promise.resolve(handler(mockEvent, ...args))
        .then(resolve)
        .catch(reject);
    });
  }

  start(): void {
    this.server = this.app.listen(this.port, "127.0.0.1", () => {
      console.log(`✅ Dev API server listening on http://localhost:${this.port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}
