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
  
  // Simple tabular formatting
  const rows = [];
  if (columns) {
    rows.push(columns.join('\t'));
  }
  
  for (const row of results) {
    const values = columns ? columns.map(col => String(row[col])) : Object.values(row).map(String);
    rows.push(values.join('\t'));
  }
  
  return rows.join('\n');
}