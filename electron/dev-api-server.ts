import express, { Request, Response } from "express";

/**
 * Type for IPC handler functions
 */
type IPCHandler = (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown;

export class DevAPIServer {
  private app: express.Application;
  private server: ReturnType<express.Application['listen']> | null = null;
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
    this.app.get("/dev-api/health", (_req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // List registered handlers
    this.app.get("/dev-api/handlers", (_req: Request, res: Response) => {
      res.json({
        handlers: Array.from(this.handlers.keys()),
        count: this.handlers.size
      });
    });

    // IPC proxy endpoint
    this.app.post("/dev-api/ipc", async (req: Request, res: Response) => {
      const { channel, args } = req.body as { channel: string; args: unknown[] };

      try {
        const result = await this.invokeIPC(channel, args);
        res.json({ result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
      }
    });
  }

  private async invokeIPC(channel: string, args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(channel);

    if (!handler) {
      throw new Error(
        `No IPC handler registered for channel: ${channel}. ` +
        `Available: ${Array.from(this.handlers.keys()).join(', ')}`
      );
    }

    // Security: Verify handler is actually a function before invoking
    if (typeof handler !== 'function') {
      throw new Error(
        `Handler for channel '${channel}' is not a function. ` +
        `Got type: ${typeof handler}`
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
