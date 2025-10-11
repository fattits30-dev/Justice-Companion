#!/usr/bin/env node

/**
 * Justice Companion Development MCP Server
 *
 * Provides development tools for debugging and inspecting the Justice Companion app:
 * - Database query tools (cases, documents, user facts, audit logs)
 * - Citation extraction tools (using eyecite-js)
 * - Schema inspection resources
 * - Statistics and monitoring
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path (adjust based on your environment)
const DB_PATH =
  process.env.JC_DATABASE_PATH ||
  path.join(
    process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming'),
    'justice-companion',
    'justice.db'
  );

// Zod schemas for tool inputs
const QueryCasesSchema = z.object({
  limit: z.number().optional().default(10),
  status: z.enum(['active', 'closed', 'archived']).optional(),
  search: z.string().optional(),
});

const QueryDocumentsSchema = z.object({
  limit: z.number().optional().default(10),
  caseId: z.string().optional(),
  type: z.string().optional(),
});

const QueryUserFactsSchema = z.object({
  limit: z.number().optional().default(20),
  category: z.string().optional(),
  search: z.string().optional(),
});

const QueryAuditLogsSchema = z.object({
  limit: z.number().optional().default(50),
  userId: z.string().optional(),
  action: z.string().optional(),
  since: z.string().optional(), // ISO date string
});

const ExtractCitationsSchema = z.object({
  text: z.string(),
  includeMetadata: z.boolean().optional().default(true),
});

const ExecuteSQLSchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional().default([]),
});

/**
 * Get database connection
 */
function getDatabase(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }
  return new Database(DB_PATH, { readonly: true });
}

/**
 * Format SQL results as readable text
 */
