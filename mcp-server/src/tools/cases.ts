import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { IPCClient } from "../types.js";

export class CaseTools {
  constructor(private ipcClient: IPCClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: "cases:create",
        description: "Create a new legal case for testing or development",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Case title (max 200 chars)",
              maxLength: 200,
            },
            type: {
              type: "string",
              enum: ["employment", "housing", "consumer", "civil"],
              description: "Type of legal case",
            },
            description: {
              type: "string",
              description: "Case description (max 5000 chars)",
              maxLength: 5000,
            },
            status: {
              type: "string",
              enum: ["active", "archived", "closed"],
              description: "Case status (default: active)",
            },
          },
          required: ["title", "type"],
        },
      },
      {
        name: "cases:get",
        description: "Get a case by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Case ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "cases:list",
        description: "List all cases with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["employment", "housing", "consumer", "civil"],
              description: "Filter by case type",
            },
            status: {
              type: "string",
              enum: ["active", "archived", "closed"],
              description: "Filter by status",
            },
            limit: {
              type: "number",
              description: "Max number of cases to return (default: 50)",
              minimum: 1,
              maximum: 1000,
            },
          },
        },
      },
      {
        name: "cases:update",
        description: "Update an existing case",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Case ID",
            },
            title: { type: "string", maxLength: 200 },
            description: { type: "string", maxLength: 5000 },
            status: {
              type: "string",
              enum: ["active", "archived", "closed"],
            },
          },
          required: ["id"],
        },
      },
      {
        name: "cases:delete",
        description: "Delete a case (soft delete with audit log)",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Case ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "cases:createTestFixture",
        description: "Create a complete test fixture with case + documents + conversations",
        inputSchema: {
          type: "object",
          properties: {
            caseType: {
              type: "string",
              enum: ["employment", "housing", "consumer", "civil"],
              description: "Type of case to create",
            },
            includeDocuments: {
              type: "boolean",
              description: "Include sample documents (default: true)",
            },
            includeConversations: {
              type: "boolean",
              description: "Include sample AI conversations (default: true)",
            },
            documentCount: {
              type: "number",
              description: "Number of sample documents (default: 3)",
              minimum: 0,
              maximum: 10,
            },
            conversationCount: {
              type: "number",
              description: "Number of sample conversations (default: 2)",
              minimum: 0,
              maximum: 5,
            },
          },
          required: ["caseType"],
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
    try {
      switch (toolName) {
        case "cases:create":
          return await this.create(args);
        case "cases:get":
          return await this.get(args);
        case "cases:list":
          return await this.list(args);
        case "cases:update":
          return await this.update(args);
        case "cases:delete":
          return await this.delete(args);
        case "cases:createTestFixture":
          return await this.createTestFixture(args);
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

  private async create(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    // Validate inputs
    if (!args.title || args.title.length > 200) {
      throw new Error("Invalid title: must be 1-200 characters");
    }

    const validTypes = ["employment", "housing", "consumer", "civil"];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid type: must be one of ${validTypes.join(", ")}`);
    }

    const result = await this.ipcClient.invoke("dev-api:cases:create", args);

    return {
      content: [
        {
          type: "text",
          text: `✅ Case created successfully\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async get(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!args.id) {
      throw new Error("Case ID is required");
    }

    const result = await this.ipcClient.invoke("dev-api:cases:get", args.id);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async list(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    const result = await this.ipcClient.invoke("dev-api:cases:list", args || {});

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.length} cases\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async update(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!args.id) {
      throw new Error("Case ID is required");
    }

    const { id, ...updates } = args;
    const result = await this.ipcClient.invoke("dev-api:cases:update", {
      id,
      updates,
    });

    return {
      content: [
        {
          type: "text",
          text: `✅ Case updated successfully\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async delete(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!args.id) {
      throw new Error("Case ID is required");
    }

    await this.ipcClient.invoke("dev-api:cases:delete", args.id);

    return {
      content: [
        {
          type: "text",
          text: `✅ Case ${args.id} deleted successfully`,
        },
      ],
    };
  }

  private async createTestFixture(args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    const validTypes = ["employment", "housing", "consumer", "civil"];
    if (!validTypes.includes(args.caseType)) {
      throw new Error(`Invalid caseType: must be one of ${validTypes.join(", ")}`);
    }

    const result = await this.ipcClient.invoke(
      "dev-api:cases:createTestFixture",
      {
        caseType: args.caseType,
        includeDocuments: args.includeDocuments !== false,
        includeConversations: args.includeConversations !== false,
        documentCount: args.documentCount || 3,
        conversationCount: args.conversationCount || 2,
      }
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Test fixture created successfully

Case ID: ${result.caseId}
Documents: ${result.documentIds.length} created
Conversations: ${result.conversationIds.length} created

Full details:
${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
}
