import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { IPCClient } from "../types.js";

export class DatabaseTools {
  constructor(private ipcClient: IPCClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: "database:query",
        description: "Execute a read-only SQL query (SELECT only for security)",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL SELECT query to execute",
            },
          },
          required: ["sql"],
        },
      },
      {
        name: "database:migrate",
        description: "Run database migrations to a specific version (or latest if not specified)",
        inputSchema: {
          type: "object",
          properties: {
            targetVersion: {
              type: "number",
              description: "Target migration version (optional, defaults to latest)",
            },
          },
        },
      },
      {
        name: "database:backup",
        description: "Create a backup of the database",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Backup file path (e.g., ./backups/backup-2024-10-04.db)",
            },
          },
          required: ["path"],
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
    try {
      switch (toolName) {
        case "database:query":
          return await this.query(args);
        case "database:migrate":
          return await this.migrate(args);
        case "database:backup":
          return await this.backup(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing ${toolName}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async query(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!args.sql) {
      throw new Error("SQL query is required");
    }

    // CRITICAL SECURITY: Only allow SELECT queries
    const sql = args.sql.trim();
    if (!sql.toUpperCase().startsWith("SELECT")) {
      throw new Error(
        "Only SELECT queries are allowed via dev API for security. Use database:migrate for schema changes."
      );
    }

    // Additional security checks
    const dangerousKeywords = [
      "DROP",
      "DELETE",
      "UPDATE",
      "INSERT",
      "ALTER",
      "CREATE",
      "TRUNCATE",
      "EXEC",
      "EXECUTE",
    ];

    const upperSQL = sql.toUpperCase();
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        throw new Error(
          `Query contains dangerous keyword '${keyword}'. Only SELECT statements are allowed.`
        );
      }
    }

    const result = await this.ipcClient.invoke("dev-api:database:query", sql);

    return {
      content: [
        {
          type: "text",
          text: `✅ Query executed successfully

Rows returned: ${result.length}

${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async migrate(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    const targetVersion = args.targetVersion;

    const result = await this.ipcClient.invoke(
      "dev-api:database:migrate",
      targetVersion
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Database migration completed

Target version: ${targetVersion || "latest"}

${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async backup(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!args.path) {
      throw new Error("Backup path is required");
    }

    // Validate path (prevent directory traversal)
    const path = args.path;
    if (path.includes("..")) {
      throw new Error("Invalid backup path: directory traversal not allowed");
    }

    // Ensure .db extension
    if (!path.endsWith(".db") && !path.endsWith(".sqlite")) {
      throw new Error("Backup path must end with .db or .sqlite extension");
    }

    const result = await this.ipcClient.invoke("dev-api:database:backup", path);

    return {
      content: [
        {
          type: "text",
          text: `✅ Database backup created successfully

Backup location: ${path}

${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
}