function formatResults(results: any[], columns?: string[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  const keys = columns || Object.keys(results[0]);
  const rows = results.map((row) =>
    keys.map((key) => {
      const value = row[key];
      if (value === null) return 'NULL';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  // Calculate column widths
  const widths = keys.map((key, i) => {
    const maxContentWidth = Math.max(key.length, ...rows.map((row) => row[i].length));
    return Math.min(maxContentWidth, 50); // Max 50 chars per column
  });

  // Format header
  const header = keys.map((key, i) => key.padEnd(widths[i])).join(' | ');
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-');

  // Format rows
  const formattedRows = rows.map((row) =>
    row
      .map((cell, i) => {
        const truncated = cell.length > widths[i] ? cell.substring(0, widths[i] - 3) + '...' : cell;
        return truncated.padEnd(widths[i]);
      })
      .join(' | ')
  );

  return `${header}\n${separator}\n${formattedRows.join('\n')}\n\nTotal: ${results.length} rows`;
}

/**
 * Create and configure the MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'justice-companion-dev',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true },
      },
    }
  );

  // ============================================================================
  // TOOLS
  // ============================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'query_cases',
          description: 'Query cases from the database with filters',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10)',
              },
              status: {
                type: 'string',
                enum: ['active', 'closed', 'archived'],
                description: 'Filter by case status',
              },
              search: {
                type: 'string',
                description: 'Search in case title or description',
              },
            },
          },
        },
        {
          name: 'query_documents',
          description: 'Query documents from the database',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10)',
              },
              caseId: {
                type: 'string',
                description: 'Filter by case ID',
              },
              type: {
                type: 'string',
                description: 'Filter by document type',
              },
            },
          },
        },
        {
          name: 'query_user_facts',
          description: 'Query user facts from the database',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 20)',
              },
              category: {
                type: 'string',
                description: 'Filter by category',
              },
              search: {
                type: 'string',
                description: 'Search in fact content',
              },
            },
          },
        },
        {
          name: 'query_audit_logs',
          description: 'Query audit logs for security and debugging',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 50)',
              },
              userId: {
                type: 'string',
                description: 'Filter by user ID',
              },
              action: {
                type: 'string',
                description: 'Filter by action type',
              },
              since: {
                type: 'string',
                description: 'Filter by timestamp (ISO date string)',
              },
            },
          },
        },
        {
          name: 'extract_citations',
          description: 'Extract legal citations from text using eyecite-js',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text containing legal citations',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Include citation metadata (default: true)',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'execute_sql',
          description: 'Execute arbitrary SQL query (read-only)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL query to execute',
              },
              params: {
                type: 'array',
                description: 'Query parameters',
                items: { type: 'string' },
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_database_stats',
          description: 'Get database statistics (table sizes, counts)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'query_cases': {
          const { limit, status, search } = QueryCasesSchema.parse(args || {});
          const db = getDatabase();

          let query = 'SELECT * FROM cases WHERE 1=1';
          const params: any[] = [];

          if (status) {
            query += ' AND status = ?';
            params.push(status);
          }

          if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
          }

          query += ' ORDER BY updated_at DESC LIMIT ?';
          params.push(limit);

          const results = db.prepare(query).all(...params);
          db.close();

          return {
            content: [
              {
                type: 'text',
                text: formatResults(results),
              },
            ],
          };
        }

        case 'query_documents': {
          const { limit, caseId, type } = QueryDocumentsSchema.parse(args || {});
          const db = getDatabase();

          let query = 'SELECT * FROM documents WHERE 1=1';
          const params: any[] = [];

          if (caseId) {
            query += ' AND case_id = ?';
            params.push(caseId);
          }

          if (type) {
            query += ' AND type = ?';
            params.push(type);
          }

          query += ' ORDER BY uploaded_at DESC LIMIT ?';
          params.push(limit);

          const results = db.prepare(query).all(...params);
          db.close();

          return {
            content: [
              {
                type: 'text',
                text: formatResults(results),
              },
            ],
          };
        }

        case 'query_user_facts': {
          const { limit, category, search } = QueryUserFactsSchema.parse(args || {});
          const db = getDatabase();

          let query = 'SELECT * FROM user_facts WHERE 1=1';
          const params: any[] = [];

          if (category) {
            query += ' AND category = ?';
            params.push(category);
          }

          if (search) {
            query += ' AND content LIKE ?';
            params.push(`%${search}%`);
          }

          query += ' ORDER BY created_at DESC LIMIT ?';
          params.push(limit);

          const results = db.prepare(query).all(...params);
          db.close();

          return {
            content: [
              {
                type: 'text',
                text: formatResults(results),
              },
            ],
          };
        }

        case 'query_audit_logs': {
          const { limit, userId, action, since } = QueryAuditLogsSchema.parse(args || {});
          const db = getDatabase();

          let query = 'SELECT * FROM audit_logs WHERE 1=1';
          const params: any[] = [];

          if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
          }

          if (action) {
            query += ' AND action = ?';
            params.push(action);
          }

          if (since) {
            query += ' AND timestamp >= ?';
            params.push(since);
          }

          query += ' ORDER BY timestamp DESC LIMIT ?';
          params.push(limit);

          const results = db.prepare(query).all(...params);
          db.close();

          return {
            content: [
              {
                type: 'text',
                text: formatResults(results),
              },
            ],
          };
        }

        case 'extract_citations': {
          const { text, includeMetadata } = ExtractCitationsSchema.parse(args || {});

          // Dynamic import of eyecite (if available)
          try {
            const eyecite = await import('@beshkenadze/eyecite');
            const cleaned = eyecite.cleanText(text, ['html', 'inline_whitespace']);
            const citations = eyecite.getCitations(cleaned, {
              overlapHandling: 'parent-only',
            });

            const formatted = citations.map((c: any) => {
              const result: any = {
                text: c.matched_text(),
                type: c.constructor.name,
                span: c.span(),
              };

              if (includeMetadata && c.groups) {
                result.metadata = {
                  volume: c.groups.volume,
                  reporter: c.groups.reporter,
                  page: c.groups.page,
                  section: c.groups.section,
                  year: c.metadata?.year,
                  court: c.metadata?.court,
                };
              }

              return result;
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(formatted, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: eyecite package not available. Install with: pnpm add @beshkenadze/eyecite`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'execute_sql': {
          const { query, params } = ExecuteSQLSchema.parse(args || {});

          // Security check: only allow SELECT queries
          if (!query.trim().toUpperCase().startsWith('SELECT')) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Only SELECT queries are allowed for security reasons.',
                },
              ],
              isError: true,
            };
          }

          const db = getDatabase();
          const results = db.prepare(query).all(...params);
          db.close();

          return {
            content: [
              {
                type: 'text',
                text: formatResults(results),
              },
            ],
          };
        }

        case 'get_database_stats': {
          const db = getDatabase();

          const stats = db
            .prepare(
              `
            SELECT
              name as table_name,
              (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as exists,
              (SELECT sql FROM sqlite_master WHERE type='table' AND name=m.name) as schema
            FROM sqlite_master m
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
          `
            )
            .all();

          // Get row counts for each table
          const enrichedStats = stats.map((table: any) => {
            try {
              const count = db
                .prepare(`SELECT COUNT(*) as count FROM ${table.table_name}`)
                .get() as any;
              return {
                table: table.table_name,
                rows: count.count,
                schema: table.schema,
              };
            } catch {
              return {
                table: table.table_name,
                rows: 'N/A',
                schema: table.schema,
              };
            }
          });

          db.close();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(enrichedStats, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}\n\n${error.stack}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ============================================================================
  // RESOURCES
  // ============================================================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'schema://database',
          name: 'Database Schema',
          description: 'Complete SQLite database schema',
          mimeType: 'text/plain',
        },
        {
          uri: 'stats://database',
          name: 'Database Statistics',
          description: 'Table sizes and row counts',
          mimeType: 'application/json',
        },
        {
          uri: 'cases://recent',
          name: 'Recent Cases',
          description: 'Last 10 cases',
          mimeType: 'application/json',
        },
        {
          uri: 'logs://recent',
          name: 'Recent Audit Logs',
          description: 'Last 20 audit log entries',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      if (uri === 'schema://database') {
        const db = getDatabase();
        const schema = db
          .prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name"
          )
          .all() as any[];
        db.close();

        const schemaText = schema.map((s) => s.sql).join('\n\n');

        return {
          contents: [
            {
              uri,
              text: schemaText,
            },
          ],
        };
      }

      if (uri === 'stats://database') {
        const db = getDatabase();

        const tables = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          .all() as any[];

        const stats = tables.map((table) => {
          try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as any;
            return {
              table: table.name,
              rows: count.count,
            };
          } catch {
            return {
              table: table.name,
              rows: 'Error',
            };
          }
        });

        db.close();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      if (uri === 'cases://recent') {
        const db = getDatabase();
        const cases = db.prepare('SELECT * FROM cases ORDER BY updated_at DESC LIMIT 10').all();
        db.close();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(cases, null, 2),
            },
          ],
        };
      }

      if (uri === 'logs://recent') {
        const db = getDatabase();
        const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20').all();
        db.close();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri,
            text: `Unknown resource: ${uri}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri,
            text: `Error reading resource: ${error.message}`,
          },
        ],
      };
    }
  });

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Justice Companion Development MCP Server running on stdio');
  console.error(`Database path: ${DB_PATH}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
