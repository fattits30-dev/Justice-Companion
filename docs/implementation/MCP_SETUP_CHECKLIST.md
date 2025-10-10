# MCP Setup Checklist

Operational checklist for bringing the Justice Companion MCP servers online.

## Prerequisites

- Node.js v22.x and pnpm v10.x installed on the workstation.
- Justice Companion repository dependencies installed (`pnpm install`).
- Custom Justice Companion MCP source at `C:\Users\sava6\MCPs\justice-companion`.
- Context7 and GitHub access tokens available (store _outside_ the repo).

## Initial Setup

1. **Install workspace dependencies**
   ```powershell
   pnpm install
   ```
2. **Install and build the custom server**
   ```powershell
   cd C:\Users\sava6\MCPs\justice-companion
   npm install
   npm run build
   ```
3. **Configure secrets at the OS level**
   ```powershell
   # Replace the sample values with fresh tokens
   [Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "<ghp_...>", "User")
   [Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", "<ctx7sk_...>", "User")
   ```
   > Tip: run `scripts\setup-secure-tokens.ps1` to handle validation and masking.
4. **Update the project configuration**  
   Ensure `.mcp.json` (and `.mcp.json.example`) contain:
   ```json
   "justice-companion": {
     "command": "node",
     "args": ["../../MCPs/justice-companion/dist/index.js"],
     "env": { "NODE_ENV": "development" }
   }
   ```
5. **Keep `.env` free of live tokens**  
   Leave `CONTEXT7_API_KEY` and `GITHUB_TOKEN` blank to avoid accidental leaks.

## Verification

Run the automated verification script from the project root:

```powershell
pnpm exec tsx scripts/verify-mcp-setup.ts
```

The script checks toolchains, build artefacts, key third-party MCP packages, and confirms that required environment variables are visible to the current process.

## Manual Smoke Tests

1. Restart Claude / MCP-capable client so new environment variables load.
2. Use the client’s MCP tooling list to verify all servers register (`/mcps` in Claude CLI).
3. Exercise the justice-companion tools (e.g., `cases:list`) against the running dev API.

## Troubleshooting Notes

- **Missing build artefact**: run `npm run build` inside `C:\Users\sava6\MCPs\justice-companion`.
- **Token not detected**: open a fresh terminal after setting environment variables, or rerun the secure-token setup script.
- **Package missing**: reinstall project dependencies (`pnpm install`) to restore MCP server binaries.

Keep this checklist updated if server paths or dependency locations change.
