# Justice Companion Development MCP Server

A Model Context Protocol (MCP) server that provides development and debugging tools for the Justice Companion application.

## Features

### Tools

1. **query_cases** - Query cases from the database
   - Parameters: `limit`, `status`, `search`
   - Example: Query active cases with search term

2. **query_documents** - Query documents from the database
   - Parameters: `limit`, `caseId`, `type`
   - Example: Get all PDFs for a specific case

3. **query_user_facts** - Query user facts
   - Parameters: `limit`, `category`, `search`
   - Example: Search facts by category

4. **query_audit_logs** - Query security audit logs
   - Parameters: `limit`, `userId`, `action`, `since`
   - Example: Get all login attempts in the last hour

5. **extract_citations** - Extract legal citations from text
   - Parameters: `text`, `includeMetadata`
   - Uses eyecite-js to parse case law, statutes, etc.

6. **execute_sql** - Execute custom SQL queries (read-only)
   - Parameters: `query`, `params`
   - Security: Only SELECT queries allowed

7. **get_database_stats** - Get database statistics
   - Returns table sizes, row counts, schema info

### Resources

1. **schema://database** - Complete SQLite database schema
2. **stats://database** - Table statistics (row counts, sizes)
3. **cases://recent** - Last 10 cases
4. **logs://recent** - Last 20 audit log entries

## Installation

### 1. Build the MCP Server

```bash
cd mcp-server
pnpm install
pnpm run build
```

### 2. Configure Claude Desktop

Add to `~/AppData/Roaming/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "justice-companion-dev": {
      "command": "node",
      "args": ["C:\\Users\\sava6\\Desktop\\Justice Companion\\mcp-server\\dist\\index.js"],
      "env": {
        "JC_DATABASE_PATH": "C:\\Users\\sava6\\AppData\\Roaming\\justice-companion\\justice-companion.db"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

The MCP server will automatically start when Claude Desktop launches.

## Usage Examples

### Query Recent Cases

```
Use the query_cases tool to show me the last 5 active cases
```

### Extract Citations from Text

```
Use extract_citations to parse this text: "As held in Brown v. Board of Education, 347 U.S. 483 (1954), separate educational facilities are inherently unequal."
```

### Get Database Schema

```
Read the schema://database resource to show me the database structure
```

### Execute Custom SQL

```
Use execute_sql to query: SELECT COUNT(*) as total_cases FROM cases WHERE status = 'active'
```

### View Audit Logs

```
Use query_audit_logs to show login attempts from the last 24 hours
```

## Development

### Watch Mode

```bash
cd mcp-server
pnpm run watch
```

This will recompile on file changes. You'll need to restart Claude Desktop to pick up changes.

### Database Path

The server looks for the database at:

- Environment variable: `JC_DATABASE_PATH`
- Default: `%APPDATA%/justice-companion/justice-companion.db`

### Adding New Tools

1. Add the tool schema to `ListToolsRequestSchema` handler
2. Add the tool implementation to `CallToolRequestSchema` handler
3. Rebuild: `pnpm run build`
4. Restart Claude Desktop

## Security

- Database is opened in **read-only mode**
- Only SELECT queries allowed via `execute_sql`
- No write operations supported (prevents accidental data corruption)
- Audit logs track all database access

## Troubleshooting

### Database Not Found

```
Error: Database not found at: C:\Users\...\justice-companion.db
```

**Solution**: Ensure Justice Companion has been run at least once to create the database.

### MCP Server Not Loading

1. Check Claude Desktop logs: `%APPDATA%\Claude\logs`
2. Verify the node path is correct
3. Ensure the build completed: check `mcp-server/dist/index.js` exists

### eyecite Package Error

```
Error: eyecite package not available
```

**Solution**: The eyecite package is optional. Install in the main project:

```bash
pnpm add @beshkenadze/eyecite
```

## Architecture

- **Transport**: StdioServerTransport (communicates via stdin/stdout)
- **Database**: better-sqlite3 (read-only)
- **Schema Validation**: Zod
- **Citation Parsing**: eyecite-js (optional)

## Example Output

### query_cases

```
id                 | title              | status | created_at          | updated_at
-------------------|--------------------|---------|--------------------|--------------------
550e8400-e29b-1... | Landlord Dispute   | active  | 2025-01-15 10:30... | 2025-01-20 14:22...
6ba7b810-9dad-1... | Employment Issue   | active  | 2025-01-10 09:15... | 2025-01-18 16:45...

Total: 2 rows
```

### extract_citations

```json
[
  {
    "text": "347 U.S. 483",
    "type": "FullCaseCitation",
    "span": [28, 40],
    "metadata": {
      "volume": "347",
      "reporter": "U.S.",
      "page": "483",
      "year": "1954"
    }
  }
]
```

## License

MIT
