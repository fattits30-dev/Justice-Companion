import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ElectronIPCClient } from "./ipc-client.js";
import { CaseTools } from "./tools/cases.js";
import { DatabaseTools } from "./tools/database.js";

export class JusticeCompanionMCPServer {
  private server: Server;
  private ipcClient: ElectronIPCClient;
  private caseTools: CaseTools;
  private databaseTools: DatabaseTools;

  constructor() {
    this.server = new Server(
      {
        name: "justice-companion-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.ipcClient = new ElectronIPCClient();
    this.caseTools = new CaseTools(this.ipcClient);
    this.databaseTools = new DatabaseTools(this.ipcClient);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...this.caseTools.getToolDefinitions(),
          ...this.databaseTools.getToolDefinitions(),
        ],
      };
    });

    // Execute tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.error(`🔧 Executing tool: ${name}`);

      // Route to appropriate tool handler
      if (name.startsWith("cases:")) {
        return await this.caseTools.executeTool(name, args);
      } else if (name.startsWith("database:")) {
        return await this.databaseTools.executeTool(name, args);
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    console.error("🚀 Starting Justice Companion MCP Server...");

    // Connect to Electron dev API
    await this.ipcClient.connect();

    // Start stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("✅ MCP Server ready and listening on stdio");
  }
}
