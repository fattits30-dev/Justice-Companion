import express from "express";

/**
 * Type for IPC handler functions
 */
type IPCHandler = (event: any, ...args: any[]) => Promise<any> | any;

export class DevAPIServer {
  private app: express.Application;
  private server: any;
  private handlers: Map<string, IPCHandler> = new Map();

  constructor(private port: number = 5555) {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  /**
   * Register an IPC handler that can be invoked via HTTP
   */
  registerHandler(channel: string, handler: IPCHandler): void {
    this.handlers.set(channel, handler);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/dev-api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // List registered handlers
    this.app.get("/dev-api/handlers", (req, res) => {
      res.json({
        handlers: Array.from(this.handlers.keys()),
        count: this.handlers.size
      });
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
    const handler = this.handlers.get(channel);

    if (!handler) {
      throw new Error(
        `No IPC handler registered for channel: ${channel}. ` +
        `Available: ${Array.from(this.handlers.keys()).join(', ')}`
      );
    }

    const mockEvent = { sender: null };
    return await Promise.resolve(handler(mockEvent, ...args));
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
